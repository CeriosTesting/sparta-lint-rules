import type { Locator } from "@playwright/test";
import { expect } from "@sparta/support/expect";
import { waitForIdle } from "@sparta/support/waits";
import { CardComponent } from "@sparta/ui/shop/components/card-component";
import { CartPage } from "@sparta/ui/shop/pages/cart-page";
import { OrdersPage } from "@sparta/ui/shop/pages/orders-page";

export class OrdersAsserter {
	constructor(
		private readonly _ordersPage: OrdersPage,
		private readonly _cartPage: CartPage
	) {}

	async orderIsShown(id: string): Promise<void> {
		await expect(async () => {
			await this._ordersPage.openOrder(id);
		}).toPass();
	}

	async filteredOrdersAreShown(): Promise<void> {
		await expect
			.poll(async () => {
				await this._ordersPage.filters.apply();

				return this._ordersPage.getStatus("first");
			})
			.toBe("shown");
	}

	async cardIsShown(locator: Locator): Promise<void> {
		await expect(async () => {
			const card = new CardComponent(locator);

			await card.waitUntilVisible();
		}).toPass();
	}

	async cartIsLoaded(): Promise<void> {
		await expect(async () => {
			await this._cartPage.open();
			await this._cartPage.waitForLoad();
		}).toPass();
	}

	async pageIsIdle(): Promise<void> {
		await expect
			.poll(async () => {
				await waitForIdle();

				return true;
			})
			.toBe(true);
	}
}
