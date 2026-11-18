# sparta/no-direct-construction-in-tests

Disallow constructing SPARTA layer classes in tests; use the fixtures instead.

- **Type:** problem
- **Recommended:** error
- **Fixable:** no

## Rule details

In `tests/` (except `tests/framework/`), `new X()` and `new ns.X()` are reported when `X` is a SPARTA layer class. Tests get these objects from the SPARTA fixtures, so their setup and lifetime stay in one place.

Where `X` comes from decides:

- Imported from a package (`import { MongoClient } from "mongodb"`): never reported.
- Imported from a layer folder (`steppers/`, `clients/`, `factories/`, `sparta/scenarios/`, …), relative or through an alias: always reported, whatever its name.
- Anything else (imported from elsewhere in the project, or not imported): reported when the name ends with `Stepper`, `Asserter`, `Scenario`, `Service`, `Client`, `Repository`, `Page`, `Screen`, `Window`, `Component`, `Builder`, `Director`, `Factory`, `Provider`, `Container` or `Database`.

## Settings

Configured through [`settings.sparta`](../../README.md#configuration). `folders.tests` sets the tests folder. `folders`, `areas`, `layers`, `aliases` and `root` decide where an import points, together with your tsconfig `paths` (see [import resolution](../../README.md#import-resolution)).

## Examples

```ts
// tests/orders.spec.ts

// ❌
const scenario = new OrdersScenario(page);

// ✅
test("place an order", async ({ ordersScenario }) => {
	await ordersScenario.placeOrder();
});
```
