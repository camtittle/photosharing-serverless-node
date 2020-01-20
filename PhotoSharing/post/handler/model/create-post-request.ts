export interface CreatePostRequest {
    type: CreatePostType;
    base64Image?: string;
    description: string;
    latitude: number;
    longitude: number;
}

export enum CreatePostType {
    Text = 'text',
    Image = 'image'
}
