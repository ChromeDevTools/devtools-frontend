export type Options = Required<import('./types.js').StringifyOptions>;
export type State = {
    indent: string;
    textContext: import('./types.js').XastElement | null;
    indentLevel: number;
};
/**
 * Converts XAST to SVG string.
 *
 * @param {import('./types.js').XastRoot} data
 * @param {import('./types.js').StringifyOptions=} userOptions
 * @returns {string}
 */
export declare const stringifySvg: (data: import('./types.js').XastRoot, userOptions?: import('./types.js').StringifyOptions | undefined) => string;
