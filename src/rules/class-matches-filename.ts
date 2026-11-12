import path from "node:path";

import { docsUrl } from "../utils/docs";
import { conventionsFor, rootFor } from "../utils/settings";
import { isLayerFile } from "../utils/sparta-paths";
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
		},
	},

	create(context) {
		const conventions = conventionsFor(context);

		if (!isLayerFile(context.filename, conventions, rootFor(context, conventions))) return {};

		const expected = toPascalCase(path.basename(context.filename).replace(/\.ts$/, ""));

		return {
			Program(program): void {
				const classes = program.body.map(classOf).filter((node): node is ClassDeclaration => node !== undefined);

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
