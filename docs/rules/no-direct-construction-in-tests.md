# sparta/no-direct-construction-in-tests

Disallow constructing SPARTA layer classes in tests; use the fixtures instead.

- **Type:** problem
- **Recommended:** error
- **Fixable:** no

## Rule details

In `tests/` (except `tests/framework/`), `new X()` is reported when `X` ends with `Stepper`, `Asserter`, `Scenario`, `Service`, `Client`, `Repository`, `Page`, `Screen`, `Component`, `Builder`, `Director`, `Factory` or `Provider`. Tests get these objects from the SPARTA fixtures, so their setup and lifetime stay in one place.

## Settings

Configured through [`settings.sparta`](../../README.md#configuration). `folders.tests` sets the tests folder.

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
