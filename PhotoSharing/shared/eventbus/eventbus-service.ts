import {TopicToEventMap} from "./topics/topic";
import {v4 as uuid} from 'uuid';
import {LambdaService} from "../lambda/lambda-service";
import {ConfirmEventRequest} from "./model/confirm-event-request";
import {PublishEventRequest} from "./model/publish-event-request";

export class EventBusService {

    private static publishLambdaName = 'publishEvent';
    private static confirmLambdaName = 'confirmEvent';

    public static async publish<T extends keyof TopicToEventMap>(topic: T, body: TopicToEventMap[T]) {
        if (!topic || !body) {
            throw new Error('Topic and body required to publish event. Found: ' +
                JSON.stringify({topic, body}));
        }

        const event: PublishEventRequest = {
            id: uuid(),
            topic: topic,
            timestamp: new Date().getTime(),
            body: body
        };

        try {
            const result = await LambdaService.invoke(this.publishLambdaName, event);
            console.log(result);
        } catch (err) {
            console.error(err);
            throw new Error('Error whilst invoking PublishEvent lambda. Payload: ' + JSON.stringify(event));
        }

    }

    public static async confirm(eventId: string, destination: string) {
        if (!eventId || !destination) {
            throw new Error('EventId and Destination required to confirm event receipt. Found: ' +
                JSON.stringify({eventId, destination}));
        }

        const request: ConfirmEventRequest = {
            eventId: eventId,
            destination: destination
        };

        try {
            const result = await LambdaService.invoke(this.confirmLambdaName, request);
            console.log(result);
        } catch (err) {
            console.error(err);
            throw new Error('Error whilst invoking ConfirmEvent lambda. Payload: ' + JSON.stringify(request));
        }
    }


}
