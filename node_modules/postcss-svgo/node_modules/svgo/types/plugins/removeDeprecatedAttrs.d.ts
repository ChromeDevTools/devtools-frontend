export function fn(root: import("../lib/types.js").XastRoot, params: RemoveDeprecatedAttrsParams, info: import("../lib/types.js").PluginInfo): import("../lib/types.js").Visitor | null | void;
/**
 * @typedef RemoveDeprecatedAttrsParams
 * @property {boolean=} removeUnsafe
 */
export const name: "removeDeprecatedAttrs";
export const description: "removes deprecated attributes";
export type RemoveDeprecatedAttrsParams = {
    removeUnsafe?: boolean | undefined;
};
