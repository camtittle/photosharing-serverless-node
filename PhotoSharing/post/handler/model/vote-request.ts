export interface VoteRequest {
    postId: string;
    type: RequestVoteType
}

// CONTROLLER LAYER vote type
export enum RequestVoteType {
    UP = 'up',
    DOWN = 'down'
}
