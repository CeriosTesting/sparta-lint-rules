# sparta/padding-lines

Require blank lines after imports, around top-level functions and around object methods, and disallow blank lines between function overloads.

- **Type:** layout
- **Recommended:** warn
- **Fixable:** yes

## Rule details

Applies to all files.

- A blank line after the last import (including `import x = require()`).
- A blank line before and after a function statement in a module or namespace: function declarations, and variable declarations that hold a function.
- Function overloads are the exception: the overload signatures of a function and its implementation form one group, and must not be separated by blank lines, even when a signature spans more than one line. This matches how [`lines-between-class-members`](lines-between-class-members.md) treats method overloads.
- In multi-line object literals, a blank line before and after a multi-line method (including getters, setters and properties holding a function). Single-line ones (`filter: x => x.ok,`) need no blank lines, as in [`lines-between-class-members`](lines-between-class-members.md).

## Examples

```ts
// ❌
import { test } from "@playwright/test";
const timeout = 1000;
function open() {}

// ✅
import { test } from "@playwright/test";

const timeout = 1000;

function open() {}
```

```ts
// ❌
export function find(id: string): Order;

export function find(filter: OrderFilter): Order[];

export function find(arg: string | OrderFilter): Order | Order[] {
	return lookup(arg);
}

// ✅
export function find(id: string): Order;
export function find(filter: OrderFilter): Order[];
export function find(arg: string | OrderFilter): Order | Order[] {
	return lookup(arg);
}
```
