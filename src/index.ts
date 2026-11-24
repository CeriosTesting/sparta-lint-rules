import { version } from "../package.json";

import type { SpartaPlugin } from "./plugin-types";
import { PLUGIN_NAME, recommendedRules, rules } from "./rules";
import type { SpartaSettings } from "./utils/conventions";

/**
 * Adds `settings.sparta` to ESLint's config types, so `defineConfig()` from `eslint/config` autocompletes and checks
 * it as soon as the plugin is imported. Needs ESLint 10+: ESLint 9 types `settings` as a plain record.
 *
 * The rule names are deliberately not added: ESLint's `RulesConfig` can only take them as required properties, which
 * would make every `Linter.RulesRecord` value in a project list them all.
 */
declare module "@eslint/core" {
	interface SettingsConfig {
		sparta?: SpartaSettings;
	}
}

const plugin: SpartaPlugin = {
	meta: { name: PLUGIN_NAME, version },
	// The same rule objects run in both linters (both RuleTesters cover them), but oxlint and ESLint type the rule
	// context differently, so the oxlint-typed rules are exposed with ESLint's types for ESLint configs.
	rules: rules as unknown as SpartaPlugin["rules"],
	configs: {} as SpartaPlugin["configs"],
};

plugin.configs.recommended = {
	name: `${PLUGIN_NAME}/recommended`,
	plugins: { [PLUGIN_NAME]: plugin },
	rules: recommendedRules,
};

export default plugin;
