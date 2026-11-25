import { importedName, staticString } from "../utils/ast";
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

		/** The layer an import resolves to, if it resolves into a layer folder. */
		const layerOf = (request: string | undefined): string | undefined => {
			if (request === undefined) return undefined;

			const resolved = resolveImport(filename, request, root, conventions);

			return resolved === undefined ? undefined : classify(resolved, conventions, root)?.layer;
		};

		/** The builders the director uses, by imported name, with the import to report. */
		const builders = new Map<string, { local: string; node: AstNode }>();

		/** Set when a builder is imported in a way that does not tell how many builders are used. */
		let unknown = false;

		/**
		 * Set when the director also uses another director. Moving its code onto the single builder would then make
		 * that builder use a director, so the advice can't be followed; `architecture-boundaries` reports the import.
		 */
		let usesDirector = false;

		/** Notes a dynamic import or `require`, which does not tell which builders or directors it uses. */
		const dynamicImport = (request: string | undefined): void => {
			const layer = layerOf(request);

			if (layer === "builder") unknown = true;
			if (layer === "director") usesDirector = true;
		};

		return {
			ImportDeclaration(node): void {
				const layer = typeof node.source.value === "string" ? layerOf(node.source.value) : undefined;

				if (layer === "director") usesDirector = true;
				if (node.importKind === "type" || layer !== "builder") return;

				for (const specifier of node.specifiers) {
					if (specifier.type === "ImportNamespaceSpecifier") {
						unknown = true;
					} else if (specifier.type === "ImportDefaultSpecifier") {
						builders.set(specifier.local.name, { local: specifier.local.name, node });
					} else if (specifier.importKind !== "type") {
						builders.set(importedName(specifier), { local: specifier.local.name, node });
					}
				}
			},

			ImportExpression(node): void {
				dynamicImport(staticString(node.source));
			},

			CallExpression(node): void {
				if (node.callee.type === "Identifier" && node.callee.name === "require") {
					dynamicImport(staticString(node.arguments[0]));
				}
			},

			"Program:exit"(): void {
				const [only] = builders.values();

				if (unknown || usesDirector || builders.size !== 1 || only === undefined) return;

				context.report({ node: only.node, messageId: "singleBuilder", data: { builder: only.local } });
			},
		};
	},
};

export default rule;
