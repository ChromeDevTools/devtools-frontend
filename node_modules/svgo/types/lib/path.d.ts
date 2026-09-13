/**
 * @fileoverview Based on https://www.w3.org/TR/SVG11/paths.html#PathDataBNF.
 */
export type ReadNumberState = 'none' | 'sign' | 'whole' | 'decimal_point' | 'decimal' | 'e' | 'exponent_sign' | 'exponent';
export type StringifyPathDataOptions = {
    pathData: ReadonlyArray<import('./types.js').PathDataItem>;
    precision?: number | undefined;
    disableSpaceAfterFlags?: boolean | undefined;
};
/**
 * @param {string} string
 * @returns {import('./types.js').PathDataItem[]}
 */
export declare const parsePathData: (string: string) => import('./types.js').PathDataItem[];
/**
 * @param {StringifyPathDataOptions} options
 * @returns {string}
 */
export declare const stringifyPathData: ({ pathData, precision, disableSpaceAfterFlags, }: StringifyPathDataOptions) => string;
