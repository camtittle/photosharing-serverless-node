import {APIGatewayEvent, APIGatewayProxyResult} from "aws-lambda";
import {Responses} from "../../shared/responses";
import {CreatePostRequest, CreatePostType} from "./model/create-post-request";
import {PostService} from "../business/post-service";
import {CreatePostDetails} from "../business/model/create-post-details";
import {PostType} from "../business/model/post-type";
import {CognitoUtils} from "../../shared/cognito/cognito-utils";
import {Post} from "../business/model/post";
import {PostResponse} from "./model/post-response";
import Log from "../../shared/logging/log";
import {RequestVoteType, VoteRequest} from "./model/vote-request";
import {VoteType} from "../business/model/vote-type";

const postService = PostService.getInstance();
const tag = 'PostService';

export const create = async (event: APIGatewayEvent): Promise<APIGatewayProxyResult> => {
    const identity = CognitoUtils.getIdentity(event.requestContext);
    if (!identity) {
        return Responses.Unauthorized();
    }

    if (event.body == null) {
        return Responses.badRequest();
    }

    const content = <CreatePostRequest>JSON.parse(event.body);
    if (!validateModel(content)) {
        return Responses.badRequest({ message: 'Missing required field(s)' });
    }

    const details: CreatePostDetails = {
        userId: identity.userId,
        type: getPostType(content.type),
        description: content.description,
        base64Image: content.base64Image,
        latitude: content.latitude,
        longitude: content.longitude
    };

    Log(tag, 'Creating post with details:\n');
    Log(tag, details);

    const post = await postService.createPost(details);

    return Responses.Ok(post);
};

export const getSingle = async (event: APIGatewayEvent): Promise<APIGatewayProxyResult> => {
    if (!event.pathParameters || !event.pathParameters.id) {
        return Responses.badRequest('ID and timestamp required')
    }

    const id = event.pathParameters.id;
    const post = await postService.getPost(id);

    if (post == null){
        return Responses.notFound();
    }

    return Responses.Ok(mapPostToResponse(post));
};

export const vote = async (event: APIGatewayEvent): Promise<APIGatewayProxyResult> => {
    const identity = CognitoUtils.getIdentity(event.requestContext);
    if (!identity) {
        return Responses.Unauthorized();
    }

    if (event.body == null) {
        return Responses.badRequest();
    }

    const request = JSON.parse(event.body);
    if (!validateVoteModel(request)) {
        return Responses.badRequest({ message: 'Missing required field(s)' });
    }

    try {
        Log(tag, 'Voting on post with details:\n');
        Log(tag, request);
        const voteType = mapVoteType(request.type);
        await postService.setVote(identity.userId, request.postId, voteType);
        return Responses.Ok();
    } catch (ex) {
        return Responses.InternalServerError(ex);
    }
};

function getPostType(createPostType: CreatePostType): PostType {
    switch (createPostType) {
        case CreatePostType.Image:
            return PostType.Image;
        case CreatePostType.Text:
            return PostType.Text;
        default:
            throw new Error('Unrecognised Post Type');
    }
}

function validateModel(model: CreatePostRequest): boolean {
    return ((model.type === CreatePostType.Image && !!model.base64Image) || model.type === CreatePostType.Text)
        && model.latitude!= undefined && model.longitude != undefined;
}

function validateVoteModel(model: any): model is VoteRequest {
    return !!model.postId && !!model.type;
}

function mapPostToResponse(post: Post): PostResponse {
    return {
        id: post.id,
        timestamp: post.timestamp,
        latitude: post.latitude,
        longitude: post.longitude,
        description: post.description,
        commentCount: post.commentCount,
        imageUrl: post.imageUrl,
        postType: post.postType,
        userId: post.userId
    }
}

function mapVoteType(requestVoteType: RequestVoteType): VoteType {
    switch(requestVoteType) {
        case RequestVoteType.UP: return VoteType.UP;
        case RequestVoteType.DOWN: return VoteType.DOWN;
        default: throw new Error("Unrecognised vote type");
    }
}
