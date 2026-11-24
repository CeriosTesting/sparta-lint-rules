# @cerios/sparta-lint-rules

## 0.1.0

### Minor Changes

- f05b3b0: Autocompletion in lint configs. Your editor now suggests the sparta rules and the `settings.sparta` keys and values, and flags wrong values:
  
  - `oxlint.config.ts`: rule names and `settings.sparta`, once you import `@cerios/sparta-lint-rules/oxlint` and use oxlint's `defineConfig`. `satisfies SpartaSettings` is no longer needed.
  - `.oxlintrc.json`: rule names and `settings.sparta`, with `"$schema": "./node_modules/@cerios/sparta-lint-rules/oxlintrc.schema.json"`. The schema extends oxlint's own, so oxlint's options keep their completion.
  - ESLint flat config (ESLint 10+): `settings.sparta`, once you import the plugin and use `defineConfig` from `eslint/config`. ESLint 9 types `settings` as a plain record, so keep `satisfies SpartaSettings` there.

### Patch Changes

- f05b3b0: `architecture-boundaries`: builders and directors are no longer limited to `sparta/<area>/builders/` and `sparta/<area>/directors/`. Put them at the level that matches who needs them:
  
  - in a group (`sparta/<area>/<group>/builders/`), private to that group, using its own services and models;
  - in an area's `common/` (`sparta/<area>/common/builders/`), for everything in that area folder;
  - directly in an area (`sparta/<area>/builders/`), shared by the area's groups, as before;
  - in `sparta/common/` (`sparta/common/builders/`), for every area.
  
  The `placement` error for `builders/` and `directors/` folders inside a group is removed. The same rules apply at every level: only scenarios, steppers, asserters, services and directors may use builders; builders use no builders or directors; directors use no directors; besides builders, a builder or director may only use services (as a normal class) and code outside the layer folders. `director-composes-builders`, `file-naming` and `class-matches-filename` cover the new locations.
- f05b3b0: Fix the types of ESM imports. The ESM type declarations used `export =`, so `import sparta from "@cerios/sparta-lint-rules/oxlint"` in an `oxlint.config.ts` (or the plugin in a typed ESLint config) failed with "has no default export". `sparta.configs.recommended` is now also accepted by ESLint's `defineConfig` in TypeScript.

## 0.0.2

### Patch Changes

- 1d9fc52: `architecture-boundaries`: builders and directors now live on their own, directly in an area (`sparta/<area>/builders/`, `sparta/<area>/directors/`), shared by the area's groups. This applies to every area, not only `ui` and `mobile`. Only scenarios, steppers, asserters and services of the same area folder may use them. Builders don't depend on other builders or on directors, and directors only depend on builders of their area. A normal class may also use the services of its area; a static abstract class may not. Other group code is never allowed. A `builders/` or `directors/` folder inside a group is reported with the area folder it belongs in. `builders` and `directors` can no longer be used as group names. `file-naming`, `class-matches-filename` and `member-ordering` apply to the new folders. Builders and directors are added to the re-export check.
- 1d9fc52: New standard area `desktop` for Windows desktop apps. It is structured like `ui`, with windows (`windows/`, `*-window.ts`) in place of pages, and follows the `ui` layer rules with `window` in place of `page`. Top-level scenarios may not use windows and components, and tests also not steppers and asserters. `file-naming`, `class-matches-filename` and `no-direct-construction-in-tests` know the new layer folder and the `Window` suffix. If you mapped a custom area named `desktop` in `settings.sparta.areas`, remove that entry: `desktop` is now a standard area.
- 1d9fc52: New rule `director-composes-builders` (recommended: warn). A director that imports only a single builder is reported, because that code belongs on the builder as a custom builder method.
- 1d9fc52: `file-naming` requires files in a layer folder to be kebab-case (`my-orders-stepper.ts`, not `myOrders-stepper.ts`), so `class-matches-filename` always expects a predictable class name. The message suggests the kebab-case name. Rename existing files that use other casing.
- 1d9fc52: New rule `member-ordering`, which replaces `private-members-last`. Class members must be ordered as static properties, instance properties, constructor, static methods, instance methods, each from public to protected to private. A property holding a function counts as a method. A property whose initializer reads a property declared above it is not reported, because moving it would change the result. Rename `sparta/private-members-last` to `sparta/member-ordering` in your config if you set it explicitly.
- 1d9fc52: `lines-between-class-members`:
  
  - Method overloads are grouped: signatures of the same method (including the implementation) must not be separated by blank lines, and a multi-line overload signature no longer needs a blank line after it. Fixable.
  - Property declarations wrapped over multiple lines by the formatter (long regexes, chained zod schemas, …) no longer require a blank line after them, so property groups stay together. Properties holding a function or class still behave like methods.
  
  `padding-lines`:
  
  - Function overloads outside classes follow the same rule: the overload signatures of a top-level or namespace function and its implementation must not be separated by blank lines. Fixable.
- 1d9fc52: `architecture-boundaries`: imports of a folder (`@sparta/fixtures`, `@sparta/scenarios`, `@sparta/ui`, `../../tests`) are now checked like imports of the files inside it. Before, they were not checked at all.
  
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
- 1d9fc52: Imports are now also resolved through `compilerOptions.paths` and `baseUrl` of the nearest `tsconfig.json`, including what it `extends`. `architecture-boundaries`, `no-direct-construction-in-tests` and `no-nested-polling` now check imports such as `@pages/cart-page` or `sparta/ui/shop/pages/cart-page`, which were skipped before. `settings.sparta.aliases` is only needed for aliases that are not in your tsconfig.

## 0.0.1

### Patch Changes

- 5d07f51: First release of the SPARTA lint rules for oxlint and ESLint: `architecture-boundaries`, `class-matches-filename`, `expect-from-support`, `file-naming`, `lines-between-class-members`, `no-direct-construction-in-tests`, `no-expect-in-tests`, `no-hard-waits`, `no-nested-polling`, `padding-lines`, `private-members-last`, `step-placeholders` and `step-required`, with recommended configs for both linters.
