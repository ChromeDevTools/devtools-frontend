import { __esmMin } from "./rolldown-runtime.js";
import { configs, init_configs, init_plugin, plugin_default } from "./configs.js";
var index;
var init_src = __esmMin(() => {
	init_configs();
	init_plugin();
	index = Object.assign(plugin_default, { configs });
});
init_src();
export { index as default, index as "module.exports" };
