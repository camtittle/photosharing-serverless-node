import { constants as httpConstants } from 'http2';
import {APIGatewayProxyResult} from "aws-lambda";

export class Responses {

    public static badRequest(jsonBody?: any): APIGatewayProxyResult {
        return {
            statusCode: httpConstants.HTTP_STATUS_BAD_REQUEST,
            body: JSON.stringify(jsonBody,
                null,
                2
            ),
        }
    }

    public static Ok(jsonBody?: any): APIGatewayProxyResult {
        return {
            statusCode: httpConstants.HTTP_STATUS_OK,
            body: JSON.stringify(jsonBody,
                null,
                2
            ),
        }
    }

    public static InternalServerError(jsonBody?: any): APIGatewayProxyResult {
        return {
            statusCode: httpConstants.HTTP_STATUS_INTERNAL_SERVER_ERROR,
            body: JSON.stringify(jsonBody,
                null,
                2
            ),
        }
    }

    public static Unauthorized(jsonBody?: any): APIGatewayProxyResult {
        return {
            statusCode: httpConstants.HTTP_STATUS_UNAUTHORIZED,
            body: JSON.stringify(jsonBody,
                null,
                2
            ),
        }
    }

    public static notFound(jsonBody?: any): APIGatewayProxyResult {
        return this.getResultWithStatusCode(jsonBody, httpConstants.HTTP_STATUS_NOT_FOUND);
    }

    private static getResultWithStatusCode(jsonBody: any, statusCode: number): APIGatewayProxyResult {
        return {
            statusCode: statusCode,
            body: JSON.stringify(jsonBody,
                null,
                2
            ),
        }
    }
}
