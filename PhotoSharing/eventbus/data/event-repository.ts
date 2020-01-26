import {DynamoDbService} from "../../shared/dynamodb/dynamo-db-service";
import {EventDBItem} from "../domain/event-db-item";
import retry from 'async-retry';
import {GenericScan, LessThanScan} from "../../shared/dynamodb/model/scan";
import {Delete} from "../../shared/dynamodb/model/delete";

// Repository wraps the dynamoDb service to abstract DB away from event bus logic
export class EventRepository {

    private static dynamoDbService = DynamoDbService.getInstance();

    private static tableName = 'eventsTable';
    private static deadLetterTableName = 'eventsDeadLetterTable';
    private static readonly maxRetries = 3;

    private static readonly deleteEventsOnceReceived = false;

    public static async putEvents(events: EventDBItem[]) {
        const promises = events.map(dbItem =>
            this.dynamoDbService.put(this.tableName, dbItem)
        );

        await Promise.all(promises);
    }

    public static async putDeadLetter(event: EventDBItem) {
        await this.dynamoDbService.put(this.deadLetterTableName, event);
    }

    public static async updateRetryCount(id: string, destination: string, count: number) {
        const keys = {
           'id': id,
           'destination': destination
        };
        const updateExpression = 'SET #retryCount = :countVal';
        const attributes = {
            '#retryCount': 'retryCount'
        };
        const values = {
            ':countVal': count
        };

        // Retry up to maxRetries in case of high demand
        await retry<Promise<void>>(async () => {
            await this.dynamoDbService.update(this.tableName, keys, updateExpression, attributes, values);
        }, {
            retries: this.maxRetries
        });
    }

    public static async markEventReceived(eventId: string, destination: string) {
        if (!eventId || !destination) {
            throw new Error('Cannot mark event delivered: Missing params. Found: ' +
                JSON.stringify({eventId, destination}));
        }

        if (this.deleteEventsOnceReceived) {
            await this.deleteEvent(eventId, destination);
        } else {
            const timestamp = new Date().getTime();
            await this.setReceivedFlag(eventId, destination, timestamp);
        }
    }

    private static async setReceivedFlag(eventId: string, destination: string, receivedAtTimestamp: number) {
        if (!eventId || !destination) {
            throw new Error('Cannot delete event: Missing params. Found: ' +
                JSON.stringify({eventId, destination}));
        }

        const keys = {
            id: eventId,
            destination: destination
        };
        const updateExpression = 'SET #receivedAt = :receivedVal';
        const attributeValues = {
            ':receivedVal': receivedAtTimestamp
        };
        const attributeNames = {
            '#receivedAt': 'receivedAt'
        };

        // Retry up to maxRetries in case of high demand
        await retry<Promise<void>>(async () => {
            await this.dynamoDbService.update(this.tableName, keys, updateExpression, attributeNames, attributeValues);
        }, {
            retries: this.maxRetries
        });
    }

    private static async deleteEvent(eventId: string, destination: string) {
        if (!eventId || !destination) {
            throw new Error('Cannot delete event: Missing params. Found: ' +
                JSON.stringify({eventId, destination}));
        }

        const deleteParams: Delete = {
            partitionKeyName: 'id',
            partitionKeyValue: eventId,
            sortKeyName: 'destination',
            sortKeyValue: destination
        };

        // Retry up to maxRetries in case of high demand
        await retry<Promise<void>>(async () => {
            await this.dynamoDbService.delete(this.tableName, deleteParams);
        }, {
            retries: this.maxRetries
        });
    }

    public static async getUndeliveredEvents(beforeTimestamp: number): Promise<EventDBItem[]> {
        const scanParams: LessThanScan<EventDBItem> = {
            fieldName: 'time_stamp',
            lessThanValue: beforeTimestamp
        };

        return await retry(async () => {
            return await this.dynamoDbService.scanLessThan(this.tableName, scanParams);
        }, {
            retries: this.maxRetries
        });
    }

    public static async getEventsWithFilter(filterExpression: string, attributeValues: any): Promise<EventDBItem[]> {
        const scanParams: GenericScan<EventDBItem> = {
            filterString: filterExpression,
            attributeValues: attributeValues
        };

        return await retry(async () => {
            return await this.dynamoDbService.scan(this.tableName, scanParams);
        }, {
            retries: this.maxRetries
        });
    }

}
