# sparta/padding-lines

Require blank lines after imports, around top-level functions and around object methods.

- **Type:** layout
- **Recommended:** warn
- **Fixable:** yes

## Rule details

Applies to all files.

- A blank line after the last import (including `import x = require()`).
- A blank line before and after a function statement in a module or namespace: function declarations, and variable declarations that hold a function. Consecutive overload signatures of the same function stay together.
- In multi-line object literals, a blank line before and after a method (including getters, setters and properties holding a function).

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
