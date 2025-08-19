/**
 * Plugins that are bundled with SVGO. This includes plugin presets, and plugins
 * that are not enabled by default.
 *
 * @type {ReadonlyArray<{[Name in keyof import('./types.js').PluginsParams]: import('./types.js').BuiltinPluginOrPreset<Name, import('./types.js').PluginsParams[Name]>;}[keyof import('./types.js').PluginsParams]>}
 */
export const builtinPlugins: ReadonlyArray<{ [Name in keyof import("./types.js").PluginsParams]: import("./types.js").BuiltinPluginOrPreset<Name, import("./types.js").PluginsParams[Name]>; }[keyof import("./types.js").PluginsParams]>;
