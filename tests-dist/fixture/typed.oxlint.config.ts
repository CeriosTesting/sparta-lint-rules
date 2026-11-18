// Type-checked by `npm run test:dist`: every `@ts-expect-error` must be needed, which proves the
// sparta rules and `settings.sparta` reach oxlint's `defineConfig()` types.
import sparta from "@cerios/sparta-lint-rules/oxlint";
import { defineConfig } from "oxlint";

export default defineConfig({
	extends: [sparta],
	settings: {
		sparta: {
			// @ts-expect-error -- not a SPARTA area
			areas: { web: "uii" },
			layers: { "page-objects": "pages" },
			aliases: { "@app/*": "sparta" },
		},
	},
	rules: {
		"sparta/padding-lines": "off",
		"sparta/no-hard-waits": ["error"],
		// @ts-expect-error -- the sparta rules take no options
		"sparta/step-required": ["error", {}],
	},
	overrides: [
		{
			files: ["tests/**"],
			// @ts-expect-error -- not a severity
			rules: { "sparta/no-expect-in-tests": "on" },
		},
	],
});
