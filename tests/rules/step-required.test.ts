import rule from "../../src/rules/step-required";
import { file, runRule } from "../helpers/rule-tester";

const STEPPER = file("sparta/api/orders/steppers/orders-stepper.ts");

runRule("step-required", rule, {
	valid: [
		{
			name: "settings: a custom step decorator counts as @step",
			code: `class OrdersStepper {
	@Step("Open")
	async open() {}
}`,
			filename: STEPPER,
			settings: { sparta: { stepDecorators: ["Step"] } },
		},
		{
			code: `class OrdersStepper {
	constructor(private readonly page: Page) {}

	@step("Open")
	async open() {}

	get value() {
		return 1;
	}

	private helper() {}

	protected other() {}

	#hidden() {}
}`,
			filename: STEPPER,
		},
		{
			code: `class OrdersService {
	async get() {}
}`,
			filename: file("sparta/api/orders/services/orders-service.ts"),
		},
		{
			name: "static methods are helpers, not steps",
			code: `class OrdersStepper {
	static create(page: Page) {
		return new OrdersStepper(page);
	}
}`,
			filename: STEPPER,
		},
		{
			name: "non-public, static and plain properties are fine",
			code: `class OrdersStepper {
	private readonly format = (value: string) => value.trim();
	protected parse = () => 1;
	#hidden = () => 2;
	static build = () => 3;
	readonly timeout = 5_000;
}`,
			filename: STEPPER,
		},
		{
			name: "overload signatures do not need a decorator",
			code: `class OrdersStepper {
	open(id: string): void;
	@step("Open")
	open(id: unknown): void {}
}`,
			filename: STEPPER,
		},
	],
	invalid: [
		{
			code: `class OrdersStepper {
	async open() {}
}`,
			filename: STEPPER,
			errors: [{ messageId: "missingStep", data: { method: "open", layer: "stepper" } }],
		},
		{
			code: `class CheckoutScenario {
	@other()
	async run() {}
}`,
			filename: file("sparta/scenarios/checkout-scenario.ts"),
			errors: [{ messageId: "missingStep", data: { method: "run", layer: "scenario" } }],
		},
		{
			name: "settings: steppers in the configured sparta folder",
			code: `class OrdersStepper {
	async open() {}
}`,
			filename: file("src/api/orders/steppers/orders-stepper.ts"),
			settings: { sparta: { folders: { sparta: "src" } } },
			errors: [{ messageId: "missingStep", data: { method: "open", layer: "stepper" } }],
		},
		{
			name: "a public arrow-function property cannot carry @step",
			code: `class OrdersStepper {
	open = async (orderId: string) => {};
	readonly close = async function () {};
}`,
			filename: STEPPER,
			errors: [
				{ messageId: "functionProperty", data: { method: "open", layer: "stepper" } },
				{ messageId: "functionProperty", data: { method: "close", layer: "stepper" } },
			],
		},
	],
});
