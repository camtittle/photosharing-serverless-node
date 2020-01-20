import {Topic} from "../shared/eventbus/topics/topic";

export interface Subscription {
    functionName: string;
}

const subscriptions: {[topic: string]: Subscription[]} = {
    [Topic.Post]: [
        {functionName: 'testFunction'},
    ],
    [Topic.Comment]: [
        {functionName: 'demoSubscriber'},
        {functionName: 'postServiceEventHandler'}
    ]
};

export function getSubscriptionsForTopic(topic: Topic): Subscription[] {
    const subs = subscriptions[topic];
    return subs ? subs : [];
}
