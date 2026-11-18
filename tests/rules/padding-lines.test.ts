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
		{
			name: "multi-line exported overload signatures stay together",
			code: `export function find(
	id: string,
): Order;
export function find(filter: OrderFilter): Order[];
export function find(arg: string | OrderFilter): Order | Order[] {
	return lookup(arg);
}

export const other = 1;`,
		},
		`const o = { a: 1, b() {} };`,
		`const o = {
	a: 1,
	b: 2,
};`,
		{
			name: "single-line methods in an object literal need no blank lines",
			code: `const o = {
	label: "a",
	filter: (order: Order) => order.ok,
	map(order: Order) { return order.id; },
	get total() { return 1; },
	size: 2,
};`,
		},
	],
	invalid: [
		{
			name: "blank lines between overloads are removed",
			code: `export function find(id: string): Order;

export function find(filter: OrderFilter): Order[];


export function find(arg: string | OrderFilter): Order | Order[] {
	return lookup(arg);
}`,
			output: `export function find(id: string): Order;
export function find(filter: OrderFilter): Order[];
export function find(arg: string | OrderFilter): Order | Order[] {
	return lookup(arg);
}`,
			errors: [{ messageId: "betweenOverloads" }, { messageId: "betweenOverloads" }],
		},
		{
			name: "comments between overloads are kept",
			code: `namespace N {
	function f(a: string): void;

	// numbers
	function f(a: number): void;
	function f(a: unknown): void {}
}`,
			output: `namespace N {
	function f(a: string): void;
	// numbers
	function f(a: number): void;
	function f(a: unknown): void {}
}`,
			errors: [{ messageId: "betweenOverloads" }],
		},
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
		{
			name: "a multi-line method next to a single-line one still needs a blank line",
			code: `const o = {
	filter: (order: Order) => order.ok,
	b() {
		return 1;
	},
	c: () => 2,
};`,
			output: `const o = {
	filter: (order: Order) => order.ok,

	b() {
		return 1;
	},

	c: () => 2,
};`,
			errors: [{ messageId: "betweenObjectMethods" }, { messageId: "betweenObjectMethods" }],
		},
	],
});
