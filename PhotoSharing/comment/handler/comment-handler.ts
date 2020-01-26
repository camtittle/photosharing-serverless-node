import {APIGatewayEvent, APIGatewayProxyResult} from "aws-lambda";
import {Responses} from "../../shared/responses";
import {AddCommentRequest} from "./model/add-comment-request";
import {AddCommentDetails} from "../business/model/add-comment-details";
import {CommentService} from "../business/comment-service";
import {CognitoUtils} from "../../shared/cognito/cognito-utils";

export const add = async (event: APIGatewayEvent): Promise<APIGatewayProxyResult> => {
    const identity = CognitoUtils.getIdentity(event.requestContext);
    if (!identity) {
        return Responses.Unauthorized();
    }

    if (event.body == null) {
        return Responses.badRequest()
    }

    const content = JSON.parse(event.body);
    if (!validateAddCommentModel(content)) {
        return Responses.badRequest({message: 'Missing required field(s)'});
    }

    const details: AddCommentDetails = {
        userId: identity.userId,
        postId: content.postId,
        postTimestamp: content.postTimestamp,
        content: content.content
    };

    const commentService = CommentService.getInstance();
    const comment = await commentService.addComment(details);

    return Responses.Ok(comment);
};

export const get = async (event: APIGatewayEvent): Promise<APIGatewayProxyResult> => {
    if (event.queryStringParameters == null || !event.queryStringParameters.postId) {
        return Responses.badRequest({message: 'Post ID required'})
    }

    const postId = event.queryStringParameters.postId;

    try {
        const commentService = CommentService.getInstance();
        const comments = await commentService.getByPost(postId);
        return Responses.Ok(comments);
    } catch (e) {
        return Responses.InternalServerError(e);
    }


};

function validateAddCommentModel(model: any): model is AddCommentRequest {
    return !!model.content && !!model.postId && !!model.postTimestamp && typeof model.postTimestamp === 'number';
}
