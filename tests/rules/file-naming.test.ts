import rule from "../../src/rules/file-naming";
import { file, runRule } from "../helpers/rule-tester";

const CODE = `export {};`;

runRule("file-naming", rule, {
	valid: [
		{ code: CODE, filename: file("sparta/api/orders/steppers/orders-stepper.ts") },
		{ code: CODE, filename: file("sparta/ui/shop/pages/cart-page.ts") },
		{ code: CODE, filename: file("sparta/mobile/app/screens/login-screen.ts") },
		{ code: CODE, filename: file("sparta/desktop/app/windows/main-window.ts") },
		{ code: CODE, filename: file("sparta/scenarios/checkout-scenario.ts") },
		{ code: CODE, filename: file("sparta/api/orders/models/order.ts") },
		{
			name: "a barrel in a layer folder",
			code: `export * from "./cart-page";`,
			filename: file("sparta/ui/shop/pages/index.ts"),
		},
		{ code: CODE, filename: file("sparta/scenarios/index.ts") },
		{ code: CODE, filename: file("tests/orders.spec.ts") },
		{ code: CODE, filename: file("sparta/api/orders/steppers/orders-stepper.mts") },
		{
			name: "kebab-case with digits",
			code: CODE,
			filename: file("sparta/api/orders/clients/orders-v2-base-client.ts"),
		},
		{
			name: "files outside layer folders are not checked for kebab-case",
			code: CODE,
			filename: file("sparta/api/orders/models/OrderModel.ts"),
		},
		{
			name: "declaration files are not checked",
			code: CODE,
			filename: file("sparta/api/orders/steppers/orders.d.ts"),
		},
	],
	invalid: [
		{
			name: "other TypeScript extensions need the suffix too",
			code: CODE,
			filename: file("sparta/api/orders/steppers/orders.mts"),
			errors: [{ messageId: "suffix", data: { folder: "steppers", suffix: "stepper", name: "orders.mts" } }],
		},
		{
			code: CODE,
			filename: file("sparta/api/orders/steppers/orders.ts"),
			errors: [{ messageId: "suffix", data: { folder: "steppers", suffix: "stepper", name: "orders.ts" } }],
		},
		{
			code: CODE,
			filename: file("sparta/mobile/app/screens/login.ts"),
			errors: [{ messageId: "suffix", data: { folder: "screens", suffix: "screen", name: "login.ts" } }],
		},
		{
			code: CODE,
			filename: file("sparta/desktop/app/windows/main.ts"),
			errors: [{ messageId: "suffix", data: { folder: "windows", suffix: "window", name: "main.ts" } }],
		},
		{
			name: "the builders folder of an area",
			code: CODE,
			filename: file("sparta/api/builders/order.ts"),
			errors: [{ messageId: "suffix", data: { folder: "builders", suffix: "builder", name: "order.ts" } }],
		},
		{
			code: CODE,
			filename: file("sparta/ui/directors/cartDirector.ts"),
			errors: [
				{ messageId: "suffix", data: { folder: "directors", suffix: "director", name: "cartDirector.ts" } },
				{ messageId: "kebabCase", data: { name: "cartDirector.ts", expected: "cart-director.ts" } },
			],
		},
		{
			code: CODE,
			filename: file("sparta/scenarios/checkout.ts"),
			errors: [{ messageId: "suffix", data: { folder: "scenarios", suffix: "scenario", name: "checkout.ts" } }],
		},
		{
			name: "settings: a custom layer folder uses its standard folder's suffix",
			code: CODE,
			filename: file("sparta/web/shop/page-objects/cart.ts"),
			settings: { sparta: { areas: { web: "ui" }, layers: { "page-objects": "pages" } } },
			errors: [{ messageId: "suffix", data: { folder: "page-objects", suffix: "page", name: "cart.ts" } }],
		},
		{
			name: "camelCase before the suffix",
			code: CODE,
			filename: file("sparta/api/orders/steppers/myOrders-stepper.ts"),
			errors: [{ messageId: "kebabCase", data: { name: "myOrders-stepper.ts", expected: "my-orders-stepper.ts" } }],
		},
		{
			name: "PascalCase, underscores and acronyms",
			code: CODE,
			filename: file("sparta/api/orders/clients/My_APIOrders-client.mts"),
			errors: [
				{ messageId: "kebabCase", data: { name: "My_APIOrders-client.mts", expected: "my-api-orders-client.mts" } },
			],
		},
		{
			name: "a name that breaks both conventions gets both reports",
			code: CODE,
			filename: file("sparta/ui/shop/pages/CartPage.ts"),
			errors: [
				{ messageId: "suffix", data: { folder: "pages", suffix: "page", name: "CartPage.ts" } },
				{ messageId: "kebabCase", data: { name: "CartPage.ts", expected: "cart-page.ts" } },
			],
		},
		{
			name: "files in sparta/scenarios are kebab-case too",
			code: CODE,
			filename: file("sparta/scenarios/checkout--flow-scenario.ts"),
			errors: [
				{ messageId: "kebabCase", data: { name: "checkout--flow-scenario.ts", expected: "checkout-flow-scenario.ts" } },
			],
		},
	],
});
