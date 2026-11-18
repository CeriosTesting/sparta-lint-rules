# sparta/member-ordering

Require class members in a fixed order: properties, constructor, methods; static before instance; public before protected before private.

- **Type:** suggestion
- **Recommended:** warn
- **Fixable:** no

## Rule details

In every class, members must appear in this order:

| #   | Group                                                     |
| --- | --------------------------------------------------------- |
| 1   | static properties: public, then protected, then private   |
| 2   | instance properties: public, then protected, then private |
| 3   | constructor                                               |
| 4   | static methods: public, then protected, then private      |
| 5   | instance methods: public, then protected, then private    |

- A member without a modifier is public. `private` and `#name` are both private.
- Index signatures count as properties. Getters and setters count as methods.
- A property holding a function or class (`onClick = () => {}`) counts as a method, as in [`lines-between-class-members`](lines-between-class-members.md).
- A property whose initializer reads a property declared above it (`this.x`, `this.#x` or `ClassName.x`, outside a function) is not reported: initializers run in source order, so moving it up would read the other property before it is set.
- `static { }` blocks are ignored. Constructor parameter properties (`constructor(private page: Page)`) are not class members, so this rule doesn't affect them.

Each member that comes after a member of a later group is reported once. Applies to all files.

## Examples

```ts
// ❌
class OrdersPage {
	constructor(private readonly page: Page) {}

	private readonly timeout = 5_000;

	private format() {}

	open() {}

	static create() {}
}

// ✅
class OrdersPage {
	private readonly timeout = 5_000;

	constructor(private readonly page: Page) {}

	static create() {}

	open() {}

	private format() {}
}
```
