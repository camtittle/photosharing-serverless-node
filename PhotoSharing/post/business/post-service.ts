import {CreatePostDetails} from "./model/create-post-details";
import {S3Service} from "../../shared/s3/s3-service";
import {DynamoDbService} from "../../shared/dynamodb/dynamo-db-service";
import {Post} from "./model/post";
import {v4 as uuid} from 'uuid';
import {PostAction, PostTopicEvent} from "../../shared/eventbus/topics/post-topic";
import {PostType} from "./model/post-type";
import {PartitionKeyQuery} from "../../shared/dynamodb/model/query";
import {EventBusService} from "../../shared/eventbus/eventbus-service";
import {Topic} from "../../shared/eventbus/topics/topic";
import Log from "../../shared/logging/log";
import {VoteType} from "./model/vote-type";

const tag = 'PostService';

export class PostService {

    private static instance: PostService;

    private readonly tableName = 'postsTable';
    private readonly tag = 'PostService';

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
            commentCount: 0,
            lastCommentEventTimestamp: 0,
            upvotes: [],
            downvotes: []
        };

        Log(this.tag, 'Creating post with ID', newPost.id);

        if (details.type === PostType.Image && details.base64Image) {
            newPost.imageUrl = await this.uploadImage(details.userId, details.base64Image);
        }

        const dynamoDbService = DynamoDbService.getInstance();
        await dynamoDbService.put(this.tableName, newPost);

        await this.publishEvent(newPost, PostAction.Create);

        return newPost;
    }

    private async uploadImage(userId: string, base64Image: string): Promise<string> {
        const s3Service = S3Service.getInstance();

        Log(this.tag, 'Uploading image to S3...');
        const url = await s3Service.uploadImage(userId, base64Image);
        Log(this.tag, 'Image upload complete');

        return url;
    }

    public async updateCommentCount(postId: string, commentEventTimestamp: number, count: number) {
        Log(tag, 'Conditionally updating comment count for post', postId, 'to', count);
        if (!postId || commentEventTimestamp === null || count === null) {
            throw new Error('postId and commentCount required');
        }

        const dynamoDbService = DynamoDbService.getInstance();
        const keys = {
            id: postId
        };
        const expression = 'SET #count = :count, #lastCommentEventTimestamp = :eventTimestamp';
        // condition ensures that events that arrive out of order are ignored - only latest events processed
        const conditionExpression = 'attribute_not_exists(#lastCommentEventTimestamp) OR #lastCommentEventTimestamp < :eventTimestamp';
        const names = { '#count': 'commentCount', '#lastCommentEventTimestamp': 'lastCommentEventTimestamp' };
        const values = { ':count': count, ':eventTimestamp': commentEventTimestamp };
        await dynamoDbService.update(this.tableName, keys, expression, names, values, conditionExpression);
    }

    public async getPosts(): Promise<Post[]> {
        const dynamoDbService = DynamoDbService.getInstance();
        return dynamoDbService.scan<Post>(this.tableName);
    }

    public async getPost(id: string): Promise<Post | null> {

        const dynamoDbService = DynamoDbService.getInstance();

        const query: PartitionKeyQuery = {
            partitionKeyName: 'id',
            partitionKeyValue: id
        };
        const posts = await dynamoDbService.queryPartitionKey<Post>(this.tableName, query);
        if (posts.length < 1) {
            return null;
        }

        return posts[0];
    }

    public async setVote(userId: string, postId: string, voteType: VoteType) {
        Log(tag, 'Setting', voteType, 'vote on post', postId, 'for user', userId);

        if (!postId || !userId || !voteType) {
            throw new Error('UserId, PostId and VoteType are required parameters');
        }

        const dynamoDbService = DynamoDbService.getInstance();

        // Get current votes
        const post = await this.getPost(postId);
        if (post == null) {
            throw new Error("Post not found");
        }

        // Update votes lists
        Log(this.tag, 'Updating upvotes and downvotes arrays for post', postId);
        const upvoteIndex = post.upvotes.indexOf(userId);
        const downvoteIndex = post.downvotes.indexOf(userId);

        if (voteType == VoteType.UP) {
            if (upvoteIndex < 0)    post.upvotes.push(userId);
            if (downvoteIndex > -1) post.downvotes.splice(downvoteIndex, 1);
        }

        if (voteType == VoteType.DOWN) {
            if (downvoteIndex < 0) post.downvotes.push(userId);
            if (upvoteIndex > -1) post.upvotes.splice(upvoteIndex, 1);
        }

        const keys = {
            id: postId
        };
        const expression = 'SET #upvotes = :upvotes, #downvtoes = :downvotes';
        const names = { '#upvotes': 'upvotes', '#downvotes': 'downvotes' };
        const values = { ':upvotes': post.upvotes, ':downvotes': post.downvotes };
        await dynamoDbService.update(this.tableName, keys, expression, names, values);
    }

    private async publishEvent(post: Post, action: PostAction) {
        const event: PostTopicEvent = {
            action: action,
            id: post.id,
            userId: post.userId,
            timestamp: post.timestamp,
            imageUrl: post.imageUrl,
            latitude: post.latitude,
            longitude: post.longitude,
            description: post.description,
            commentCount: 0
        };


        Log(this.tag, 'Publishing event to TOPIC post:');
        Log(this.tag, event);
        await EventBusService.publish(Topic.Post, event);
    }
}
