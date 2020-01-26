import {APIGatewayEventRequestContext} from "aws-lambda";
import {Identity} from "./identity";

export class CognitoUtils {

    private static getGroups(claims: CognitoIdentityTokenClaims): string[] {
        if (claims && claims['cognito:groups']) {
            return claims['cognito:groups'];
        }
        return [];
    }

    private static getUserPoolId(claims: CognitoIdentityTokenClaims): string {
        if (!claims || !claims.iss) {
            throw new Error('Cannot parse User Pool ID from claims. Missing iss claim.')
        }

        const parts = claims.iss.split('/');
        return parts[parts.length - 1];
    }

    public static getIdentity(requestContext: APIGatewayEventRequestContext): Identity | null {
        if (!requestContext.authorizer || !requestContext.authorizer.claims) {
            return null;
        }

        const claims: CognitoIdentityTokenClaims = requestContext.authorizer.claims;

        return {
            userId: claims.sub,
            userPoolId: this.getUserPoolId(claims),
            groups: this.getGroups(claims)
        };
    }
}

export type CognitoIdentityTokenClaims = {
    sub: string;
    iss: string;
    'cognito:groups'?: string[];
}
