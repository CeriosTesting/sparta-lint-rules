import path from "node:path";

import rule from "../../src/rules/architecture-boundaries";
import { file, runRule } from "../helpers/rule-tester";

const ORDERS_STEPPER = file("sparta/api/orders/steppers/orders-stepper.ts");
const ORDERS_SERVICE = file("sparta/api/orders/services/orders-service.ts");
const ORDERS_SCENARIO = file("sparta/api/orders/scenarios/orders-scenario.ts");
const SPEC = file("tests/orders.spec.ts");
const LOGIN_STEPPER = file("sparta/mobile/app/steppers/login-stepper.ts");
const LOGIN_SCREEN = file("sparta/mobile/app/screens/login-screen.ts");
const MAIN_STEPPER = file("sparta/desktop/app/steppers/main-stepper.ts");
const MAIN_WINDOW = file("sparta/desktop/app/windows/main-window.ts");

/** Files in a fixture project whose tsconfig.json maps `@pages/*`, `@steppers/*` and `@support`, with `baseUrl: "."`. */
const tsFixture = (relative: string): string => path.join(process.cwd(), "test-fixtures/tsconfig-paths", relative);
const TS_CART_PAGE = tsFixture("sparta/ui/shop/pages/cart-page.ts");
const TS_CART_STEPPER = tsFixture("sparta/ui/shop/steppers/cart-stepper.ts");
const TS_USERS_PAGE = tsFixture("sparta/ui/admin/pages/users-page.ts");

const ORDER_BUILDER = file("sparta/api/builders/order-builder.ts");
const ORDER_DIRECTOR = file("sparta/api/directors/order-director.ts");
const API_BUILDER = `import { OrderBuilder } from "@sparta/api/builders/order-builder";`;
const ORDERS_SERVICE_IMPORT = `import { OrdersService } from "@sparta/api/orders/services/orders-service";`;

const DOCUMENT_BUILDER = file("sparta/api/salesforce/builders/document-builder.ts");
const DOCUMENT_DIRECTOR = file("sparta/api/salesforce/directors/document-director.ts");
const PERSON_BUILDER = file("sparta/common/builders/person-builder.ts");
const PERSON_DIRECTOR = file("sparta/common/directors/person-director.ts");
const COMMON_BUILDER = `import { PersonBuilder } from "@sparta/common/builders/person-builder";`;
const AREA_COMMON_BUILDER = `import { AddressBuilder } from "@sparta/api/common/builders/address-builder";`;

const CUSTOM = {
	sparta: { areas: { web: "ui" }, layers: { "page-objects": "pages" }, aliases: { "@app/*": "sparta" } },
} as const;

runRule("architecture-boundaries", rule, {
	valid: [
		{ code: `import { OrdersService } from "../services/orders-service";`, filename: ORDERS_STEPPER },
		{ code: `import { http } from "@sparta/api/common/http";`, filename: ORDERS_SERVICE },
		{ code: `import { test } from "@playwright/test";`, filename: ORDERS_STEPPER },
		{
			name: "tsconfig paths and baseUrl: allowed imports and packages",
			code: `import { CartPage } from "@pages/cart-page";
import { expect } from "@support";
import { test } from "@playwright/test";`,
			filename: TS_CART_STEPPER,
		},
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
		{ code: `import { MainWindow } from "../windows/main-window";`, filename: MAIN_STEPPER },
		{ code: `import { MenuComponent } from "../components/menu-component";`, filename: MAIN_WINDOW },
		{ code: `import { MainScenario } from "@sparta/desktop/app/scenarios/main-scenario";`, filename: SPEC },
		{
			name: "desktop: a stepper uses its area's builder",
			code: `import { SettingsBuilder } from "@sparta/desktop/builders/settings-builder";`,
			filename: MAIN_STEPPER,
		},
		{
			name: "files in tests/framework are not checked",
			code: `import { OrdersClient } from "@sparta/api/orders/clients/orders-client";`,
			filename: file("tests/framework/setup.ts"),
		},
		{
			name: "a folder that only starts with an area name is not that area",
			code: `import { Button } from "@sparta/uikit/button";`,
			filename: ORDERS_STEPPER,
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
		{ name: "builders: a stepper uses its area's builder", code: API_BUILDER, filename: ORDERS_STEPPER },
		{ name: "builders: a service uses its area's builder", code: API_BUILDER, filename: ORDERS_SERVICE },
		{ name: "builders: a scenario uses its area's builder", code: API_BUILDER, filename: ORDERS_SCENARIO },
		{
			name: "builders: an asserter uses its area's director",
			code: `import { OrderDirector } from "@sparta/api/directors/order-director";`,
			filename: file("sparta/api/orders/asserters/orders-asserter.ts"),
		},
		{
			name: "builders: a ui stepper uses a ui director",
			code: `import { CartDirector } from "@sparta/ui/directors/cart-director";`,
			filename: file("sparta/ui/shop/steppers/cart-stepper.ts"),
		},
		{
			name: "builders: a director uses builders",
			code: `import { OrderBuilder } from "../builders/order-builder";
import { CustomerBuilder } from "../builders/customer-builder";`,
			filename: ORDER_DIRECTOR,
		},
		{
			name: "builders: a builder uses area common code and support",
			code: `import { Order } from "@sparta/api/common/models/order";
import { expect } from "@sparta/support";`,
			filename: ORDER_BUILDER,
		},
		{
			name: "builders: fixtures and tests may use directors",
			code: `import { OrderDirector } from "@sparta/api/directors/order-director";`,
			filename: file("sparta/fixtures/test-fixture.ts"),
		},
		{ code: `import { OrderDirector } from "@sparta/api/directors/order-director";`, filename: SPEC },
		{
			name: "builders: a barrel re-exports its own builders",
			code: `export * from "./order-builder";`,
			filename: file("sparta/api/builders/index.ts"),
		},
		{
			name: "builders: a normal builder class uses a service of any group in its area",
			code: `${ORDERS_SERVICE_IMPORT}
export class OrderBuilder {}`,
			filename: ORDER_BUILDER,
		},
		{
			name: "builders: a normal director class uses a service",
			code: `${ORDERS_SERVICE_IMPORT}
export default class OrderDirector {}`,
			filename: ORDER_DIRECTOR,
		},
		{
			name: "builders: an abstract class with instance members is a normal class",
			code: `import { UsersService } from "@sparta/database/users/services/users-service";
export abstract class UserBuilder { build() {} }`,
			filename: file("sparta/database/builders/user-builder.ts"),
		},
		{
			name: "group builders: a builder uses a package, its group's models and a service",
			code: `import { BuilderWith, CeriosAutoBuilder } from "@cerios/cerios-builder";
import { Document } from "@sparta/api/salesforce/models/document";
import { CasesService } from "../services/cases-service";
export class DocumentBuilder extends CeriosAutoBuilder<Document>() {}`,
			filename: DOCUMENT_BUILDER,
		},
		{
			name: "group builders: a builder in a subfolder",
			code: `import { Case } from "@sparta/api/salesforce/models/case";
export class CaseBuilder {}`,
			filename: file("sparta/api/salesforce/builders/brp/case-builder.ts"),
		},
		...[
			"sparta/api/salesforce/steppers/cases-stepper.ts",
			"sparta/api/salesforce/asserters/cases-asserter.ts",
			"sparta/api/salesforce/scenarios/cases-scenario.ts",
			"sparta/api/salesforce/services/cases-service.ts",
		].map(path => ({
			name: `group builders: ${path} uses its group's builder and director`,
			code: `import { DocumentBuilder } from "@sparta/api/salesforce/builders/document-builder";
import { DocumentDirector } from "../directors/document-director";`,
			filename: file(path),
		})),
		{
			name: "group builders: a director uses builders of its group, its area's common, its area and sparta/common",
			code: `import { DocumentBuilder } from "../builders/document-builder";
import { CaseBuilder } from "../builders/brp/case-builder";
${AREA_COMMON_BUILDER}
${API_BUILDER}
${COMMON_BUILDER}`,
			filename: DOCUMENT_DIRECTOR,
		},
		{
			name: "group builders: a barrel re-exports its own builders",
			code: `export * from "./document-builder";
export * from "./brp";`,
			filename: file("sparta/api/salesforce/builders/index.ts"),
		},
		{
			name: "group builders: fixtures, top-level scenarios and tests use them",
			code: `import { DocumentBuilder } from "@sparta/api/salesforce/builders/document-builder";`,
			filename: file("sparta/fixtures/test-fixture.ts"),
		},
		{
			code: `import { DocumentBuilder } from "@sparta/api/salesforce/builders/document-builder";`,
			filename: file("sparta/scenarios/checkout-scenario.ts"),
		},
		{
			code: `import { DocumentBuilder } from "@sparta/api/salesforce/builders/document-builder";`,
			filename: SPEC,
		},
		{
			name: "area common builders: groups and area directors use them",
			code: AREA_COMMON_BUILDER,
			filename: ORDERS_STEPPER,
		},
		{ code: AREA_COMMON_BUILDER, filename: ORDER_DIRECTOR },
		{
			name: "area common builders: a director in the area's common folder uses them",
			code: `import { AddressBuilder } from "../builders/address-builder";
import { OrderBuilder } from "../builders/order-builder";`,
			filename: file("sparta/api/common/directors/order-director.ts"),
		},
		{
			name: "area common builders: a builder uses area common models",
			code: `import { Address } from "../models/address";
export abstract class AddressBuilder { static create() {} }`,
			filename: file("sparta/api/common/builders/address-builder.ts"),
		},
		{
			name: "common builders: every area uses them",
			code: COMMON_BUILDER,
			filename: ORDERS_STEPPER,
		},
		{ code: COMMON_BUILDER, filename: LOGIN_STEPPER },
		{ code: COMMON_BUILDER, filename: ORDER_DIRECTOR },
		{ code: COMMON_BUILDER, filename: DOCUMENT_DIRECTOR },
		{ code: COMMON_BUILDER, filename: SPEC },
		{
			name: "common builders: a director uses them, a builder uses shared code",
			code: `${COMMON_BUILDER}
import { AddressBuilder } from "../builders/address-builder";`,
			filename: PERSON_DIRECTOR,
		},
		{
			code: `import { Person } from "@sparta/common/models/person";
import { expect } from "@sparta/support";`,
			filename: PERSON_BUILDER,
		},
		{
			name: "common builders: a barrel re-exports its own builders",
			code: `export * from "./person-builder";`,
			filename: file("sparta/common/builders/index.ts"),
		},
		{
			name: "settings: a custom folder that follows builders",
			code: `import { OrderBuilder } from "@sparta/api/data-builders/order-builder";`,
			filename: ORDERS_STEPPER,
			settings: { sparta: { layers: { "data-builders": "builders" } } },
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
			name: "desktop window depends on a stepper",
			code: `import { MainStepper } from "../steppers/main-stepper";`,
			filename: MAIN_WINDOW,
			errors: [
				{
					messageId: "layer",
					data: { source: "desktop/app window", target: "desktop/app stepper", request: "../steppers/main-stepper" },
				},
			],
		},
		{
			name: "desktop component depends on a window",
			code: `import { MainWindow } from "../windows/main-window";`,
			filename: file("sparta/desktop/app/components/menu-component.ts"),
			errors: [{ messageId: "layer" }],
		},
		{
			name: "desktop scenario depends on a window",
			code: `import { MainWindow } from "../windows/main-window";`,
			filename: file("sparta/desktop/app/scenarios/main-scenario.ts"),
			errors: [{ messageId: "layer" }],
		},
		{
			name: "desktop window uses a builder",
			code: `import { SettingsBuilder } from "@sparta/desktop/builders/settings-builder";`,
			filename: MAIN_WINDOW,
			errors: [{ messageId: "layer" }],
		},
		{
			name: "desktop group depends on the ui area",
			code: `import { CartPage } from "@sparta/ui/shop/pages/cart-page";`,
			filename: MAIN_WINDOW,
			errors: [{ messageId: "isolation" }],
		},
		{
			name: "top-level scenario depends on a desktop window",
			code: `import { MainWindow } from "@sparta/desktop/app/windows/main-window";`,
			filename: file("sparta/scenarios/checkout-scenario.ts"),
			errors: [{ messageId: "layer" }],
		},
		{
			name: "test depends on a desktop stepper",
			code: `import { MainStepper } from "@sparta/desktop/app/steppers/main-stepper";`,
			filename: SPEC,
			errors: [{ messageId: "layer" }],
		},
		{
			name: "desktop stepper re-exports a window",
			code: `export { MainWindow } from "../windows/main-window";`,
			filename: MAIN_STEPPER,
			errors: [{ messageId: "reexport" }],
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
		{
			name: "import types are checked",
			code: `type Client = import("../clients/orders-client").OrdersClient;`,
			filename: ORDERS_STEPPER,
			errors: [
				{
					messageId: "layer",
					data: { source: "api/orders stepper", target: "api/orders client", request: "../clients/orders-client" },
				},
			],
		},
		{
			name: "dynamic imports with a template literal without expressions are checked",
			code: "const { OrdersClient } = await import(`../clients/orders-client`);",
			filename: ORDERS_STEPPER,
			errors: [{ messageId: "layer" }],
		},
		{
			name: "type-only imports are checked too",
			code: `import type { OrdersClient } from "../clients/orders-client";`,
			filename: ORDERS_STEPPER,
			errors: [{ messageId: "layer" }],
		},
		{
			name: "folder import: the fixtures barrel",
			code: `import { test } from "@sparta/fixtures";`,
			filename: ORDERS_STEPPER,
			errors: [
				{
					messageId: "isolation",
					data: { source: "api/orders stepper", target: "sparta/fixtures", request: "@sparta/fixtures" },
				},
			],
		},
		{
			name: "folder import: the top-level scenarios barrel",
			code: `import { CheckoutScenario } from "@sparta/scenarios";`,
			filename: ORDERS_STEPPER,
			errors: [
				{
					messageId: "isolation",
					data: { source: "api/orders stepper", target: "sparta/scenarios", request: "@sparta/scenarios" },
				},
			],
		},
		{
			name: "folder import: the tests folder",
			code: `import { data } from "../../../../tests";`,
			filename: ORDERS_STEPPER,
			errors: [
				{
					messageId: "isolation",
					data: { source: "api/orders stepper", target: "tests", request: "../../../../tests" },
				},
			],
		},
		{
			name: "folder import: the own area barrel exposes other groups",
			code: `import { CustomersService } from "@sparta/api";`,
			filename: ORDERS_STEPPER,
			errors: [
				{ messageId: "isolation", data: { source: "api/orders stepper", target: "api", request: "@sparta/api" } },
			],
		},
		{
			name: "folder import: another area barrel",
			code: `import { CartPage } from "@sparta/ui";`,
			filename: ORDERS_STEPPER,
			errors: [{ messageId: "isolation", data: { source: "api/orders stepper", target: "ui", request: "@sparta/ui" } }],
		},
		...[
			["a client", "sparta/api/orders/clients/orders-client.ts"],
			["a base service", "sparta/api/orders/services/orders-base-service.ts"],
			["a repository", "sparta/database/users/repositories/users-repository.ts"],
			["a page", "sparta/ui/shop/pages/cart-page.ts"],
			["a component", "sparta/ui/shop/components/cart-component.ts"],
			["a file outside the layer folders", "sparta/api/orders/models/order.ts"],
		].map(([what, path]) => ({
			name: `builders: ${what} uses a builder`,
			code: `import { Builder } from "${path.replace(/^sparta\/(\w+)\/.*$/, "@sparta/$1/builders/x-builder")}";`,
			filename: file(path),
			errors: [{ messageId: "layer" }],
		})),
		{
			name: "builders: a stepper uses another area's builder",
			code: `import { CartBuilder } from "@sparta/ui/builders/cart-builder";`,
			filename: ORDERS_STEPPER,
			errors: [
				{
					messageId: "isolation",
					data: { source: "api/orders stepper", target: "ui builder", request: "@sparta/ui/builders/cart-builder" },
				},
			],
		},
		{
			name: "settings: builders of a custom area are isolated from the standard area",
			code: `import { CartBuilder } from "@sparta/ui/builders/cart-builder";`,
			filename: file("sparta/web/shop/steppers/cart-stepper.ts"),
			settings: CUSTOM,
			errors: [{ messageId: "isolation" }],
		},
		{
			name: "builders: a builder uses another builder",
			code: `import { AddressBuilder } from "./address-builder";`,
			filename: ORDER_BUILDER,
			errors: [
				{
					messageId: "layer",
					data: { source: "api builder", target: "api builder", request: "./address-builder" },
				},
			],
		},
		{
			name: "builders: a builder uses a director",
			code: `import { OrderDirector } from "../directors/order-director";`,
			filename: ORDER_BUILDER,
			errors: [{ messageId: "layer" }],
		},
		{
			name: "builders: a director uses another director",
			code: `import { CustomerDirector } from "./customer-director";`,
			filename: ORDER_DIRECTOR,
			errors: [{ messageId: "layer" }],
		},
		{
			name: "builders: a director uses another area's builder",
			code: `import { CartBuilder } from "@sparta/ui/builders/cart-builder";`,
			filename: ORDER_DIRECTOR,
			errors: [{ messageId: "isolation" }],
		},
		{
			name: "builders: a normal builder uses a client, stepper or repository",
			code: `import { OrdersClient } from "@sparta/api/orders/clients/orders-client";
import { OrdersStepper } from "@sparta/api/orders/steppers/orders-stepper";
import { OrdersBaseService } from "@sparta/api/orders/services/orders-base-service";
export class OrderBuilder {}`,
			filename: ORDER_BUILDER,
			errors: [{ messageId: "isolation" }, { messageId: "isolation" }, { messageId: "isolation" }],
		},
		{
			name: "builders: a normal builder uses another area's service",
			code: `import { UsersService } from "@sparta/database/users/services/users-service";
export class OrderBuilder {}`,
			filename: ORDER_BUILDER,
			errors: [{ messageId: "isolation" }],
		},
		{
			name: "builders: a builder depends on fixtures and top-level scenarios",
			code: `import { test } from "@sparta/fixtures";
import { CheckoutScenario } from "@sparta/scenarios/checkout-scenario";`,
			filename: ORDER_BUILDER,
			errors: [{ messageId: "isolation" }, { messageId: "isolation" }],
		},
		{
			name: "builders: area common and shared code depend on a builder",
			code: API_BUILDER,
			filename: file("sparta/api/common/http.ts"),
			errors: [{ messageId: "isolation" }],
		},
		{
			code: API_BUILDER,
			filename: file("sparta/common/helpers.ts"),
			errors: [{ messageId: "isolation" }],
		},
		{
			name: "builders: a static abstract builder uses a service",
			code: `${ORDERS_SERVICE_IMPORT}
export abstract class OrderBuilder {
	private constructor() {}
	static readonly defaults = {};
	static build() {}
}`,
			filename: ORDER_BUILDER,
			errors: [
				{
					messageId: "staticService",
					data: {
						source: "api builder",
						target: "api/orders service",
						request: "@sparta/api/orders/services/orders-service",
					},
				},
			],
		},
		{
			name: "builders: a static abstract director uses a service",
			code: `${ORDERS_SERVICE_IMPORT}
export abstract class OrderDirector { static create() {} }`,
			filename: ORDER_DIRECTOR,
			errors: [{ messageId: "staticService" }],
		},
		{
			name: "builders: a builder file without a class uses a service",
			code: `${ORDERS_SERVICE_IMPORT}
export const buildOrder = () => ({});`,
			filename: ORDER_BUILDER,
			errors: [{ messageId: "staticService" }],
		},
		{
			name: "builders: a scenario re-exports a builder",
			code: `export { OrderBuilder } from "@sparta/api/builders/order-builder";`,
			filename: ORDERS_SCENARIO,
			errors: [{ messageId: "reexport" }],
		},
		{
			name: "group builders: another group uses them",
			code: `import { DocumentBuilder } from "@sparta/api/salesforce/builders/document-builder";`,
			filename: ORDERS_STEPPER,
			errors: [
				{
					messageId: "isolation",
					data: {
						source: "api/orders stepper",
						target: "api/salesforce builder",
						request: "@sparta/api/salesforce/builders/document-builder",
					},
				},
			],
		},
		{
			name: "group builders: an area director uses them",
			code: `import { DocumentBuilder } from "@sparta/api/salesforce/builders/document-builder";`,
			filename: ORDER_DIRECTOR,
			errors: [{ messageId: "isolation" }],
		},
		{
			name: "group builders: area common code uses them",
			code: `import { DocumentBuilder } from "@sparta/api/salesforce/builders/document-builder";`,
			filename: file("sparta/api/common/directors/order-director.ts"),
			errors: [{ messageId: "isolation" }],
		},
		{
			name: "group builders: a builder uses its group's client, stepper or base service",
			code: `import { SalesforceClient } from "../clients/salesforce-client";
import { CasesStepper } from "../steppers/cases-stepper";
import { CasesBaseService } from "../services/cases-base-service";
export class DocumentBuilder {}`,
			filename: DOCUMENT_BUILDER,
			errors: [
				{
					messageId: "layer",
					data: {
						source: "api/salesforce builder",
						target: "api/salesforce client",
						request: "../clients/salesforce-client",
					},
				},
				{ messageId: "layer" },
				{ messageId: "layer" },
			],
		},
		{
			name: "group builders: a builder uses another builder",
			code: `import { AccountBuilder } from "./account-builder";`,
			filename: DOCUMENT_BUILDER,
			errors: [{ messageId: "layer" }],
		},
		{
			name: "group builders: a builder uses the area's builder",
			code: API_BUILDER,
			filename: DOCUMENT_BUILDER,
			errors: [{ messageId: "layer" }],
		},
		{
			name: "group builders: a director uses a director",
			code: `import { AccountDirector } from "./account-director";
import { OrderDirector } from "@sparta/api/directors/order-director";`,
			filename: DOCUMENT_DIRECTOR,
			errors: [{ messageId: "layer" }, { messageId: "layer" }],
		},
		{
			name: "group builders: a page or a file outside the layer folders uses them",
			code: `import { CartBuilder } from "../builders/cart-builder";`,
			filename: file("sparta/ui/shop/pages/cart-page.ts"),
			errors: [{ messageId: "layer" }],
		},
		{
			code: `import { DocumentBuilder } from "../builders/document-builder";`,
			filename: file("sparta/api/salesforce/models/document.ts"),
			errors: [{ messageId: "layer" }],
		},
		{
			name: "group builders: a static abstract builder uses its group's service",
			code: `import { CasesService } from "../services/cases-service";
export abstract class DocumentBuilder { static create() {} }`,
			filename: DOCUMENT_BUILDER,
			errors: [{ messageId: "staticService" }],
		},
		{
			name: "area common builders: a builder uses a group service",
			code: `${ORDERS_SERVICE_IMPORT}
export class OrderBuilder {}`,
			filename: file("sparta/api/common/builders/order-builder.ts"),
			errors: [{ messageId: "isolation" }],
		},
		{
			name: "area common builders: another area uses them",
			code: `import { CartBuilder } from "@sparta/ui/common/builders/cart-builder";`,
			filename: ORDERS_STEPPER,
			errors: [{ messageId: "isolation" }],
		},
		{
			name: "area common builders: area common code outside the builder users uses them",
			code: `import { OrderBuilder } from "./builders/order-builder";`,
			filename: file("sparta/api/common/http.ts"),
			errors: [{ messageId: "layer" }],
		},
		{
			name: "common builders: a director uses an area builder",
			code: API_BUILDER,
			filename: PERSON_DIRECTOR,
			errors: [
				{
					messageId: "isolation",
					data: {
						source: "sparta/common director",
						target: "api builder",
						request: "@sparta/api/builders/order-builder",
					},
				},
			],
		},
		{
			name: "common builders: a builder uses a group service",
			code: `${ORDERS_SERVICE_IMPORT}
export class PersonBuilder {}`,
			filename: PERSON_BUILDER,
			errors: [{ messageId: "isolation" }],
		},
		{
			name: "common builders: a builder uses another builder",
			code: `import { AddressBuilder } from "./address-builder";`,
			filename: PERSON_BUILDER,
			errors: [
				{
					messageId: "layer",
					data: { source: "sparta/common builder", target: "sparta/common builder", request: "./address-builder" },
				},
			],
		},
		{
			name: "common builders: shared code outside the builder folders uses them",
			code: COMMON_BUILDER,
			filename: file("sparta/common/helpers.ts"),
			errors: [{ messageId: "layer" }],
		},
		{
			name: "common builders: a client uses them",
			code: COMMON_BUILDER,
			filename: file("sparta/api/orders/clients/orders-client.ts"),
			errors: [{ messageId: "layer" }],
		},
		{
			name: "tsconfig paths: a page depends on a stepper",
			code: `import { CartStepper } from "@steppers/cart-stepper";`,
			filename: TS_CART_PAGE,
			errors: [
				{
					messageId: "layer",
					data: { source: "ui/shop page", target: "ui/shop stepper", request: "@steppers/cart-stepper" },
				},
			],
		},
		{
			name: "tsconfig paths: the target that exists decides",
			code: `import { CartPage } from "@pages/cart-page";`,
			filename: TS_USERS_PAGE,
			errors: [
				{
					messageId: "isolation",
					data: { source: "ui/admin page", target: "ui/shop page", request: "@pages/cart-page" },
				},
			],
		},
		{
			name: "tsconfig baseUrl: a bare import into another group",
			code: `import { UsersPage } from "sparta/ui/admin/pages/users-page";`,
			filename: TS_CART_PAGE,
			errors: [
				{
					messageId: "isolation",
					data: {
						source: "ui/shop page",
						target: "ui/admin page",
						request: "sparta/ui/admin/pages/users-page",
					},
				},
			],
		},
	],
});
