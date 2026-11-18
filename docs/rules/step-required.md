# sparta/step-required

Require a `@step` decorator on public methods of steppers, asserters and scenarios.

- **Type:** suggestion
- **Recommended:** warn
- **Fixable:** no

## Rule details

In `steppers/`, `asserters/` and `scenarios/` folders, and in `sparta/scenarios/`, every public method needs a [`@step`](https://github.com/CeriosTesting/playwright-step-decorator) decorator so it shows up as a step in the report.

Not reported: constructors, getters and setters, `static` methods (helpers such as factories), `private`/`protected`/`#private` methods, and overload signatures.

A public instance property holding a function (`open = async () => {}`) is reported as well: it cannot carry a decorator, so make it a method with `@step`.

## Settings

Configured through [`settings.sparta`](../../README.md#configuration). `stepDecorators` adds decorators that count as `@step`. `folders`, `areas` and `layers` decide which files are steppers, asserters and scenarios.

## Examples

```ts
// sparta/api/orders/steppers/orders-stepper.ts

// ❌
class OrdersStepper {
	async open(orderId: string) {}

	close = async () => {};
}

// ✅
class OrdersStepper {
	constructor(private readonly page: Page) {}

	static create(page: Page) {
		return new OrdersStepper(page);
	}

	@step("Open order {{orderId}}")
	async open(orderId: string) {}

	private async helper() {}
}
```
