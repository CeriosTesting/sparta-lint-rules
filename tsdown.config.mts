import { defineConfig } from "tsdown";

export default defineConfig({
	entry: ["src/index.ts", "src/oxlint.ts", "src/settings.ts"],
	format: {
		// `export =` in the CJS declarations matches `module.exports = plugin`. The ESM declarations keep
		// `export default`: `export =` is invalid in a `.d.mts` and would hide the types from ESM configs.
		cjs: { dts: { cjsDefault: true } },
		esm: { dts: { cjsDefault: false } },
	},
	// ESLint's types are CommonJS, so they read the CommonJS copy of `@eslint/core`'s types. The `settings.sparta`
	// augmentation only reaches that copy from a `.d.cts`, so the ESM declarations pull in the CommonJS ones.
	banner: ({ fileName }) =>
		fileName === "index.d.mts" ? { dts: '/// <reference path="./index.d.cts" />' } : undefined,
	sourcemap: true,
	clean: true,
	outDir: "dist",
});
