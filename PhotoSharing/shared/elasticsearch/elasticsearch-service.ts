import {ApiResponse, Client, ClientOptions} from '@elastic/elasticsearch'
import {isRunningLocally} from "../EnvironmentUtil";
import {IndexPostItem} from "./model/index-post-item";
import Log from "../logging/log";

export class ElasticsearchService {

    private static instance: ElasticsearchService;

    private readonly nodeUrl = 'https://search-photosh-elasti-11452jc84f2fb-gahonamyoqwnq5gnsziehogpee.eu-central-1.es.amazonaws.com';

    // TODO swap these
    private readonly localIndexName = 'local-posts-2';
    private readonly devIndexName = 'dev-posts-2';

    private readonly tag = 'ElasticsearchService';

    private readonly client: Client;
    private readonly indexName: string;
    private readonly getFeedItemLimit = 10;

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
            throw new Error('Cannot indexItem item to Elasticsearch. Item is null');
        }

        Log(this.tag, 'Indexing item in Elasticsearch with ID', id);

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

    public async updateItem(id: string, updateScript: string, scriptParams: any) {
        if (!id || !updateScript) {
            throw new Error('Cannot perform update to ES index. Missing required params');
        }

        Log(this.tag, 'Updating item', id);

        const params = {
            index: this.indexName,
            id: id,
            body: {
                script: {
                    source: updateScript,
                    lang: 'painless',
                    params: scriptParams
                }
            }
        };

        const response = await this.client.update(params);

        if (!ElasticsearchService.isResponseSuccess(response)) {
            throw new Error('Error updating item in ES: \n' +
                'Status code: ' + response.statusCode +
                '\n. Body: \n'+ response.body);
        }
    }

    public async deleteItem(id: string) {
        const params: any = {
            index: this.indexName,
            id: id,
        };
        const response = await this.client.delete(params);

        return response;
    }

    public async getFeed(lat: number, lon: number): Promise<IndexPostItem[]> {
        Log(this.tag, 'Get feed from Elasticsearch for location:', lat, ',', lon);

        const response = await this.client.search({
            index: this.indexName,
            body: this.getFeedQuery(lat, lon)
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

    private getFeedQuery(lat: number, lon: number): string {
        const queryBody = {
            query: {
                bool: {
                    must: {
                        match_all: {}
                    },
                    filter: {
                        geo_distance: {
                            distance: '10km',
                            location: {
                                lat: lat,
                                lon: lon
                            }
                        }
                    }
                }
            },
            from: 0,
            size: this.getFeedItemLimit,
            sort: [
                { timestamp: "desc" }
            ]
        };
        Log(this.tag, 'Generating Elasticsearch query:');
        Log(this.tag, JSON.stringify(queryBody));

        return JSON.stringify(queryBody);
    }

}
