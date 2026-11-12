import rule from "../../src/rules/architecture-boundaries";
import { file, runRule } from "../helpers/rule-tester";

const ORDERS_STEPPER = file("sparta/api/orders/steppers/orders-stepper.ts");
const ORDERS_SERVICE = file("sparta/api/orders/services/orders-service.ts");
const ORDERS_SCENARIO = file("sparta/api/orders/scenarios/orders-scenario.ts");
const SPEC = file("tests/orders.spec.ts");
const LOGIN_STEPPER = file("sparta/mobile/app/steppers/login-stepper.ts");
const LOGIN_SCREEN = file("sparta/mobile/app/screens/login-screen.ts");

const CUSTOM = {
	sparta: { areas: { web: "ui" }, layers: { "page-objects": "pages" }, aliases: { "@app/*": "sparta" } },
} as const;

runRule("architecture-boundaries", rule, {
	valid: [
		{ code: `import { OrdersService } from "../services/orders-service";`, filename: ORDERS_STEPPER },
		{ code: `import { http } from "@sparta/api/common/http";`, filename: ORDERS_SERVICE },
		{ code: `import { test } from "@playwright/test";`, filename: ORDERS_STEPPER },
		{ code: `import { test } from "@sparta/fixtures/test-fixture";`, filename: SPEC },
		{ code: `import { OrdersScenario } from "@sparta/api/orders/scenarios/orders-scenario";`, filename: SPEC },
		{ code: `export { OrdersStepper } from "../steppers/orders-stepper";`, filename: file("sparta/fixtures/index.ts") },
		{
			name: "a barrel re-exports its own layer",
			code: `export * from "./orders-stepper";`,
			filename: file("sparta/api/orders/steppers/index.ts"),
		},
		{ code: `import { LoginScreen } from "../screens/login-screen";`, filename: LOGIN_STEPPER },
		{ code: `import { HeaderComponent } from "../components/header-component";`, filename: LOGIN_SCREEN },
		{ code: `import { gestures } from "@sparta/mobile/common/gestures";`, filename: LOGIN_SCREEN },
		{ code: `import { LoginScenario } from "@sparta/mobile/app/scenarios/login-scenario";`, filename: SPEC },
		{
			name: "files in tests/framework are not checked",
			code: `import { OrdersClient } from "@sparta/api/orders/clients/orders-client";`,
			filename: file("tests/framework/setup.ts"),
		},
		{
			name: "files outside the SPARTA folders are not checked",
			code: `import { OrdersClient } from "../sparta/api/orders/clients/orders-client";`,
		},
		{
			name: "settings: a custom layer folder follows its standard layer",
			code: `import { HeaderComponent } from "../components/header-component";`,
			filename: file("sparta/web/shop/page-objects/cart-page.ts"),
			settings: CUSTOM,
		},
		{
			name: "settings: the standard names keep working",
			code: `import { OrdersService } from "../services/orders-service";`,
			filename: ORDERS_STEPPER,
			settings: CUSTOM,
		},
		{
			name: "settings: the default sparta folder is not checked once it is renamed",
			code: `import { OrdersClient } from "../clients/orders-client";`,
			filename: ORDERS_STEPPER,
			settings: { sparta: { folders: { sparta: "src" } } },
		},
	],
	invalid: [
		{
			name: "group depends on another group in the same area",
			code: `import { CustomersService } from "@sparta/api/customers/services/customers-service";`,
			filename: ORDERS_STEPPER,
			errors: [
				{
					messageId: "isolation",
					data: {
						source: "api/orders stepper",
						target: "api/customers service",
						request: "@sparta/api/customers/services/customers-service",
					},
				},
			],
		},
		{
			name: "group depends on another area",
			code: `import { CartPage } from "@sparta/ui/shop/pages/cart-page";`,
			filename: ORDERS_STEPPER,
			errors: [{ messageId: "isolation" }],
		},
		{
			name: "shared code depends on a group",
			code: `import { OrdersStepper } from "@sparta/api/orders/steppers/orders-stepper";`,
			filename: file("sparta/common/helpers.ts"),
			errors: [{ messageId: "isolation" }],
		},
		{
			name: "sparta code depends on tests",
			code: `import { data } from "@tests/data/orders";`,
			filename: ORDERS_STEPPER,
			errors: [{ messageId: "isolation" }],
		},
		{
			name: "stepper depends on a client",
			code: `import { OrdersClient } from "../clients/orders-client";`,
			filename: ORDERS_STEPPER,
			errors: [
				{
					messageId: "layer",
					data: { source: "api/orders stepper", target: "api/orders client", request: "../clients/orders-client" },
				},
			],
		},
		{
			name: "test depends on a stepper",
			code: `import { OrdersStepper } from "@sparta/api/orders/steppers/orders-stepper";`,
			filename: SPEC,
			errors: [{ messageId: "layer" }],
		},
		{
			name: "top-level scenario depends on a UI page",
			code: `import { CartPage } from "@sparta/ui/shop/pages/cart-page";`,
			filename: file("sparta/scenarios/checkout-scenario.ts"),
			errors: [{ messageId: "layer" }],
		},
		{
			name: "require and dynamic import are checked",
			code: `const client = require("../clients/orders-client");
const lazy = import("../clients/orders-client");`,
			filename: ORDERS_STEPPER,
			errors: [{ messageId: "layer" }, { messageId: "layer" }],
		},
		{
			name: "scenario re-exports a stepper",
			code: `export { OrdersStepper } from "../steppers/orders-stepper";`,
			filename: ORDERS_SCENARIO,
			errors: [{ messageId: "reexport" }],
		},
		{
			name: "a barrel re-exports another layer",
			code: `export * from "../services/orders-service";`,
			filename: file("sparta/api/orders/steppers/index.ts"),
			errors: [{ messageId: "reexport" }],
		},
		{
			name: "an import through a barrel is checked against the barrel's layer",
			code: `import { OrdersStepper } from "../steppers";`,
			filename: ORDERS_SERVICE,
			errors: [{ messageId: "layer" }],
		},
		{
			name: "scenario re-exports everything from a stepper",
			code: `export * from "../steppers/orders-stepper";`,
			filename: ORDERS_SCENARIO,
			errors: [{ messageId: "reexport" }],
		},
		{
			name: "mobile screen depends on a stepper",
			code: `import { LoginStepper } from "../steppers/login-stepper";`,
			filename: LOGIN_SCREEN,
			errors: [
				{
					messageId: "layer",
					data: { source: "mobile/app screen", target: "mobile/app stepper", request: "../steppers/login-stepper" },
				},
			],
		},
		{
			name: "mobile component depends on a screen",
			code: `import { LoginScreen } from "../screens/login-screen";`,
			filename: file("sparta/mobile/app/components/header-component.ts"),
			errors: [{ messageId: "layer" }],
		},
		{
			name: "mobile scenario depends on a screen",
			code: `import { LoginScreen } from "../screens/login-screen";`,
			filename: file("sparta/mobile/app/scenarios/login-scenario.ts"),
			errors: [{ messageId: "layer" }],
		},
		{
			name: "mobile group depends on the ui area",
			code: `import { CartPage } from "@sparta/ui/shop/pages/cart-page";`,
			filename: LOGIN_SCREEN,
			errors: [{ messageId: "isolation" }],
		},
		{
			name: "mobile common depends on ui common",
			code: `import { base } from "@sparta/ui/common/base-page";`,
			filename: file("sparta/mobile/common/base-screen.ts"),
			errors: [{ messageId: "isolation" }],
		},
		{
			name: "top-level scenario depends on a mobile screen",
			code: `import { LoginScreen } from "@sparta/mobile/app/screens/login-screen";`,
			filename: file("sparta/scenarios/checkout-scenario.ts"),
			errors: [{ messageId: "layer" }],
		},
		{
			name: "test depends on a mobile stepper",
			code: `import { LoginStepper } from "@sparta/mobile/app/steppers/login-stepper";`,
			filename: SPEC,
			errors: [{ messageId: "layer" }],
		},
		{
			name: "mobile stepper re-exports a screen",
			code: `export { LoginScreen } from "../screens/login-screen";`,
			filename: LOGIN_STEPPER,
			errors: [{ messageId: "reexport" }],
		},
		{
			name: "settings: a custom area follows its standard area's layer rules",
			code: `import { CartStepper } from "../steppers/cart-stepper";`,
			filename: file("sparta/web/shop/page-objects/cart-page.ts"),
			settings: CUSTOM,
			errors: [
				{
					messageId: "layer",
					data: { source: "web/shop page", target: "web/shop stepper", request: "../steppers/cart-stepper" },
				},
			],
		},
		{
			name: "settings: a custom area is isolated from the standard area it follows",
			code: `import { CartPage } from "@sparta/ui/shop/pages/cart-page";`,
			filename: file("sparta/web/shop/steppers/cart-stepper.ts"),
			settings: CUSTOM,
			errors: [
				{
					messageId: "isolation",
					data: { source: "web/shop stepper", target: "ui/shop page", request: "@sparta/ui/shop/pages/cart-page" },
				},
			],
		},
		{
			name: "settings: custom aliases are resolved",
			code: `import { CustomersService } from "@app/api/customers/services/customers-service";`,
			filename: ORDERS_STEPPER,
			settings: CUSTOM,
			errors: [{ messageId: "isolation" }],
		},
		{
			name: "settings: renamed top-level folders",
			code: `import { OrdersStepper } from "@sparta/api/orders/steppers/orders-stepper";`,
			filename: file("specs/orders.spec.ts"),
			settings: { sparta: { folders: { sparta: "src", tests: "specs" } } },
			errors: [
				{
					messageId: "layer",
					data: {
						source: "specs",
						target: "api/orders stepper",
						request: "@sparta/api/orders/steppers/orders-stepper",
					},
				},
			],
		},
	],
});
