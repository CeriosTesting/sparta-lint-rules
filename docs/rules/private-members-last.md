# sparta/private-members-last

Require public methods to be placed above private methods.

- **Type:** suggestion
- **Recommended:** warn
- **Fixable:** no

## Rule details

In every class, a public (or protected) method must not come after a private method (`private` or `#name`). Constructors and properties are ignored. Applies to all files.

## Examples

```ts
// ❌
class OrdersStepper {
	private helper() {}

	open() {}
}

// ✅
class OrdersStepper {
	open() {}

	private helper() {}
}
```
