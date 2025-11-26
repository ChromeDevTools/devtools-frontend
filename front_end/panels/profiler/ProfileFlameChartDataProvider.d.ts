import * as Common from '../../core/common/common.js';
import * as Platform from '../../core/platform/platform.js';
import type * as CPUProfile from '../../models/cpu_profile/cpu_profile.js';
import type * as NetworkTimeCalculator from '../../models/network_time_calculator/network_time_calculator.js';
import * as PerfUI from '../../ui/legacy/components/perf_ui/perf_ui.js';
import * as UI from '../../ui/legacy/legacy.js';
export declare class ProfileFlameChartDataProvider implements PerfUI.FlameChart.FlameChartDataProvider {
    #private;
    maxStackDepthInternal: number;
    timelineDataInternal: PerfUI.FlameChart.FlameChartTimelineData | null;
    entryNodes: CPUProfile.ProfileTreeModel.ProfileNode[];
    boldFont?: string;
    constructor();
    static colorGenerator(): Common.Color.Generator;
    minimumBoundary(): number;
    totalTime(): number;
    formatValue(value: number, precision?: number): string;
    maxStackDepth(): number;
    hasTrackConfigurationMode(): boolean;
    timelineData(): PerfUI.FlameChart.FlameChartTimelineData | null;
    calculateTimelineData(): PerfUI.FlameChart.FlameChartTimelineData;
    preparePopoverElement(_entryIndex: number): Element | null;
    canJumpToEntry(entryIndex: number): boolean;
    entryTitle(entryIndex: number): string;
    entryFont(entryIndex: number): string | null;
    entryHasDeoptReason(_entryIndex: number): boolean;
    entryColor(entryIndex: number): string;
    decorateEntry(_entryIndex: number, _context: CanvasRenderingContext2D, _text: string | null, _barX: number, _barY: number, _barWidth: number, _barHeight: number): boolean;
    forceDecoration(_entryIndex: number): boolean;
    textColor(_entryIndex: number): string;
    entryNodesLength(): number;
}
declare const ProfileFlameChart_base: (new (...args: any[]) => {
    "__#private@#events": Common.ObjectWrapper.ObjectWrapper<PerfUI.FlameChart.EventTypes>;
    addEventListener<T extends keyof PerfUI.FlameChart.EventTypes>(eventType: T, listener: (arg0: Common.EventTarget.EventTargetEvent<PerfUI.FlameChart.EventTypes[T], any>) => void, thisObject?: Object): Common.EventTarget.EventDescriptor<PerfUI.FlameChart.EventTypes, T>;
    once<T extends keyof PerfUI.FlameChart.EventTypes>(eventType: T): Promise<PerfUI.FlameChart.EventTypes[T]>;
    removeEventListener<T extends keyof PerfUI.FlameChart.EventTypes>(eventType: T, listener: (arg0: Common.EventTarget.EventTargetEvent<PerfUI.FlameChart.EventTypes[T], any>) => void, thisObject?: Object): void;
    hasEventListeners(eventType: keyof PerfUI.FlameChart.EventTypes): boolean;
    dispatchEventToListeners<T extends keyof PerfUI.FlameChart.EventTypes>(eventType: Platform.TypeScriptUtilities.NoUnion<T>, ...eventData: Common.EventTarget.EventPayloadToRestParameters<PerfUI.FlameChart.EventTypes, T>): void;
}) & typeof UI.Widget.VBox;
export declare class ProfileFlameChart extends ProfileFlameChart_base implements UI.SearchableView.Searchable {
    readonly searchableView: UI.SearchableView.SearchableView;
    readonly overviewPane: OverviewPane;
    readonly mainPane: PerfUI.FlameChart.FlameChart;
    entrySelected: boolean;
    readonly dataProvider: ProfileFlameChartDataProvider;
    searchResults: number[];
    searchResultIndex: number;
    constructor(searchableView: UI.SearchableView.SearchableView, dataProvider: ProfileFlameChartDataProvider);
    focus(): void;
    onWindowChanged(event: Common.EventTarget.EventTargetEvent<OverviewPaneWindowChangedEvent>): void;
    selectRange(timeLeft: number, timeRight: number): void;
    onEntrySelected(event: Common.EventTarget.EventTargetEvent<void | number>): void;
    onEntryInvoked(event: Common.EventTarget.EventTargetEvent<number>): void;
    update(): void;
    performSearch(searchConfig: UI.SearchableView.SearchConfig, _shouldJump: boolean, jumpBackwards?: boolean): void;
    onSearchCanceled(): void;
    jumpToNextSearchResult(): void;
    jumpToPreviousSearchResult(): void;
    supportsCaseSensitiveSearch(): boolean;
    supportsWholeWordSearch(): boolean;
    supportsRegexSearch(): boolean;
}
export declare class OverviewCalculator implements NetworkTimeCalculator.Calculator {
    readonly formatter: (arg0: number, arg1?: number | undefined) => string;
    minimumBoundaries: number;
    maximumBoundaries: number;
    xScaleFactor: number;
    constructor(formatter: (arg0: number, arg1?: number | undefined) => string);
    updateBoundaries(overviewPane: OverviewPane): void;
    computePosition(time: number): number;
    formatValue(value: number, precision?: number): string;
    maximumBoundary(): number;
    minimumBoundary(): number;
    zeroTime(): number;
    boundarySpan(): number;
}
declare const OverviewPane_base: (new (...args: any[]) => {
    "__#private@#events": Common.ObjectWrapper.ObjectWrapper<OverviewPaneEventTypes>;
    addEventListener<T extends OverviewPaneEvents.WINDOW_CHANGED>(eventType: T, listener: (arg0: Common.EventTarget.EventTargetEvent<OverviewPaneEventTypes[T], any>) => void, thisObject?: Object): Common.EventTarget.EventDescriptor<OverviewPaneEventTypes, T>;
    once<T extends OverviewPaneEvents.WINDOW_CHANGED>(eventType: T): Promise<OverviewPaneEventTypes[T]>;
    removeEventListener<T extends OverviewPaneEvents.WINDOW_CHANGED>(eventType: T, listener: (arg0: Common.EventTarget.EventTargetEvent<OverviewPaneEventTypes[T], any>) => void, thisObject?: Object): void;
    hasEventListeners(eventType: OverviewPaneEvents.WINDOW_CHANGED): boolean;
    dispatchEventToListeners<T extends OverviewPaneEvents.WINDOW_CHANGED>(eventType: Platform.TypeScriptUtilities.NoUnion<T>, ...eventData: Common.EventTarget.EventPayloadToRestParameters<OverviewPaneEventTypes, T>): void;
}) & typeof UI.Widget.VBox;
export declare class OverviewPane extends OverviewPane_base implements PerfUI.FlameChart.FlameChartDelegate {
    overviewContainer: HTMLElement;
    readonly overviewCalculator: OverviewCalculator;
    readonly overviewGrid: PerfUI.OverviewGrid.OverviewGrid;
    overviewCanvas: HTMLCanvasElement;
    dataProvider: PerfUI.FlameChart.FlameChartDataProvider;
    windowTimeLeft?: number;
    windowTimeRight?: number;
    updateTimerId?: number;
    constructor(dataProvider: PerfUI.FlameChart.FlameChartDataProvider);
    windowChanged(windowStartTime: number, windowEndTime: number): void;
    updateRangeSelection(_startTime: number, _endTime: number): void;
    updateSelectedGroup(_flameChart: PerfUI.FlameChart.FlameChart, _group: PerfUI.FlameChart.Group | null): void;
    selectRange(timeLeft: number, timeRight: number): void;
    onWindowChanged(event: Common.EventTarget.EventTargetEvent<PerfUI.OverviewGrid.WindowChangedWithPositionEvent>): void;
    timelineData(): PerfUI.FlameChart.FlameChartTimelineData | null;
    onResize(): void;
    scheduleUpdate(): void;
    update(): void;
    drawOverviewCanvas(): void;
    calculateDrawData(width: number): Uint8Array;
    resetCanvas(width: number, height: number): void;
}
export declare const enum OverviewPaneEvents {
    WINDOW_CHANGED = "WindowChanged"
}
export interface OverviewPaneWindowChangedEvent {
    windowTimeLeft: number;
    windowTimeRight: number;
}
export interface OverviewPaneEventTypes {
    [OverviewPaneEvents.WINDOW_CHANGED]: OverviewPaneWindowChangedEvent;
}
export {};
