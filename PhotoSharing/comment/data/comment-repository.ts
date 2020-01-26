import {Comment} from "../business/model/comment";
import {CommentDbItem} from "./comment-db-item";
import {DynamoDbService} from "../../shared/dynamodb/dynamo-db-service";
import retry from 'async-retry';
import {PartitionKeyQuery} from "../../shared/dynamodb/model/query";

export class CommentRepository {

    private static instance: CommentRepository;

    private readonly tableName = 'commentsTable';
    private readonly sortKeySeparator = '#';

    private readonly dynamoDbService: DynamoDbService;
    private readonly maxRetries = 3;

    private constructor() {
        this.dynamoDbService = DynamoDbService.getInstance();
    }

    public static getInstance(): CommentRepository {
        if (!CommentRepository.instance) {
            CommentRepository.instance = new CommentRepository();
        }

        return CommentRepository.instance;
    }

    public async putComment(comment: Comment) {
        const dbItem = this.toDbItem(comment);

        await this.dynamoDbService.put(this.tableName, dbItem);
    }

    public async getComments(postId: string) {
        if (!postId) {
            throw new Error("Cannot get comments: postId param required");
        }

        const query: PartitionKeyQuery = {
            partitionKeyName: 'postId',
            partitionKeyValue: postId
        };

        // Retry up to maxRetries in case of high demand
        return await retry(async () => {
            const comments = await this.dynamoDbService.queryPartitionKey<CommentDbItem>(this.tableName, query);
            return comments.map(this.parseDbItem.bind(this));
        }, {
            retries: this.maxRetries
        });
    }

    private toDbItem(comment: Comment): CommentDbItem {
        const sortKey = comment.timestamp + this.sortKeySeparator + comment.id;
        return {
            postId: comment.postId,
            postTimestamp: comment.postTimestamp,
            timestamp_id: sortKey,
            userId: comment.userId,
            content: comment.content
        };
    }

    private parseDbItem(dbItem: CommentDbItem): Comment {
        const sortKeyParts = dbItem.timestamp_id.split(this.sortKeySeparator);
        if (sortKeyParts.length < 2) {
            throw new Error("Cannot parse Comment DB Item. Sort key has unexpected format: " + dbItem.timestamp_id);
        }

        return {
            id: sortKeyParts[1],
            timestamp: parseInt(sortKeyParts[0]),
            userId: dbItem.userId,
            postId: dbItem.postId,
            postTimestamp: dbItem.postTimestamp,
            content: dbItem.content
        };
    }

}
