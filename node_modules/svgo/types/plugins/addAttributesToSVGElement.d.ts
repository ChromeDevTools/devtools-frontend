/**
 * @typedef AddAttributesToSVGElementParams
 * @property {string | Record<string, null | string>=} attribute
 * @property {Array<string | Record<string, null | string>>=} attributes
 */
export type AddAttributesToSVGElementParams = {
    attribute?: (string | Record<string, null | string>) | undefined;
    attributes?: Array<string | Record<string, null | string>> | undefined;
};
export declare const name = "addAttributesToSVGElement";
export declare const description = "adds attributes to an outer <svg> element";
/**
 * Add attributes to an outer <svg> element.
 *
 * @author April Arcus
 *
 * @type {import('../lib/types.js').Plugin<AddAttributesToSVGElementParams>}
 * @since 0.7.0
 */
export declare const fn: import('../lib/types.js').Plugin<AddAttributesToSVGElementParams>;
