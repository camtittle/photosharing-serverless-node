export interface FeedResponseItem {
    id: string;
    userId: string;
    timestamp: number;
    imageUrl?: string;
    distanceKm: number;
    description: string;
    commentCount: number;
}
