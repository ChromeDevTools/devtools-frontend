import type * as Platform from '../platform/platform.js';
import type { DebugId, SourceMapV3 } from './SourceMap.js';
/** A thin wrapper around the Cache API to store source map JSONs keyed on Debug IDs */
export declare class SourceMapCache {
    #private;
    static create(): SourceMapCache;
    static createForTest(name: string): SourceMapCache;
    private constructor();
    set(debugId: DebugId, securityOrigin: Platform.DevToolsPath.UrlString, sourceMap: SourceMapV3): Promise<void>;
    get(debugId: DebugId, securityOrigin: Platform.DevToolsPath.UrlString): Promise<SourceMapV3 | null>;
    disposeForTest(): Promise<void>;
}
