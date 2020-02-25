import {Event} from "../../shared/eventbus/model/event";
import {Topic} from "../../shared/eventbus/topics/topic";
import {EventBusService} from "../../shared/eventbus/eventbus-service";
import {CommentAction, CommentTopicEvent} from "../../shared/eventbus/topics/comment-topic";
import {PostService} from "../business/post-service";
import {Destinations} from "../../shared/eventbus/destinations";
import Log from "../../shared/logging/log";

const tag = "PostServiceEventHandler";

export const handler = async (event: Event) => {

    // Handle events for topics that I am subscribed to
    switch (event.topic) {
        case Topic.Comment: {
            await handleCommentEvent(event);
            break;
        }
    }
};

const handleCommentEvent = async (event: Event) => {
    const body = event.body as CommentTopicEvent;
    const postService = PostService.getInstance();
    Log(tag, `Received comment event '${body.commentId}'`);

    if (body.action === CommentAction.Add) {
        // Update Post Service's commentCount value for this post
        try {
            await postService.updateCommentCount(body.postId, body.postTimestamp, event.timestamp, body.commentCount);
        } catch (e) {
            console.error('Unable to update comment count for post ID ' + body.postId);
            console.error(e);
        }
    } else {
        console.error('Cannot handle comment event with unrecognised action: ' + body.action);
    }

    Log(tag, 'Confirming receipt of event...');
    await EventBusService.confirm(event.id, Destinations.postService.handlerFunctionName);
};
