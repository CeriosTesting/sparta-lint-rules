import path from "node:path";

/**
 * The names a SPARTA project uses, and how `settings.sparta` extends them.
 *
 * Settings describe a project; they never relax the rules. A setting either maps a project's own name onto an
 * existing SPARTA concept (so it gets all of that concept's checks) or adds names to detect (which only makes the
 * rules stricter). Switching checks off is left to the linter config, where it stays visible.
 */

export type Area = "api" | "database" | "mobile" | "ui";

/** A top-level SPARTA folder that aliases can point to. */
export type TopFolder = "sparta" | "tests";

/** The standard layer folders, with the layer the architecture rules know them as and their file name suffix. */
export const LAYER_FOLDERS = {
	asserters: { layer: "asserter", suffix: "asserter" },
	builders: { layer: "builder", suffix: "builder" },
	clients: { layer: "client", suffix: "client" },
	components: { layer: "component", suffix: "component" },
	containers: { layer: "container" },
	databases: { layer: "database" },
	directors: { layer: "director", suffix: "director" },
	factories: { suffix: "factory" },
	pages: { layer: "page", suffix: "page" },
	repositories: { layer: "repository", suffix: "repository" },
	scenarios: { layer: "scenario", suffix: "scenario" },
	screens: { layer: "screen", suffix: "screen" },
	services: { layer: "service", suffix: "service" },
	steppers: { layer: "stepper", suffix: "stepper" },
} as const satisfies Record<string, { layer?: string; suffix?: string }>;

export type LayerFolder = keyof typeof LAYER_FOLDERS;

const AREAS: readonly Area[] = ["api", "database", "mobile", "ui"];

/** Folders directly below the sparta folder that are not areas. */
const TOP_LEVEL_FOLDERS = ["common", "fixtures", "scenarios", "support"];

const POLLING_METHODS = ["toPass", "toPassAndReturn", "poll", "pollAndReturn"];

/** Settings accepted under `settings.sparta`. Every key is optional; the defaults are the SPARTA standard. */
export type SpartaSettings = {
	/** Project root that the aliases resolve against. Default: the nearest folder with a `package.json`. */
	root?: string;
	/** Names of the top-level folders. Default: `{ sparta: "sparta", tests: "tests" }`. */
	folders?: { sparta?: string; tests?: string };
	/** Extra area folders, mapped to the standard area they follow, e.g. `{ web: "ui" }`. */
	areas?: Record<string, Area>;
	/** Extra layer folders, mapped to the standard layer folder they follow, e.g. `{ "page-objects": "pages" }`. */
	layers?: Record<string, LayerFolder>;
	/** Extra path aliases, mapped to the top-level folder they point to, e.g. `{ "@app/*": "sparta" }`. */
	aliases?: Record<string, TopFolder>;
	/** The module `expect` must be imported from inside the sparta folder. Default: `@sparta/support`. */
	supportModule?: string;
	/** Extra retrying methods, added to `toPass`, `toPassAndReturn`, `poll` and `pollAndReturn`. */
	pollingMethods?: string[];
	/** Extra step decorators, added to `step`. */
	stepDecorators?: string[];
	/** Extra assertion functions that tests must not call, added to `expect` and `expectly…`. */
	expectNames?: string[];
};

/** Resolved, validated settings, with the patterns the rules match file paths against. */
export interface Conventions {
	/** Identifies these conventions, for caches. */
	key: string;
	/** Explicit project root (`settings.sparta.root`), or `undefined` to detect it per file. */
	root?: string;
	spartaFolder: string;
	testsFolder: string;
	areas: ReadonlyMap<string, Area>;
	layerFolders: ReadonlyMap<string, LayerFolder>;
	/** Alias prefixes (ending in `/`), longest first. */
	aliases: readonly (readonly [prefix: string, target: TopFolder])[];
	supportModule: string;
	pollingMethods: ReadonlySet<string>;
	stepDecorators: ReadonlySet<string>;
	expectNames: ReadonlySet<string>;
	patterns: {
		/** `/<sparta>/<area>/<group>[/<folder>]`. */
		area: RegExp;
		/** `/<sparta>/<area>/<group>/<folder>/`, capturing the folder. */
		layer: RegExp;
		/** `/<sparta>/<common|fixtures|scenarios|support>/`. */
		top: RegExp;
		/** `/<sparta>/` or `/<tests>/`. */
		checked: RegExp;
		sparta: RegExp;
		tests: RegExp;
		framework: RegExp;
	};
}

const PREFIX = "[@cerios/sparta-lint-rules]";

class SettingsError extends Error {
	constructor(where: string, problem: string) {
		super(`${PREFIX} settings.sparta${where}: ${problem}`);
		this.name = "SettingsError";
	}
}

const escape = (value: string): string => value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

const distance = (a: string, b: string): number => {
	let previous = Array.from({ length: b.length + 1 }, (_, index) => index);

	for (let i = 1; i <= a.length; i++) {
		const current = [i];

		for (let j = 1; j <= b.length; j++) {
			current[j] = Math.min(previous[j] + 1, current[j - 1] + 1, previous[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
		}

		previous = current;
	}

	return previous[b.length];
};

/** `; did you mean "x"?` for the closest candidate, if it is close enough to be a typo. */
const suggest = (value: string, candidates: readonly string[]): string => {
	const [best] = candidates
		.map(candidate => ({ candidate, score: distance(value.toLowerCase(), candidate.toLowerCase()) }))
		.toSorted((a, b) => a.score - b.score);

	return best && best.score <= Math.max(2, Math.floor(best.candidate.length / 3))
		? `; did you mean ${JSON.stringify(best.candidate)}?`
		: "";
};

const isRecord = (value: unknown): value is Record<string, unknown> =>
	typeof value === "object" && value !== null && !Array.isArray(value);

function record(value: unknown, where: string): Record<string, unknown> {
	if (!isRecord(value)) throw new SettingsError(where, `must be an object, got ${JSON.stringify(value)}.`);

	return value;
}

function checkKeys(value: Record<string, unknown>, allowed: readonly string[], where: string): void {
	for (const key of Object.keys(value)) {
		if (!allowed.includes(key)) {
			throw new SettingsError(where, `unknown setting ${JSON.stringify(key)}${suggest(key, allowed)}`);
		}
	}
}

function nonEmptyString(value: unknown, where: string): string {
	if (typeof value !== "string" || value.trim() === "") {
		throw new SettingsError(where, `must be a non-empty string, got ${JSON.stringify(value)}.`);
	}

	return value;
}

function folderName(value: unknown, where: string): string {
	const name = nonEmptyString(value, where);

	if (/[/\\]/.test(name) || name === "." || name === "..") {
		throw new SettingsError(where, `must be a single folder name, got ${JSON.stringify(name)}.`);
	}

	return name;
}

function identifiers(value: unknown, where: string): string[] {
	if (!Array.isArray(value)) throw new SettingsError(where, `must be an array of names, got ${JSON.stringify(value)}.`);

	return value.map((item, index) => {
		const name = nonEmptyString(item, `${where}[${index}]`);

		if (!/^[A-Za-z_$][\w$]*$/.test(name)) {
			throw new SettingsError(`${where}[${index}]`, `must be an identifier, got ${JSON.stringify(name)}.`);
		}

		return name;
	});
}

/**
 * Maps the project's own names onto standard ones. A name that is already standard may only map onto itself,
 * and `reserved` names may not be used at all, so a setting can never turn one concept into another.
 */
function mapping<T extends string>(
	value: unknown,
	where: string,
	targets: readonly T[],
	describe: string,
	reserved: readonly string[] = []
): Map<string, T> {
	const result = new Map<string, T>();

	for (const [name, target] of Object.entries(record(value, where))) {
		const at = `${where}.${name}`;

		folderName(name, at);

		if (typeof target !== "string" || !(targets as readonly string[]).includes(target)) {
			throw new SettingsError(
				at,
				`unknown ${describe} ${JSON.stringify(target)}${typeof target === "string" ? suggest(target, targets) : ""}. Use one of: ${targets.join(", ")}.`
			);
		}

		if ((targets as readonly string[]).includes(name) && name !== target) {
			throw new SettingsError(
				at,
				`${JSON.stringify(name)} is already the standard ${describe} ${JSON.stringify(name)}.`
			);
		}

		if (reserved.includes(name)) {
			throw new SettingsError(at, `${JSON.stringify(name)} is a reserved SPARTA folder.`);
		}

		result.set(name, target as T);
	}

	return result;
}

/** `@app/*`, `@app/` and `@app` all become the prefix `@app/`. */
function aliasPrefix(alias: string, where: string): string {
	const prefix = `${alias.replace(/\/?\*?$/, "")}/`;

	if (prefix === "/" || alias.startsWith(".") || alias.startsWith("/")) {
		throw new SettingsError(where, `must be an alias such as "@app/*", got ${JSON.stringify(alias)}.`);
	}

	return prefix;
}

const SETTINGS_KEYS: readonly (keyof SpartaSettings)[] = [
	"root",
	"folders",
	"areas",
	"layers",
	"aliases",
	"supportModule",
	"pollingMethods",
	"stepDecorators",
	"expectNames",
];

function parseFolders(value: unknown): { spartaFolder: string; testsFolder: string } {
	const folders = value === undefined ? {} : record(value, ".folders");

	checkKeys(folders, ["sparta", "tests"], ".folders");

	const spartaFolder = folders.sparta === undefined ? "sparta" : folderName(folders.sparta, ".folders.sparta");
	const testsFolder = folders.tests === undefined ? "tests" : folderName(folders.tests, ".folders.tests");

	if (spartaFolder === testsFolder) {
		throw new SettingsError(
			".folders",
			`sparta and tests must be different folders, both are ${JSON.stringify(spartaFolder)}.`
		);
	}

	return { spartaFolder, testsFolder };
}

/** The standard names, each mapped onto itself, plus the project's own names. */
function withStandard<T extends string>(standard: readonly T[], custom: Map<string, T> | undefined): Map<string, T> {
	return new Map<string, T>([...standard.map(name => [name, name] as const), ...(custom ?? [])]);
}

function parseAliases(value: unknown): Map<string, TopFolder> {
	const aliases = new Map<string, TopFolder>([
		["@sparta/", "sparta"],
		["@tests/", "tests"],
	]);

	if (value === undefined) return aliases;

	for (const [alias, target] of Object.entries(record(value, ".aliases"))) {
		const at = `.aliases.${alias}`;
		const prefix = aliasPrefix(alias, at);

		if (target !== "sparta" && target !== "tests") {
			throw new SettingsError(at, `must point to "sparta" or "tests", got ${JSON.stringify(target)}.`);
		}

		if (aliases.has(prefix) && aliases.get(prefix) !== target) {
			throw new SettingsError(at, `${JSON.stringify(alias)} already points to ${JSON.stringify(aliases.get(prefix))}.`);
		}

		aliases.set(prefix, target);
	}

	return aliases;
}

/** The default names plus the configured extra ones. */
const withExtra = (defaults: readonly string[], value: unknown, where: string): Set<string> =>
	new Set([...defaults, ...(value === undefined ? [] : identifiers(value, where))]);

function buildPatterns(
	spartaFolder: string,
	testsFolder: string,
	areas: ReadonlyMap<string, Area>
): Conventions["patterns"] {
	const sparta = escape(spartaFolder);
	const tests = escape(testsFolder);
	const areaNames = [...areas.keys()].map(escape).join("|");

	return {
		area: new RegExp(`/${sparta}/(${areaNames})/([^/]+)(?:/([^/]+))?`),
		layer: new RegExp(`/${sparta}/(?:${areaNames})/[^/]+/([^/]+)/`),
		top: new RegExp(`/${sparta}/(${TOP_LEVEL_FOLDERS.join("|")})/`),
		checked: new RegExp(`/(?:${sparta}|${tests})/`),
		sparta: new RegExp(`/${sparta}/`),
		tests: new RegExp(`/${tests}/`),
		framework: new RegExp(`/${tests}/framework/`),
	};
}

const STANDARD_LAYER_FOLDERS = Object.keys(LAYER_FOLDERS) as LayerFolder[];

/**
 * Validates `settings.sparta` and resolves it against the defaults. Throws a descriptive error for anything it
 * does not understand, so a typo cannot silently weaken the checks. A relative `root` resolves against `cwd`.
 */
export function parseSettings(raw: unknown, cwd: string): Conventions {
	const settings = raw === undefined || raw === null ? {} : record(raw, "");

	checkKeys(settings, SETTINGS_KEYS, "");

	const root =
		settings.root === undefined
			? undefined
			: path.resolve(cwd, nonEmptyString(settings.root, ".root")).split("\\").join("/");
	const { spartaFolder, testsFolder } = parseFolders(settings.folders);
	const areas = withStandard(
		AREAS,
		settings.areas === undefined ? undefined : mapping(settings.areas, ".areas", AREAS, "area", TOP_LEVEL_FOLDERS)
	);
	const layerFolders = withStandard(
		STANDARD_LAYER_FOLDERS,
		settings.layers === undefined
			? undefined
			: mapping(settings.layers, ".layers", STANDARD_LAYER_FOLDERS, "layer folder", ["common"])
	);

	return {
		key: JSON.stringify(raw ?? null) + (root ?? ""),
		root,
		spartaFolder,
		testsFolder,
		areas,
		layerFolders,
		aliases: [...parseAliases(settings.aliases)].toSorted(([a], [b]) => b.length - a.length),
		supportModule:
			settings.supportModule === undefined
				? "@sparta/support"
				: nonEmptyString(settings.supportModule, ".supportModule"),
		pollingMethods: withExtra(POLLING_METHODS, settings.pollingMethods, ".pollingMethods"),
		stepDecorators: withExtra(["step"], settings.stepDecorators, ".stepDecorators"),
		expectNames: withExtra([], settings.expectNames, ".expectNames"),
		patterns: buildPatterns(spartaFolder, testsFolder, areas),
	};
}

/** The SPARTA standard, for code that runs without a linter context. */
export const DEFAULT_CONVENTIONS: Conventions = parseSettings(undefined, process.cwd());
