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

function validateModel(model: SetProfileRequest): boolean {
    return !!model.name;
}
