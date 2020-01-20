export interface PostTopicEvent {
    action: PostAction,
    id: string;
    timestamp: number;
    imageUrl?: string;
    latitude: number;
    longitude: number;
    description: string;
}

export enum PostAction {
    Create = 'create'
}
