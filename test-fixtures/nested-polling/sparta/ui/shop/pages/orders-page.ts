import { PlaywrightTable } from "@cerios/playwright-tables";
import type { Locator, Page } from "@playwright/test";
import { expect } from "@sparta/support/expect";
import { FiltersComponent } from "@sparta/ui/shop/components/filters-component";

export class OrdersPage {
	readonly table = new PlaywrightTable(this._page.locator("table"));

	readonly filters: FiltersComponent;

	constructor(private readonly _page: Page) {
		this.filters = new FiltersComponent(this._page.locator(".filters"));
	}

	async openOrder(id: string): Promise<void> {
		const row = await this.findOrder(id);

		await row.click();
	}

	async getStatus(id: string): Promise<string> {
		return this._page.getByTestId(id).innerText();
	}

	private async findOrder(id: string): Promise<Locator> {
		const row = this._page.getByTestId(id);

		await expect.poll(() => row.count()).toBeGreaterThan(0);

		return row;
	}
}
