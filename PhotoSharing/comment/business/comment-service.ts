import {AddCommentDetails} from "./model/add-comment-details";
import {CommentRepository} from "../data/comment-repository";
import {Comment} from "./model/comment";
import {v4 as uuid} from 'uuid';
import {CommentAction, CommentTopicEvent} from "../../shared/eventbus/topics/comment-topic";
import Log from "../../shared/logging/log";
import {EventBusService} from "../../shared/eventbus/eventbus-service";
import {Topic} from "../../shared/eventbus/topics/topic";

export class CommentService {

    private static instance: CommentService;

    private readonly commentRepository: CommentRepository;
    private readonly tag = 'CommentService';

    private constructor() {
        this.commentRepository = CommentRepository.getInstance();
    }

    public static getInstance(): CommentService {
        if (!CommentService.instance) {
            CommentService.instance = new CommentService();
        }

        return CommentService.instance;
    }

    public async addComment(details: AddCommentDetails): Promise<Comment> {
        if (!details.content || !details.postId || !details.userId) {
            throw new Error("Cannot add comment due to missing parameters. Found: " + JSON.stringify(details));
        }

        // Save comment to database
        const comment: Comment = {
            id: uuid(),
            userId: details.userId,
            postId: details.postId,
            postTimestamp: details.postTimestamp,
            timestamp: new Date().getTime(),
            content: details.content
        };

        Log(this.tag, `Adding comment ${comment.id} to post ID ${comment.postId}`);
        await this.commentRepository.putComment(comment);

        await this.publishNewCommentEvent(comment);

        return comment;
    }

    public async getByPost(postId: string): Promise<Comment[]> {
        if (!postId) {
            throw new Error("Cannot get comments: Missing postId");
        }
        Log(this.tag, 'Fetching comments for post ID', postId)
        return this.commentRepository.getComments(postId);
    }

    private async publishNewCommentEvent(comment: Comment) {
        // Get new total number of comments
        const commentCount = await this.getCommentCount(comment.postId);

        // Publish event
        const event: CommentTopicEvent = {
            action: CommentAction.Add,
            commentId: comment.id,
            content: comment.content,
            postId: comment.postId,
            postTimestamp: comment.postTimestamp,
            timestamp: comment.timestamp,
            commentCount: commentCount
        };

        Log(this.tag, 'Publishing event to Comment topic with new commentCount:');
        Log(this.tag, event);

        await EventBusService.publish(Topic.Comment, event);
    }

    private async getCommentCount(postId: string) {
        Log(this.tag, 'Getting comment count for post ID', postId);
        const comments = await this.getByPost(postId);
        return comments.length;
    }

}
