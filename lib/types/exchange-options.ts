export type ExchangeOptions = {
	name: string;
	type: 'direct' | 'topic' | 'headers' | 'fanout' | 'match' | string;
	options?: {
		durable?: boolean | undefined;
		internal?: boolean | undefined;
		autoDelete?: boolean | undefined;
		alternateExchange?: string | undefined;
		arguments?: any;
	};
};
