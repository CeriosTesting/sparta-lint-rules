import { docsUrl } from "../utils/docs";
import { conventionsFor, rootFor } from "../utils/settings";
import { classify, layerFolder, layerSuffix, resolveImport } from "../utils/sparta-paths";
import type { AstNode, Rule } from "../utils/types";

/** Names of SPARTA layer classes, for classes whose import does not tell their layer. */
const LAYER_CLASS =
	/(Stepper|Asserter|Scenario|Service|Client|Repository|Page|Screen|Window|Component|Builder|Director|Factory|Provider|Container|Database)$/;

/** The class a `new` expression constructs: `X` for `new X()`, `ns` and `X` for `new ns.X()`. */
const constructed = (callee: AstNode): { binding: string; name: string } | undefined => {
	if (callee.type === "Identifier") return { binding: callee.name, name: callee.name };

	if (
		callee.type === "MemberExpression" &&
		!callee.computed &&
		callee.object.type === "Identifier" &&
		callee.property.type === "Identifier"
	) {
		return { binding: callee.object.name, name: callee.property.name };
	}

	return undefined;
};

const rule: Rule = {
	meta: {
		type: "problem",
		docs: {
			description: "Disallow constructing SPARTA layer classes in tests; use the fixtures instead.",
			url: docsUrl("no-direct-construction-in-tests"),
		},
		schema: [],
		messages: {
			useFixture: "Do not construct '{{name}}' in a test; use it via the SPARTA fixtures.",
		},
	},

	create(context) {
		const conventions = conventionsFor(context);
		const root = rootFor(context, conventions);

		if (classify(context.filename, conventions, root)?.kind !== "test") return {};

		/** Local names of imports (named, default and namespace) to their module. */
		const imports = new Map<string, string>();

		/**
		 * Whether constructing `name` (bound to the local `binding`) creates a SPARTA layer object. An import decides by
		 * where it points: never for packages, always for layer folders. Otherwise the class name decides.
		 */
		const isLayerClass = (binding: string, name: string): boolean => {
			const source = imports.get(binding);

			if (source === undefined) return LAYER_CLASS.test(name);

			const resolved = resolveImport(context.filename, source, root, conventions);

			if (resolved === undefined) return false;

			const target = classify(resolved, conventions, root);

			return (
				target?.layer !== undefined ||
				target?.kind === "top-scenario" ||
				layerSuffix(layerFolder(resolved, conventions, root)) !== undefined ||
				LAYER_CLASS.test(name)
			);
		};

		return {
			ImportDeclaration(node): void {
				if (typeof node.source.value !== "string") return;

				for (const specifier of node.specifiers) imports.set(specifier.local.name, node.source.value);
			},

			NewExpression(node): void {
				const found = constructed(node.callee);

				if (found && isLayerClass(found.binding, found.name)) {
					context.report({
						node,
						messageId: "useFixture",
						data: { name: context.sourceCode.getText(node.callee) },
					});
				}
			},
		};
	},
};

export default rule;
