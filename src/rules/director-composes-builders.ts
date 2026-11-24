import { staticString } from "../utils/ast";
import { docsUrl } from "../utils/docs";
import { conventionsFor, rootFor } from "../utils/settings";
import { classify, moduleName, resolveImport } from "../utils/sparta-paths";
import type { AstNode, Rule } from "../utils/types";

const rule: Rule = {
	meta: {
		type: "suggestion",
		docs: {
			description:
				"Require a director to compose several builders; a director using a single builder belongs on that builder.",
			url: docsUrl("director-composes-builders"),
		},
		schema: [],
		messages: {
			singleBuilder:
				"This director only uses '{{builder}}'; make it a custom method on '{{builder}}'. A director composes several builders.",
		},
	},

	create(context) {
		const filename = context.filename;
		const conventions = conventionsFor(context);
		const root = rootFor(context, conventions);
		const source = classify(filename, conventions, root);

		if (source?.layer !== "director" || moduleName(filename) === "index") return {};

		const isBuilder = (request: string | undefined): boolean => {
			if (request === undefined) return false;

			const resolved = resolveImport(filename, request, root, conventions);

			return resolved !== undefined && classify(resolved, conventions, root)?.layer === "builder";
		};

		/** The builders the director uses, by imported name, with the import to report. */
		const builders = new Map<string, { local: string; node: AstNode }>();

		/** Set when a builder is imported in a way that does not tell how many builders are used. */
		let unknown = false;

		return {
			ImportDeclaration(node): void {
				if (node.importKind === "type" || typeof node.source.value !== "string" || !isBuilder(node.source.value)) {
					return;
				}

				for (const specifier of node.specifiers) {
					if (specifier.type === "ImportNamespaceSpecifier") {
						unknown = true;
					} else if (specifier.type === "ImportDefaultSpecifier") {
						builders.set(specifier.local.name, { local: specifier.local.name, node });
					} else if (specifier.importKind !== "type") {
						const imported =
							specifier.imported.type === "Identifier" ? specifier.imported.name : String(specifier.imported.value);

						builders.set(imported, { local: specifier.local.name, node });
					}
				}
			},

			ImportExpression(node): void {
				if (isBuilder(staticString(node.source))) unknown = true;
			},

			CallExpression(node): void {
				if (node.callee.type === "Identifier" && node.callee.name === "require") {
					if (isBuilder(staticString(node.arguments[0]))) unknown = true;
				}
			},

			"Program:exit"(): void {
				const [only] = builders.values();

				if (unknown || builders.size !== 1 || only === undefined) return;

				context.report({ node: only.node, messageId: "singleBuilder", data: { builder: only.local } });
			},
		};
	},
};

export default rule;
