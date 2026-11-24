/**
 * Types for `settings.sparta`. Most lint configs don't need them: importing `@cerios/sparta-lint-rules/oxlint`
 * (oxlint) or the plugin (ESLint 10+) already types `settings.sparta` in `defineConfig()`. Use them on ESLint 9,
 * or for settings you build outside the config:
 *
 * ```ts
 * import type { SpartaSettings } from "@cerios/sparta-lint-rules/settings";
 *
 * settings: { sparta: { areas: { web: "ui" } } satisfies SpartaSettings }
 * ```
 */
export type { Area, LayerFolder, SpartaSettings, TopFolder } from "./utils/conventions";
