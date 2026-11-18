---
"@cerios/sparta-lint-rules": patch
---

Imports are now also resolved through `compilerOptions.paths` and `baseUrl` of the nearest `tsconfig.json`, including what it `extends`. `architecture-boundaries`, `no-direct-construction-in-tests` and `no-nested-polling` now check imports such as `@pages/cart-page` or `sparta/ui/shop/pages/cart-page`, which were skipped before. `settings.sparta.aliases` is only needed for aliases that are not in your tsconfig.
