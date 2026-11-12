# sparta/expect-from-support

Require `expect` to be imported from `@sparta/support` inside `sparta/`.

- **Type:** problem
- **Recommended:** error
- **Fixable:** yes, when `expect` is the only import from that module

## Rule details

`sparta/support` provides the project's `expect`, extended with custom matchers. Importing `expect` from anywhere else (such as `@playwright/test`) skips those matchers. Files inside `sparta/support/` itself are not checked.

## Settings

Configured through [`settings.sparta`](../../README.md#configuration). `supportModule` sets the module `expect` must come from, also for the autofix. `folders.sparta` sets the folder the rule applies to.

## Examples

```ts
// sparta/api/orders/asserters/orders-asserter.ts

// ❌ (autofixed to "@sparta/support")
import { expect } from "@playwright/test";
// ❌ (not autofixed, move expect to its own import)
import { expect, test } from "@playwright/test";
// ✅
import { expect } from "@sparta/support";
```
