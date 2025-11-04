import * as Trace from '../models/trace/trace.js';
import * as Workspace from '../models/workspace/workspace.js';
import * as Timeline from '../panels/timeline/timeline.js';
import * as PerfUI from '../ui/legacy/components/perf_ui/perf_ui.js';
import * as UI from '../ui/legacy/legacy.js';
/**
 * This mock class is used for instancing a flame chart in the helpers.
 * Its implementation is empty because the methods aren't used by the
 * helpers, only the mere definition.
 **/
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
/**
 * We create here a cross-test base trace event. It is assumed that each
 * test will import this default event and copy-override properties at will.
 **/
export declare const defaultTraceEvent: Trace.Types.Events.Event;
/**
 * Gets the tree in a thread.
 * @see RendererHandler.ts
 */
export declare function getTree(thread: Trace.Handlers.ModelHandlers.Renderer.RendererThread): Trace.Helpers.TreeHelpers.TraceEntryTree;
/**
 * Gets the n-th root from a tree in a thread.
 * @see RendererHandler.ts
 */
export declare function getRootAt(thread: Trace.Handlers.ModelHandlers.Renderer.RendererThread, index: number): Trace.Helpers.TreeHelpers.TraceEntryNode;
/**
 * Gets all nodes in a thread. To finish this task, we Walk through all the nodes, starting from the root node.
 */
export declare function getAllNodes(roots: Set<Trace.Helpers.TreeHelpers.TraceEntryNode>): Trace.Helpers.TreeHelpers.TraceEntryNode[];
/**
 * Gets all the `events` for the `nodes`.
 */
export declare function getEventsIn(nodes: IterableIterator<Trace.Helpers.TreeHelpers.TraceEntryNode>): Trace.Types.Events.Event[];
/**
 * Pretty-prints a tree.
 */
export declare function prettyPrint(tree: Trace.Helpers.TreeHelpers.TraceEntryTree, predicate?: (node: Trace.Helpers.TreeHelpers.TraceEntryNode, event: Trace.Types.Events.Event) => boolean, indentation?: number, delimiter?: string, prefix?: string, newline?: string, out?: string): string;
/**
 * Builds a mock Complete.
 */
export declare function makeCompleteEvent(name: string, ts: number, dur: number, cat?: string, pid?: number, tid?: number): Trace.Types.Events.Complete;
export declare function makeAsyncStartEvent(name: string, ts: number, pid?: number, tid?: number): Trace.Types.Events.Async;
export declare function makeAsyncEndEvent(name: string, ts: number, pid?: number, tid?: number): Trace.Types.Events.Async;
/**
 * Builds a mock flow phase event.
 */
export declare function makeFlowPhaseEvent(name: string, ts: number, cat: string | undefined, ph: Trace.Types.Events.Phase.FLOW_START | Trace.Types.Events.Phase.FLOW_END | Trace.Types.Events.Phase.FLOW_STEP, id?: number, pid?: number, tid?: number): Trace.Types.Events.FlowEvent;
/**
 * Builds flow phase events for a list of events belonging to the same
 * flow. `events` must be ordered.
 */
export declare function makeFlowEvents(events: Trace.Types.Events.Event[], flowId?: number): Trace.Types.Events.FlowEvent[];
/**
 * Builds a mock Instant.
 */
export declare function makeInstantEvent(name: string, tsMicroseconds: number, cat?: string, pid?: number, tid?: number, s?: Trace.Types.Events.Scope): Trace.Types.Events.Instant;
/**
 * Builds a mock Begin.
 */
export declare function makeBeginEvent(name: string, ts: number, cat?: string, pid?: number, tid?: number): Trace.Types.Events.Begin;
/**
 * Builds a mock End.
 */
export declare function makeEndEvent(name: string, ts: number, cat?: string, pid?: number, tid?: number): Trace.Types.Events.End;
export declare function makeProfileCall(functionName: string, tsUs: number, durUs: number, pid?: number, tid?: number, nodeId?: number, url?: string): Trace.Types.Events.SyntheticProfileCall;
export declare const DevToolsTimelineCategory = "disabled-by-default-devtools.timeline";
/**
 * Mocks an object compatible with the return type of the
 * RendererHandler using only an array of ordered entries.
 */
export declare function makeMockRendererHandlerData(entries: Trace.Types.Events.Event[], pid?: number, tid?: number): Trace.Handlers.ModelHandlers.Renderer.RendererHandlerData;
/**
 * Mocks an object compatible with the return type of the
 * SamplesHandler using only an array of ordered profile calls.
 */
export declare function makeMockSamplesHandlerData(profileCalls: Trace.Types.Events.SyntheticProfileCall[]): Trace.Handlers.ModelHandlers.Samples.SamplesHandlerData;
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
export declare function getMainThread(data: Trace.Handlers.ModelHandlers.Renderer.RendererHandlerData): Trace.Handlers.ModelHandlers.Renderer.RendererThread;
export declare function getBaseTraceHandlerData(overrides?: Partial<Trace.Handlers.Types.HandlerData>): Trace.TraceModel.ParsedTrace;
/**
 * A helper that will query the given array of events and find the first event
 * matching the predicate. It will also assert that a match is found, which
 * saves the need to do that for every test.
 */
export declare function getEventOfType<T extends Trace.Types.Events.Event>(events: Trace.Types.Events.Event[], predicate: (e: Trace.Types.Events.Event) => e is T): T;
/**
 * The Performance Panel is integrated with the IgnoreListManager so in tests
 * that render a flame chart or a track appender, it needs to be setup to avoid
 * errors.
 */
export declare function setupIgnoreListManagerEnvironment(): {
    ignoreListManager: Workspace.IgnoreListManager.IgnoreListManager;
};
export declare function microsecondsTraceWindow(min: number, max: number): Trace.Types.Timing.TraceWindowMicro;
export declare function microseconds(x: number): Trace.Types.Timing.Micro;
export declare function milliseconds(x: number): Trace.Types.Timing.Milli;
export declare function getAllNetworkRequestsByHost(networkRequests: Trace.Types.Events.SyntheticNetworkRequest[], host: string): Trace.Types.Events.SyntheticNetworkRequest[];
/**
 * A function to get a list of all thread entries that exist. This is
 * reasonably expensive, so it's cached to avoid a huge impact on our test suite
 * speed.
 */
export declare function allThreadEntriesInTrace(parsedTrace: Trace.TraceModel.ParsedTrace): Trace.Types.Events.Event[];
export interface PerformanceAPIExtensionTestData {
    detail: {
        devtools?: Trace.Types.Extensions.DevToolsObj;
    };
    name: string;
    start?: string | number;
    end?: string | number;
    ts: number;
    dur?: number;
}
export interface ConsoleAPIExtensionTestData {
    name: string;
    start?: string | number;
    end?: string | number;
    track?: string;
    trackGroup?: string;
    color?: string;
    ts: number;
}
export declare function makeTimingEventWithPerformanceExtensionData({ name, ts: tsMicro, detail, dur: durMicro }: PerformanceAPIExtensionTestData): Trace.Types.Events.Event[];
export declare function makeTimingEventWithConsoleExtensionData({ name, ts, start, end, track, trackGroup, color }: ConsoleAPIExtensionTestData): Trace.Types.Events.ConsoleTimeStamp;
