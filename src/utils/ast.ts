import type { AstNode, NodeOfType } from "./types";

export const isIdentifier = (node: AstNode | null | undefined, name: string): boolean =>
	node?.type === "Identifier" && node.name === name;

/** The value of a string literal node, or `undefined` for any other node. */
export const stringValue = (node: AstNode | null | undefined): string | undefined =>
	node?.type === "Literal" && typeof node.value === "string" ? node.value : undefined;

/** The value of a string literal or a template literal without expressions (`\`./x\``), or `undefined`. */
export const staticString = (node: AstNode | null | undefined): string | undefined =>
	node?.type === "TemplateLiteral" && node.expressions.length === 0
		? (node.quasis[0]?.value.cooked ?? undefined)
		: stringValue(node);

/** True for `@step` and `@step("...")` decorators, or any of the given decorator `names`. */
export const isStepDecorator = (decorator: NodeOfType<"Decorator">, names: ReadonlySet<string>): boolean => {
	const { expression } = decorator;
	const callee = expression.type === "CallExpression" ? expression.callee : expression;

	return callee.type === "Identifier" && names.has(callee.name);
};

/** Whether `value` is an AST node. */
export const isNode = (value: unknown): value is AstNode =>
	typeof value === "object" && value !== null && typeof (value as { type?: unknown }).type === "string";

const NON_CHILD_KEYS = new Set(["parent", "loc", "range", "start", "end"]);

/** Whether `node` or any node below it, type annotations included, matches `predicate`. */
export function someDescendant(node: AstNode, predicate: (node: AstNode) => boolean): boolean {
	if (predicate(node)) return true;

	for (const [key, value] of Object.entries(node)) {
		if (NON_CHILD_KEYS.has(key)) continue;

		const children: unknown[] = Array.isArray(value) ? value : [value];

		if (children.some(child => isNode(child) && someDescendant(child, predicate))) return true;
	}

	return false;
}

/** The name a specifier imports: `a` in `import { a as b }` and in `import { "a" as b }`. */
export const importedName = (specifier: NodeOfType<"ImportSpecifier">): string =>
	specifier.imported.type === "Identifier" ? specifier.imported.name : String(specifier.imported.value);
