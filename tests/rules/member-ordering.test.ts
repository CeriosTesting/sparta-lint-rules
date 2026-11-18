import rule from "../../src/rules/member-ordering";
import { runRule } from "../helpers/rule-tester";

const error = (
	name: string,
	group: string,
	otherName: string,
	otherGroup: string
): { messageId: string; data: Record<string, string> } => ({
	messageId: "memberOrdering",
	data: { name, group, otherName, otherGroup },
});

runRule("member-ordering", rule, {
	valid: [
		{
			name: "a property that reads an earlier property is not moved above it",
			code: `class A {
	private readonly base = "x";
	readonly url = this.base + "/y";
}`,
		},
		{
			name: "a static property that reads an earlier static property is not moved above it",
			code: `class Foo {
	private static readonly TIMEOUT = 5;
	static readonly DOUBLE = Foo.TIMEOUT * 2;
	static readonly TRIPLE = this.TIMEOUT * 3;
}`,
		},
		{
			name: "a property that reads an earlier #private property",
			code: `class A {
	#base = "x";
	readonly url = \`\${this.#base}/y\`;
}`,
		},
		{
			name: "full order",
			code: `class A {
	static readonly PATTERN = /x/;
	protected static base = 1;
	private static cache = new Map();
	static #secret = 2;
	[key: string]: unknown;
	readonly title = "a";
	protected count = 0;
	private readonly date: Date;
	#flag = false;
	constructor(private readonly page: Page) {}
	static create() {}
	protected static helper() {}
	private static build() {}
	get name() { return ""; }
	set name(value: string) {}
	open() {}
	protected close() {}
	private format() {}
	#other() {}
}`,
		},
		{
			name: "function-valued properties count as methods",
			code: `class A {
	value = 1;
	constructor() {}
	onClick = () => {};
	handler = function () {};
	private onHover = () => {};
}`,
		},
		{
			name: "overloads",
			code: `class A {
	find(id: string): Item;
	find(id: number): Item;
	find(id: string | number): Item {
		return {} as Item;
	}
	private helper() {}
}`,
		},
		{
			name: "static blocks are ignored",
			code: `class A {
	static {}
	value = 1;
	static {}
	open() {}
}`,
		},
		{
			name: "abstract members",
			code: `abstract class A {
	protected abstract readonly url: string;
	abstract open(): void;
	private helper() {}
}`,
		},
		`class A {
	open() {}
	close() {}
}`,
		`class A {}`,
	],
	invalid: [
		{
			name: "public property after private property",
			code: `class A {
	private secret = 1;
	value = 2;
}`,
			errors: [error("value", "public property", "secret", "private property")],
		},
		{
			name: "static property after instance property",
			code: `class A {
	value = 1;
	static PATTERN = /x/;
}`,
			errors: [error("PATTERN", "static public property", "value", "public property")],
		},
		{
			name: "property after constructor",
			code: `class A {
	constructor() {}
	value = 1;
}`,
			errors: [error("value", "public property", "constructor", "constructor")],
		},
		{
			name: "property after method",
			code: `class A {
	open() {}
	readonly title = "a";
}`,
			errors: [error("title", "public property", "open", "public method")],
		},
		{
			name: "constructor after method",
			code: `class A {
	open() {}
	constructor() {}
}`,
			errors: [error("constructor", "constructor", "open", "public method")],
		},
		{
			name: "static method after instance method",
			code: `class A {
	open() {}
	static create() {}
}`,
			errors: [error("create", "static public method", "open", "public method")],
		},
		{
			name: "public method after private method",
			code: `class A {
	private helper() {}
	run() {}
}`,
			errors: [error("run", "public method", "helper", "private method")],
		},
		{
			name: "public methods after #private method, one report each",
			code: `class A {
	#helper() {}
	run() {}
	stop() {}
}`,
			errors: [
				error("run", "public method", "helper", "private method"),
				error("stop", "public method", "helper", "private method"),
			],
		},
		{
			name: "protected after private",
			code: `class A {
	private helper() {}
	protected run() {}
}`,
			errors: [error("run", "protected method", "helper", "private method")],
		},
		{
			name: "function-valued property is a method",
			code: `class A {
	onClick = () => {};
	value = 1;
}`,
			errors: [error("value", "public property", "onClick", "public method")],
		},
		{
			name: "reports against the furthest member seen",
			code: `class A {
	private format() {}
	open() {}
	static create() {}
	value = 1;
}`,
			errors: [
				error("open", "public method", "format", "private method"),
				error("create", "static public method", "format", "private method"),
				error("value", "public property", "format", "private method"),
			],
		},
		{
			name: "reading a property only inside a function does not depend on the order",
			code: `class A {
	private readonly base = "x";
	readonly url = () => this.base;
	readonly title = "a";
}`,
			errors: [error("title", "public property", "url", "public method")],
		},
		{
			name: "reading a property that is declared later does not depend on the order",
			code: `class A {
	private readonly base = "x";
	readonly url = this.title;
	readonly title = "a";
}`,
			errors: [
				error("url", "public property", "base", "private property"),
				error("title", "public property", "base", "private property"),
			],
		},
	],
});
