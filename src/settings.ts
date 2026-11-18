/**
 * Types for `settings.sparta`. Lint configs don't need them: importing the plugin (ESLint) or
 * `@cerios/sparta-lint-rules/oxlint` (oxlint) already types `settings.sparta` in `defineConfig()`.
 * Use them for settings you build outside the config:
 *
 * ```ts
 * import type { SpartaSettings } from "@cerios/sparta-lint-rules/settings";
 *
 * const sparta: SpartaSettings = { areas: { web: "ui" } };
 * ```
 */
export type { Area, LayerFolder, SpartaSettings, TopFolder } from "./utils/conventions";
