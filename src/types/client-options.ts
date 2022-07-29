import { ConnectionOptions, ExchangeOptions } from '../types';

export interface ClientOptions {
	connection: ConnectionOptions;
	exchange: ExchangeOptions;
	replyQueueName?: string
}
