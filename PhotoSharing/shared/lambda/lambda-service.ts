import Lambda, {InvocationRequest} from 'aws-sdk/clients/lambda';


export class LambdaService {

    private static client = LambdaService.getClient();

    public static async invoke(functionName: string, payload: any) {
        const params: InvocationRequest = {
            FunctionName: functionName,
            Payload: JSON.stringify(payload)
        };

        return this.client.invoke(params).promise();
    }

    public static async invokeAsync(functionName: string, payload: any) {
        const params: InvocationRequest = {
            FunctionName: functionName,
            InvocationType: 'Event',        // async invocation
            Payload: JSON.stringify(payload)
        };

        return this.client.invoke(params).promise();
    }

    private static getClient(): Lambda {
        return new Lambda({
            endpoint: process.env.IS_OFFLINE ? 'http://localhost:3000' : undefined
        });
    }
}
