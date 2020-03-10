import {Event} from "../shared/eventbus/model/event";
import {Topic, TopicToEventMap} from "../shared/eventbus/topics/topic";
import {PostTopicEvent} from "../shared/eventbus/topics/post-topic";
import {CommentTopicEvent} from "../shared/eventbus/topics/comment-topic";
import {EventBusService} from "../shared/eventbus/eventbus-service";
import {Destinations} from "../shared/eventbus/destinations";
import {DemoTopicEvent} from "../shared/eventbus/topics/loadtest-topic";
import Log from "../shared/logging/log";

const tag = "DemoSubscriberEventHandler";

export const handler = async (event: Event) => {

    // Handle events for topics that I am subscribed to
    switch (event.topic) {
        case Topic.Post: {
            // Do something with the event
            const body = event.body as PostTopicEvent;
            Log(tag, `Received post event saying '${body.description}'`);

            // Once event handled successfully, confirm delivery
            Log(tag, 'Confirming receipt of event...');
            await EventBusService.confirm(event.id, Destinations.demoSubscriber.handlerFunctionName);
            break;
        }
        case Topic.Comment: {
            // Do something with the event
            const body = event.body as CommentTopicEvent;
            Log(tag, `Received post comment on postId '${body.postId}'`);

            // Once event handled successfully, confirm delivery
            Log(tag, 'Confirming receipt of event...');
            await EventBusService.confirm(event.id, Destinations.demoSubscriber.handlerFunctionName);
            break;
        }
        case Topic.Demo: {
            // Do something with the event
            const body = event.body as DemoTopicEvent;
            Log(tag, `Received demo event with tag: '${body.tag}'`);

            // Comment this line to simulate event delivery failure
            Log(tag, 'Confirming receipt of event...');
            //await EventBusService.confirm(event.id, Destinations.demoSubscriber.handlerFunctionName);
            break;
        }
    }

};

export const handler2 = async (event: Event) => {
    if (event.topic == Topic.Demo) {
        // Do something with the event
        const body = event.body as DemoTopicEvent;
        console.log(`Subscriber received load test event with tag: '${body.tag}'`);

        // Once event handled successfully, confirm delivery
        await EventBusService.confirm(event.id, Destinations.demoSubscriber2.handlerFunctionName);
    }

};

export const handler3 = async (event: Event) => {
    if (event.topic == Topic.Demo) {
        // Do something with the event
        const body = event.body as DemoTopicEvent;
        console.log(`Subscriber received load test event with tag: '${body.tag}'`);

        // Once event handled successfully, confirm delivery
        await EventBusService.confirm(event.id, Destinations.demoSubscriber3.handlerFunctionName);
    }

};

export const handler4 = async (event: Event) => {
    if (event.topic == Topic.Demo) {
        // Do something with the event
        const body = event.body as DemoTopicEvent;
        console.log(`Subscriber received load test event with tag: '${body.tag}'`);

        // Once event handled successfully, confirm delivery
        await EventBusService.confirm(event.id, Destinations.demoSubscriber4.handlerFunctionName);
    }

};
