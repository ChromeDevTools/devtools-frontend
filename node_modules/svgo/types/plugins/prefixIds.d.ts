export type PrefixIdsParams = {
    prefix?: (boolean | string | ((node: import('../lib/types.js').XastElement, info: import('../lib/types.js').PluginInfo) => string)) | undefined;
    delim?: string | undefined;
    prefixIds?: boolean | undefined;
    prefixClassNames?: boolean | undefined;
};
/**
 * @typedef PrefixIdsParams
 * @property {boolean | string | ((node: import('../lib/types.js').XastElement, info: import('../lib/types.js').PluginInfo) => string)=} prefix
 * @property {string=} delim
 * @property {boolean=} prefixIds
 * @property {boolean=} prefixClassNames
 */
export declare const name = "prefixIds";
export declare const description = "prefix IDs";
/**
 * Prefixes identifiers
 *
 * @author strarsis <strarsis@gmail.com>
 * @type {import('../lib/types.js').Plugin<PrefixIdsParams>}
 * @since 1.0.0
 */
export declare const fn: import('../lib/types.js').Plugin<PrefixIdsParams>;
