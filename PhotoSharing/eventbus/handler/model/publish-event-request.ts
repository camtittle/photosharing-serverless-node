import {Topic} from "../../../shared/eventbus/topics/topic";

export interface PublishEventRequest {
    id: string;
    topic: Topic;
    timestamp: number;
    body: any;
}
