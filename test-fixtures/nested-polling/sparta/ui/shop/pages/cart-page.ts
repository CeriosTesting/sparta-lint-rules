import { BasePage as Base } from "@sparta/ui/common/base-page";

export class CartPage extends Base {
	async open(): Promise<void> {
		await this.spinner.waitUntilHidden();
	}

	async total(): Promise<string> {
		return this.page.title();
	}
}
