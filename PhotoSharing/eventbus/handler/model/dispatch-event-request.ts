import {Topic} from "../../../shared/eventbus/topics/topic";

export interface DispatchEventRequest {
    id: string;
    topic: Topic;
    timestamp: number;
    body: any;
    destinations: string[];
}
