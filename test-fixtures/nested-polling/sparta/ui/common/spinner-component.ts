import type { Locator } from "@playwright/test";
import { expect } from "@sparta/support/expect";

export class SpinnerComponent {
	constructor(private readonly _root: Locator) {}

	async waitUntilHidden(): Promise<void> {
		await expect(async () => {
			await expect(this._root).toBeHidden();
		}).toPass();
	}
}
