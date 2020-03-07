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
import Log from "../../shared/logging/log";
import {isRunningLocally} from "../../shared/EnvironmentUtil";

const DISPATCHER_FUNCTION_NAME = 'dispatchEvent';
const MAX_DISPATCH_RETRIES = 3;
const tag = 'EventBusHandler';


/*
    Publish Event Lambda Function
 */
export const publish = async (eventToPublish: PublishEventRequest, context: Context) => {
    if (!eventToPublish.id || !eventToPublish.timestamp || !eventToPublish.topic || !eventToPublish.body) {
        throw new Error("Cannot publish event: missing event parameters. Found: " + JSON.stringify(eventToPublish));
    }

    Log(tag, 'Publishing event to TOPIC ' + eventToPublish.topic + ' with event body:\n', eventToPublish.body);

    const subs = getSubscriptionsForTopic(eventToPublish.topic);
    if (subs.length < 1) {
        console.log(`Event ${eventToPublish.id} for TOPIC ${eventToPublish.topic} has no subscriptions. Cancelling publish`);
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
    Log(tag, 'Generated ', eventItems.length, ' event items for event ID ' + eventToPublish.id);

    await EventRepository.putEvents(eventItems);

    const dispatchRequest: DispatchEventRequest = {
       id: eventToPublish.id,
       topic: eventToPublish.topic,
       body: eventToPublish.body,
       timestamp: eventToPublish.timestamp,
       destinations: subs.map(s => s.functionName)
    };

    // invoke dispatcher asynchronously
    Log(tag, 'Passing DispatchRequest to dispatcher\n', dispatchRequest);
    await LambdaService.invokeAsync(DISPATCHER_FUNCTION_NAME, dispatchRequest);

    return 1;
};


/*
    Dispatch Events Lambda Function
 */
export const dispatch = async (eventToDispatch: DispatchEventRequest, context: Context) => {
    await EventDispatcher.dispatch(eventToDispatch);
};


/*
    Confirm Event Delivery Lambda
 */
export const confirm = async (eventToConfirm: ConfirmEventRequest, context: Context) => {
    Log(tag, 'Attempting to confirm receipt of EVENT', eventToConfirm.eventId, 'by', eventToConfirm.destination);

    if (!eventToConfirm.eventId || !eventToConfirm.destination) {
        throw new Error("Cannot confirm event: missing event parameters. Found: " + JSON.stringify(eventToConfirm));
    }

    await EventRepository.markEventReceived(eventToConfirm.eventId, eventToConfirm.destination);

    return 1;
};



/*
   Scheduled Event Re-dispatcher Lambda Function
 */
export const scheduledRedispatch = async (context: Context) => {
    Log(tag ,'Scheduled re-dispatcher function started');

    // When not running locally, use a 2 min window to give the subscriber chance to confirm receipt of event
    const beforeNumberOfMinutes = isRunningLocally() ? 0 : 2;
    const beforeTimestamp = new Date(new Date().getTime() - beforeNumberOfMinutes*60000).getTime();

    const events = await EventRepository.getUndeliveredEvents(beforeTimestamp);
    Log(tag, 'Found', events.length, 'events for re-dispatch');
    Log(tag, 'Event IDs:', events.map(x => x.id));

    const eventsToDelete: EventDBItem[] = [];
    const eventsToRetry: EventDBItem[] = [];
    events.forEach(e => e.retryCount > MAX_DISPATCH_RETRIES ? eventsToDelete.push(e) : eventsToRetry.push(e));

    // Retry tasks
    const tasks: Promise<void>[] = [];
    eventsToRetry.forEach(event => {
        Log(tag, 'Attempting to redispatch event ' + event.id);

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
                Log(tag, 'Event', event.id, 'reached MAX_RETRIES count. Deleting...');
                await EventRepository.putDeadLetter(event);
                await EventRepository.markEventReceived(event.id, event.destination, true);
            } catch {
                console.error('Unable to add event ' + event.id + ' to dead letter store.');
            } finally {
                resolve();
            }
        }));
    });

    await Promise.all(tasks);

    return 1;
};

// HTTP entry for publish function, used for debugging
export const publishDebug = async (event: APIGatewayEvent) => {
    if (event.body == null ) {
        return Responses.badRequest();
    }

    const eventToPublish: Event = JSON.parse(event.body);
    await EventBusService.publish(eventToPublish.topic, eventToPublish.body);

    return Responses.Ok();
};

export const confirmDebug = async (event: APIGatewayEvent) => {
    if (event.body == null) {
        return Responses.badRequest();
    }

    const body = JSON.parse(event.body);
    await EventBusService.confirm(body.eventId, body.destination);

    return Responses.Ok();
};
