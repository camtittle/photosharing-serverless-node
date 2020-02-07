import {Client, ClientOptions} from '@elastic/elasticsearch'
import {isRunningLocally} from "../EnvironmentUtil";

export class ElasticsearchService {

    private static instance: ElasticsearchService;

    private readonly nodeUrl = 'https://search-photosh-elasti-11452jc84f2fb-gahonamyoqwnq5gnsziehogpee.eu-central-1.es.amazonaws.com';
    private readonly localIndexName = 'localPostIndex';
    private readonly devIndexName = 'devPostIndex';

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

    public async put<T>(item: T) {
        if (!item) {
            throw new Error("Cannot put item to Elasticsearch. Item is null");
        }

        const response = await this.client.index({
            index: this.indexName,
            body: item
        });
    }

}
