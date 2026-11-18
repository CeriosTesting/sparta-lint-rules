import { type ClassMember, isMethod, isPlainProperty, type Method } from "../utils/class-members";
import { docsUrl } from "../utils/docs";
import type { Rule } from "../utils/types";

const BLANK_LINE = /\r?\n[\t ]*\r?\n/;
const BLANK_LINES = /(\r?\n)(?:[\t ]*\r?\n)+/g;

/** An overload signature (or abstract method): a method without a body. */
const isSignature = (member: ClassMember): member is Method => isMethod(member) && member.value.body === null;

const rule: Rule = {
	meta: {
		type: "layout",
		docs: {
			description:
				"Require a blank line after every multi-line method-like class member, and disallow blank lines between method overloads.",
			url: docsUrl("lines-between-class-members"),
		},
		fixable: "whitespace",
		schema: [],
		messages: {
			expectedBlankLine: "Expected a blank line between class members.",
			unexpectedBlankLine: "Unexpected blank line between overloads of the same method.",
		},
	},

	create(context) {
		const { sourceCode } = context;
		const { text } = sourceCode;

		const keyOf = (method: Method): string =>
			`${method.static ? "static " : ""}${method.computed ? "[]" : ""}${sourceCode.getText(method.key)}`;

		/** `current` continues the overload group that `previous` (a bodyless signature) belongs to. */
		const isOverloadOf = (previous: ClassMember, current: ClassMember): boolean =>
			isSignature(previous) &&
			isMethod(current) &&
			current.kind === previous.kind &&
			keyOf(current) === keyOf(previous);

		return {
			ClassBody(node): void {
				for (let index = 1; index < node.body.length; index++) {
					const previous = node.body[index - 1];
					const current = node.body[index];
					const textBetween = text.slice(previous.range[1], current.range[0]);

					if (isOverloadOf(previous, current)) {
						if (!BLANK_LINE.test(textBetween)) continue;

						context.report({
							node: current,
							messageId: "unexpectedBlankLine",
							fix: fixer =>
								fixer.replaceTextRange([previous.range[1], current.range[0]], textBetween.replace(BLANK_LINES, "$1")),
						});
						continue;
					}

					if (previous.loc.start.line === previous.loc.end.line) continue;
					if (isPlainProperty(previous)) continue;
					if (BLANK_LINE.test(textBetween)) continue;

					context.report({
						node: current,
						messageId: "expectedBlankLine",

						fix: fixer => {
							const lineBreak = textBetween.includes("\r\n") ? "\r\n" : "\n";
							const replacement = textBetween.includes(lineBreak)
								? textBetween.replace(lineBreak, `${lineBreak}${lineBreak}`)
								: `${lineBreak}${lineBreak}${textBetween}`;

							return fixer.replaceTextRange([previous.range[1], current.range[0]], replacement);
						},
					});
				}
			},
		};
	},
};

export default rule;
