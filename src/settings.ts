/**
 * Types for `settings.sparta`, to type-check a lint config:
 *
 * ```ts
 * import type { SpartaSettings } from "@cerios/sparta-lint-rules/settings";
 *
 * settings: { sparta: { areas: { web: "ui" } } satisfies SpartaSettings }
 * ```
 */
export type { Area, LayerFolder, SpartaSettings, TopFolder } from "./utils/conventions";
