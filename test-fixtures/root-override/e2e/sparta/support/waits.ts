export async function waitForIdle(): Promise<void> {
	await expect.poll(() => globalThis.performance.now()).toBeGreaterThan(0);
}
