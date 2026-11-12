import type { Locator } from "@playwright/test";
import { expect } from "@sparta/support/expect";

export class CardComponent {
	constructor(private readonly _root: Locator) {}

	async waitUntilVisible(): Promise<void> {
		await expect.poll(() => this._root.isVisible()).toBe(true);
	}

	async getText(): Promise<string> {
		return this._root.innerText();
	}
}
