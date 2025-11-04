import * as SDK from '../core/sdk/sdk.js';
export declare function encodeVlq(n: number): string;
export declare function encodeVlqList(list: number[]): string;
/**
 * Encode array mappings of the form "compiledLine:compiledColumn => srcFile:srcLine:srcColumn@name"
 * as a source map.
 **/
export declare function encodeSourceMap(textMap: string[], sourceRoot?: string): SDK.SourceMap.SourceMapV3Object;
export declare function waitForAllSourceMapsProcessed(): Promise<unknown>;
