import { parseSettings } from "./conventions";
import type { Conventions } from "./conventions";
import { projectRoot } from "./sparta-paths";
import type { Rule } from "./types";

type Context = Parameters<Rule["create"]>[0];

/** Parsed settings per raw settings and working directory, kept for the lifetime of the linter process. */
const cache = new Map<string, Conventions>();

/** The validated `settings.sparta` for this file. Throws a descriptive error for invalid settings. */
export function conventionsFor(context: Context): Conventions {
	const raw: unknown = (context.settings as Record<string, unknown> | undefined)?.sparta;
	const key = `${context.cwd}\0${JSON.stringify(raw ?? null)}`;
	let conventions = cache.get(key);

	if (conventions === undefined) {
		conventions = parseSettings(raw, context.cwd);
		cache.set(key, conventions);
	}

	return conventions;
}

/**
 * The project root the aliases resolve against: `settings.sparta.root` when set (relative paths resolve against
 * the linter's working directory), otherwise the nearest folder with a `package.json`.
 */
export const rootFor = (context: Context, conventions = conventionsFor(context)): string =>
	conventions.root ?? projectRoot(context.filename);
