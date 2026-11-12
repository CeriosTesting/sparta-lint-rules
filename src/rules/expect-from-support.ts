import type { Conventions } from "../utils/conventions";
import { docsUrl } from "../utils/docs";
import { conventionsFor, rootFor } from "../utils/settings";
import { projectPath } from "../utils/sparta-paths";
import type { Rule } from "../utils/types";

/** Files inside the sparta folder, except its support folder (where `expect` itself is defined). */
const appliesTo = (filename: string, { patterns }: Conventions, root: string): boolean => {
	const file = projectPath(filename, root);

	return file !== undefined && patterns.sparta.test(file) && file.match(patterns.top)?.[1] !== "support";
};

const rule: Rule = {
	meta: {
		type: "problem",
		docs: {
			description: "Require `expect` to be imported from the support module (`@sparta/support`) inside sparta/.",
			url: docsUrl("expect-from-support"),
		},
		fixable: "code",
		schema: [],
		messages: {
			expectFromSupport: "Import expect from '{{module}}' instead of '{{source}}'.",
		},
	},

	create(context) {
		const conventions = conventionsFor(context);
		const { supportModule } = conventions;

		if (!appliesTo(context.filename, conventions, rootFor(context, conventions))) return {};

		return {
			ImportDeclaration(node): void {
				const source = node.source.value;

				if (source === supportModule) return;

				const specifier = node.specifiers.find(
					item =>
						item.type === "ImportSpecifier" && item.imported.type === "Identifier" && item.imported.name === "expect"
				);

				if (specifier === undefined) return;

				const data = { source: String(source), module: supportModule };

				if (node.specifiers.length !== 1) {
					context.report({ node: specifier, messageId: "expectFromSupport", data });

					return;
				}

				context.report({
					node: specifier,
					messageId: "expectFromSupport",
					data,

					fix: fixer => fixer.replaceText(node.source, JSON.stringify(supportModule)),
				});
			},
		};
	},
};

export default rule;
