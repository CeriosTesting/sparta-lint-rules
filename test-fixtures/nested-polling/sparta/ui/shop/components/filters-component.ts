import type { Locator } from "@playwright/test";
import { expect } from "@sparta/support/expect";

export class FiltersComponent {
	constructor(private readonly _root: Locator) {}

	async apply(): Promise<void> {
		await expect(async () => {
			await this._root.click();
		}).toPass();
	}
}
