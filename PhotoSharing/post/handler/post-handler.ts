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

const postService = PostService.getInstance();
const tag = 'PostService';

export const create = async (event: APIGatewayEvent): Promise<APIGatewayProxyResult> => {
    const identity = CognitoUtils.getIdentity(event.requestContext);
    if (!identity) {
        return Responses.Unauthorized();
    }

    if (event.body == null) {
        return Responses.badRequest()
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

export const getDemo = async (event: APIGatewayEvent): Promise<APIGatewayProxyResult> => {
    const posts = await postService.getPosts();
    const response = {
        posts: posts
    };
    return Responses.Ok(response);
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
        && !!model.latitude && !!model.longitude;
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
