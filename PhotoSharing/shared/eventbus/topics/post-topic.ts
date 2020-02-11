export interface PostTopicEvent {
        action: PostAction,
        id: string;
        userId: string;
        timestamp: number;
        imageUrl?: string;
        latitude: number;
        longitude: number;
        description: string;
        commentCount: number;
}

export enum PostAction {
    Create = 'create'
}
