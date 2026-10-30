import * as Trace from '../../../models/trace/trace.js';
import * as PerfUI from '../../../ui/legacy/components/perf_ui/perf_ui.js';
import * as UI from '../../../ui/legacy/legacy.js';
import * as Lit from '../../../ui/lit/lit.js';
export interface NetworkDataProvider extends PerfUI.FlameChart.FlameChartDataProvider {
    setModel(parsedTrace: Trace.TraceModel.ParsedTrace, entityMapper: Trace.EntityMapper.EntityMapper): void;
    setWindowTimes(min: number, max: number): void;
    timelineData(): PerfUI.FlameChart.FlameChartTimelineData;
    preparePopoverElement(index: number): Lit.TemplateResult | null;
}
export interface NetworkTrackWidgetData {
    parsedTrace: Trace.TraceModel.ParsedTrace | null;
    bounds: Trace.Types.Timing.TraceWindowMicro;
    dataProvider: NetworkDataProvider;
}
export interface ViewInput {
    dataProvider: NetworkDataProvider;
    delegate: PerfUI.FlameChart.FlameChartDelegate;
    windowTimes: Trace.Types.Timing.TraceWindowMilli;
}
export type View = (input: ViewInput, output: undefined, target: HTMLElement) => void;
export declare const DEFAULT_VIEW: View;
export declare class NetworkTrackWidget extends UI.Widget.Widget implements PerfUI.FlameChart.FlameChartDelegate {
    #private;
    constructor(element?: HTMLElement, view?: View);
    set data(data: NetworkTrackWidgetData);
    performUpdate(): void;
    windowChanged(_windowStartTime: number, _windowEndTime: number, _animate: boolean): void;
    updateRangeSelection(_startTime: number, _endTime: number): void;
    updateSelectedGroup(_flameChart: PerfUI.FlameChart.FlameChart, _group: PerfUI.FlameChart.Group | null): void;
}
