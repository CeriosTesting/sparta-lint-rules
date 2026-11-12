import { docsUrl } from "../utils/docs";
import type { AstNode, NodeOfType, Rule } from "../utils/types";

type ClassMember = NodeOfType<"ClassBody">["body"][number];

const isMethodLike = (member: ClassMember): boolean =>
	(member.type === "MethodDefinition" || member.type === "TSAbstractMethodDefinition") && member.kind !== "constructor";

const isPrivate = (member: ClassMember): boolean =>
	("accessibility" in member && member.accessibility === "private") ||
	("key" in member && member.key.type === "PrivateIdentifier");

const memberName = (member: ClassMember): string => {
	const key: AstNode | undefined = "key" in member ? member.key : undefined;

	if (key && "name" in key && typeof key.name === "string") return key.name;
	if (key && "value" in key && typeof key.value === "string") return key.value;

	return "<computed>";
};

const rule: Rule = {
	meta: {
		type: "suggestion",
		docs: {
			description: "Require public methods to be placed above private methods.",
			url: docsUrl("private-members-last"),
		},
		schema: [],
		messages: {
			privateMembersLast:
				"Public method '{{name}}' must be placed above all private methods (private method '{{privateName}}' comes first).",
		},
	},

	create(context) {
		return {
			ClassBody(node): void {
				let firstPrivate: ClassMember | undefined;

				for (const member of node.body) {
					if (!isMethodLike(member)) continue;

					if (isPrivate(member)) {
						firstPrivate ??= member;
						continue;
					}

					if (firstPrivate !== undefined) {
						context.report({
							node: member,
							messageId: "privateMembersLast",
							data: { name: memberName(member), privateName: memberName(firstPrivate) },
						});
					}
				}
			},
		};
	},
};

export default rule;
