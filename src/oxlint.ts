import type { SpartaOxlintConfig } from "./plugin-types";
import { recommendedRules } from "./rules";

/**
 * Recommended oxlint config, to extend from `oxlint.config.ts`:
 *
 * ```ts
 * import { defineConfig } from "oxlint";
 * import sparta from "@cerios/sparta-lint-rules/oxlint";
 *
 * export default defineConfig({ extends: [sparta] });
 * ```
 */
const config: SpartaOxlintConfig = {
	jsPlugins: ["@cerios/sparta-lint-rules"],
	rules: recommendedRules,
};

export default config;
