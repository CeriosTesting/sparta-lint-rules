import path from "node:path";

import { docsUrl } from "../utils/docs";
import { conventionsFor, rootFor } from "../utils/settings";
import { layerFolder, layerSuffix } from "../utils/sparta-paths";
import type { Rule } from "../utils/types";

const rule: Rule = {
	meta: {
		type: "suggestion",
		docs: {
			description: "Require files in a layer folder to end with the layer suffix (e.g. `*-stepper.ts`).",
			url: docsUrl("file-naming"),
		},
		schema: [],
		messages: {
			suffix: "Files in '{{folder}}/' must be named '*-{{suffix}}.ts' (found '{{name}}').",
		},
	},

	create(context) {
		const conventions = conventionsFor(context);
		const folder = layerFolder(context.filename, conventions, rootFor(context, conventions));
		const suffix = layerSuffix(folder);
		const name = path.basename(context.filename);

		// `index.ts` is a barrel that re-exports the folder's own files, which architecture-boundaries allows.
		if (folder === undefined || suffix === undefined || name === "index.ts" || name.endsWith(`-${suffix}.ts`)) {
			return {};
		}

		return {
			Program(node): void {
				context.report({ node, messageId: "suffix", data: { folder: folder.name, suffix, name } });
			},
		};
	},
};

export default rule;
