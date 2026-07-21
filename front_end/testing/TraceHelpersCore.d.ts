import * as Trace from '../models/trace/trace.js';
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
export declare function getMainThread(data: Trace.Handlers.ModelHandlers.Renderer.RendererHandlerData): Trace.Handlers.ModelHandlers.Renderer.RendererThread;
export declare function getBaseTraceHandlerData(overrides?: Partial<Trace.Handlers.Types.HandlerData>): Trace.TraceModel.ParsedTrace;
/**
 * A helper that will query the given array of events and find the first event
 * matching the predicate. It will also assert that a match is found, which
 * saves the need to do that for every test.
 */
export declare function getEventOfType<T extends Trace.Types.Events.Event>(events: Trace.Types.Events.Event[], predicate: (e: Trace.Types.Events.Event) => e is T): T;
export declare function microsecondsTraceWindow(min: number, max: number): Trace.Types.Timing.TraceWindowMicro;
export declare function microseconds(x: number): Trace.Types.Timing.Micro;
/**
 * Creates a mock `ParsedTrace` object for use in tests. This is a simple
 * cast of an empty object to the `ParsedTrace` type to reduce noise in tests
 * that only need a typed trace object without specific data.
 */
export declare function makeFakeParsedTrace(): Trace.TraceModel.ParsedTrace;
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
export declare function createTraceExtensionDataFromPerformanceAPITestInput(extensionData: PerformanceAPIExtensionTestData[]): Promise<Trace.Handlers.ModelHandlers.ExtensionTraceData.ExtensionTraceData>;
export declare function createTraceExtensionDataFromEvents(events: Trace.Types.Events.Event[]): Promise<Trace.Handlers.ModelHandlers.ExtensionTraceData.ExtensionTraceData>;
