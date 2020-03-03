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
}
