import type { AstNode, NodeOfType } from "./types";

export const isIdentifier = (node: AstNode | null | undefined, name: string): boolean =>
	node?.type === "Identifier" && node.name === name;

/** The value of a string literal node, or `undefined` for any other node. */
export const stringValue = (node: AstNode | null | undefined): string | undefined =>
	node?.type === "Literal" && typeof node.value === "string" ? node.value : undefined;

/** True for `@step` and `@step("...")` decorators, or any of the given decorator `names`. */
export const isStepDecorator = (decorator: NodeOfType<"Decorator">, names: ReadonlySet<string>): boolean => {
	const { expression } = decorator;
	const callee = expression.type === "CallExpression" ? expression.callee : expression;

	return callee.type === "Identifier" && names.has(callee.name);
};
