import Lambda, {InvocationRequest} from 'aws-sdk/clients/lambda';
import Log from "../logging/log";
import {isRunningLocally} from "../EnvironmentUtil";


export class LambdaService {

    private static client = LambdaService.getClient();
    private static tag = "LambdaService";

    public static async invoke(functionName: string, payload: any) {
        const params: InvocationRequest = {
            FunctionName: functionName,
            InvocationType: 'RequestResponse',        // sync invocation
            Payload: JSON.stringify(payload)
        };

        Log(this.tag, 'Invoking', functionName);
        return this.client.invoke(params).promise();
    }

    public static async invokeAsync(functionName: string, payload: any) {
        const params: InvocationRequest = {
            FunctionName: functionName,
            InvocationType: 'Event',        // async invocation
            Payload: JSON.stringify(payload)
        };

        Log(this.tag, 'Invoking', functionName, 'asynchronously');
        return this.client.invoke(params).promise();
    }

    private static getClient(): Lambda {
        return new Lambda({
            endpoint: isRunningLocally() ? 'http://localhost:3000' : undefined
        });
    }
}
