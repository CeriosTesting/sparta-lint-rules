# 🛡️ SPARTA Lint Rules | By Cerios

Lint rules for **SPARTA** (Simply Powerful Automated Regression Test Architecture). They keep the layers of a SPARTA test project in their place: what may import what, where polling and checks belong, how files and classes are named, and how `@step` decorators are used.

The rules are written once against the ESLint rule API, which [oxlint's JS plugins](https://oxc.rs/docs/guide/usage/linter/js-plugins) also implement. That gives you:

- **oxlint** (recommended): fast, and the linter used in SPARTA projects.
- **ESLint** 9+: the same rules for projects that can't use oxlint.

Every rule is tested in both linters.

---

## Installation

```sh
npm install --save-dev @cerios/sparta-lint-rules
```

Requires Node.js `^22.18.0 || >=24.11.0`, and oxlint `>=1.91.0` or ESLint `>=9`.

---

## Usage

### oxlint with `oxlint.config.ts`

Extend the recommended config:

```ts
import sparta from "@cerios/sparta-lint-rules/oxlint";
import { defineConfig } from "oxlint";

export default defineConfig({
	extends: [sparta],
	rules: {
		// override a rule if needed
		"sparta/padding-lines": "off",
	},
});
```

### oxlint with `.oxlintrc.json`

Register the plugin with `jsPlugins` and enable the rules you want:

```json
{
	"$schema": "./node_modules/@cerios/sparta-lint-rules/oxlintrc.schema.json",
	"jsPlugins": ["@cerios/sparta-lint-rules"],
	"rules": {
		"sparta/architecture-boundaries": "error",
		"sparta/class-matches-filename": "warn",
		"sparta/director-composes-builders": "warn",
		"sparta/expect-from-support": "error",
		"sparta/file-naming": "warn",
		"sparta/lines-between-class-members": "warn",
		"sparta/member-ordering": "warn",
		"sparta/no-direct-construction-in-tests": "error",
		"sparta/no-expect-in-tests": "error",
		"sparta/no-hard-waits": "error",
		"sparta/no-nested-polling": "error",
		"sparta/padding-lines": "warn",
		"sparta/step-placeholders": "error",
		"sparta/step-required": "warn"
	}
}
```

### ESLint (flat config)

```js
// eslint.config.mjs
import sparta from "@cerios/sparta-lint-rules";
import tsParser from "@typescript-eslint/parser";
import { defineConfig } from "eslint/config";

export default defineConfig({ files: ["**/*.ts"], languageOptions: { parser: tsParser } }, sparta.configs.recommended);
```

### Editor autocompletion

Your editor suggests the sparta rules and the [`settings.sparta`](#configuration) keys and values, and flags wrong values, while you write the config:

| Config file                 | Rule names | `settings.sparta` | How                                                                                       |
| --------------------------- | ---------- | ----------------- | ----------------------------------------------------------------------------------------- |
| `oxlint.config.ts`          | ✅         | ✅                | Works once you import `@cerios/sparta-lint-rules/oxlint` and use oxlint's `defineConfig`. |
| `.oxlintrc.json`            | ✅         | ✅                | Point `$schema` at `./node_modules/@cerios/sparta-lint-rules/oxlintrc.schema.json`.       |
| `eslint.config.(m)js / .ts` |            | ✅ (ESLint 10+)   | Works once you import the plugin and use `defineConfig` from `eslint/config`.             |

`oxlintrc.schema.json` extends oxlint's own `configuration_schema.json`, so oxlint's options keep their completion too. It expects `oxlint` in the same `node_modules` folder. Without `defineConfig`, annotate the ESLint config with `/** @type {import("eslint").Linter.Config[]} */`. ESLint 9 types `settings` as a plain record that a plugin can't extend; there, add `satisfies SpartaSettings` (from `@cerios/sparta-lint-rules/settings`) to `settings.sparta` in a TypeScript config. ESLint has no way for a plugin to add rule names to its types without making every rules object in your project list them, so those aren't completed there.

#### Combining with other schemas

`$schema` takes a single schema. To also use another plugin's schema, or your own, add a schema to your project that combines them with `allOf`, and point `$schema` at it:

```json
{
	"$schema": "http://json-schema.org/draft-07/schema#",
	"allOf": [
		{ "$ref": "../node_modules/@cerios/sparta-lint-rules/oxlintrc.schema.json" },
		{ "$ref": "../node_modules/other-oxlint-plugin/oxlintrc.schema.json" }
	]
}
```

Each `$ref` is relative to the file it's written in. This example is `schemas/oxlintrc.json`, so `.oxlintrc.json` uses `"$schema": "./schemas/oxlintrc.json"`. A value must match every schema in `allOf`. This schema only describes the `sparta/*` rules and `settings.sparta`, so it accepts the rules and settings of other plugins.

---

## Project layout

The rules recognise files by their path, so they rely on the SPARTA folder conventions:

```text
<project>/
├── sparta/
│   ├── api/                      # area: api, database, ui, mobile or desktop
│   │   ├── common/               # shared within the area; may hold builders/ and directors/
│   │   ├── builders/             # *-builder.ts, test data builders shared by the area's groups
│   │   ├── directors/            # *-director.ts, compose several builders
│   │   └── <group>/              # e.g. orders
│   │       ├── clients/          # *-client.ts
│   │       ├── services/         # *-service.ts
│   │       ├── steppers/         # *-stepper.ts
│   │       ├── asserters/        # *-asserter.ts
│   │       ├── scenarios/        # *-scenario.ts
│   │       └── builders/         # *-builder.ts (and directors/), private to the group
│   ├── database/<group>/         # repositories/, services/, steppers/, asserters/, scenarios/, ...
│   ├── ui/<group>/               # pages/, components/, steppers/, asserters/, scenarios/
│   ├── mobile/<group>/           # like ui, with screens/ (*-screen.ts) in place of pages/
│   ├── desktop/<group>/          # like ui, with windows/ (*-window.ts) in place of pages/, for Windows apps
│   ├── scenarios/                # cross-area scenarios
│   ├── fixtures/                 # Playwright fixtures that wire everything up
│   ├── common/                   # shared, area-independent code; may hold builders/ and directors/
│   └── support/                  # expect with custom matchers, helpers
└── tests/                        # the tests themselves
    └── framework/                # framework tests; never checked
```

Imports through the `@sparta/*` and `@tests/*` path aliases are resolved to `<project>/sparta/` and `<project>/tests/`, and the `paths` and `baseUrl` of your `tsconfig.json` are followed as well (see [import resolution](#import-resolution)). Files elsewhere are not affected by the path-based rules.

---

## Configuration

Without configuration, the rules use the SPARTA names shown above. If your project uses other names, describe them in `settings.sparta`, a single block that all rules read.

**Settings describe your project; they never relax the rules.** A setting either:

- **maps your name onto a SPARTA concept**, so it gets all of that concept's checks: `areas: { web: "ui" }` makes `web/` follow every `ui` rule;
- **adds names to detect**, which only makes the rules stricter.

The standard names keep working next to yours. The layer rules, isolation and re-export checks themselves are not configurable. To switch a check off, use the linter itself (rule severity, `ignores`, overrides), where it stays visible.

| Setting          | Default                                              | What it does                                                                                                                                   | Used by                                                                                                                                              |
| ---------------- | ---------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------- |
| `root`           | nearest folder with a `package.json`                 | Project root: aliases resolve against it, and only paths below it are matched. A relative path resolves against the folder the linter runs in. | all path-based rules                                                                                                                                 |
| `folders`        | `{ sparta: "sparta", tests: "tests" }`               | Names of the two top-level folders. Replaces the defaults.                                                                                     | all path-based rules                                                                                                                                 |
| `areas`          | `api`, `database`, `desktop`, `mobile`, `ui`         | Extra area folders, each following a standard area: `{ web: "ui" }`. Each area folder is still isolated from the others.                       | all path-based rules                                                                                                                                 |
| `layers`         | `pages`, `steppers`, `services`, ...                 | Extra layer folders, each following a standard layer folder (its layer rules and file suffix): `{ "page-objects": "pages" }`.                  | `architecture-boundaries`, `file-naming`, `class-matches-filename`, `step-required`, `no-direct-construction-in-tests`, `director-composes-builders` |
| `aliases`        | `@sparta/*` → `sparta`, `@tests/*` → `tests`         | Extra path aliases pointing to `sparta` or `tests`: `{ "@app/*": "sparta" }`. Only needed when they are not in your tsconfig `paths`.          | `architecture-boundaries`, `no-nested-polling`, `no-direct-construction-in-tests`, `director-composes-builders`                                      |
| `supportModule`  | `@sparta/support`                                    | The module `expect` must come from. Replaces the default.                                                                                      | `expect-from-support`                                                                                                                                |
| `pollingMethods` | `toPass`, `toPassAndReturn`, `poll`, `pollAndReturn` | Extra retrying methods, called as `x.method(callback)` or `x(callback).method()`.                                                              | `no-nested-polling`                                                                                                                                  |
| `stepDecorators` | `step`                                               | Extra decorators that count as `@step`.                                                                                                        | `step-required`, `step-placeholders`                                                                                                                 |
| `expectNames`    | `expect`, `expectly…`                                | Extra assertion functions that tests must not call.                                                                                            | `no-expect-in-tests`                                                                                                                                 |

A mistake in the settings stops the lint run with a clear message, so a typo can't silently weaken the checks:

```text
[@cerios/sparta-lint-rules] settings.sparta.layers.page-objects: unknown layer folder "pagez"; did you mean "pages"?
```

A name can't turn one SPARTA concept into another, so `areas: { ui: "api" }`, `areas: { common: "ui" }` and `layers: { pages: "steppers" }` are rejected.

### oxlint with `oxlint.config.ts`

```ts
import sparta from "@cerios/sparta-lint-rules/oxlint";
import { defineConfig } from "oxlint";

export default defineConfig({
	extends: [sparta],
	settings: {
		sparta: {
			areas: { web: "ui" },
			layers: { "page-objects": "pages" },
			aliases: { "@app/*": "sparta" },
			supportModule: "@app/support",
		},
	},
});
```

### oxlint with `.oxlintrc.json`

```json
{
	"$schema": "./node_modules/@cerios/sparta-lint-rules/oxlintrc.schema.json",
	"jsPlugins": ["@cerios/sparta-lint-rules"],
	"settings": {
		"sparta": { "areas": { "web": "ui" } }
	}
}
```

### ESLint (flat config)

```js
export default defineConfig(
	// ...
	sparta.configs.recommended,
	{ settings: { sparta: { areas: { web: "ui" } } } }
);
```

### Project root

The project root is the nearest folder, from the linted file upwards, that contains a `package.json`. This works for a standalone project and for a package in a monorepo. If `sparta/` lives in a folder without its own `package.json`, for example `e2e/` in a monorepo, set `root`. In ESLint, an absolute path such as `` `${import.meta.dirname}/e2e` `` doesn't depend on where the linter runs.

Only the part of a file's path below the root is matched against the SPARTA folder names. A checkout inside a folder named `tests` or `sparta` therefore doesn't change how files are classified, and files outside the root aren't checked by the path-based rules.

### Import resolution

The rules that follow imports (`architecture-boundaries`, `no-direct-construction-in-tests`, `no-nested-polling`) resolve them as TypeScript does, in this order:

1. relative imports (`./`, `../`);
2. `compilerOptions.paths` of the nearest `tsconfig.json` above the linted file, including what it `extends` (local files and packages). Of several targets, the first that exists is used, so `"@pages/*": ["sparta/ui/shop/pages/*"]` is checked like the folder it points to;
3. the `@sparta/*` and `@tests/*` aliases and `settings.sparta.aliases`, against the [project root](#project-root);
4. `compilerOptions.baseUrl`, for imports such as `sparta/ui/shop/pages/cart-page`, only when that file exists, so packages are never mistaken for project files.

Package imports are not checked. A `tsconfig.json` that can't be read, or whose `extends` can't be found, stops the lint run with a message naming the file. Only `tsconfig.json` is looked up; project references are not followed.

---

## Rules

| Rule                                                                             | Description                                                                            | Recommended | Fix |
| -------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------- | ----------- | --- |
| [architecture-boundaries](docs/rules/architecture-boundaries.md)                 | Enforce the SPARTA layer and isolation boundaries between imports                      | error       |     |
| [class-matches-filename](docs/rules/class-matches-filename.md)                   | One class per layer file, named after the file                                         | warn        |     |
| [director-composes-builders](docs/rules/director-composes-builders.md)           | A director composes several builders; a single-builder director belongs on the builder | warn        |     |
| [expect-from-support](docs/rules/expect-from-support.md)                         | Import `expect` from the support module inside `sparta/`                               | error       | 🔧  |
| [file-naming](docs/rules/file-naming.md)                                         | Files in a layer folder are kebab-case and end with the layer suffix                   | warn        |     |
| [lines-between-class-members](docs/rules/lines-between-class-members.md)         | Blank line after multi-line methods; none between overloads                            | warn        | 🔧  |
| [member-ordering](docs/rules/member-ordering.md)                                 | Properties, constructor, methods; static first; public before private                  | warn        |     |
| [no-direct-construction-in-tests](docs/rules/no-direct-construction-in-tests.md) | No constructing layer classes (`new OrdersStepper()`) in tests; use fixtures           | error       |     |
| [no-expect-in-tests](docs/rules/no-expect-in-tests.md)                           | No `expect` in tests; checks belong in steppers and asserters                          | error       |     |
| [no-hard-waits](docs/rules/no-hard-waits.md)                                     | No `waitForTimeout` or `setTimeout` sleeps                                             | error       |     |
| [no-nested-polling](docs/rules/no-nested-polling.md)                             | No poll inside a poll callback, also through calls into other files                    | error       |     |
| [padding-lines](docs/rules/padding-lines.md)                                     | Blank lines after imports, around functions and object methods; none between overloads | warn        | 🔧  |
| [step-placeholders](docs/rules/step-placeholders.md)                             | Validate `@step` description placeholders against the method parameters                | error       | 🔧  |
| [step-required](docs/rules/step-required.md)                                     | Public methods of steppers, asserters and scenarios need `@step`                       | warn        |     |

`@step` refers to [`@cerios/playwright-step-decorator`](https://github.com/CeriosTesting/playwright-step-decorator).

---

## Development

```sh
npm install
npm run lint          # oxlint, type-aware
npm run typecheck
npm run format:check
npm test              # every rule in the oxlint and ESLint RuleTesters
npm run test:dist     # build, then lint a fixture project with the built package via oxlint and ESLint
```

A new rule needs a file in `src/rules/`, an entry in `src/rules/index.ts`, tests in `tests/rules/` and a page in `docs/rules/`. `tests/plugin.test.ts` checks that these exist. Add a changeset (`npm run changeset`) for every user-facing change.

---

## License

MIT, Ronald Veth - Cerios

---

## Links

- [NPM Package](https://www.npmjs.com/package/@cerios/sparta-lint-rules)
- [GitHub Repository](https://github.com/CeriosTesting/sparta-lint-rules)
