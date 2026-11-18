---
"@cerios/sparta-lint-rules": patch
---

Fix the types of ESM imports. The ESM type declarations used `export =`, so `import sparta from "@cerios/sparta-lint-rules/oxlint"` in an `oxlint.config.ts` (or the plugin in a typed ESLint config) failed with "has no default export". `sparta.configs.recommended` is now also accepted by ESLint's `defineConfig` in TypeScript.
