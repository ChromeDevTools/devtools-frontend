import '../../ui/legacy/legacy.js';
import * as Common from '../../core/common/common.js';
import * as Trace from '../../models/trace/trace.js';
import * as UI from '../../ui/legacy/legacy.js';
import type { TimelineModeViewDelegate } from './TimelinePanel.js';
export interface CountersModel {
    parsedTrace: Trace.TraceModel.ParsedTrace | null;
    events: Trace.Types.Events.Event[] | null;
}
export declare class CountersGraph extends UI.Widget.VBox {
    #private;
    delegate?: TimelineModeViewDelegate;
    private readonly calculator;
    private readonly header;
    readonly toolbar: UI.Toolbar.Toolbar;
    private graphsContainer;
    canvasContainer: typeof UI.Widget.Widget.prototype.element;
    private canvas;
    private readonly timelineGrid;
    private readonly counters;
    private readonly counterUI;
    private readonly countersByName;
    private readonly gpuMemoryCounter;
    currentValuesBar?: HTMLElement;
    private markerXPosition?;
    constructor(delegate: TimelineModeViewDelegate);
    constructor(element?: HTMLElement);
    set model(data: CountersModel);
    setModel(parsedTrace: Trace.TraceModel.ParsedTrace | null, events: Trace.Types.Events.Event[] | null): void;
    private createCurrentValuesBar;
    private createCounter;
    resizerElement(): Element;
    private resize;
    performUpdate(): Promise<void> | void;
    draw(): void;
    private onClick;
    private onMouseLeave;
    private clearCurrentValueAndMarker;
    private onMouseMove;
    private refreshCurrentValues;
    refresh(): void;
    private clear;
}
export declare class Counter {
    #private;
    times: number[];
    values: number[];
    x: number[];
    minimumIndex: number;
    maximumIndex: number;
    limitValue?: number;
    constructor();
    appendSample(time: number, value: number): void;
    reset(): void;
    setLimit(value: number): void;
    calculateBounds(): {
        min: number;
        max: number;
    };
    calculateVisibleIndexes(calculator: Calculator): void;
    calculateXValues(width: number): void;
}
export declare class CounterUI {
    #private;
    private readonly countersPane;
    counter: Counter;
    readonly formatter: (arg0: number) => string;
    private readonly setting;
    private readonly filter;
    private readonly value;
    graphColor: string;
    limitColor: string | null | undefined;
    graphYValues: number[];
    private readonly verticalPadding;
    private readonly counterName;
    private readonly marker;
    constructor(countersPane: CountersGraph, title: Common.UIString.LocalizedString, setting: Common.Settings.Setting<boolean>, graphColor: string, counter: Counter, formatter: (arg0: number) => string);
    reset(): void;
    setRange(minValue: number, maxValue: number): void;
    calculateYValues(canvasHeight: number): {
        minValue: number;
        yFactor: number;
    } | null;
    private toggleCounterGraph;
    recordIndexAt(x: number): number;
    updateCurrentValue(x: number): void;
    clearCurrentValueAndMarker(): void;
    drawGraph(canvas: HTMLCanvasElement): void;
    visible(): boolean;
}
export declare class Calculator {
    #private;
    setZeroTime(time: number): void;
    computePosition(time: number): number;
    setWindow(minimumBoundary: number, maximumBoundary: number): void;
    setDisplayWidth(clientWidth: number): void;
    formatValue(value: number, precision?: number): string;
    maximumBoundary(): number;
    minimumBoundary(): number;
    zeroTime(): number;
    boundarySpan(): number;
}
