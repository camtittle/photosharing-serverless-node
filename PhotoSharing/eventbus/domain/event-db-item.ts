export interface EventDBItem {
    time_stamp: number;
    id: string;
    topic: string;
    body: any;
    destination: string;
    retryCount: number;
    receivedAt: null | number;
}

