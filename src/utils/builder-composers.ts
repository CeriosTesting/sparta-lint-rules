import { importedName, someDescendant } from "./ast";
import type { AstNode, NodeOfType } from "./types";

/** The package whose composer types let a builder build a nested object with another builder. */
export const CERIOS_BUILDER = "@cerios/cerios-builder";

/** Callback types for nested-builder composition: for types and interfaces, and for classes. */
const COMPOSER_TYPES = new Set(["BuilderComposerFromFactory", "ClassBuilderComposerFromFactory"]);

const FUNCTIONS = new Set([
	"ArrowFunctionExpression",
	"FunctionDeclaration",
	"FunctionExpression",
	"TSDeclareFunction",
	"TSEmptyBodyFunctionExpression",
]);

/** The local names a file gives the composer types: `{ BuilderComposerFromFactory as Compose }`, `import * as cb`. */
export interface ComposerNames {
	types: Set<string>;
	namespaces: Set<string>;
}

export const createComposerNames = (): ComposerNames => ({ types: new Set(), namespaces: new Set() });

/** Records the composer types an import of `@cerios/cerios-builder` brings in. */
export function collectComposerNames(node: NodeOfType<"ImportDeclaration">, names: ComposerNames): void {
	if (node.source.value !== CERIOS_BUILDER) return;

	for (const specifier of node.specifiers) {
		if (specifier.type === "ImportNamespaceSpecifier") {
			names.namespaces.add(specifier.local.name);
		} else if (specifier.type === "ImportSpecifier" && COMPOSER_TYPES.has(importedName(specifier))) {
			names.types.add(specifier.local.name);
		}
	}
}

/** `BuilderComposerFromFactory<…>`, `ClassBuilderComposerFromFactory<…>`, under any local name. */
function isComposerType(node: AstNode, names: ComposerNames): node is NodeOfType<"TSTypeReference"> {
	if (node.type !== "TSTypeReference") return false;

	const { typeName } = node;

	if (typeName.type === "Identifier") return names.types.has(typeName.name);

	return (
		typeName.type === "TSQualifiedName" &&
		typeName.left.type === "Identifier" &&
		names.namespaces.has(typeName.left.name) &&
		COMPOSER_TYPES.has(typeName.right.name)
	);
}

/** `Builder` for `Builder`, `Builder.create` and `Builder.presets.create`. */
const rootName = (node: AstNode): string | undefined => {
	if (node.type === "Identifier") return node.name;

	return node.type === "TSQualifiedName" ? rootName(node.left) : undefined;
};

/**
 * Returns whether a reference to the imported `builder` is a use for nested composition: inside a composer type for
 * that builder (`BuilderComposerFromFactory<typeof Builder.create>`), or inside a function with a parameter typed by
 * one. The composer type may be written on the parameter or reached through a local `type` alias or `interface`.
 */
export function composerUseCheck(
	program: NodeOfType<"Program">,
	names: ComposerNames,
	builder: string
): (reference: AstNode) => boolean {
	/** Local type aliases and interfaces that hold a composer type for `builder`. */
	const localComposers = new Set<string>();

	const composesBuilder = (node: AstNode): boolean =>
		someDescendant(node, child => {
			if (child.type !== "TSTypeReference") return false;
			if (child.typeName.type === "Identifier" && localComposers.has(child.typeName.name)) return true;

			return (
				isComposerType(child, names) &&
				someDescendant(child, query => query.type === "TSTypeQuery" && rootName(query.exprName) === builder)
			);
		});

	const declarations = program.body
		.map(statement =>
			statement.type === "ExportNamedDeclaration" || statement.type === "ExportDefaultDeclaration"
				? statement.declaration
				: statement
		)
		.filter(
			(node): node is NodeOfType<"TSTypeAliasDeclaration" | "TSInterfaceDeclaration"> =>
				node?.type === "TSTypeAliasDeclaration" || node?.type === "TSInterfaceDeclaration"
		);

	// Repeat until nothing changes, so an alias of an alias counts too.
	for (let added = true; added;) {
		added = false;

		for (const declaration of declarations) {
			if (!localComposers.has(declaration.id.name) && composesBuilder(declaration)) {
				localComposers.add(declaration.id.name);
				added = true;
			}
		}
	}

	return reference => {
		for (let node: AstNode | null = reference.parent; node; node = node.parent) {
			if (isComposerType(node, names)) return true;
			if (FUNCTIONS.has(node.type) && "params" in node && node.params.some(composesBuilder)) return true;
		}

		return false;
	};
}
