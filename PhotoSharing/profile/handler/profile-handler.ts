import {APIGatewayEvent, APIGatewayProxyResult} from "aws-lambda";
import {CognitoUtils} from "../../shared/cognito/cognito-utils";
import {Responses} from "../../shared/responses";
import {SetProfileRequest} from "./model/set-profile-data-request";
import {ProfileRepository} from "../data/profile-repository";
import {ProfileDetails} from "../domain/profile-details";

export const update = async (event: APIGatewayEvent): Promise<APIGatewayProxyResult> => {

    const identity = CognitoUtils.getIdentity(event.requestContext);
    if (!identity) {
        return Responses.Unauthorized();
    }

    if (event.body == null) {
        return Responses.badRequest()
    }

    const content = <SetProfileRequest>JSON.parse(event.body);
    if (!validateModel(content)) {
        return Responses.badRequest({ message: 'Missing required field(s)' });
    }

    const updateProfile: ProfileDetails = {
        userId: identity.userId,
        name: content.name
    };

    try {
        await ProfileRepository.updateProfile(updateProfile);
        return Responses.Ok();
    } catch (e) {
        return Responses.InternalServerError(e.message);
    }
};

export const batchGet = async (event: APIGatewayEvent): Promise<APIGatewayProxyResult> => {
    if (!event.queryStringParameters || !event.queryStringParameters.userIds) {
        return Responses.badRequest('Missing userIds parameter');
    }

    const userIds = event.queryStringParameters.userIds.split(',') as string[];
    if (userIds.length < 1) {
        return Responses.badRequest('Error parsing userIds. Please provide comma-separated list');
    }

    const profiles = await ProfileRepository.getProfiles(userIds);

    return Responses.Ok(profiles);
};

export const get = async (event: APIGatewayEvent): Promise<APIGatewayProxyResult> => {
    if (!event.queryStringParameters || !event.queryStringParameters.userId) {
        return Responses.badRequest('Missing userId parameter');
    }

    const userId = event.queryStringParameters.userId;
    const profiles = await ProfileRepository.getProfiles([userId]);

    if (!profiles[userId]) {
        return Responses.notFound();
    }

    return Responses.Ok(profiles[userId]);
};


function validateModel(model: SetProfileRequest): boolean {
    return !!model.name;
}
