import * as Common from '../../core/common/common.js';
import * as Trace from '../../models/trace/trace.js';
import * as UI from '../../ui/legacy/legacy.js';
import type { TimelineMiniMap } from './TimelineMiniMap.js';
/**
 * The dropdown works by returning an index which is the trace index; but we
 * also need a way to signify that the user picked the "Landing Page" option. We
 * represent that as Infinity so we never accidentally collide with an actual
 * trace (in reality a large number like 99 would probably suffice...)
 */
export declare const LANDING_PAGE_INDEX_DROPDOWN_CHOICE: number;
/**
 * The dropdown includes an option to navigate to the landing page; hence the
 * two types for storing recordings. The TimelineHistoryManager automatically
 * includes a link to go back to the landing page.
 */
interface TraceRecordingHistoryItem {
    type: 'TRACE_INDEX';
    parsedTraceIndex: number;
}
interface LandingPageHistoryItem {
    type: 'LANDING_PAGE';
}
export type RecordingData = TraceRecordingHistoryItem | LandingPageHistoryItem;
export interface NewHistoryRecordingData {
    data: TraceRecordingHistoryItem;
    filmStripForPreview: Trace.Extras.FilmStrip.Data | null;
    parsedTrace: Trace.TraceModel.ParsedTrace;
}
export declare class TimelineHistoryManager {
    #private;
    private recordings;
    private readonly action;
    private readonly nextNumberByDomain;
    private readonly allOverviews;
    private totalHeight;
    private enabled;
    private lastActiveTrace;
    constructor(minimapComponent?: TimelineMiniMap, isNode?: boolean);
    addRecording(newInput: NewHistoryRecordingData): void;
    setEnabled(enabled: boolean): void;
    button(): ToolbarButton;
    clear(): void;
    showHistoryDropDown(): Promise<RecordingData | null>;
    cancelIfShowing(): void;
    /**
     * Navigate by 1 in either direction to the next trace.
     * Navigating in this way does not include the landing page; it will loop
     * over only the traces.
     */
    navigate(direction: number): TraceRecordingHistoryItem | null;
    navigateToLandingPage(): void;
    private updateState;
    static previewElement(parsedTraceIndex: number): Element;
    private title;
    private static dataForTraceIndex;
}
export declare const maxRecordings = 5;
export declare const previewWidth = 500;
export interface PreviewData {
    preview: Element;
    lastUsed: number;
    title: string;
}
export declare class DropDown implements UI.ListControl.ListDelegate<number> {
    #private;
    private readonly glassPane;
    private readonly listControl;
    private readonly focusRestorer;
    private selectionDone;
    contentElement: HTMLElement;
    constructor(availableparsedTraceIndexes: number[], landingPageTitle: Common.UIString.LocalizedString);
    static show(availableparsedTraceIndexes: number[], activeparsedTraceIndex: number, anchor: Element, landingPageTitle?: Common.UIString.LocalizedString): Promise<number | null>;
    static cancelIfShowing(): void;
    private show;
    private onMouseMove;
    private onClick;
    private onKeyDown;
    private close;
    createElementForItem(parsedTraceIndex: number): Element;
    heightForItem(_parsedTraceIndex: number): number;
    isItemSelectable(_parsedTraceIndex: number): boolean;
    selectedItemChanged(_from: number | null, _to: number | null, fromElement: Element | null, toElement: Element | null): void;
    updateSelectedItemARIA(_fromElement: Element | null, _toElement: Element | null): boolean;
    static instance: DropDown | null;
}
export declare class ToolbarButton extends UI.Toolbar.ToolbarItem {
    private contentElement;
    constructor(action: UI.ActionRegistration.Action);
    setText(text: string): void;
}
export {};
