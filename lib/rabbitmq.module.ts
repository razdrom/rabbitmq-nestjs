import { Inject, Module, Provider } from '@nestjs/common';
import { ClientOptions } from './types';
import { RabbitMQClient } from './client';
import { ClientProxyFactory } from '@nestjs/microservices';
import {
	RabbitMQFactoryAsyncOptions,
	RabbitMQFactoryOptions,
} from './types/factory-options';

const defaultProviderToken = 'RABBITMQ_DEFAULT_CLIENT';

export const InjectRabbitmq = (token?: string) =>
	Inject(token || defaultProviderToken);

export class RabbitMQProxyFactory implements ClientProxyFactory {
	public static create(options: ClientOptions) {
		return ClientProxyFactory.create({
			customClass: RabbitMQClient,
			options,
		});
	}
}

@Module({})
export class RabbitMQModule {
	static forRoot({ name, options }: RabbitMQFactoryOptions) {
		const ClientProxyProvider: Provider = {
			provide: name || defaultProviderToken,
			useFactory: () => RabbitMQProxyFactory.create(options),
		};

		return {
			module: RabbitMQModule,
			providers: [ClientProxyProvider],
			exports: [ClientProxyProvider],
		};
	}

	static forRootAsync(options: RabbitMQFactoryAsyncOptions) {
		const ClientProxyProvider: Provider = {
			provide: options.name || defaultProviderToken,
			useFactory: async (...args) => {
				const clientOptions = await options.useFactory(...args);
				return RabbitMQProxyFactory.create(clientOptions);
			},
			inject: options.inject || [],
		};

		return {
			module: RabbitMQModule,
			providers: [ClientProxyProvider],
			exports: [ClientProxyProvider],
		};
	}
}
