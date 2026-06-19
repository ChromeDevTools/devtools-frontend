import * as Trace from '../../../models/trace/trace.js';
import * as PerfUI from '../../../ui/legacy/components/perf_ui/perf_ui.js';
export interface NetworkDataProvider extends PerfUI.FlameChart.FlameChartDataProvider {
    setModel(parsedTrace: Trace.TraceModel.ParsedTrace, entityMapper: Trace.EntityMapper.EntityMapper): void;
    setWindowTimes(min: number, max: number): void;
    timelineData(): PerfUI.FlameChart.FlameChartTimelineData;
    preparePopoverElement(index: number): Element | null;
}
export interface NetworkTrackWidgetData {
    parsedTrace: Trace.TraceModel.ParsedTrace | null;
    bounds: Trace.Types.Timing.TraceWindowMicro;
    dataProvider: NetworkDataProvider;
}
export declare class NetworkTrackWidget extends HTMLElement implements PerfUI.FlameChart.FlameChartDelegate {
    #private;
    constructor();
    set data(data: NetworkTrackWidgetData);
    windowChanged(_windowStartTime: number, _windowEndTime: number, _animate: boolean): void;
    updateRangeSelection(_startTime: number, _endTime: number): void;
    updateSelectedGroup(_flameChart: PerfUI.FlameChart.FlameChart, _group: PerfUI.FlameChart.Group | null): void;
}
declare global {
    interface HTMLElementTagNameMap {
        'devtools-performance-agent-network-track': NetworkTrackWidget;
    }
}
