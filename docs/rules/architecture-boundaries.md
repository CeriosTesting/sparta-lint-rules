# sparta/architecture-boundaries

Enforce the SPARTA layer and isolation boundaries between imports.

- **Type:** problem
- **Recommended:** error
- **Fixable:** no

## Rule details

Every `import`, `export … from`, dynamic `import()`, `require()` and `import x = require()` that resolves into `sparta/` or `tests/` (relative paths and the `@sparta/` and `@tests/` aliases plus any configured ones, which resolve against the [project root](../../README.md#project-root)) is checked against three boundaries.

### Isolation

- A group (`sparta/<area>/<group>/`) only depends on its own group, its area's `common/`, and `sparta/common` or `sparta/support`.
- An area's `common/` does not depend on groups, other areas' `common/`, fixtures or top-level scenarios.
- `sparta/common` and `sparta/support` do not depend on groups, area commons, fixtures or top-level scenarios.
- Nothing in `sparta/` depends on `tests/`.

### Layers

Within an area, each layer may only depend on the layers below it:

| Area     | Layer      | Must not depend on                                   |
| -------- | ---------- | ---------------------------------------------------- |
| api      | client     | client, service, stepper, asserter, scenario         |
| api      | service    | service, stepper, asserter, scenario                 |
| api      | stepper    | client, asserter, scenario                           |
| api      | asserter   | stepper, asserter, scenario                          |
| api      | scenario   | service, client                                      |
| database | repository | service, stepper, asserter, scenario                 |
| database | service    | service, stepper, asserter, scenario                 |
| database | stepper    | repository, asserter, scenario                       |
| database | asserter   | repository, stepper, asserter, scenario              |
| database | scenario   | service, repository                                  |
| database | database   | every database layer                                 |
| database | container  | every database layer except database                 |
| ui       | component  | page, stepper, asserter, scenario, builder, director |
| ui       | page       | stepper, asserter, scenario, builder, director       |
| ui       | stepper    | asserter, scenario                                   |
| ui       | asserter   | stepper, asserter, scenario                          |
| ui       | builder    | page, component, stepper, asserter, scenario         |
| ui       | director   | page, component, stepper, asserter, scenario         |
| ui       | scenario   | page, component                                      |

The `mobile` area is structured like `ui`, with screens (`screens/`, `*-screen.ts`) in place of pages. Its layers follow the `ui` rows with `screen` in place of `page`.

Files named `*-base-client.ts`, `*-base-service.ts` and `*-base-repository.ts` are base layers with the same restrictions as their layer, and they also may not depend on that layer itself.

Orchestrating code may only use the higher layers:

- `sparta/scenarios/` does not use API clients and services, database access layers, UI pages and components, or mobile screens and components.
- `tests/` also does not use steppers and asserters; tests go through scenarios (via fixtures).

### Re-exports

A file must not re-export another layer's steppers, asserters, scenarios, services, clients, repositories, pages, screens or components, because that bypasses the checks above. Fixtures and tests may re-export.

## Settings

Configured through [`settings.sparta`](../../README.md#configuration). `folders`, `areas`, `layers`, `aliases` and `root` tell the rule your names. A custom area follows the layer rules of its standard area but stays isolated from every other area folder, including that standard one.

## Examples

```ts
// sparta/api/orders/steppers/orders-stepper.ts

// ✅ area common code
import { http } from "@sparta/api/common/http";
// ❌ depends on another group
import { CustomersService } from "@sparta/api/customers/services/customers-service";

// ❌ stepper depends on a client
import { OrdersClient } from "../clients/orders-client";
// ✅ stepper depends on a service of its own group
import { OrdersService } from "../services/orders-service";
```

Files in `tests/framework/` are not checked.
