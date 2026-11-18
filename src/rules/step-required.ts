import { isStepDecorator } from "../utils/ast";
import { docsUrl } from "../utils/docs";
import { conventionsFor, rootFor } from "../utils/settings";
import { classify } from "../utils/sparta-paths";
import type { AstNode, Rule } from "../utils/types";

const STEP_LAYERS = new Set(["stepper", "asserter", "scenario"]);

const FUNCTION_VALUES = new Set(["ArrowFunctionExpression", "FunctionExpression"]);

/** The parts of a method or property definition that decide its visibility. */
interface Member {
	static: boolean;
	key: AstNode;
	accessibility?: string | null;
}

/** Public instance members are steps; static members are helpers (such as factories). */
const isPublicInstance = (member: Member): boolean =>
	!member.static &&
	member.key.type !== "PrivateIdentifier" &&
	member.accessibility !== "private" &&
	member.accessibility !== "protected";

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
			functionProperty:
				"Public function property '{{method}}' in a {{layer}} cannot carry a @step decorator; make it a method with @step.",
		},
	},

	create(context) {
		const conventions = conventionsFor(context);
		const info = classify(context.filename, conventions, rootFor(context, conventions));
		const layer = info?.kind === "top-scenario" ? "scenario" : info?.layer;

		if (layer === undefined || !STEP_LAYERS.has(layer)) return {};

		const report = (key: AstNode, messageId: "missingStep" | "functionProperty"): void => {
			context.report({ node: key, messageId, data: { method: context.sourceCode.getText(key), layer } });
		};

		return {
			MethodDefinition(node): void {
				if (
					node.kind !== "method" ||
					!isPublicInstance(node) ||
					node.value.type === "TSEmptyBodyFunctionExpression" ||
					node.decorators.some(decorator => isStepDecorator(decorator, conventions.stepDecorators))
				) {
					return;
				}

				report(node.key, "missingStep");
			},

			PropertyDefinition(node): void {
				if (isPublicInstance(node) && node.value && FUNCTION_VALUES.has(node.value.type)) {
					report(node.key, "functionProperty");
				}
			},
		};
	},
};

export default rule;
