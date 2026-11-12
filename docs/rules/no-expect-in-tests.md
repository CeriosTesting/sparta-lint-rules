# sparta/no-expect-in-tests

Disallow `expect` in test files; checks belong in steppers and asserters.

- **Type:** problem
- **Recommended:** error
- **Fixable:** no

## Rule details

In `tests/` (except `tests/framework/`), importing `expect` and calling `expect(...)` or `expect.*(...)` are reported. Put checkpoints in a stepper, and technical or functional checks in an asserter, so tests read as a sequence of business steps.

This covers extended expects too, so a check cannot slip in under another name:

- `expectly` and its extensions, such as `expectlyLocator` from `@cerios/playwright-expectly`.
- Project-specific expects named `expect…`, such as `expectApi` or `expect_soft`.
- Renamed imports, such as `import { expect as check }`.

Names like `expected` or `expecting` are not treated as an expect, and neither are methods such as `ordersScenario.expectOrderIsPaid()`: calling a stepper or asserter is exactly what a test should do.

## Settings

Configured through [`settings.sparta`](../../README.md#configuration). `expectNames` adds assertion functions that tests must not call, such as `["verify"]`. `folders.tests` sets the tests folder.

## Examples

```ts
// tests/orders.spec.ts

// ❌
import { expect, test } from "@playwright/test";

expect(order.status).toBe("paid");

// ❌
import { expectly } from "@cerios/playwright-expectly";

expectly(order.paidAt).toBeToday();

// ✅
await ordersScenario.verifyOrderIsPaid(order);
```
