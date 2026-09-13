export type RemoveEditorsNSDataParams = {
    additionalNamespaces?: string[] | undefined;
};
/**
 * @typedef RemoveEditorsNSDataParams
 * @property {string[]=} additionalNamespaces
 */
export declare const name = "removeEditorsNSData";
export declare const description = "removes editors namespaces, elements and attributes";
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
 * @since 0.0.1
 */
export declare const fn: import('../lib/types.js').Plugin<RemoveEditorsNSDataParams>;
