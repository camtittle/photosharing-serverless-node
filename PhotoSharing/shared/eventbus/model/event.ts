import {Topic} from "../topics/topic";

export interface Event {
    id: string;
    topic: Topic;
    timestamp: number;
    body: any;
    destination: string;
    retryCount: number;
}
