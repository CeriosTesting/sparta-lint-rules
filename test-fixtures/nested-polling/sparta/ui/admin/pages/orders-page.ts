import type { Page } from "@playwright/test";

export class OrdersPage {
	constructor(private readonly _page: Page) {}

	async openOrder(id: string): Promise<void> {
		await this._page.getByTestId(id).click();
	}
}
