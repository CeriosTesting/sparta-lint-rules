import path from "node:path";

import { docsUrl } from "../utils/docs";
import { conventionsFor, rootFor } from "../utils/settings";
import { isDeclarationFile, layerFolder, layerSuffix, moduleName } from "../utils/sparta-paths";
import type { Rule } from "../utils/types";

/** Lowercase words of letters and digits, joined by single hyphens: `orders-v2-stepper`. */
const KEBAB_CASE = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

/** `myOrders`, `My_APIOrders` and `checkout--flow` become `my-orders`, `my-api-orders` and `checkout-flow`. */
const toKebabCase = (name: string): string =>
	name
		.replace(/([A-Z]+)([A-Z][a-z])/g, "$1-$2")
		.replace(/([a-z0-9])([A-Z])/g, "$1-$2")
		.replace(/[^A-Za-z0-9]+/g, "-")
		.replace(/^-|-$/g, "")
		.toLowerCase();

const rule: Rule = {
	meta: {
		type: "suggestion",
		docs: {
			description:
				"Require files in a layer folder to be kebab-case and end with the layer suffix (e.g. `orders-stepper.ts`).",
			url: docsUrl("file-naming"),
		},
		schema: [],
		messages: {
			suffix: "Files in '{{folder}}/' must be named '*-{{suffix}}.ts' (found '{{name}}').",
			kebabCase: "File name '{{name}}' must be kebab-case: '{{expected}}'.",
		},
	},

	create(context) {
		const conventions = conventionsFor(context);
		const folder = layerFolder(context.filename, conventions, rootFor(context, conventions));
		const suffix = layerSuffix(folder);
		const name = path.basename(context.filename);
		const module = moduleName(context.filename);

		// `index.ts` is a barrel that re-exports the folder's own files, which architecture-boundaries allows.
		// Declaration files only describe types, so they are not layer files.
		if (folder === undefined || suffix === undefined || isDeclarationFile(name) || module === "index") return {};

		const hasSuffix = module.endsWith(`-${suffix}`);
		const isKebabCase = KEBAB_CASE.test(module);

		if (hasSuffix && isKebabCase) return {};

		return {
			Program(node): void {
				if (!hasSuffix) {
					context.report({ node, messageId: "suffix", data: { folder: folder.name, suffix, name } });
				}

				if (!isKebabCase) {
					const expected = `${toKebabCase(module)}${name.slice(module.length)}`;

					context.report({ node, messageId: "kebabCase", data: { name, expected } });
				}
			},
		};
	},
};

export default rule;
