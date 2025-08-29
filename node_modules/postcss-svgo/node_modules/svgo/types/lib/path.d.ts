export function parsePathData(string: string): import("./types.js").PathDataItem[];
export function stringifyPathData({ pathData, precision, disableSpaceAfterFlags, }: StringifyPathDataOptions): string;
export type ReadNumberState = "none" | "sign" | "whole" | "decimal_point" | "decimal" | "e" | "exponent_sign" | "exponent";
export type StringifyPathDataOptions = {
    pathData: ReadonlyArray<import("./types.js").PathDataItem>;
    precision?: number | undefined;
    disableSpaceAfterFlags?: boolean | undefined;
};
