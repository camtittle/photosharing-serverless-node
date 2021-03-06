import {Topic} from "../shared/eventbus/topics/topic";
import {Destinations} from "../shared/eventbus/destinations";
import Log from "../shared/logging/log";

export interface Subscription {
    functionName: string;
}

const subscriptions: {[topic: string]: Subscription[]} = {
    [Topic.Post]: [
        {functionName: Destinations.feedService.handlerFunctionName},
    ],
    [Topic.Comment]: [
        {functionName: Destinations.postService.handlerFunctionName},
        {functionName: Destinations.feedService.handlerFunctionName}
    ],
    [Topic.Vote]: [
        {functionName: Destinations.feedService.handlerFunctionName}
    ],
    [Topic.Demo]: [
        {functionName: Destinations.demoSubscriber.handlerFunctionName}
    ]
};

export function getSubscriptionsForTopic(topic: Topic): Subscription[] {
    const subs = subscriptions[topic];
    if (subs != undefined) {
        Log('GetSubscriptionsForTopic', 'Found ' + subs.length + ' subscription(s) for ' + topic.toUpperCase() + ' topic:', subs);
        return subs;
    }

    return [];
}
