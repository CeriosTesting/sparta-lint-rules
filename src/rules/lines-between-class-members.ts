import { docsUrl } from "../utils/docs";
import type { Rule } from "../utils/types";

const BLANK_LINE = /\r?\n[\t ]*\r?\n/;

const rule: Rule = {
	meta: {
		type: "layout",
		docs: {
			description: "Require a blank line after every multi-line class member.",
			url: docsUrl("lines-between-class-members"),
		},
		fixable: "whitespace",
		schema: [],
		messages: {
			expectedBlankLine: "Expected a blank line between class members.",
		},
	},

	create(context) {
		const { text } = context.sourceCode;

		return {
			ClassBody(node): void {
				for (let index = 1; index < node.body.length; index++) {
					const previous = node.body[index - 1];
					const current = node.body[index];

					if (previous.loc.start.line === previous.loc.end.line) continue;

					const textBetween = text.slice(previous.range[1], current.range[0]);

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
