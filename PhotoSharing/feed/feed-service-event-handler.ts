import {Event} from "../shared/eventbus/model/event";
import {Topic} from "../shared/eventbus/topics/topic";
import {PostTopicEvent} from "../shared/eventbus/topics/post-topic";
import {EventBusService} from "../shared/eventbus/eventbus-service";
import {Destinations} from "../shared/eventbus/destinations";
import {IndexPostItem} from "../shared/elasticsearch/model/index-post-item";
import {ElasticsearchService} from "../shared/elasticsearch/elasticsearch-service";
import Log from "../shared/logging/log";
import {CommentTopicEvent} from "../shared/eventbus/topics/comment-topic";
import {VoteTopicEvent} from "../shared/eventbus/topics/vote-topic";
import {VoteType} from "../post/business/model/vote-type";

const tag = 'FeedServiceEventHandler';

export const handler = async (event: Event) => {

    // Handle events for topics that I am subscribed to
    switch (event.topic) {
        case Topic.Post: {
            await handlePostEvent(event);
            break;
        }
        case Topic.Comment: {
            await handleCommentEvent(event);
            break;
        }
        case Topic.Vote: {
            await handleVoteEvent(event);
            break;
        }
    }
};

async function handlePostEvent(event: Event) {
    const body = event.body as PostTopicEvent;

    Log(tag, `Received post event with ID '${body.id}'`);

    const indexPostItem = mapToIndexPostItem(body);
    const elasticsearchService = ElasticsearchService.getInstance();

     try {
         await elasticsearchService.indexItem(body.id, indexPostItem);
         Log(tag, 'Successfully added post ID ' + body.id + ' to Elasticsearch index');

         Log(tag, 'Confirming receipt of event...');
         await EventBusService.confirm(event.id, Destinations.feedService.handlerFunctionName);
     } catch (e) {
         console.error('Error whilst handling Post Event with ID: ' + event.id);
         console.error(e);
     }
}

function mapToIndexPostItem(postEvent: PostTopicEvent): IndexPostItem {
    return {
        postId: postEvent.id,
        userId: postEvent.userId,
        description: postEvent.description,
        location: {
            lat: postEvent.latitude,
            lon: postEvent.longitude
        },
        commentCount: postEvent.commentCount,
        imageUrl: postEvent.imageUrl,
        timestamp: postEvent.timestamp,
        lastCommentEventTimestamp: 0,
        votes: {}
    }
}

async function handleCommentEvent(event: Event) {
    const body = event.body as CommentTopicEvent;

    const updateScript = `
        if (!ctx._source.containsKey('lastCommentEventTimestamp')
            || ctx._source.lastCommentEventTimestamp < params.eventTimestamp) {
                ctx._source.lastCommentEventTimestamp = params.eventTimestamp;
                ctx._source.commentCount = params.commentCount; 
        }
    `;
    const params = {
        eventTimestamp: event.timestamp,
        commentCount: body.commentCount
    };

    const elasticsearchService = ElasticsearchService.getInstance();
    await elasticsearchService.scriptUpdateItem(body.postId, updateScript, params);

    Log(tag, 'Successfully updated commentCount for post ID ' + body.postId + ' in Elasticsearch index');

    Log(tag, 'Confirming receipt of event...');
    await EventBusService.confirm(event.id, Destinations.feedService.handlerFunctionName);
}

async function handleVoteEvent(event: Event) {
    const body = event.body as VoteTopicEvent;

    Log(tag, 'FeedService received', body.voteType, 'VOTE event');

    const userId = body.userId;
    const partialDocUpdate = {
        votes: {
            [body.userId]: {
                voteType: body.voteType,
                eventTimestamp: event.timestamp
            }
        }
    };

    Log(tag, partialDocUpdate);

    const elasticsearchService = ElasticsearchService.getInstance();
    await elasticsearchService.updateItem(body.postId, partialDocUpdate);

    Log(tag, 'Successfully updated votes for post ID ' + body.postId + ' in Elasticsearch index');

    Log(tag, 'Confirming receipt of vote event...');
    await EventBusService.confirm(event.id, Destinations.feedService.handlerFunctionName);
}
