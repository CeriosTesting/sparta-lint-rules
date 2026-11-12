import { isStepDecorator } from "../utils/ast";
import { docsUrl } from "../utils/docs";
import { conventionsFor } from "../utils/settings";
import type { AstNode, Rule } from "../utils/types";

/** The same pattern `@step` uses at runtime: the path is taken as written, so `{{ name }}` looks up " name ". */
const NAMED = /\{\{(.*?)\}\}/g;

const INDEX = /\[\[(\d+)\]\]/g;

const SINGLE_BRACES = /(^|[^{])\{([A-Za-z_$][\w$]*(?:\.[\w$]+)*)\}(?!\})/g;

const findAll = (pattern: RegExp, text: string): RegExpExecArray[] => {
	const regex = new RegExp(pattern.source, "g");
	const found: RegExpExecArray[] = [];

	for (let match = regex.exec(text); match !== null; match = regex.exec(text)) {
		found.push(match);
	}

	return found;
};

const paramName = (param: AstNode): string | undefined => {
	const target = param.type === "TSParameterProperty" ? param.parameter : param;
	const binding =
		target.type === "AssignmentPattern" ? target.left : target.type === "RestElement" ? target.argument : target;

	return binding.type === "Identifier" ? binding.name : undefined;
};

/**
 * What is wrong with the path of a `{{path}}` placeholder, if anything. `@step` reads the path exactly as written,
 * so spaces around it either fail the parameter lookup or read a property that does not exist.
 */
const namedProblem = (
	path: string,
	names: readonly (string | undefined)[]
): "whitespace" | "unknownParameter" | undefined => {
	const trimmed = path.trim();
	const isParameter = (value: string): boolean => names.includes(value.split(".")[0]);

	if (trimmed !== path && isParameter(trimmed)) return "whitespace";

	return trimmed === path && isParameter(path) ? undefined : "unknownParameter";
};

const isLiteralDescription = (node: AstNode): boolean =>
	(node.type === "Literal" && typeof node.value === "string") ||
	(node.type === "TemplateLiteral" && node.expressions.length === 0);

const rule: Rule = {
	meta: {
		type: "problem",
		docs: {
			description: "Validate the placeholders in `@step` descriptions against the method parameters.",
			url: docsUrl("step-placeholders"),
		},
		fixable: "code",
		schema: [],
		messages: {
			singleBraces: "'{{found}}' is printed literally; use '{{expected}}' for a named placeholder.",
			whitespace:
				"'{{found}}' does not resolve, because @step does not trim the spaces inside placeholders; use '{{expected}}'.",
			unknownParameter: "Placeholder '{{found}}' does not match a parameter of '{{method}}' ({{params}}).",
			indexOutOfRange: "Placeholder '{{found}}' is out of range; '{{method}}' has {{count}} parameter(s).",
			notLast: "@step must be the decorator directly above the method, otherwise placeholders cannot be resolved.",
		},
	},

	create(context) {
		const { stepDecorators } = conventionsFor(context);

		/** Reports a `{{path}}` placeholder in `description` that `@step` cannot resolve. */
		const checkNamed = (
			description: AstNode,
			match: RegExpExecArray,
			names: readonly (string | undefined)[],
			methodName: string
		): void => {
			const problem = namedProblem(match[1], names);

			if (problem === "whitespace") {
				const from = description.range[0] + match.index;
				const range: [number, number] = [from, from + match[0].length];
				const expected = `{{${match[1].trim()}}}`;

				context.report({
					node: description,
					messageId: "whitespace",
					data: { found: match[0], expected },

					fix: fixer => fixer.replaceTextRange(range, expected),
				});
			} else if (problem === "unknownParameter") {
				context.report({
					node: description,
					messageId: "unknownParameter",
					data: { found: match[0], method: methodName, params: names.filter(Boolean).join(", ") || "none" },
				});
			}
		};

		return {
			Decorator(node): void {
				if (!isStepDecorator(node, stepDecorators)) return;

				const method = node.parent;

				if (method.type !== "MethodDefinition") return;

				const { decorators } = method;

				if (decorators[decorators.length - 1] !== node) {
					context.report({ node, messageId: "notLast" });
				}

				const { expression } = node;
				const description = expression.type === "CallExpression" ? expression.arguments[0] : undefined;

				if (!description || !isLiteralDescription(description)) return;

				const { params } = method.value;
				const names = params.map(paramName);
				const hasRest = params.some(param => param.type === "RestElement");
				const methodName = context.sourceCode.getText(method.key);
				const raw = context.sourceCode.getText(description);
				const start = description.range[0];

				for (const match of findAll(NAMED, raw)) checkNamed(description, match, names, methodName);

				for (const match of findAll(INDEX, raw)) {
					const index = Number(match[1]);

					if (!hasRest && index >= params.length) {
						context.report({
							node: description,
							messageId: "indexOutOfRange",
							data: { found: match[0], method: methodName, count: String(params.length) },
						});
					}
				}

				for (const match of findAll(SINGLE_BRACES, raw)) {
					const placeholder = match[2];
					const from = start + match.index + match[1].length;
					const range: [number, number] = [from, from + placeholder.length + 2];
					const data = { found: `{${placeholder}}`, expected: `{{${placeholder}}}` };

					if (names.includes(placeholder.split(".")[0])) {
						context.report({
							node: description,
							messageId: "singleBraces",
							data,

							fix: fixer => fixer.replaceTextRange(range, data.expected),
						});
					} else {
						context.report({ node: description, messageId: "singleBraces", data });
					}
				}
			},
		};
	},
};

export default rule;
