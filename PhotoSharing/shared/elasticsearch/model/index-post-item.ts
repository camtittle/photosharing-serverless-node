export interface IndexPostItem {
    postId: string;
    userId: string;
    timestamp: number;
    imageUrl?: string;
    location: {
        lat: number;
        lon: number;
    }
    description: string;
    commentCount: number;
    lastCommentEventTimestamp: number;
    votes: {
        [userId: string]: UserVote
    }
}

export type UserVote = {
    voteType: 'up' | 'down',
    lastEventTimestamp: number;
}
