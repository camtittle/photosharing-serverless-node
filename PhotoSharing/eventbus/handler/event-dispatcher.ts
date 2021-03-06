import {LambdaService} from "../../shared/lambda/lambda-service";
import {DispatchEventRequest} from "./model/dispatch-event-request";
import {Event} from "../../shared/eventbus/model/event";
import Log from "../../shared/logging/log";

export class EventDispatcher {

    private static readonly tag = EventDispatcher.name;

    public static async dispatch(event: DispatchEventRequest) {
        Log(this.tag, 'Dispatching event', event.id);

        if (!event.id || !event.topic || !event.timestamp || !event.body || !event.destinations) {
            throw new Error("Cannot dispatch event: missing event parameters. Found: " + JSON.stringify(event));
        }

        if (event.destinations.length < 0) {
            console.log(`Event ${event.id} has no destinations. Cancelling dispatch`);
            return;
        }

        // async invocation of lambdas - don't wait for them to complete.
        Log(this.tag, 'Mapping event to', event.destinations.length ,'Lambda invocation(s)');
        const invocations = event.destinations.map(functionName => {
            return this.dispatchSingle({
                id: event.id,
                topic: event.topic,
                timestamp: event.timestamp,
                body: event.body,
                destination: functionName,
                retryCount: 0
            })
        });

        await Promise.all(invocations);
    }

    public static async dispatchSingle(event: Event): Promise<void> {
        if (!event.id || !event.topic || !event.timestamp || !event.body || !event.destination) {
            throw new Error("Cannot dispatch event: missing event parameters. Found: " + JSON.stringify(event));
        }

        // we are wrapping the promise in order to handle individual invocation failures when using Promise.all()
        return new Promise<void>(async resolve => {
            try {
                await LambdaService.invokeAsync(event.destination, event);
            } catch (e) {
                console.error(`Failed to dispatch event ${event.id} to function '${event.destination}'.\n Lambda error: ${e}`);
            } finally {
                resolve();
            }
        });
    }

}

