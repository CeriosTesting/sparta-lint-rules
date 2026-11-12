import rule from "../../src/rules/padding-lines";
import { runRule } from "../helpers/rule-tester";

runRule("padding-lines", rule, {
	valid: [
		`import a from "a";
import b from "b";

const c = a + b;`,
		`const a = 1;
const b = 2;

function f() {}

export const g = () => 1;`,
		{
			name: "overload signatures stay together",
			code: `function f(a: string): void;
function f(a: number): void;
function f(a: unknown): void {}`,
		},
		`const o = { a: 1, b() {} };`,
		`const o = {
	a: 1,
	b: 2,
};`,
	],
	invalid: [
		{
			code: `import a from "a";
const b = a;`,
			output: `import a from "a";

const b = a;`,
			errors: [{ messageId: "afterImports" }],
		},
		{
			code: `const a = 1;
function f() {}
const b = 2;`,
			output: `const a = 1;

function f() {}

const b = 2;`,
			errors: [{ messageId: "aroundFunctions" }, { messageId: "aroundFunctions" }],
		},
		{
			code: `namespace N {
	const a = 1;
	export function f() {}
}`,
			output: `namespace N {
	const a = 1;

	export function f() {}
}`,
			errors: [{ messageId: "aroundFunctions" }],
		},
		{
			code: `const o = {
	a: 1,
	b() {
		return 1;
	},
};`,
			output: `const o = {
	a: 1,

	b() {
		return 1;
	},
};`,
			errors: [{ messageId: "betweenObjectMethods" }],
		},
	],
});
