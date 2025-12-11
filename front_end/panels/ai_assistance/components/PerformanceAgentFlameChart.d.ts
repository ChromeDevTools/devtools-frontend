import * as Trace from '../../../models/trace/trace.js';
import * as PerfUI from '../../../ui/legacy/components/perf_ui/perf_ui.js';
export interface PerformanceAgentFlameChartData {
    parsedTrace: Trace.TraceModel.ParsedTrace | null;
    start: Trace.Types.Timing.Micro;
    end: Trace.Types.Timing.Micro;
}
export declare class PerformanceAgentFlameChart extends HTMLElement implements PerfUI.FlameChart.FlameChartDelegate {
    #private;
    constructor();
    set data(data: PerformanceAgentFlameChartData);
    windowChanged(startTime: number, endTime: number, animate: boolean): void;
    updateRangeSelection(startTime: number, endTime: number): void;
    updateSelectedEntry(_entryIndex: number): void;
    updateSelectedGroup(_flameChart: PerfUI.FlameChart.FlameChart, _group: PerfUI.FlameChart.Group | null): void;
}
declare global {
    interface HTMLElementTagNameMap {
        'devtools-performance-agent-flame-chart': PerformanceAgentFlameChart;
    }
}
