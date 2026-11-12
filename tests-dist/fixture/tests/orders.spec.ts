import { expect, test } from "@playwright/test";

test("order", async ({ page }) => {
	await page.waitForTimeout(1000);
	expect(page).toBeTruthy();
});
