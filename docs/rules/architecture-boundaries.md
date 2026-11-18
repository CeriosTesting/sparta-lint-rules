# sparta/architecture-boundaries

Enforce the SPARTA layer and isolation boundaries between imports.

- **Type:** problem
- **Recommended:** error
- **Fixable:** no

## Rule details

Every `import` (including `import type`), `export … from`, dynamic `import()`, `require()`, `import x = require()` and `import("…").Type` that resolves into `sparta/` or `tests/` (relative paths, tsconfig `paths` and `baseUrl`, and the `@sparta/` and `@tests/` aliases plus any configured ones; see [import resolution](../../README.md#import-resolution)) is checked against three boundaries.

### Isolation

- A group (`sparta/<area>/<group>/`) only depends on its own group, its area's `common/`, builders and directors, and `sparta/common` or `sparta/support`.
- An area's builders and directors (`sparta/<area>/builders/`, `sparta/<area>/directors/`) only depend on their area's `common/`, builders and services, and `sparta/common` or `sparta/support`. See [builders and directors](#builders-and-directors).
- An area's `common/` does not depend on groups, builders, directors, other areas' `common/`, fixtures or top-level scenarios.
- `sparta/common` and `sparta/support` do not depend on groups, area commons, builders, directors, fixtures or top-level scenarios.
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

Builders (`*-builder.ts`) and directors (`*-director.ts`) build test data. They live on their own, directly in an area, and are shared by all of that area's groups:

```text
sparta/<area>/builders/order-builder.ts
sparta/<area>/directors/order-director.ts
```

This applies to every area: `api`, `database`, `ui`, `mobile`, `desktop` and custom areas.

- **Who may use them:** only scenarios, steppers, asserters and services of the same area folder. Every other group file is reported, including clients, repositories, pages, screens, windows, components, base layers and files outside the layer folders. Builders of another area are an isolation error. Fixtures, top-level scenarios and tests may still use them.
- **Builders** do not depend on other builders or on directors.
- **Directors** only depend on builders of their own area, never on other directors. A director that uses a single builder belongs on that builder as a custom method; [`director-composes-builders`](director-composes-builders.md) reports that.
- **Services:** a builder or director is either a static abstract class (`abstract`, with only `static` members and at most a `private constructor`) or a normal class. Only a normal class may use the services (`services/*-service.ts`) of any group in its area. A static abstract class, or a file without a class, that imports a service is reported. No other group code may be used at all.
- **Placement:** a `builders/` or `directors/` folder inside a group (`sparta/ui/shop/builders/`) is reported once per file, with the area folder it belongs in.

Because `builders` and `directors` are area-level folders, a group can't be named `builders` or `directors`. An `index.ts` barrel in those folders may import and re-export its own layer.

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

// ❌ builders don't use other builders
import { AddressBuilder } from "./address-builder";

export class OrderBuilder {
	constructor(private readonly orders: OrdersService) {}
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

Files in `tests/framework/` are not checked.
