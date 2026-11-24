import type { AllowWarnDeny, Oxlintrc } from "oxlint";

import type { SpartaOxlintConfig } from "./plugin-types";
import { type PLUGIN_NAME, type RuleName, recommendedRules } from "./rules";
import type { SpartaSettings } from "./utils/conventions";

/** The sparta rules take no options, so a severity or a one-element tuple. */
type SpartaOxlintRules = { [Name in RuleName as `${typeof PLUGIN_NAME}/${Name}`]?: AllowWarnDeny | [AllowWarnDeny] };

/**
 * Adds the sparta rule names and `settings.sparta` to oxlint's own config types, so `defineConfig()` autocompletes
 * them in `oxlint.config.ts` as soon as this entry is imported.
 */
declare module "oxlint" {
	interface DummyRuleMap extends SpartaOxlintRules {}

	interface OxlintConfig {
		settings?: NonNullable<Oxlintrc["settings"]> & { sparta?: SpartaSettings };
	}
}

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
