export interface VoteTopicEvent {
    postId: string;
    userId: string;
    voteType: EventVoteType;
}

export enum EventVoteType {
    UP = 'up',
    DOWN = 'down'
}
