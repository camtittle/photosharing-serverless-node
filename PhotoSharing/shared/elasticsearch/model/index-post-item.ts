export interface IndexPostItem {
    postId: string;
    userId: string;
    timestamp: number;
    imageUrl?: string;
    latitude: number;
    longitude: number;
    description: string;
    commentCount: number;
    lastCommentEventTimestamp: number;
}
