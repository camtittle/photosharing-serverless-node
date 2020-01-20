import {APIGatewayEvent, Context} from "aws-lambda";
import {Responses} from "../../shared/responses";
import {EventDBItem} from "../domain/event-db-item";
import {EventRepository} from "../data/event-repository";
import {EventBusService} from "../../shared/eventbus/eventbus-service";
import {Event} from "../../shared/eventbus/model/event";
import {EventDispatcher} from "./event-dispatcher";
import {getSubscriptionsForTopic} from "../subscriptions";
import {ConfirmEventRequest} from "./model/confirm-event-request";
import {PublishEventRequest} from "./model/publish-event-request";
import {DispatchEventRequest} from "./model/dispatch-event-request";
import {LambdaService} from "../../shared/lambda/lambda-service";
import {Topic} from "../../shared/eventbus/topics/topic";

const DISPATCHER_FUNCTION_NAME = 'dispatchEvent';
const MAX_DISPATCH_RETRIES = 3;

export const publish = async (eventToPublish: PublishEventRequest, context: Context) => {
    if (!eventToPublish.id || !eventToPublish.timestamp || !eventToPublish.topic || !eventToPublish.body) {
        throw new Error("Cannot publish event: missing event parameters. Found: " + JSON.stringify(eventToPublish));
    }

    const subs = getSubscriptionsForTopic(eventToPublish.topic);
    if (subs.length < 1) {
        console.log(`Event ${eventToPublish.id} for topic ${eventToPublish.topic} has no subscriptions. Cancelling publish`);
        return;
    }

    const eventItems: EventDBItem[] = subs.map(sub => ({
        id: eventToPublish.id,
        topic: eventToPublish.topic,
        body: eventToPublish.body,
        time_stamp: eventToPublish.timestamp,
        destination: sub.functionName,
        retryCount: 0,
        receivedAt: null
    }));

    await EventRepository.putEvents(eventItems);

    const dispatchRequest: DispatchEventRequest = {
       id: eventToPublish.id,
       topic: eventToPublish.topic,
       body: eventToPublish.body,
       timestamp: eventToPublish.timestamp,
       destinations: subs.map(s => s.functionName)
    };

    // invoke dispatcher asynchronously
    await LambdaService.invokeAsync(DISPATCHER_FUNCTION_NAME, dispatchRequest);
};

export const dispatch = async (eventToDispatch: DispatchEventRequest, context: Context) => {
    console.log('Dispatcher function started');
    await EventDispatcher.dispatch(eventToDispatch);

};

export const scheduledRedispatch = async (context: Context) => {
    console.log('Scheduled re-dispatcher function started');

    // Get un-dispatched events
    const beforeNumberOfMinutes = 2;
    const beforeTimestamp = new Date(new Date().getTime() - beforeNumberOfMinutes*60000).getTime();

    const events = await EventRepository.getUndeliveredEvents(beforeTimestamp);
    console.log(events);

    const eventsToDelete: EventDBItem[] = [];
    const eventsToRetry: EventDBItem[] = [];
    events.forEach(e => e.retryCount > MAX_DISPATCH_RETRIES ? eventsToDelete.push(e) : eventsToRetry.push(e));

    // Retry tasks
    const tasks: Promise<void>[] = [];
    eventsToRetry.forEach(event => {
        console.log('Attempting to redispatch event ' + event.id);

        event.retryCount++;
        tasks.push(EventRepository.updateRetryCount(event.id, event.destination, event.retryCount));

        tasks.push(
            EventDispatcher.dispatchSingle({
                id: event.id,
                topic: <Topic>event.topic,
                timestamp: event.time_stamp,
                body: event.body,
                destination: event.destination,
                retryCount: event.retryCount
            })
        );
    });

    eventsToDelete.forEach(async event => {
        tasks.push(new Promise<void>(async resolve => {
            try {
                console.log('Attempting to move event ' + event.id + ' to dead letter store');
                await EventRepository.putDeadLetter(event);
                // TODO: this actually deletes it - is this method name obvious?
                await EventRepository.markEventReceived(event.id, event.destination);
                console.log('Successfully moved event ' + event.id + ' to dead letter store');
            } catch {
                console.error('Unable to add event ' + event.id + ' to dead letter store.');
            } finally {
                resolve();
            }
        }));
    });

    await Promise.all(tasks);
};

export const confirm = async (eventToConfirm: ConfirmEventRequest, context: Context) => {
    if (!eventToConfirm.eventId || !eventToConfirm.destination) {
        throw new Error("Cannot confirm event: missing event parameters. Found: " + JSON.stringify(eventToConfirm));
    }

    await EventRepository.markEventReceived(eventToConfirm.eventId, eventToConfirm.destination);
};

// HTTP entry for publish function, used for debugging
export const publishDebug = async (event: APIGatewayEvent) => {
    if (event.body == null) {
        return Responses.badRequest();
    }

    const eventToPublish: Event = JSON.parse(event.body);
    await EventBusService.publish(eventToPublish.topic, eventToPublish.body);
};

export const confirmDebug = async (event: APIGatewayEvent) => {
    if (event.body == null) {
        return Responses.badRequest();
    }

    const body = JSON.parse(event.body);
    await EventBusService.confirm(body.eventId, body.destination);
};
