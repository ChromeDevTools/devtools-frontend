export type CleanupOutDataParams = {
    noSpaceAfterFlags?: boolean | undefined;
    leadingZero?: boolean | undefined;
    negativeExtraSpace?: boolean | undefined;
};
/**
 * Encode plain SVG data string into Data URI string.
 *
 * @param {string} str
 * @param {import('../types.js').DataUri=} type
 * @returns {string}
 */
export declare const encodeSVGDatauri: (str: string, type?: import('../types.js').DataUri | undefined) => string;
/**
 * Decode SVG Data URI string into plain SVG string.
 *
 * @param {string} str
 * @returns {string}
 */
export declare const decodeSVGDatauri: (str: string) => string;
/**
 * Convert a row of numbers to an optimized string view.
 *
 * @example
 * [0, -1, .5, .5] → "0-1 .5.5"
 *
 * @param {ReadonlyArray<number>} data
 * @param {CleanupOutDataParams} params
 * @param {import('../types.js').PathDataCommand=} command
 * @returns {string}
 */
export declare const cleanupOutData: (data: ReadonlyArray<number>, params: CleanupOutDataParams, command?: import('../types.js').PathDataCommand | undefined) => string;
/**
 * Remove floating-point numbers leading zero.
 *
 * @param {number} value
 * @returns {string}
 * @example
 * 0.5 → .5
 * -0.5 → -.5
 */
export declare const removeLeadingZero: (value: number) => string;
/**
 * Check whether a URL can contain executable content in a browser.
 *
 * @param {string} value
 * @returns {boolean}
 */
export declare const isExecutableUrl: (value: string) => boolean;
/**
 * If the current node contains any scripts. This does not check parents or
 * children of the node, only the properties and attributes of the node itself.
 *
 * @param {import('../types.js').XastElement} node Current node to check against.
 * @returns {boolean} If the current node contains scripts.
 */
export declare const hasScripts: (node: import('../types.js').XastElement) => boolean;
/**
 * For example, a string that contains one or more of following would match and
 * return true:
 *
 * * `url(#gradient001)`
 * * `url('#gradient001')`
 *
 * @param {string} body
 * @returns {boolean} If the given string includes a URL reference.
 */
export declare const includesUrlReference: (body: string) => boolean;
/**
 * @param {string} body
 * @returns {boolean}
 *   If body includes syntax that resembles a CSS custom property reference.
 * @example
 * "black" → false
 * "var(--css-custom-property)" → true
 */
export declare const includesCssVarReference: (body: string) => boolean;
/**
 * @param {string} attribute
 * @param {string} value
 * @returns {string[]}
 */
export declare const findReferences: (attribute: string, value: string) => string[];
/**
 * Does the same as {@link Number.toFixed} but without casting
 * the return value to a string.
 *
 * @param {number} num
 * @param {number} precision
 * @returns {number}
 */
export declare const toFixed: (num: number, precision: number) => number;
