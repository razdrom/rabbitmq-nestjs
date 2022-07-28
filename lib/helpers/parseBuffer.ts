export function parseBuffer(content: Buffer) {
	try {
		return JSON.parse(content.toString());
	} catch (error) {
		return null;
	}
}
