# sparta/step-required

Require a `@step` decorator on public methods of steppers, asserters and scenarios.

- **Type:** suggestion
- **Recommended:** warn
- **Fixable:** no

## Rule details

In `steppers/`, `asserters/` and `scenarios/` folders, and in `sparta/scenarios/`, every public method needs a [`@step`](https://github.com/CeriosTesting/playwright-step-decorator) decorator so it shows up as a step in the report.

Not reported: constructors, getters and setters, `private`/`protected`/`#private` methods, and overload signatures.

## Settings

Configured through [`settings.sparta`](../../README.md#configuration). `stepDecorators` adds decorators that count as `@step`. `folders`, `areas` and `layers` decide which files are steppers, asserters and scenarios.

## Examples

```ts
// sparta/api/orders/steppers/orders-stepper.ts

// ❌
class OrdersStepper {
	async open(orderId: string) {}
}

// ✅
class OrdersStepper {
	@step("Open order {{orderId}}")
	async open(orderId: string) {}

	private async helper() {}
}
```
