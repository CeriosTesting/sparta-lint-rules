import rule from "../../src/rules/director-composes-builders";
import { file, runRule } from "../helpers/rule-tester";

const DIRECTOR = file("sparta/api/directors/order-director.ts");

runRule("director-composes-builders", rule, {
	valid: [
		{
			name: "a director composing two builders",
			code: `import { OrderBuilder } from "../builders/order-builder";
import { CustomerBuilder } from "@sparta/api/builders/customer-builder";
export class OrderDirector {}`,
			filename: DIRECTOR,
		},
		{
			name: "two builders through a barrel",
			code: `import { OrderBuilder, CustomerBuilder } from "../builders";`,
			filename: DIRECTOR,
		},
		{
			name: "a type-only import does not count as using a builder",
			code: `import type { AddressBuilder } from "../builders/address-builder";
import { type LineBuilder, OrderBuilder, CustomerBuilder } from "../builders";`,
			filename: DIRECTOR,
		},
		{
			name: "only type imports and a service",
			code: `import type { OrderBuilder } from "../builders/order-builder";
import { OrdersService } from "@sparta/api/orders/services/orders-service";`,
			filename: DIRECTOR,
		},
		{
			name: "a namespace import does not tell how many builders are used",
			code: `import * as builders from "../builders";`,
			filename: DIRECTOR,
		},
		{
			name: "a dynamic import does not tell how many builders are used",
			code: `import { OrderBuilder } from "../builders/order-builder";
const lazy = await import("../builders/customer-builder");`,
			filename: DIRECTOR,
		},
		{
			name: "a director without builders is not reported here",
			code: `import { Order } from "@sparta/api/common/models/order";`,
			filename: DIRECTOR,
		},
		{
			name: "a barrel of directors is not a director",
			code: `import { OrderBuilder } from "../builders/order-builder";`,
			filename: file("sparta/api/directors/index.ts"),
		},
		{
			name: "builders and other layers are not checked",
			code: `import { OrderBuilder } from "@sparta/api/builders/order-builder";`,
			filename: file("sparta/api/orders/steppers/orders-stepper.ts"),
		},
	],
	invalid: [
		{
			name: "a single named builder",
			code: `import { OrderBuilder } from "../builders/order-builder";
import { OrdersService } from "@sparta/api/orders/services/orders-service";
export class OrderDirector {}`,
			filename: DIRECTOR,
			errors: [{ messageId: "singleBuilder", data: { builder: "OrderBuilder" } }],
		},
		{
			name: "a single default-imported builder",
			code: `import OrderBuilder from "@sparta/api/builders/order-builder";`,
			filename: DIRECTOR,
			errors: [{ messageId: "singleBuilder", data: { builder: "OrderBuilder" } }],
		},
		{
			name: "a single builder through a barrel",
			code: `import { OrderBuilder as Orders } from "../builders";`,
			filename: DIRECTOR,
			errors: [{ messageId: "singleBuilder", data: { builder: "Orders" } }],
		},
		{
			name: "the same builder imported twice",
			code: `import { OrderBuilder } from "../builders/order-builder";
import { OrderBuilder as Builder } from "../builders";`,
			filename: DIRECTOR,
			errors: [{ messageId: "singleBuilder" }],
		},
		{
			name: "settings: a custom directors folder",
			code: `import { CartBuilder } from "../builders/cart-builder";`,
			filename: file("sparta/web/data-directors/cart-director.ts"),
			settings: { sparta: { areas: { web: "ui" }, layers: { "data-directors": "directors" } } },
			errors: [{ messageId: "singleBuilder", data: { builder: "CartBuilder" } }],
		},
		{
			name: "a director in a group",
			code: `import { DocumentBuilder } from "../builders/document-builder";`,
			filename: file("sparta/api/salesforce/directors/document-director.ts"),
			errors: [{ messageId: "singleBuilder", data: { builder: "DocumentBuilder" } }],
		},
		{
			name: "a director in an area's common folder",
			code: `import { OrderBuilder } from "../builders/order-builder";`,
			filename: file("sparta/api/common/directors/order-director.ts"),
			errors: [{ messageId: "singleBuilder" }],
		},
		{
			name: "a director in sparta/common",
			code: `import { PersonBuilder } from "@sparta/common/builders/person-builder";`,
			filename: file("sparta/common/directors/person-director.ts"),
			errors: [{ messageId: "singleBuilder" }],
		},
	],
});
