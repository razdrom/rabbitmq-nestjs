export type ConnectionOptions = {
	url: string | string[];
	options?: {
		heartbeatIntervalInSeconds?: number;
		reconnectTimeInSeconds?: number;
	};
};
