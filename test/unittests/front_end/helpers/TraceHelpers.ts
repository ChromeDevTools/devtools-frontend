// Copyright 2022 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.
import * as SDK from '../../../../front_end/core/sdk/sdk.js';
import * as TimelineModel from '../../../../front_end/models/timeline_model/timeline_model.js';
import * as TraceModel from '../../../../front_end/models/trace/trace.js';
import * as Timeline from '../../../../front_end/panels/timeline/timeline.js';
import type * as TraceEngine from '../../../../front_end/models/trace/trace.js';
import * as PerfUI from '../../../../front_end/ui/legacy/components/perf_ui/perf_ui.js';

import {initializeGlobalVars} from './EnvironmentHelpers.js';

interface CompressionStream extends ReadableWritablePair<Uint8Array, Uint8Array> {}
interface DecompressionStream extends ReadableWritablePair<Uint8Array, Uint8Array> {}
declare const CompressionStream: {
  prototype: CompressionStream,
  new (type: string): CompressionStream,
};

declare const DecompressionStream: {
  prototype: DecompressionStream,
  new (type: string): DecompressionStream,
};

function codec(buffer: ArrayBuffer, codecStream: CompressionStream|DecompressionStream): Promise<ArrayBuffer> {
  const {readable, writable} = new TransformStream();
  const codecReadable = readable.pipeThrough(codecStream);

  const writer = writable.getWriter();
  void writer.write(buffer);
  void writer.close();

  // Wrap in a response for convenience.
  const response = new Response(codecReadable);
  return response.arrayBuffer();
}

function decodeGzipBuffer(buffer: ArrayBuffer): Promise<ArrayBuffer> {
  return codec(buffer, new DecompressionStream('gzip'));
}

/**
 * Parsing some trace files easily takes up more than our default Mocha timeout
 * which is 2seconds. So for most tests that include parsing a trace, we have to
 * increase the timeout. We use this function to ensure we set a consistent
 * timeout across all trace model tests.
 * The context might be null when we only render a component example.
 **/
export function setTraceModelTimeout(context: Mocha.Context|Mocha.Suite|null): void {
  context?.timeout(10_000);
}

// The contents of the trace files do not get modified at all, so in tests we
// are safe to cache their contents once we've loaded them once.
const traceFileCache = new Map<string, TraceModel.Types.File.Contents>();

export async function loadTraceFileFromURL(
    context: Mocha.Context|Mocha.Suite|null, url: URL): Promise<TraceModel.Types.File.Contents> {
  const cachedFile = traceFileCache.get(url.toString());
  if (cachedFile) {
    return cachedFile;
  }
  setTraceModelTimeout(context);
  const response = await fetch(url);
  if (response.status !== 200) {
    throw new Error(`Unable to load ${url}`);
  }

  const contentType = response.headers.get('content-type');
  const isGzipEncoded = contentType !== null && contentType.includes('gzip');
  let buffer = await response.arrayBuffer();
  if (isGzipEncoded) {
    buffer = await decodeGzipBuffer(buffer);
  }
  const decoder = new TextDecoder('utf-8');
  const contents = JSON.parse(decoder.decode(buffer)) as TraceModel.Types.File.Contents;
  traceFileCache.set(url.toString(), contents);
  return contents;
}

export async function loadTraceFileFromFixtures(
    context: Mocha.Context|Mocha.Suite|null, name: string): Promise<TraceModel.Types.File.Contents> {
  const urlForTest = new URL(`/fixtures/traces/${name}`, window.location.origin);
  const urlForComponentExample = new URL(`/test/unittests/fixtures/traces/${name}`, window.location.origin);
  try {
    // Attempt to fetch file from unit test server.
    return await loadTraceFileFromURL(context, urlForTest);
  } catch (e) {
    // If file wasn't found on test server, attempt a fetch from
    // component server.
    return await loadTraceFileFromURL(context, urlForComponentExample);
  }
}

export async function loadEventsFromTraceFile(context: Mocha.Context|Mocha.Suite|null, name: string):
    Promise<readonly TraceModel.Types.TraceEvents.TraceEventData[]> {
  const trace = await loadTraceFileFromFixtures(context, name);
  if ('traceEvents' in trace) {
    return trace.traceEvents;
  }
  return trace;
}

interface ModelDataResult {
  metadata: TraceModel.Types.File.MetaData;
  traceParsedData: TraceModel.Handlers.Types.TraceParseData;
}
const modelDataCache = new Map<string, ModelDataResult>();
async function generateModelDataForTraceFile(
    context: Mocha.Context|Mocha.Suite|null, name: string, emulateFreshRecording = false): Promise<ModelDataResult> {
  const cachedData = modelDataCache.get(name);
  if (cachedData) {
    return cachedData;
  }
  const traceEvents = await loadEventsFromTraceFile(context, name);

  return new Promise((resolve, reject) => {
    const model = TraceModel.TraceModel.Model.createWithAllHandlers();
    model.addEventListener(TraceModel.TraceModel.ModelUpdateEvent.eventName, (event: Event) => {
      const {data} = event as TraceModel.TraceModel.ModelUpdateEvent;

      // When we receive the final update from the model, update the recording
      // state back to waiting.
      if (TraceModel.TraceModel.isModelUpdateDataComplete(data)) {
        const metadata = model.metadata(0);
        const traceParsedData = model.traceParsedData(0);
        if (metadata && traceParsedData) {
          const result: ModelDataResult = {
            metadata,
            traceParsedData,
          };
          modelDataCache.set(name, result);
          resolve(result);
        } else {
          reject(new Error('Unable to load trace'));
        }
      }
    });

    void model.parse(traceEvents, {metadata: {}, isFreshRecording: emulateFreshRecording}).catch(e => console.error(e));
  });
}

export async function loadTraceEventsLegacyEventPayload(
    context: Mocha.Context|Mocha.Suite|null, name: string): Promise<readonly SDK.TracingManager.EventPayload[]> {
  const events = await loadEventsFromTraceFile(context, name);
  // Convince TypeScript that these are really EventPayload events, so they can
  // be used when testing OPP code that expects EventPayload events.
  return events as unknown as Array<SDK.TracingManager.EventPayload>;
}

/**
 * Load the new trace engine data from a trace file.
 *
 * @param context The Mocha test context. |allModelsFromFile| function easily
 * takes up more than our default Mocha timeout, which is 2s. So we have to
 * increase this test's timeout. It might be null when we only render a
 * component example.
 * @param name The name of the trace file to be loaded into the flame chart.
 * The trace file should be in /test/unittests/fixtures/traces folder.
 * @returns Trace Engine data
 */
export async function loadModelDataFromTraceFile(
    context: Mocha.Context|Mocha.Suite|null, name: string): Promise<TraceModel.Handlers.Types.TraceParseData> {
  let trace: TraceModel.Handlers.Types.TraceParseData;
  try {
    trace = (await generateModelDataForTraceFile(context, name)).traceParsedData;
  } catch (error) {
    throw new Error(`Failed to load trace file: ${name}. Is it in test/unittests/fixtures/traces?`);
  }

  return trace;
}

// This mock class is used for instancing a flame chart in the helpers.
// Its implementation is empty because the methods aren't used by the
// helpers, only the mere definition.
export class MockFlameChartDelegate implements PerfUI.FlameChart.FlameChartDelegate {
  windowChanged(_startTime: number, _endTime: number, _animate: boolean): void {
  }
  updateRangeSelection(_startTime: number, _endTime: number): void {
  }
  updateSelectedGroup(_flameChart: PerfUI.FlameChart.FlameChart, _group: PerfUI.FlameChart.Group|null): void {
  }
}

/**
 * Draws a set of tracks track in the flame chart using the new system.
 * For this to work, every track that will be rendered must have a
 * corresponding track appender registered in the
 * CompatibilityTracksAppender.
 *
 * @param traceFileName The name of the trace file to be loaded into the
 * flame chart.
 * @param trackAppenderNames A Set with the names of the tracks to be
 * rendered. For example, Set("Timings").
 * @returns a flame chart element and its corresponding data provider.
 */
export async function getMainFlameChartWithTracks(
    traceFileName: string, trackAppenderNames: Set<Timeline.CompatibilityTracksAppender.TrackAppenderName>,
    expanded: boolean): Promise<{
  flameChart: PerfUI.FlameChart.FlameChart,
  dataProvider: Timeline.TimelineFlameChartDataProvider.TimelineFlameChartDataProvider,
}> {
  await initializeGlobalVars();

  // This function is used to load a component example.
  const {traceParsedData, performanceModel} = await allModelsFromFile(/* context= */ null, traceFileName);

  const dataProvider = new Timeline.TimelineFlameChartDataProvider.TimelineFlameChartDataProvider();
  // The data provider still needs a reference to the legacy model to
  // work properly.
  dataProvider.setModel(performanceModel, traceParsedData);
  const tracksAppender = dataProvider.compatibilityTracksAppenderInstance();
  tracksAppender.setVisibleTracks(trackAppenderNames);
  dataProvider.buildFromTrackAppenders(/* expandedTracks?= */ expanded ? trackAppenderNames : undefined);
  const delegate = new MockFlameChartDelegate();
  const flameChart = new PerfUI.FlameChart.FlameChart(dataProvider, delegate);
  const minTime = TraceModel.Helpers.Timing.microSecondsToMilliseconds(traceParsedData.Meta.traceBounds.min);
  const maxTime = TraceModel.Helpers.Timing.microSecondsToMilliseconds(traceParsedData.Meta.traceBounds.max);
  flameChart.setWindowTimes(minTime, maxTime);
  flameChart.markAsRoot();
  flameChart.update();
  return {flameChart, dataProvider};
}

/**
 * Draws a track in the flame chart using the legacy system. For this to work,
 * a codepath to append the track must be available in the implementation of
 * TimelineFlameChartDataProvider.appendLegacyTrackData.
 *
 * @param traceFileName The name of the trace file to be loaded to the flame
 * chart.
 * @param trackType the legacy "type" of the track to be rendered. For
 * example: "GPU"
 * @param expanded if the track is expanded
 * @returns a flame chart element and its corresponding data provider.
 */
export async function getMainFlameChartWithLegacyTrack(
    traceFileName: string, trackType: TimelineModel.TimelineModel.TrackType, expanded: boolean): Promise<{
  flameChart: PerfUI.FlameChart.FlameChart,
  dataProvider: Timeline.TimelineFlameChartDataProvider.TimelineFlameChartDataProvider,
}> {
  await initializeGlobalVars();

  // This function is used to load a component example.
  const {traceParsedData, performanceModel, timelineModel} =
      await allModelsFromFile(/* context= */ null, traceFileName);

  const dataProvider = new Timeline.TimelineFlameChartDataProvider.TimelineFlameChartDataProvider();
  // The data provider still needs a reference to the legacy model to
  // work properly.
  dataProvider.setModel(performanceModel, traceParsedData);
  const track = timelineModel.tracks().find(track => track.type === trackType);
  if (!track) {
    throw new Error(`Legacy track with of type ${trackType} not found in timeline model.`);
  }
  dataProvider.appendLegacyTrackData(track, expanded);
  const delegate = new MockFlameChartDelegate();
  const flameChart = new PerfUI.FlameChart.FlameChart(dataProvider, delegate);
  const minTime = TraceModel.Helpers.Timing.microSecondsToMilliseconds(traceParsedData.Meta.traceBounds.min);
  const maxTime = TraceModel.Helpers.Timing.microSecondsToMilliseconds(traceParsedData.Meta.traceBounds.max);
  flameChart.setWindowTimes(minTime, maxTime);
  flameChart.markAsRoot();
  flameChart.update();
  return {flameChart, dataProvider};
}

/**
 * Draws the network track in the flame chart using the legacy system.
 *
 * @param traceFileName The name of the trace file to be loaded to the flame
 * chart.
 * @param expanded if the track is expanded
 * @returns a flame chart element and its corresponding data provider.
 */
export async function getNetworkFlameChartWithLegacyTrack(traceFileName: string, expanded: boolean): Promise<{
  flameChart: PerfUI.FlameChart.FlameChart,
  dataProvider: Timeline.TimelineFlameChartNetworkDataProvider.TimelineFlameChartNetworkDataProvider,
}> {
  await initializeGlobalVars();

  // This function is used to load a component example.
  const {traceParsedData} = await allModelsFromFile(/* context= */ null, traceFileName);
  const minTime = TraceModel.Helpers.Timing.microSecondsToMilliseconds(traceParsedData.Meta.traceBounds.min);
  const maxTime = TraceModel.Helpers.Timing.microSecondsToMilliseconds(traceParsedData.Meta.traceBounds.max);
  const dataProvider = new Timeline.TimelineFlameChartNetworkDataProvider.TimelineFlameChartNetworkDataProvider();
  dataProvider.setModel(traceParsedData);
  dataProvider.setWindowTimes(minTime, maxTime);
  dataProvider.timelineData().groups.forEach(group => {
    group.expanded = expanded;
  });

  const delegate = new MockFlameChartDelegate();
  const flameChart = new PerfUI.FlameChart.FlameChart(dataProvider, delegate);
  flameChart.setWindowTimes(minTime, maxTime);
  flameChart.markAsRoot();
  flameChart.update();
  return {flameChart, dataProvider};
}

type LoadedModels = {
  tracingModel: SDK.TracingModel.TracingModel,
  timelineModel: TimelineModel.TimelineModel.TimelineModelImpl,
  performanceModel: Timeline.PerformanceModel.PerformanceModel,
  traceParsedData: TraceModel.Handlers.Types.TraceParseData,
};
const traceModelsCache = new Map<string, LoadedModels>();

/**
 * Returns tracingModel, timelineModel, performanceModel, traceParsedData
 * from the given trace file.
 *
 * @param context The Mocha test context. |allModelsFromFile| function easily
 * takes up more than our default Mocha timeout, which is 2s. So we have to
 * increase this test's timeout. It might be null when we only render a
 * component example.
 * @param file The name of the trace file to be loaded into the flame chart.
 * The trace file should be in /test/unittests/fixtures/traces folder.
 * @returns tracingModel, timelineModel, performanceModel, traceParsedData
 * from this trace file
 */
export async function allModelsFromFile(context: Mocha.Context|Mocha.Suite|null, file: string): Promise<LoadedModels> {
  const fromCache = traceModelsCache.get(file);
  if (fromCache) {
    return fromCache;
  }

  const traceParsedData = await loadModelDataFromTraceFile(context, file);
  TimelineModel.TimelineModel.EventOnTimelineData.reset();
  const events = await loadTraceEventsLegacyEventPayload(context, file);
  const tracingModel = new SDK.TracingModel.TracingModel();
  const performanceModel = new Timeline.PerformanceModel.PerformanceModel();
  tracingModel.addEvents(events);
  tracingModel.tracingComplete();
  await performanceModel.setTracingModel(tracingModel);
  const timelineModel = performanceModel.timelineModel();
  const result: LoadedModels = {
    tracingModel,
    timelineModel,
    performanceModel,
    traceParsedData,
  };
  traceModelsCache.set(file, result);
  return result;
}

/**
 * Takes a TracingModel and returns a set of all events that have a payload, sorted by timestamp.
 * Useful in tests to locate a legacy SDK Event to use for tests.
 **/
export function getAllTracingModelPayloadEvents(tracingModel: SDK.TracingModel.TracingModel):
    SDK.TracingModel.PayloadEvent[] {
  const allSDKEvents = tracingModel.sortedProcesses().flatMap(process => {
    return process.sortedThreads().flatMap(thread => thread.events().filter(SDK.TracingModel.eventHasPayload));
  });
  allSDKEvents.sort((eventA, eventB) => {
    if (eventA.startTime > eventB.startTime) {
      return 1;
    }
    if (eventB.startTime > eventA.startTime) {
      return -1;
    }
    return 0;
  });
  return allSDKEvents;
}

// We create here a cross-test base trace event. It is assumed that each
// test will import this default event and copy-override properties at will.
export const defaultTraceEvent: TraceModel.Types.TraceEvents.TraceEventData = {
  name: 'process_name',
  tid: TraceModel.Types.TraceEvents.ThreadID(0),
  pid: TraceModel.Types.TraceEvents.ProcessID(0),
  ts: TraceModel.Types.Timing.MicroSeconds(0),
  cat: 'test',
  ph: TraceModel.Types.TraceEvents.Phase.METADATA,
};

/**
 * Gets the tree in a thread.
 * @see RendererHandler.ts
 */
export function getTree(thread: TraceModel.Handlers.ModelHandlers.Renderer.RendererThread):
    TraceModel.Handlers.ModelHandlers.Renderer.RendererEventTree {
  const tree = thread.tree;
  if (!tree) {
    assert(false, `Couldn't get tree in thread ${thread.name}`);
    return null as never;
  }
  return tree;
}

/**
 * Gets the n-th root from a tree in a thread.
 * @see RendererHandler.ts
 */
export function getRootAt(thread: TraceModel.Handlers.ModelHandlers.Renderer.RendererThread, index: number):
    TraceModel.Handlers.ModelHandlers.Renderer.RendererEventNode {
  const tree = getTree(thread);
  const nodeId = [...tree.roots][index];
  if (nodeId === undefined) {
    assert(false, `Couldn't get the id of the root at index ${index} in thread ${thread.name}`);
    return null as never;
  }
  return getNodeFor(thread, nodeId);
}

/**
 * Gets the node with an id from a tree in a thread.
 * @see RendererHandler.ts
 */
export function getNodeFor(
    thread: TraceModel.Handlers.ModelHandlers.Renderer.RendererThread,
    nodeId: TraceModel.Handlers.ModelHandlers.Renderer.RendererEventNodeId):
    TraceModel.Handlers.ModelHandlers.Renderer.RendererEventNode {
  const tree = getTree(thread);
  const node = tree.nodes.get(nodeId);
  if (!node) {
    assert(false, `Couldn't get the node with id ${nodeId} in thread ${thread.name}`);
    return null as never;
  }
  return node;
}

/**
 * Gets all the `events` for the `nodes` with `ids`.
 */
export function getEventsIn(
    ids: IterableIterator<TraceModel.Handlers.ModelHandlers.Renderer.RendererEventNodeId>,
    nodes:
        Map<TraceModel.Handlers.ModelHandlers.Renderer.RendererEventNodeId,
            TraceModel.Handlers.ModelHandlers.Renderer.RendererEventNode>):
    TraceModel.Types.TraceEvents.TraceEventData[] {
  return [...ids].map(id => nodes.get(id)).flatMap(node => node ? node.event : []);
}
/**
 * Pretty-prints the tree in a thread.
 */
export function prettyPrint(
    thread: TraceModel.Handlers.ModelHandlers.Renderer.RendererThread,
    nodes: Set<TraceModel.Handlers.ModelHandlers.Renderer.RendererEventNodeId>,
    predicate: (
        node: TraceModel.Handlers.ModelHandlers.Renderer.RendererEventNode,
        event: TraceModel.Handlers.ModelHandlers.Renderer.RendererTraceEvent) => boolean = () => true,
    indentation: number = 2, delimiter: string = ' ', prefix: string = '-', newline: string = '\n',
    out: string = ''): string {
  let skipped = false;
  for (const nodeId of nodes) {
    const node = getNodeFor(thread, nodeId);
    const event = node.event;
    if (!predicate(node, event)) {
      out += `${!skipped ? newline : ''}.`;
      skipped = true;
      continue;
    }
    skipped = false;
    const spacing = new Array(node.depth * indentation).fill(delimiter).join('');
    const type = TraceModel.Types.TraceEvents.isTraceEventDispatch(event) ? `(${event.args.data?.type})` : false;
    const duration = TraceModel.Types.TraceEvents.isTraceEventInstant(event) ? '[I]' : `[${event.dur / 1000}ms]`;
    const info = [type, duration].filter(Boolean);
    out += `${newline}${spacing}${prefix}${event.name} ${info.join(' ')}`;
    out = prettyPrint(thread, node.childrenIds, predicate, indentation, delimiter, prefix, newline, out);
  }

  return out;
}

/**
 * Builds a mock TraceEventComplete.
 */
export function makeCompleteEvent(
    name: string, ts: number, dur: number, cat: string = '*', pid: number = 0,
    tid: number = 0): TraceModel.Types.TraceEvents.TraceEventComplete {
  return {
    args: {},
    cat,
    name,
    ph: TraceModel.Types.TraceEvents.Phase.COMPLETE,
    pid: TraceModel.Types.TraceEvents.ProcessID(pid),
    tid: TraceModel.Types.TraceEvents.ThreadID(tid),
    ts: TraceModel.Types.Timing.MicroSeconds(ts),
    dur: TraceModel.Types.Timing.MicroSeconds(dur),
  };
}

export function makeCompleteEventInMilliseconds(
    name: string, tsMillis: number, durMillis: number, cat: string = '*', pid: number = 0,
    tid: number = 0): TraceModel.Types.TraceEvents.TraceEventComplete {
  return makeCompleteEvent(
      name, TraceModel.Helpers.Timing.millisecondsToMicroseconds(TraceModel.Types.Timing.MilliSeconds(tsMillis)),
      TraceModel.Helpers.Timing.millisecondsToMicroseconds(TraceModel.Types.Timing.MilliSeconds(durMillis)), cat, pid,
      tid);
}

/**
 * Builds a mock TraceEventInstant.
 */
export function makeInstantEvent(
    name: string, ts: number, cat: string = '', pid: number = 0, tid: number = 0,
    s: TraceModel.Types.TraceEvents.TraceEventScope =
        TraceModel.Types.TraceEvents.TraceEventScope.THREAD): TraceModel.Types.TraceEvents.TraceEventInstant {
  return {
    args: {},
    cat,
    name,
    ph: TraceModel.Types.TraceEvents.Phase.INSTANT,
    pid: TraceModel.Types.TraceEvents.ProcessID(pid),
    tid: TraceModel.Types.TraceEvents.ThreadID(tid),
    ts: TraceModel.Types.Timing.MicroSeconds(ts),
    s,
  };
}

/**
 * Provides a stubbed SDK.TracingModel.Thread instance.
 * IMPORTANT: this is not designed to be a fully stubbed Thread, but one that is
 * stubbed enough to be able to use it to instantiate an SDK.TracingModel.Event.
 * If you pass this fake thread around into places that expect actual threads,
 * you will get errors. Use this only for simple cases where you need a one off
 * event to test something. For anything more, you should use the helpers in
 * TraceHelpers.ts to load and parse a real trace to get real data.
 **/
export class StubbedThread {
  static make(id: number): SDK.TracingModel.Thread {
    const instance = new StubbedThread(id);
    return instance as unknown as SDK.TracingModel.Thread;
  }

  constructor(public id: number) {
  }

  getModel(): SDK.TracingModel.TracingModel {
    return {
      parsedCategoriesForString(input: string): Set<string> {
        return new Set(input.split(','));
      },

    } as unknown as SDK.TracingModel.TracingModel;
  }
}

export const DevToolsTimelineCategory = 'disabled-by-default-devtools.timeline';

export interface FakeEventPayload {
  name: string;
  categories: string[];
  tid?: number;
  ts: number;
  pid?: number;
  dur?: number;
  ph: TraceEngine.Types.TraceEvents.Phase;
  // The type def of args in EventPayload is inaccurate. We will fix this as
  // part of the migration but for now let's just tell TS to let us pass
  // anything in here.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  args?: any;
  id?: string;
  scope?: string[];
  // Allow any additional keys.
  [x: string]: unknown;
}
/**
 * Creates an object that represents an EventPayload - one that looks exactly
 * like an event from a real trace could.
 * You must provide some of the options, but the others will revert to sensible
 * defaults. The goal here is not to use this to emulate an entire trace (you
 * should use an actual trace file if you need that), but to allow the
 * construction of single events to make testing utility methods easier.
 **/
export function makeFakeEventPayload(payload: FakeEventPayload): SDK.TracingManager.EventPayload {
  const event: SDK.TracingManager.EventPayload = {
    // Set defaults for these values, all of which can be overriden by passing
    // them into the payload object.
    args: {},
    pid: 1,
    tid: 1,
    id: 'random-test-event-id',
    dur: 0,
    ...payload,
    cat: payload.categories.join(','),
    scope: payload.scope ? payload.scope.join(',') : 'devtools.timeline',
  };

  return event;
}

/**
 * Given an object representing a fake payload - see @FakeEventPayload - this
 * function will create a fake SDK Event with a stubbed thread that tries to
 * mimic the real thing. It is not designed to be used to emulate entire traces,
 * but more to create single events that can be used in unit tests.
 **/
export function makeFakeSDKEventFromPayload(payloadOptions: FakeEventPayload): SDK.TracingModel.PayloadEvent {
  const payload = makeFakeEventPayload(payloadOptions);
  const thread = StubbedThread.make(payload.tid);
  const event = SDK.TracingModel.PayloadEvent.fromPayload(payload, thread);
  return event;
}

export async function traceModelFromTraceFile(context: Mocha.Context|Mocha.Suite|null, file: string): Promise<{
  tracingModel: SDK.TracingModel.TracingModel,
  timelineModel: TimelineModel.TimelineModel.TimelineModelImpl,
  performanceModel: Timeline.PerformanceModel.PerformanceModel,
}> {
  const events = await loadTraceEventsLegacyEventPayload(context, file);
  const tracingModel = new SDK.TracingModel.TracingModel();
  const performanceModel = new Timeline.PerformanceModel.PerformanceModel();
  tracingModel.addEvents(events);
  tracingModel.tracingComplete();
  await performanceModel.setTracingModel(tracingModel);
  const timelineModel = performanceModel.timelineModel();
  return {
    tracingModel,
    timelineModel,
    performanceModel,
  };
}

export class FakeFlameChartProvider implements PerfUI.FlameChart.FlameChartDataProvider {
  minimumBoundary(): number {
    return 0;
  }

  totalTime(): number {
    return 100;
  }

  formatValue(value: number): string {
    return value.toString();
  }

  maxStackDepth(): number {
    return 3;
  }

  prepareHighlightedEntryInfo(_entryIndex: number): Element|null {
    return null;
  }

  canJumpToEntry(_entryIndex: number): boolean {
    return false;
  }

  entryTitle(entryIndex: number): string|null {
    return `Entry ${entryIndex}`;
  }

  entryFont(_entryIndex: number): string|null {
    return null;
  }

  entryColor(_entryIndex: number): string {
    return 'lightblue';
  }

  decorateEntry(): boolean {
    return false;
  }

  forceDecoration(_entryIndex: number): boolean {
    return false;
  }

  textColor(_entryIndex: number): string {
    return 'black';
  }

  navStartTimes(): Map<string, SDK.TracingModel.Event> {
    return new Map();
  }

  timelineData(): PerfUI.FlameChart.FlameChartTimelineData|null {
    return PerfUI.FlameChart.FlameChartTimelineData.createEmpty();
  }
}
