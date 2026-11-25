import rule from "../../src/rules/class-matches-filename";
import { file, runRule } from "../helpers/rule-tester";

const ORDERS_STEPPER = file("sparta/api/orders/steppers/orders-stepper.ts");
const LOGIN_SCREEN = file("sparta/mobile/app/screens/login-screen.ts");
const ORDERS_API_CLIENT = file("sparta/api/orders/clients/orders-api-client.ts");

/** The type-only client from the bug report: a typed alias of an SDK client, with no runtime code. */
const TYPED_CLIENT = `import type { OrderEndpoints } from "@sparta/api/orders/models/order-endpoints";
import type { HttpClient } from "some-http-sdk";

export type OrdersApiClient = HttpClient<OrderEndpoints>;`;

const CLIENT_FILE = { file: "orders-api-client.ts", folder: "clients", expected: "OrdersApiClient" };
const STEPPER_FILE = { file: "orders-stepper.ts", folder: "steppers", expected: "OrdersStepper" };

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
			name: "a type-only file in models/ is not a layer file, whatever its name",
			code: TYPED_CLIENT,
			filename: file("sparta/api/orders/models/orders-api-client.ts"),
		},
		{
			name: "a type-only file in enums/ is not a layer file, whatever its name",
			code: TYPED_CLIENT,
			filename: file("sparta/api/orders/enums/orders-api-client.ts"),
		},
		{
			name: "functions outside the layer folders are not checked",
			code: `export function total(): number { return 0; }`,
			filename: file("sparta/api/orders/models/orders-api-client.ts"),
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
			name: "a layer file with only an enum and a constant",
			code: `export enum Status { Open }\nexport const DEFAULT = Status.Open;`,
			filename: ORDERS_STEPPER,
			errors: [{ messageId: "missing", data: { expected: "OrdersStepper" } }],
		},
		{
			name: "a layer file with only imports",
			code: `import { OrdersService } from "../services/orders-service";`,
			filename: ORDERS_STEPPER,
			errors: [{ messageId: "missing", data: { expected: "OrdersStepper" } }],
		},
		{
			name: "a layer file with types and a constant",
			code: `export type Id = string;\nexport const ID: Id = "1";`,
			filename: ORDERS_STEPPER,
			errors: [{ messageId: "missing", data: { expected: "OrdersStepper" } }],
		},
		{
			name: "a client that only declares types",
			code: TYPED_CLIENT,
			filename: ORDERS_API_CLIENT,
			errors: [{ messageId: "typesOnly", data: CLIENT_FILE }],
		},
		{
			name: "interfaces, declarations and type re-exports are types",
			code: `import type { Order } from "@sparta/api/orders/models/order";
interface Options { retries: number }
export interface OrdersApi { get(options: Options): Order }
declare const sdk: OrdersApi;
declare function create(): OrdersApi;
declare namespace Sdk { const version: string }
export type { Order };
export type * from "@sparta/api/orders/models/order-endpoints";
export default interface Fallback {}`,
			filename: ORDERS_API_CLIENT,
			errors: [{ messageId: "typesOnly", data: CLIENT_FILE }],
		},
		{
			name: "a client that only declares functions",
			code: `import type { Order } from "@sparta/api/orders/models/order";
export function getOrder(id: string): Order { return { id } as Order; }
export const deleteOrder = async (id: string): Promise<void> => {};
const request = function (): void {};
export { request };`,
			filename: ORDERS_API_CLIENT,
			errors: [{ messageId: "functionsOnly", data: CLIENT_FILE }],
		},
		{
			name: "functions with overloads, types and a default export",
			code: `export type Id = string;
export function open(id: Id): void;
export function open(id: number): void;
export function open(id: Id | number): void {}
export default () => {};`,
			filename: ORDERS_STEPPER,
			errors: [{ messageId: "functionsOnly", data: STEPPER_FILE }],
		},
		{
			name: "a layer file with only an arrow function",
			code: `export const open = async () => {};`,
			filename: ORDERS_STEPPER,
			errors: [{ messageId: "functionsOnly", data: STEPPER_FILE }],
		},
		{
			name: "settings: a custom layer folder is named in the message",
			code: `export type CartPage = { url: string };`,
			filename: file("sparta/ui/shop/page-objects/cart-page.ts"),
			settings: { sparta: { layers: { "page-objects": "pages" } } },
			errors: [
				{ messageId: "typesOnly", data: { file: "cart-page.ts", folder: "page-objects", expected: "CartPage" } },
			],
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
