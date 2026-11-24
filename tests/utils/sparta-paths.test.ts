import path from "node:path";

import { DEFAULT_CONVENTIONS, parseSettings } from "../../src/utils/conventions";
import { rootFor } from "../../src/utils/settings";
import {
	classify,
	isLayerFile,
	layerFolder,
	normalize,
	projectPath,
	projectRoot,
	resolveImport,
} from "../../src/utils/sparta-paths";

const fixture = (relative: string): string => normalize(path.join(process.cwd(), "test-fixtures", relative));

const NESTED_PROJECT = fixture("root-detection/scripts/project");
const NESTED_FILE = `${NESTED_PROJECT}/sparta/ui/shop/pages/orders-page.ts`;

type Context = Parameters<typeof rootFor>[0];

const context = (settings: Record<string, unknown>): Context =>
	({ filename: NESTED_FILE, cwd: process.cwd(), settings }) as unknown as Context;

const CUSTOM = parseSettings(
	{
		folders: { sparta: "src", tests: "specs" },
		areas: { web: "ui" },
		layers: { "page-objects": "pages" },
		aliases: { "@app/*": "sparta" },
	},
	process.cwd()
);

describe("projectRoot", () => {
	it("is the nearest folder with a package.json, even below a folder named scripts", () => {
		expect(projectRoot(NESTED_FILE)).toBe(NESTED_PROJECT);
	});

	it("walks up past folders without a package.json", () => {
		expect(projectRoot(fixture("root-override/e2e/sparta/support/waits.ts"))).toBe(normalize(process.cwd()));
	});

	it("accepts Windows-style separators", () => {
		expect(projectRoot(NESTED_FILE.split("/").join(path.sep))).toBe(NESTED_PROJECT);
	});
});

describe("resolveImport", () => {
	const resolve = (request: string): string | undefined =>
		resolveImport(NESTED_FILE, request, NESTED_PROJECT, DEFAULT_CONVENTIONS);

	it("resolves the standard aliases against the root", () => {
		expect(resolve("@sparta/support/waits")).toBe(`${NESTED_PROJECT}/sparta/support/waits`);
		expect(resolve("@tests/data/orders")).toBe(`${NESTED_PROJECT}/tests/data/orders`);
	});

	it("resolves relative imports against the file and ignores packages", () => {
		expect(resolve("../components/card-component")).toBe(`${NESTED_PROJECT}/sparta/ui/shop/components/card-component`);
		expect(resolve("@playwright/test")).toBeUndefined();
	});

	it("resolves custom aliases into the configured folders, keeping the standard aliases", () => {
		expect(resolveImport(NESTED_FILE, "@app/support/waits", "/p", CUSTOM)).toBe("/p/src/support/waits");
		expect(resolveImport(NESTED_FILE, "@sparta/support/waits", "/p", CUSTOM)).toBe("/p/src/support/waits");
		expect(resolveImport(NESTED_FILE, "@tests/data", "/p", CUSTOM)).toBe("/p/specs/data");
	});
});

describe("resolveImport through tsconfig", () => {
	const PROJECT = fixture("tsconfig-paths");
	const FROM = `${PROJECT}/sparta/ui/shop/pages/cart-page.ts`;
	const resolve = (request: string, conventions = DEFAULT_CONVENTIONS): string | undefined =>
		resolveImport(FROM, request, PROJECT, conventions);

	it("resolves paths from the nearest tsconfig.json, including what it extends", () => {
		expect(resolve("@steppers/cart-stepper")).toBe(`${PROJECT}/sparta/ui/shop/steppers/cart-stepper`);
		expect(resolve("@support")).toBe(`${PROJECT}/sparta/support/index.ts`);
	});

	it("takes the first target that exists, or the first target when none does", () => {
		expect(resolve("@pages/cart-page")).toBe(`${PROJECT}/sparta/ui/shop/pages/cart-page`);
		expect(resolve("@pages/new-page")).toBe(`${PROJECT}/generated/pages/new-page`);
	});

	it("resolves bare imports against baseUrl only when the file exists", () => {
		expect(resolve("sparta/ui/admin/pages/users-page")).toBe(`${PROJECT}/sparta/ui/admin/pages/users-page`);
		expect(resolve("sparta/ui/admin")).toBe(`${PROJECT}/sparta/ui/admin`);
		expect(resolve("sparta/ui/admin/pages/missing-page")).toBeUndefined();
		expect(resolve("@playwright/test")).toBeUndefined();
	});

	it("keeps the standard aliases", () => {
		expect(resolve("@sparta/support/waits")).toBe(`${PROJECT}/sparta/support/waits`);
	});

	it("prefers existing tsconfig targets over settings aliases, and settings aliases over missing targets", () => {
		const conventions = parseSettings({ aliases: { "@pages/*": "sparta" } }, process.cwd());

		expect(resolve("@pages/cart-page", conventions)).toBe(`${PROJECT}/sparta/ui/shop/pages/cart-page`);
		expect(resolve("@pages/new-page", conventions)).toBe(`${PROJECT}/sparta/new-page`);
	});
});

describe("classify with settings", () => {
	it("treats a custom area like its standard area, but as its own area folder", () => {
		expect(classify("/p/src/web/shop/page-objects/cart-page.ts", CUSTOM, "/p")).toEqual({
			kind: "group",
			area: "ui",
			areaFolder: "web",
			group: "shop",
			layer: "page",
		});
	});

	it("keeps the standard names working", () => {
		expect(classify("/p/src/ui/shop/pages/cart-page.ts", CUSTOM, "/p")?.layer).toBe("page");
		expect(classify("/p/specs/orders.spec.ts", CUSTOM, "/p")).toEqual({ kind: "test" });
		expect(classify("/p/specs/framework/helper.ts", CUSTOM, "/p")).toBeUndefined();
		expect(classify("/p/src/fixtures/test-fixture.ts", CUSTOM, "/p")).toEqual({ kind: "fixture" });
	});

	it("only looks inside the configured top-level folders", () => {
		expect(classify("/p/sparta/ui/shop/pages/cart-page.ts", CUSTOM, "/p")).toBeUndefined();
		expect(classify("/p/tests/orders.spec.ts", CUSTOM, "/p")).toBeUndefined();
	});

	it("maps custom layer folders onto the standard folder and its suffix", () => {
		expect(layerFolder("/p/src/web/shop/page-objects/cart-page.ts", CUSTOM, "/p")).toEqual({
			name: "page-objects",
			standard: "pages",
		});
		expect(layerFolder("/p/src/web/shop/helpers/format.ts", CUSTOM, "/p")).toEqual({
			name: "helpers",
			standard: undefined,
		});
		expect(isLayerFile("/p/src/web/shop/page-objects/cart-page.ts", CUSTOM, "/p")).toBe(true);
		expect(isLayerFile("/p/src/web/shop/helpers/format.ts", CUSTOM, "/p")).toBe(false);
	});
});

describe("builders and directors", () => {
	const DATA = parseSettings({ areas: { web: "ui" }, layers: { "data-builders": "builders" } }, process.cwd());

	it("classifies the builders and directors folders of an area as area layers", () => {
		expect(classify("/p/sparta/api/builders/order-builder.ts", DEFAULT_CONVENTIONS, "/p")).toEqual({
			kind: "area-layer",
			area: "api",
			areaFolder: "api",
			layer: "builder",
		});
		expect(classify("/p/sparta/ui/directors/cart-director.ts", DEFAULT_CONVENTIONS, "/p")).toEqual({
			kind: "area-layer",
			area: "ui",
			areaFolder: "ui",
			layer: "director",
		});
		expect(classify("/p/sparta/api/builders", DEFAULT_CONVENTIONS, "/p")?.kind).toBe("area-layer");
	});

	it("follows custom areas and custom layer folders", () => {
		expect(classify("/p/sparta/web/data-builders/cart-builder.ts", DATA, "/p")).toEqual({
			kind: "area-layer",
			area: "ui",
			areaFolder: "web",
			layer: "builder",
		});
		expect(layerFolder("/p/sparta/web/data-builders/cart-builder.ts", DATA, "/p")).toEqual({
			name: "data-builders",
			standard: "builders",
		});
	});

	it("gives the area folder as the layer folder, also for files in a subfolder", () => {
		expect(layerFolder("/p/sparta/api/builders/order-builder.ts", DEFAULT_CONVENTIONS, "/p")).toEqual({
			name: "builders",
			standard: "builders",
		});
		expect(layerFolder("/p/sparta/api/builders/orders/order-builder.ts", DEFAULT_CONVENTIONS, "/p")?.name).toBe(
			"builders"
		);
		expect(isLayerFile("/p/sparta/api/directors/order-director.ts", DEFAULT_CONVENTIONS, "/p")).toBe(true);
	});

	it("classifies desktop windows like ui pages", () => {
		expect(classify("/p/sparta/desktop/app/windows/main-window.ts", DEFAULT_CONVENTIONS, "/p")).toEqual({
			kind: "group",
			area: "desktop",
			areaFolder: "desktop",
			group: "app",
			layer: "window",
		});
	});

	it("keeps builders in a group folder classified as that group", () => {
		expect(classify("/p/sparta/ui/shop/builders/cart-builder.ts", DEFAULT_CONVENTIONS, "/p")).toEqual({
			kind: "group",
			area: "ui",
			areaFolder: "ui",
			group: "shop",
			layer: "builder",
		});
		expect(classify("/p/sparta/api/salesforce/builders/brp/case-builder.ts", DEFAULT_CONVENTIONS, "/p")?.layer).toBe(
			"builder"
		);
	});

	it("keeps builders in an area's common folder classified as area common", () => {
		expect(classify("/p/sparta/api/common/directors/order-director.ts", DEFAULT_CONVENTIONS, "/p")).toEqual({
			kind: "area-common",
			area: "api",
			areaFolder: "api",
			group: "common",
			layer: "director",
		});
	});

	it("classifies the builders and directors folders of sparta/common as shared layers", () => {
		expect(classify("/p/sparta/common/builders/person-builder.ts", DEFAULT_CONVENTIONS, "/p")).toEqual({
			kind: "shared",
			layer: "builder",
		});
		expect(classify("/p/sparta/common/directors/person-director.ts", DEFAULT_CONVENTIONS, "/p")).toEqual({
			kind: "shared",
			layer: "director",
		});
		expect(classify("/p/sparta/common/builders", DEFAULT_CONVENTIONS, "/p")?.layer).toBe("builder");
		expect(classify("/p/sparta/common/helpers.ts", DEFAULT_CONVENTIONS, "/p")).toEqual({ kind: "shared" });
		expect(classify("/p/sparta/common/steppers/x-stepper.ts", DEFAULT_CONVENTIONS, "/p")).toEqual({ kind: "shared" });
		expect(classify("/p/sparta/support/builders/x-builder.ts", DEFAULT_CONVENTIONS, "/p")).toEqual({ kind: "shared" });
		expect(classify("/p/sparta/common/data-builders/x-builder.ts", DATA, "/p")?.layer).toBe("builder");
	});

	it("gives the builders and directors folders of sparta/common as layer folders", () => {
		expect(layerFolder("/p/sparta/common/builders/people/person-builder.ts", DEFAULT_CONVENTIONS, "/p")).toEqual({
			name: "builders",
			standard: "builders",
		});
		expect(layerFolder("/p/sparta/common/data-builders/person-builder.ts", DATA, "/p")).toEqual({
			name: "data-builders",
			standard: "builders",
		});
		expect(layerFolder("/p/sparta/common/helpers.ts", DEFAULT_CONVENTIONS, "/p")).toBeUndefined();
		expect(isLayerFile("/p/sparta/common/directors/person-director.ts", DEFAULT_CONVENTIONS, "/p")).toBe(true);
	});
});

describe("classify below the project root", () => {
	const classifyIn = (root: string, relative: string): ReturnType<typeof classify> =>
		classify(`${root}/${relative}`, DEFAULT_CONVENTIONS, root);

	it("ignores SPARTA folder names above the root", () => {
		expect(classifyIn("C:/work/tests/shop-e2e", "sparta/ui/shop/pages/cart-page.ts")).toEqual({
			kind: "group",
			area: "ui",
			areaFolder: "ui",
			group: "shop",
			layer: "page",
		});
		expect(classifyIn("D:/sparta/ui/proj", "sparta/api/orders/clients/orders-client.ts")?.layer).toBe("client");
		expect(classifyIn("/home/runner/work/sparta/sparta", "tests/orders.spec.ts")).toEqual({ kind: "test" });
	});

	it("still finds the SPARTA folders in a subfolder of the root", () => {
		expect(classifyIn("/repo", "e2e/sparta/ui/shop/pages/cart-page.ts")?.layer).toBe("page");
	});

	it("ignores files outside the root", () => {
		expect(classify("/other/sparta/ui/shop/pages/cart-page.ts", DEFAULT_CONVENTIONS, "/repo")).toBeUndefined();
		expect(classify("/repo-2/sparta/ui/shop/pages/cart-page.ts", DEFAULT_CONVENTIONS, "/repo")).toBeUndefined();
	});

	it("accepts a root with a trailing slash", () => {
		expect(classify("C:/sparta/ui/shop/pages/cart-page.ts", DEFAULT_CONVENTIONS, "C:/")?.layer).toBe("page");
	});

	it("recognises base layers imported with a .js extension", () => {
		expect(classifyIn("/repo", "sparta/api/common/http-base-client.js")?.layer).toBe("base-client");
	});
});

describe("projectPath", () => {
	it("is the path below the root, with a leading slash", () => {
		expect(projectPath("/repo/sparta/a.ts", "/repo")).toBe("/sparta/a.ts");
		expect(projectPath("C:\\repo\\sparta\\a.ts", "C:/repo")).toBe("/sparta/a.ts");
		expect(projectPath("/repo", "/repo")).toBeUndefined();
	});

	it("compares case-insensitively on Windows only", () => {
		expect(projectPath("c:/Repo/sparta/a.ts", "C:/repo")).toBe(
			process.platform === "win32" ? "/sparta/a.ts" : undefined
		);
	});
});

describe("rootFor", () => {
	it("detects the root when settings.sparta.root is not set", () => {
		expect(rootFor(context({}))).toBe(NESTED_PROJECT);
		expect(rootFor(context({ sparta: {} }))).toBe(NESTED_PROJECT);
	});

	it("uses settings.sparta.root, resolving relative paths against the working directory", () => {
		expect(rootFor(context({ sparta: { root: "test-fixtures/root-override/e2e" } }))).toBe(
			fixture("root-override/e2e")
		);
	});

	it("rejects a settings.sparta.root that is not a non-empty string", () => {
		expect(() => rootFor(context({ sparta: { root: 5 } }))).toThrow("settings.sparta.root: must be a non-empty string");
		expect(() => rootFor(context({ sparta: { root: "" } }))).toThrow(
			"settings.sparta.root: must be a non-empty string"
		);
	});
});
