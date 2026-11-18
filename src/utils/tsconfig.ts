import { readFileSync, statSync } from "node:fs";
import { createRequire } from "node:module";
import path from "node:path";

/**
 * The module resolution settings of the nearest `tsconfig.json` (`compilerOptions.paths` and `baseUrl`), following
 * `extends` as TypeScript does. Only what import resolution needs is read; everything else in the config is ignored.
 */

/** One `compilerOptions.paths` entry, with its targets as absolute paths that may still contain the `*`. */
export interface PathMapping {
	/** The pattern as written, such as `@pages/*`. */
	pattern: string;
	/** The part before the `*`, or the whole pattern when it has none. */
	prefix: string;
	/** The part after the `*`; empty when the pattern has none. */
	suffix: string;
	wildcard: boolean;
	targets: string[];
}

export interface TsconfigPaths {
	/** The config file these settings were read from. */
	file: string;
	/** Absolute `baseUrl`, when one is set. */
	baseUrl?: string;
	paths: PathMapping[];
}

const normalize = (value: string): string => value.split("\\").join("/");

const CONFIG_DIR = "${configDir}";

/** Where the string or comment that starts at `index` ends (exclusive), or `undefined` when none starts there. */
function skippedEnd(text: string, index: number): number | undefined {
	const start = text.slice(index, index + 2);

	if (text[index] === '"') {
		let end = index + 1;

		while (end < text.length && text[end] !== '"') end += text[end] === "\\" ? 2 : 1;

		return end + 1;
	}

	if (start === "//") {
		const end = text.indexOf("\n", index);

		return end === -1 ? text.length : end;
	}

	if (start === "/*") {
		const end = text.indexOf("*/", index + 2);

		return end === -1 ? text.length : end + 2;
	}

	return undefined;
}

/**
 * Parses JSON with comments and trailing commas, as `tsconfig.json` allows. Comments are only recognised outside
 * strings, so `"https://..."` stays intact.
 */
export function parseJsonc(text: string): unknown {
	let out = "";
	/** Position in `out` of a comma that may still turn out to be a trailing one. */
	let pendingComma = -1;
	let index = text.charCodeAt(0) === 0xfeff ? 1 : 0;

	while (index < text.length) {
		const char = text[index];
		const end = skippedEnd(text, index);

		if (end !== undefined) {
			// Strings are kept, comments dropped.
			if (char === '"') {
				out += text.slice(index, end);
				pendingComma = -1;
			}

			index = end;
			continue;
		}

		if (char === ",") {
			pendingComma = out.length;
		} else if ((char === "}" || char === "]") && pendingComma !== -1) {
			out = `${out.slice(0, pendingComma)} ${out.slice(pendingComma + 1)}`;
			pendingComma = -1;
		} else if (!/\s/.test(char)) {
			pendingComma = -1;
		}

		out += char;
		index++;
	}

	return JSON.parse(out) as unknown;
}

const isFile = (file: string): boolean => statSync(file, { throwIfNoEntry: false })?.isFile() ?? false;

const isRecord = (value: unknown): value is Record<string, unknown> =>
	typeof value === "object" && value !== null && !Array.isArray(value);

class TsconfigError extends Error {
	constructor(file: string, message: string) {
		super(`sparta-lint-rules: cannot read ${normalize(file)}: ${message}`);
		this.name = "TsconfigError";
	}
}

function readConfig(file: string): Record<string, unknown> {
	let config: unknown;

	try {
		config = parseJsonc(readFileSync(file, "utf8"));
	} catch (error) {
		throw new TsconfigError(file, error instanceof Error ? error.message : String(error));
	}

	if (!isRecord(config)) throw new TsconfigError(file, "the config must be a JSON object.");

	return config;
}

/** The file an `extends` entry points to: a path relative to the config, or a package such as `@tsconfig/node22`. */
function resolveExtends(specifier: string, from: string): string {
	if (specifier.startsWith(".") || path.isAbsolute(specifier)) {
		const file = path.resolve(path.dirname(from), specifier);

		if (isFile(file)) return file;
		if (!file.endsWith(".json") && isFile(`${file}.json`)) return `${file}.json`;
	} else {
		const require = createRequire(from);
		const candidates = specifier.endsWith(".json") ? [specifier] : [`${specifier}/tsconfig.json`, specifier];

		for (const candidate of candidates) {
			try {
				return require.resolve(candidate);
			} catch {
				// Try the next way of naming the config.
			}
		}
	}

	throw new TsconfigError(from, `extends ${JSON.stringify(specifier)}, which cannot be found.`);
}

/** What one config (with everything it extends) sets, with paths resolved against the config that set them. */
interface Options {
	baseUrl?: string;
	paths?: { mapping: Record<string, unknown>; base: string };
}

const substitute = (value: string, configDir: string): string => value.split(CONFIG_DIR).join(configDir);

function loadOptions(file: string, configDir: string, chain: string[], read: string[]): Options {
	if (chain.includes(file)) {
		throw new TsconfigError(chain[0], `circular extends: ${[...chain, file].map(normalize).join(" -> ")}.`);
	}

	const config = readConfig(file);
	const dir = path.dirname(file);
	const parents = typeof config.extends === "string" ? [config.extends] : config.extends;
	let options: Options = {};

	read.push(file);

	if (Array.isArray(parents)) {
		for (const parent of parents) {
			if (typeof parent !== "string") continue;

			const inherited = loadOptions(resolveExtends(parent, file), configDir, [...chain, file], read);

			options = { ...options, ...inherited };
		}
	}

	const compilerOptions = isRecord(config.compilerOptions) ? config.compilerOptions : {};

	if (typeof compilerOptions.baseUrl === "string") {
		options.baseUrl = path.resolve(dir, substitute(compilerOptions.baseUrl, configDir));
	}

	if (isRecord(compilerOptions.paths)) options.paths = { mapping: compilerOptions.paths, base: dir };

	return options;
}

function toMappings(options: Options, configDir: string): PathMapping[] {
	if (!options.paths) return [];

	const base = options.baseUrl ?? options.paths.base;

	return Object.entries(options.paths.mapping).flatMap(([pattern, value]) => {
		const targets = Array.isArray(value) ? value.filter((target): target is string => typeof target === "string") : [];
		const star = pattern.indexOf("*");

		if (targets.length === 0) return [];

		return [
			{
				pattern,
				prefix: star === -1 ? pattern : pattern.slice(0, star),
				suffix: star === -1 ? "" : pattern.slice(star + 1),
				wildcard: star !== -1,
				targets: targets.map(target => normalize(path.resolve(base, substitute(target, configDir)))),
			},
		];
	});
}

/** Parsed configs per file, kept for the lifetime of the linter process and refreshed when any file in the chain changes. */
const configCache = new Map<string, { read: { file: string; mtimeMs: number }[]; value: TsconfigPaths }>();

const mtime = (file: string): number | undefined => statSync(file, { throwIfNoEntry: false })?.mtimeMs;

/** The `paths` and `baseUrl` of a config file, including what it extends. Throws for unreadable or invalid configs. */
export function loadTsconfig(file: string): TsconfigPaths {
	const cached = configCache.get(file);

	if (cached?.read.every(entry => mtime(entry.file) === entry.mtimeMs)) return cached.value;

	const configDir = path.dirname(file);
	const read: string[] = [];
	const options = loadOptions(file, configDir, [], read);
	const value: TsconfigPaths = {
		file: normalize(file),
		baseUrl: options.baseUrl === undefined ? undefined : normalize(options.baseUrl),
		paths: toMappings(options, configDir),
	};

	configCache.set(file, { read: read.map(entry => ({ file: entry, mtimeMs: mtime(entry) ?? -1 })), value });

	return value;
}

/** Nearest `tsconfig.json` per directory (`null` for none), kept for the lifetime of the linter process. */
const lookupCache = new Map<string, string | null>();

/** The nearest `tsconfig.json`, from the file's folder upwards, or `undefined` when there is none. */
export function findTsconfig(filename: string): string | undefined {
	const visited: string[] = [];
	let found: string | null | undefined;

	for (let dir = path.dirname(path.resolve(filename)); ;) {
		found = lookupCache.get(dir);
		if (found !== undefined) break;

		visited.push(dir);

		const candidate = path.join(dir, "tsconfig.json");

		if (isFile(candidate)) {
			found = candidate;
			break;
		}

		const parent = path.dirname(dir);

		if (parent === dir) {
			found = null;
			break;
		}

		dir = parent;
	}

	for (const dir of visited) lookupCache.set(dir, found);

	return found ?? undefined;
}

/** The `paths` and `baseUrl` that apply to a file, from its nearest `tsconfig.json`. */
export function tsconfigFor(filename: string): TsconfigPaths | undefined {
	const file = findTsconfig(filename);

	return file === undefined ? undefined : loadTsconfig(file);
}

/**
 * The candidate paths a `paths` entry maps a request to, as TypeScript picks them: an exact pattern first,
 * otherwise the wildcard pattern with the longest prefix. `undefined` when no pattern matches.
 */
export function matchPaths(request: string, mappings: readonly PathMapping[]): string[] | undefined {
	const exact = mappings.find(mapping => !mapping.wildcard && mapping.pattern === request);

	if (exact) return exact.targets;

	let best: PathMapping | undefined;

	for (const mapping of mappings) {
		if (
			mapping.wildcard &&
			request.length >= mapping.prefix.length + mapping.suffix.length &&
			request.startsWith(mapping.prefix) &&
			request.endsWith(mapping.suffix) &&
			(best === undefined || mapping.prefix.length > best.prefix.length)
		) {
			best = mapping;
		}
	}

	if (best === undefined) return undefined;

	const matched = request.slice(best.prefix.length, request.length - best.suffix.length);

	return best.targets.map(target => target.replace("*", matched));
}
