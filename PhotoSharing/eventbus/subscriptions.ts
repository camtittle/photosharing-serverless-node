import {Topic} from "../shared/eventbus/topics/topic";
import {Destinations} from "../shared/eventbus/destinations";

export interface Subscription {
    functionName: string;
}

const subscriptions: {[topic: string]: Subscription[]} = {
    [Topic.Post]: [
        {functionName: Destinations.feedService.handlerFunctionName},
    ],
    [Topic.Comment]: [
        {functionName: Destinations.postService.handlerFunctionName},
        {functionName: Destinations.demoSubscriber.handlerFunctionName}
    ]
};

export function getSubscriptionsForTopic(topic: Topic): Subscription[] {
    const subs = subscriptions[topic];
    return subs ? subs : [];
}
