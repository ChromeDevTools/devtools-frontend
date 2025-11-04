import type * as Host from '../core/host/host.js';
import * as SDK from '../core/sdk/sdk.js';
export interface LoadResult {
    success: boolean;
    content: string;
    errorDescription: Host.ResourceLoader.LoadErrorDescription;
}
export declare function setupPageResourceLoaderForSourceMap(sourceMapContent: string): void;
export declare function loadBasicSourceMapExample(target: SDK.Target.Target): Promise<{
    sourceMap: SDK.SourceMap.SourceMap;
    script: SDK.Script.Script;
}>;
