---
"@cerios/sparta-lint-rules": patch
---

`file-naming` requires files in a layer folder to be kebab-case (`my-orders-stepper.ts`, not `myOrders-stepper.ts`), so `class-matches-filename` always expects a predictable class name. The message suggests the kebab-case name. Rename existing files that use other casing.
