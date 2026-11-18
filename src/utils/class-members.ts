import type { AstNode, NodeOfType } from "./types";

export type ClassMember = NodeOfType<"ClassBody">["body"][number];

export type Method = Extract<ClassMember, { type: "MethodDefinition" | "TSAbstractMethodDefinition" }>;

export const isMethod = (member: ClassMember): member is Method =>
	member.type === "MethodDefinition" || member.type === "TSAbstractMethodDefinition";

const FUNCTION_VALUES = new Set(["ArrowFunctionExpression", "FunctionExpression", "ClassExpression"]);

/**
 * A plain property declaration (`static readonly PATTERN = /.../;`, `private readonly date: Date;`, …).
 * A property holding a function or class is not plain: it is treated like a method.
 */
export const isPlainProperty = (member: ClassMember): boolean => {
	if (member.type === "TSIndexSignature") return true;
	if (
		member.type !== "PropertyDefinition" &&
		member.type !== "TSAbstractPropertyDefinition" &&
		member.type !== "AccessorProperty"
	) {
		return false;
	}

	return member.value === null || !FUNCTION_VALUES.has(member.value.type);
};

/** `private` or an ECMAScript `#private` name. */
export const isPrivate = (member: ClassMember): boolean =>
	("accessibility" in member && member.accessibility === "private") ||
	("key" in member && member.key.type === "PrivateIdentifier");

export const memberName = (member: ClassMember): string => {
	const key: AstNode | undefined = "key" in member ? member.key : undefined;

	if (key && "name" in key && typeof key.name === "string") return key.name;
	if (key && "value" in key && typeof key.value === "string") return key.value;

	return "<computed>";
};

type ClassNode = Extract<AstNode, { type: "ClassDeclaration" | "ClassExpression" }>;

/** A member that belongs to the class itself: `static` members, static blocks and a `private constructor`. */
const isStaticMember = (member: ClassMember): boolean =>
	member.type === "StaticBlock" ||
	("static" in member && member.static) ||
	(member.type === "MethodDefinition" && member.kind === "constructor" && member.accessibility === "private");

/** A static abstract class: `abstract`, with only static members, so it is used without ever being instantiated. */
export const isStaticClass = (node: ClassNode): boolean =>
	node.abstract === true && node.body.body.every(isStaticMember);

/** The classes declared at the top level of a program, including exported ones. */
export function topLevelClasses(program: NodeOfType<"Program">): ClassNode[] {
	const classes: ClassNode[] = [];

	for (const statement of program.body) {
		const declaration: AstNode | null =
			statement.type === "ExportNamedDeclaration" || statement.type === "ExportDefaultDeclaration"
				? statement.declaration
				: statement;

		if (declaration?.type === "ClassDeclaration") classes.push(declaration);
	}

	return classes;
}
