import {DynamoDbService} from "../../shared/dynamodb/dynamo-db-service";
import {EventDBItem} from "../domain/event-db-item";
import retry from 'async-retry';
import {GenericScan, LessThanScan} from "../../shared/dynamodb/model/scan";
import {Delete} from "../../shared/dynamodb/model/delete";
import Log from "../../shared/logging/log";
import {time} from "aws-sdk/clients/frauddetector";

// Repository wraps the dynamoDb service to abstract DB away from event bus logic
export class EventRepository {

    private static dynamoDbService = DynamoDbService.getInstance();
    private static tag = 'EventRepository';

    private static tableName = 'eventsTable';
    private static deadLetterTableName = 'eventsDeadLetterTable';
    private static readonly maxRetries = 3;

    private static readonly deleteEventsOnceReceived = false;

    public static async putEvents(events: EventDBItem[]) {
        Log(this.tag, 'Storing ', events.length, ' event item(s)');

        const promises = events.map(dbItem =>
            this.dynamoDbService.put(this.tableName, dbItem)
        );

        await Promise.all(promises);
    }

    public static async putDeadLetter(event: EventDBItem) {
        Log(this.tag, 'Putting event', event.id, 'to Dead letter storw');
        await this.dynamoDbService.put(this.deadLetterTableName, event);
    }

    public static async updateRetryCount(id: string, destination: string, count: number) {
        Log(this.tag, 'Update retry count to', count, 'for event', id, 'for destination', destination);

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

    public static async markEventReceived(eventId: string, destination: string, forceDelete: boolean = false) {
        if (!eventId || !destination) {
            throw new Error('Cannot mark event delivered: Missing params. Found: ' +
                JSON.stringify({eventId, destination}));
        }

        if (this.deleteEventsOnceReceived || forceDelete) {
            Log(this.tag, 'Deleting event', eventId, ', received by', destination);
            await this.deleteEvent(eventId, destination);
        } else {
            const timestamp = new Date().getTime();
            Log(this.tag, 'Marking event', eventId, 'as received by', destination, 'at timestamp', timestamp);
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
        Log(this.tag, 'Getting undelivered events with timestamp <', beforeTimestamp);

        const scanParams: GenericScan<EventDBItem> = {
            filterString: 'time_stamp < :beforeTimestamp AND (attribute_not_exists(receivedAt) OR receivedAt = :receivedAt OR attribute_type(receivedAt, :receivedAt))',
            attributeValues: {
                ':beforeTimestamp': beforeTimestamp,
                ':receivedAt': 'NULL'
            }
        };

        return await retry(async () => {
            return await this.dynamoDbService.scan(this.tableName, scanParams);
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
