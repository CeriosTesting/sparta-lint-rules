import { existsSync, statSync } from "node:fs";
import path from "node:path";

import { AREA_LAYER_FOLDERS, LAYER_FOLDERS } from "./conventions";
import type { Area, Conventions, LayerFolder } from "./conventions";
import { matchPaths, tsconfigFor } from "./tsconfig";

export type { Area } from "./conventions";

/**
 * File classification for the SPARTA folder conventions (names shown with their defaults; see `conventions.ts`):
 *
 * - `sparta/{api,database,desktop,mobile,ui}/<group>/<layer folder>/` holds the layers of one group.
 * - `sparta/{api,database,desktop,mobile,ui}/common/` is shared within an area.
 * - `sparta/<area>/builders/` and `sparta/<area>/directors/` hold the area's builders and directors, which its
 *   groups share.
 * - `mobile` and `desktop` are structured like `ui`, with `screens/` and `windows/` in place of `pages/`.
 * - `sparta/scenarios/`, `sparta/fixtures/`, `sparta/common/` and `sparta/support/` are top level.
 * - `tests/` holds the tests, except `tests/framework/`, which is never checked.
 * - `@sparta/*` and `@tests/*` are path aliases for `<root>/sparta/` and `<root>/tests/`, where the root is the
 *   nearest folder with a `package.json`, or `settings.sparta.root` when that is set.
 * - Imports also resolve through `compilerOptions.paths` and `baseUrl` of the nearest `tsconfig.json`.
 */

export type Kind = "group" | "area-common" | "area-layer" | "top-scenario" | "fixture" | "shared" | "test";

export interface FileInfo {
	kind: Kind;
	/** The standard area the file's area follows, which decides the layer rules. */
	area?: Area;
	/** The area folder as it appears in the project, which decides isolation. */
	areaFolder?: string;
	group?: string;
	layer?: string;
}

export const normalize = (value: string): string => value.split("\\").join("/");

const TOP_LEVEL_KINDS: Record<string, Kind> = { fixtures: "fixture", scenarios: "top-scenario" };

/** The standard layer folder that a project's folder name follows, if any. */
const standardFolder = (conventions: Conventions, folder: string | undefined): LayerFolder | undefined =>
	folder === undefined ? undefined : conventions.layerFolders.get(folder);

/** The layer of a standard layer folder (`stepper` for `steppers`), if it has one. */
const layerOf = (standard: LayerFolder | undefined): string | undefined =>
	standard === undefined ? undefined : (LAYER_FOLDERS[standard] as { layer?: string }).layer;

export interface LayerFolderInfo {
	/** The folder name as it appears in the project. */
	name: string;
	/** The standard layer folder it follows, or `undefined` for folders SPARTA does not know. */
	standard?: LayerFolder;
}

/** The area-level layer folder (`builders/`, `directors/` directly below an area) a project path is in, if any. */
const areaLayerFolder = (file: string, conventions: Conventions): LayerFolderInfo | undefined => {
	const name = file.match(conventions.patterns.area)?.[2];
	const standard = standardFolder(conventions, name);

	return name !== undefined && standard !== undefined && AREA_LAYER_FOLDERS.has(standard)
		? { name, standard }
		: undefined;
};

const caseInsensitivePaths = process.platform === "win32";

/**
 * The part of `filename` below the project `root`, with a leading `/` (`/sparta/ui/...`), or `undefined` for files
 * outside the root. Only this part is matched against the SPARTA folder names, so folders above the project (such
 * as a checkout inside a folder named `tests`) never change how a file is classified.
 */
export function projectPath(filename: string, root: string): string | undefined {
	const file = normalize(filename);
	const base = normalize(root).replace(/\/$/, "");
	const prefix = file.slice(0, base.length);
	const inRoot = caseInsensitivePaths ? prefix.toLowerCase() === base.toLowerCase() : prefix === base;

	return inRoot && file[base.length] === "/" ? file.slice(base.length) : undefined;
}

/** What a file is in the SPARTA architecture, judged by its path below `root`. */
export function classify(filename: string, conventions: Conventions, root: string): FileInfo | undefined {
	const file = projectPath(filename, root);
	const { patterns } = conventions;

	if (file === undefined || patterns.framework.test(file)) return undefined;
	if (patterns.tests.test(file)) return { kind: "test" };

	const area = file.match(patterns.area);

	if (area) {
		const [, areaName, group, folder] = area;
		const areaLayer = areaLayerFolder(file, conventions);

		if (areaLayer) {
			return {
				kind: "area-layer",
				area: conventions.areas.get(areaName),
				areaFolder: areaName,
				layer: layerOf(areaLayer.standard),
			};
		}

		const base = file.match(/-base-(client|repository|service)(?:\.[cm]?[jt]s)?$/)?.[1];
		const layer = base ? `base-${base}` : layerOf(standardFolder(conventions, folder));

		return {
			kind: group === "common" ? "area-common" : "group",
			area: conventions.areas.get(areaName),
			areaFolder: areaName,
			group,
			layer,
		};
	}

	const top = file.match(patterns.top)?.[1];

	return top ? { kind: TOP_LEVEL_KINDS[top] ?? "shared" } : undefined;
}

/** Project root per directory, kept for the lifetime of the linter process. */
const rootCache = new Map<string, string>();

/**
 * The project root of a file: the nearest directory, from the file upwards, that contains a `package.json`.
 * Falls back to the working directory when there is none.
 */
export function projectRoot(filename: string): string {
	const visited: string[] = [];
	let root: string | undefined;

	for (let dir = path.dirname(path.resolve(filename)); ;) {
		root = rootCache.get(dir);
		if (root !== undefined) break;

		visited.push(dir);

		if (existsSync(path.join(dir, "package.json"))) {
			root = normalize(dir);
			break;
		}

		const parent = path.dirname(dir);

		if (parent === dir) {
			root = normalize(process.cwd());
			break;
		}

		dir = parent;
	}

	for (const dir of visited) rootCache.set(dir, root);

	return root;
}

/** The extensions tried, in order, to find the file behind an extension-less import. */
const MODULE_EXTENSIONS = ["", ".ts", ".tsx", ".mts", ".cts", "/index.ts"];

const isFile = (file: string): boolean => statSync(file, { throwIfNoEntry: false })?.isFile() ?? false;

/** The TypeScript file an import path points to (`./x` -> `./x.ts`, `./x.js` -> `./x.ts`), if it exists. */
export function moduleFile(base: string): string | undefined {
	const stripped = base.replace(/\.(?:m|c)?js$/, "");

	for (const candidate of [base, ...MODULE_EXTENSIONS.map(extension => `${stripped}${extension}`)]) {
		if (isFile(candidate)) return normalize(candidate);
	}

	return undefined;
}

/** True when an import path points to an existing file or folder. */
const moduleExists = (base: string): boolean =>
	(statSync(base, { throwIfNoEntry: false })?.isDirectory() ?? false) || moduleFile(base) !== undefined;

/**
 * Resolves an import to an absolute, normalized path, the way TypeScript would:
 *
 * 1. relative imports, against the importing file;
 * 2. `compilerOptions.paths` of the nearest `tsconfig.json`, taking the first target that exists;
 * 3. the `@sparta/*` and `@tests/*` aliases and `settings.sparta.aliases`, against `root`;
 * 4. the first `paths` target when none exists (yet);
 * 5. `compilerOptions.baseUrl`, only when the file exists, so package imports are not mistaken for project files.
 *
 * Other imports (packages) resolve to `undefined`.
 */
export function resolveImport(
	filename: string,
	request: string,
	root: string,
	conventions: Conventions
): string | undefined {
	if (request.startsWith(".")) return normalize(path.resolve(path.dirname(filename), request));

	const tsconfig = tsconfigFor(filename);
	const mapped = tsconfig === undefined ? undefined : matchPaths(request, tsconfig.paths);
	const existing = mapped?.find(moduleExists);

	if (existing !== undefined) return existing;

	for (const [prefix, target] of conventions.aliases) {
		if (request.startsWith(prefix)) {
			const folder = target === "sparta" ? conventions.spartaFolder : conventions.testsFolder;

			return `${root}/${folder}/${request.slice(prefix.length)}`;
		}
	}

	if (mapped !== undefined && mapped.length > 0) return mapped[0];

	const fromBaseUrl = tsconfig?.baseUrl === undefined ? undefined : `${tsconfig.baseUrl}/${request}`;

	return fromBaseUrl !== undefined && moduleExists(fromBaseUrl) ? fromBaseUrl : undefined;
}

/**
 * The layer folder a file lives in (`steppers`, `pages`, ...), with `sparta/scenarios/` counting as `scenarios`
 * and `sparta/<area>/builders/` and `directors/` as themselves.
 */
export const layerFolder = (filename: string, conventions: Conventions, root: string): LayerFolderInfo | undefined => {
	const file = projectPath(filename, root);

	if (file === undefined) return undefined;
	if (file.match(conventions.patterns.top)?.[1] === "scenarios") return { name: "scenarios", standard: "scenarios" };

	const areaLayer = areaLayerFolder(file, conventions);

	if (areaLayer) return areaLayer;

	const folder = file.match(conventions.patterns.layer)?.[1];

	return folder === undefined ? undefined : { name: folder, standard: standardFolder(conventions, folder) };
};

/** The file name suffix the files in a layer folder must use (`stepper` for `steppers/`), if it has one. */
export const layerSuffix = (folder: LayerFolderInfo | undefined): string | undefined =>
	folder?.standard === undefined ? undefined : (LAYER_FOLDERS[folder.standard] as { suffix?: string }).suffix;

/** The file name without its TypeScript extension: `orders-stepper` for `orders-stepper.ts` or `.mts`. */
export const moduleName = (filename: string): string => path.basename(filename).replace(/\.[cm]?tsx?$/, "");

/** `.d.ts`, `.d.mts` and `.d.cts` files, which only declare types. */
export const isDeclarationFile = (filename: string): boolean => /\.d\.[cm]?ts$/.test(filename);

/** True for files that follow the layer naming convention (layer folders and fixtures). */
export const isLayerFile = (filename: string, conventions: Conventions, root: string): boolean =>
	layerSuffix(layerFolder(filename, conventions, root)) !== undefined ||
	projectPath(filename, root)?.match(conventions.patterns.top)?.[1] === "fixtures";
