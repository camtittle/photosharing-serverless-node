import {PostType} from "../../business/model/post-type";

export interface PostResponse {
    id: string;
    userId: string;
    postType: PostType,
    timestamp: number;
    imageUrl?: string;
    latitude: number;
    longitude: number;
    description: string;
    commentCount: number;
}
