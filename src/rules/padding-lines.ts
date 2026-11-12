import { docsUrl } from "../utils/docs";
import type { AstNode, NodeOfType, Rule } from "../utils/types";

type Statement = NodeOfType<"Program">["body"][number];

type ObjectMember = NodeOfType<"ObjectExpression">["properties"][number];

type MessageId = "afterImports" | "aroundFunctions" | "betweenObjectMethods";

const BLANK_LINE = /\r?\n[\t ]*\r?\n/;

const unwrapExport = (node: Statement): AstNode =>
	(node.type === "ExportNamedDeclaration" || node.type === "ExportDefaultDeclaration") && node.declaration
		? node.declaration
		: node;

const isFunctionValue = (node: AstNode | null | undefined): boolean =>
	node?.type === "ArrowFunctionExpression" ||
	node?.type === "FunctionExpression" ||
	node?.type === "TSEmptyBodyFunctionExpression";

const isImport = (node: Statement): boolean =>
	node.type === "ImportDeclaration" ||
	(node.type === "TSImportEqualsDeclaration" && node.moduleReference.type === "TSExternalModuleReference");

const isFunctionStatement = (node: Statement): boolean => {
	const statement = unwrapExport(node);

	if (
		statement.type === "FunctionDeclaration" ||
		statement.type === "TSDeclareFunction" ||
		isFunctionValue(statement)
	) {
		return true;
	}

	return statement.type === "VariableDeclaration" && statement.declarations.some(({ init }) => isFunctionValue(init));
};

const functionStatementName = (node: Statement): string | undefined => {
	const statement = unwrapExport(node);

	return (statement.type === "FunctionDeclaration" || statement.type === "TSDeclareFunction") && statement.id
		? statement.id.name
		: undefined;
};

const isOverloadPair = (previous: Statement, current: Statement): boolean => {
	const name = functionStatementName(previous);

	return (
		unwrapExport(previous).type === "TSDeclareFunction" && name !== undefined && name === functionStatementName(current)
	);
};

const isMethodProperty = (property: ObjectMember): boolean =>
	property.type === "Property" && (property.method || property.kind !== "init" || isFunctionValue(property.value));

const rule: Rule = {
	meta: {
		type: "layout",
		docs: {
			description: "Require blank lines after imports, around top-level functions and around object methods.",
			url: docsUrl("padding-lines"),
		},
		fixable: "whitespace",
		schema: [],
		messages: {
			afterImports: "Expected a blank line after the import declarations.",
			aroundFunctions: "Expected a blank line between a function and the adjacent statement.",
			betweenObjectMethods: "Expected a blank line around methods in an object literal.",
		},
	},

	create(context) {
		const { text } = context.sourceCode;
		const lineBreak = text.includes("\r\n") ? "\r\n" : "\n";

		const requireBlankLine = (previous: AstNode, current: AstNode, messageId: MessageId): void => {
			const textBetween = text.slice(previous.range[1], current.range[0]);

			if (BLANK_LINE.test(textBetween)) return;

			context.report({
				node: current,
				messageId,

				fix: fixer => {
					const firstBreak = textBetween.search(/\r?\n/);

					if (firstBreak === -1) {
						return fixer.insertTextAfterRange(previous.range, `${lineBreak}${lineBreak}`);
					}

					return fixer.insertTextAfterRange([0, previous.range[1] + firstBreak], lineBreak);
				},
			});
		};

		const checkStatements = (statements: readonly Statement[]): void => {
			for (let index = 1; index < statements.length; index++) {
				const previous = statements[index - 1];
				const current = statements[index];

				if (isImport(previous) && !isImport(current)) {
					requireBlankLine(previous, current, "afterImports");
				} else if (
					(isFunctionStatement(previous) || isFunctionStatement(current)) &&
					!isOverloadPair(previous, current)
				) {
					requireBlankLine(previous, current, "aroundFunctions");
				}
			}
		};

		return {
			Program: node => checkStatements(node.body),

			TSModuleBlock: node => checkStatements(node.body),

			ObjectExpression(node): void {
				for (let index = 1; index < node.properties.length; index++) {
					const previous = node.properties[index - 1];
					const current = node.properties[index];

					if (previous.loc.end.line === current.loc.start.line) continue;

					if (isMethodProperty(previous) || isMethodProperty(current)) {
						requireBlankLine(previous, current, "betweenObjectMethods");
					}
				}
			},
		};
	},
};

export default rule;
