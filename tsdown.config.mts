import { defineConfig } from "tsdown";

export default defineConfig({
	entry: ["src/index.ts", "src/oxlint.ts", "src/settings.ts"],
	format: ["cjs", "esm"],
	dts: { cjsDefault: true },
	sourcemap: true,
	clean: true,
	outDir: "dist",
});
