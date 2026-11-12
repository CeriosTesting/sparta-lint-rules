# sparta/no-nested-polling

Disallow polling inside the callback of another poll, also through calls into other files.

- **Type:** problem
- **Recommended:** error
- **Fixable:** no

## Rule details

Polling (`.toPass()`, `.toPassAndReturn()`, `.poll()`, `.pollAndReturn()`) is allowed in every layer, but never inside another poll. An inner poll runs to its own timeout on every outer attempt, so the timeouts multiply, and a failure no longer tells you which retry gave up.

The rule looks at every poll callback:

| Poll                                             | Callback                                                                           |
| ------------------------------------------------ | ---------------------------------------------------------------------------------- |
| `expect.poll(cb)`, `x.pollAndReturn(cb)`         | the first argument                                                                 |
| `expect(cb).toPass()`, `x(cb).toPassAndReturn()` | the argument of the call the chain starts from (also `expect.soft(cb)` and `.not`) |

Inside that callback it reports:

- a polling call written directly in the callback (also inside nested arrow functions)
- a call to a function or method that polls, directly or through other calls, in this file or in other files

### How calls are followed

Lint rules get no type information, so the rule follows calls using the SPARTA conventions and reads the other files from disk:

- `this.method()`, including private methods and methods inherited through `extends`
- `this.field.method()` and longer chains (`this.page.table.method()`). A field's class comes from a typed constructor parameter property (`constructor(private readonly page: OrdersPage)`), a typed field, a getter's return type, or `new X()` assigned to the field.
- local variables created with `new X()` or typed as `X`, and `new X().method()`
- functions declared in the file or imported
- imports that are relative or use the `@sparta/*` and `@tests/*` aliases (resolved against the [project root](../../README.md#project-root)), including named re-exports and `export *`. Classes are resolved through their import path, so classes with the same name in different folders are told apart.
- a callback passed by reference (`expect.poll(this.fetchStatus)`) counts as the referenced method's body

Package imports (such as `@playwright/test`), dependencies passed as method parameters, objects created inside callbacks such as `.map()`, interfaces and dynamic member access are not followed. Whatever can't be resolved is skipped, so the rule doesn't guess.

## Settings

Configured through [`settings.sparta`](../../README.md#configuration). `pollingMethods` adds retrying methods, such as `["eventually"]`; their callback is found as `x.method(callback)` or `x(callback).method()`. `aliases` and `root` are used to follow imports.

## Examples

```ts
// sparta/ui/shop/pages/orders-page.ts
export class OrdersPage {
	async openOrder(id: string): Promise<void> {
		await this.findOrder(id);
	}

	private async findOrder(id: string): Promise<void> {
		await expect.poll(() => this.orderRows.count()).toBeGreaterThan(0);
	}
}

// sparta/ui/shop/asserters/orders-asserter.ts
export class OrdersAsserter {
	constructor(private readonly ordersPage: OrdersPage) {}

	async orderIsShown(id: string): Promise<void> {
		// ❌ openOrder polls (OrdersPage.openOrder → OrdersPage.findOrder → poll)
		await expect(async () => {
			await this.ordersPage.openOrder(id);
		}).toPass();

		// ✅ a single level of polling
		await this.ordersPage.openOrder(id);
		await expect.poll(() => this.ordersPage.getStatus(id)).toBe("shown");
	}
}
```

```ts
// ❌ poll inside a poll
await expect(async () => {
	await expect.poll(() => fetchStatus()).toBe("done");
}).toPass();
```

## Limitations

- The rule reads other files from disk, so unsaved changes in other files only count once they are saved.
- When only another file changes, a cached lint result for this file (`eslint --cache`) is not refreshed.
