import CognitoIdentityServiceProvider, {AdminListGroupsForUserRequest} from "aws-sdk/clients/cognitoidentityserviceprovider";

export class CognitoService {

    public static async getUserGroups(claims: CognitoIdentityClaims): Promise<string[]> {
        const client = new CognitoIdentityServiceProvider();
        const userPoolId = this.getUserPoolId(claims);

        const request: AdminListGroupsForUserRequest = {
            Username: claims.sub,
            UserPoolId: userPoolId
        };
        console.log(request);

        try {
            const groups = await client.adminListGroupsForUser(request).promise();

            if (!groups || !groups.Groups) {
                return [];
            }

            return groups.Groups
                .filter(x => x.GroupName !== undefined)
                .map(x => x.GroupName as string);
        } catch (e) {
            console.error('Could not get User Pool Groups for user:');
            console.error(e);
            return [];
        }
    }

    private static getUserPoolId(claims: CognitoIdentityClaims) {
        // issuer expected of the form https://cognito-idp.eu-central-1.amazonaws.com/eu-central-1_wRe0jKDuS
        const parts = claims.iss.split('/');
        return parts[parts.length - 1];
    }

}

export type CognitoIdentityClaims = {
    sub: string;
    iss: string;
}
