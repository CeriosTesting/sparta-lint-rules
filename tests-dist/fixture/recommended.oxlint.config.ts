import sparta from "@cerios/sparta-lint-rules/oxlint";
import { defineConfig } from "oxlint";

export default defineConfig({
	extends: [sparta],
	settings: { sparta: { areas: { web: "ui" } } },
});
