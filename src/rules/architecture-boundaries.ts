import { stringValue } from "../utils/ast";
import type { Conventions } from "../utils/conventions";
import { docsUrl } from "../utils/docs";
import { conventionsFor, rootFor } from "../utils/settings";
import { classify, resolveImport } from "../utils/sparta-paths";
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

/** The UI layers; `view` is the area's name for a page (`page` for web, `screen` for mobile). */
const uiLayers = (view: "page" | "screen"): Record<string, Set<string>> => ({
	component: new Set([view, "stepper", "asserter", "scenario", "builder", "director"]),
	[view]: new Set(["stepper", "asserter", "scenario", "builder", "director"]),
	stepper: new Set(["asserter", "scenario"]),
	asserter: new Set(["stepper", "asserter", "scenario"]),
	builder: new Set([view, "component", "stepper", "asserter", "scenario"]),
	director: new Set([view, "component", "stepper", "asserter", "scenario"]),
	scenario: new Set([view, "component"]),
});

/** Forbidden target layers inside the same area (API -> API, UI -> UI, database -> database, mobile -> mobile). */
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
	mobile: uiLayers("screen"),
	ui: uiLayers("page"),
};

const DATABASE_ACCESS = ["repository", "base-repository", "service", "base-service", "container", "database"];

/** Layers that code orchestrating flows (top-level scenarios, tests) must not touch directly. */
const FORBIDDEN_FOR_ORCHESTRATION: Record<OrchestrationKind, Record<Area, Set<string>>> = {
	"top-scenario": {
		api: new Set(["client", "base-client", "service", "base-service"]),
		database: new Set(DATABASE_ACCESS),
		mobile: new Set(["screen", "component"]),
		ui: new Set(["page", "component"]),
	},
	test: {
		api: new Set(["client", "base-client", "service", "base-service", "stepper", "asserter"]),
		database: new Set([...DATABASE_ACCESS, "stepper", "asserter"]),
		mobile: new Set(["screen", "component", "stepper", "asserter"]),
		ui: new Set(["page", "component", "stepper", "asserter"]),
	},
};

const REEXPORT_LAYERS = new Set([
	"asserter",
	"client",
	"base-client",
	"base-repository",
	"component",
	"page",
	"repository",
	"scenario",
	"screen",
	"service",
	"base-service",
	"stepper",
]);

const describe = (info: FileInfo, { spartaFolder, testsFolder }: Conventions): string =>
	({
		group: `${info.areaFolder}/${info.group}${info.layer ? ` ${info.layer}` : ""}`,
		"area-common": `${info.areaFolder}/common`,
		"top-scenario": `${spartaFolder}/scenarios`,
		fixture: `${spartaFolder}/fixtures`,
		shared: `${spartaFolder}/common|support`,
		test: testsFolder,
	})[info.kind];

/** Isolation compares area folders, not area types: `web/` and `ui/` are separate areas even when both follow `ui`. */
function isolationViolation(source: FileInfo, target: FileInfo): boolean {
	if (target.kind === "test") return source.kind !== "test";

	if (source.kind === "shared") {
		return ["group", "area-common", "fixture", "top-scenario"].includes(target.kind);
	}

	if (source.kind === "area-common") {
		if (["fixture", "top-scenario", "group"].includes(target.kind)) return true;

		return target.kind === "area-common" && target.areaFolder !== source.areaFolder;
	}

	if (source.kind === "group") {
		if (["fixture", "top-scenario"].includes(target.kind)) return true;
		if (target.areaFolder === undefined) return false;
		if (target.areaFolder !== source.areaFolder) return true;

		return target.kind === "group" && target.group !== source.group;
	}

	return false;
}

function layerViolation(source: FileInfo, target: FileInfo): boolean {
	if (!target.layer || !target.area) return false;

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
		},
	},

	create(context) {
		const filename = context.filename;
		const conventions = conventionsFor(context);
		const root = rootFor(context, conventions);
		const source = classify(filename, conventions, root);

		if (!source) return {};

		const check = (node: AstNode, request: string | undefined, reexport = false): void => {
			if (request === undefined) return;

			const resolved = resolveImport(filename, request, root, conventions);
			const target = resolved ? classify(resolved, conventions, root) : undefined;

			if (!target) return;

			const data = { source: describe(source, conventions), target: describe(target, conventions), request };

			if (isolationViolation(source, target)) {
				context.report({ node, messageId: "isolation", data });
			} else if (layerViolation(source, target)) {
				context.report({ node, messageId: "layer", data });
			} else if (reexport && isForbiddenReexport(source, target)) {
				context.report({ node, messageId: "reexport", data });
			}
		};

		return {
			ImportDeclaration: node => check(node, stringValue(node.source)),

			ExportNamedDeclaration: node => check(node, stringValue(node.source), true),

			ExportAllDeclaration: node => check(node, stringValue(node.source), true),

			ImportExpression: node => check(node, stringValue(node.source)),

			TSImportEqualsDeclaration(node): void {
				if (node.moduleReference.type === "TSExternalModuleReference") {
					check(node, stringValue(node.moduleReference.expression));
				}
			},

			CallExpression(node): void {
				if (node.callee.type === "Identifier" && node.callee.name === "require") {
					check(node, stringValue(node.arguments[0]));
				}
			},
		};
	},
};

export default rule;
