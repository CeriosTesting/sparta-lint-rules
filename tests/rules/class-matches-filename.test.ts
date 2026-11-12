import rule from "../../src/rules/class-matches-filename";
import { file, runRule } from "../helpers/rule-tester";

const ORDERS_STEPPER = file("sparta/api/orders/steppers/orders-stepper.ts");
const LOGIN_SCREEN = file("sparta/mobile/app/screens/login-screen.ts");

runRule("class-matches-filename", rule, {
	valid: [
		{ code: `export class OrdersStepper {}`, filename: ORDERS_STEPPER },
		{ code: `export default class OrdersStepper {}`, filename: ORDERS_STEPPER },
		{ code: `export class LoginScreen {}`, filename: LOGIN_SCREEN },
		{ code: `export class TestFixture {}`, filename: file("sparta/fixtures/test-fixture.ts") },
		{ code: `export class Anything {}\nclass Other {}`, filename: file("sparta/api/orders/models/order.ts") },
		`export class Anything {}`,
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
			name: "settings: files in a custom layer folder are layer files",
			code: `export class Cart {}`,
			filename: file("sparta/ui/shop/page-objects/cart-page.ts"),
			settings: { sparta: { layers: { "page-objects": "pages" } } },
			errors: [{ messageId: "name", data: { found: "Cart", expected: "CartPage" } }],
		},
	],
});
