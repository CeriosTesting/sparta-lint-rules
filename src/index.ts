import { version } from "../package.json";

import type { SpartaPlugin } from "./plugin-types";
import { PLUGIN_NAME, recommendedRules, rules } from "./rules";

const plugin: SpartaPlugin = {
	meta: { name: PLUGIN_NAME, version },
	rules,
	configs: {} as SpartaPlugin["configs"],
};

plugin.configs.recommended = {
	name: `${PLUGIN_NAME}/recommended`,
	plugins: { [PLUGIN_NAME]: plugin },
	rules: recommendedRules,
};

export default plugin;
