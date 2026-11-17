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
    constructor(minimapComponent?: TimelineMiniMap, isNode?: boolean);
    addRecording(newInput: NewHistoryRecordingData): void;
    setEnabled(enabled: boolean): void;
    button(): UI.Toolbar.ToolbarItem;
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
}
export type DropDownItem = {
    type: 'LANDING_PAGE';
    title: Common.UIString.LocalizedString;
} | {
    type: 'RECORDING';
    parsedTraceIndex: number;
    preview: PreviewData;
};
export type NavigationTarget = 'previous' | 'next' | 'first' | 'last';
export interface DropDownViewInput {
    items: DropDownItem[];
    selectedItem: DropDownItem | null;
    onHover: (item: DropDownItem) => void;
    onActivate: (item: DropDownItem) => void;
    onNavigate: (target: NavigationTarget) => void;
    onActivateSelected: () => void;
    onCancel: () => void;
}
export type View = (input: DropDownViewInput, output: undefined, target: HTMLElement | DocumentFragment) => void;
export declare const DEFAULT_VIEW: View;
export declare const maxRecordings = 5;
export declare const previewWidth = 500;
export interface PreviewData {
    lastUsed: number;
    title: string;
    metadataText: string;
    screenshotEvent: Trace.Extras.FilmStrip.Frame['screenshotEvent'] | null;
    overview: ImageBitmap;
    overviewHeight: number;
}
export declare class DropDown extends UI.Widget.Widget<ShadowRoot> {
    #private;
    constructor(element?: HTMLElement, view?: View);
    get items(): DropDownItem[];
    set items(items: DropDownItem[]);
    get selectedItem(): DropDownItem | null;
    set selectedItem(item: DropDownItem | null);
    wasShown(): void;
    performUpdate(): void;
    static show(availableparsedTraceIndexes: number[], activeparsedTraceIndex: number, anchor: Element, landingPageTitle?: Common.UIString.LocalizedString, view?: View): Promise<number | null>;
    static cancelIfShowing(): void;
    static instance: DropDown | null;
}
export {};
