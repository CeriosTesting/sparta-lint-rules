import { expect } from "@sparta/support/expect";

export async function waitForIdle(): Promise<void> {
	await expect.poll(() => globalThis.performance.now()).toBeGreaterThan(0);
}

export function formatId(id: string): string {
	return id.trim();
}
