import rule from "../../src/rules/step-placeholders";
import { runRule } from "../helpers/rule-tester";

const inClass = (method: string): string => `class OrdersStepper {
	${method}
}`;

runRule("step-placeholders", rule, {
	valid: [
		{
			name: "settings: placeholders of other decorators are not checked by default",
			code: inClass(`@Step("Open {orderId}") async open(orderId: string) {}`),
		},
		inClass(`@step("Open order {{orderId}}") async open(orderId: string) {}`),
		inClass(`@step("Open order {{order.id}}") async open(order: Order) {}`),
		inClass(`@step("Open [[0]]") async open(orderId: string, count = 1) {}`),
		inClass(`@step("Open [[3]]") async open(...ids: string[]) {}`),
		inClass(`@step(\`Open {{orderId}}\`) async open(orderId: string) {}`),
		inClass(`@step async open() {}`),
		inClass(`@other() @step("Open") async open() {}`),
		inClass(`@step(description) async open(orderId: string) {}`),
	],
	invalid: [
		{
			code: inClass(`@step("Open {{id}}") async open(orderId: string) {}`),
			errors: [{ messageId: "unknownParameter", data: { found: "{{id}}", method: "open", params: "orderId" } }],
		},
		{
			name: "spaces inside the braces fail at runtime, because @step does not trim them",
			code: inClass(`@step("Open {{ orderId }} and {{order.id }}") async open(orderId: string, order: Order) {}`),
			output: inClass(`@step("Open {{orderId}} and {{order.id}}") async open(orderId: string, order: Order) {}`),
			errors: [
				{ messageId: "whitespace", data: { found: "{{ orderId }}", expected: "{{orderId}}" } },
				{ messageId: "whitespace", data: { found: "{{order.id }}", expected: "{{order.id}}" } },
			],
		},
		{
			name: "no autofix when the trimmed name is not a parameter either",
			code: inClass(`@step("Open {{ id }}") async open(orderId: string) {}`),
			output: null,
			errors: [{ messageId: "unknownParameter", data: { found: "{{ id }}", method: "open", params: "orderId" } }],
		},
		{
			name: "an empty placeholder fails at runtime",
			code: inClass(`@step("Open {{}}") async open(orderId: string) {}`),
			errors: [{ messageId: "unknownParameter", data: { found: "{{}}", method: "open", params: "orderId" } }],
		},
		{
			code: inClass(`@step("Open [[1]]") async open(orderId: string) {}`),
			errors: [{ messageId: "indexOutOfRange", data: { found: "[[1]]", method: "open", count: "1" } }],
		},
		{
			code: inClass(`@step("Open {orderId}") async open(orderId: string) {}`),
			output: inClass(`@step("Open {{orderId}}") async open(orderId: string) {}`),
			errors: [{ messageId: "singleBraces", data: { found: "{orderId}", expected: "{{orderId}}" } }],
		},
		{
			name: "no autofix when the single-brace name is not a parameter",
			code: inClass(`@step("Open {other}") async open(orderId: string) {}`),
			output: null,
			errors: [{ messageId: "singleBraces" }],
		},
		{
			code: inClass(`@step("Open") @other() async open() {}`),
			errors: [{ messageId: "notLast" }],
		},
		{
			name: "settings: a custom step decorator is checked like @step",
			code: inClass(`@Step("Open {orderId}") async open(orderId: string) {}`),
			settings: { sparta: { stepDecorators: ["Step"] } },
			output: inClass(`@Step("Open {{orderId}}") async open(orderId: string) {}`),
			errors: [{ messageId: "singleBraces" }],
		},
	],
});
