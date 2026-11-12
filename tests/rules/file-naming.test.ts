import rule from "../../src/rules/file-naming";
import { file, runRule } from "../helpers/rule-tester";

const CODE = `export {};`;

runRule("file-naming", rule, {
	valid: [
		{ code: CODE, filename: file("sparta/api/orders/steppers/orders-stepper.ts") },
		{ code: CODE, filename: file("sparta/ui/shop/pages/cart-page.ts") },
		{ code: CODE, filename: file("sparta/mobile/app/screens/login-screen.ts") },
		{ code: CODE, filename: file("sparta/scenarios/checkout-scenario.ts") },
		{ code: CODE, filename: file("sparta/api/orders/models/order.ts") },
		{
			name: "a barrel in a layer folder",
			code: `export * from "./cart-page";`,
			filename: file("sparta/ui/shop/pages/index.ts"),
		},
		{ code: CODE, filename: file("sparta/scenarios/index.ts") },
		{ code: CODE, filename: file("tests/orders.spec.ts") },
	],
	invalid: [
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
	],
});
