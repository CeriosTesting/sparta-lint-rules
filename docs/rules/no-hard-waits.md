# sparta/no-hard-waits

Disallow fixed-time waits.

- **Type:** problem
- **Recommended:** error
- **Fixable:** no

## Rule details

In `sparta/` and `tests/` (except `tests/framework/`), the following are reported:

- `x.waitForTimeout(...)`
- `new Promise(resolve => setTimeout(resolve, ms))` and equivalents, where the timer callback does nothing but resolve the promise (`setTimeout`, `globalThis.setTimeout` and `window.setTimeout`)
- importing `setTimeout` from `timers/promises` or `node:timers/promises`

Wait for a state instead, with web-first assertions or with polling (`toPass`, `poll`) in a stepper or asserter.

## Settings

Configured through [`settings.sparta`](../../README.md#configuration). `folders` sets the folders the rule applies to.

## Examples

```ts
// ❌
await page.waitForTimeout(1000);
await new Promise(resolve => setTimeout(resolve, 1000));

// ✅
await expect(page.getByRole("status")).toHaveText("Paid");
```
