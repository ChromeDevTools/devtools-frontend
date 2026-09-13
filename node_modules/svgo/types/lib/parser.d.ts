export declare class SvgoParserError extends Error {
    reason: string;
    line: number;
    column: number;
    source: string;
    /**
     * @param {string} message
     * @param {number} line
     * @param {number} column
     * @param {string} source
     * @param {string=} file
     */
    constructor(message: string, line: number, column: number, source: string, file?: string | undefined);
    toString(): string;
}
/**
 * Convert SVG (XML) string to SVG-as-JS object.
 *
 * @param {string} data
 * @param {string=} from
 * @returns {import('./types.js').XastRoot}
 */
export declare const parseSvg: (data: string, from?: string | undefined) => import('./types.js').XastRoot;
