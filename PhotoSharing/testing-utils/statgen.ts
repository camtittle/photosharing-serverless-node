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

    const events = await getCommentsWithContent(request.commentContent);
    const receivedEvents = events.filter(x => x.receivedAt != null);

    const earliestPublishTime = Math.min(...receivedEvents.map(x => x.time_stamp));
    const latestReceivedAtTime = Math.max(...receivedEvents.map(x => x.receivedAt ? x.receivedAt : 0));
    const elapsedTime = latestReceivedAtTime - earliestPublishTime;
    const elapsedTimeSeconds = elapsedTime / 1000;
    const count = receivedEvents.length;
    const throughput = count / elapsedTimeSeconds;

    return Responses.Ok({throughput, elapsedTimeSeconds, count});
};


async function getCommentsWithContent(content: string): Promise<EventDBItem[]> {
    const filterExpression = 'body.content = :content AND topic = :topic';
    const attributeValues = {
        ':content': content,
        ':topic': Topic.Comment
    };

    return await EventRepository.getEventsWithFilter(filterExpression, attributeValues);
}

function validateRequest(request: any): request is StatGenRequest {
    return !!request.commentContent;
}
