import type { Severity, rules } from "./rules";

/** ESLint flat config entry. Typed structurally so the package does not depend on ESLint's types. */
export interface SpartaFlatConfig {
	name: string;
	plugins: Record<string, SpartaPlugin>;
	rules: Record<string, Severity>;
}

export interface SpartaPlugin {
	meta: { name: string; version: string };
	rules: typeof rules;
	configs: { recommended: SpartaFlatConfig };
}

export interface SpartaOxlintConfig {
	jsPlugins: string[];
	rules: Record<string, Severity>;
}
