import {PostTopicEvent} from "./post-topic";
import {CommentTopicEvent} from "./comment-topic";
import {DemoTopicEvent} from "./loadtest-topic";
import {VoteTopicEvent} from "./vote-topic";

export enum Topic {
    Post = 'post',
    Comment = 'comment',
    Vote = 'vote',
    Demo = 'demo'
}

export interface TopicToEventMap {
    [Topic.Post]: PostTopicEvent,
    [Topic.Comment]: CommentTopicEvent,
    [Topic.Vote]: VoteTopicEvent,
    [Topic.Demo]: DemoTopicEvent
}

