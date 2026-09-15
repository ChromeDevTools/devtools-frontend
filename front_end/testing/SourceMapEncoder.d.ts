import * as SDK from '../core/sdk/sdk.js';
export declare function encodeUnsignedVlq(n: number): string;
export declare function encodeVlq(n: number): string;
export declare function encodeVlqList(list: number[]): string;
/**
 * Encode array mappings of the form "compiledLine:compiledColumn => srcFile:srcLine:srcColumn@name"
 * as a source map.
 *
 * A mapping may be suffixed with " (range)" to mark it as a range mapping, in which case a
 * `rangeMappings` field is emitted alongside `mappings`.
 **/
export declare function encodeSourceMap(textMap: string[], sourceRoot?: string): SDK.SourceMap.SourceMapV3Object;
export declare function waitForAllSourceMapsProcessed(): Promise<unknown>;
