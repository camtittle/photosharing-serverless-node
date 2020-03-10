export interface FeedResponseItem {
    id: string;
    userId: string;
    timestamp: number;
    imageUrl?: string;
    distanceKm: number;
    description: string;
    commentCount: number;
    votes: {
        [userId: string]: UserVote
    }
}

type UserVote = {
    voteType: 'up' | 'down',
    lastEventTimestamp: number;
}
