import type { Locator } from "@playwright/test";
import { expect } from "@sparta/support/expect";
import { formatId } from "@sparta/support/waits";
import { OrdersPage } from "@sparta/ui/admin/pages/orders-page";
import { CardComponent } from "@sparta/ui/shop/components/card-component";
import { OrdersPage as ShopOrdersPage } from "@sparta/ui/shop/pages/orders-page";

interface Poller {
	waitUntilDone(): Promise<void>;
}

export class OverviewAsserter {
	constructor(
		private readonly _ordersPage: OrdersPage,
		private readonly _shopOrdersPage: ShopOrdersPage
	) {}

	async orderIsShown(id: string): Promise<void> {
		await expect(async () => {
			await this._ordersPage.openOrder(formatId(id));
		}).toPass();
	}

	async tableIsFilled(): Promise<void> {
		await expect(async () => {
			expect(await this._shopOrdersPage.table.getJson()).not.toHaveLength(0);
			expect(await this._shopOrdersPage.getStatus("first")).toBe("shown");
		}).toPass();
	}

	async cardsHaveText(locators: Locator[], poller: Poller): Promise<void> {
		await expect(async () => {
			const cards = locators.map(locator => new CardComponent(locator));

			for (const card of cards) await card.getText();
			await poller.waitUntilDone();
		}).toPass();
	}

	async shopOrderIsOpened(id: string): Promise<void> {
		await this._shopOrdersPage.openOrder(id);
		await expect.poll(() => this._shopOrdersPage.getStatus(id)).toBe("open");
	}
}
