export type Js2PathParams = {
    floatPrecision?: number | undefined;
    noSpaceAfterFlags?: boolean | undefined;
};
export type Point = {
    list: number[][];
    minX: number;
    minY: number;
    maxX: number;
    maxY: number;
};
export type Points = {
    list: Point[];
    minX: number;
    minY: number;
    maxX: number;
    maxY: number;
};
/**
 * Convert path string to JS representation.
 *
 * @param {import('../lib/types.js').XastElement} path
 * @returns {import('../lib/types.js').PathDataItem[]}
 */
export declare const path2js: (path: import('../lib/types.js').XastElement) => import('../lib/types.js').PathDataItem[];
/**
 * Convert path array to string.
 *
 * @param {import('../lib/types.js').XastElement} path
 * @param {ReadonlyArray<import('../lib/types.js').PathDataItem>} data
 * @param {Js2PathParams} params
 */
export declare const js2path: (path: import('../lib/types.js').XastElement, data: ReadonlyArray<import('../lib/types.js').PathDataItem>, params: Js2PathParams) => void;
/**
 * Checks if two paths have an intersection by checking convex hulls
 * collision using Gilbert-Johnson-Keerthi distance algorithm
 * https://web.archive.org/web/20180822200027/http://entropyinteractive.com/2011/04/gjk-algorithm/
 *
 * @param {ReadonlyArray<import('../lib/types.js').PathDataItem>} path1
 * @param {ReadonlyArray<import('../lib/types.js').PathDataItem>} path2
 * @returns {boolean}
 */
export declare const intersects: (path1: ReadonlyArray<import('../lib/types.js').PathDataItem>, path2: ReadonlyArray<import('../lib/types.js').PathDataItem>) => boolean;
