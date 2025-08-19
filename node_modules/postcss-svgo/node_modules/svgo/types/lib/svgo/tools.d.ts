export function encodeSVGDatauri(str: string, type?: import("../types.js").DataUri | undefined): string;
export function decodeSVGDatauri(str: string): string;
export function cleanupOutData(data: ReadonlyArray<number>, params: CleanupOutDataParams, command?: import("../types.js").PathDataCommand | undefined): string;
export function removeLeadingZero(value: number): string;
export function hasScripts(node: import("../types.js").XastElement): boolean;
export function includesUrlReference(body: string): boolean;
export function findReferences(attribute: string, value: string): string[];
export function toFixed(num: number, precision: number): number;
export type CleanupOutDataParams = {
    noSpaceAfterFlags?: boolean | undefined;
    leadingZero?: boolean | undefined;
    negativeExtraSpace?: boolean | undefined;
};
