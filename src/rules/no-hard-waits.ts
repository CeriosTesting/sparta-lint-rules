import { isIdentifier, staticString, stringValue } from "../utils/ast";
import { docsUrl } from "../utils/docs";
import { conventionsFor, rootFor } from "../utils/settings";
import { projectPath } from "../utils/sparta-paths";
import type { AstNode, Rule } from "../utils/types";

const TIMER_MODULES = new Set(["timers/promises", "node:timers/promises"]);

const isSetTimeout = (callee: AstNode): boolean =>
	isIdentifier(callee, "setTimeout") ||
	(callee.type === "MemberExpression" &&
		(isIdentifier(callee.object, "globalThis") || isIdentifier(callee.object, "window")) &&
		isIdentifier(callee.property, "setTimeout"));

/** The `resolve` parameter of the nearest enclosing `new Promise(resolve => ...)` executor. */
const promiseResolveName = (node: AstNode): string | undefined => {
	for (let current: AstNode | null = node.parent; current; current = current.parent) {
		if (current.type !== "ArrowFunctionExpression" && current.type !== "FunctionExpression") continue;

		const { parent } = current;

		if (parent.type === "NewExpression" && isIdentifier(parent.callee, "Promise") && parent.arguments[0] === current) {
			const [resolve] = current.params;

			return resolve?.type === "Identifier" ? resolve.name : undefined;
		}
	}

	return undefined;
};

/** True when the timer callback only resolves the promise, i.e. the timer is a plain sleep. */
const resolvesPromise = (callback: AstNode | undefined, resolve: string): boolean => {
	if (!callback) return false;
	if (isIdentifier(callback, resolve)) return true;
	if (callback.type !== "ArrowFunctionExpression" && callback.type !== "FunctionExpression") return false;

	const { body } = callback;

	if (!body) return false;

	const call =
		body.type === "CallExpression"
			? body
			: body.type === "BlockStatement" && body.body.length === 1 && body.body[0].type === "ExpressionStatement"
				? body.body[0].expression
				: undefined;

	return call?.type === "CallExpression" && isIdentifier(call.callee, resolve);
};

/** The name of an import specifier or object pattern key (`setTimeout`, `"setTimeout"`). */
const propertyName = (node: AstNode): string | undefined =>
	node.type === "Identifier" ? node.name : stringValue(node);

/** `require("timers/promises")` or `require("node:timers/promises")`. */
const isTimersRequire = (node: AstNode | null | undefined): boolean => {
	if (node?.type !== "CallExpression" || !isIdentifier(node.callee, "require")) return false;

	const source = staticString(node.arguments[0]);

	return source !== undefined && TIMER_MODULES.has(source);
};

const rule: Rule = {
	meta: {
		type: "problem",
		docs: {
			description: "Disallow fixed-time waits such as `waitForTimeout` and `setTimeout` sleeps.",
			url: docsUrl("no-hard-waits"),
		},
		schema: [],
		messages: {
			hardWait:
				"Do not wait a fixed amount of time; wait for a state with web-first assertions or polling in a stepper or asserter.",
		},
	},

	create(context) {
		const conventions = conventionsFor(context);
		const { patterns } = conventions;
		const file = projectPath(context.filename, rootFor(context, conventions));

		if (file === undefined || !patterns.checked.test(file) || patterns.framework.test(file)) return {};

		/** Local names bound to the `timers/promises` module (`timers`) and to its `scheduler` (`schedulers`). */
		const timers = new Set<string>();
		const schedulers = new Set<string>();

		/** Records a named binding from `timers/promises`; `setTimeout` itself is reported where it is bound. */
		const bindNamed = (imported: string, local: AstNode | undefined, node: AstNode): void => {
			if (imported === "setTimeout") context.report({ node, messageId: "hardWait" });
			if (imported === "scheduler" && local?.type === "Identifier") schedulers.add(local.name);
		};

		/** `timers.setTimeout(...)`, `scheduler.wait(...)` and `timers.scheduler.wait(...)`. */
		const isTimersSleep = (callee: AstNode): boolean => {
			if (callee.type !== "MemberExpression") return false;

			const { object, property } = callee;

			if (isIdentifier(property, "setTimeout")) return object.type === "Identifier" && timers.has(object.name);
			if (!isIdentifier(property, "wait")) return false;
			if (object.type === "Identifier") return schedulers.has(object.name);

			return (
				object.type === "MemberExpression" &&
				object.object.type === "Identifier" &&
				timers.has(object.object.name) &&
				isIdentifier(object.property, "scheduler")
			);
		};

		return {
			ImportDeclaration(node): void {
				if (typeof node.source.value !== "string" || !TIMER_MODULES.has(node.source.value)) return;

				for (const specifier of node.specifiers) {
					if (specifier.type === "ImportSpecifier") {
						bindNamed(propertyName(specifier.imported) ?? "", specifier.local, specifier);
					} else {
						timers.add(specifier.local.name);
					}
				}
			},

			VariableDeclarator(node): void {
				if (!isTimersRequire(node.init)) return;

				if (node.id.type === "Identifier") {
					timers.add(node.id.name);

					return;
				}

				if (node.id.type !== "ObjectPattern") return;

				for (const property of node.id.properties) {
					if (property.type !== "Property" || property.computed) continue;

					bindNamed(propertyName(property.key) ?? "", property.value, property);
				}
			},

			CallExpression(node): void {
				const { callee } = node;

				if (
					(callee.type === "MemberExpression" && isIdentifier(callee.property, "waitForTimeout")) ||
					isTimersSleep(callee)
				) {
					context.report({ node, messageId: "hardWait" });

					return;
				}

				if (!isSetTimeout(callee)) return;

				const resolve = promiseResolveName(node);

				if (resolve !== undefined && resolvesPromise(node.arguments[0], resolve)) {
					context.report({ node, messageId: "hardWait" });
				}
			},
		};
	},
};

export default rule;
