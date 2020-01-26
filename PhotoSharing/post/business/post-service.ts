import {CreatePostDetails} from "./model/create-post-details";
import {S3Service} from "../../shared/s3/s3-service";
import {DynamoDbService} from "../../shared/dynamodb/dynamo-db-service";
import {Post} from "./model/post";
import {v4 as uuid} from 'uuid';
import {PostAction, PostTopicEvent} from "../../shared/eventbus/topics/post-topic";
import {PostType} from "./model/post-type";

export class PostService {

    private static instance: PostService;

    private readonly tableName = 'postsTable';

    private constructor() {}

    public static getInstance(): PostService {
        if (!PostService.instance) {
            PostService.instance = new PostService();
        }

        return PostService.instance;
    }

    public async createPost(details: CreatePostDetails): Promise<Post> {
        const newPost: Post = {
            id: uuid(),
            postType: details.type,
            timestamp: new Date().getTime(),
            userId: details.userId,
            latitude: details.latitude,
            longitude: details.longitude,
            description: details.description,
            commentCount: 0
        };

        if (details.type === PostType.Image && details.base64Image) {
            newPost.imageUrl = await this.uploadImage(details.userId, details.base64Image);
        }

        const dynamoDbService = DynamoDbService.getInstance();
        await dynamoDbService.put(this.tableName, newPost);

        return newPost;
    }

    private async uploadImage(userId: string, base64Image: string): Promise<string> {
        const s3Service = S3Service.getInstance();
        return await s3Service.uploadImage(userId, base64Image);
    }

    public async updateCommentCount(postId: string, postTimestamp: number, count: number) {
        console.log('updateCommentCount');
        if (!postId || count == null) {
            throw new Error('postId and commentCount required');
        }

        const dynamoDbService = DynamoDbService.getInstance();
        const keys = {
            id: postId,
            timestamp: postTimestamp
        };
        const expression = 'SET #count = :count';
        const names = { '#count': 'commentCount' };
        const values = { ':count': count };
        await dynamoDbService.update(this.tableName, keys, expression, names, values);
    }

    private publishEvent(post: Post, action: PostAction) {
        const event: PostTopicEvent = {
            action: action,
            id: post.id,
            timestamp: post.timestamp,
            imageUrl: post.imageUrl,
            latitude: post.latitude,
            longitude: post.longitude,
            description: post.description
        }

    }
}
