import {PostTopicEvent} from "./post-topic";
import {CommentTopicEvent} from "./comment-topic";
import {DemoTopicEvent} from "./loadtest-topic";

export enum Topic {
    Post = 'post',
    Comment = 'comment',
    Demo = 'demo'
}

export interface TopicToEventMap {
    [Topic.Post]: PostTopicEvent,
    [Topic.Comment]: CommentTopicEvent,
    [Topic.Demo]: DemoTopicEvent
}

