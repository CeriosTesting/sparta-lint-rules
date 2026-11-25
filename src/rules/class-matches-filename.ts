import path from "node:path";

import { docsUrl } from "../utils/docs";
import { conventionsFor, rootFor } from "../utils/settings";
import { isDeclarationFile, isLayerFile, layerFolder, layerSuffix, moduleName } from "../utils/sparta-paths";
import type { AstNode, NodeOfType, Rule } from "../utils/types";

type Statement = NodeOfType<"Program">["body"][number];

type ClassDeclaration = Extract<AstNode, { type: "ClassDeclaration" | "ClassExpression" }>;

/** What a top-level statement adds to a module without a class: types, functions, nothing (imports) or anything else. */
type Contents = "types" | "functions" | "nothing" | "other";

const FUNCTION_VALUES = new Set(["ArrowFunctionExpression", "FunctionExpression"]);

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

const CONTENTS_BY_TYPE: Partial<Record<AstNode["type"], Contents>> = {
	TSTypeAliasDeclaration: "types",
	TSInterfaceDeclaration: "types",
	TSModuleDeclaration: "types",
	FunctionDeclaration: "functions",
	TSDeclareFunction: "functions",
	FunctionExpression: "functions",
	ArrowFunctionExpression: "functions",
	ImportDeclaration: "nothing",
	TSImportEqualsDeclaration: "nothing",
	EmptyStatement: "nothing",
};

function contentsOf(node: AstNode): Contents {
	if ("declare" in node && node.declare === true) return "types";

	const contents = CONTENTS_BY_TYPE[node.type];

	if (contents !== undefined) return contents;

	switch (node.type) {
		case "VariableDeclaration":
			return node.declarations.every(({ init }) => init !== null && FUNCTION_VALUES.has(init.type))
				? "functions"
				: "other";
		case "ExportNamedDeclaration":
			if (node.declaration) return contentsOf(node.declaration);
			if (node.exportKind === "type") return "types";

			// `export { open }` exports local declarations, which are counted where they are declared.
			return node.source ? "other" : "nothing";
		case "ExportAllDeclaration":
			return node.exportKind === "type" ? "types" : "other";
		case "ExportDefaultDeclaration":
			return contentsOf(node.declaration);
		default:
			return "other";
	}
}

/** The message for a layer file without a class: one that says what the file holds instead, when that is clear. */
function missingMessage(program: NodeOfType<"Program">): "typesOnly" | "functionsOnly" | "missing" {
	const contents = new Set(program.body.map(contentsOf));

	if (contents.has("other")) return "missing";
	if (contents.has("functions")) return "functionsOnly";

	return contents.has("types") ? "typesOnly" : "missing";
}

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
			typesOnly:
				"'{{file}}' in '{{folder}}/' only declares types. A layer file holds one class named '{{expected}}'; move the types to models/ (or another folder outside the layers).",
			functionsOnly:
				"'{{file}}' in '{{folder}}/' only declares functions. A layer file holds one class named '{{expected}}'; make the functions methods of that class.",
		},
	},

	create(context) {
		const conventions = conventionsFor(context);
		const root = rootFor(context, conventions);
		const { filename } = context;

		if (isDeclarationFile(filename) || !isLayerFile(filename, conventions, root)) return {};

		const module = moduleName(filename);
		const expected = toPascalCase(module);
		const folder = layerFolder(filename, conventions, root);
		// Files in a layer folder must hold their class; fixtures and barrels (`index.ts`) may hold none.
		const requiresClass = module !== "index" && layerSuffix(folder) !== undefined;

		return {
			Program(program): void {
				const classes = program.body.map(classOf).filter((node): node is ClassDeclaration => node !== undefined);

				if (classes.length === 0 && requiresClass) {
					context.report({
						node: program,
						messageId: missingMessage(program),
						data: { expected, file: path.basename(filename), folder: folder?.name ?? "" },
					});

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
