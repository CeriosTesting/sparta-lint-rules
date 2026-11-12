import { defineConfig } from "vitest/config";

/** Smoke tests against the built package in `dist`. Use `npm run test:dist`. */
export default defineConfig({
	test: {
		environment: "node",
		globals: true,
		include: ["tests-dist/**/*.test.ts"],
		globalSetup: ["tests-dist/setup.ts"],
		testTimeout: 30_000,
	},
});
