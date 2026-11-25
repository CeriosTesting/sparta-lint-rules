# sparta/architecture-boundaries

Enforce the SPARTA layer and isolation boundaries between imports.

- **Type:** problem
- **Recommended:** error
- **Fixable:** no

## Rule details

Every `import` (including `import type`), `export … from`, dynamic `import()`, `require()`, `import x = require()` and `import("…").Type` that resolves into `sparta/` or `tests/` (relative paths, tsconfig `paths` and `baseUrl`, and the `@sparta/` and `@tests/` aliases plus any configured ones; see [import resolution](../../README.md#import-resolution)) is checked against three boundaries.

### Isolation

- A group (`sparta/<area>/<group>/`) only depends on its own group, its area's `common/`, builders and directors, and `sparta/common` or `sparta/support`.
- An area's builders and directors (`sparta/<area>/builders/`, `sparta/<area>/directors/`) only depend on their area's `common/`, builders and services, and `sparta/common` or `sparta/support`. Builders and directors can also live in a group, in an area's `common/` and in `sparta/common/`; see [builders and directors](#builders-and-directors).
- An area's `common/` does not depend on groups, the area's builders and directors, other areas' `common/`, fixtures or top-level scenarios.
- `sparta/common` and `sparta/support` do not depend on groups, area commons, area builders and directors, fixtures or top-level scenarios.
- Nothing in `sparta/` depends on `tests/`.

### Layers

Within an area, each layer may only depend on the layers below it:

| Area     | Layer      | Must not depend on                           |
| -------- | ---------- | -------------------------------------------- |
| api      | client     | client, service, stepper, asserter, scenario |
| api      | service    | service, stepper, asserter, scenario         |
| api      | stepper    | client, asserter, scenario                   |
| api      | asserter   | stepper, asserter, scenario                  |
| api      | scenario   | service, client                              |
| database | repository | service, stepper, asserter, scenario         |
| database | service    | service, stepper, asserter, scenario         |
| database | stepper    | repository, asserter, scenario               |
| database | asserter   | repository, stepper, asserter, scenario      |
| database | scenario   | service, repository                          |
| database | database   | every database layer                         |
| database | container  | every database layer except database         |
| ui       | component  | page, stepper, asserter, scenario            |
| ui       | page       | stepper, asserter, scenario                  |
| ui       | stepper    | asserter, scenario                           |
| ui       | asserter   | stepper, asserter, scenario                  |
| ui       | scenario   | page, component                              |

The `mobile` and `desktop` areas are structured like `ui`, with screens (`screens/`, `*-screen.ts`) and windows (`windows/`, `*-window.ts`, for Windows desktop apps) in place of pages. Their layers follow the `ui` rows with `screen` or `window` in place of `page`.

Files named `*-base-client.ts`, `*-base-service.ts` and `*-base-repository.ts` are base layers with the same restrictions as their layer, and they also may not depend on that layer itself.

### Builders and directors

Builders (`*-builder.ts`) and directors (`*-director.ts`) build test data. Put them at the level that matches who needs them; the level decides who can see them:

| Level            | Folder                                                    | Visible to                     | Services they may use      |
| ---------------- | --------------------------------------------------------- | ------------------------------ | -------------------------- |
| Group            | `sparta/<area>/<group>/builders/`, `…/<group>/directors/` | that group only                | their own group's services |
| Area common      | `sparta/<area>/common/builders/`, `…/common/directors/`   | everything in that area folder | none                       |
| Area             | `sparta/<area>/builders/`, `sparta/<area>/directors/`     | the area's groups              | any group's in the area    |
| Top-level common | `sparta/common/builders/`, `sparta/common/directors/`     | every area                     | none                       |

This applies to every area: `api`, `database`, `ui`, `mobile`, `desktop` and custom areas. Sub-folders are fine (`sparta/api/salesforce/builders/brp/case-builder.ts`).

- **Who may use them:** only scenarios, steppers, asserters and services (and directors, see below) that can see them. Every other file is reported, including clients, repositories, pages, screens, windows, components, base layers and files outside the layer folders, such as `models/` or `sparta/common/helpers.ts`. Builders out of sight are an isolation error: another group's, another area's, and, for code in an area's `common/` or `sparta/common/`, the area-level ones. Fixtures, top-level scenarios and tests may use them.
- **Builders** do not depend on directors, and only use another builder they can see for nested composition with [`@cerios/cerios-builder`](https://www.npmjs.com/package/@cerios/cerios-builder): every use of the imported builder must be inside a composer type for it (`BuilderComposerFromFactory<typeof AddressBuilder.create>` for types and interfaces, `ClassBuilderComposerFromFactory<…>` for classes), or inside a function or method with a parameter of such a type. The composer type may be written on the parameter or reached through a local `type` alias or `interface`. Any other use of the builder is reported where it happens. A namespace import (`import * as`), dynamic import, `require` or re-export of another builder is always reported.
- **Directors** only depend on builders they can see, never on other directors. A group's director may combine its group's builders with those of its area's `common/`, its area and `sparta/common/`. A director that uses a single builder belongs on that builder as a custom method; [`director-composes-builders`](director-composes-builders.md) reports that.
- **Other dependencies:** besides builders, a builder or director may only use services and code outside the layer folders (models, helpers, packages) that it can see. Clients, steppers, pages, base layers and other layers are reported.
- **Services:** a builder or director is either a static abstract class (`abstract`, with only `static` members and at most a `private constructor`) or a normal class. Only a normal class may use services. A static abstract class, or a file without a class, that imports a service is reported.

Because `builders` and `directors` are area-level folders, a group can't be named `builders` or `directors`. An `index.ts` barrel in a `builders/` or `directors/` folder may import and re-export its own layer.

Orchestrating code may only use the higher layers:

- `sparta/scenarios/` does not use API clients and services, database access layers, UI pages and components, mobile screens and components, or desktop windows and components.
- `tests/` also does not use steppers and asserters; tests go through scenarios (via fixtures).

### Re-exports

A file must not re-export another layer's steppers, asserters, scenarios, services, clients, repositories, pages, screens, windows, components, builders or directors, because that bypasses the checks above. Fixtures and tests may re-export.

## Settings

Configured through [`settings.sparta`](../../README.md#configuration). `folders`, `areas`, `layers`, `aliases` and `root` tell the rule your names. A custom area follows the layer rules of its standard area but stays isolated from every other area folder, including that standard one.

## Examples

```ts
// sparta/api/orders/steppers/orders-stepper.ts

// ✅ the area's builders, shared by all its groups
import { OrderBuilder } from "@sparta/api/builders/order-builder";
// ✅ area common code
import { http } from "@sparta/api/common/http";
// ❌ depends on another group
import { CustomersService } from "@sparta/api/customers/services/customers-service";

// ❌ stepper depends on a client
import { OrdersClient } from "../clients/orders-client";
// ✅ stepper depends on a service of its own group
import { OrdersService } from "../services/orders-service";
```

```ts
// sparta/api/builders/order-builder.ts

// ❌ only services: no clients, steppers, repositories, ...
import { OrdersClient } from "@sparta/api/orders/clients/orders-client";
// ✅ a normal class may use a service of its area
import { OrdersService } from "@sparta/api/orders/services/orders-service";

// ❌ builders don't use other builders (outside a composer, see below)
import { AddressBuilder } from "./address-builder";

export class OrderBuilder {
	constructor(private readonly orders: OrdersService) {}
}
```

```ts
// sparta/api/builders/customer-builder.ts

import { BuilderComposerFromFactory, BuilderWith, CeriosAutoBuilder } from "@cerios/cerios-builder";
import { Customer } from "@sparta/api/common/models/customer";

import { AddressBuilder } from "./address-builder";

export class CustomerBuilder extends CeriosAutoBuilder<Customer>() {
	// ✅ the caller composes the nested address; AddressBuilder is only used for that
	withAddress(
		fn: BuilderComposerFromFactory<typeof AddressBuilder.createWithDefaults>
	): BuilderWith<this, "address", CustomerBuilder> {
		return this.address(fn(AddressBuilder.createWithDefaults()).build());
	}

	// ❌ AddressBuilder used outside a composer: put this recipe in a director
	withDefaultAddress(): BuilderWith<this, "address", CustomerBuilder> {
		return this.address(AddressBuilder.createWithDefaults().build());
	}
}
```

```ts
// sparta/api/directors/order-director.ts

// ❌ a static abstract class must not use services
import { OrdersService } from "@sparta/api/orders/services/orders-service";

export abstract class OrderDirector {
	static paidOrder() {}
}
```

```ts
// sparta/api/salesforce/builders/document-builder.ts

// ✅ packages, the group's own models and (in a normal class) its own services
import { CeriosAutoBuilder } from "@cerios/cerios-builder";
import { Document } from "@sparta/api/salesforce/models/document";
// ❌ builders don't use other builders outside a composer, at any level
import { PersonBuilder } from "@sparta/common/builders/person-builder";

// ❌ only services: no clients, steppers, ...
import { SalesforceClient } from "../clients/salesforce-client";

export class DocumentBuilder extends CeriosAutoBuilder<Document>() {}
```

```ts
// sparta/api/orders/steppers/orders-stepper.ts

import { AddressBuilder } from "@sparta/api/common/builders/address-builder";
// ❌ the salesforce group's builders are private to that group
import { DocumentBuilder } from "@sparta/api/salesforce/builders/document-builder";
// ✅ builders from sparta/common/ and from the area's common/
import { PersonBuilder } from "@sparta/common/builders/person-builder";
```

Files in `tests/framework/` are not checked.
