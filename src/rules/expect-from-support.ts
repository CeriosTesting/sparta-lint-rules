import type { Conventions } from "../utils/conventions";
import { docsUrl } from "../utils/docs";
import { conventionsFor, rootFor } from "../utils/settings";
import { projectPath, resolveImport } from "../utils/sparta-paths";
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
		const root = rootFor(context, conventions);

		if (!appliesTo(context.filename, conventions, root)) return {};

		/**
		 * The support module, a subpath of it, or a relative import into the support folder. Other aliases for that
		 * folder are reported, so the configured module name stays the one that is used.
		 */
		const isSupport = (source: string): boolean => {
			if (source === supportModule || source.startsWith(`${supportModule}/`)) return true;
			if (!source.startsWith(".")) return false;

			const resolved = resolveImport(context.filename, source, root, conventions);
			const file = resolved === undefined ? undefined : projectPath(resolved, root);

			return file?.match(conventions.patterns.top)?.[1] === "support";
		};

		return {
			ImportDeclaration(node): void {
				const source = node.source.value;

				if (isSupport(String(source))) return;

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
