import type { CallExpression, Node, Program } from "oxc-parser";

import { docsUrl } from "../utils/docs";
import { pollCallback, pollingMethod } from "../utils/polling";
import { ProjectIndex, summarize } from "../utils/project-index";
import type { Hit, Scope } from "../utils/project-index";
import { conventionsFor, rootFor } from "../utils/settings";
import { normalize } from "../utils/sparta-paths";
import type { AstNode, Rule } from "../utils/types";

type FunctionNode = Extract<
	AstNode,
	{ type: "ArrowFunctionExpression" | "FunctionExpression" | "FunctionDeclaration" }
>;

const isFunction = (node: AstNode): node is FunctionNode =>
	node.type === "ArrowFunctionExpression" || node.type === "FunctionExpression" || node.type === "FunctionDeclaration";

/** The class around `node`, and the outermost function inside that class (the method), for resolving `this` and locals. */
function enclosing(node: AstNode): { classNode?: AstNode; fn?: FunctionNode } {
	let fn: FunctionNode | undefined;

	for (let current: AstNode | null = node.parent; current; current = current.parent) {
		if (current.type === "ClassDeclaration" || current.type === "ClassExpression") return { classNode: current, fn };
		if (isFunction(current)) fn = current;
	}

	return { fn };
}

const rule: Rule = {
	meta: {
		type: "problem",
		docs: {
			description:
				"Disallow polling (`toPass`, `poll`, ...) inside the callback of another poll, also through calls into other files.",
			url: docsUrl("no-nested-polling"),
		},
		schema: [],
		messages: {
			nested:
				"'{{inner}}' polls inside the callback of '{{outer}}'. Nested polling multiplies the timeouts; poll once, at the outermost level.",
			nestedCall:
				"'{{call}}' polls inside the callback of '{{outer}}' (via {{path}}). Nested polling multiplies the timeouts; poll once, at the outermost level.",
		},
	},

	create(context) {
		const { sourceCode } = context;
		const conventions = conventionsFor(context);
		const { pollingMethods } = conventions;

		if (![...pollingMethods].some(method => sourceCode.text.includes(method))) return {};

		let index: ProjectIndex | undefined;

		const getIndex = (): ProjectIndex =>
			(index ??= new ProjectIndex(
				summarize(
					normalize(context.filename),
					sourceCode.ast as unknown as Program,
					rootFor(context, conventions),
					conventions
				)
			));

		const report = (hit: Hit, outer: string): void => {
			const node = hit.node as unknown as AstNode;

			if ("method" in hit) {
				context.report({ node, messageId: "nested", data: { inner: hit.method, outer } });
			} else {
				const callee = sourceCode.getText(hit.node.callee as unknown as AstNode);

				context.report({
					node,
					messageId: "nestedCall",
					data: { call: `${callee}()`, outer, path: hit.path.join(" → ") },
				});
			}
		};

		return {
			CallExpression(node): void {
				const call = node as unknown as CallExpression;
				const outer = pollingMethod(call, pollingMethods);
				const callback = outer === undefined ? undefined : pollCallback(call, pollingMethods);

				if (outer === undefined || callback === undefined) return;

				const { classNode, fn } = enclosing(node);
				const projectIndex = getIndex();
				// Locals come from the enclosing method, or from the callback itself for module-level polls.
				const scope: Scope = projectIndex.scopeFor(
					classNode as unknown as Node | undefined,
					fn ? (fn as unknown as Node) : callback
				);

				if (callback.type === "ArrowFunctionExpression" || callback.type === "FunctionExpression") {
					for (const hit of projectIndex.collectHits(callback.body as Node, scope)) report(hit, outer);

					return;
				}

				// A reference such as `this.fetchStatus` or `fetchStatus`: the referenced function is the callback.
				const target = projectIndex.resolveReference(callback, scope);
				const path = target ? projectIndex.pollingPath(target) : undefined;

				if (path) {
					context.report({
						node: callback as unknown as AstNode,
						messageId: "nestedCall",
						data: { call: sourceCode.getText(callback as unknown as AstNode), outer, path: path.join(" → ") },
					});
				}
			},
		};
	},
};

export default rule;
