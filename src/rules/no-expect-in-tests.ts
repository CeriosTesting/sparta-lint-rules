import { docsUrl } from "../utils/docs";
import { conventionsFor, rootFor } from "../utils/settings";
import { classify } from "../utils/sparta-paths";
import type { AstNode, Rule } from "../utils/types";

/**
 * Names of `expect` and its extensions: `expect`, `expectly`, `expectlyLocator`, `expectApi`, `expect_soft`.
 * `expected`, `expecting` and the like are left alone. `settings.sparta.expectNames` adds exact names.
 */
const EXPECT_NAME = /^expect(?:ly)?(?:[A-Z_$\d]|$)/;

const rule: Rule = {
	meta: {
		type: "problem",
		docs: {
			description: "Disallow `expect` in test files; checks belong in steppers and asserters.",
			url: docsUrl("no-expect-in-tests"),
		},
		schema: [],
		messages: {
			noExpect:
				"Do not use expect in a test file. Put checkpoints in a stepper and technical or functional checks in an asserter.",
		},
	},

	create(context) {
		const conventions = conventionsFor(context);

		if (classify(context.filename, conventions, rootFor(context, conventions))?.kind !== "test") return {};

		const isExpectName = (name: string): boolean => EXPECT_NAME.test(name) || conventions.expectNames.has(name);

		/** Local names bound to an expect through a renamed import, such as `import { expect as check }`. */
		const aliases = new Set<string>();

		const isExpect = (node: AstNode): boolean =>
			node.type === "Identifier" && (isExpectName(node.name) || aliases.has(node.name));

		return {
			ImportSpecifier(node): void {
				const { imported, local } = node;
				const importedName = imported.type === "Identifier" ? imported.name : String(imported.value);

				if (!isExpectName(importedName) && !isExpectName(local.name)) return;

				aliases.add(local.name);
				context.report({ node, messageId: "noExpect" });
			},

			CallExpression(node): void {
				let callee: AstNode = node.callee;

				// `expect.soft(...)`, `expect.poll(...)`, `expectly.locator.x(...)`: check the root of the member chain.
				while (callee.type === "MemberExpression") callee = callee.object;

				if (isExpect(callee)) context.report({ node: node.callee, messageId: "noExpect" });
			},
		};
	},
};

export default rule;
