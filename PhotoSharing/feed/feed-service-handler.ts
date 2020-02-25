import {APIGatewayEvent, APIGatewayProxyResult} from "aws-lambda";
import {Responses} from "../shared/responses";
import {ElasticsearchService} from "../shared/elasticsearch/elasticsearch-service";
import {IndexPostItem} from "../shared/elasticsearch/model/index-post-item";
import {FeedResponseItem} from "./model/feed-response-item";

export const get = async (event: APIGatewayEvent): Promise<APIGatewayProxyResult> => {
    const esService = ElasticsearchService.getInstance();
    const result = await esService.getFeed();

    if (!!result) {
        return Responses.Ok(mapIndexItemsToFeedItems(result));
    } else {
        return Responses.InternalServerError();
    }

    return Responses.Ok(result);
};

export const deleteItem = async (event: APIGatewayEvent): Promise<APIGatewayProxyResult> => {

    if (!event.body) {
        return Responses.badRequest();
    }
    const esService = ElasticsearchService.getInstance();

    const body = JSON.parse(event.body);
    //const result = await esService.deleteItem(body.id);
    const updateScript = 'if (!ctx._source.containsKey(\'lastCommentEventTimestamp\') ' +
        '|| ctx._source.lastCommentEventTimestamp < params.eventTimestamp) {' +
            'ctx._source.lastCommentEventTimestamp = params.eventTimestamp; ' +
            'ctx._source.commentCount = params.commentCount }';
    const params = {
        eventTimestamp: 2,
        commentCount: 5
    };
    const result = await esService.updateItem(body.id, updateScript, params);

    return Responses.Ok();
};

function mapIndexItemsToFeedItems(indexItems: IndexPostItem[]): FeedResponseItem[] {
    return indexItems.map(x => ({
        id: x.postId,
        userId: x.userId,
        imageUrl: x.imageUrl,
        commentCount: x.commentCount,
        distanceKm: calcDistance(),
        timestamp: x.timestamp,
        description: x.description
    }));
}

function calcDistance(): number {
    return 0.4;
}
