import path from "node:path";

import rule from "../../src/rules/no-direct-construction-in-tests";
import { file, runRule } from "../helpers/rule-tester";

const SPEC = file("tests/orders.spec.ts");

runRule("no-direct-construction-in-tests", rule, {
	valid: [
		{ code: `const date = new Date();`, filename: SPEC },
		{ code: `const stepper = new OrdersStepper(page);`, filename: file("sparta/fixtures/test-fixture.ts") },
		{
			name: "classes from packages are not SPARTA layers",
			code: `import { MongoClient } from "mongodb";
import * as pg from "pg";
const mongo = new MongoClient(url);
const client = new pg.Client();`,
			filename: SPEC,
		},
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
const screen = new LoginScreen(driver);
const window = new MainWindow(app);`,
			filename: SPEC,
			errors: [
				{ messageId: "useFixture", data: { name: "CartPage" } },
				{ messageId: "useFixture", data: { name: "OrderBuilder" } },
				{ messageId: "useFixture", data: { name: "LoginScreen" } },
				{ messageId: "useFixture", data: { name: "MainWindow" } },
			],
		},
		{
			name: "a class imported from a layer folder, whatever its name",
			code: `import { OrdersApi } from "@sparta/api/orders/clients/orders-api";
const api = new OrdersApi();`,
			filename: SPEC,
			errors: [{ messageId: "useFixture", data: { name: "OrdersApi" } }],
		},
		{
			name: "a class constructed through a namespace import",
			code: `import * as steppers from "@sparta/api/orders/steppers";
const stepper = new steppers.OrdersStepper(page);`,
			filename: SPEC,
			errors: [{ messageId: "useFixture", data: { name: "steppers.OrdersStepper" } }],
		},
		{
			name: "database containers and databases",
			code: `const container = new OrdersContainer();
const database = new OrdersDatabase();`,
			filename: SPEC,
			errors: [
				{ messageId: "useFixture", data: { name: "OrdersContainer" } },
				{ messageId: "useFixture", data: { name: "OrdersDatabase" } },
			],
		},
		{
			name: "settings: tests in the configured tests folder",
			code: `const page = new CartPage(page);`,
			filename: file("specs/orders.spec.ts"),
			settings: { sparta: { folders: { tests: "specs" } } },
			errors: [{ messageId: "useFixture", data: { name: "CartPage" } }],
		},
		{
			name: "a class imported from a layer folder through tsconfig paths",
			code: `import { CartHelper } from "@steppers/cart-stepper";
const helper = new CartHelper();`,
			filename: path.join(process.cwd(), "test-fixtures/tsconfig-paths/tests/cart.spec.ts"),
			errors: [{ messageId: "useFixture", data: { name: "CartHelper" } }],
		},
	],
});
