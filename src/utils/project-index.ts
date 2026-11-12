import { readFileSync, statSync } from "node:fs";
import path from "node:path";

import { parseSync } from "oxc-parser";
import type {
	ArrowFunctionExpression,
	CallExpression,
	Class,
	Function as FunctionNode,
	MethodDefinition,
	Node,
	Program,
	PropertyDefinition,
	TSTypeAnnotation,
} from "oxc-parser";

import type { Conventions } from "./conventions";
import { memberName, pollingMethod } from "./polling";
import { normalize, resolveImport } from "./sparta-paths";

/**
 * Follows calls across files without type information, using the conventions SPARTA projects follow:
 * dependencies are typed constructor parameter properties, typed fields or fields created with `new`,
 * and every type comes from a named import (relative or an alias such as `@sparta/*`). Classes are always
 * resolved through the import they came from, never by name, because class names repeat across folders.
 * Anything that cannot be resolved this way is ignored.
 */

type FunctionLike = FunctionNode | ArrowFunctionExpression;

interface ImportRef {
	/** Resolved file, or `undefined` for package imports, which are never followed. */
	module: string | undefined;
	imported: string;
}

interface ClassInfo {
	name: string;
	node: Class;
	/** Local name of the base class in this file. */
	superClass?: string;
	methods: Map<string, FunctionLike>;
	/** Field name to the local name of its type in this file. */
	fields: Map<string, string>;
}

export interface FileSummary {
	file: string;
	/** Project root the aliases resolve against. */
	root: string;
	conventions: Conventions;
	imports: Map<string, ImportRef>;
	classes: Map<string, ClassInfo>;
	functions: Map<string, FunctionLike>;
	/** Exported name to local name, for `export class X`, `export { X as Y }` and `export default`. */
	exports: Map<string, string>;
	reexports: Map<string, ImportRef>;
	starExports: string[];
}

export interface ClassRef {
	file: string;
	info: ClassInfo;
}

export type Target =
	| { kind: "method"; file: string; cls: ClassRef; name: string; fn: FunctionLike }
	| { kind: "function"; file: string; name: string; fn: FunctionLike };

export interface Scope {
	file: string;
	cls?: ClassRef;
	/** Local variable name to the local name of its type, from `const x = new X()` or `const x: X = ...`. */
	locals: Map<string, string>;
}

/** A call inside a poll callback that polls: either a polling call itself, or a call that leads to one. */
export type Hit = { node: CallExpression; method: string } | { node: CallExpression; path: string[] };

const MAX_DEPTH = 10;

const SKIPPED_KEYS = new Set(["parent", "loc", "range", "start", "end", "typeAnnotation", "returnType", "decorators"]);

const MODULE_EXTENSIONS = ["", ".ts", ".tsx", ".mts", ".cts", "/index.ts"];

const isNode = (value: unknown): value is Node =>
	typeof value === "object" && value !== null && typeof (value as { type?: unknown }).type === "string";

/** Visits `node` and its descendants depth-first. Returning `false` from `visit` skips the node's children. */
export function walk(node: Node, visit: (node: Node) => boolean | void): void {
	if (visit(node) === false) return;

	for (const [key, value] of Object.entries(node)) {
		if (SKIPPED_KEYS.has(key)) continue;

		if (Array.isArray(value)) {
			for (const item of value) if (isNode(item)) walk(item, visit);
		} else if (isNode(value)) {
			walk(value, visit);
		}
	}
}

const isFunctionLike = (node: Node | null | undefined): node is FunctionLike =>
	node?.type === "ArrowFunctionExpression" ||
	node?.type === "FunctionExpression" ||
	node?.type === "FunctionDeclaration";

/** `X` for a `: X` or `: X<T>` annotation. */
const typeName = (annotation: TSTypeAnnotation | null | undefined): string | undefined => {
	const type = annotation?.typeAnnotation;

	return type?.type === "TSTypeReference" && type.typeName.type === "Identifier" ? type.typeName.name : undefined;
};

/** `X` for `new X(...)`. */
const newName = (node: Node | null | undefined): string | undefined =>
	node?.type === "NewExpression" && node.callee.type === "Identifier" ? node.callee.name : undefined;

const keyName = (key: Node): string | undefined =>
	key.type === "Identifier"
		? key.name
		: key.type === "Literal" && typeof key.value === "string"
			? key.value
			: undefined;

function summarizeClass(name: string, node: Class): ClassInfo {
	const info: ClassInfo = {
		name,
		node,
		superClass: node.superClass?.type === "Identifier" ? node.superClass.name : undefined,
		methods: new Map(),
		fields: new Map(),
	};

	for (const member of node.body.body) {
		if (member.type === "PropertyDefinition") summarizeField(info, member);
		if (member.type === "MethodDefinition") summarizeMethod(info, member);
	}

	return info;
}

/** A typed field (`x: X`) or a field created with `new X()`. */
function summarizeField(info: ClassInfo, member: PropertyDefinition): void {
	const field = member.computed ? undefined : keyName(member.key);
	const type = typeName(member.typeAnnotation) ?? newName(member.value);

	if (field !== undefined && type !== undefined) info.fields.set(field, type);
}

/** Methods, getters (whose return type acts as a field type) and the constructor. */
function summarizeMethod(info: ClassInfo, member: MethodDefinition): void {
	const name = member.computed ? undefined : keyName(member.key);
	const { value } = member;

	if (name === undefined || value.type !== "FunctionExpression" || !value.body) return;

	if (member.kind === "constructor") {
		summarizeConstructor(info, value);
	} else if (member.kind === "get") {
		const type = typeName(value.returnType);

		if (type !== undefined) info.fields.set(name, type);
	} else if (member.kind === "method") {
		info.methods.set(name, value);
	}
}

/** Fields from constructor parameter properties and from `this.x = new X()` assignments. */
function summarizeConstructor(info: ClassInfo, constructor: FunctionNode): void {
	for (const param of constructor.params) {
		if (param.type !== "TSParameterProperty") continue;

		const binding = param.parameter.type === "AssignmentPattern" ? param.parameter.left : param.parameter;
		const type = binding.type === "Identifier" ? typeName(binding.typeAnnotation) : undefined;

		if (binding.type === "Identifier" && type !== undefined) info.fields.set(binding.name, type);
	}

	if (!constructor.body) return;

	walk(constructor.body, node => {
		if (node.type !== "AssignmentExpression" || node.left.type !== "MemberExpression") return;
		if (node.left.object.type !== "ThisExpression") return;

		const field = memberName(node.left);
		const type = newName(node.right);

		if (field !== undefined && type !== undefined && !info.fields.has(field)) info.fields.set(field, type);
	});
}

const importedName = (node: Node): string =>
	node.type === "Identifier" ? node.name : node.type === "Literal" ? String(node.value) : "";

function summarizeDeclaration(summary: FileSummary, node: Node, exported: string | undefined): void {
	if ((node.type === "ClassDeclaration" || node.type === "ClassExpression") && node.id) {
		summary.classes.set(node.id.name, summarizeClass(node.id.name, node));
		if (exported !== undefined) summary.exports.set(exported === "" ? node.id.name : exported, node.id.name);
	} else if (node.type === "FunctionDeclaration" && node.id) {
		summary.functions.set(node.id.name, node);
		if (exported !== undefined) summary.exports.set(exported === "" ? node.id.name : exported, node.id.name);
	} else if (node.type === "VariableDeclaration") {
		for (const declarator of node.declarations) {
			if (declarator.id.type !== "Identifier" || !isFunctionLike(declarator.init)) continue;

			summary.functions.set(declarator.id.name, declarator.init);
			if (exported !== undefined) summary.exports.set(declarator.id.name, declarator.id.name);
		}
	}
}

/** Collects the imports, exports, classes and functions of a module. */
export function summarize(file: string, program: Program, root: string, conventions: Conventions): FileSummary {
	const summary: FileSummary = {
		file,
		root,
		conventions,
		imports: new Map(),
		classes: new Map(),
		functions: new Map(),
		exports: new Map(),
		reexports: new Map(),
		starExports: [],
	};
	for (const statement of program.body) {
		if (statement.type === "ImportDeclaration") {
			summarizeImport(summary, statement);
		} else if (statement.type === "ExportNamedDeclaration") {
			summarizeNamedExport(summary, statement);
		} else if (statement.type === "ExportDefaultDeclaration") {
			const { declaration } = statement;

			if (declaration.type === "Identifier") summary.exports.set("default", declaration.name);
			else summarizeDeclaration(summary, declaration, "default");
		} else if (statement.type === "ExportAllDeclaration") {
			const module = resolveModule(file, statement.source.value, root, conventions);

			if (!statement.exported && module !== undefined) summary.starExports.push(module);
		} else {
			summarizeDeclaration(summary, statement, undefined);
		}
	}

	return summary;
}

type Statement = Program["body"][number];

function summarizeImport(summary: FileSummary, statement: Extract<Statement, { type: "ImportDeclaration" }>): void {
	const module = resolveModule(summary.file, statement.source.value, summary.root, summary.conventions);

	for (const specifier of statement.specifiers) {
		if (specifier.type === "ImportSpecifier") {
			summary.imports.set(specifier.local.name, { module, imported: importedName(specifier.imported) });
		} else if (specifier.type === "ImportDefaultSpecifier") {
			summary.imports.set(specifier.local.name, { module, imported: "default" });
		}
	}
}

/** `export class X`, `export { X as Y }` and `export { X } from "..."`. */
function summarizeNamedExport(
	summary: FileSummary,
	statement: Extract<Statement, { type: "ExportNamedDeclaration" }>
): void {
	if (statement.declaration) {
		summarizeDeclaration(summary, statement.declaration, "");

		return;
	}

	const module = statement.source
		? resolveModule(summary.file, statement.source.value, summary.root, summary.conventions)
		: undefined;

	for (const specifier of statement.specifiers) {
		const exported = importedName(specifier.exported);
		const local = importedName(specifier.local);

		if (statement.source) summary.reexports.set(exported, { module, imported: local });
		else summary.exports.set(exported, local);
	}
}

const isFile = (file: string): boolean => statSync(file, { throwIfNoEntry: false })?.isFile() ?? false;

/** Resolves a relative or aliased import to a TypeScript file. Package imports resolve to `undefined`. */
export function resolveModule(
	fromFile: string,
	request: string,
	root: string,
	conventions: Conventions
): string | undefined {
	const base = resolveImport(fromFile, request, root, conventions);

	if (base === undefined) return undefined;

	const stripped = base.replace(/\.(?:m|c)?js$/, "");

	for (const candidate of [base, ...MODULE_EXTENSIONS.map(extension => `${stripped}${extension}`)]) {
		if (isFile(candidate)) return normalize(candidate);
	}

	return undefined;
}

/**
 * Summaries of files on disk per project root and conventions (imports resolve against them), kept for the lifetime of the
 * linter process and refreshed when a file changes.
 */
const diskCache = new Map<string, { mtimeMs: number; summary: FileSummary }>();

function diskSummary(file: string, root: string, conventions: Conventions): FileSummary | undefined {
	const stats = statSync(file, { throwIfNoEntry: false });

	if (!stats?.isFile()) return undefined;

	const key = `${conventions.key}\0${root}\0${file}`;
	const cached = diskCache.get(key);

	if (cached?.mtimeMs === stats.mtimeMs) return cached.summary;

	const { program } = parseSync(file, readFileSync(file, "utf8"));
	const summary = summarize(file, program, root, conventions);

	diskCache.set(key, { mtimeMs: stats.mtimeMs, summary });

	return summary;
}

/** Shows paths relative to the project root (`sparta/...`) instead of absolute ones. */
const display = (file: string, root: string): string =>
	file.startsWith(`${root}/`) ? file.slice(root.length + 1) : path.basename(file);

/**
 * Cross-file view for one linted file. The linted file uses the linter's in-memory AST (so unsaved
 * changes count); every other file is parsed from disk.
 */
export class ProjectIndex {
	private readonly memo = new Map<string, string[] | null>();

	private readonly inProgress = new Set<string>();

	/** Summaries looked up while linting this file, so every other file is checked on disk at most once. */
	private readonly summaries = new Map<string, FileSummary | undefined>();

	/**
	 * Counts the lookups cut short by a call cycle or by `MAX_DEPTH`. A "does not poll" answer computed while this
	 * changed is only true for that call chain, so it is not cached.
	 */
	private truncations = 0;

	constructor(readonly current: FileSummary) {}

	/** Finds the polling calls, and the calls that lead to polling, inside `root`. Stops descending at a polling call. */
	collectHits(root: Node, scope: Scope, depth = 0, firstOnly = false): Hit[] {
		const hits: Hit[] = [];

		walk(root, node => {
			if (firstOnly && hits.length > 0) return false;
			if (node.type !== "CallExpression") return;

			const method = pollingMethod(node, this.current.conventions.pollingMethods);

			if (method !== undefined) {
				hits.push({ node, method });

				return false;
			}

			const target = this.resolveCall(node, scope);
			const path = target ? this.pollingPath(target, depth + 1) : undefined;

			if (path) hits.push({ node, path });
		});

		return hits;
	}

	/** The chain from `target` to a polling call, e.g. `["Page.open", "Page.find", "poll (sparta/.../page.ts)"]`. */
	pollingPath(target: Target, depth = 0): string[] | undefined {
		const label = target.kind === "method" ? `${target.cls.info.name}.${target.name}` : target.name;
		const key = `${target.file}#${label}`;
		const known = this.memo.get(key);

		if (known !== undefined) return known ?? undefined;
		if (!target.fn.body) return undefined;

		if (depth > MAX_DEPTH || this.inProgress.has(key)) {
			this.truncations++;

			return undefined;
		}

		const truncationsBefore = this.truncations;

		this.inProgress.add(key);

		const scope: Scope = {
			file: target.file,
			cls: target.kind === "method" ? target.cls : undefined,
			locals: collectLocals(target.fn),
		};
		const [hit] = this.collectHits(target.fn.body, scope, depth, true);

		this.inProgress.delete(key);

		const result = hit
			? "method" in hit
				? [label, `${hit.method} (${display(target.file, this.current.root)})`]
				: [label, ...hit.path]
			: undefined;

		if (result !== undefined) this.memo.set(key, result);
		else if (this.truncations === truncationsBefore) this.memo.set(key, null);

		return result;
	}

	/** Resolves a call such as `fn()`, `this.method()`, `this.field.method()` or `local.method()`. */
	resolveCall(call: CallExpression, scope: Scope): Target | undefined {
		return this.resolveReference(call.callee, scope);
	}

	/** Resolves a reference to a function or method, such as `fn` or `this.page.method`. */
	resolveReference(node: Node, scope: Scope): Target | undefined {
		if (node.type === "Identifier") {
			const found = this.resolveLocal(scope.file, node.name);
			const fn = found ? this.summary(found.file)?.functions.get(found.local) : undefined;

			return found && fn ? { kind: "function", file: found.file, name: found.local, fn } : undefined;
		}

		const method = memberName(node);

		if (method === undefined || node.type !== "MemberExpression") return undefined;

		const receiver = this.receiverClass(node.object, scope);

		return receiver ? this.findMethod(receiver, method) : undefined;
	}

	/** Builds the scope for code in the linted file, inside `classNode` and the function `fn` (whose locals count). */
	scopeFor(classNode: Node | undefined, fn: Node | undefined): Scope {
		const cls = [...this.current.classes.values()].find(info => info.node === classNode);

		return {
			file: this.current.file,
			cls: cls ? { file: this.current.file, info: cls } : undefined,
			locals: isFunctionLike(fn) ? collectLocals(fn) : new Map(),
		};
	}

	private summary(file: string): FileSummary | undefined {
		if (file === this.current.file) return this.current;
		if (this.summaries.has(file)) return this.summaries.get(file);

		const summary = diskSummary(file, this.current.root, this.current.conventions);

		this.summaries.set(file, summary);

		return summary;
	}

	private receiverClass(node: Node, scope: Scope, depth = 0): ClassRef | undefined {
		if (depth > MAX_DEPTH) return undefined;

		switch (node.type) {
			case "ThisExpression":
				return scope.cls;
			case "Identifier": {
				const type = scope.locals.get(node.name);

				return type === undefined ? undefined : this.resolveClass(scope.file, type);
			}
			case "NewExpression":
				return node.callee.type === "Identifier" ? this.resolveClass(scope.file, node.callee.name) : undefined;
			case "TSNonNullExpression":
			case "ParenthesizedExpression":
				return this.receiverClass(node.expression, scope, depth + 1);
			case "MemberExpression": {
				const field = memberName(node);
				const owner = field === undefined ? undefined : this.receiverClass(node.object, scope, depth + 1);

				return owner && field !== undefined ? this.fieldClass(owner, field) : undefined;
			}
			default:
				return undefined;
		}
	}

	private fieldClass(cls: ClassRef, field: string, depth = 0): ClassRef | undefined {
		if (depth > MAX_DEPTH) return undefined;

		const type = cls.info.fields.get(field);

		if (type !== undefined) return this.resolveClass(cls.file, type);

		const parent = this.superClass(cls);

		return parent ? this.fieldClass(parent, field, depth + 1) : undefined;
	}

	private findMethod(cls: ClassRef, name: string, depth = 0): Target | undefined {
		if (depth > MAX_DEPTH) return undefined;

		const fn = cls.info.methods.get(name);

		if (fn) return { kind: "method", file: cls.file, cls, name, fn };

		const parent = this.superClass(cls);

		return parent ? this.findMethod(parent, name, depth + 1) : undefined;
	}

	private superClass(cls: ClassRef): ClassRef | undefined {
		return cls.info.superClass === undefined ? undefined : this.resolveClass(cls.file, cls.info.superClass);
	}

	private resolveClass(file: string, localName: string): ClassRef | undefined {
		const found = this.resolveLocal(file, localName);
		const info = found ? this.summary(found.file)?.classes.get(found.local) : undefined;

		return found && info ? { file: found.file, info } : undefined;
	}

	/** Finds where a name used in `file` is declared, following imports and re-exports. */
	private resolveLocal(file: string, localName: string, depth = 0): { file: string; local: string } | undefined {
		const summary = this.summary(file);

		if (!summary || depth > MAX_DEPTH) return undefined;
		if (summary.classes.has(localName) || summary.functions.has(localName)) return { file, local: localName };

		const imported = summary.imports.get(localName);

		return imported?.module === undefined
			? undefined
			: this.resolveExport(imported.module, imported.imported, depth + 1);
	}

	private resolveExport(file: string, exported: string, depth: number): { file: string; local: string } | undefined {
		const summary = this.summary(file);

		if (!summary || depth > MAX_DEPTH) return undefined;

		const local = summary.exports.get(exported);

		if (local !== undefined) return this.resolveLocal(file, local, depth + 1);

		const reexport = summary.reexports.get(exported);

		if (reexport) {
			return reexport.module === undefined
				? undefined
				: this.resolveExport(reexport.module, reexport.imported, depth + 1);
		}

		for (const module of summary.starExports) {
			const found = this.resolveExport(module, exported, depth + 1);

			if (found) return found;
		}

		return undefined;
	}
}

/** Local variables whose class is known: `const x = new X()` and `const x: X = ...`. */
function collectLocals(fn: FunctionLike): Map<string, string> {
	const locals = new Map<string, string>();

	if (!fn.body) return locals;

	walk(fn.body, node => {
		if (node.type !== "VariableDeclarator" || node.id.type !== "Identifier") return;

		const type = typeName(node.id.typeAnnotation) ?? newName(node.init);

		if (type !== undefined) locals.set(node.id.name, type);
	});

	return locals;
}
