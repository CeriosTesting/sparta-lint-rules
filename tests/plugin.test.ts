import { existsSync, readdirSync } from "node:fs";
import path from "node:path";

import plugin from "../src/index";
import oxlintConfig from "../src/oxlint";

const ruleNames = Object.keys(plugin.rules);

const ruleFiles = readdirSync(path.join(__dirname, "../src/rules"))
	.filter(name => name !== "index.ts")
	.map(name => name.replace(/\.ts$/, ""));

describe("plugin", () => {
	it("is named 'sparta' and exposes every rule file", () => {
		expect(plugin.meta.name).toBe("sparta");
		expect(ruleNames.toSorted()).toEqual(ruleFiles.toSorted());
	});

	it.each(ruleNames)("%s has docs, a description and an empty schema", name => {
		const { meta } = plugin.rules[name as keyof typeof plugin.rules];

		expect(meta?.docs?.description).toBeTruthy();
		expect(meta?.docs?.url).toBe(`https://github.com/CeriosTesting/sparta-lint-rules/blob/main/docs/rules/${name}.md`);
		expect(meta?.schema).toEqual([]);
		expect(existsSync(path.join(__dirname, "../docs/rules", `${name}.md`))).toBe(true);
	});

	it("recommended ESLint config enables every rule and registers the plugin", () => {
		const { recommended } = plugin.configs;

		expect(recommended.plugins.sparta).toBe(plugin);
		expect(Object.keys(recommended.rules).toSorted()).toEqual(ruleNames.map(name => `sparta/${name}`).toSorted());
	});

	it("recommended oxlint config matches the ESLint config", () => {
		expect(oxlintConfig.jsPlugins).toEqual(["@cerios/sparta-lint-rules"]);
		expect(oxlintConfig.rules).toEqual(plugin.configs.recommended.rules);
	});

	it("problem rules are errors, other rules are warnings", () => {
		for (const name of ruleNames) {
			const type = plugin.rules[name as keyof typeof plugin.rules].meta?.type;

			expect(plugin.configs.recommended.rules[`sparta/${name}`]).toBe(type === "problem" ? "error" : "warn");
		}
	});
});
