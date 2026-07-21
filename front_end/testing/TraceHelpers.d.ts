import * as Trace from '../models/trace/trace.js';
import * as Workspace from '../models/workspace/workspace.js';
import * as Timeline from '../panels/timeline/timeline.js';
import * as PerfUI from '../ui/legacy/components/perf_ui/perf_ui.js';
import * as UI from '../ui/legacy/legacy.js';
export * from './TraceHelpersCore.js';
export declare class MockFlameChartDelegate implements PerfUI.FlameChart.FlameChartDelegate {
    windowChanged(_startTime: number, _endTime: number, _animate: boolean): void;
    updateRangeSelection(_startTime: number, _endTime: number): void;
    updateSelectedGroup(_flameChart: PerfUI.FlameChart.FlameChart, _group: PerfUI.FlameChart.Group | null): void;
}
export interface RenderFlameChartOptions {
    dataProvider: 'MAIN' | 'NETWORK';
    /**
     * The trace file to import. You must include `.json.gz` at the end of the file name.
     * Alternatively, you can provide the actual file. This is useful only if you
     * are providing a mocked file; generally you should prefer to pass the file
     * name so that the TraceLoader can take care of loading and caching the
     * trace.
     */
    fileNameOrParsedTrace: string | Trace.TraceModel.ParsedTrace;
    /**
     * Filter the tracks that will be rendered by their name. The name here is
     * the user visible name that is drawn onto the flame chart.
     */
    filterTracks?: (trackName: string, trackIndex: number) => boolean;
    /**
     * Choose which track(s) that have been drawn should be expanded. The name
     * here is the user visible name that is drawn onto the flame chart.
     */
    expandTracks?: (trackName: string, trackIndex: number) => boolean;
    customStartTime?: Trace.Types.Timing.Milli;
    customEndTime?: Trace.Types.Timing.Milli;
    /**
     * A custom height in pixels. By default a height is chosen that will
     * vertically fit the entire FlameChart.
     * (calculated based on the pixel offset of the last visible track.)
     */
    customHeight?: number;
    /**
     * When the frames track renders screenshots, we do so async, as we have to
     * fetch screenshots first to draw them. If this flag is `true`, we block and
     * preload all the screenshots before rendering, thus making it faster in a
     * test to expand the frames track as it can be done with no async calls to
     * fetch images.
     */
    preloadScreenshots?: boolean;
}
/**
 * Renders a flame chart into the unit test DOM that renders a real provided
 * trace file.
 * It will take care of all the setup and configuration for you.
 */
export declare function renderFlameChartIntoDOM(context: Mocha.Context | null, options: RenderFlameChartOptions): Promise<{
    flameChart: PerfUI.FlameChart.FlameChart;
    dataProvider: Timeline.TimelineFlameChartDataProvider.TimelineFlameChartDataProvider | Timeline.TimelineFlameChartNetworkDataProvider.TimelineFlameChartNetworkDataProvider;
    target: HTMLElement;
    parsedTrace: Trace.TraceModel.ParsedTrace;
}>;
/**
 * Draws the network track in the flame chart using the legacy system.
 *
 * @param traceFileName The name of the trace file to be loaded to the flame
 * chart.
 * @param expanded if the track is expanded
 * @returns a flame chart element and its corresponding data provider.
 */
export declare function getNetworkFlameChart(traceFileName: string, expanded: boolean): Promise<{
    flameChart: PerfUI.FlameChart.FlameChart;
    dataProvider: Timeline.TimelineFlameChartNetworkDataProvider.TimelineFlameChartNetworkDataProvider;
}>;
export declare class FakeFlameChartProvider implements PerfUI.FlameChart.FlameChartDataProvider {
    minimumBoundary(): number;
    hasTrackConfigurationMode(): boolean;
    totalTime(): number;
    formatValue(value: number): string;
    maxStackDepth(): number;
    preparePopoverElement(_entryIndex: number): Element | null;
    canJumpToEntry(_entryIndex: number): boolean;
    entryTitle(entryIndex: number): string | null;
    entryFont(_entryIndex: number): string | null;
    entryColor(entryIndex: number): string;
    decorateEntry(): boolean;
    forceDecoration(_entryIndex: number): boolean;
    textColor(_entryIndex: number): string;
    timelineData(): PerfUI.FlameChart.FlameChartTimelineData | null;
}
export interface FlameChartWithFakeProviderOptions {
    windowTimes?: [number, number];
}
/**
 * Renders a flame chart using a fake provider and mock delegate.
 * @param provider The fake flame chart provider.
 * @param options Optional parameters.  Includes windowTimes, an array specifying the minimum and maximum window times. Defaults to [0, 100].
 * @returns A promise that resolves when the flame chart is rendered.
 */
export declare function renderFlameChartWithFakeProvider(provider: FakeFlameChartProvider, options?: FlameChartWithFakeProviderOptions): Promise<void>;
/**
 * Renders a widget into an element that has the right styling to be a VBox.
 * Useful as many of the Performance Panel elements are rendered like this and
 * need a parent that is flex + has a height & width in order to render
 * correctly for screenshot tests.
 */
export declare function renderWidgetInVbox(widget: UI.Widget.Widget, opts?: {
    width?: number;
    height?: number;
    flexAuto?: boolean;
}): void;
export declare function setupIgnoreListManagerEnvironment(): {
    ignoreListManager: Workspace.IgnoreListManager.IgnoreListManager;
};
