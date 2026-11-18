// Type-checked by `npm run test:dist`: every `@ts-expect-error` must be needed, which proves that
// `settings.sparta` reaches the types of ESLint's `defineConfig()`.
import sparta from "@cerios/sparta-lint-rules";
import { defineConfig } from "eslint/config";

export default defineConfig(sparta.configs.recommended, {
	settings: {
		sparta: {
			// @ts-expect-error -- not a SPARTA area
			areas: { web: "uii" },
			layers: { "page-objects": "pages" },
		},
	},
});
