export interface CommentTopicEvent {
    action: CommentAction,
    timestamp: number;
    postId: string;
    commentId: string;
    content: string;
    commentCount: number;
}

export enum CommentAction {
    Add = 'add'
}
