import * as Platform from '../../core/platform/platform.js';
import * as SDK from '../../core/sdk/sdk.js';
import type * as Protocol from '../../generated/protocol.js';
import * as Trace from '../../models/trace/trace.js';
import * as LegacyComponents from '../../ui/legacy/components/utils/utils.js';
import * as ThirdPartyTreeView from './ThirdPartyTreeView.js';
/** Look for scheme:// plus text and exclude any punctuation at the end. **/
export declare const URL_REGEX: RegExp;
interface LinkifyLocationOptions {
    scriptId: Protocol.Runtime.ScriptId | null;
    url: string;
    lineNumber: number;
    target: SDK.Target.Target | null;
    linkifier: LegacyComponents.Linkifier.Linkifier;
    isFreshOrEnhanced?: boolean;
    columnNumber?: number;
    omitOrigin?: boolean;
}
type TimeRangeCategoryStats = Record<string, number>;
export declare class TimelineUIUtils {
    /**
     * use getGetDebugModeEnabled() to query this variable.
     */
    static debugModeEnabled: boolean | undefined;
    static getGetDebugModeEnabled(): boolean;
    static frameDisplayName(frame: Protocol.Runtime.CallFrame): string;
    static testContentMatching(traceEvent: Trace.Types.Events.Event, regExp: RegExp, handlerData?: Trace.Handlers.Types.HandlerData): boolean;
    static eventStyle(event: Trace.Types.Events.Event): Trace.Styles.TimelineRecordStyle;
    static eventColor(event: Trace.Types.Events.Event): string;
    static eventTitle(event: Trace.Types.Events.Event): string;
    static isUserFrame(frame: Protocol.Runtime.CallFrame): boolean;
    static buildDetailsNodeForTraceEvent(event: Trace.Types.Events.Event, target: SDK.Target.Target | null, linkifier: LegacyComponents.Linkifier.Linkifier, isFreshOrEnhanced: boolean | undefined, parsedTrace: Trace.TraceModel.ParsedTrace): Promise<Node | null>;
    static linkifyLocation(linkifyOptions: LinkifyLocationOptions): Element | null;
    static linkifyTopCallFrame(event: Trace.Types.Events.Event, target: SDK.Target.Target | null, linkifier: LegacyComponents.Linkifier.Linkifier, isFreshOrEnhanced?: boolean): Element | null;
    static buildDetailsNodeForMarkerEvents(event: Trace.Types.Events.MarkerEvent): HTMLElement;
    static buildConsumeCacheDetails(eventData: {
        consumedCacheSize?: number;
        cacheRejected?: boolean;
        cacheKind?: string;
    }, contentHelper: TimelineDetailsContentHelper): void;
    static maybeCreateLinkElement(url: string): Element | null;
    /**
     * Takes an input string and parses it to look for links. It does this by
     * looking for URLs in the input string. The returned fragment will contain
     * the same string but with any links wrapped in clickable links. The text
     * of the link is the URL, so the visible string to the user is unchanged.
     */
    static parseStringForLinks(rawString: string): DocumentFragment;
    static buildTraceEventDetails(parsedTrace: Trace.TraceModel.ParsedTrace, event: Trace.Types.Events.Event, linkifier: LegacyComponents.Linkifier.Linkifier, canShowPieChart: boolean, entityMapper: Trace.EntityMapper.EntityMapper | null): Promise<DocumentFragment>;
    static statsForTimeRange(events: Trace.Types.Events.Event[], startTime: Trace.Types.Timing.Milli, endTime: Trace.Types.Timing.Milli): TimeRangeCategoryStats;
    private static renderEventJson;
    private static renderObjectJson;
    static stackTraceFromCallFrames(callFrames: Protocol.Runtime.CallFrame[] | Trace.Types.Events.CallFrame[]): Protocol.Runtime.StackTrace;
    /** This renders a stack trace... and other cool stuff. */
    static generateCauses(event: Trace.Types.Events.Event, contentHelper: TimelineDetailsContentHelper, parsedTrace: Trace.TraceModel.ParsedTrace): Promise<void>;
    private static createEntryLink;
    private static generateInvalidationsList;
    private static generateInvalidationsForReason;
    /** Populates the passed object then returns true/false if it makes sense to show the pie chart */
    private static aggregatedStatsForTraceEvent;
    static buildPicturePreviewContent(parsedTrace: Trace.TraceModel.ParsedTrace, event: Trace.Types.Events.Paint, target: SDK.Target.Target): Promise<Element | null>;
    static createEventDivider(event: Trace.Types.Events.Event, zeroTime: number): HTMLDivElement;
    static visibleEventsFilter(): Trace.Extras.TraceFilter.TraceFilter;
    static categories(): Trace.Styles.CategoryPalette;
    static generatePieChart(aggregatedStats: TimeRangeCategoryStats, selfCategory?: Trace.Styles.TimelineCategory, selfTime?: Trace.Types.Timing.Micro): Element;
    static generateSummaryDetails(aggregatedStats: Record<string, number>, rangeStart: number, rangeEnd: number, selectedEvents: Trace.Types.Events.Event[], thirdPartyTree: ThirdPartyTreeView.ThirdPartyTreeViewWidget): Element;
    static generateDetailsContentForFrame(frame: Trace.Types.Events.LegacyTimelineFrame, filmStrip: Trace.Extras.FilmStrip.Data | null, filmStripFrame: Trace.Extras.FilmStrip.Frame | null): DocumentFragment;
    static frameDuration(frame: Trace.Types.Events.LegacyTimelineFrame): Element;
    static quadWidth(quad: number[]): number;
    static quadHeight(quad: number[]): number;
    static eventDispatchDesciptors(): EventDispatchTypeDescriptor[];
    static markerStyleForEvent(event: Trace.Types.Events.Event): TimelineMarkerStyle;
    static colorForId(id: string): string;
    static displayNameForFrame(frame: Trace.Types.Events.TraceFrame, trimAt?: number): string;
    static getOriginWithEntity(entityMapper: Trace.EntityMapper.EntityMapper | null, parsedTrace: Trace.TraceModel.ParsedTrace, event: Trace.Types.Events.Event): string | null;
}
export declare const aggregatedStatsKey: unique symbol;
export declare const previewElementSymbol: unique symbol;
export declare class EventDispatchTypeDescriptor {
    priority: number;
    color: string;
    eventTypes: string[];
    constructor(priority: number, color: string, eventTypes: string[]);
}
export declare class TimelineDetailsContentHelper {
    #private;
    fragment: DocumentFragment;
    private target;
    element: HTMLDivElement;
    private tableElement;
    constructor(target: SDK.Target.Target | null, linkifier: LegacyComponents.Linkifier.Linkifier | null);
    addSection(title: string, swatchColor?: string, event?: Trace.Types.Events.Event): void;
    linkifier(): LegacyComponents.Linkifier.Linkifier | null;
    appendTextRow(title: string, value: string | number | boolean): void;
    appendElementRow(title: string, content: string | Node, isWarning?: boolean, isStacked?: boolean): void;
    appendLocationRow(title: string, url: string, startLine: number, startColumn?: number, text?: string, omitOrigin?: boolean): void;
    appendLocationRange(title: string, url: Platform.DevToolsPath.UrlString, startLine: number, endLine?: number): void;
    createChildStackTraceElement(runtimeStackTrace: Protocol.Runtime.StackTrace): Promise<void>;
}
export declare const categoryBreakdownCacheSymbol: unique symbol;
export interface TimelineMarkerStyle {
    title: string;
    color: string;
    lineWidth: number;
    dashStyle: number[];
    tall: boolean;
    lowPriority: boolean;
}
/**
 * Given a particular event, this method can adjust its timestamp by
 * substracting the timestamp of the previous navigation. This helps in cases
 * where the user has navigated multiple times in the trace, so that we can show
 * the LCP (for example) relative to the last navigation.
 **/
export declare function timeStampForEventAdjustedForClosestNavigationIfPossible(event: Trace.Types.Events.Event, parsedTrace: Trace.TraceModel.ParsedTrace | null): Trace.Types.Timing.Milli;
/**
 * Determines if an event is potentially a marker event. A marker event here
 * is a single moment in time that we want to highlight on the timeline, such as
 * the LCP time. This method does not filter out events: for example, it treats
 * every LCP Candidate event as a potential marker event.
 **/
export declare function isMarkerEvent(parsedTrace: Trace.TraceModel.ParsedTrace, event: Trace.Types.Events.Event): boolean;
export {};
