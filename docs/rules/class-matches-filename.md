# sparta/class-matches-filename

Require a layer file to contain exactly one class, named after the file in PascalCase.

- **Type:** suggestion
- **Recommended:** warn
- **Fixable:** no

## Rule details

Applies to files in layer folders (`steppers/`, `asserters/`, `clients/`, `services/`, `pages/`, `screens/`, `windows/`, `components/`, `repositories/`, `builders/`, `directors/`, `factories/`, `scenarios/`), to `sparta/scenarios/` and to `sparta/fixtures/`.

- The first top-level class must be named after the file: `orders-stepper.ts` → `OrdersStepper` (also for `.mts` and `.cts`).
- A file in a layer folder without any top-level class is reported. Fixtures and `index.ts` barrels may contain no class.
  - A file that only declares types (`type`, `interface`, `declare`, `export type`) is reported as such: move the types to `models/` or another folder outside the layers. Whether a file is a layer file depends on its folder, not its name, so `models/orders-api-client.ts` or `enums/orders-api-client.ts` is never treated as a client.
  - A file that only declares functions is reported as such: SPARTA layers are classes, so make the functions methods of the class named after the file.
- Any further top-level class is reported; move it to its own file.
- Declaration files (`*.d.ts`) are not checked.

## Settings

Configured through [`settings.sparta`](../../README.md#configuration). Custom layer folders from `layers` count as layer folders.

## Examples

```ts
// sparta/api/orders/steppers/orders-stepper.ts

// ❌
export class OrderStepper {}

// ❌ second class
export class OrdersStepper {}
class Helper {}

// ✅
export class OrdersStepper {}
```

```ts
// sparta/api/orders/clients/orders-api-client.ts

// ❌ only declares types: move them to models/
export type OrdersApiClient = HttpClient<OrderEndpoints>;
```

```ts
// sparta/api/orders/clients/orders-api-client.ts

// ❌ only declares functions: make them methods of OrdersApiClient
export function getOrder(id: string): Promise<Order> {}
```
