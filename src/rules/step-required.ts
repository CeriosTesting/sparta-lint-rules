import { isStepDecorator } from "../utils/ast";
import { docsUrl } from "../utils/docs";
import { conventionsFor, rootFor } from "../utils/settings";
import { classify } from "../utils/sparta-paths";
import type { Rule } from "../utils/types";

const STEP_LAYERS = new Set(["stepper", "asserter", "scenario"]);

const rule: Rule = {
	meta: {
		type: "suggestion",
		docs: {
			description: "Require a `@step` decorator on public methods of steppers, asserters and scenarios.",
			url: docsUrl("step-required"),
		},
		schema: [],
		messages: {
			missingStep: "Public method '{{method}}' in a {{layer}} needs a @step decorator so it is visible in the report.",
		},
	},

	create(context) {
		const conventions = conventionsFor(context);
		const info = classify(context.filename, conventions, rootFor(context, conventions));
		const layer = info?.kind === "top-scenario" ? "scenario" : info?.layer;

		if (layer === undefined || !STEP_LAYERS.has(layer)) return {};

		return {
			MethodDefinition(node): void {
				if (
					node.kind !== "method" ||
					node.key.type === "PrivateIdentifier" ||
					node.accessibility === "private" ||
					node.accessibility === "protected" ||
					node.value.type === "TSEmptyBodyFunctionExpression" ||
					node.decorators.some(decorator => isStepDecorator(decorator, conventions.stepDecorators))
				) {
					return;
				}

				context.report({
					node: node.key,
					messageId: "missingStep",
					data: { method: context.sourceCode.getText(node.key), layer },
				});
			},
		};
	},
};

export default rule;
