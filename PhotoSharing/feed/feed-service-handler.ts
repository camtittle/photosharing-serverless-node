import {APIGatewayEvent, APIGatewayProxyResult} from "aws-lambda";
import {Responses} from "../shared/responses";
import {ElasticsearchService} from "../shared/elasticsearch/elasticsearch-service";
import {IndexPostItem} from "../shared/elasticsearch/model/index-post-item";
import {FeedResponseItem} from "./model/feed-response-item";
import {GetFeedRequest} from "./model/get-feed-request";

export const get = async (event: APIGatewayEvent): Promise<APIGatewayProxyResult> => {

    const request = event.queryStringParameters;
    if (!validateGetFeedModel(request)) {
        return Responses.badRequest('Malformed request');
    }

    const esService = ElasticsearchService.getInstance();
    const result = await esService.getFeed(request.lat, request.lon);

    if (!!result) {
        return Responses.Ok(mapIndexItemsToFeedItems(request.lat, request.lon, result));
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

function mapIndexItemsToFeedItems(lat: number, lon: number, indexItems: IndexPostItem[]): FeedResponseItem[] {
    return indexItems.map(x => ({
        id: x.postId,
        userId: x.userId,
        imageUrl: x.imageUrl,
        commentCount: x.commentCount,
        distanceKm: calcDistance(lat, lon, x.location.lat, x.location.lon),
        timestamp: x.timestamp,
        description: x.description
    }));
}

function calcDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
    if ((lat1 == lat2) && (lon1 == lon2)) {
        return 0;
    }
    else {
        const radlat1 = Math.PI * lat1/180;
        const radlat2 = Math.PI * lat2/180;
        const theta = lon1-lon2;
        const radtheta = Math.PI * theta/180;
        let dist = Math.sin(radlat1) * Math.sin(radlat2) + Math.cos(radlat1) * Math.cos(radlat2) * Math.cos(radtheta);
        if (dist > 1) {
            dist = 1;
        }
        dist = Math.acos(dist);
        dist = dist * 180/Math.PI;
        dist = dist * 60 * 1.1515;
        dist = dist * 1.609344;
        return dist;
    }
}

function validateGetFeedModel(model: any): model is GetFeedRequest {
    return !!model && model.lat != undefined && model.lon != undefined;
}
