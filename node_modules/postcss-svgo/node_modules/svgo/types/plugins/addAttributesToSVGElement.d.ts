/**
 * @typedef AddAttributesToSVGElementParams
 * @property {string | Record<string, null | string>=} attribute
 * @property {Array<string | Record<string, null | string>>=} attributes
 */
export const name: "addAttributesToSVGElement";
export const description: "adds attributes to an outer <svg> element";
/**
 * Add attributes to an outer <svg> element.
 *
 * @author April Arcus
 *
 * @type {import('../lib/types.js').Plugin<AddAttributesToSVGElementParams>}
 */
export const fn: import("../lib/types.js").Plugin<AddAttributesToSVGElementParams>;
export type AddAttributesToSVGElementParams = {
    attribute?: (string | Record<string, null | string>) | undefined;
    attributes?: Array<string | Record<string, null | string>> | undefined;
};
