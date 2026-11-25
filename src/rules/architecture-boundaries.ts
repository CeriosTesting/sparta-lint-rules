import { importedName, staticString, stringValue } from "../utils/ast";
import { collectComposerNames, composerUseCheck, createComposerNames } from "../utils/builder-composers";
import { isStaticClass, topLevelClasses } from "../utils/class-members";
import type { Conventions } from "../utils/conventions";
import { docsUrl } from "../utils/docs";
import { conventionsFor, rootFor } from "../utils/settings";
import { classify, moduleName, resolveImport } from "../utils/sparta-paths";
import type { Area, FileInfo, Kind } from "../utils/sparta-paths";
import type { AstNode, NodeOfType, Rule } from "../utils/types";

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

/** The layers of the `builders/` and `directors/` folders, wherever they live. */
const BUILDER_LAYERS = new Set(["builder", "director"]);

/** The only layers, besides directors, that may use builders and directors. */
const BUILDER_USERS = new Set(["scenario", "stepper", "asserter", "service"]);

/** Whether a file is a builder or director: in a group, an area's `common/`, an area, or `sparta/common/`. */
const isBuilderLayer = (info: FileInfo): boolean => info.layer !== undefined && BUILDER_LAYERS.has(info.layer);

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
		shared: info.layer ? `${spartaFolder}/common ${info.layer}` : `${spartaFolder}/common|support`,
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

type BuilderMessageId = "builderUsesBuilder" | "builderUsesDirector" | "directorUsesDirector";

/**
 * The message for a builder or director using a builder or director it may not use, wherever both live: builders
 * use no builders (outside a composer, see `composerUseCheck`) and no directors, directors use no directors.
 */
function builderMessageId(source: FileInfo, target: FileInfo): BuilderMessageId | undefined {
	if (source.layer === "builder") {
		if (target.layer === "builder") return "builderUsesBuilder";
		if (target.layer === "director") return "builderUsesDirector";
	}

	return source.layer === "director" && target.layer === "director" ? "directorUsesDirector" : undefined;
}

/**
 * Whether `source` may not use the builder or director `target`: only scenarios, steppers, asserters and services
 * (and directors, which `builderMessageId` checks) may use them. Fixtures, top-level scenarios and tests are left to
 * the other checks. Which builders a file can see is up to isolation.
 */
function builderViolation(source: FileInfo): boolean | undefined {
	if (isBuilderLayer(source)) return false;
	if (["group", "area-common", "shared"].includes(source.kind)) {
		return source.layer === undefined || !BUILDER_USERS.has(source.layer);
	}

	return undefined;
}

function layerViolation(source: FileInfo, target: FileInfo): boolean {
	if (!target.layer) return false;

	const builder = BUILDER_LAYERS.has(target.layer) ? builderViolation(source) : undefined;

	if (builder !== undefined) return builder;

	// Builders and directors may use services, and code outside the layer folders (models), but no other layer.
	if (isBuilderLayer(source)) return target.layer !== "service";

	if (!target.area) return false;

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

/** `import X from …` or `import { X } from …`: an import whose every use can be followed. */
const isBindingImport = (node: AstNode): node is NodeOfType<"ImportDeclaration"> =>
	node.type === "ImportDeclaration" &&
	node.specifiers.length > 0 &&
	node.specifiers.every(specifier => specifier.type !== "ImportNamespaceSpecifier");

/** `'InvoiceBuilder' from '…/invoice-builder'`, or only the quoted request when the import names nothing. */
function dependency(node: AstNode, request: string): string {
	let names: string[] = [];

	if (node.type === "ImportDeclaration") {
		names = node.specifiers.map(specifier => {
			if (specifier.type === "ImportSpecifier") return importedName(specifier);

			return specifier.type === "ImportNamespaceSpecifier" ? `* as ${specifier.local.name}` : specifier.local.name;
		});
	} else if (node.type === "ExportNamedDeclaration") {
		names = node.specifiers.map(({ local }) => (local.type === "Identifier" ? local.name : String(local.value)));
	}

	return names.length === 0 ? `'${request}'` : `${names.map(name => `'${name}'`).join(", ")} from '${request}'`;
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
			builderUsesBuilder:
				"A builder must not use another builder ({{dependency}}). Builders build one object: compose builders in a director, or use the builder only in a method that takes a BuilderComposerFromFactory or ClassBuilderComposerFromFactory callback for it.",
			builderUsesDirector:
				"A builder must not use a director ({{dependency}}). Directors compose builders, not the other way round.",
			directorUsesDirector:
				"A director must not use another director ({{dependency}}). Use the builders directly, so each director is one flat recipe.",
			reexport: "Do not re-export {{target}} outside its layer; this bypasses the architecture boundaries.",
			staticService:
				"{{source}} is a static abstract class and must not depend on {{target}} ({{request}}); only a normal class may use services.",
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

		/** A builder's imports of other builders, checked against the composer types at the end of the file. */
		const builderImports: { node: NodeOfType<"ImportDeclaration">; request: string }[] = [];
		const composerNames = createComposerNames();
		let program: NodeOfType<"Program"> | undefined;

		/** An `index.ts` barrel in `builders/` or `directors/` may import and re-export its own layer. */
		const isOwnBarrel = (target: FileInfo): boolean =>
			isBuilderLayer(source) &&
			moduleName(filename) === "index" &&
			target.kind === source.kind &&
			target.areaFolder === source.areaFolder &&
			target.group === source.group &&
			target.layer === source.layer;

		/** Reports a builder or director using one it may not. A builder importing a builder waits for `Program:exit`. */
		const checkBuilderUse = (node: AstNode, request: string, messageId: BuilderMessageId): void => {
			if (messageId === "builderUsesBuilder" && isBindingImport(node)) {
				// Allowed when every use is for nested composition; known once the whole file is visited.
				builderImports.push({ node, request });
			} else {
				context.report({ node, messageId, data: { dependency: dependency(node, request) } });
			}
		};

		const check = (node: AstNode, request: string | undefined, reexport = false): void => {
			if (request === undefined) return;

			const resolved = resolveImport(filename, request, root, conventions);
			const target = resolved ? classify(resolved, conventions, root) : undefined;

			if (!target || isOwnBarrel(target)) return;

			const data = { source: describe(source, conventions), target: describe(target, conventions), request };
			const builderMessage = builderMessageId(source, target);

			if (isolationViolation(source, target)) {
				context.report({ node, messageId: "isolation", data });
			} else if (builderMessage !== undefined) {
				checkBuilderUse(node, request, builderMessage);
			} else if (layerViolation(source, target)) {
				context.report({ node, messageId: "layer", data });
			} else if (isBuilderLayer(source) && target.layer === "service" && !isNormalClass) {
				context.report({ node, messageId: "staticService", data });
			} else if (reexport && isForbiddenReexport(source, target)) {
				context.report({ node, messageId: "reexport", data });
			}
		};

		/** Reports each builder a builder imports at its first use outside a composer, or at the unused import. */
		const checkBuilderImports = (): void => {
			if (!program) return;

			for (const { node, request } of builderImports) {
				for (const variable of context.sourceCode.getDeclaredVariables(node)) {
					const isComposerUse = composerUseCheck(program, composerNames, variable.name);
					const misuse = variable.references.find(reference => !isComposerUse(reference.identifier));

					if (misuse || variable.references.length === 0) {
						context.report({
							node: misuse?.identifier ?? node,
							messageId: "builderUsesBuilder",
							data: { dependency: `'${variable.name}' from '${request}'` },
						});
					}
				}
			}
		};

		return {
			Program(node): void {
				program = node;
				isNormalClass = topLevelClasses(node).some(declaration => !isStaticClass(declaration));
			},

			"Program:exit": checkBuilderImports,

			ImportDeclaration(node): void {
				collectComposerNames(node, composerNames);
				check(node, stringValue(node.source));
			},

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
