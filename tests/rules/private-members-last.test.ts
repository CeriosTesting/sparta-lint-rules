import rule from "../../src/rules/private-members-last";
import { runRule } from "../helpers/rule-tester";

runRule("private-members-last", rule, {
	valid: [
		`class A {
	run() {}
	private helper() {}
	#other() {}
}`,
		`class A {
	private helper() {}
	constructor() {}
	private value = 1;
	count = 2;
}`,
	],
	invalid: [
		{
			code: `class A {
	private helper() {}
	run() {}
}`,
			errors: [{ messageId: "privateMembersLast", data: { name: "run", privateName: "helper" } }],
		},
		{
			code: `class A {
	#helper() {}
	run() {}
	stop() {}
}`,
			errors: [
				{ messageId: "privateMembersLast", data: { name: "run", privateName: "helper" } },
				{ messageId: "privateMembersLast", data: { name: "stop", privateName: "helper" } },
			],
		},
	],
});
