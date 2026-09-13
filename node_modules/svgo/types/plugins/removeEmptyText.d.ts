export type RemoveEmptyTextParams = {
    text?: boolean | undefined;
    tspan?: boolean | undefined;
    tref?: boolean | undefined;
};
/**
 * @typedef RemoveEmptyTextParams
 * @property {boolean=} text
 * @property {boolean=} tspan
 * @property {boolean=} tref
 */
export declare const name = "removeEmptyText";
export declare const description = "removes empty <text> elements";
/**
 * Remove empty Text elements.
 *
 * @see https://www.w3.org/TR/SVG11/text.html
 *
 * @example
 * Remove empty text element:
 * <text/>
 *
 * Remove empty tspan element:
 * <tspan/>
 *
 * Remove tref with empty xlink:href attribute:
 * <tref xlink:href=""/>
 *
 * @author Kir Belevich
 *
 * @type {import('../lib/types.js').Plugin<RemoveEmptyTextParams>}
 * @since 0.0.1
 */
export declare const fn: import('../lib/types.js').Plugin<RemoveEmptyTextParams>;
