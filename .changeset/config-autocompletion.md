---
"@cerios/sparta-lint-rules": minor
---

Autocompletion in lint configs. Your editor now suggests the sparta rules and the `settings.sparta` keys and values, and flags wrong values:

- `oxlint.config.ts`: rule names and `settings.sparta`, once you import `@cerios/sparta-lint-rules/oxlint` and use oxlint's `defineConfig`. `satisfies SpartaSettings` is no longer needed.
- `.oxlintrc.json`: rule names and `settings.sparta`, with `"$schema": "./node_modules/@cerios/sparta-lint-rules/oxlintrc.schema.json"`. The schema extends oxlint's own, so oxlint's options keep their completion.
- ESLint flat config (ESLint 10+): `settings.sparta`, once you import the plugin and use `defineConfig` from `eslint/config`. ESLint 9 types `settings` as a plain record, so keep `satisfies SpartaSettings` there.
