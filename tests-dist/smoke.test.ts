import { execFileSync } from "node:child_process";
import { createRequire } from "node:module";
import path from "node:path";
import { pathToFileURL } from "node:url";

import { ESLint } from "eslint";

const ROOT = path.resolve(__dirname, "..");
const FIXTURE = path.join(__dirname, "fixture");
const OXLINT_BIN = path.join(ROOT, "node_modules/oxlint/bin/oxlint");

const EXPECTED = [
	"sparta/architecture-boundaries sparta/api/orders/steppers/orders-stepper.ts",
	"sparta/no-expect-in-tests tests/orders.spec.ts",
	"sparta/no-expect-in-tests tests/orders.spec.ts",
	"sparta/no-hard-waits tests/orders.spec.ts",
	"sparta/no-nested-polling sparta/api/orders/services/orders-service.ts",
	"sparta/step-required sparta/api/orders/steppers/orders-stepper.ts",
	// Only classified through `settings.sparta.areas`, so this proves the settings reach the rules.
	"sparta/architecture-boundaries sparta/web/shop/pages/cart-page.ts",
].toSorted();

interface OxlintDiagnostic {
	code: string;
	filename: string;
}

/** Runs the oxlint CLI in the fixture project and returns `rule file` pairs for the sparta diagnostics. */
function runOxlint(...args: string[]): string[] {
	let output: string;

	try {
		output = execFileSync(process.execPath, [OXLINT_BIN, "--format", "json", ...args, "."], {
			cwd: FIXTURE,
			encoding: "utf8",
		});
	} catch (error) {
		// oxlint exits with 1 when it reports errors; the JSON report is still on stdout.
		output = (error as { stdout: string }).stdout;
	}

	const { diagnostics } = JSON.parse(output) as { diagnostics: OxlintDiagnostic[] };

	return diagnostics
		.filter(diagnostic => diagnostic.code.startsWith("sparta("))
		.map(diagnostic => `${diagnostic.code.replace(/^sparta\((.+)\)$/, "sparta/$1")} ${diagnostic.filename}`)
		.toSorted();
}

describe("built package", () => {
	const fixtureRequire = createRequire(path.join(FIXTURE, "package.json"));

	it("loads the same plugin from CommonJS and ESM", async () => {
		type Plugin = { meta: { name: string }; rules: object; configs: { recommended: { rules: object } } };

		const cjs = fixtureRequire("@cerios/sparta-lint-rules") as Plugin;
		const esm = ((await import(pathToFileURL(path.join(ROOT, "dist/index.mjs")).href)) as { default: Plugin }).default;

		expect(cjs.meta.name).toBe("sparta");
		expect(Object.keys(cjs.rules)).toHaveLength(13);
		expect(esm.meta).toEqual(cjs.meta);
		expect(Object.keys(esm.rules)).toEqual(Object.keys(cjs.rules));
		expect(esm.configs.recommended.rules).toEqual(cjs.configs.recommended.rules);
	});

	it("loads the oxlint config from CommonJS", () => {
		const config = fixtureRequire("@cerios/sparta-lint-rules/oxlint") as { jsPlugins: string[] };

		expect(config.jsPlugins).toEqual(["@cerios/sparta-lint-rules"]);
	});

	it("reports through oxlint with an oxlint.config.ts extending the recommended config", () => {
		expect(runOxlint("-c", "recommended.oxlint.config.ts")).toEqual(EXPECTED);
	});

	it("reports through oxlint with a JSON config listing jsPlugins", () => {
		expect(runOxlint("-c", "jsplugins.oxlintrc.json")).toEqual(
			[
				"sparta/architecture-boundaries sparta/api/orders/steppers/orders-stepper.ts",
				"sparta/no-hard-waits tests/orders.spec.ts",
				"sparta/no-nested-polling sparta/api/orders/services/orders-service.ts",
				"sparta/architecture-boundaries sparta/web/shop/pages/cart-page.ts",
			].toSorted()
		);
	});

	it("reports through ESLint with the recommended flat config", async () => {
		const eslint = new ESLint({ cwd: FIXTURE });
		const results = await eslint.lintFiles(["**/*.ts"]);
		const found = results
			.flatMap(result =>
				result.messages.map(
					message => `${message.ruleId} ${path.relative(FIXTURE, result.filePath).split(path.sep).join("/")}`
				)
			)
			.filter(entry => entry.startsWith("sparta/"))
			.toSorted();

		expect(found).toEqual(EXPECTED);
	});
});
