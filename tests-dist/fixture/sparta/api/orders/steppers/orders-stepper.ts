import { OrdersClient } from "../clients/orders-client";

export class OrdersStepper {
	constructor(private readonly client: OrdersClient) {}

	async open(id: string): Promise<string> {
		return this.client.getStatus(id);
	}
}
