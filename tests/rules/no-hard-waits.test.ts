import rule from "../../src/rules/no-hard-waits";
import { file, runRule } from "../helpers/rule-tester";

const SPEC = file("tests/orders.spec.ts");
const STEPPER = file("sparta/api/orders/steppers/orders-stepper.ts");

runRule("no-hard-waits", rule, {
	valid: [
		{
			name: "settings: the framework folder inside the configured tests folder is not checked",
			code: `await page.waitForTimeout(100);`,
			filename: file("specs/framework/setup.ts"),
			settings: { sparta: { folders: { tests: "specs" } } },
		},
		{ code: `setTimeout(() => doWork(), 10);`, filename: STEPPER },
		{
			name: "a timer that does more than resolving is not a sleep",
			code: `await new Promise(resolve => setTimeout(() => { doWork(); resolve(); }, 10));`,
			filename: STEPPER,
		},
		{ code: `import { setInterval } from "node:timers/promises";`, filename: STEPPER },
		{ code: `await page.waitForTimeout(1000);`, filename: file("tests/framework/helpers.ts") },
		`await page.waitForTimeout(1000);`,
	],
	invalid: [
		{ code: `await page.waitForTimeout(1000);`, filename: SPEC, errors: [{ messageId: "hardWait" }] },
		{
			code: `await new Promise(resolve => setTimeout(resolve, 1000));`,
			filename: STEPPER,
			errors: [{ messageId: "hardWait" }],
		},
		{
			code: `await new Promise(function (done) { globalThis.setTimeout(() => { done(); }, 500); });`,
			filename: STEPPER,
			errors: [{ messageId: "hardWait" }],
		},
		{
			code: `import { setTimeout } from "node:timers/promises";`,
			filename: STEPPER,
			errors: [{ messageId: "hardWait" }],
		},
		{
			name: "settings: files in the configured folders",
			code: `await page.waitForTimeout(100);`,
			filename: file("src/api/orders/steppers/orders-stepper.ts"),
			settings: { sparta: { folders: { sparta: "src" } } },
			errors: [{ messageId: "hardWait" }],
		},
	],
});
