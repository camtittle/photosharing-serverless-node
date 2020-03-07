export interface VoteTopicEvent {
    postId: string;
    userId: string;
    voteType: string;
}

export enum EventVoteType {
    UP = 'up',
    DOWN = 'down'
}
