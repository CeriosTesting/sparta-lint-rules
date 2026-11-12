import type { Rule } from "../utils/types";

import architectureBoundaries from "./architecture-boundaries";
import classMatchesFilename from "./class-matches-filename";
import expectFromSupport from "./expect-from-support";
import fileNaming from "./file-naming";
import linesBetweenClassMembers from "./lines-between-class-members";
import noDirectConstructionInTests from "./no-direct-construction-in-tests";
import noExpectInTests from "./no-expect-in-tests";
import noHardWaits from "./no-hard-waits";
import noNestedPolling from "./no-nested-polling";
import paddingLines from "./padding-lines";
import privateMembersLast from "./private-members-last";
import stepPlaceholders from "./step-placeholders";
import stepRequired from "./step-required";

export const rules = {
	"architecture-boundaries": architectureBoundaries,
	"class-matches-filename": classMatchesFilename,
	"expect-from-support": expectFromSupport,
	"file-naming": fileNaming,
	"lines-between-class-members": linesBetweenClassMembers,
	"no-direct-construction-in-tests": noDirectConstructionInTests,
	"no-expect-in-tests": noExpectInTests,
	"no-hard-waits": noHardWaits,
	"no-nested-polling": noNestedPolling,
	"padding-lines": paddingLines,
	"private-members-last": privateMembersLast,
	"step-placeholders": stepPlaceholders,
	"step-required": stepRequired,
} satisfies Record<string, Rule>;

export type RuleName = keyof typeof rules;

export const PLUGIN_NAME = "sparta";

export type Severity = "error" | "warn";

/** Recommended severities: `problem` rules are errors, `suggestion` and `layout` rules are warnings. */
export const recommendedRules = Object.fromEntries(
	Object.entries(rules).map(([name, rule]) => [
		`${PLUGIN_NAME}/${name}`,
		rule.meta?.type === "problem" ? "error" : "warn",
	])
) as Record<`${typeof PLUGIN_NAME}/${RuleName}`, Severity>;
