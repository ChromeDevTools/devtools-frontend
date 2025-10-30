import * as Common from '../common/common.js';
import * as Platform from '../platform/platform.js';
import type { FrameAssociated } from './FrameAssociated.js';
import { type PageResourceLoadInitiator } from './PageResourceLoader.js';
import { type DebugId, SourceMap, type SourceMapV3 } from './SourceMap.js';
import { type Target } from './Target.js';
export type SourceMapFactory<T> = (compiledURL: Platform.DevToolsPath.UrlString, sourceMappingURL: Platform.DevToolsPath.UrlString, payload: SourceMapV3, client: T) => SourceMap;
export declare class SourceMapManager<T extends FrameAssociated> extends Common.ObjectWrapper.ObjectWrapper<EventTypes<T>> {
    #private;
    constructor(target: Target, factory?: SourceMapFactory<T>);
    setEnabled(isEnabled: boolean): void;
    private static getBaseUrl;
    static resolveRelativeSourceURL(target: Target | null, url: Platform.DevToolsPath.UrlString): Platform.DevToolsPath.UrlString;
    sourceMapForClient(client: T): SourceMap | undefined;
    sourceMapForClientPromise(client: T): Promise<SourceMap | undefined>;
    clientForSourceMap(sourceMap: SourceMap): T | undefined;
    attachSourceMap(client: T, relativeSourceURL: Platform.DevToolsPath.UrlString, relativeSourceMapURL: string | undefined): void;
    cancelAttachSourceMap(client: T): void;
    detachSourceMap(client: T): void;
    waitForSourceMapsProcessedForTest(): Promise<unknown>;
}
export declare function loadSourceMap(url: Platform.DevToolsPath.UrlString, debugId: DebugId | null, initiator: PageResourceLoadInitiator): Promise<SourceMapV3>;
export declare function tryLoadSourceMap(url: Platform.DevToolsPath.UrlString, initiator: PageResourceLoadInitiator): Promise<SourceMapV3 | null>;
export declare enum Events {
    SourceMapWillAttach = "SourceMapWillAttach",
    SourceMapFailedToAttach = "SourceMapFailedToAttach",
    SourceMapAttached = "SourceMapAttached",
    SourceMapDetached = "SourceMapDetached"
}
export interface EventTypes<T extends FrameAssociated> {
    [Events.SourceMapWillAttach]: {
        client: T;
    };
    [Events.SourceMapFailedToAttach]: {
        client: T;
    };
    [Events.SourceMapAttached]: {
        client: T;
        sourceMap: SourceMap;
    };
    [Events.SourceMapDetached]: {
        client: T;
        sourceMap: SourceMap;
    };
}
