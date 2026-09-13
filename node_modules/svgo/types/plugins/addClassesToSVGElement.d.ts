/**
 * @typedef AddClassesToSVGElementParams
 * @property {string | ((node: import('../lib/types.js').XastElement, info: import('../lib/types.js').PluginInfo) => string)=} className
 * @property {Array<string | ((node: import('../lib/types.js').XastElement, info: import('../lib/types.js').PluginInfo) => string)>=} classNames
 */
export type AddClassesToSVGElementParams = {
    className?: (string | ((node: import('../lib/types.js').XastElement, info: import('../lib/types.js').PluginInfo) => string)) | undefined;
    classNames?: Array<string | ((node: import('../lib/types.js').XastElement, info: import('../lib/types.js').PluginInfo) => string)> | undefined;
};
export declare const name = "addClassesToSVGElement";
export declare const description = "adds classnames to an outer <svg> element";
/**
 * Add classnames to an outer <svg> element. Example config:
 *
 * plugins: [
 *   {
 *     name: "addClassesToSVGElement",
 *     params: {
 *       className: "mySvg"
 *     }
 *   }
 * ]
 *
 * plugins: [
 *   {
 *     name: "addClassesToSVGElement",
 *     params: {
 *       classNames: ["mySvg", "size-big"]
 *     }
 *   }
 * ]
 *
 * @author April Arcus
 *
 * @type {import('../lib/types.js').Plugin<AddClassesToSVGElementParams>}
 * @since 0.5.2
 */
export declare const fn: import('../lib/types.js').Plugin<AddClassesToSVGElementParams>;
