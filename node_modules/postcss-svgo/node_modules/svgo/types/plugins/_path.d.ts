export function path2js(path: import("../lib/types.js").XastElement): import("../lib/types.js").PathDataItem[];
export function js2path(path: import("../lib/types.js").XastElement, data: ReadonlyArray<import("../lib/types.js").PathDataItem>, params: Js2PathParams): void;
export function intersects(path1: ReadonlyArray<import("../lib/types.js").PathDataItem>, path2: ReadonlyArray<import("../lib/types.js").PathDataItem>): boolean;
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
