import { staticString, stringValue } from "../utils/ast";
import { isStaticClass, topLevelClasses } from "../utils/class-members";
import type { Conventions } from "../utils/conventions";
import { docsUrl } from "../utils/docs";
import { conventionsFor, rootFor } from "../utils/settings";
import { classify, layerFolder, moduleName, resolveImport } from "../utils/sparta-paths";
import type { Area, FileInfo, Kind } from "../utils/sparta-paths";
import type { AstNode, Rule } from "../utils/types";

type OrchestrationKind = Extract<Kind, "top-scenario" | "test">;

const DATABASE_LAYERS = [
	"asserter",
	"base-repository",
	"base-service",
	"container",
	"database",
	"repository",
	"scenario",
	"service",
	"stepper",
];

/** The UI layers; `view` is the area's name for a page (`page` for web, `screen` for mobile, `window` for desktop). */
const uiLayers = (view: "page" | "screen" | "window"): Record<string, Set<string>> => ({
	component: new Set([view, "stepper", "asserter", "scenario"]),
	[view]: new Set(["stepper", "asserter", "scenario"]),
	stepper: new Set(["asserter", "scenario"]),
	asserter: new Set(["stepper", "asserter", "scenario"]),
	scenario: new Set([view, "component"]),
});

/** Forbidden target layers inside the same area (API -> API, UI -> UI, database -> database, and so on). */
const FORBIDDEN_LAYERS: Record<Area, Record<string, Set<string>>> = {
	api: {
		client: new Set(["client", "service", "base-service", "stepper", "asserter", "scenario"]),
		"base-client": new Set(["client", "base-client", "service", "base-service", "stepper", "asserter", "scenario"]),
		service: new Set(["service", "stepper", "asserter", "scenario"]),
		"base-service": new Set(["service", "base-service", "stepper", "asserter", "scenario"]),
		stepper: new Set(["client", "base-client", "asserter", "scenario"]),
		asserter: new Set(["stepper", "asserter", "scenario"]),
		scenario: new Set(["service", "base-service", "client", "base-client"]),
	},
	database: {
		repository: new Set(["service", "base-service", "stepper", "asserter", "scenario"]),
		"base-repository": new Set([
			"repository",
			"base-repository",
			"service",
			"base-service",
			"stepper",
			"asserter",
			"scenario",
		]),
		service: new Set(["service", "stepper", "asserter", "scenario"]),
		"base-service": new Set(["service", "base-service", "stepper", "asserter", "scenario"]),
		database: new Set(DATABASE_LAYERS),
		container: new Set(DATABASE_LAYERS.filter(layer => layer !== "database")),
		stepper: new Set(["repository", "base-repository", "asserter", "scenario"]),
		asserter: new Set(["repository", "base-repository", "stepper", "asserter", "scenario"]),
		scenario: new Set(["service", "base-service", "repository", "base-repository"]),
	},
	desktop: uiLayers("window"),
	mobile: uiLayers("screen"),
	ui: uiLayers("page"),
};

/** The layers of `sparta/<area>/builders/` and `sparta/<area>/directors/`. */
const BUILDER_LAYERS = new Set(["builder", "director"]);

/** The only group layers that may use their area's builders and directors. */
const BUILDER_USERS = new Set(["scenario", "stepper", "asserter", "service"]);

const DATABASE_ACCESS = ["repository", "base-repository", "service", "base-service", "container", "database"];

/** Layers that code orchestrating flows (top-level scenarios, tests) must not touch directly. */
const FORBIDDEN_FOR_ORCHESTRATION: Record<OrchestrationKind, Record<Area, Set<string>>> = {
	"top-scenario": {
		api: new Set(["client", "base-client", "service", "base-service"]),
		database: new Set(DATABASE_ACCESS),
		desktop: new Set(["window", "component"]),
		mobile: new Set(["screen", "component"]),
		ui: new Set(["page", "component"]),
	},
	test: {
		api: new Set(["client", "base-client", "service", "base-service", "stepper", "asserter"]),
		database: new Set([...DATABASE_ACCESS, "stepper", "asserter"]),
		desktop: new Set(["window", "component", "stepper", "asserter"]),
		mobile: new Set(["screen", "component", "stepper", "asserter"]),
		ui: new Set(["page", "component", "stepper", "asserter"]),
	},
};

const REEXPORT_LAYERS = new Set([
	"asserter",
	"builder",
	"client",
	"base-client",
	"base-repository",
	"component",
	"director",
	"page",
	"repository",
	"scenario",
	"screen",
	"service",
	"base-service",
	"stepper",
	"window",
]);

const describe = (info: FileInfo, { spartaFolder, testsFolder }: Conventions): string =>
	({
		group: `${info.areaFolder}${info.group === undefined ? "" : `/${info.group}`}${info.layer ? ` ${info.layer}` : ""}`,
		"area-common": `${info.areaFolder}/common`,
		"area-layer": `${info.areaFolder} ${info.layer}`,
		"top-scenario": `${spartaFolder}/scenarios`,
		fixture: `${spartaFolder}/fixtures`,
		shared: `${spartaFolder}/common|support`,
		test: testsFolder,
	})[info.kind];

/** Whether code in an area folder (a group, or the area's builders and directors) may not depend on `target`. */
function areaIsolationViolation(source: FileInfo, target: FileInfo): boolean {
	if (["fixture", "top-scenario"].includes(target.kind)) return true;
	if (target.areaFolder === undefined) return false;
	if (target.areaFolder !== source.areaFolder) return true;
	if (target.kind !== "group") return false;

	// Builders and directors are shared by the area's groups, so the only group code they may use is a service.
	return source.kind === "area-layer" ? target.layer !== "service" : target.group !== source.group;
}

/** Isolation compares area folders, not area types: `web/` and `ui/` are separate areas even when both follow `ui`. */
function isolationViolation(source: FileInfo, target: FileInfo): boolean {
	if (target.kind === "test") return source.kind !== "test";

	if (source.kind === "shared") {
		return ["group", "area-common", "area-layer", "fixture", "top-scenario"].includes(target.kind);
	}

	if (source.kind === "area-common") {
		if (["fixture", "top-scenario", "group", "area-layer"].includes(target.kind)) return true;

		return target.kind === "area-common" && target.areaFolder !== source.areaFolder;
	}

	return source.kind === "group" || source.kind === "area-layer" ? areaIsolationViolation(source, target) : false;
}

/**
 * Whether `source` may not use the builder or director `target`: builders use no builders or directors, directors
 * only use builders, and in a group only scenarios, steppers, asserters and services may use them.
 */
function builderViolation(source: FileInfo, target: FileInfo): boolean | undefined {
	if (source.kind === "area-layer") return source.layer === "builder" || target.layer === "director";
	if (source.kind === "group") return source.layer === undefined || !BUILDER_USERS.has(source.layer);

	return undefined;
}

function layerViolation(source: FileInfo, target: FileInfo): boolean {
	if (!target.layer || !target.area) return false;

	const builder = BUILDER_LAYERS.has(target.layer) ? builderViolation(source, target) : undefined;

	if (builder !== undefined) return builder;

	if (source.kind === "group" || source.kind === "area-common") {
		if (!source.area || !source.layer) return false;

		return (
			source.areaFolder === target.areaFolder && Boolean(FORBIDDEN_LAYERS[source.area][source.layer]?.has(target.layer))
		);
	}

	if (source.kind === "top-scenario" || source.kind === "test") {
		return FORBIDDEN_FOR_ORCHESTRATION[source.kind][target.area].has(target.layer);
	}

	return false;
}

const isForbiddenReexport = (source: FileInfo, target: FileInfo): boolean =>
	target.layer !== undefined &&
	REEXPORT_LAYERS.has(target.layer) &&
	target.layer !== source.layer &&
	!["fixture", "test"].includes(source.kind);

const rule: Rule = {
	meta: {
		type: "problem",
		docs: {
			description: "Enforce the SPARTA layer and isolation boundaries between imports.",
			url: docsUrl("architecture-boundaries"),
		},
		schema: [],
		messages: {
			isolation:
				"{{source}} must not depend on {{target}} ({{request}}). Move shared code to the area's common/ folder or the top-level common/ folder.",
			layer: "{{source}} must not depend on {{target}} ({{request}}).",
			reexport: "Do not re-export {{target}} outside its layer; this bypasses the architecture boundaries.",
			staticService:
				"{{source}} is a static abstract class and must not depend on {{target}} ({{request}}); only a normal class may use services.",
			placement:
				"Builders and directors belong in '{{expected}}/', shared by the area's groups, not in a group folder.",
		},
	},

	create(context) {
		const filename = context.filename;
		const conventions = conventionsFor(context);
		const root = rootFor(context, conventions);
		const source = classify(filename, conventions, root);

		if (!source) return {};

		/** Whether the file declares a normal (instantiable) class. Set on `Program`, before any import is visited. */
		let isNormalClass = false;

		/** An `index.ts` barrel in `builders/` or `directors/` may import and re-export its own layer. */
		const isOwnBarrel = (target: FileInfo): boolean =>
			source.kind === "area-layer" &&
			moduleName(filename) === "index" &&
			target.kind === "area-layer" &&
			target.areaFolder === source.areaFolder &&
			target.layer === source.layer;

		const check = (node: AstNode, request: string | undefined, reexport = false): void => {
			if (request === undefined) return;

			const resolved = resolveImport(filename, request, root, conventions);
			const target = resolved ? classify(resolved, conventions, root) : undefined;

			if (!target || isOwnBarrel(target)) return;

			const data = { source: describe(source, conventions), target: describe(target, conventions), request };

			if (isolationViolation(source, target)) {
				context.report({ node, messageId: "isolation", data });
			} else if (layerViolation(source, target)) {
				context.report({ node, messageId: "layer", data });
			} else if (source.kind === "area-layer" && target.layer === "service" && !isNormalClass) {
				context.report({ node, messageId: "staticService", data });
			} else if (reexport && isForbiddenReexport(source, target)) {
				context.report({ node, messageId: "reexport", data });
			}
		};

		return {
			Program(node): void {
				isNormalClass = topLevelClasses(node).some(declaration => !isStaticClass(declaration));

				if (source.kind === "group" && source.layer !== undefined && BUILDER_LAYERS.has(source.layer)) {
					const folder = layerFolder(filename, conventions, root)?.name ?? `${source.layer}s`;
					const expected = `${conventions.spartaFolder}/${source.areaFolder}/${folder}`;

					context.report({ node, messageId: "placement", data: { expected } });
				}
			},

			ImportDeclaration: node => check(node, stringValue(node.source)),

			ExportNamedDeclaration: node => check(node, stringValue(node.source), true),

			ExportAllDeclaration: node => check(node, stringValue(node.source), true),

			ImportExpression: node => check(node, staticString(node.source)),

			TSImportType: node => check(node, stringValue(node.source)),

			TSImportEqualsDeclaration(node): void {
				if (node.moduleReference.type === "TSExternalModuleReference") {
					check(node, stringValue(node.moduleReference.expression));
				}
			},

			CallExpression(node): void {
				if (node.callee.type === "Identifier" && node.callee.name === "require") {
					check(node, staticString(node.arguments[0]));
				}
			},
		};
	},
};

export default rule;
