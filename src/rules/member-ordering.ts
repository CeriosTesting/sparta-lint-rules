import { isNode } from "../utils/ast";
import { type ClassMember, isMethod, isPlainProperty, isPrivate, memberName } from "../utils/class-members";
import { docsUrl } from "../utils/docs";
import type { AstNode, Rule } from "../utils/types";

type Kind = "property" | "constructor" | "method";
type Access = "public" | "protected" | "private";

const KINDS: readonly Kind[] = ["property", "constructor", "method"];
const ACCESSES: readonly Access[] = ["public", "protected", "private"];

interface Group {
	rank: number;
	label: string;
}

/** Properties (incl. index signatures) and methods; a property holding a function or class counts as a method. */
const kindOf = (member: ClassMember): Kind | undefined => {
	if (isMethod(member)) return member.kind === "constructor" ? "constructor" : "method";
	if (member.type === "StaticBlock") return undefined;

	return isPlainProperty(member) ? "property" : "method";
};

const accessOf = (member: ClassMember): Access => {
	if (isPrivate(member)) return "private";
	if ("accessibility" in member && member.accessibility === "protected") return "protected";

	return "public";
};

/**
 * The required order: static properties, instance properties, constructor, static methods, instance methods,
 * each from public to protected to private.
 */
const groupOf = (member: ClassMember): Group | undefined => {
	const kind = kindOf(member);

	if (kind === undefined) return undefined;
	if (kind === "constructor") return { rank: KINDS.indexOf(kind) * 6, label: "constructor" };

	const isStatic = "static" in member && member.static;
	const access = accessOf(member);

	return {
		rank: KINDS.indexOf(kind) * 6 + (isStatic ? 0 : 3) + ACCESSES.indexOf(access),
		label: `${isStatic ? "static " : ""}${access} ${kind}`,
	};
};

const SKIPPED_KEYS = new Set(["parent", "loc", "range", "start", "end", "typeAnnotation"]);

const FUNCTIONS = new Set(["ArrowFunctionExpression", "FunctionExpression", "ClassExpression"]);

/** `x` for `this.x`, `this.#x` and `ClassName.x`. */
const ownPropertyRead = (node: AstNode, className: string | undefined): string | undefined => {
	if (node.type !== "MemberExpression" || node.computed) return undefined;

	const { object, property } = node;
	const isOwn =
		object.type === "ThisExpression" ||
		(className !== undefined && object.type === "Identifier" && object.name === className);

	return isOwn && (property.type === "Identifier" || property.type === "PrivateIdentifier") ? property.name : undefined;
};

/**
 * The property names an initializer reads while it runs, as `this.x`, `this.#x` or `ClassName.x`. Code inside
 * functions is left out: it runs later, when every property is initialized.
 */
function readsDuringInit(value: AstNode, className: string | undefined): Set<string> {
	const names = new Set<string>();

	const visit = (node: AstNode): void => {
		if (FUNCTIONS.has(node.type)) return;

		const read = ownPropertyRead(node, className);

		if (read !== undefined) names.add(read);

		for (const [key, child] of Object.entries(node)) {
			if (SKIPPED_KEYS.has(key)) continue;

			if (Array.isArray(child)) {
				for (const item of child) if (isNode(item)) visit(item);
			} else if (isNode(child)) {
				visit(child);
			}
		}
	};

	visit(value);

	return names;
}

/**
 * Initializers run in source order, so a property that reads a property declared before it must stay below it,
 * even when the order of the groups says otherwise.
 */
const dependsOnEarlier = (
	member: ClassMember,
	earlier: ReadonlySet<string>,
	className: string | undefined
): boolean => {
	if (member.type !== "PropertyDefinition" && member.type !== "AccessorProperty") return false;
	if (!member.value) return false;

	return [...readsDuringInit(member.value, className)].some(name => earlier.has(name));
};

const rule: Rule = {
	meta: {
		type: "suggestion",
		docs: {
			description:
				"Require class members in a fixed order: properties, constructor, methods; static before instance; public before protected before private.",
			url: docsUrl("member-ordering"),
		},
		schema: [],
		messages: {
			memberOrdering: "'{{name}}' ({{group}}) must come before '{{otherName}}' ({{otherGroup}}).",
		},
	},

	create(context) {
		return {
			ClassBody(node): void {
				let highest: { member: ClassMember; group: Group } | undefined;
				const { parent } = node;
				const className =
					(parent.type === "ClassDeclaration" || parent.type === "ClassExpression") && parent.id
						? parent.id.name
						: undefined;
				/** Names of the properties declared so far. */
				const earlier = new Set<string>();

				for (const member of node.body) {
					const group = groupOf(member);
					const dependent = dependsOnEarlier(member, earlier, className);

					if (isPlainProperty(member) && member.type !== "TSIndexSignature") earlier.add(memberName(member));
					if (group === undefined) continue;

					if (highest === undefined || group.rank >= highest.group.rank) {
						highest = { member, group };
						continue;
					}

					if (dependent) continue;

					context.report({
						node: member,
						messageId: "memberOrdering",
						data: {
							name: memberName(member),
							group: group.label,
							otherName: memberName(highest.member),
							otherGroup: highest.group.label,
						},
					});
				}
			},
		};
	},
};

export default rule;
