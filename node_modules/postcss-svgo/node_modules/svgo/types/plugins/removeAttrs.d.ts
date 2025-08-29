/**
 * @typedef RemoveAttrsParams
 * @property {string=} elemSeparator
 * @property {boolean=} preserveCurrentColor
 * @property {string | string[]} attrs
 */
export const name: "removeAttrs";
export const description: "removes specified attributes";
/**
 * Remove attributes
 *
 * @example elemSeparator
 *   format: string
 *
 * @example preserveCurrentColor
 *   format: boolean
 *
 * @example attrs:
 *
 *   format: [ element* : attribute* : value* ]
 *
 *   element   : regexp (wrapped into ^...$), single * or omitted > all elements (must be present when value is used)
 *   attribute : regexp (wrapped into ^...$)
 *   value     : regexp (wrapped into ^...$), single * or omitted > all values
 *
 *   examples:
 *
 *     > basic: remove fill attribute
 *     ---
 *     removeAttrs:
 *       attrs: 'fill'
 *
 *     > remove fill attribute on path element
 *     ---
 *       attrs: 'path:fill'
 *
 *     > remove fill attribute on path element where value is none
 *     ---
 *       attrs: 'path:fill:none'
 *
 *
 *     > remove all fill and stroke attribute
 *     ---
 *       attrs:
 *         - 'fill'
 *         - 'stroke'
 *
 *     [is same as]
 *
 *       attrs: '(fill|stroke)'
 *
 *     [is same as]
 *
 *       attrs: '*:(fill|stroke)'
 *
 *     [is same as]
 *
 *       attrs: '.*:(fill|stroke)'
 *
 *     [is same as]
 *
 *       attrs: '.*:(fill|stroke):.*'
 *
 *
 *     > remove all stroke related attributes
 *     ----
 *     attrs: 'stroke.*'
 *
 *
 * @author Benny Schudel
 *
 * @type {import('../lib/types.js').Plugin<RemoveAttrsParams>}
 */
export const fn: import("../lib/types.js").Plugin<RemoveAttrsParams>;
export type RemoveAttrsParams = {
    elemSeparator?: string | undefined;
    preserveCurrentColor?: boolean | undefined;
    attrs: string | string[];
};
