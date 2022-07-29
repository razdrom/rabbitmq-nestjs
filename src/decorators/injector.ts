import { Inject } from "@nestjs/common";
import { defaultProviderToken } from "../rabbitmq.module";

export const InjectRabbitMQ = (token?: string) =>
    Inject(token || defaultProviderToken);