import { readFileSync } from "node:fs";
import path from "node:path";

import rule from "../../src/rules/no-nested-polling";
import { file, runRule } from "../helpers/rule-tester";

/** A small SPARTA project on disk, so the rule can follow calls into other files. */
const PROJECT = path.join(process.cwd(), "test-fixtures/nested-polling");

const onDisk = (relative: string): { code: string; filename: string } => {
	const filename = path.join(PROJECT, relative);

	return { code: readFileSync(filename, "utf8"), filename };
};

/** A project under a `scripts/` folder, with a `package.json` that marks its root. */
const NESTED_PROJECT = path.join(process.cwd(), "test-fixtures/root-detection/scripts/project");

/** A project without a `package.json`, as in a monorepo folder; only `settings.sparta.root` finds its root. */
const OVERRIDE_PROJECT = path.join(process.cwd(), "test-fixtures/root-override/e2e");

const WAITS_IN_POLL = `import { waitForIdle } from "@sparta/support/waits";

await expect(async () => {
	await waitForIdle();
}).toPass();`;

const WAITS_ERROR = {
	messageId: "nestedCall",
	data: { call: "waitForIdle()", outer: "toPass", path: "waitForIdle → poll (sparta/support/waits.ts)" },
};

const MESSAGE_END = "Nested polling multiplies the timeouts; poll once, at the outermost level.";

runRule("no-nested-polling", rule, {
	valid: [
		{
			name: "settings: extra polling methods are only detected when configured",
			code: `await expect(async () => {
	await expect.eventually(() => getStatus());
}).toPass();`,
		},
		{
			name: "without settings.sparta.root, a project without package.json resolves aliases elsewhere",
			code: WAITS_IN_POLL,
			filename: path.join(OVERRIDE_PROJECT, "sparta/ui/shop/asserters/orders-asserter.ts"),
		},
		{
			name: "sequential polls",
			code: `await expect(async () => {
	await page.click("button");
}).toPass();
await expect.poll(() => getStatus()).toBe("done");`,
		},
		{
			name: "polling is allowed in every layer",
			code: `await expect(async () => {
	expect(await client.get()).toBe(1);
}).toPass();`,
			filename: file("sparta/api/orders/services/orders-service.ts"),
		},
		{
			name: "calls to methods that do not poll",
			code: `class OrdersAsserter {
	async check(): Promise<void> {
		await expect(async () => {
			expect(await this.status()).toBe("done");
		}).toPass();
	}

	private async status(): Promise<string> {
		return "done";
	}
}`,
		},
		{
			name: "unresolvable calls are skipped",
			code: `await expect(async () => {
	await dependency.waitUntilDone();
}).toPass();`,
		},
		{
			name: "recursion without polling terminates",
			code: `class Recursive {
	async a(): Promise<void> {
		await this.b();
	}

	async b(): Promise<void> {
		await this.a();
	}

	async run(): Promise<void> {
		await expect(async () => {
			await this.a();
		}).toPass();
	}
}`,
		},
		{
			name: "cross-file: same class name in another folder, external and unresolvable hops",
			...onDisk("sparta/ui/shop/asserters/overview-asserter.ts"),
		},
	],
	invalid: [
		{
			name: "a method only reached through recursion is not remembered as non-polling",
			code: `class Recursive {
	async a(): Promise<void> {
		await this.b();
		await expect.poll(() => 1).toBe(1);
	}

	async b(): Promise<void> {
		await this.a();
	}

	async run(): Promise<void> {
		await expect(async () => {
			await this.a();
		}).toPass();
		await expect(async () => {
			await this.b();
		}).toPass();
	}
}`,
			errors: [
				{
					messageId: "nestedCall",
					data: { call: "this.a()", outer: "toPass", path: "Recursive.a → poll (fixture-project/src/example.ts)" },
				},
				{
					messageId: "nestedCall",
					data: {
						call: "this.b()",
						outer: "toPass",
						path: "Recursive.b → Recursive.a → poll (fixture-project/src/example.ts)",
					},
				},
			],
		},
		{
			name: "toPass inside toPass",
			code: `await expect(async () => {
	await expect(async () => {}).toPass();
}).toPass();`,
			errors: [{ messageId: "nested", data: { inner: "toPass", outer: "toPass" } }],
		},
		{
			name: "poll inside a soft toPass, through .not",
			code: `await expect.soft(async () => {
	await expect.poll(() => 1).not.toBe(2);
}).toPass();`,
			errors: [{ messageId: "nested", data: { inner: "poll", outer: "toPass" } }],
		},
		{
			name: "toPassAndReturn inside a nested arrow in pollAndReturn",
			code: `await expectly
	.pollAndReturn(async () => {
		const run = async () => expectly(() => 1).toPassAndReturn();

		return run();
	})
	.toBe(1);`,
			errors: [{ messageId: "nested", data: { inner: "toPassAndReturn", outer: "pollAndReturn" } }],
		},
		{
			name: "three levels report each pair once",
			code: `await expect(async () => {
	await expect
		.poll(async () => {
			await expect(async () => {}).toPass();

			return 1;
		})
		.toBe(1);
}).toPass();`,
			errors: [
				{ messageId: "nested", data: { inner: "poll", outer: "toPass" } },
				{ messageId: "nested", data: { inner: "toPass", outer: "poll" } },
			],
		},
		{
			name: "same class, through a private method",
			code: `class OrdersAsserter {
	async check(): Promise<void> {
		await expect(async () => {
			await this.load();
		}).toPass();
	}

	private async load(): Promise<void> {
		await this.waitUntilReady();
	}

	private async waitUntilReady(): Promise<void> {
		await expect.poll(() => 1).toBe(1);
	}
}`,
			errors: [
				{
					messageId: "nestedCall",
					data: {
						call: "this.load()",
						outer: "toPass",
						path: "OrdersAsserter.load → OrdersAsserter.waitUntilReady → poll (fixture-project/src/example.ts)",
					},
				},
			],
		},
		{
			name: "local function, called and passed by reference",
			code: `async function waitForIdle(): Promise<void> {
	await expect.poll(() => 1).toBe(1);
}

await expect(async () => {
	await waitForIdle();
}).toPass();

await expect(waitForIdle).toPass();`,
			errors: [
				{
					messageId: "nestedCall",
					data: { call: "waitForIdle()", outer: "toPass", path: "waitForIdle → poll (fixture-project/src/example.ts)" },
				},
				{
					messageId: "nestedCall",
					data: {
						call: "waitForIdle",
						outer: "toPass",
						path: "waitForIdle → poll (fixture-project/src/example.ts)",
					},
				},
			],
		},
		{
			name: "cross-file: fields, chains, locals, inheritance and imported functions",
			...onDisk("sparta/ui/shop/asserters/orders-asserter.ts"),
			errors: [
				{
					messageId: "nestedCall",
					data: {
						call: "this._ordersPage.openOrder()",
						outer: "toPass",
						path: "OrdersPage.openOrder → OrdersPage.findOrder → poll (sparta/ui/shop/pages/orders-page.ts)",
					},
				},
				{
					messageId: "nestedCall",
					data: {
						call: "this._ordersPage.filters.apply()",
						outer: "poll",
						path: "FiltersComponent.apply → toPass (sparta/ui/shop/components/filters-component.ts)",
					},
				},
				{
					messageId: "nestedCall",
					data: {
						call: "card.waitUntilVisible()",
						outer: "toPass",
						path: "CardComponent.waitUntilVisible → poll (sparta/ui/shop/components/card-component.ts)",
					},
				},
				{
					messageId: "nestedCall",
					data: {
						call: "this._cartPage.open()",
						outer: "toPass",
						path: "CartPage.open → SpinnerComponent.waitUntilHidden → toPass (sparta/ui/common/spinner-component.ts)",
					},
				},
				{
					messageId: "nestedCall",
					data: {
						call: "this._cartPage.waitForLoad()",
						outer: "toPass",
						path: "BasePage.waitForLoad → poll (sparta/ui/common/base-page.ts)",
					},
				},
				{
					messageId: "nestedCall",
					data: {
						call: "waitForIdle()",
						outer: "poll",
						path: "waitForIdle → poll (sparta/support/waits.ts)",
					},
				},
			],
		},
		{
			name: "aliases resolve against the nearest package.json, also below a scripts/ folder",
			code: WAITS_IN_POLL,
			filename: path.join(NESTED_PROJECT, "sparta/ui/shop/asserters/orders-asserter.ts"),
			errors: [WAITS_ERROR],
		},
		{
			name: "settings.sparta.root overrides the detected root",
			code: WAITS_IN_POLL,
			filename: path.join(OVERRIDE_PROJECT, "sparta/ui/shop/asserters/orders-asserter.ts"),
			settings: { sparta: { root: OVERRIDE_PROJECT } },
			errors: [WAITS_ERROR],
		},
		{
			name: "settings: an extra polling method inside a standard one",
			code: `await expect(async () => {
	await expect.eventually(() => getStatus());
}).toPass();`,
			settings: { sparta: { pollingMethods: ["eventually"] } },
			errors: [{ messageId: "nested", data: { inner: "eventually", outer: "toPass" } }],
		},
		{
			name: "settings: a standard polling method inside an extra one, in both callback shapes",
			code: `await retry.eventually(async () => {
	await expect(() => check()).toPass();
});
await expect(async () => {
	await expect.poll(() => getStatus()).toBe("done");
}).eventually();`,
			settings: { sparta: { pollingMethods: ["eventually"] } },
			errors: [
				{ messageId: "nested", data: { inner: "toPass", outer: "eventually" } },
				{ messageId: "nested", data: { inner: "poll", outer: "eventually" } },
			],
		},
	],
});

describe("no-nested-polling messages", () => {
	it("explain why nesting is a problem", () => {
		expect(rule.meta?.messages?.nested).toContain(MESSAGE_END);
		expect(rule.meta?.messages?.nestedCall).toContain(MESSAGE_END);
	});
});
