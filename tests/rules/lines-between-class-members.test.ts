import rule from "../../src/rules/lines-between-class-members";
import { runRule } from "../helpers/rule-tester";

runRule("lines-between-class-members", rule, {
	valid: [
		`class A {
	a = 1;
	b = 2;

	method() {
		return 1;
	}

	other() {}
}`,
		{
			name: "overloads grouped without blank lines",
			code: `class A {
	find(id: string): Item;
	find(
		filter: Filter,
		options: Options,
	): Item[];
	find(arg: string | Filter): Item | Item[] {
		return lookup(arg);
	}

	static create(): A;
	static create(seed: number): A;
	static create(seed?: number): A {
		return new A(seed);
	}

	constructor();
	constructor(value: string);
	constructor(value?: string) {}
}`,
		},
		{
			name: "property groups with properties wrapped over multiple lines",
			code: `class A {
	private static readonly DATE = /^\\d{4}-\\d{2}-\\d{2}$/;
	private static readonly TIME = /^\\d{2}:\\d{2}$/;
	private static readonly LONG_PATTERN =
		/^(?:[a-z0-9!#$%&'*+/=?^_\`{|}~-]+(?:\\.[a-z0-9!#$%&'*+/=?^_\`{|}~-]+)*)$/;
	private static readonly ZIP = /^\\d{4}[A-Z]{2}$/;

	private readonly _date: Date;

	static readonly name = z.string();
	static readonly address = z
		.object({ street: z.string(), number: z.number() })
		.strict();
	static readonly zip = z.string();
	private readonly index: {
		[key: string]: number;
	};
	[key: string]: unknown;
}`,
		},
		{
			name: "abstract overloads",
			code: `abstract class A {
	abstract run(): void;
	abstract run(times: number): void;

	other() {}
}`,
		},
		{
			name: "blank line between differently named signatures is allowed",
			code: `abstract class A {
	abstract run(): void;

	abstract stop(): void;
}`,
		},
	],
	invalid: [
		{
			code: `class A {
	method() {
		return 1;
	}
	other() {}
}`,
			output: `class A {
	method() {
		return 1;
	}

	other() {}
}`,
			errors: [{ messageId: "expectedBlankLine" }],
		},
		{
			name: "members on the same line",
			code: `class A {
	method() {
		return 1;
	} other() {}
}`,
			output: `class A {
	method() {
		return 1;
	}

 other() {}
}`,
			errors: [{ messageId: "expectedBlankLine" }],
		},
		{
			name: "multi-line function-valued property is treated like a method",
			code: `class A {
	handler = () => {
		return 1;
	};
	other = 2;
}`,
			output: `class A {
	handler = () => {
		return 1;
	};

	other = 2;
}`,
			errors: [{ messageId: "expectedBlankLine" }],
		},
		{
			name: "blank lines between overloads",
			code: `class A {
	find(id: string): Item;

	find(filter: Filter): Item[];


	find(arg: string | Filter): Item | Item[] {
		return lookup(arg);
	}

	static create(): A;

	static create(seed?: number): A {
		return new A(seed);
	}
}`,
			output: `class A {
	find(id: string): Item;
	find(filter: Filter): Item[];
	find(arg: string | Filter): Item | Item[] {
		return lookup(arg);
	}

	static create(): A;
	static create(seed?: number): A {
		return new A(seed);
	}
}`,
			errors: [
				{ messageId: "unexpectedBlankLine" },
				{ messageId: "unexpectedBlankLine" },
				{ messageId: "unexpectedBlankLine" },
			],
		},
		{
			name: "blank line between overloads keeps comments",
			code: `class A {
	/** By id. */
	find(id: string): Item;

	/** By filter. */
	find(filter: Filter): Item[];
	find(arg: string | Filter): Item | Item[] {
		return lookup(arg);
	}
}`,
			output: `class A {
	/** By id. */
	find(id: string): Item;
	/** By filter. */
	find(filter: Filter): Item[];
	find(arg: string | Filter): Item | Item[] {
		return lookup(arg);
	}
}`,
			errors: [{ messageId: "unexpectedBlankLine" }],
		},
	],
});
