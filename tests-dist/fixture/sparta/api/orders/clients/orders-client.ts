import { expect } from "@sparta/support";

export class OrdersClient {
	async getStatus(id: string): Promise<string> {
		return id;
	}

	async waitUntilReady(id: string): Promise<void> {
		await expect.poll(() => this.getStatus(id)).toBe("ready");
	}
}
