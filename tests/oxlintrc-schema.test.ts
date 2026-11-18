import { oxlintrcSchema } from "./helpers/oxlintrc-schema";

describe("oxlintrc.schema.json", () => {
	// Fails when the committed schema is stale; `npx vitest run -u` regenerates it.
	it("matches the rules and settings", async () => {
		await expect(`${JSON.stringify(oxlintrcSchema(), null, "\t")}\n`).toMatchFileSnapshot("../oxlintrc.schema.json");
	});
});
