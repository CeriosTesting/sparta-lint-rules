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
	],
});
