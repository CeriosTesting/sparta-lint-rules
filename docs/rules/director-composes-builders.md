# sparta/director-composes-builders

Require a director to compose several builders; a director using a single builder belongs on that builder.

- **Type:** suggestion
- **Recommended:** warn
- **Fixable:** no

## Rule details

A director (`directors/*-director.ts`, in a group, an area's `common/`, an area or `sparta/common/`) puts several builders together into one piece of test data. A director that only uses one builder adds nothing on top of it, so that code belongs on the builder as a custom builder method.

The rule counts the builders a director imports, by name. A builder is any import that resolves into a `builders/` folder (relative paths, tsconfig `paths` and `baseUrl`, and the `@sparta/` alias plus configured aliases). Exactly one builder is reported.

- `import type` and `type` specifiers do not count, since they don't use the builder.
- The same builder imported twice counts once.
- A namespace import (`import * as builders`), dynamic `import()` or `require()` of a builder doesn't tell how many builders are used, so the file is not reported.
- An `index.ts` barrel in `directors/` is not a director.

Directors may not use other directors at all; [`architecture-boundaries`](architecture-boundaries.md#builders-and-directors) reports that. A director that also imports another director is therefore not reported here: moving its code onto the single builder would make that builder use a director. Use the builders behind the other director directly instead.

## Settings

Configured through [`settings.sparta`](../../README.md#configuration). Custom areas from `areas` and custom folders from `layers` that follow `builders` or `directors` are recognised.

## Examples

```ts
// sparta/api/directors/order-director.ts

// ❌ only uses OrderBuilder: add a custom method to OrderBuilder instead
import { OrderBuilder } from "../builders/order-builder";

export class OrderDirector {
	static paidOrder() {
		return new OrderBuilder().withStatus("paid").build();
	}
}
```

```ts
// sparta/api/builders/order-builder.ts

// ✅ the single-builder director as a custom builder method
export class OrderBuilder {
	paid(): this {
		return this.withStatus("paid");
	}
}
```

```ts
// sparta/api/directors/order-director.ts

// ✅ composes several builders
import { CustomerBuilder } from "../builders/customer-builder";
import { OrderBuilder } from "../builders/order-builder";

export class OrderDirector {
	static orderForNewCustomer() {
		const customer = new CustomerBuilder().build();

		return new OrderBuilder().forCustomer(customer).build();
	}
}
```
