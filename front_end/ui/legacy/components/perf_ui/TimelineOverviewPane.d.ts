import * as Common from '../../../../core/common/common.js';
import * as Trace from '../../../../models/trace/trace.js';
import * as UI from '../../legacy.js';
import { OverviewGrid } from './OverviewGrid.js';
import { TimelineOverviewCalculator } from './TimelineOverviewCalculator.js';
export interface HighlightRange {
    left: number;
    right: number;
    withBracket: boolean;
}
export interface ViewInput {
    /**
     * Prefix for the element ids and the visual logging context, for example
     * `timeline` or `network`.
     */
    prefix: string;
    /**
     * The `OverviewGrid`, which is the resizer and canvas host of the overview:
     * the grid manages the time grid, the window resizers and the overview
     * control canvases in it. The view places it in the pane and adds the cursor
     * to it.
     */
    overviewGrid: OverviewGrid;
    overviewInfo: OverviewInfo;
    overviewInfoElements: readonly Element[];
    cursorPosition: number;
    cursorVisible: boolean;
    highlight: HighlightRange | null;
    highlightBackgroundColor: string;
    highlightBracketColor: string;
    onPointerDown: () => void;
    onPointerUp: () => void;
    onCursorMove: (position: number) => void;
    onCursorLeave: () => void;
}
export interface ViewOutput {
    /**
     * Returns the left edge of the cursor area in client coordinates.
     */
    cursorAreaLeft?: () => number;
    /**
     * Returns the box of the cursor marker. The overview info is anchored to it.
     */
    cursorAnchorBox?: () => AnchorBox;
}
export type View = (input: ViewInput, output: ViewOutput, target: HTMLElement) => void;
export declare const DEFAULT_VIEW: View;
declare const TimelineOverviewPaneBase: Common.ObjectWrapper.EventMixin<EventTypes, typeof UI.Widget.VBox>;
export declare class TimelineOverviewPane extends TimelineOverviewPaneBase {
    #private;
    readonly overviewCalculator: TimelineOverviewCalculator;
    private readonly overviewGrid;
    private overviewControls;
    private markers;
    private readonly overviewInfo;
    private readonly updateThrottler;
    private cursorEnabled;
    private cursorPosition;
    private lastWidth;
    private windowStartTime;
    private windowEndTime;
    private muteOnWindowChanged;
    private hasPointer;
    constructor(prefixOrElement?: string | HTMLElement, view?: View);
    performUpdate(): void;
    enableCreateBreadcrumbsButton(): void;
    private onMouseDown;
    private onMouseCancel;
    private onMouseMove;
    private updateOverviewInfo;
    private hideCursor;
    wasShown(): void;
    willHide(): void;
    onResize(): void;
    setOverviewControls(overviewControls: TimelineOverview[]): void;
    set showingScreenshots(isShowing: boolean);
    setBounds(minimumBoundary: Trace.Types.Timing.Milli, maximumBoundary: Trace.Types.Timing.Milli): void;
    setNavStartTimes(navStartTimes: readonly Trace.Types.Events.NavigationStart[]): void;
    scheduleUpdate(start?: Trace.Types.Timing.Milli, end?: Trace.Types.Timing.Milli): void;
    update(start?: Trace.Types.Timing.Milli, end?: Trace.Types.Timing.Milli): void;
    setMarkers(markers: Map<number, HTMLDivElement>): void;
    private updateMarkers;
    reset(): void;
    private onClick;
    private onBreadcrumbAdded;
    private onWindowChanged;
    setWindowTimes(startTime: Trace.Types.Timing.Milli, endTime: Trace.Types.Timing.Milli): void;
    private updateWindow;
    /**
     * Desaturates the overview outside of the given time bounds.
     *
     * @param bounds the time bounds to keep saturated.
     * @param withBracket whether to draw a bracket above the time bounds.
     */
    highlightBounds(bounds: Trace.Types.Timing.TraceWindowMicro, withBracket: boolean): void;
    clearBoundsHighlight(): void;
}
export declare const enum Events {
    OVERVIEW_PANE_WINDOW_CHANGED = "OverviewPaneWindowChanged",
    OVERVIEW_PANE_BREADCRUMB_ADDED = "OverviewPaneBreadcrumbAdded",
    OVERVIEW_PANE_MOUSE_MOVE = "OverviewPaneMouseMove",
    OVERVIEW_PANE_MOUSE_LEAVE = "OverviewPaneMouseLeave"
}
export interface OverviewPaneWindowChangedEvent {
    startTime: Trace.Types.Timing.Milli;
    endTime: Trace.Types.Timing.Milli;
}
export interface OverviewPaneBreadcrumbAddedEvent {
    startTime: Trace.Types.Timing.Milli;
    endTime: Trace.Types.Timing.Milli;
}
export interface OverviewPaneMouseMoveEvent {
    timeInMicroSeconds: Trace.Types.Timing.Micro;
}
export interface EventTypes {
    [Events.OVERVIEW_PANE_WINDOW_CHANGED]: OverviewPaneWindowChangedEvent;
    [Events.OVERVIEW_PANE_BREADCRUMB_ADDED]: OverviewPaneBreadcrumbAddedEvent;
    [Events.OVERVIEW_PANE_MOUSE_MOVE]: OverviewPaneMouseMoveEvent;
    [Events.OVERVIEW_PANE_MOUSE_LEAVE]: void;
}
export interface TimelineOverview {
    show(parentElement: Element, insertBefore?: Element | null): void;
    update(start?: Trace.Types.Timing.Milli, end?: Trace.Types.Timing.Milli): void;
    dispose(): void;
    reset(): void;
    overviewInfoPromise(x: number): Promise<Element | null>;
    onClick(event: Event): boolean;
    setCalculator(calculator: TimelineOverviewCalculator): void;
}
export declare class TimelineOverviewBase extends UI.Widget.VBox implements TimelineOverview {
    #private;
    private canvas;
    constructor(options?: UI.Widget.WidgetOptions);
    constructor(element?: HTMLElement, options?: UI.Widget.WidgetOptions);
    width(): number;
    height(): number;
    context(): CanvasRenderingContext2D;
    calculator(): TimelineOverviewCalculator | null;
    update(): void;
    dispose(): void;
    reset(): void;
    overviewInfoPromise(_x: number): Promise<Element | null>;
    setCalculator(calculator: TimelineOverviewCalculator): void;
    onClick(_event: Event): boolean;
    resetCanvas(): void;
    setCanvasSize(width: number, height: number): void;
}
export declare class OverviewInfo {
    #private;
    readonly contentRoot: ShadowRoot;
    constructor();
    show(anchorBox: AnchorBox | null): void;
    hide(): void;
}
export {};
