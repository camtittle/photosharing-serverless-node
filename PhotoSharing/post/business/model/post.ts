import {PostType} from "./post-type";

export interface Post {
    id: string;
    userId: string;
    //postType: PostType,
    timestamp: number;
    imageUrl?: string;
    latitude: number;
    longitude: number;
    description: string;
    commentCount: number;
}


