import sparta from "@cerios/sparta-lint-rules/oxlint";
import type { SpartaSettings } from "@cerios/sparta-lint-rules/settings";
import { defineConfig } from "oxlint";

export default defineConfig({
	extends: [sparta],
	settings: { sparta: { areas: { web: "ui" } } satisfies SpartaSettings },
});
