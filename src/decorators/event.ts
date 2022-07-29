import { EventPattern } from "@nestjs/microservices";

export const Event = (queue: string, routingKey: string) => {
    return EventPattern(routingKey, { queue })
}