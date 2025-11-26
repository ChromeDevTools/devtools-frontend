import * as Common from '../../core/common/common.js';
import * as Platform from '../../core/platform/platform.js';
import type * as NetworkTimeCalculator from '../../models/network_time_calculator/network_time_calculator.js';
import * as PerfUI from '../../ui/legacy/components/perf_ui/perf_ui.js';
import * as UI from '../../ui/legacy/legacy.js';
declare const HeapTimelineOverview_base: (new (...args: any[]) => {
    "__#private@#events": Common.ObjectWrapper.ObjectWrapper<EventTypes>;
    addEventListener<T extends Events.IDS_RANGE_CHANGED>(eventType: T, listener: (arg0: Common.EventTarget.EventTargetEvent<EventTypes[T], any>) => void, thisObject?: Object): Common.EventTarget.EventDescriptor<EventTypes, T>;
    once<T extends Events.IDS_RANGE_CHANGED>(eventType: T): Promise<EventTypes[T]>;
    removeEventListener<T extends Events.IDS_RANGE_CHANGED>(eventType: T, listener: (arg0: Common.EventTarget.EventTargetEvent<EventTypes[T], any>) => void, thisObject?: Object): void;
    hasEventListeners(eventType: Events.IDS_RANGE_CHANGED): boolean;
    dispatchEventToListeners<T extends Events.IDS_RANGE_CHANGED>(eventType: Platform.TypeScriptUtilities.NoUnion<T>, ...eventData: Common.EventTarget.EventPayloadToRestParameters<EventTypes, T>): void;
}) & typeof UI.Widget.VBox;
export declare class HeapTimelineOverview extends HeapTimelineOverview_base {
    readonly overviewCalculator: OverviewCalculator;
    overviewContainer: HTMLElement;
    overviewGrid: PerfUI.OverviewGrid.OverviewGrid;
    overviewCanvas: HTMLCanvasElement;
    windowLeftRatio: number;
    windowRightRatio: number;
    readonly yScale: SmoothScale;
    readonly xScale: SmoothScale;
    profileSamples: Samples;
    running?: boolean;
    updateOverviewCanvas?: boolean;
    updateGridTimerId?: number;
    updateTimerId?: number | null;
    windowWidthRatio?: number;
    constructor();
    start(): void;
    stop(): void;
    setSamples(samples: Samples): void;
    drawOverviewCanvas(width: number, height: number): void;
    onResize(): void;
    onWindowChanged(): void;
    scheduleUpdate(): void;
    updateBoundaries(): void;
    update(): void;
    updateGrid(): void;
}
export declare const enum Events {
    IDS_RANGE_CHANGED = "IdsRangeChanged"
}
export interface IdsRangeChangedEvent {
    minId: number;
    maxId: number;
    size: number;
}
export interface EventTypes {
    [Events.IDS_RANGE_CHANGED]: IdsRangeChangedEvent;
}
export declare class SmoothScale {
    lastUpdate: number;
    currentScale: number;
    constructor();
    nextScale(target: number): number;
}
export declare class Samples {
    sizes: number[];
    ids: number[];
    timestamps: number[];
    max: number[];
    totalTime: number;
    constructor();
}
export declare class OverviewCalculator implements NetworkTimeCalculator.Calculator {
    maximumBoundaries: number;
    minimumBoundaries: number;
    xScaleFactor: number;
    constructor();
    updateBoundaries(chart: HeapTimelineOverview): void;
    computePosition(time: number): number;
    formatValue(value: number, precision?: number): string;
    maximumBoundary(): number;
    minimumBoundary(): number;
    zeroTime(): number;
    boundarySpan(): number;
}
export {};
