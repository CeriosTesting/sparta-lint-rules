# sparta/lines-between-class-members

Require a blank line after every multi-line class member.

- **Type:** layout
- **Recommended:** warn
- **Fixable:** yes

## Rule details

A class member that spans more than one line must be followed by a blank line. Single-line members (such as property declarations) may be grouped without blank lines. Applies to all files.

## Examples

```ts
// ❌
class OrdersStepper {
	open() {
		return 1;
	}
	close() {}
}

// ✅
class OrdersStepper {
	private readonly page: Page;
	private readonly orders: OrdersService;

	open() {
		return 1;
	}

	close() {}
}
```
