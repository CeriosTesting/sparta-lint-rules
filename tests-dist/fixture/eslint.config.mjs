import sparta from "@cerios/sparta-lint-rules";
import tsParser from "@typescript-eslint/parser";

export default [
	{ files: ["**/*.ts"], languageOptions: { parser: tsParser } },
	sparta.configs.recommended,
	{ settings: { sparta: { areas: { web: "ui" } } } },
];
