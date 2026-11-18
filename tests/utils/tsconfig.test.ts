import { mkdirSync, mkdtempSync, realpathSync, rmSync, utimesSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";

import { normalize } from "../../src/utils/sparta-paths";
import { findTsconfig, loadTsconfig, matchPaths, parseJsonc } from "../../src/utils/tsconfig";
import type { PathMapping } from "../../src/utils/tsconfig";

const projects: string[] = [];

/** Writes the files to a new temporary folder and returns its normalized path. */
function project(files: Record<string, string | object>): string {
	const dir = normalize(realpathSync.native(mkdtempSync(path.join(tmpdir(), "sparta-tsconfig-"))));

	projects.push(dir);
	write(dir, files);

	return dir;
}

function write(dir: string, files: Record<string, string | object>): void {
	for (const [file, content] of Object.entries(files)) {
		const target = path.join(dir, file);

		mkdirSync(path.dirname(target), { recursive: true });
		writeFileSync(target, typeof content === "string" ? content : JSON.stringify(content));
	}
}

afterAll(() => {
	for (const dir of projects) rmSync(dir, { recursive: true, force: true });
});

const targetsOf = (dir: string, file = "tsconfig.json"): Record<string, string[]> =>
	Object.fromEntries(loadTsconfig(path.join(dir, file)).paths.map(mapping => [mapping.pattern, mapping.targets]));

describe("parseJsonc", () => {
	it("accepts comments and trailing commas", () => {
		const text = `﻿{
			// line comment
			"a": [1, 2,], /* block
			comment */
			"b": { "c": true, },
		}`;

		expect(parseJsonc(text)).toEqual({ a: [1, 2], b: { c: true } });
	});

	it("leaves comment markers and commas inside strings alone", () => {
		expect(parseJsonc(`{ "url": "https://example.com/*x*/", "quote": "a\\"//b", "list": ",]" }`)).toEqual({
			url: "https://example.com/*x*/",
			quote: 'a"//b',
			list: ",]",
		});
	});

	it("throws for invalid JSON", () => {
		expect(() => parseJsonc(`{ "a": }`)).toThrow(SyntaxError);
	});
});

describe("loadTsconfig", () => {
	it("resolves paths against baseUrl", () => {
		const dir = project({
			"tsconfig.json": { compilerOptions: { baseUrl: "./src", paths: { "@app/*": ["app/*"], "@one": ["one.ts"] } } },
		});

		expect(loadTsconfig(`${dir}/tsconfig.json`).baseUrl).toBe(`${dir}/src`);
		expect(targetsOf(dir)).toEqual({ "@app/*": [`${dir}/src/app/*`], "@one": [`${dir}/src/one.ts`] });
	});

	it("resolves paths without baseUrl against the config that declares them", () => {
		const dir = project({
			"configs/paths.json": { compilerOptions: { paths: { "@lib/*": ["../lib/*"] } } },
			"tsconfig.json": { extends: "./configs/paths" },
		});

		expect(loadTsconfig(`${dir}/tsconfig.json`).baseUrl).toBeUndefined();
		expect(targetsOf(dir)).toEqual({ "@lib/*": [`${dir}/lib/*`] });
	});

	it("resolves inherited baseUrl against its own config and uses it for the paths of the extending config", () => {
		const dir = project({
			"configs/base.json": { compilerOptions: { baseUrl: "..", paths: { "@old/*": ["old/*"] } } },
			"tsconfig.json": { extends: "./configs/base.json", compilerOptions: { paths: { "@new/*": ["new/*"] } } },
		});

		expect(loadTsconfig(`${dir}/tsconfig.json`).baseUrl).toBe(dir);
		expect(targetsOf(dir)).toEqual({ "@new/*": [`${dir}/new/*`] });
	});

	it("lets later entries of an extends array win", () => {
		const dir = project({
			"a.json": { compilerOptions: { paths: { "@a/*": ["a/*"] } } },
			"b.json": { compilerOptions: { paths: { "@b/*": ["b/*"] } } },
			"tsconfig.json": { extends: ["./a.json", "./b.json"] },
		});

		expect(targetsOf(dir)).toEqual({ "@b/*": [`${dir}/b/*`] });
	});

	it("replaces ${configDir} with the folder of the config in use", () => {
		const dir = project({
			"shared/tsconfig.json": { compilerOptions: { paths: { "@src/*": ["${configDir}/src/*"] } } },
			"app/tsconfig.json": { extends: "../shared/tsconfig.json" },
		});

		expect(targetsOf(dir, "app/tsconfig.json")).toEqual({ "@src/*": [`${dir}/app/src/*`] });
	});

	it("extends configs from packages", () => {
		const dir = project({
			"node_modules/@acme/tsconfig/package.json": { name: "@acme/tsconfig" },
			"node_modules/@acme/tsconfig/tsconfig.json": { compilerOptions: { paths: { "@pkg/*": ["./src/*"] } } },
			"node_modules/@acme/tsconfig/strict.json": { compilerOptions: { paths: { "@strict/*": ["./src/*"] } } },
			"tsconfig.json": { extends: "@acme/tsconfig" },
			"strict/tsconfig.json": { extends: "@acme/tsconfig/strict.json" },
		});
		const pkg = `${dir}/node_modules/@acme/tsconfig`;

		expect(targetsOf(dir)).toEqual({ "@pkg/*": [`${pkg}/src/*`] });
		expect(targetsOf(dir, "strict/tsconfig.json")).toEqual({ "@strict/*": [`${pkg}/src/*`] });
	});

	it("skips paths entries without string targets", () => {
		const dir = project({ "tsconfig.json": { compilerOptions: { paths: { "@a/*": [], "@b/*": [1], "@c/*": "c" } } } });

		expect(targetsOf(dir)).toEqual({});
	});

	it("throws a descriptive error for invalid JSON", () => {
		const dir = project({ "tsconfig.json": `{ "compilerOptions": ` });

		expect(() => loadTsconfig(`${dir}/tsconfig.json`)).toThrow(`cannot read ${dir}/tsconfig.json`);
	});

	it("throws for configs that are not objects", () => {
		const dir = project({ "tsconfig.json": `[]` });

		expect(() => loadTsconfig(`${dir}/tsconfig.json`)).toThrow("the config must be a JSON object");
	});

	it("throws for an extends that cannot be found", () => {
		const dir = project({ "tsconfig.json": { extends: "./missing.json" }, "pkg/tsconfig.json": { extends: "nope" } });

		expect(() => loadTsconfig(`${dir}/tsconfig.json`)).toThrow(`extends "./missing.json", which cannot be found`);
		expect(() => loadTsconfig(`${dir}/pkg/tsconfig.json`)).toThrow(`extends "nope", which cannot be found`);
	});

	it("throws for circular extends", () => {
		const dir = project({ "tsconfig.json": { extends: "./other.json" }, "other.json": { extends: "./tsconfig.json" } });

		expect(() => loadTsconfig(`${dir}/tsconfig.json`)).toThrow("circular extends");
	});

	it("rereads a config when a file in its extends chain changes", () => {
		const dir = project({
			"base.json": { compilerOptions: { paths: { "@a/*": ["a/*"] } } },
			"tsconfig.json": { extends: "./base.json" },
		});

		expect(targetsOf(dir)).toEqual({ "@a/*": [`${dir}/a/*`] });

		write(dir, { "base.json": { compilerOptions: { paths: { "@b/*": ["b/*"] } } } });
		utimesSync(`${dir}/base.json`, new Date(), new Date(Date.now() + 60_000));

		expect(targetsOf(dir)).toEqual({ "@b/*": [`${dir}/b/*`] });
	});
});

describe("findTsconfig", () => {
	it("finds the nearest tsconfig.json upwards", () => {
		const dir = project({ "tsconfig.json": {}, "packages/app/tsconfig.json": {} });

		expect(normalize(findTsconfig(`${dir}/packages/app/src/deep/file.ts`) ?? "")).toBe(
			`${dir}/packages/app/tsconfig.json`
		);
		expect(normalize(findTsconfig(`${dir}/packages/lib/file.ts`) ?? "")).toBe(`${dir}/tsconfig.json`);
	});
});

describe("matchPaths", () => {
	const mapping = (pattern: string, ...targets: string[]): PathMapping => {
		const star = pattern.indexOf("*");

		return {
			pattern,
			prefix: star === -1 ? pattern : pattern.slice(0, star),
			suffix: star === -1 ? "" : pattern.slice(star + 1),
			wildcard: star !== -1,
			targets,
		};
	};

	const MAPPINGS = [
		mapping("*", "/p/types/*"),
		mapping("@app/*", "/p/src/*"),
		mapping("@app/pages/*", "/p/src/ui/pages/*", "/p/gen/pages/*"),
		mapping("@app/config", "/p/config.ts"),
		mapping("@icons/*.svg", "/p/icons/*.svg"),
	];

	it("prefers an exact pattern, then the longest prefix", () => {
		expect(matchPaths("@app/config", MAPPINGS)).toEqual(["/p/config.ts"]);
		expect(matchPaths("@app/pages/cart", MAPPINGS)).toEqual(["/p/src/ui/pages/cart", "/p/gen/pages/cart"]);
		expect(matchPaths("@app/steppers/cart", MAPPINGS)).toEqual(["/p/src/steppers/cart"]);
		expect(matchPaths("lodash", MAPPINGS)).toEqual(["/p/types/lodash"]);
	});

	it("matches the suffix after the wildcard", () => {
		expect(matchPaths("@icons/cart.svg", MAPPINGS)).toEqual(["/p/icons/cart.svg"]);
	});

	it("returns undefined when nothing matches", () => {
		expect(matchPaths("@other/x", [mapping("@app/*", "/p/src/*")])).toBeUndefined();
	});
});
