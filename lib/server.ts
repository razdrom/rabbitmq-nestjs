import { CustomTransportStrategy, Server } from '@nestjs/microservices';
import {
	AmqpConnectionManager,
	ChannelWrapper,
	connect,
} from 'amqp-connection-manager';
import { Logger } from '@nestjs/common';

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
	constructor(private readonly options: ServerOptions) {
		super();
	}

	public async listen() {
		const { connection, queue } = this.options;

		// Setup connection
		this.connection = connect(connection.url, connection.options);

		this.connection.on(ConnectionManagerEvent.CONNECT, () => {
			Logger.log('RabbitMQ connection established');
		});

		this.connection.on(ConnectionManagerEvent.CONNECT_FAILED, () => {
			Logger.error('RabbitMQ connection failed, trying to reconnect...');
		});

		this.connection.on(ConnectionManagerEvent.DISCONNECT, () => {
			Logger.error('RabbitMQ disconnected, trying to reconnect...');
		});

		// Setup channel
		this.channel = this.connection.createChannel({ json: true });
		await this.channel.addSetup(async (channel) => {
			await channel.assertQueue(queue.name, queue.options);
			for (const routingKey of this.messageHandlers.keys()) {
				await channel.bindQueue(queue.name, queue.exchange, routingKey);
			}
		});

		// Setup consumer
		await this.channel.consume(queue.name, async (message) => {
			const {
				fields: { routingKey },
				properties: { correlationId, replyTo },
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
		});
	}

	public async close() {
		await this.connection.close();
		await this.channel.close();
	}
}
