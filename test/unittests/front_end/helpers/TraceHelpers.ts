// Copyright 2022 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.
import type * as Protocol from '../../../../front_end/generated/protocol.js';
import type * as TimelineModel from '../../../../front_end/models/timeline_model/timeline_model.js';
import * as TraceEngine from '../../../../front_end/models/trace/trace.js';
import * as Timeline from '../../../../front_end/panels/timeline/timeline.js';
import * as PerfUI from '../../../../front_end/ui/legacy/components/perf_ui/perf_ui.js';

import {initializeGlobalVars} from './EnvironmentHelpers.js';
import {TraceLoader} from './TraceLoader.js';

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
 * @param expanded whether the track should be expanded
 * @param trackName optional param to filter tracks by their name.
 * @returns a flame chart element and its corresponding data provider.
 */
export async function getMainFlameChartWithTracks(
    traceFileName: string, trackAppenderNames: Set<Timeline.CompatibilityTracksAppender.TrackAppenderName>,
    expanded: boolean, trackName?: string): Promise<{
  flameChart: PerfUI.FlameChart.FlameChart,
  dataProvider: Timeline.TimelineFlameChartDataProvider.TimelineFlameChartDataProvider,
}> {
  await initializeGlobalVars();

  // This function is used to load a component example.
  const {traceParsedData, performanceModel} = await TraceLoader.allModels(/* context= */ null, traceFileName);

  const dataProvider = new Timeline.TimelineFlameChartDataProvider.TimelineFlameChartDataProvider();
  // The data provider still needs a reference to the legacy model to
  // work properly.
  dataProvider.setModel(performanceModel, traceParsedData);
  const tracksAppender = dataProvider.compatibilityTracksAppenderInstance();
  tracksAppender.setVisibleTracks(trackAppenderNames);
  dataProvider.buildFromTrackAppenders(
      {filterThreadsByName: trackName, expandedTracks: expanded ? trackAppenderNames : undefined});
  const delegate = new MockFlameChartDelegate();
  const flameChart = new PerfUI.FlameChart.FlameChart(dataProvider, delegate);
  const minTime = TraceEngine.Helpers.Timing.microSecondsToMilliseconds(traceParsedData.Meta.traceBounds.min);
  const maxTime = TraceEngine.Helpers.Timing.microSecondsToMilliseconds(traceParsedData.Meta.traceBounds.max);
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
 * @param trackNameFilter used to further filter down the tracks rendered by seeing if their name contains this string.
 * @returns a flame chart element and its corresponding data provider.
 */
export async function getMainFlameChartWithLegacyTrackTypes(
    traceFileName: string, trackType: TimelineModel.TimelineModel.TrackType, expanded: boolean,
    trackNameFilter?: string): Promise<{
  flameChart: PerfUI.FlameChart.FlameChart,
  dataProvider: Timeline.TimelineFlameChartDataProvider.TimelineFlameChartDataProvider,
}> {
  await initializeGlobalVars();

  // This function is used to load a component example.
  const {traceParsedData, performanceModel, timelineModel} =
      await TraceLoader.allModels(/* context= */ null, traceFileName);

  const dataProvider = new Timeline.TimelineFlameChartDataProvider.TimelineFlameChartDataProvider();
  // The data provider still needs a reference to the legacy model to
  // work properly.
  dataProvider.setModel(performanceModel, traceParsedData);
  // We use filter() here because some tracks (e.g. Rasterizer) actually can
  // have N tracks for a given trace, depending on how many
  // CompositorTileWorker threads there were. So in this case, we want to
  // render all of them, not just the first one we find.
  const tracks = timelineModel.tracks().filter(track => {
    const isRightType = track.type === trackType;
    if (!trackNameFilter) {
      return isRightType;
    }

    return isRightType && track.name.includes(trackNameFilter);
  });

  if (tracks.length === 0) {
    throw new Error(`Legacy track with of type ${trackType} not found in timeline model.`);
  }
  for (const track of tracks) {
    dataProvider.appendLegacyTrackData(track, expanded);
  }
  const delegate = new MockFlameChartDelegate();
  const flameChart = new PerfUI.FlameChart.FlameChart(dataProvider, delegate);
  const minTime = TraceEngine.Helpers.Timing.microSecondsToMilliseconds(traceParsedData.Meta.traceBounds.min);
  const maxTime = TraceEngine.Helpers.Timing.microSecondsToMilliseconds(traceParsedData.Meta.traceBounds.max);
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
  const {traceParsedData} = await TraceLoader.allModels(/* context= */ null, traceFileName);
  const minTime = TraceEngine.Helpers.Timing.microSecondsToMilliseconds(traceParsedData.Meta.traceBounds.min);
  const maxTime = TraceEngine.Helpers.Timing.microSecondsToMilliseconds(traceParsedData.Meta.traceBounds.max);
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

/**
 * Takes a TracingModel and returns a set of all events that have a payload, sorted by timestamp.
 * Useful in tests to locate a legacy SDK Event to use for tests.
 **/
export function getAllTracingModelPayloadEvents(tracingModel: TraceEngine.Legacy.TracingModel):
    TraceEngine.Legacy.PayloadEvent[] {
  const allSDKEvents = tracingModel.sortedProcesses().flatMap(process => {
    return process.sortedThreads().flatMap(thread => thread.events().filter(TraceEngine.Legacy.eventHasPayload));
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
export const defaultTraceEvent: TraceEngine.Types.TraceEvents.TraceEventData = {
  name: 'process_name',
  tid: TraceEngine.Types.TraceEvents.ThreadID(0),
  pid: TraceEngine.Types.TraceEvents.ProcessID(0),
  ts: TraceEngine.Types.Timing.MicroSeconds(0),
  cat: 'test',
  ph: TraceEngine.Types.TraceEvents.Phase.METADATA,
};

/**
 * Gets the tree in a thread.
 * @see RendererHandler.ts
 */
export function getTree(thread: TraceEngine.Handlers.ModelHandlers.Renderer.RendererThread):
    TraceEngine.Helpers.TreeHelpers.TraceEntryTree {
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
export function getRootAt(thread: TraceEngine.Handlers.ModelHandlers.Renderer.RendererThread, index: number):
    TraceEngine.Helpers.TreeHelpers.TraceEntryNode {
  const tree = getTree(thread);
  const node = [...tree.roots][index];
  if (node === undefined) {
    assert(false, `Couldn't get the id of the root at index ${index} in thread ${thread.name}`);
    return null as never;
  }
  return node;
}

/**
 * Gets the node with an id from a tree in a thread.
 * @see RendererHandler.ts
 */
export function getNodeFor(
    thread: TraceEngine.Handlers.ModelHandlers.Renderer.RendererThread,
    nodeId: TraceEngine.Helpers.TreeHelpers.TraceEntryNodeId): TraceEngine.Helpers.TreeHelpers.TraceEntryNode {
  const tree = getTree(thread);
  const node = tree.nodes.get(nodeId);
  if (!node) {
    assert(false, `Couldn't get the node with id ${nodeId} in thread ${thread.name}`);
    return null as never;
  }
  return node;
}

/**
 * Gets all the `events` for the `nodes`.
 */
export function getEventsIn(nodes: IterableIterator<TraceEngine.Helpers.TreeHelpers.TraceEntryNode>):
    TraceEngine.Types.TraceEvents.TraceEventData[] {
  return [...nodes].flatMap(node => node ? node.entry : []);
}
/**
 * Pretty-prints a tree.
 */
export function prettyPrint(
    tree: TraceEngine.Helpers.TreeHelpers.TraceEntryTree,
    predicate:
        (node: TraceEngine.Helpers.TreeHelpers.TraceEntryNode, event: TraceEngine.Types.TraceEvents.TraceEntry) =>
            boolean = () => true,
    indentation: number = 2, delimiter: string = ' ', prefix: string = '-', newline: string = '\n',
    out: string = ''): string {
  let skipped = false;
  return printNodes(tree.roots);
  function printNodes(nodes: Set<TraceEngine.Helpers.TreeHelpers.TraceEntryNode>): string {
    for (const node of nodes) {
      const event = node.entry;
      if (!predicate(node, event)) {
        out += `${!skipped ? newline : ''}.`;
        skipped = true;
        continue;
      }
      skipped = false;
      const spacing = new Array(node.depth * indentation).fill(delimiter).join('');
      const eventType =
          TraceEngine.Types.TraceEvents.isTraceEventDispatch(event) ? `(${event.args.data?.type})` : false;
      const jsFunctionName = TraceEngine.Types.TraceEvents.isProfileCall(event) ?
          `(${event.callFrame.functionName || 'anonymous'})` :
          false;
      const duration = `[${(event.dur || 0) / 1000}ms]`;
      const info = [jsFunctionName, eventType, duration].filter(Boolean);
      out += `${newline}${spacing}${prefix}${event.name} ${info.join(' ')}`;
      out = printNodes(node.children);
    }
    return out;
  }
}

/**
 * Builds a mock TraceEventComplete.
 */
export function makeCompleteEvent(
    name: string, ts: number, dur: number, cat: string = '*', pid: number = 0,
    tid: number = 0): TraceEngine.Types.TraceEvents.TraceEventComplete {
  return {
    args: {},
    cat,
    name,
    ph: TraceEngine.Types.TraceEvents.Phase.COMPLETE,
    pid: TraceEngine.Types.TraceEvents.ProcessID(pid),
    tid: TraceEngine.Types.TraceEvents.ThreadID(tid),
    ts: TraceEngine.Types.Timing.MicroSeconds(ts),
    dur: TraceEngine.Types.Timing.MicroSeconds(dur),
  };
}

export function makeCompleteEventInMilliseconds(
    name: string, tsMillis: number, durMillis: number, cat: string = '*', pid: number = 0,
    tid: number = 0): TraceEngine.Types.TraceEvents.TraceEventComplete {
  return makeCompleteEvent(
      name, TraceEngine.Helpers.Timing.millisecondsToMicroseconds(TraceEngine.Types.Timing.MilliSeconds(tsMillis)),
      TraceEngine.Helpers.Timing.millisecondsToMicroseconds(TraceEngine.Types.Timing.MilliSeconds(durMillis)), cat, pid,
      tid);
}

/**
 * Builds a mock TraceEventInstant.
 */
export function makeInstantEvent(
    name: string, ts: number, cat: string = '', pid: number = 0, tid: number = 0,
    s: TraceEngine.Types.TraceEvents.TraceEventScope =
        TraceEngine.Types.TraceEvents.TraceEventScope.THREAD): TraceEngine.Types.TraceEvents.TraceEventInstant {
  return {
    args: {},
    cat,
    name,
    ph: TraceEngine.Types.TraceEvents.Phase.INSTANT,
    pid: TraceEngine.Types.TraceEvents.ProcessID(pid),
    tid: TraceEngine.Types.TraceEvents.ThreadID(tid),
    ts: TraceEngine.Types.Timing.MicroSeconds(ts),
    s,
  };
}

/**
 * Builds a mock TraceEventBegin.
 */
export function makeBeginEvent(name: string, ts: number, cat: string = '*', pid: number = 0, tid: number = 0):
    TraceEngine.Types.TraceEvents.TraceEventBegin {
  return {
    args: {},
    cat,
    name,
    ph: TraceEngine.Types.TraceEvents.Phase.BEGIN,
    pid: TraceEngine.Types.TraceEvents.ProcessID(pid),
    tid: TraceEngine.Types.TraceEvents.ThreadID(tid),
    ts: TraceEngine.Types.Timing.MicroSeconds(ts),
  };
}

/**
 * Builds a mock TraceEventEnd.
 */
export function makeEndEvent(name: string, ts: number, cat: string = '*', pid: number = 0, tid: number = 0):
    TraceEngine.Types.TraceEvents.TraceEventEnd {
  return {
    args: {},
    cat,
    name,
    ph: TraceEngine.Types.TraceEvents.Phase.END,
    pid: TraceEngine.Types.TraceEvents.ProcessID(pid),
    tid: TraceEngine.Types.TraceEvents.ThreadID(tid),
    ts: TraceEngine.Types.Timing.MicroSeconds(ts),
  };
}

export function makeProfileCall(
    functionName: string, tsMs: number, durMs: number,
    pid: TraceEngine.Types.TraceEvents.ProcessID = TraceEngine.Types.TraceEvents.ProcessID(0),
    tid: TraceEngine.Types.TraceEvents.ThreadID = TraceEngine.Types.TraceEvents.ThreadID(0), nodeId: number = 0,
    url: string = ''): TraceEngine.Types.TraceEvents.TraceEventSyntheticProfileCall {
  return {
    cat: '',
    name: 'ProfileCall',
    nodeId,
    ph: TraceEngine.Types.TraceEvents.Phase.COMPLETE,
    pid,
    tid,
    ts: TraceEngine.Types.Timing.MicroSeconds(tsMs),
    dur: TraceEngine.Types.Timing.MicroSeconds(durMs),
    selfTime: TraceEngine.Types.Timing.MicroSeconds(0),
    callFrame: {
      functionName,
      scriptId: '' as Protocol.Runtime.ScriptId,
      url: url,
      lineNumber: -1,
      columnNumber: -1,
    },
  };
}
/**
 * Provides a stubbed TraceEngine.Legacy.Thread instance.
 * IMPORTANT: this is not designed to be a fully stubbed Thread, but one that is
 * stubbed enough to be able to use it to instantiate an TraceEngine.Legacy.Event.
 * If you pass this fake thread around into places that expect actual threads,
 * you will get errors. Use this only for simple cases where you need a one off
 * event to test something. For anything more, you should use the helpers in
 * TraceHelpers.ts to load and parse a real trace to get real data.
 **/
export class StubbedThread {
  static make(id: number): TraceEngine.Legacy.Thread {
    const instance = new StubbedThread(id);
    return instance as unknown as TraceEngine.Legacy.Thread;
  }

  constructor(public id: number) {
  }

  getModel(): TraceEngine.Legacy.TracingModel {
    return {
      parsedCategoriesForString(input: string): Set<string> {
        return new Set(input.split(','));
      },

    } as unknown as TraceEngine.Legacy.TracingModel;
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
export function makeFakeEventPayload(payload: FakeEventPayload): TraceEngine.TracingManager.EventPayload {
  const event: TraceEngine.TracingManager.EventPayload = {
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
 */
export function makeFakeSDKEventFromPayload(payloadOptions: FakeEventPayload): TraceEngine.Legacy.PayloadEvent {
  const payload = makeFakeEventPayload(payloadOptions);
  const thread = StubbedThread.make(payload.tid);
  const event = TraceEngine.Legacy.PayloadEvent.fromPayload(payload, thread);
  return event;
}

/**
 * Mocks an object compatible with the return type of the
 * RendererHandler using only an array of ordered entries.
 */
export function makeMockRendererHandlerData(entries: TraceEngine.Types.TraceEvents.TraceEntry[]):
    TraceEngine.Handlers.ModelHandlers.Renderer.RendererHandlerData {
  const {tree, entryToNode} = TraceEngine.Helpers.TreeHelpers.treify(entries, {filter: {has: () => true}});
  const mockThread: TraceEngine.Handlers.ModelHandlers.Renderer.RendererThread = {
    tree,
    name: 'thread',
    entries,
  };

  const mockProcess: TraceEngine.Handlers.ModelHandlers.Renderer.RendererProcess = {
    url: 'url',
    isOnMainFrame: true,
    threads: new Map([[1 as TraceEngine.Types.TraceEvents.ThreadID, mockThread]]),
  };

  const renderereEvents: TraceEngine.Types.TraceEvents.TraceEventRendererEvent[] = [];
  for (const entry of entries) {
    if (TraceEngine.Types.TraceEvents.isTraceEventRendererEvent(entry)) {
      renderereEvents.push(entry);
    }
  }

  return {
    processes: new Map([[1 as TraceEngine.Types.TraceEvents.ProcessID, mockProcess]]),
    compositorTileWorkers: new Map(),
    entryToNode,
    allRendererEvents: renderereEvents,
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

  entryColor(entryIndex: number): string {
    return [
      'lightblue',
      'lightpink',
      'yellow',
      'lightgray',
      'lightgreen',
      'lightsalmon',
      'orange',
      'pink',
    ][entryIndex % 8];
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

  timelineData(): PerfUI.FlameChart.FlameChartTimelineData|null {
    return PerfUI.FlameChart.FlameChartTimelineData.createEmpty();
  }
}

export function getMainThread(data: TraceEngine.Handlers.ModelHandlers.Renderer.RendererHandlerData):
    TraceEngine.Handlers.ModelHandlers.Renderer.RendererThread {
  let mainThread: TraceEngine.Handlers.ModelHandlers.Renderer.RendererThread|null = null;
  for (const [, process] of data.processes) {
    for (const [, thread] of process.threads) {
      if (thread.name === 'CrRendererMain') {
        mainThread = thread;
        break;
      }
    }
  }
  if (!mainThread) {
    throw new Error('Could not find main thread.');
  }
  return mainThread;
}
