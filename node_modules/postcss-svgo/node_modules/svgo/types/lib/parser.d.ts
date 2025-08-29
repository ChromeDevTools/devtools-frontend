export class SvgoParserError extends Error {
    /**
     * @param {string} message
     * @param {number} line
     * @param {number} column
     * @param {string} source
     * @param {string=} file
     */
    constructor(message: string, line: number, column: number, source: string, file?: string | undefined);
    reason: string;
    line: number;
    column: number;
    source: string;
}
export function parseSvg(data: string, from?: string | undefined): import("./types.js").XastRoot;
