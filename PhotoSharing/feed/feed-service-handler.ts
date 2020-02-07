import {APIGatewayEvent, APIGatewayProxyResult} from "aws-lambda";
import {Responses} from "../shared/responses";
import {ElasticsearchService} from "../shared/elasticsearch/elasticsearch-service";

export const testIndex = async (event: APIGatewayEvent): Promise<APIGatewayProxyResult> => {

    if (event.body == null) {
        return Responses.badRequest();
    }

    const testIndexName = "local-index";

    const esService = ElasticsearchService.getInstance();
    const result = await esService.put(testIndexName, event.body);


    return Responses.Ok(result);
};
