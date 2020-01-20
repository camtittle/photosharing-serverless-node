import {PostType} from "./post-type";

export interface CreatePostDetails {
    userId: string;
    type: PostType;
    base64Image?: string;
    description: string;
    latitude: number;
    longitude: number;
}

