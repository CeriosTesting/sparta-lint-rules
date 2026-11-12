import { docsUrl } from "../utils/docs";
import { conventionsFor, rootFor } from "../utils/settings";
import { classify } from "../utils/sparta-paths";
import type { Rule } from "../utils/types";

const LAYER_CLASS =
	/(Stepper|Asserter|Scenario|Service|Client|Repository|Page|Screen|Component|Builder|Director|Factory|Provider)$/;

const rule: Rule = {
	meta: {
		type: "problem",
		docs: {
			description: "Disallow constructing SPARTA layer classes in tests; use the fixtures instead.",
			url: docsUrl("no-direct-construction-in-tests"),
		},
		schema: [],
		messages: {
			useFixture: "Do not construct '{{name}}' in a test; use it via the SPARTA fixtures.",
		},
	},

	create(context) {
		const conventions = conventionsFor(context);

		if (classify(context.filename, conventions, rootFor(context, conventions))?.kind !== "test") return {};

		return {
			NewExpression(node): void {
				const { callee } = node;

				if (callee.type === "Identifier" && LAYER_CLASS.test(callee.name)) {
					context.report({ node, messageId: "useFixture", data: { name: callee.name } });
				}
			},
		};
	},
};

export default rule;
