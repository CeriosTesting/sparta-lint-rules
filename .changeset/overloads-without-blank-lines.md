---
"@cerios/sparta-lint-rules": patch
---

`lines-between-class-members`:

- Method overloads are grouped: signatures of the same method (including the implementation) must not be separated by blank lines, and a multi-line overload signature no longer needs a blank line after it. Fixable.
- Property declarations wrapped over multiple lines by the formatter (long regexes, chained zod schemas, …) no longer require a blank line after them, so property groups stay together. Properties holding a function or class still behave like methods.

`padding-lines`:

- Function overloads outside classes follow the same rule: the overload signatures of a top-level or namespace function and its implementation must not be separated by blank lines. Fixable.
