import {ApiResponse, Client, ClientOptions} from '@elastic/elasticsearch'
import {isRunningLocally} from "../EnvironmentUtil";
import {bool} from "aws-sdk/clients/signer";
import {IndexPostItem} from "./model/index-post-item";

export class ElasticsearchService {

    private static instance: ElasticsearchService;

    private readonly nodeUrl = 'https://search-photosh-elasti-11452jc84f2fb-gahonamyoqwnq5gnsziehogpee.eu-central-1.es.amazonaws.com';
    private readonly localIndexName = 'local-posts';
    private readonly devIndexName = 'dev-posts';

    private readonly client: Client;
    private readonly indexName: string;

    private constructor() {
        const opts: ClientOptions = {
            node: this.nodeUrl
        };

        this.indexName = isRunningLocally() ? this.localIndexName : this.devIndexName;
        this.client = new Client(opts);
    }

    public static getInstance(): ElasticsearchService {
        if (!this.instance) {
            this.instance = new ElasticsearchService();
        }

        return this.instance;
    }

    public async indexItem(id: string, item: any): Promise<boolean> {
        if (!item) {
            throw new Error("Cannot indexItem item to Elasticsearch. Item is null");
        }

        const params: any = {
            index: this.indexName,
            id: id,
            body: item
        };
        const response = await this.client.index(params);

        if (!ElasticsearchService.isResponseSuccess(response)) {
            throw new Error('Error indexing item in ES: \n' +
                'Status code: ' + response.statusCode +
                '\n. Body: \n'+ response.body);
        }

        return true;
    }

    public async getFeed(): Promise<IndexPostItem[]> {
        const response = await this.client.search({
            index: this.indexName,
            body: this.getFeedQuery()
        });

        if (!ElasticsearchService.isResponseSuccess(response)) {
            throw new Error('Error getting feed from ES: \n' +
                'Status code: ' + response.statusCode +
                '\n. Body: \n'+ response.body);
        } else {
            return this.parseHits(response.body);
        }
    }

    private static isResponseSuccess(response: ApiResponse): boolean {
        return !!response.statusCode && response.statusCode >= 200 && response.statusCode <= 299;
    }

    private parseHits(responseBody: any): IndexPostItem[] {
        if (!!responseBody.hits && !!responseBody.hits.hits) {
            return responseBody.hits.hits.map((hit: any) => hit._source);
        }
        return [];
    }

    private getFeedQuery(): string {
        const queryBody = {
            query: {
                match_all: {}
            },
            sort: [
                { timestamp: "desc" }
            ]
        };

        return JSON.stringify(queryBody);
    }

}
