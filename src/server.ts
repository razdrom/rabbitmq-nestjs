import { CustomTransportStrategy, Server } from '@nestjs/microservices';
import {
	AmqpConnectionManager,
	ChannelWrapper,
	connect,
} from 'amqp-connection-manager';
import {Logger, LoggerService} from '@nestjs/common';

import { ServerOptions } from './types';
import { parseBuffer } from './helpers/parseBuffer';

export enum ConnectionManagerEvent {
	CONNECT = 'connect',
	CONNECT_FAILED = 'connectFailed',
	DISCONNECT = 'disconnect',
}

export class RabbitMQServer extends Server implements CustomTransportStrategy {
	private channel: ChannelWrapper;
	private connection: AmqpConnectionManager;
	protected logger: LoggerService
	constructor(private readonly options: ServerOptions) {
		super();
		this.logger = options.logger || Logger
	}

	public async listen(cb) {
		const {connection, queue} = this.options;

		// Setup connection
		this.connection = connect(connection.url, connection.options);

		this.connection.on(ConnectionManagerEvent.CONNECT, () => {
			this.logger.log('RabbitMQ connection established');
		});

		this.connection.on(ConnectionManagerEvent.CONNECT_FAILED, () => {
			this.logger.error('RabbitMQ connection failed, trying to reconnect...');
		});

		this.connection.on(ConnectionManagerEvent.DISCONNECT, () => {
			this.logger.error('RabbitMQ disconnected, trying to reconnect...');
		});

		// Setup channel
		this.channel = this.connection.createChannel({json: true});
		await this.channel.addSetup(async (channel) => {
			let queues = Array.isArray(queue) ? queue : [queue]

			for (const queue of queues) {
				await channel.assertQueue(queue.name, queue.options);

				// Bind queue routing keys
				try {
					for (const [routingKey, {extras}] of this.messageHandlers) {
						if (queue.name === extras.queue) {
							await channel.bindQueue(queue.name, queue.exchange, routingKey)
						}
					}
				} catch (error) {
					this.logger.error(error)
				}

				// Setup consumer
				await channel.consume(queue.name, async (message) => {
					if (message) {
						const {
							fields: {routingKey},
							properties: {correlationId, replyTo},
							content,
						} = message;

						const handler = this.messageHandlers.get(routingKey);
						if (handler) {
							const payload = parseBuffer(content);
							const reply = await handler(payload).catch();
							if (!handler.isEventHandler) {
								await this.channel.sendToQueue(replyTo, reply, {
									correlationId,
								});
							}
						}
						this.channel.ack(message);
					}
				});
			}
		})
	}

	public async close() {
		await this.connection.close();
		await this.channel.close();
	}
}
