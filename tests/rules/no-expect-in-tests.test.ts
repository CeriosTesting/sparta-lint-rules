import rule from "../../src/rules/no-expect-in-tests";
import { file, runRule } from "../helpers/rule-tester";

const SPEC = file("tests/orders.spec.ts");

runRule("no-expect-in-tests", rule, {
	valid: [
		{
			name: "settings: extra expect names are only detected when configured",
			code: `verify(value).toBe(1);`,
			filename: SPEC,
		},
		{ code: `import { test } from "@sparta/fixtures/test-fixture";`, filename: SPEC },
		{
			code: `import { expect } from "@sparta/support";
expect(value).toBe(1);`,
			filename: file("sparta/api/orders/asserters/orders-asserter.ts"),
		},
		{ code: `expect(value).toBe(1);`, filename: file("tests/framework/helpers.ts") },
		{
			name: "stepper and asserter methods named expect* are fine",
			code: `await ordersScenario.expectOrderIsPaid(order);
await this.expectly(order);`,
			filename: SPEC,
		},
		{
			name: "names that only start with 'expect' as a word are not an expect",
			code: `const expected = buildOrder();
expectedTotal(order);
expecting(order);`,
			filename: SPEC,
		},
	],
	invalid: [
		{
			code: `import { expect, test } from "@playwright/test";`,
			filename: SPEC,
			errors: [{ messageId: "noExpect" }],
		},
		{
			code: `expect(value).toBe(1);
expect.soft(value).toBe(2);`,
			filename: SPEC,
			errors: [{ messageId: "noExpect" }, { messageId: "noExpect" }],
		},
		{
			name: "expectly and its extensions",
			code: `import { expectly, expectlyLocator } from "@cerios/playwright-expectly";
expectly(value).toBeWithin(1, 2);
expectlyLocator(locator).toHaveCount(1);
await expectly.poll(() => value).toBe(1);`,
			filename: SPEC,
			errors: [
				{ messageId: "noExpect" },
				{ messageId: "noExpect" },
				{ messageId: "noExpect" },
				{ messageId: "noExpect" },
				{ messageId: "noExpect" },
			],
		},
		{
			name: "project-specific extended expects",
			code: `expectApi(response).toHaveStatus(200);
expect_soft(value).toBe(1);
expect.configure({ soft: true }).soft(value).toBe(1);`,
			filename: SPEC,
			errors: [{ messageId: "noExpect" }, { messageId: "noExpect" }, { messageId: "noExpect" }],
		},
		{
			name: "renamed imports",
			code: `import { expect as check } from "@sparta/support";
import { expectly as baseExpect } from "@cerios/playwright-expectly";
check(value).toBe(1);
baseExpect.soft(value).toBe(1);`,
			filename: SPEC,
			errors: [
				{ messageId: "noExpect" },
				{ messageId: "noExpect" },
				{ messageId: "noExpect" },
				{ messageId: "noExpect" },
			],
		},
		{
			name: "settings: extra expect names",
			code: `verify(value).toBe(1);
verify.soft(value).toBe(1);`,
			filename: SPEC,
			settings: { sparta: { expectNames: ["verify"] } },
			errors: [{ messageId: "noExpect" }, { messageId: "noExpect" }],
		},
		{
			name: "settings: tests in the configured tests folder",
			code: `expect(value).toBe(1);`,
			filename: file("specs/orders.spec.ts"),
			settings: { sparta: { folders: { tests: "specs" } } },
			errors: [{ messageId: "noExpect" }],
		},
	],
});
