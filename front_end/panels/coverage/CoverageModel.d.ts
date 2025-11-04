import * as Common from '../../core/common/common.js';
import * as Platform from '../../core/platform/platform.js';
import * as SDK from '../../core/sdk/sdk.js';
import type * as Protocol from '../../generated/protocol.js';
import type * as Bindings from '../../models/bindings/bindings.js';
import * as TextUtils from '../../models/text_utils/text_utils.js';
export declare const enum CoverageType {
    CSS = 1,
    JAVA_SCRIPT = 2,
    JAVA_SCRIPT_PER_FUNCTION = 4
}
export declare const enum SuspensionState {
    ACTIVE = "Active",
    SUSPENDING = "Suspending",
    SUSPENDED = "Suspended"
}
export declare enum Events {
    CoverageUpdated = "CoverageUpdated",
    CoverageReset = "CoverageReset",
    SourceMapResolved = "SourceMapResolved"
}
export interface EventTypes {
    [Events.CoverageUpdated]: CoverageInfo[];
    [Events.CoverageReset]: void;
    [Events.SourceMapResolved]: void;
}
export declare class CoverageModel extends SDK.SDKModel.SDKModel<EventTypes> {
    private cpuProfilerModel;
    private cssModel;
    private debuggerModel;
    private coverageByURL;
    private coverageByContentProvider;
    private coverageUpdateTimes;
    private suspensionState;
    private pollTimer;
    private currentPollPromise;
    private shouldResumePollingOnResume;
    private jsBacklog;
    private cssBacklog;
    private performanceTraceRecording;
    private sourceMapManager;
    private willResolveSourceMaps;
    private processSourceMapBacklog;
    constructor(target: SDK.Target.Target);
    start(jsCoveragePerBlock: boolean): Promise<boolean>;
    private sourceMapAttached;
    private resolveSourceMapsAndUpdate;
    private resolveSourceMap;
    preciseCoverageDeltaUpdate(timestamp: number, coverageData: Protocol.Profiler.ScriptCoverage[]): Promise<void>;
    stop(): Promise<void>;
    reset(): void;
    startPolling(): Promise<void>;
    private pollLoop;
    stopPolling(): Promise<void>;
    private pollAndCallback;
    private clearTimer;
    /**
     * Stops polling as preparation for suspension. This function is idempotent
     * due because it changes the state to suspending.
     */
    preSuspendModel(reason?: string): Promise<void>;
    suspendModel(_reason?: string): Promise<void>;
    resumeModel(): Promise<void>;
    /**
     * Restarts polling after suspension. Note that the function is idempotent
     * because starting polling is idempotent.
     */
    postResumeModel(): Promise<void>;
    entries(): URLCoverageInfo[];
    getCoverageForUrl(url: Platform.DevToolsPath.UrlString): URLCoverageInfo | null;
    usageForRange(contentProvider: TextUtils.ContentProvider.ContentProvider, startOffset: number, endOffset: number): boolean | undefined;
    private clearCSS;
    private takeAllCoverage;
    private takeJSCoverage;
    private backlogOrProcessJSCoverage;
    processJSBacklog(): Promise<void>;
    private processJSCoverage;
    private handleStyleSheetAdded;
    private takeCSSCoverage;
    private backlogOrProcessCSSCoverage;
    private processCSSCoverage;
    private static convertToDisjointSegments;
    private addStyleSheetToCSSCoverage;
    private calculateSizeForSources;
    private addCoverage;
    private addCoverageForSource;
    exportReport(fos: Bindings.FileUtils.FileOutputStream): Promise<void>;
}
export interface EntryForExport {
    url: Platform.DevToolsPath.UrlString;
    ranges: Array<{
        start: number;
        end: number;
    }>;
    text: string | null;
}
export declare class URLCoverageInfo extends Common.ObjectWrapper.ObjectWrapper<URLCoverageInfo.EventTypes> {
    #private;
    private coverageInfoByLocation;
    sourcesURLCoverageInfo: Map<Platform.DevToolsPath.UrlString, SourceURLCoverageInfo>;
    sourceSegments: SourceSegment[] | undefined;
    constructor(url: Platform.DevToolsPath.UrlString);
    url(): Platform.DevToolsPath.UrlString;
    type(): CoverageType;
    size(): number;
    usedSize(): number;
    unusedSize(): number;
    usedPercentage(): number;
    unusedPercentage(): number;
    isContentScript(): boolean;
    entries(): IterableIterator<CoverageInfo>;
    numberOfEntries(): number;
    removeCoverageEntry(key: string, entry: CoverageInfo): void;
    addToSizes(usedSize: number, size: number): void;
    setSourceSegments(segments: SourceSegment[]): void;
    ensureEntry(contentProvider: TextUtils.ContentProvider.ContentProvider, contentLength: number, lineOffset: number, columnOffset: number, type: CoverageType): CoverageInfo;
    getFullText(): Promise<TextUtils.Text.Text | null>;
    entriesForExportBasedOnFullText(fullText: TextUtils.Text.Text): EntryForExport;
    entriesForExportBasedOnContent(): Promise<EntryForExport[]>;
    entriesForExport(): Promise<EntryForExport[]>;
}
export declare class SourceURLCoverageInfo extends URLCoverageInfo {
    generatedURLCoverageInfo: URLCoverageInfo;
    lastSourceUsedRange: RangeOffset[];
    constructor(sourceUrl: Platform.DevToolsPath.UrlString, generatedUrlCoverage: URLCoverageInfo);
}
export declare namespace URLCoverageInfo {
    enum Events {
        SizesChanged = "SizesChanged"
    }
    interface EventTypes {
        [Events.SizesChanged]: void;
    }
}
export declare const mergeSegments: (segmentsA: CoverageSegment[], segmentsB: CoverageSegment[]) => CoverageSegment[];
export declare class CoverageInfo {
    private contentProvider;
    private size;
    private usedSize;
    private statsByTimestamp;
    private lineOffset;
    private columnOffset;
    private coverageType;
    private segments;
    private generatedUrlCoverageInfo;
    sourceUsedSizeMap: Map<Platform.DevToolsPath.UrlString, number>;
    sourceDeltaMap: Map<Platform.DevToolsPath.UrlString, number>;
    sourceUsedRangeMap: Map<Platform.DevToolsPath.UrlString, RangeOffset[]>;
    constructor(contentProvider: TextUtils.ContentProvider.ContentProvider, size: number, lineOffset: number, columnOffset: number, type: CoverageType, generatedUrlCoverageInfo: URLCoverageInfo);
    getContentProvider(): TextUtils.ContentProvider.ContentProvider;
    url(): Platform.DevToolsPath.UrlString;
    type(): CoverageType;
    addCoverageType(type: CoverageType): void;
    getOffsets(): {
        lineOffset: number;
        columnOffset: number;
    };
    /**
     * Returns the delta by which usedSize increased.
     */
    mergeCoverage(segments: CoverageSegment[]): number;
    getSize(): number;
    getUsedSize(): number;
    usageForRange(start: number, end: number): boolean;
    private updateStats;
    private updateSourceCoverage;
    rangesForExport(offset?: number): Array<{
        start: number;
        end: number;
    }>;
}
export interface RangeUseCount {
    startOffset: number;
    endOffset: number;
    count: number;
}
export interface CoverageSegment {
    end: number;
    count: number;
    stamp: number;
}
export interface SourceSegment {
    end: number;
    sourceUrl: Platform.DevToolsPath.UrlString;
}
export interface EntryRange {
    range: TextUtils.TextRange.TextRange;
    sourceRange: TextUtils.TextRange.TextRange;
    sourceURL: Platform.DevToolsPath.UrlString;
}
export interface RangeOffset {
    start: number;
    end: number;
}
export interface SourceMapObject {
    script: SDK.Script.Script;
    sourceMap: SDK.SourceMap.SourceMap;
}
