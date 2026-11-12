import type { CreateRule } from "@oxlint/plugins";

/** A rule using the ESLint-compatible `create` API, so it runs in both oxlint and ESLint. */
export type Rule = CreateRule;

type Visitor = ReturnType<Rule["create"]>;

export type AstNode = Parameters<NonNullable<Visitor[string]>>[0];

export type NodeOfType<T extends AstNode["type"]> = Extract<AstNode, { type: T }>;
