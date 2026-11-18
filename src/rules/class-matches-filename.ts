import { docsUrl } from "../utils/docs";
import { conventionsFor, rootFor } from "../utils/settings";
import { isDeclarationFile, isLayerFile, layerFolder, layerSuffix, moduleName } from "../utils/sparta-paths";
import type { AstNode, NodeOfType, Rule } from "../utils/types";

type Statement = NodeOfType<"Program">["body"][number];

type ClassDeclaration = Extract<AstNode, { type: "ClassDeclaration" | "ClassExpression" }>;

const toPascalCase = (name: string): string =>
	name
		.split("-")
		.map(part => part.charAt(0).toUpperCase() + part.slice(1))
		.join("");

const classOf = (statement: Statement): ClassDeclaration | undefined => {
	const node: AstNode =
		(statement.type === "ExportNamedDeclaration" || statement.type === "ExportDefaultDeclaration") &&
		statement.declaration
			? statement.declaration
			: statement;

	return node.type === "ClassDeclaration" ? node : undefined;
};

const rule: Rule = {
	meta: {
		type: "suggestion",
		docs: {
			description: "Require a layer file to contain exactly one class, named after the file in PascalCase.",
			url: docsUrl("class-matches-filename"),
		},
		schema: [],
		messages: {
			name: "Class '{{found}}' must be named '{{expected}}' to match the file name.",
			single: "A layer file contains exactly one class; move '{{found}}' to its own file.",
			missing: "A layer file contains exactly one class; expected a class named '{{expected}}'.",
		},
	},

	create(context) {
		const conventions = conventionsFor(context);
		const root = rootFor(context, conventions);
		const { filename } = context;

		if (isDeclarationFile(filename) || !isLayerFile(filename, conventions, root)) return {};

		const module = moduleName(filename);
		const expected = toPascalCase(module);
		// Files in a layer folder must hold their class; fixtures and barrels (`index.ts`) may hold none.
		const requiresClass = module !== "index" && layerSuffix(layerFolder(filename, conventions, root)) !== undefined;

		return {
			Program(program): void {
				const classes = program.body.map(classOf).filter((node): node is ClassDeclaration => node !== undefined);

				if (classes.length === 0 && requiresClass) {
					context.report({ node: program, messageId: "missing", data: { expected } });

					return;
				}

				classes.forEach((node, index) => {
					const found = node.id?.name ?? "(anonymous)";

					if (index > 0) {
						context.report({ node: node.id ?? node, messageId: "single", data: { found } });
					} else if (found !== expected) {
						context.report({ node: node.id ?? node, messageId: "name", data: { found, expected } });
					}
				});
			},
		};
	},
};

export default rule;
