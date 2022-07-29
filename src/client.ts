import { ClientOptions } from './types';
import {
	AmqpConnectionManager,
	ChannelWrapper,
	connect,
} from 'amqp-connection-manager';
import EventEmitter from 'events';
import { randomUUID } from 'crypto';
import { parseBuffer } from './helpers/parseBuffer';
import { ClientProxy, ReadPacket, WritePacket } from '@nestjs/microservices';

export class RabbitMQClient extends ClientProxy {
	private channel: ChannelWrapper;
	private connection: AmqpConnectionManager;
	private exchangeName = null;
	private replyQueue = {
		name: `reply_queue:${randomUUID()}`,
		listener: new EventEmitter(),
		timeout: 10 * 1000,
	};

	constructor(private readonly options: ClientOptions) {
		super();
		this.exchangeName = options.exchange.name;
	}

	public async connect(): Promise<AmqpConnectionManager> {
		if (!this.connection || !this.channel) {
			const { connection, exchange } = this.options;

			// Setup connection
			this.connection = connect(connection.url, connection.options);

			// Setup channel
			this.channel = this.connection.createChannel({ json: true });
			await this.channel.addSetup(async (channel) => {
				await channel.assertExchange(
					exchange.name,
					exchange.type,
					exchange.options,
				);
				await channel.assertQueue(this.replyQueue.name, {
					exclusive: true,
				});
			});

			// Setup consumer
			await this.channel.consume(this.replyQueue.name, (message) => {
				const content = parseBuffer(message.content);
				this.replyQueue.listener.emit(
					message.properties.correlationId,
					content,
				);
				this.channel.ack(message);
			});
		}
		return this.connection;
	}

	public async close() {
		await this.connection.close();
		await this.channel.close();
	}

	protected async dispatchEvent<T>({
		pattern,
		data,
	}: ReadPacket): Promise<T> {
		await this.channel.publish(this.options.exchange.name, pattern, data);
		return data;
	}

	protected publish(
		{ pattern, data }: ReadPacket,
		callback: (packet: WritePacket) => void,
	): () => void {
		const correlationId = randomUUID();
		const listener = (response) => {
			callback({ response, isDisposed: true });
		};
		this.replyQueue.listener.once(correlationId, listener);

		setTimeout(() => {
			this.replyQueue.listener.removeListener(correlationId, listener);
			callback({ err: new Error('REPLY_TIMEOUT') });
		}, this.replyQueue.timeout);

		this.channel
			.publish(this.options.exchange.name, pattern, data, {
				replyTo: this.replyQueue.name,
				correlationId,
			})
			.catch((err) => {
				callback({ err });
			});

		return () => null;
	}
}
