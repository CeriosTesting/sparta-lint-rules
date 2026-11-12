import path from "node:path";

import tsParser from "@typescript-eslint/parser";
import { RuleTester as EslintRuleTester } from "eslint";
import type { Rule as EslintRule } from "eslint";
import { RuleTester as OxlintRuleTester } from "oxlint/plugins-dev";

import type { SpartaSettings } from "../../src/utils/conventions";
import type { Rule } from "../../src/utils/types";

OxlintRuleTester.describe = describe;
OxlintRuleTester.it = it;

/** Absolute path of a file in a fake SPARTA project, so the path conventions apply as in a real project. */
export const file = (relative: string): string => path.join(process.cwd(), "fixture-project", relative);

const DEFAULT_FILENAME = file("src/example.ts");

interface ErrorEntry {
	messageId: string;
	data?: Record<string, string>;
}

interface ValidCase {
	code: string;
	filename?: string;
	name?: string;
	settings?: { sparta?: SpartaSettings };
}

interface InvalidCase extends ValidCase {
	errors: ErrorEntry[];
	/** Code after autofix; `null` asserts that no fix is applied. */
	output?: string | null;
}

export interface RuleCases {
	valid: (ValidCase | string)[];
	invalid: InvalidCase[];
}

const withFilename = <T extends ValidCase>(testCase: T | string): T =>
	typeof testCase === "string"
		? ({ code: testCase, filename: DEFAULT_FILENAME } as T)
		: { ...testCase, filename: testCase.filename ?? DEFAULT_FILENAME };

/** Runs the same cases through oxlint's and ESLint's RuleTester, so every rule is verified in both linters. */
export function runRule(name: string, rule: Rule, cases: RuleCases): void {
	const valid = cases.valid.map(withFilename);
	const invalid = cases.invalid.map(withFilename);

	describe("oxlint", () => {
		new OxlintRuleTester().run(name, rule, { valid, invalid });
	});

	describe("eslint", () => {
		new EslintRuleTester({ languageOptions: { parser: tsParser, sourceType: "module" } }).run(
			name,
			rule as unknown as EslintRule.RuleModule,
			{ valid, invalid }
		);
	});
}
