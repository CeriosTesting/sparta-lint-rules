import { DEFAULT_CONVENTIONS, parseSettings } from "../../src/utils/conventions";

const parse = (settings: unknown): ReturnType<typeof parseSettings> => parseSettings(settings, "/work");

/** The error message for invalid settings, or "" when they are valid. */
const errorOf = (settings: unknown): string => {
	try {
		parse(settings);
	} catch (error) {
		return (error as Error).message;
	}

	return "";
};

describe("parseSettings", () => {
	it("defaults to the SPARTA standard", () => {
		for (const settings of [undefined, null, {}]) {
			const conventions = parse(settings);

			expect(conventions.root).toBeUndefined();
			expect(conventions.spartaFolder).toBe("sparta");
			expect(conventions.testsFolder).toBe("tests");
			expect([...conventions.areas.keys()]).toEqual(["api", "database", "mobile", "ui"]);
			expect(conventions.aliases).toEqual([
				["@sparta/", "sparta"],
				["@tests/", "tests"],
			]);
			expect(conventions.supportModule).toBe("@sparta/support");
			expect([...conventions.pollingMethods]).toEqual(["toPass", "toPassAndReturn", "poll", "pollAndReturn"]);
			expect([...conventions.stepDecorators]).toEqual(["step"]);
			expect(conventions.expectNames.size).toBe(0);
		}

		expect(DEFAULT_CONVENTIONS.spartaFolder).toBe("sparta");
	});

	it("adds custom names to the standard ones", () => {
		const conventions = parse({
			areas: { web: "ui" },
			layers: { "page-objects": "pages" },
			aliases: { "@app/*": "sparta", "@e2e": "tests", "@app/deep/": "sparta" },
			pollingMethods: ["eventually"],
			stepDecorators: ["Step"],
			expectNames: ["verify"],
		});

		expect(conventions.areas.get("web")).toBe("ui");
		expect(conventions.areas.get("ui")).toBe("ui");
		expect(conventions.layerFolders.get("page-objects")).toBe("pages");
		expect(conventions.layerFolders.get("pages")).toBe("pages");
		expect(conventions.aliases[0]).toEqual(["@app/deep/", "sparta"]);
		expect(conventions.aliases).toContainEqual(["@app/", "sparta"]);
		expect(conventions.aliases).toContainEqual(["@e2e/", "tests"]);
		expect(conventions.aliases).toContainEqual(["@sparta/", "sparta"]);
		expect(conventions.pollingMethods.has("eventually")).toBe(true);
		expect(conventions.pollingMethods.has("toPass")).toBe(true);
		expect(conventions.stepDecorators).toEqual(new Set(["step", "Step"]));
		expect(conventions.expectNames).toEqual(new Set(["verify"]));
	});

	it("replaces the single values", () => {
		const conventions = parse({ root: "e2e", folders: { sparta: "src" }, supportModule: "@app/support" });

		expect(conventions.root).toMatch(/\/work\/e2e$/);
		expect(conventions.spartaFolder).toBe("src");
		expect(conventions.testsFolder).toBe("tests");
		expect(conventions.supportModule).toBe("@app/support");
	});

	it("escapes folder names in the path patterns", () => {
		const conventions = parse({ folders: { sparta: "a.b" } });

		expect(conventions.patterns.sparta.test("/p/a.b/x.ts")).toBe(true);
		expect(conventions.patterns.sparta.test("/p/axb/x.ts")).toBe(false);
	});

	it("gives the same key for the same settings", () => {
		expect(parse({ areas: { web: "ui" } }).key).toBe(parse({ areas: { web: "ui" } }).key);
		expect(parse({ areas: { web: "ui" } }).key).not.toBe(parse({}).key);
	});
});

describe("parseSettings validation", () => {
	it("prefixes errors with the package name", () => {
		expect(errorOf({ colour: "red" })).toMatch(/^\[@cerios\/sparta-lint-rules\] settings\.sparta: /);
	});

	it("rejects unknown settings, suggesting the closest one", () => {
		expect(errorOf({ layer: {} })).toContain('settings.sparta: unknown setting "layer"; did you mean "layers"?');
		expect(errorOf({ folders: { test: "specs" } })).toContain(
			'settings.sparta.folders: unknown setting "test"; did you mean "tests"?'
		);
		expect(errorOf({ colour: "red" })).toContain('settings.sparta: unknown setting "colour"');
	});

	it("rejects values of the wrong type", () => {
		expect(errorOf("sparta")).toContain('settings.sparta: must be an object, got "sparta".');
		expect(errorOf({ areas: ["web"] })).toContain("settings.sparta.areas: must be an object");
		expect(errorOf({ supportModule: "" })).toContain("settings.sparta.supportModule: must be a non-empty string");
		expect(errorOf({ pollingMethods: "eventually" })).toContain(
			"settings.sparta.pollingMethods: must be an array of names"
		);
		expect(errorOf({ stepDecorators: ["my-step"] })).toContain(
			'settings.sparta.stepDecorators[0]: must be an identifier, got "my-step".'
		);
	});

	it("only accepts single folder names", () => {
		expect(errorOf({ folders: { sparta: "src/sparta" } })).toContain(
			'settings.sparta.folders.sparta: must be a single folder name, got "src/sparta".'
		);
		expect(errorOf({ folders: { tests: ".." } })).toContain(
			"settings.sparta.folders.tests: must be a single folder name"
		);
		expect(errorOf({ folders: { sparta: "x", tests: "x" } })).toContain(
			"settings.sparta.folders: sparta and tests must be different folders"
		);
		expect(errorOf({ areas: { "web/shop": "ui" } })).toContain(
			"settings.sparta.areas.web/shop: must be a single folder name"
		);
	});

	it("only maps onto standard concepts, suggesting the closest one", () => {
		expect(errorOf({ areas: { web: "frontend" } })).toContain(
			'settings.sparta.areas.web: unknown area "frontend". Use one of: api, database, mobile, ui.'
		);
		expect(errorOf({ layers: { "page-objects": "pagez" } })).toContain(
			'settings.sparta.layers.page-objects: unknown layer folder "pagez"; did you mean "pages"?'
		);
		expect(errorOf({ aliases: { "@app/*": "src" } })).toContain(
			'settings.sparta.aliases.@app/*: must point to "sparta" or "tests", got "src".'
		);
	});

	it("never turns one standard concept into another", () => {
		expect(errorOf({ areas: { ui: "api" } })).toContain(
			'settings.sparta.areas.ui: "ui" is already the standard area "ui".'
		);
		expect(errorOf({ areas: { common: "ui" } })).toContain(
			'settings.sparta.areas.common: "common" is a reserved SPARTA folder.'
		);
		expect(errorOf({ areas: { fixtures: "api" } })).toContain(
			'settings.sparta.areas.fixtures: "fixtures" is a reserved SPARTA folder.'
		);
		expect(errorOf({ layers: { pages: "steppers" } })).toContain(
			'settings.sparta.layers.pages: "pages" is already the standard layer folder "pages".'
		);
		expect(errorOf({ aliases: { "@sparta/*": "tests" } })).toContain(
			'settings.sparta.aliases.@sparta/*: "@sparta/*" already points to "sparta".'
		);
	});

	it("allows a standard name to map onto itself", () => {
		expect(
			parse({ areas: { ui: "ui" }, layers: { pages: "pages" }, aliases: { "@sparta/*": "sparta" } }).areas.get("ui")
		).toBe("ui");
	});

	it("rejects aliases that are not module prefixes", () => {
		expect(errorOf({ aliases: { "./src": "sparta" } })).toContain(
			'settings.sparta.aliases../src: must be an alias such as "@app/*"'
		);
		expect(errorOf({ aliases: { "*": "sparta" } })).toContain(
			'settings.sparta.aliases.*: must be an alias such as "@app/*"'
		);
	});
});
