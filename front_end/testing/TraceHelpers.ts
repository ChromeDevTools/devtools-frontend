// Copyright 2022 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.
import * as SDK from '../core/sdk/sdk.js';
import type * as Protocol from '../generated/protocol.js';
import * as Bindings from '../models/bindings/bindings.js';
import * as CPUProfile from '../models/cpu_profile/cpu_profile.js';
import * as Trace from '../models/trace/trace.js';
import * as Workspace from '../models/workspace/workspace.js';
import * as Timeline from '../panels/timeline/timeline.js';
import * as PerfUI from '../ui/legacy/components/perf_ui/perf_ui.js';
import * as UI from '../ui/legacy/legacy.js';

import {raf, renderElementIntoDOM} from './DOMHelpers.js';
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

export interface RenderFlameChartOptions {
  dataProvider: 'MAIN'|'NETWORK';
  /**
   * The trace file to import. You must include `.json.gz` at the end of the file name.
   * Alternatively, you can provide the actual file. This is useful only if you
   * are providing a mocked file; generally you should prefer to pass the file
   * name so that the TraceLoader can take care of loading and caching the
   * trace.
   */
  traceFile: string|Trace.Handlers.Types.ParsedTrace;
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
export async function renderFlameChartIntoDOM(context: Mocha.Context|null, options: RenderFlameChartOptions): Promise<{
  flameChart: PerfUI.FlameChart.FlameChart,
  dataProvider: Timeline.TimelineFlameChartDataProvider.TimelineFlameChartDataProvider |
      Timeline.TimelineFlameChartNetworkDataProvider.TimelineFlameChartNetworkDataProvider,
  target: HTMLElement,
  parsedTrace: Trace.Handlers.Types.ParsedTrace,
}> {
  const targetManager = SDK.TargetManager.TargetManager.instance({forceNew: true});
  const workspace = Workspace.Workspace.WorkspaceImpl.instance({forceNew: true});
  const resourceMapping = new Bindings.ResourceMapping.ResourceMapping(targetManager, workspace);
  const ignoreListManager = Workspace.IgnoreListManager.IgnoreListManager.instance({forceNew: true});
  Bindings.DebuggerWorkspaceBinding.DebuggerWorkspaceBinding.instance({
    forceNew: true,
    resourceMapping,
    targetManager,
    ignoreListManager,
  });

  let parsedTrace: Trace.Handlers.Types.ParsedTrace|null = null;

  if (typeof options.traceFile === 'string') {
    parsedTrace = (await TraceLoader.traceEngine(context, options.traceFile)).parsedTrace;
  } else {
    parsedTrace = options.traceFile;
  }

  if (options.preloadScreenshots) {
    await Timeline.Utils.ImageCache.preload(parsedTrace.Screenshots.screenshots ?? []);
  }
  const entityMapper = new Timeline.Utils.EntityMapper.EntityMapper(parsedTrace);
  const dataProvider = options.dataProvider === 'MAIN' ?
      new Timeline.TimelineFlameChartDataProvider.TimelineFlameChartDataProvider() :
      new Timeline.TimelineFlameChartNetworkDataProvider.TimelineFlameChartNetworkDataProvider();

  dataProvider.setModel(parsedTrace, entityMapper);
  if (dataProvider instanceof Timeline.TimelineFlameChartDataProvider.TimelineFlameChartDataProvider) {
    dataProvider.buildWithCustomTracksForTest({
      filterTracks: options.filterTracks,
      expandTracks: options.expandTracks,
    });
  } else {
    // Calling this method triggers the data being generated & the Network appender being created + drawn.
    dataProvider.timelineData();
  }
  const delegate = new MockFlameChartDelegate();
  const flameChart = new PerfUI.FlameChart.FlameChart(dataProvider, delegate);
  const minTime = options.customStartTime ?? Trace.Helpers.Timing.microToMilli(parsedTrace.Meta.traceBounds.min);
  const maxTime = options.customEndTime ?? Trace.Helpers.Timing.microToMilli(parsedTrace.Meta.traceBounds.max);

  flameChart.setWindowTimes(minTime, maxTime);
  flameChart.markAsRoot();

  const target = document.createElement('div');
  target.innerHTML = `<style>${UI.inspectorCommonStyles}</style>`;

  const timingsTrackOffset = flameChart.levelToOffset(dataProvider.maxStackDepth());

  // Allow an extra 10px so no scrollbar is shown if using the default height
  // that fits everything inside.
  const heightPixels = options.customHeight ?? timingsTrackOffset + 10;
  target.style.height = `${heightPixels}px`;
  target.style.display = 'flex';
  target.style.width = '800px';
  renderElementIntoDOM(target);
  flameChart.show(target);
  flameChart.update();
  await raf();

  return {flameChart, dataProvider, target, parsedTrace};
}

/**
 * Draws the network track in the flame chart using the legacy system.
 *
 * @param traceFileName The name of the trace file to be loaded to the flame
 * chart.
 * @param expanded if the track is expanded
 * @returns a flame chart element and its corresponding data provider.
 */
export async function getNetworkFlameChart(traceFileName: string, expanded: boolean): Promise<{
  flameChart: PerfUI.FlameChart.FlameChart,
  dataProvider: Timeline.TimelineFlameChartNetworkDataProvider.TimelineFlameChartNetworkDataProvider,
}> {
  await initializeGlobalVars();

  const {parsedTrace} = await TraceLoader.traceEngine(/* context= */ null, traceFileName);
  const entityMapper = new Timeline.Utils.EntityMapper.EntityMapper(parsedTrace);
  const minTime = Trace.Helpers.Timing.microToMilli(parsedTrace.Meta.traceBounds.min);
  const maxTime = Trace.Helpers.Timing.microToMilli(parsedTrace.Meta.traceBounds.max);
  const dataProvider = new Timeline.TimelineFlameChartNetworkDataProvider.TimelineFlameChartNetworkDataProvider();
  dataProvider.setModel(parsedTrace, entityMapper);
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

// We create here a cross-test base trace event. It is assumed that each
// test will import this default event and copy-override properties at will.
export const defaultTraceEvent: Trace.Types.Events.Event = {
  name: 'process_name',
  tid: Trace.Types.Events.ThreadID(0),
  pid: Trace.Types.Events.ProcessID(0),
  ts: Trace.Types.Timing.Micro(0),
  cat: 'test',
  ph: Trace.Types.Events.Phase.METADATA,
};

/**
 * Gets the tree in a thread.
 * @see RendererHandler.ts
 */
export function getTree(thread: Trace.Handlers.ModelHandlers.Renderer.RendererThread):
    Trace.Helpers.TreeHelpers.TraceEntryTree {
  const tree = thread.tree;
  if (!tree) {
    assert(false, `Couldn't get tree in thread ${thread.name}`);
  }
  return tree;
}

/**
 * Gets the n-th root from a tree in a thread.
 * @see RendererHandler.ts
 */
export function getRootAt(thread: Trace.Handlers.ModelHandlers.Renderer.RendererThread, index: number):
    Trace.Helpers.TreeHelpers.TraceEntryNode {
  const tree = getTree(thread);
  const node = [...tree.roots][index];
  if (node === undefined) {
    assert(false, `Couldn't get the id of the root at index ${index} in thread ${thread.name}`);
  }
  return node;
}

/**
 * Gets all nodes in a thread. To finish this task, we Walk through all the nodes, starting from the root node.
 */
export function getAllNodes(roots: Set<Trace.Helpers.TreeHelpers.TraceEntryNode>):
    Trace.Helpers.TreeHelpers.TraceEntryNode[] {
  const allNodes: Trace.Helpers.TreeHelpers.TraceEntryNode[] = [];

  const children: Trace.Helpers.TreeHelpers.TraceEntryNode[] = Array.from(roots);
  while (children.length > 0) {
    const childNode = children.shift();
    if (childNode) {
      allNodes.push(childNode);
      children.push(...childNode.children);
    }
  }
  return allNodes;
}

/**
 * Gets all the `events` for the `nodes`.
 */
export function getEventsIn(nodes: IterableIterator<Trace.Helpers.TreeHelpers.TraceEntryNode>):
    Trace.Types.Events.Event[] {
  return [...nodes].flatMap(node => node ? node.entry : []);
}
/**
 * Pretty-prints a tree.
 */
export function prettyPrint(
    tree: Trace.Helpers.TreeHelpers.TraceEntryTree,
    predicate: (node: Trace.Helpers.TreeHelpers.TraceEntryNode, event: Trace.Types.Events.Event) => boolean = () =>
        true,
    indentation = 2, delimiter = ' ', prefix = '-', newline = '\n', out = ''): string {
  let skipped = false;
  return printNodes(tree.roots);
  function printNodes(nodes: Set<Trace.Helpers.TreeHelpers.TraceEntryNode>|Trace.Helpers.TreeHelpers.TraceEntryNode[]):
      string {
    for (const node of nodes) {
      const event = node.entry;
      if (!predicate(node, event)) {
        out += `${!skipped ? newline : ''}.`;
        skipped = true;
        continue;
      }
      skipped = false;
      const spacing = new Array(node.depth * indentation).fill(delimiter).join('');
      const eventType = Trace.Types.Events.isDispatch(event) ? `(${event.args.data?.type})` : false;
      const jsFunctionName =
          Trace.Types.Events.isProfileCall(event) ? `(${event.callFrame.functionName || 'anonymous'})` : false;
      const duration = `[${(event.dur || 0) / 1000}ms]`;
      const info = [jsFunctionName, eventType, duration].filter(Boolean);
      out += `${newline}${spacing}${prefix}${event.name} ${info.join(' ')}`;
      out = printNodes(node.children);
    }
    return out;
  }
}

/**
 * Builds a mock Complete.
 */
export function makeCompleteEvent(
    name: string, ts: number, dur: number, cat = '*', pid = 0, tid = 0): Trace.Types.Events.Complete {
  return {
    args: {},
    cat,
    name,
    ph: Trace.Types.Events.Phase.COMPLETE,
    pid: Trace.Types.Events.ProcessID(pid),
    tid: Trace.Types.Events.ThreadID(tid),
    ts: Trace.Types.Timing.Micro(ts),
    dur: Trace.Types.Timing.Micro(dur),
  };
}

export function makeAsyncStartEvent(
    name: string,
    ts: number,
    pid = 0,
    tid = 0,
    ): Trace.Types.Events.Async {
  return {
    args: {},
    cat: '*',
    name,
    ph: Trace.Types.Events.Phase.ASYNC_NESTABLE_START,
    pid: Trace.Types.Events.ProcessID(pid),
    tid: Trace.Types.Events.ThreadID(tid),
    ts: Trace.Types.Timing.Micro(ts),
  };
}
export function makeAsyncEndEvent(
    name: string,
    ts: number,
    pid = 0,
    tid = 0,
    ): Trace.Types.Events.Async {
  return {
    args: {},
    cat: '*',
    name,
    ph: Trace.Types.Events.Phase.ASYNC_NESTABLE_END,
    pid: Trace.Types.Events.ProcessID(pid),
    tid: Trace.Types.Events.ThreadID(tid),
    ts: Trace.Types.Timing.Micro(ts),
  };
}

/**
 * Builds a mock flow phase event.
 */
export function makeFlowPhaseEvent(
    name: string, ts: number, cat = '*',
    ph: Trace.Types.Events.Phase.FLOW_START|Trace.Types.Events.Phase.FLOW_END|Trace.Types.Events.Phase.FLOW_STEP,
    id = 0, pid = 0, tid = 0): Trace.Types.Events.FlowEvent {
  return {
    args: {},
    cat,
    name,
    id,
    ph,
    pid: Trace.Types.Events.ProcessID(pid),
    tid: Trace.Types.Events.ThreadID(tid),
    ts: Trace.Types.Timing.Micro(ts),
    dur: Trace.Types.Timing.Micro(0),
  };
}

/**
 * Builds flow phase events for a list of events belonging to the same
 * flow. `events` must be ordered.
 */
export function makeFlowEvents(events: Trace.Types.Events.Event[], flowId = 0): Trace.Types.Events.FlowEvent[] {
  const firstEvent = events.at(0);
  const lastEvent = events.at(-1);
  if (!lastEvent || !firstEvent) {
    return [];
  }
  const flowName = firstEvent.name;
  const flowStart = makeFlowPhaseEvent(
      flowName, firstEvent.ts, firstEvent.cat, Trace.Types.Events.Phase.FLOW_START, flowId, firstEvent.pid,
      firstEvent.tid);
  const flowEnd = makeFlowPhaseEvent(
      flowName, lastEvent.ts, lastEvent.cat, Trace.Types.Events.Phase.FLOW_END, flowId, lastEvent.pid, lastEvent.tid);

  const flowSteps: Trace.Types.Events.FlowEvent[] = [];
  for (let i = 1; i < events.length - 1; i++) {
    flowSteps.push(makeFlowPhaseEvent(
        flowName, events[i].ts, events[i].cat, Trace.Types.Events.Phase.FLOW_STEP, flowId, events[i].pid,
        events[i].tid));
  }
  return [flowStart, ...flowSteps, flowEnd];
}

/**
 * Builds a mock Instant.
 */
export function makeInstantEvent(
    name: string, tsMicroseconds: number, cat = '', pid = 0, tid = 0,
    s: Trace.Types.Events.Scope = Trace.Types.Events.Scope.THREAD): Trace.Types.Events.Instant {
  return {
    args: {},
    cat,
    name,
    ph: Trace.Types.Events.Phase.INSTANT,
    pid: Trace.Types.Events.ProcessID(pid),
    tid: Trace.Types.Events.ThreadID(tid),
    ts: Trace.Types.Timing.Micro(tsMicroseconds),
    s,
  };
}

/**
 * Builds a mock Begin.
 */
export function makeBeginEvent(name: string, ts: number, cat = '*', pid = 0, tid = 0): Trace.Types.Events.Begin {
  return {
    args: {},
    cat,
    name,
    ph: Trace.Types.Events.Phase.BEGIN,
    pid: Trace.Types.Events.ProcessID(pid),
    tid: Trace.Types.Events.ThreadID(tid),
    ts: Trace.Types.Timing.Micro(ts),
  };
}

/**
 * Builds a mock End.
 */
export function makeEndEvent(name: string, ts: number, cat = '*', pid = 0, tid = 0): Trace.Types.Events.End {
  return {
    args: {},
    cat,
    name,
    ph: Trace.Types.Events.Phase.END,
    pid: Trace.Types.Events.ProcessID(pid),
    tid: Trace.Types.Events.ThreadID(tid),
    ts: Trace.Types.Timing.Micro(ts),
  };
}

export function makeProfileCall(
    functionName: string, tsUs: number, durUs: number, pid = 0, tid = 0, nodeId = 0,
    url = ''): Trace.Types.Events.SyntheticProfileCall {
  return {
    cat: '',
    name: 'ProfileCall',
    nodeId,
    sampleIndex: 0,
    profileId: Trace.Types.Events.ProfileID('fake-profile-id'),
    ph: Trace.Types.Events.Phase.COMPLETE,
    pid: Trace.Types.Events.ProcessID(pid),
    tid: Trace.Types.Events.ThreadID(tid),
    ts: Trace.Types.Timing.Micro(tsUs),
    dur: Trace.Types.Timing.Micro(durUs),
    callFrame: {
      functionName,
      scriptId: '' as Protocol.Runtime.ScriptId,
      url,
      lineNumber: -1,
      columnNumber: -1,
    },
    args: {},
  };
}
export const DevToolsTimelineCategory = 'disabled-by-default-devtools.timeline';

/**
 * Mocks an object compatible with the return type of the
 * RendererHandler using only an array of ordered entries.
 */
export function makeMockRendererHandlerData(
    entries: Trace.Types.Events.Event[], pid = 1, tid = 1): Trace.Handlers.ModelHandlers.Renderer.RendererHandlerData {
  const {tree, entryToNode} = Trace.Helpers.TreeHelpers.treify(entries, {filter: {has: () => true}});
  const mockThread: Trace.Handlers.ModelHandlers.Renderer.RendererThread = {
    tree,
    name: 'thread',
    entries,
    profileCalls: entries.filter(Trace.Types.Events.isProfileCall),
    layoutEvents: entries.filter(Trace.Types.Events.isLayout),
    updateLayoutTreeEvents: entries.filter(Trace.Types.Events.isUpdateLayoutTree),
  };

  const mockProcess: Trace.Handlers.ModelHandlers.Renderer.RendererProcess = {
    url: 'url',
    isOnMainFrame: true,
    threads: new Map([[tid as Trace.Types.Events.ThreadID, mockThread]]),
  };

  return {
    processes: new Map([[pid as Trace.Types.Events.ProcessID, mockProcess]]),
    compositorTileWorkers: new Map(),
    entryToNode,
    entityMappings: {
      entityByEvent: new Map(),
      eventsByEntity: new Map(),
      createdEntityCache: new Map(),
      entityByUrlCache: new Map(),
    },
  };
}

/**
 * Mocks an object compatible with the return type of the
 * SamplesHandler using only an array of ordered profile calls.
 */
export function makeMockSamplesHandlerData(profileCalls: Trace.Types.Events.SyntheticProfileCall[]):
    Trace.Handlers.ModelHandlers.Samples.SamplesHandlerData {
  const {tree, entryToNode} = Trace.Helpers.TreeHelpers.treify(profileCalls, {filter: {has: () => true}});
  const profile: Protocol.Profiler.Profile = {
    nodes: [],
    startTime: profileCalls.at(0)?.ts || Trace.Types.Timing.Micro(0),
    endTime: profileCalls.at(-1)?.ts || Trace.Types.Timing.Micro(10e5),
    samples: [],
    timeDeltas: [],
  };

  const nodesIds = new Map<number, Protocol.Profiler.ProfileNode>();
  const lastTimestamp = profile.startTime;
  for (const profileCall of profileCalls) {
    let node = nodesIds.get(profileCall.nodeId);
    if (!node) {
      node = {
        id: profileCall.nodeId,
        callFrame: profileCall.callFrame,
      };
      profile.nodes.push(node);
      nodesIds.set(profileCall.nodeId, node);
    }
    profile.samples?.push(node.id);
    const timeDelta = profileCall.ts - lastTimestamp;
    profile.timeDeltas?.push(timeDelta);
  }
  const profileData = {
    rawProfile: profile,
    parsedProfile: new CPUProfile.CPUProfileDataModel.CPUProfileDataModel(profile),
    profileCalls,
    profileTree: tree,
    profileId: Trace.Types.Events.ProfileID('fake-profile-id'),
  };
  const profilesInThread = new Map([[1 as Trace.Types.Events.ThreadID, profileData]]);
  return {
    profilesInProcess: new Map([[1 as Trace.Types.Events.ProcessID, profilesInThread]]),
    entryToNode,
  };
}

export class FakeFlameChartProvider implements PerfUI.FlameChart.FlameChartDataProvider {
  minimumBoundary(): number {
    return 0;
  }

  hasTrackConfigurationMode(): boolean {
    return false;
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

  preparePopoverElement(_entryIndex: number): Element|null {
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

export interface FlameChartWithFakeProviderOptions {
  windowTimes?: [number, number];
}

/**
 * Renders a flame chart using a fake provider and mock delegate.
 * @param provider The fake flame chart provider.
 * @param options Optional parameters.  Includes windowTimes, an array specifying the minimum and maximum window times. Defaults to [0, 100].
 * @returns A promise that resolves when the flame chart is rendered.
 */
export async function renderFlameChartWithFakeProvider(
    provider: FakeFlameChartProvider,
    options?: FlameChartWithFakeProviderOptions,
    ): Promise<void> {
  const delegate = new MockFlameChartDelegate();
  const flameChart = new PerfUI.FlameChart.FlameChart(provider, delegate);
  const [minWindowTime, maxWindowTime] = options?.windowTimes ?? [0, 100];
  flameChart.setWindowTimes(minWindowTime, maxWindowTime);

  const lastTrackOffset = flameChart.levelToOffset(provider.maxStackDepth());
  const target = document.createElement('div');
  target.innerHTML = `<style>${UI.inspectorCommonStyles}</style>`;
  // Allow an extra 10px so no scrollbar is shown.
  target.style.height = `${lastTrackOffset + 10}px`;
  target.style.display = 'flex';
  target.style.width = '800px';
  renderElementIntoDOM(target);
  flameChart.markAsRoot();
  flameChart.show(target);
  flameChart.update();
  await raf();
}

/**
 * Renders a widget into an element that has the right styling to be a VBox.
 * Useful as many of the Performance Panel elements are rendered like this and
 * need a parent that is flex + has a height & width in order to render
 * correctly for screenshot tests.
 */
export function renderWidgetInVbox(widget: UI.Widget.Widget, opts: {
  width?: number,
  height?: number,
  flexAuto?: boolean,
} = {}): void {
  const target = document.createElement('div');
  target.innerHTML = `<style>${UI.inspectorCommonStyles}</style>`;
  target.classList.add('vbox');
  target.classList.toggle('flex-auto', Boolean(opts.flexAuto));
  target.style.width = (opts.width ?? 800) + 'px';
  target.style.height = (opts.height ?? 600) + 'px';
  widget.markAsRoot();
  widget.show(target);
  renderElementIntoDOM(target);
}

export function getMainThread(data: Trace.Handlers.ModelHandlers.Renderer.RendererHandlerData):
    Trace.Handlers.ModelHandlers.Renderer.RendererThread {
  let mainThread: Trace.Handlers.ModelHandlers.Renderer.RendererThread|null = null;
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

type ParsedTrace = Trace.Handlers.Types.ParsedTrace;

export function getBaseTraceParseModelData(overrides: Partial<ParsedTrace> = {}): ParsedTrace {
  return {
    Animations: {animations: []},
    AnimationFrames: {
      animationFrames: [],
      presentationForFrame: new Map(),
    },
    DOMStats: {
      domStatsByFrameId: new Map(),
    },
    LayoutShifts: {
      clusters: [],
      clustersByNavigationId: new Map(),
      sessionMaxScore: 0,
      clsWindowID: 0,
      prePaintEvents: [],
      layoutInvalidationEvents: [],
      scheduleStyleInvalidationEvents: [],
      styleRecalcInvalidationEvents: [],
      renderFrameImplCreateChildFrameEvents: [],
      domLoadingEvents: [],
      layoutImageUnsizedEvents: [],
      remoteFonts: [],
      scoreRecords: [],
      backendNodeIds: [],
      paintImageEvents: [],
    },
    Meta: {
      traceBounds: {
        min: Trace.Types.Timing.Micro(0),
        max: Trace.Types.Timing.Micro(100),
        range: Trace.Types.Timing.Micro(100),
      },
      browserProcessId: Trace.Types.Events.ProcessID(-1),
      browserThreadId: Trace.Types.Events.ThreadID(-1),
      gpuProcessId: Trace.Types.Events.ProcessID(-1),
      gpuThreadId: Trace.Types.Events.ThreadID(-1),
      threadsInProcess: new Map(),
      navigationsByFrameId: new Map(),
      navigationsByNavigationId: new Map(),
      finalDisplayUrlByNavigationId: new Map(),
      mainFrameId: '',
      mainFrameURL: '',
      rendererProcessesByFrame: new Map(),
      topLevelRendererIds: new Set(),
      frameByProcessId: new Map(),
      mainFrameNavigations: [],
      traceIsGeneric: false,
      processNames: new Map(),
    },
    Renderer: {
      processes: new Map(),
      compositorTileWorkers: new Map(),
      entryToNode: new Map(),
      entityMappings: {
        entityByEvent: new Map(),
        eventsByEntity: new Map(),
        createdEntityCache: new Map(),
        entityByUrlCache: new Map(),
      },
    },
    Screenshots: {
      legacySyntheticScreenshots: [],
      screenshots: [],
    },
    Samples: {
      entryToNode: new Map(),
      profilesInProcess: new Map(),
    },
    PageLoadMetrics: {metricScoresByFrameId: new Map(), allMarkerEvents: []},
    UserInteractions: {
      allEvents: [],
      interactionEvents: [],
      beginCommitCompositorFrameEvents: [],
      parseMetaViewportEvents: [],
      interactionEventsWithNoNesting: [],
      longestInteractionEvent: null,
      interactionsOverThreshold: new Set(),
    },
    NetworkRequests: {
      byId: new Map(),
      eventToInitiator: new Map(),
      byTime: [],
      webSocket: [],
      entityMappings: {
        entityByEvent: new Map(),
        eventsByEntity: new Map(),
        createdEntityCache: new Map(),
        entityByUrlCache: new Map(),
      },
      linkPreconnectEvents: [],
    },
    GPU: {
      mainGPUThreadTasks: [],
    },
    UserTimings: {
      consoleTimings: [],
      performanceMarks: [],
      performanceMeasures: [],
      timestampEvents: [],
      measureTraceByTraceId: new Map(),
    },
    LargestImagePaint: {
      lcpRequestByNavigationId: new Map(),
    },
    LargestTextPaint: new Map(),
    AuctionWorklets: {
      worklets: new Map(),
    },
    ExtensionTraceData: {
      entryToNode: new Map(),
      extensionMarkers: [],
      extensionTrackData: [],
      syntheticConsoleEntriesForTimingsTrack: [],
    },
    Frames: {
      frames: [],
      framesById: {},
    },
    ImagePainting: {
      paintImageByDrawLazyPixelRef: new Map(),
      paintImageForEvent: new Map(),
      paintImageEventForUrl: new Map(),
      paintEventToCorrectedDisplaySize: new Map(),
      didCorrectForHostDpr: false,
    },
    Initiators: {
      eventToInitiator: new Map(),
      initiatorToEvents: new Map(),
    },
    Invalidations: {
      invalidationCountForEvent: new Map(),
      invalidationsForEvent: new Map(),
    },
    LayerTree: {
      paints: [],
      paintsToSnapshots: new Map(),
      snapshots: [],
    },
    Memory: {
      updateCountersByProcess: new Map(),
    },
    PageFrames: {
      frames: new Map(),
    },
    SelectorStats: {
      dataForUpdateLayoutEvent: new Map(),
      invalidatedNodeList: [],
    },
    Warnings: {
      perEvent: new Map(),
      perWarning: new Map(),
    },
    Workers: {
      workerIdByThread: new Map(),
      workerSessionIdEvents: [],
      workerURLById: new Map(),
    },
    Flows: {
      flows: [],
    },
    AsyncJSCalls: {
      schedulerToRunEntryPoints: new Map(),
      asyncCallToScheduler: new Map(),
      runEntryPointToScheduler: new Map(),
    },
    Scripts: {
      scripts: [],
    },
    ...overrides,
  };
}

/**
 * A helper that will query the given array of events and find the first event
 * matching the predicate. It will also assert that a match is found, which
 * saves the need to do that for every test.
 */
export function getEventOfType<T extends Trace.Types.Events.Event>(
    events: Trace.Types.Events.Event[], predicate: (e: Trace.Types.Events.Event) => e is T): T {
  const match = events.find(predicate);
  if (!match) {
    throw new Error('Failed to find matching event of type.');
  }
  return match;
}

/**
 * The Performance Panel is integrated with the IgnoreListManager so in tests
 * that render a flame chart or a track appender, it needs to be setup to avoid
 * errors.
 */
export function setupIgnoreListManagerEnvironment(): {
  ignoreListManager: Workspace.IgnoreListManager.IgnoreListManager,
} {
  const targetManager = SDK.TargetManager.TargetManager.instance({forceNew: true});
  const workspace = Workspace.Workspace.WorkspaceImpl.instance({forceNew: true});
  const resourceMapping = new Bindings.ResourceMapping.ResourceMapping(targetManager, workspace);
  const ignoreListManager = Workspace.IgnoreListManager.IgnoreListManager.instance({forceNew: true});
  Bindings.DebuggerWorkspaceBinding.DebuggerWorkspaceBinding.instance({
    forceNew: true,
    resourceMapping,
    targetManager,
    ignoreListManager,
  });

  return {ignoreListManager};
}

export function microsecondsTraceWindow(min: number, max: number): Trace.Types.Timing.TraceWindowMicro {
  return Trace.Helpers.Timing.traceWindowFromMicroSeconds(
      min as Trace.Types.Timing.Micro,
      max as Trace.Types.Timing.Micro,
  );
}

export function microseconds(x: number): Trace.Types.Timing.Micro {
  return Trace.Types.Timing.Micro(x);
}

export function milliseconds(x: number): Trace.Types.Timing.Milli {
  return Trace.Types.Timing.Milli(x);
}

export function getAllNetworkRequestsByHost(
    networkRequests: Trace.Types.Events.SyntheticNetworkRequest[],
    host: string): Trace.Types.Events.SyntheticNetworkRequest[] {
  const reqs = networkRequests.filter(r => {
    const parsedUrl = new URL(r.args.data.url);
    return parsedUrl.host === host;
  });

  return reqs;
}

const allThreadEntriesForTraceCache = new WeakMap<Trace.Handlers.Types.ParsedTrace, Trace.Types.Events.Event[]>();

/**
 * A function to get a list of all thread entries that exist. This is
 * reasonably expensive, so it's cached to avoid a huge impact on our test suite
 * speed.
 */
export function allThreadEntriesInTrace(parsedTrace: Trace.Handlers.Types.ParsedTrace): Trace.Types.Events.Event[] {
  const fromCache = allThreadEntriesForTraceCache.get(parsedTrace);
  if (fromCache) {
    return fromCache;
  }

  const allEvents: Trace.Types.Events.Event[] = [];

  for (const process of parsedTrace.Renderer.processes.values()) {
    for (const thread of process.threads.values()) {
      for (const entry of thread.entries) {
        allEvents.push(entry);
      }
    }
  }

  Trace.Helpers.Trace.sortTraceEventsInPlace(allEvents);
  allThreadEntriesForTraceCache.set(parsedTrace, allEvents);
  return allEvents;
}

export interface PerformanceAPIExtensionTestData {
  detail: {devtools?: Trace.Types.Extensions.ExtensionDataPayload};
  name: string;
  start?: string|number;
  end?: string|number;
  ts: number;
  dur?: number;
}

export interface ConsoleAPIExtensionTestData {
  name: string;
  start?: string|number;
  end?: string|number;
  track?: string;
  trackGroup?: string;
  color?: string;
  ts: number;
}

let idCounter = 0;

export function makeTimingEventWithPerformanceExtensionData(
    {name, ts: tsMicro, detail, dur: durMicro}: PerformanceAPIExtensionTestData): Trace.Types.Events.Event[] {
  const isMark = durMicro === undefined;
  const currentId = idCounter++;
  const traceEventBase = {
    cat: 'blink.user_timing',
    pid: Trace.Types.Events.ProcessID(2017),
    tid: Trace.Types.Events.ThreadID(259),
    id2: {local: `${currentId}`},
  };

  const stringDetail = JSON.stringify(detail);
  const args = isMark ? {data: {detail: stringDetail}} : {detail: stringDetail};
  const firstEvent = {
    args,
    name,
    ph: isMark ? Trace.Types.Events.Phase.INSTANT : Trace.Types.Events.Phase.ASYNC_NESTABLE_START,
    ts: Trace.Types.Timing.Micro(tsMicro),
    ...traceEventBase,
  } as Trace.Types.Events.Event;
  if (isMark) {
    return [firstEvent];
  }
  return [
    firstEvent,
    {
      name,
      ...traceEventBase,
      ts: Trace.Types.Timing.Micro(tsMicro + (durMicro || 0)),
      ph: Trace.Types.Events.Phase.ASYNC_NESTABLE_END,
    },
  ];
}

export function makeTimingEventWithConsoleExtensionData(
    {name, ts, start, end, track, trackGroup, color}: ConsoleAPIExtensionTestData):
    Trace.Types.Events.ConsoleTimeStamp {
  return {
    cat: 'devtools.timeline',
    pid: Trace.Types.Events.ProcessID(2017),
    tid: Trace.Types.Events.ThreadID(259),
    name: Trace.Types.Events.Name.TIME_STAMP,
    args: {
      data: {
        message: name,
        start,
        end,
        track,
        trackGroup,
        color,
      }
    },
    ts: Trace.Types.Timing.Micro(ts),
    ph: Trace.Types.Events.Phase.INSTANT,
  };
}
