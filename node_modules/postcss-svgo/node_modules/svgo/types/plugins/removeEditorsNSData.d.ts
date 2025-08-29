/**
 * @typedef RemoveEditorsNSDataParams
 * @property {string[]=} additionalNamespaces
 */
export const name: "removeEditorsNSData";
export const description: "removes editors namespaces, elements and attributes";
/**
 * Remove editors namespaces, elements and attributes.
 *
 * @example
 * <svg xmlns:sodipodi="http://sodipodi.sourceforge.net/DTD/sodipodi-0.dtd">
 * <sodipodi:namedview/>
 * <path sodipodi:nodetypes="cccc"/>
 *
 * @author Kir Belevich
 *
 * @type {import('../lib/types.js').Plugin<RemoveEditorsNSDataParams>}
 */
export const fn: import("../lib/types.js").Plugin<RemoveEditorsNSDataParams>;
export type RemoveEditorsNSDataParams = {
    additionalNamespaces?: string[] | undefined;
};
