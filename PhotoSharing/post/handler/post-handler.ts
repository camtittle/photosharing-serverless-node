import {APIGatewayEvent, APIGatewayProxyResult} from "aws-lambda";
import {Responses} from "../../shared/responses";
import {CreatePostRequest, CreatePostType} from "./model/create-post-request";
import {PostService} from "../business/post-service";
import {CreatePostDetails} from "../business/model/create-post-details";
import {PostType} from "../business/model/post-type";
import {CognitoUtils} from "../../shared/cognito/cognito-utils";

const postService = PostService.getInstance();

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

    const post = await postService.createPost(details);

    return Responses.Ok(post);
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
