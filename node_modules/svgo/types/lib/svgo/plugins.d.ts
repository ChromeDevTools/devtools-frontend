/**
 * Plugins engine.
 *
 * @module plugins
 *
 * @param {import('../types.js').XastNode} ast Input AST.
 * @param {any} info Extra information.
 * @param {ReadonlyArray<any>} plugins Plugins property from config.
 * @param {any} overrides
 * @param {any} globalOverrides
 */
export declare const invokePlugins: (ast: import('../types.js').XastNode, info: any, plugins: ReadonlyArray<any>, overrides: any, globalOverrides: any) => void;
/**
 * @template {`preset-${string}`} T
 * @param {{ name: T, plugins: ReadonlyArray<import('../types.js').BuiltinPlugin<string, any>> }} arg0
 * @returns {import('../types.js').BuiltinPluginOrPreset<T, any>}
 */
export declare const createPreset: <T extends `preset-${string}`>({ name, plugins }: {
    name: T;
    plugins: ReadonlyArray<import('../types.js').BuiltinPlugin<string, any>>;
}) => import('../types.js').BuiltinPluginOrPreset<T, any>;
