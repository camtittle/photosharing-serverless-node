import {PostTopicEvent} from "./post-topic";
import {CommentTopicEvent} from "./comment-topic";

export enum Topic {
    Post = 'post',
    Comment = 'comment'
}

export interface TopicToEventMap {
    [Topic.Post]: PostTopicEvent,
    [Topic.Comment]: CommentTopicEvent
}

