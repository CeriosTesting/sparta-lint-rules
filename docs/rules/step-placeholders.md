# sparta/step-placeholders

Validate the placeholders in `@step` descriptions against the method parameters.

- **Type:** problem
- **Recommended:** error
- **Fixable:** yes, for single braces around a parameter name and for spaces inside the braces

## Rule details

For [`@cerios/playwright-step-decorator`](https://github.com/CeriosTesting/playwright-step-decorator) descriptions written as a string literal (or a template literal without expressions):

- `{{name}}` and `{{name.path}}` must refer to a parameter of the method. `@step` reads the name exactly as written, so `{{ name }}` and `{{}}` fail at runtime and are reported. When the name without spaces is a parameter, the autofix removes the spaces.
- `[[index]]` must be smaller than the number of parameters (unless the method has a rest parameter).
- `{name}` is printed literally, so it is reported. When `name` is a parameter, the autofix turns it into `{{name}}`.
- `@step` must be the decorator directly above the method; otherwise the placeholders cannot be resolved.

Applies to all files.

## Settings

Configured through [`settings.sparta`](../../README.md#configuration). `stepDecorators` adds decorators that are checked like `@step`.

## Examples

```ts
class OrdersStepper {
	// ❌ unknown parameter
	@step("Open order {{id}}")
	async open(orderId: string) {}

	// ❌ single braces (autofixed to {{orderId}})
	@step("Open order {orderId}")
	async open(orderId: string) {}

	// ✅
	@step("Open order {{orderId}} ([[1]])")
	async open(orderId: string, attempt: number) {}
}
```
