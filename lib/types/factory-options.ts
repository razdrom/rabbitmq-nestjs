import { ClientOptions } from './client-options';
import { ModuleMetadata } from '@nestjs/common';

export interface RabbitMQFactoryOptions {
	name?: string;
	options: ClientOptions;
}

export interface RabbitMQFactoryAsyncOptions
	extends Pick<ModuleMetadata, 'imports'> {
	name?: string;
	useFactory?: (...args: any[]) => Promise<ClientOptions> | ClientOptions;
	inject?: any[];
}
