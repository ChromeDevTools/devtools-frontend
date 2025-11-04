import * as Trace from '../../models/trace/trace.js';
import * as PerfUI from '../../ui/legacy/components/perf_ui/perf_ui.js';
export declare abstract class TimelineEventOverview extends PerfUI.TimelineOverviewPane.TimelineOverviewBase {
    constructor(id: string, title: string | null);
    renderBar(begin: number, end: number, position: number, height: number, color: string): void;
}
export declare class TimelineEventOverviewNetwork extends TimelineEventOverview {
    #private;
    constructor(parsedTrace: Trace.TraceModel.ParsedTrace);
    update(start?: Trace.Types.Timing.Milli, end?: Trace.Types.Timing.Milli): void;
}
export declare class TimelineEventOverviewCPUActivity extends TimelineEventOverview {
    #private;
    private backgroundCanvas;
    constructor(parsedTrace: Trace.TraceModel.ParsedTrace);
    resetCanvas(): void;
    update(): void;
}
export declare class TimelineEventOverviewResponsiveness extends TimelineEventOverview {
    #private;
    constructor(parsedTrace: Trace.TraceModel.ParsedTrace);
    update(start?: Trace.Types.Timing.Milli, end?: Trace.Types.Timing.Milli): void;
}
export declare class TimelineFilmStripOverview extends TimelineEventOverview {
    #private;
    private frameToImagePromise;
    private lastFrame;
    private lastElement;
    private drawGeneration?;
    private emptyImage?;
    constructor(filmStrip: Trace.Extras.FilmStrip.Data);
    update(customStartTime?: Trace.Types.Timing.Milli, customEndTime?: Trace.Types.Timing.Milli): void;
    private imageByFrame;
    private drawFrames;
    overviewInfoPromise(x: number): Promise<Element | null>;
    reset(): void;
    static readonly Padding = 2;
}
export declare class TimelineEventOverviewMemory extends TimelineEventOverview {
    #private;
    private heapSizeLabel;
    constructor(parsedTrace: Trace.TraceModel.ParsedTrace);
    resetHeapSizeLabels(): void;
    update(start?: Trace.Types.Timing.Milli, end?: Trace.Types.Timing.Milli): void;
}
export declare class Quantizer {
    private lastTime;
    private quantDuration;
    private readonly callback;
    private counters;
    private remainder;
    constructor(startTime: number, quantDuration: number, callback: (arg0: number[]) => void);
    appendInterval(time: number, group: number): void;
}
