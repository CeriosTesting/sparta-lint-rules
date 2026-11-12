import { OrdersClient } from "@sparta/api/orders/clients/orders-client";
import { expect } from "@sparta/support";

export class OrdersService {
	constructor(private readonly client: OrdersClient) {}

	async waitForOrder(id: string): Promise<void> {
		await expect(async () => {
			await this.client.waitUntilReady(id);
		}).toPass();
	}
}
