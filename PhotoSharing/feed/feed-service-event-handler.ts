import {Event} from "../shared/eventbus/model/event";
import {Topic} from "../shared/eventbus/topics/topic";
import {PostTopicEvent} from "../shared/eventbus/topics/post-topic";
import {EventBusService} from "../shared/eventbus/eventbus-service";
import {Destinations} from "../shared/eventbus/destinations";
import {IndexPostItem} from "../shared/elasticsearch/model/index-post-item";
import {ElasticsearchService} from "../shared/elasticsearch/elasticsearch-service";

export const handler = async (event: Event) => {

    // Handle events for topics that I am subscribed to
    switch (event.topic) {
        case Topic.Post: {
            await handlePostEvent(event);
            break;
        }
    }
};

async function handlePostEvent(event: Event) {
    const body = event.body as PostTopicEvent;

    console.log(`Feed Service subscriber received post event with ID '${body.id}'`);

    const indexPostItem = mapToIndexPostItem(body);
    const elasticsearchService = ElasticsearchService.getInstance();

     try {
         await elasticsearchService.indexItem(body.id, indexPostItem);
         await EventBusService.confirm(event.id, Destinations.feedService.handlerFunctionName);
         console.log('Successfully added post ID ' + body.id + ' to Elasticsearch index');
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
        latitude: postEvent.latitude,
        longitude: postEvent.longitude,
        commentCount: postEvent.commentCount,
        imageUrl: postEvent.imageUrl,
        timestamp: postEvent.timestamp
    }
}
