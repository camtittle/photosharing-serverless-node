import {Event} from "../shared/eventbus/model/event";
import {Topic, TopicToEventMap} from "../shared/eventbus/topics/topic";
import {PostTopicEvent} from "../shared/eventbus/topics/post-topic";
import {CommentTopicEvent} from "../shared/eventbus/topics/comment-topic";
import {EventBusService} from "../shared/eventbus/eventbus-service";

const DESTINATION_NAME = 'demoSubscriber';

export const handler = async (event: Event) => {

    // Handle events for topics that I am subscribed to
    switch (event.topic) {
        case Topic.Post: {
            // Do something with the event
            const body = event.body as PostTopicEvent;
            console.log(`Subscriber received post event saying '${body.description}'`);

            // Once event handled successfully, confirm delivery
            await EventBusService.confirm(event.id, DESTINATION_NAME);
            break;
        }
        case Topic.Comment: {
            // Do something with the event
            const body = event.body as CommentTopicEvent;
            console.log(`Subscriber received post comment on postId '${body.postId}'`);

            // Once event handled successfully, confirm delivery
            await EventBusService.confirm(event.id, DESTINATION_NAME);
            break;
        }

    }

};
