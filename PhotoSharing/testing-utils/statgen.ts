import {APIGatewayEvent, APIGatewayProxyResult} from "aws-lambda";
import {Responses} from "../shared/responses";
import {StatGenRequest} from "./model/statgen-request";
import {EventRepository} from "../eventbus/data/event-repository";
import {EventDBItem} from "../eventbus/domain/event-db-item";
import {Topic} from "../shared/eventbus/topics/topic";

export const generateStats = async (event: APIGatewayEvent): Promise<APIGatewayProxyResult> => {

    if (!event.body) {
        return Responses.badRequest('Missing body');
    }

    const request = JSON.parse(event.body);
    if (!validateRequest(request)) {
        return Responses.badRequest('Parameters not valid. Found: \n' + JSON.stringify(request));
    }

    let events: EventDBItem[] = [];
    if (request.commentContent) {
        events = await getCommentsWithContent(request.commentContent);
    } else if (request.eventTag) {
        events = await getEventsWithTag(request.eventTag);
    } else {
        return Responses.badRequest();
    }

    const receivedEvents = events.filter(x => x.receivedAt != null);
    const undeliveredEvents = events.filter(x => x.receivedAt == null);

    let earliestPublishTime = Infinity;
    let latestReceivedAtTime = 0;
    let averageDeliveryLatency = 0;
    for (let event of receivedEvents) {
        if (event.receivedAt && event.receivedAt > latestReceivedAtTime) latestReceivedAtTime = event.receivedAt;
        if (event.time_stamp < earliestPublishTime) earliestPublishTime = event.time_stamp;
        if (event.receivedAt) {
            const deliveryLatency = event.receivedAt - event.time_stamp;
            averageDeliveryLatency = (deliveryLatency + deliveryLatency) / 2;
        }
    }
    const elapsedTime = latestReceivedAtTime - earliestPublishTime;
    const elapsedTimeSeconds = elapsedTime / 1000;
    const count = receivedEvents.length;
    const throughput = count / elapsedTimeSeconds;

    return Responses.Ok({throughput, elapsedTimeSeconds, count, averageDeliveryLatency,
        undeliveredEvents: undeliveredEvents.length, authorizer: event.requestContext.authorizer});
};


async function getCommentsWithContent(content: string): Promise<EventDBItem[]> {
    const filterExpression = 'body.content = :content AND topic = :topic';
    const attributeValues = {
        ':content': content,
        ':topic': Topic.Comment
    };

    return await EventRepository.getEventsWithFilter(filterExpression, attributeValues);
}

async function getEventsWithTag(tag: string): Promise<EventDBItem[]> {
    const filterExpression = 'body.tag = :tag AND topic = :topic';
    const attributeValues = {
        ':tag': tag,
        ':topic': Topic.Demo
    };

    return await EventRepository.getEventsWithFilter(filterExpression, attributeValues);
}

function validateRequest(request: any): request is StatGenRequest {
    return !!request.commentContent || !!request.eventTag;
}
