import type { CallExpression, Node } from "oxc-parser";

/**
 * Retrying assertions are recognised by method name only, so `expect`, `expect.soft`, `expectly` and wrappers all
 * match. The names come from the conventions: `toPass`, `toPassAndReturn`, `poll`, `pollAndReturn`, plus
 * `settings.sparta.pollingMethods`.
 */

/** Methods that take the callback they retry as their own first argument (`expect.poll(cb)`). */
const CALLBACK_ARGUMENT_METHODS = new Set(["poll", "pollAndReturn"]);

/** Methods that retry the callback given to the start of their chain (`expect(cb).toPass()`). */
const CALLBACK_SUBJECT_METHODS = new Set(["toPass", "toPassAndReturn"]);

/** The static name of a member access (`a.b`, `a["b"]`), or `undefined` for computed or private access. */
export const memberName = (node: Node): string | undefined => {
	if (node.type !== "MemberExpression") return undefined;

	const { property } = node;

	if (!node.computed && property.type === "Identifier") return property.name;
	if (node.computed && property.type === "Literal" && typeof property.value === "string") return property.value;

	return undefined;
};

/** The polling method a call invokes (`toPass` for `expect(cb).toPass()`), or `undefined` for any other node. */
export const pollingMethod = (node: Node, methods: ReadonlySet<string>): string | undefined => {
	if (node.type !== "CallExpression") return undefined;

	const name = memberName(node.callee);

	return name !== undefined && methods.has(name) ? name : undefined;
};

const isFunction = (node: Node | undefined): boolean =>
	node?.type === "ArrowFunctionExpression" || node?.type === "FunctionExpression";

const firstArgument = (call: CallExpression): Node | undefined => {
	const [argument] = call.arguments;

	return argument?.type === "SpreadElement" ? undefined : argument;
};

/** `X(cb).method()`: the first argument of the call the chain starts from, also through `.soft(cb)` and `.not`. */
const subjectCallback = (call: CallExpression): Node | undefined => {
	if (call.callee.type !== "MemberExpression") return undefined;

	let object: Node = call.callee.object;

	while (object.type === "MemberExpression") object = object.object;

	return object.type === "CallExpression" ? firstArgument(object) : undefined;
};

/**
 * The callback that a polling call retries:
 * - `X.poll(cb)` and `X.pollAndReturn(cb)`: the first argument.
 * - `X(cb).toPass()` and `X(cb).toPassAndReturn()`: the first argument of the call the chain starts from,
 *   also through `.soft(cb)` and `.not`.
 * - other configured methods: the first argument when it is a function, otherwise the start of the chain.
 */
export const pollCallback = (call: CallExpression, methods: ReadonlySet<string>): Node | undefined => {
	const method = pollingMethod(call, methods);

	if (method === undefined || call.callee.type !== "MemberExpression") return undefined;
	if (CALLBACK_ARGUMENT_METHODS.has(method)) return firstArgument(call);
	if (CALLBACK_SUBJECT_METHODS.has(method)) return subjectCallback(call);

	const argument = firstArgument(call);

	return isFunction(argument) ? argument : subjectCallback(call);
};
