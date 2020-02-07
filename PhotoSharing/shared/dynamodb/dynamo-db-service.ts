import * as DynamoDb from "aws-sdk/clients/dynamodb";
import {DocumentClient} from "aws-sdk/lib/dynamodb/document_client";
import PutItemInput = DocumentClient.PutItemInput;
import QueryInput = DocumentClient.QueryInput;
import {BetweenQuery, PartitionKeyQuery} from "./model/query";
import {GenericScan, LessThanScan} from "./model/scan";
import ScanInput = DocumentClient.ScanInput;
import DeleteItemInput = DocumentClient.DeleteItemInput;
import {Delete} from "./model/delete";
import {ClientConfiguration} from "aws-sdk/clients/dynamodb";
import UpdateItemInput = DocumentClient.UpdateItemInput;
import retry from "async-retry";
import {isRunningLocally} from "../EnvironmentUtil";


export class DynamoDbService {

    private static instance: DynamoDbService;

    private dynamoDbClient: DynamoDb.DocumentClient;
    private readonly maxRetries = 3;

    private constructor() {
        let options: ClientConfiguration = {};
        if (isRunningLocally()) {
            options = {
                region: 'localhost',
                endpoint: 'http://localhost:8000'
            };
        } else {
            options = {
                region: process.env.AWS_REGION
            };
        }
        this.dynamoDbClient = new DynamoDb.DocumentClient(options);
    }

    public static getInstance(): DynamoDbService {
        if (!DynamoDbService.instance) {
            DynamoDbService.instance = new DynamoDbService();
        }

        return DynamoDbService.instance;
    }

    public async put(table: string, item: any) {
        const params: PutItemInput = {
            TableName: table,
            Item: item
        };

        try {
            // Retry up to maxRetries in case of high demand
            await retry(async () => {
                await this.dynamoDbClient.put(params).promise();
            }, {
                retries: this.maxRetries
            });
        } catch (e) {
            console.error(e);
            throw new Error('Error putting new object in dynamoDb table');
        }
    }

    public async delete(table: string, params: Delete) {
        if (!table || !params) {
            throw new Error('Cannot perform DELETE. Missing params. Found: ' +
                JSON.stringify({tableName: table, params: params}));
        }

        const dynamoParams: DeleteItemInput = {
            TableName: table,
            Key: {
                [params.partitionKeyName]: params.partitionKeyValue
            }
        };

        if (params.sortKeyName && params.sortKeyValue) {
            dynamoParams.Key[params.sortKeyName as string] = params.sortKeyValue
        }

        await this.dynamoDbClient.delete(dynamoParams).promise();
    }

    public async update(table: string, keys: any, updateExpression: string, attributeNames: any,
                        attributeValues: any, conditionExpression?: string) {
        if (!table || !updateExpression || !keys || !attributeNames || !attributeValues) {
            throw new Error('Cannot perform UPDATE. Missing params. Found: ' +
                JSON.stringify({table, keys, updateExpression, attributeNames, attributeValues}));
        }

        const params: UpdateItemInput = {
            TableName: table,
            Key: keys,
            UpdateExpression: updateExpression,
            ExpressionAttributeNames: attributeNames,
            ExpressionAttributeValues: attributeValues
        };

        if (conditionExpression) {
            params.ConditionExpression = conditionExpression;
        }

        try {
            await this.dynamoDbClient.update(params).promise();
        } catch (e) {
            // Silently catch conditional check failed as this is OK
            if (e.code && e.code === 'ConditionalCheckFailedException') {
                console.log('Conditional Expression was false during UPDATE to item: ', {table, keys});
            } else {
                throw e;
            }
        }
    }

    // Get items with particular paritionKey, and whose range key is between 2 values
    public async queryBetween<ItemType>(table: string, query: BetweenQuery): Promise<ItemType[]> {
        if (!query.partitionKeyName || !query.partitionKeyValue || !query.sortKeyName
            || !query.sortKeyValueStart || !query.sortKeyValueEnd) {
            throw new Error('Cannot perform BETWEEN query: Missing query parameters. Found: \n'
                + JSON.stringify(query));
        }

        const keyConditionExpression = `${query.partitionKeyName} = :partitionKeyVal AND 
            ${query.sortKeyName} BETWEEN :sortKeyStart AND :sortKeyEnd`;

        const params: QueryInput = {
            TableName: table,
            KeyConditionExpression: keyConditionExpression,
            ExpressionAttributeValues: {
                ':partitionKeyVal': query.partitionKeyValue,
                ':sortKeyStart': query.sortKeyValueStart,
                ':sortKeyEnd': query.sortKeyValueEnd
            }
        };

        const result = await this.dynamoDbClient.query(params).promise();

        return result.Items == undefined ? [] : result.Items as ItemType[];
    }

    // TODO: refactor query methods to be more generic, i.e use an enum to choose operation
    public async queryPartitionKey<ItemType>(table: string, query: PartitionKeyQuery): Promise<ItemType[]> {
        if (!query.partitionKeyName || !query.partitionKeyValue) {
            throw new Error('Cannot perform PARTITION KEY query: Missing query parameters. Found: \n'
                + JSON.stringify(query));
        }

        const keyConditionExpression = `${query.partitionKeyName} = :partitionKeyVal`;

        const params: QueryInput = {
            TableName: table,
            KeyConditionExpression: keyConditionExpression,
            ExpressionAttributeValues: {
                ':partitionKeyVal': query.partitionKeyValue
            }
        };

        const result = await this.dynamoDbClient.query(params).promise();

        return result.Items == undefined ? [] : result.Items as ItemType[];
    }

    public async scanLessThan<ItemType>(table: string, params: LessThanScan<ItemType>): Promise<ItemType[]> {
        if (!params.fieldName || params.lessThanValue == undefined) {
            throw new Error('Cannot perform LESS THAN scan: Missing scan parameters. Found:\n' +
                + JSON.stringify(params));
        }

        const filterExpression = `${params.fieldName} < :fieldName`;

        const dynamoParams: ScanInput = {
            TableName: table,
            FilterExpression: filterExpression,
            ExpressionAttributeValues: {
                ':fieldName': params.lessThanValue
            }
        };

        const result = await this.dynamoDbClient.scan(dynamoParams).promise();

        return result.Items == undefined ? [] : result.Items as ItemType[];
    }

    public async scan<ItemType>(table: string, params?: GenericScan<ItemType>) {
        const dynamoParams: ScanInput = {
            TableName: table
        };

        if (params && params.filterString && params.attributeValues) {
            dynamoParams.FilterExpression = params.filterString;
            dynamoParams.ExpressionAttributeValues = params.attributeValues;
        }

        const result = await this.dynamoDbClient.scan(dynamoParams).promise();

        return result.Items == undefined ? [] : result.Items as ItemType[];
    }

}
