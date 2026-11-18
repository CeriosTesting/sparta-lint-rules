---
"@cerios/sparta-lint-rules": patch
---

`architecture-boundaries`: imports of a folder (`@sparta/fixtures`, `@sparta/scenarios`, `@sparta/ui`, `../../tests`) are now checked like imports of the files inside it. Before, they were not checked at all.

`expect-from-support`: subpaths of the support module (`@sparta/support/assertions`) and relative imports into `sparta/support/` are accepted.

`step-placeholders`: adjacent single-brace placeholders (`{a}{b}`) are all reported. Before, only the first one was.

`no-nested-polling` follows more calls: parameters typed as a class, arrow-function class properties and static method calls (`Waiter.until()`).

`step-required`: static methods no longer need `@step`; they are helpers such as factories. Public instance properties holding a function (`open = async () => {}`) are now reported, because they cannot carry `@step`.

`step-placeholders`: `{{this.path}}` placeholders are accepted, and `{this.path}` is autofixed like a parameter.

`padding-lines`: single-line methods and function properties in object literals (`filter: x => x.ok,`) no longer need blank lines around them, as in `lines-between-class-members`.

`architecture-boundaries`: `import("…").Type` type references and `import()`/`require()` with a template literal without expressions are checked.

`no-hard-waits`: the sleeps of `timers/promises` are reported however the module is bound: default and namespace imports (`timers.setTimeout(ms)`), `scheduler.wait(ms)` and `require("timers/promises")`.

`no-direct-construction-in-tests`: where a class is imported from now decides. Classes from packages (`new MongoClient()`) are no longer reported. Classes imported from a layer folder are reported whatever their name, as is `new ns.OrdersStepper()` through a namespace import. The name check now also covers `Container` and `Database`.

`class-matches-filename`: a file in a layer folder without a class is reported; fixtures and `index.ts` barrels may contain none. `.mts`/`.cts` names give the right expected class name, and declaration files are not checked.

`file-naming`: `.mts`/`.cts` files count with their suffix, and declaration files (`*.d.ts`) are not checked.
