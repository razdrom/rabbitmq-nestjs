import { MessagePattern } from "@nestjs/microservices";

export const RPC = (queue: string, routingKey: string) => {
    return MessagePattern(routingKey, { queue })
}
