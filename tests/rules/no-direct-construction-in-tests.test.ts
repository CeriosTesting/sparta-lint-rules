import rule from "../../src/rules/no-direct-construction-in-tests";
import { file, runRule } from "../helpers/rule-tester";

const SPEC = file("tests/orders.spec.ts");

runRule("no-direct-construction-in-tests", rule, {
	valid: [
		{ code: `const date = new Date();`, filename: SPEC },
		{ code: `const stepper = new OrdersStepper(page);`, filename: file("sparta/fixtures/test-fixture.ts") },
	],
	invalid: [
		{
			code: `const stepper = new OrdersStepper(page);`,
			filename: SPEC,
			errors: [{ messageId: "useFixture", data: { name: "OrdersStepper" } }],
		},
		{
			code: `const page = new CartPage(page);
const builder = new OrderBuilder();
const screen = new LoginScreen(driver);`,
			filename: SPEC,
			errors: [
				{ messageId: "useFixture", data: { name: "CartPage" } },
				{ messageId: "useFixture", data: { name: "OrderBuilder" } },
				{ messageId: "useFixture", data: { name: "LoginScreen" } },
			],
		},
		{
			name: "settings: tests in the configured tests folder",
			code: `const page = new CartPage(page);`,
			filename: file("specs/orders.spec.ts"),
			settings: { sparta: { folders: { tests: "specs" } } },
			errors: [{ messageId: "useFixture", data: { name: "CartPage" } }],
		},
	],
});
