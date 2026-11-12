import type { Page } from "@playwright/test";
import { expect } from "@sparta/support/expect";
import { SpinnerComponent } from "@sparta/ui/common/spinner-component";

export abstract class BasePage {
	constructor(
		protected readonly page: Page,
		protected readonly spinner: SpinnerComponent
	) {}

	async waitForLoad(): Promise<void> {
		await expect.poll(() => this.page.url()).not.toBe("about:blank");
	}
}
