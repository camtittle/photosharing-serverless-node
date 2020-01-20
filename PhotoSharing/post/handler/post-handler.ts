import {APIGatewayEvent, APIGatewayProxyResult} from "aws-lambda";
import {Responses} from "../../shared/responses";
import {CreatePostRequest, CreatePostType} from "./model/create-post-request";
import {PostService} from "../business/post-service";
import {CreatePostDetails} from "../business/model/create-post-details";
import {PostType} from "../business/model/post-type";

const postService = PostService.getInstance();

export const create = async (event: APIGatewayEvent): Promise<APIGatewayProxyResult> => {
    if (event.body == null) {
        return Responses.badRequest()
    }

    const content = <CreatePostRequest>JSON.parse(event.body);
    if (!validateModel(content)) {
        return Responses.badRequest({ message: 'Missing required field(s)' });
    }

    const details: CreatePostDetails = {
        userId: 'testId',
        type: getPostType(content.type),
        description: content.description,
        base64Image: content.base64Image,
        latitude: content.latitude,
        longitude: content.longitude
    };

    const post = await postService.createPost(details);

    return Responses.Ok(post);
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