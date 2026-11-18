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
		{
			name: "other members of timers/promises are not sleeps",
			code: `import timers from "node:timers/promises";
for await (const tick of timers.setInterval(10)) break;`,
			filename: STEPPER,
		},
		{
			name: "a wait() on something else is not a sleep",
			code: `import { scheduler } from "node:timers/promises";
await queue.wait();
await scheduler.yield();`,
			filename: STEPPER,
		},
		{
			name: "setTimeout on an object that is not the timers module",
			code: `test.setTimeout(60_000);`,
			filename: SPEC,
		},
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
			name: "default import of timers/promises",
			code: `import timers from "timers/promises";
await timers.setTimeout(100);`,
			filename: STEPPER,
			errors: [{ messageId: "hardWait" }],
		},
		{
			name: "namespace import of timers/promises",
			code: `import * as timers from "node:timers/promises";
await timers.setTimeout(100);
await timers.scheduler.wait(100);`,
			filename: STEPPER,
			errors: [{ messageId: "hardWait" }, { messageId: "hardWait" }],
		},
		{
			name: "scheduler.wait from timers/promises",
			code: `import { scheduler as s } from "node:timers/promises";
await s.wait(100);`,
			filename: STEPPER,
			errors: [{ messageId: "hardWait" }],
		},
		{
			name: "require of timers/promises",
			code: `const timers = require("node:timers/promises");
const { setTimeout: sleep, scheduler } = require("timers/promises");
await timers.setTimeout(100);
await scheduler.wait(100);`,
			filename: STEPPER,
			errors: [{ messageId: "hardWait" }, { messageId: "hardWait" }, { messageId: "hardWait" }],
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
