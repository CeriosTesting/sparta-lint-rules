import type { RuleDefinition } from "@eslint/core";

import type { RuleName, Severity } from "./rules";

/** ESLint flat config entry. Typed structurally so it fits ESLint's `defineConfig()`. */
export interface SpartaFlatConfig {
	name: string;
	plugins: Record<string, SpartaPlugin>;
	rules: Record<string, Severity>;
}

export interface SpartaPlugin {
	meta: { name: string; version: string };
	/** Typed as ESLint rules for ESLint configs; oxlint loads the plugin by name and doesn't read these types. */
	rules: Record<RuleName, RuleDefinition>;
	configs: { recommended: SpartaFlatConfig };
}

export interface SpartaOxlintConfig {
	jsPlugins: string[];
	rules: Record<string, Severity>;
}
