import { mkdirSync, rmSync, symlinkSync } from "node:fs";
import path from "node:path";

/**
 * Links the package root into the fixture project's node_modules, so the fixture resolves
 * `@cerios/sparta-lint-rules` through its package.json exports, exactly like a consumer would.
 */
export default function setup(): () => void {
	const scope = path.join(__dirname, "fixture/node_modules/@cerios");
	const link = path.join(scope, "sparta-lint-rules");

	rmSync(link, { recursive: true, force: true });
	mkdirSync(scope, { recursive: true });
	symlinkSync(path.resolve(__dirname, ".."), link, "junction");

	return () => rmSync(path.join(__dirname, "fixture/node_modules"), { recursive: true, force: true });
}
