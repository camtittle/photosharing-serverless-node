import {Topic} from "../topics/topic";

export interface PublishEventRequest {
    id: string;
    topic: Topic;
    timestamp: number;
    body: any;
}
