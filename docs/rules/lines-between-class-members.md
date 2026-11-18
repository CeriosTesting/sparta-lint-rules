# sparta/lines-between-class-members

Require a blank line after every multi-line method-like class member, and disallow blank lines between method overloads.

- **Type:** layout
- **Recommended:** warn
- **Fixable:** yes

## Rule details

A method (or a property holding a function or class) that spans more than one line must be followed by a blank line. Applies to all files.

Property declarations may always be grouped without blank lines, also when the formatter wraps one over multiple lines (for example a long regex or a chained `z.object(...)` schema).

Method overloads are the exception: the signatures of an overloaded method and its implementation form one group, and must not be separated by blank lines — even when a signature spans more than one line. Overloads match on name, `static` and kind, so constructor and abstract method overloads are grouped too.

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
	private static readonly ORDER_ID = /^ORD-\d{6}$/;
	private static readonly REFERENCE = /^(?:[A-Z]{3}-\d{4}-[A-Z0-9]{8}|LEGACY-\d{10})$/;
	private static readonly ZIP = /^\d{4}[A-Z]{2}$/;

	private readonly page: Page;

	open() {
		return 1;
	}

	close() {}
}
```

```ts
// ❌
class OrdersStepper {
	find(id: string): Order;

	find(filter: OrderFilter): Order[];

	find(arg: string | OrderFilter): Order | Order[] {
		return lookup(arg);
	}
}

// ✅
class OrdersStepper {
	find(id: string): Order;
	find(filter: OrderFilter): Order[];
	find(arg: string | OrderFilter): Order | Order[] {
		return lookup(arg);
	}
}
```
