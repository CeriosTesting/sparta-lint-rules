import rule from "../../src/rules/class-matches-filename";
import { file, runRule } from "../helpers/rule-tester";

const ORDERS_STEPPER = file("sparta/api/orders/steppers/orders-stepper.ts");
const LOGIN_SCREEN = file("sparta/mobile/app/screens/login-screen.ts");

runRule("class-matches-filename", rule, {
	valid: [
		{ code: `export class OrdersStepper {}`, filename: ORDERS_STEPPER },
		{ code: `export default class OrdersStepper {}`, filename: ORDERS_STEPPER },
		{ code: `export class LoginScreen {}`, filename: LOGIN_SCREEN },
		{ code: `export class MainWindow {}`, filename: file("sparta/desktop/app/windows/main-window.ts") },
		{ code: `export class TestFixture {}`, filename: file("sparta/fixtures/test-fixture.ts") },
		{ code: `export class Anything {}\nclass Other {}`, filename: file("sparta/api/orders/models/order.ts") },
		`export class Anything {}`,
		{
			name: "fixtures may contain no class",
			code: `export const test = base.extend({});`,
			filename: file("sparta/fixtures/test-fixture.ts"),
		},
		{
			name: "a barrel contains no class",
			code: `export * from "./orders-stepper";`,
			filename: file("sparta/api/orders/steppers/index.ts"),
		},
		{
			name: "declaration files are not checked",
			code: `export declare const steppers: string[];`,
			filename: file("sparta/api/orders/steppers/orders-stepper.d.ts"),
		},
		{
			name: "other TypeScript extensions",
			code: `export class OrdersStepper {}`,
			filename: file("sparta/api/orders/steppers/orders-stepper.mts"),
		},
	],
	invalid: [
		{
			code: `export class OrderStepper {}`,
			filename: ORDERS_STEPPER,
			errors: [{ messageId: "name", data: { found: "OrderStepper", expected: "OrdersStepper" } }],
		},
		{
			code: `export class LoginPage {}`,
			filename: LOGIN_SCREEN,
			errors: [{ messageId: "name", data: { found: "LoginPage", expected: "LoginScreen" } }],
		},
		{
			code: `export class OrdersStepper {}\nclass Helper {}`,
			filename: ORDERS_STEPPER,
			errors: [{ messageId: "single", data: { found: "Helper" } }],
		},
		{
			name: "a layer file without a class",
			code: `export const open = async () => {};`,
			filename: ORDERS_STEPPER,
			errors: [{ messageId: "missing", data: { expected: "OrdersStepper" } }],
		},
		{
			name: "settings: files in a custom layer folder are layer files",
			code: `export class Cart {}`,
			filename: file("sparta/ui/shop/page-objects/cart-page.ts"),
			settings: { sparta: { layers: { "page-objects": "pages" } } },
			errors: [{ messageId: "name", data: { found: "Cart", expected: "CartPage" } }],
		},
	],
});
