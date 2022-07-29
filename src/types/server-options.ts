import { ConnectionOptions, QueueOptions } from '../types';
import {LoggerService} from "@nestjs/common";

export type ServerOptions = {
	connection: ConnectionOptions;
	queue: QueueOptions | QueueOptions[];
	logger?: LoggerService
};
