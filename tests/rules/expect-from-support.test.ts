import rule from "../../src/rules/expect-from-support";
import { file, runRule } from "../helpers/rule-tester";

const ASSERTER = file("sparta/api/orders/asserters/orders-asserter.ts");

const CUSTOM = { sparta: { folders: { sparta: "src" }, supportModule: "@app/support" } };

runRule("expect-from-support", rule, {
	valid: [
		{ code: `import { expect } from "@sparta/support";`, filename: ASSERTER },
		{ code: `import { test } from "@playwright/test";`, filename: ASSERTER },
		{
			name: "sparta/support defines the shared expect",
			code: `import { expect } from "@playwright/test";`,
			filename: file("sparta/support/expect.ts"),
		},
		{ code: `import { expect } from "@playwright/test";`, filename: file("tests/orders.spec.ts") },
		{
			name: "settings: the configured support module",
			code: `import { expect } from "@app/support";`,
			filename: file("src/api/orders/asserters/orders-asserter.ts"),
			settings: CUSTOM,
		},
		{
			name: "settings: the support folder inside the configured sparta folder",
			code: `import { expect } from "@playwright/test";`,
			filename: file("src/support/expect.ts"),
			settings: CUSTOM,
		},
	],
	invalid: [
		{
			code: `import { expect } from "@playwright/test";`,
			filename: ASSERTER,
			output: `import { expect } from "@sparta/support";`,
			errors: [{ messageId: "expectFromSupport", data: { source: "@playwright/test", module: "@sparta/support" } }],
		},
		{
			name: "no autofix when other specifiers are imported from the same module",
			code: `import { expect, test } from "@playwright/test";`,
			filename: ASSERTER,
			output: null,
			errors: [{ messageId: "expectFromSupport" }],
		},
		{
			name: "settings: reports and fixes to the configured support module",
			code: `import { expect } from "@sparta/support";`,
			filename: file("src/api/orders/asserters/orders-asserter.ts"),
			settings: CUSTOM,
			output: `import { expect } from "@app/support";`,
			errors: [{ messageId: "expectFromSupport", data: { source: "@sparta/support", module: "@app/support" } }],
		},
	],
});
