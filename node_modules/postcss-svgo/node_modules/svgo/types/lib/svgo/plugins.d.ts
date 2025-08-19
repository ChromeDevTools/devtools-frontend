export function invokePlugins(ast: import("../types.js").XastNode, info: any, plugins: ReadonlyArray<any>, overrides: any, globalOverrides: any): void;
export function createPreset<T extends string>({ name, plugins }: {
    name: T;
    plugins: ReadonlyArray<import("../types.js").BuiltinPlugin<string, any>>;
}): import("../types.js").BuiltinPluginOrPreset<T, any>;
