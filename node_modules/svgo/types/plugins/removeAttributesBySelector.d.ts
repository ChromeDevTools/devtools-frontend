export type AttributesBySelector = {
    selector: string;
    attributes: string | string[];
    selectors: never;
};
export type AttributesBySelectors = {
    selector: never;
    attributes: never;
    selectors: Array<AttributesBySelector>;
};
export type RemoveAttributesBySelectorParams = (AttributesBySelector | AttributesBySelectors);
/**
 * @typedef AttributesBySelector
 * @property {string} selector
 * @property {string | string[]} attributes
 * @property {never} selectors
 */
/**
 * @typedef AttributesBySelectors
 * @property {never} selector
 * @property {never} attributes
 * @property {Array<AttributesBySelector>} selectors
 */
/**
 * @typedef {(AttributesBySelector | AttributesBySelectors)} RemoveAttributesBySelectorParams
 */
export declare const name = "removeAttributesBySelector";
export declare const description = "removes attributes of elements that match a css selector";
/**
 * Removes attributes of elements that match a css selector.
 *
 * @example
 * <caption>A selector removing a single attribute</caption>
 * plugins: [
 *   {
 *     name: "removeAttributesBySelector",
 *     params: {
 *       selector: "[fill='#00ff00']",
 *       attributes: "fill"
 *     }
 *   }
 * ]
 *
 * <rect x="0" y="0" width="100" height="100" fill="#00ff00" stroke="#00ff00"/>
 *   ↓
 * <rect x="0" y="0" width="100" height="100" stroke="#00ff00"/>
 *
 * <caption>A selector removing multiple attributes</caption>
 * plugins: [
 *   {
 *     name: "removeAttributesBySelector",
 *     params: {
 *       selector: "[fill='#00ff00']",
 *       attributes: [
 *         "fill",
 *         "stroke"
 *       ]
 *     }
 *   }
 * ]
 *
 * <rect x="0" y="0" width="100" height="100" fill="#00ff00" stroke="#00ff00"/>
 *   ↓
 * <rect x="0" y="0" width="100" height="100"/>
 *
 * <caption>Multiple selectors removing attributes</caption>
 * plugins: [
 *   {
 *     name: "removeAttributesBySelector",
 *     params: {
 *       selectors: [
 *         {
 *           selector: "[fill='#00ff00']",
 *           attributes: "fill"
 *         },
 *         {
 *           selector: "#remove",
 *           attributes: [
 *             "stroke",
 *             "id"
 *           ]
 *         }
 *       ]
 *     }
 *   }
 * ]
 *
 * <rect x="0" y="0" width="100" height="100" fill="#00ff00" stroke="#00ff00"/>
 *   ↓
 * <rect x="0" y="0" width="100" height="100"/>
 *
 * @link https://developer.mozilla.org/docs/Web/CSS/CSS_Selectors|MDN CSS Selectors
 *
 * @author Bradley Mease
 *
 * @type {import('../lib/types.js').Plugin<RemoveAttributesBySelectorParams>}
 * @since 1.2.0
 */
export declare const fn: import('../lib/types.js').Plugin<RemoveAttributesBySelectorParams>;
