export interface PartitionKeyQuery {
    partitionKeyName: string;
    partitionKeyValue: string;
}

interface SortKeyQuery extends PartitionKeyQuery {
    sortKeyName: string;
}

export interface LessThanQuery extends SortKeyQuery {
    sortKeyValue: string;
}

export interface BetweenQuery extends SortKeyQuery {
    sortKeyValueStart: string;
    sortKeyValueEnd: string;
}
