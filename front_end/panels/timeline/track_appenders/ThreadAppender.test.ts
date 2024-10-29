// Copyright 2023 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import type * as Platform from '../../../core/platform/platform.js';
import * as Root from '../../../core/root/root.js';
import * as SDK from '../../../core/sdk/sdk.js';
import * as Bindings from '../../../models/bindings/bindings.js';
import * as Trace from '../../../models/trace/trace.js';
import * as Workspace from '../../../models/workspace/workspace.js';
import {describeWithEnvironment} from '../../../testing/EnvironmentHelpers.js';
import {
  makeMockRendererHandlerData as makeRendererHandlerData,
  makeProfileCall,
  setupIgnoreListManagerEnvironment,
} from '../../../testing/TraceHelpers.js';
import {TraceLoader} from '../../../testing/TraceLoader.js';
import * as PerfUI from '../../../ui/legacy/components/perf_ui/perf_ui.js';
import * as Timeline from '../timeline.js';

function initTrackAppender(
    flameChartData: PerfUI.FlameChart.FlameChartTimelineData,
    parsedTrace: Trace.Handlers.Types.ParsedTrace,
    entryData: Trace.Types.Events.Event[],
    entryTypeByLevel: Timeline.TimelineFlameChartDataProvider.EntryType[],
    ): Timeline.ThreadAppender.ThreadAppender[] {
  setupIgnoreListManagerEnvironment();
  const compatibilityTracksAppender = new Timeline.CompatibilityTracksAppender.CompatibilityTracksAppender(
      flameChartData, parsedTrace, entryData, entryTypeByLevel);
  return compatibilityTracksAppender.threadAppenders();
}
async function renderThreadAppendersFromTrace(context: Mocha.Context|Mocha.Suite, trace: string): Promise<{
  entryTypeByLevel: Timeline.TimelineFlameChartDataProvider.EntryType[],
  flameChartData: PerfUI.FlameChart.FlameChartTimelineData,
  threadAppenders: Timeline.ThreadAppender.ThreadAppender[],
  entryData: Trace.Types.Events.Event[],
  parsedTrace: Readonly<Trace.Handlers.Types.ParsedTrace>,
}> {
  const entryTypeByLevel: Timeline.TimelineFlameChartDataProvider.EntryType[] = [];
  const entryData: Trace.Types.Events.Event[] = [];
  const flameChartData = PerfUI.FlameChart.FlameChartTimelineData.createEmpty();
  const {parsedTrace} = await TraceLoader.traceEngine(context, trace);
  const threadAppenders = initTrackAppender(flameChartData, parsedTrace, entryData, entryTypeByLevel);
  let level = 0;
  for (const appender of threadAppenders) {
    level = appender.appendTrackAtLevel(level);
  }
  return {
    entryTypeByLevel,
    parsedTrace,
    flameChartData,
    threadAppenders,
    entryData,
  };
}

function renderThreadAppendersFromParsedData(parsedTrace: Trace.Handlers.Types.ParsedTrace): {
  entryTypeByLevel: Timeline.TimelineFlameChartDataProvider.EntryType[],
  flameChartData: PerfUI.FlameChart.FlameChartTimelineData,
  threadAppenders: Timeline.ThreadAppender.ThreadAppender[],
  entryData: Trace.Types.Events.Event[],
} {
  const entryTypeByLevel: Timeline.TimelineFlameChartDataProvider.EntryType[] = [];
  const entryData: Trace.Types.Events.Event[] = [];
  const flameChartData = PerfUI.FlameChart.FlameChartTimelineData.createEmpty();

  const threadAppenders = initTrackAppender(flameChartData, parsedTrace, entryData, entryTypeByLevel);
  let level = 0;
  for (const appender of threadAppenders) {
    level = appender.appendTrackAtLevel(level);
  }

  return {
    entryTypeByLevel,
    flameChartData,
    threadAppenders,
    entryData,
  };
}

describeWithEnvironment('ThreadAppender', function() {
  it('creates a thread appender for each thread in a trace', async function() {
    const {threadAppenders} = await renderThreadAppendersFromTrace(this, 'simple-js-program.json.gz');
    const expectedAppenderNames = [
      'Thread',
      'Thread',
      'Thread',
    ];
    assert.deepStrictEqual(threadAppenders.map(g => g.appenderName), expectedAppenderNames);
  });

  it('renders tracks for threads in correct order', async function() {
    const {flameChartData} = await renderThreadAppendersFromTrace(this, 'multiple-navigations-with-iframes.json.gz');
    assert.strictEqual(flameChartData.groups[0].name, 'Main — http://localhost:5000/');
    assert.strictEqual(flameChartData.groups[1].name, 'Frame — https://www.example.com/');
  });

  it('renders tracks for threads in correct order when a process url is about:blank', async function() {
    const {flameChartData} = await renderThreadAppendersFromTrace(this, 'about-blank-first.json.gz');
    const groupNames = flameChartData.groups.map(g => g.name.replace(/(new-tab-page\/).*/, '$1'));
    assert.deepStrictEqual(groupNames.slice(0, 3), [
      'Frame — chrome-untrusted://new-tab-page/',
      'Main — chrome://new-tab-page/',
      'Main — about:blank',
    ]);
  });

  it('marks all levels used by the track with the TrackAppender type', async function() {
    const {entryTypeByLevel} = await renderThreadAppendersFromTrace(this, 'simple-js-program.json.gz');
    // This includes all tracks rendered by the ThreadAppender.
    const execptedLevelTypes = [
      Timeline.TimelineFlameChartDataProvider.EntryType.TRACK_APPENDER,
      Timeline.TimelineFlameChartDataProvider.EntryType.TRACK_APPENDER,
      Timeline.TimelineFlameChartDataProvider.EntryType.TRACK_APPENDER,
      Timeline.TimelineFlameChartDataProvider.EntryType.TRACK_APPENDER,
      Timeline.TimelineFlameChartDataProvider.EntryType.TRACK_APPENDER,
      Timeline.TimelineFlameChartDataProvider.EntryType.TRACK_APPENDER,
      Timeline.TimelineFlameChartDataProvider.EntryType.TRACK_APPENDER,
      Timeline.TimelineFlameChartDataProvider.EntryType.TRACK_APPENDER,
      Timeline.TimelineFlameChartDataProvider.EntryType.TRACK_APPENDER,
      Timeline.TimelineFlameChartDataProvider.EntryType.TRACK_APPENDER,
    ];
    assert.deepStrictEqual(entryTypeByLevel, execptedLevelTypes);
  });

  it('creates a flamechart groups for track headers and titles', async function() {
    const {flameChartData} = await renderThreadAppendersFromTrace(this, 'cls-single-frame.json.gz');
    const expectedTrackNames = [
      'Main — https://output.jsbin.com/zajamil/quiet',
      'Raster',
      'Rasterizer thread 1',
      'Rasterizer thread 2',
      'Thread pool',
      'Thread pool worker 1',
    ];
    assert.deepStrictEqual(flameChartData.groups.map(g => g.name), expectedTrackNames);
  });

  it('builds flamechart groups for nested tracks correctly', async function() {
    const {flameChartData} = await renderThreadAppendersFromTrace(this, 'cls-single-frame.json.gz');
    // This group corresponds to the header that wraps the raster tracks
    // together. It isn't selectable and isn't nested
    assert.strictEqual(flameChartData.groups[1].name, 'Raster');
    assert.strictEqual(flameChartData.groups[1].selectable, false);
    assert.strictEqual(flameChartData.groups[1].style.nestingLevel, 0);

    // These groups correspond to the raster tracks titles, or the
    // individual raster tracks themselves. They are selectable and
    // nested
    assert.strictEqual(flameChartData.groups[2].name, 'Rasterizer thread 1');
    assert.strictEqual(flameChartData.groups[2].selectable, true);
    assert.strictEqual(flameChartData.groups[2].style.nestingLevel, 1);

    assert.strictEqual(flameChartData.groups[3].name, 'Rasterizer thread 2');
    assert.strictEqual(flameChartData.groups[3].selectable, true);
    assert.strictEqual(flameChartData.groups[3].style.nestingLevel, 1);
  });

  it('assigns correct names to multiple types of threads', async function() {
    const {flameChartData} = await renderThreadAppendersFromTrace(this, 'simple-js-program.json.gz');
    const expectedTrackNames = [
      'Main — https://www.google.com',
      'Thread pool',
      'Thread pool worker 1',
      'Thread pool worker 2',
    ];
    assert.deepStrictEqual(flameChartData.groups.map(g => g.name), expectedTrackNames);
  });

  it('adds thread IDs onto tracks when the trace is generic', async () => {
    const {flameChartData} = await renderThreadAppendersFromTrace(this, 'generic-about-tracing.json.gz');
    // This trace has a lot of tracks, so just test one.
    assert.isTrue(flameChartData.groups.map(g => g.name)
                      .includes('CrBrowserMain (1213787)' as Platform.UIString.LocalizedString));
  });

  it('assigns the right color for events when the trace is generic', async () => {
    const {threadAppenders, parsedTrace} = await renderThreadAppendersFromTrace(this, 'generic-about-tracing.json.gz');
    const event = parsedTrace.Renderer.allTraceEntries.find(entry => {
      return entry.name === 'ThreadControllerImpl::RunTask';
    });
    if (!event) {
      throw new Error('Could not find event.');
    }
    assert.strictEqual(threadAppenders[0].colorForEvent(event), 'hsl(278, 40%, 70%)');
  });

  it('assigns correct names to worker threads', async function() {
    const {flameChartData} = await renderThreadAppendersFromTrace(this, 'two-workers.json.gz');
    const expectedTrackNames = [
      'Main — https://chromedevtools.github.io/performance-stories/two-workers/index.html',
      'Worker — https://chromedevtools.github.io/performance-stories/two-workers/fib-worker.js',
      'Worker — https://chromedevtools.github.io/performance-stories/two-workers/fib-worker.js',
      'Thread pool',
      'Thread pool worker 1',
      'Thread pool worker 2',
    ];
    assert.deepStrictEqual(flameChartData.groups.map(g => g.name), expectedTrackNames);
  });

  it('returns the correct title for a renderer event', async function() {
    const {threadAppenders, parsedTrace} = await renderThreadAppendersFromTrace(this, 'simple-js-program.json.gz');
    const events = parsedTrace.Renderer?.allTraceEntries;
    if (!events) {
      throw new Error('Could not find renderer events');
    }
    const title = threadAppenders[0].titleForEvent(events[0]);
    assert.strictEqual(title, 'Task');
  });

  it('adds the type for EventDispatch events to the title', async function() {
    const {threadAppenders, parsedTrace} = await renderThreadAppendersFromTrace(this, 'one-second-interaction.json.gz');
    const events = parsedTrace.Renderer?.allTraceEntries;
    if (!events) {
      throw new Error('Could not find renderer events');
    }
    const clickEvent = events.find(event => {
      return Trace.Types.Events.isDispatch(event) && event.args.data.type === 'click';
    });
    if (!clickEvent) {
      throw new Error('Could not find expected click event');
    }
    const title = threadAppenders[0].titleForEvent(clickEvent);
    assert.strictEqual(title, 'Event: click');
  });

  it('returns the correct title for a profile call', async function() {
    const {threadAppenders, parsedTrace} = await renderThreadAppendersFromTrace(this, 'simple-js-program.json.gz');
    const rendererHandler = parsedTrace.Renderer;
    if (!rendererHandler) {
      throw new Error('RendererHandler is undefined');
    }
    const [process] = rendererHandler.processes.values();
    const [thread] = process.threads.values();
    const profileCalls = thread.entries.filter(entry => Trace.Types.Events.isProfileCall(entry));

    if (!profileCalls) {
      throw new Error('Could not find renderer events');
    }
    const anonymousCall = threadAppenders[0].titleForEvent(profileCalls[0]);
    assert.strictEqual(anonymousCall, '(anonymous)');
    const n = threadAppenders[0].titleForEvent(profileCalls[7]);
    assert.strictEqual(n, 'n');
  });

  it('will use the function name from the CPUProfile if it has been set', async function() {
    const {threadAppenders, parsedTrace} = await renderThreadAppendersFromTrace(this, 'simple-js-program.json.gz');
    const {Renderer, Samples} = parsedTrace;
    const [process] = Renderer.processes.values();
    const [thread] = process.threads.values();
    const profileCalls = thread.entries.filter(Trace.Types.Events.isProfileCall);

    if (!profileCalls || profileCalls.length === 0) {
      throw new Error('Could not find renderer events');
    }
    const entry = profileCalls[0];
    const cpuProfileNode =
        Samples.profilesInProcess.get(entry.pid)?.get(entry.tid)?.parsedProfile.nodeById(entry.nodeId);
    if (!cpuProfileNode) {
      throw new Error('Could not find CPU Profile Node');
    }
    const anonymousCall = threadAppenders[0].titleForEvent(entry);
    assert.strictEqual(anonymousCall, '(anonymous)');
    const originalName = cpuProfileNode.functionName;
    cpuProfileNode.setFunctionName('new-resolved-function-name');
    assert.strictEqual(threadAppenders[0].titleForEvent(entry), 'new-resolved-function-name');
    // Reset the value for future tests.
    cpuProfileNode.setFunctionName(originalName);
  });

  it('shows the correct title for a trace event when hovered', async function() {
    const {threadAppenders, parsedTrace} = await renderThreadAppendersFromTrace(this, 'simple-js-program.json.gz');
    const events = parsedTrace.Renderer?.allTraceEntries;
    if (!events) {
      throw new Error('Could not find renderer events');
    }
    const info = threadAppenders[0].highlightedEntryInfo(events[0]);
    assert.strictEqual(info.title, 'Task');
    assert.strictEqual(info.formattedTime, '0.27\u00A0ms');
  });

  it('shows self time only for events with self time above the threshold when hovered', async function() {
    const {threadAppenders, parsedTrace} = await renderThreadAppendersFromTrace(this, 'simple-js-program.json.gz');
    const events = parsedTrace.Renderer?.allTraceEntries;
    if (!events) {
      throw new Error('Could not find renderer events');
    }
    const infoForShortEvent = threadAppenders[0].highlightedEntryInfo(events[0]);
    assert.strictEqual(infoForShortEvent.formattedTime, '0.27\u00A0ms');

    const longTask = events.find(e => (e.dur || 0) > 1_000_000);
    if (!longTask) {
      throw new Error('Could not find long task');
    }
    const infoForLongEvent = threadAppenders[0].highlightedEntryInfo(longTask);
    assert.strictEqual(infoForLongEvent.formattedTime, '1.30\u00A0s (self 47\u00A0μs)');
  });

  it('shows the correct title for a ParseHTML event', async function() {
    const {threadAppenders, parsedTrace} = await renderThreadAppendersFromTrace(this, 'simple-js-program.json.gz');
    const events = parsedTrace.Renderer?.allTraceEntries;
    if (!events) {
      throw new Error('Could not find renderer events');
    }
    const infoForShortEvent = threadAppenders[0].highlightedEntryInfo(events[0]);
    assert.strictEqual(infoForShortEvent.formattedTime, '0.27\u00A0ms');

    const longTask = events.find(e => (e.dur || 0) > 1_000_000);
    if (!longTask) {
      throw new Error('Could not find long task');
    }
    const infoForLongEvent = threadAppenders[0].highlightedEntryInfo(longTask);
    assert.strictEqual(infoForLongEvent.formattedTime, '1.30\u00A0s (self 47\u00A0μs)');
  });

  it('shows the correct title for a profile call when hovered', async function() {
    const {threadAppenders, parsedTrace} = await renderThreadAppendersFromTrace(this, 'simple-js-program.json.gz');
    const rendererHandler = parsedTrace.Renderer;
    if (!rendererHandler) {
      throw new Error('RendererHandler is undefined');
    }
    const [process] = rendererHandler.processes.values();
    const [thread] = process.threads.values();
    const profileCalls = thread.entries.filter(entry => Trace.Types.Events.isProfileCall(entry));

    if (!profileCalls) {
      throw new Error('Could not find renderer events');
    }

    const info = threadAppenders[0].highlightedEntryInfo(profileCalls[0]);
    assert.strictEqual(info.title, '(anonymous)');
    assert.strictEqual(info.formattedTime, '15\u00A0μs');
  });
  it('candy-stripes long tasks', async function() {
    const {parsedTrace, flameChartData, entryData} =
        await renderThreadAppendersFromTrace(this, 'simple-js-program.json.gz');
    const events = parsedTrace.Renderer?.allTraceEntries;
    if (!events) {
      throw new Error('Could not find renderer events');
    }
    const longTask = events.find(e => (e.dur || 0) > 1_000_000);
    if (!longTask) {
      throw new Error('Could not find long task');
    }
    const entryIndex = entryData.indexOf(longTask);
    const decorationsForEntry = flameChartData.entryDecorations[entryIndex];
    assert.deepEqual(decorationsForEntry, [
      {type: PerfUI.FlameChart.FlameChartDecorationType.WARNING_TRIANGLE},
      {
        type: PerfUI.FlameChart.FlameChartDecorationType.CANDY,
        startAtTime: Trace.Types.Timing.MicroSeconds(50_000),
      },
    ]);
  });

  it('does not candy-stripe tasks below the long task threshold', async function() {
    const {parsedTrace, flameChartData, entryData} =
        await renderThreadAppendersFromTrace(this, 'simple-js-program.json.gz');
    const events = parsedTrace.Renderer?.allTraceEntries;
    if (!events) {
      throw new Error('Could not find renderer events');
    }
    const entryIndex = entryData.indexOf(events[0]);
    const decorationsForEntry = flameChartData.entryDecorations[entryIndex];
    assert.isUndefined(decorationsForEntry);
  });

  it('does not append a track if there are no visible events on it', async function() {
    const {flameChartData} = await renderThreadAppendersFromTrace(this, 'one-second-interaction.json.gz');
    const expectedTrackNames = [
      'Main — https://chromedevtools.github.io/performance-stories/long-interaction/index.html?x=40',
      'Thread pool',
      // There are multiple ThreadPoolForegroundWorker threads present in
      // the trace, but only one of these has trace events we deem as
      // "visible".
      'Thread pool worker 1',
      // This second "worker" is the ThreadPoolServiceThread. TODO: perhaps hide ThreadPoolServiceThread completely?
      'Thread pool worker 2',
    ];
    assert.deepStrictEqual(flameChartData.groups.map(g => g.name), expectedTrackNames);
  });

  describe('ignore listing', () => {
    let ignoreListManager: Bindings.IgnoreListManager.IgnoreListManager;
    beforeEach(() => {
      const targetManager = SDK.TargetManager.TargetManager.instance({forceNew: true});
      const workspace = Workspace.Workspace.WorkspaceImpl.instance({forceNew: true});
      const resourceMapping = new Bindings.ResourceMapping.ResourceMapping(targetManager, workspace);
      const debuggerWorkspaceBinding = Bindings.DebuggerWorkspaceBinding.DebuggerWorkspaceBinding.instance({
        forceNew: true,
        resourceMapping,
        targetManager,
      });
      ignoreListManager = Bindings.IgnoreListManager.IgnoreListManager.instance({
        forceNew: true,
        debuggerWorkspaceBinding,
      });
    });
    afterEach(() => {
      SDK.TargetManager.TargetManager.removeInstance();
      Workspace.Workspace.WorkspaceImpl.removeInstance();
      Bindings.DebuggerWorkspaceBinding.DebuggerWorkspaceBinding.removeInstance();
      Bindings.IgnoreListManager.IgnoreListManager.removeInstance();
    });
    it('removes entries from the data that match the ignored URL', async function() {
      const initialTimelineData = await renderThreadAppendersFromTrace(this, 'react-hello-world.json.gz');
      const initialFlamechartData = initialTimelineData.flameChartData;
      const eventCountBeforeIgnoreList = initialFlamechartData.entryStartTimes.length;
      const SCRIPT_TO_IGNORE =
          'https://unpkg.com/react@18.2.0/umd/react.development.js' as Platform.DevToolsPath.UrlString;
      // Clear the data provider cache and add the React script to the ignore list.
      ignoreListManager.ignoreListURL(SCRIPT_TO_IGNORE);
      const finalTimelineData = await renderThreadAppendersFromTrace(this, 'react-hello-world.json.gz');
      const finalFlamechartData = finalTimelineData.flameChartData;
      const eventCountAfterIgnoreList = finalFlamechartData.entryStartTimes.length;
      // Ensure that the amount of events we show on the flame chart is less
      // than before, now we have added the React URL to the ignore list.
      assert.isBelow(eventCountAfterIgnoreList, eventCountBeforeIgnoreList);

      // // Clear the data provider cache and unignore the script again
      ignoreListManager.unIgnoreListURL(SCRIPT_TO_IGNORE);
      const finalTimelineData2 = await renderThreadAppendersFromTrace(this, 'react-hello-world.json.gz');
      const finalFlamechartData2 = finalTimelineData2.flameChartData;
      const eventCountAfterIgnoreList2 = finalFlamechartData2.entryStartTimes.length;
      // // Ensure that now we have un-ignored the URL that we get the full set of events again.
      assert.strictEqual(eventCountAfterIgnoreList2, eventCountBeforeIgnoreList);
    });

    it('appends a tree that contains ignore listed entries correctly', async function() {
      const SCRIPT_TO_IGNORE = 'https://some-framework/bundled.js' as Platform.DevToolsPath.UrlString;

      // Create the following hierarchy with profile calls. Events marked
      // with \\\\ represent ignored listed events.
      // |----------A-----------|
      // |\\\\\B\\\\\||----F----|
      // |\\C\\||\D\|
      // |--E--|
      //
      // Applying ignore listing in the appender, should yield the
      // following flame chart:
      // |----------A-----------|
      // |\\\\\B\\\\||----F----|
      // |--E--|
      const callFrameA = makeProfileCall('A', 100, 200);
      const callFrameB = makeProfileCall('IgnoreListedB', 100, 100);
      callFrameB.callFrame.url = SCRIPT_TO_IGNORE;
      const callFrameC = makeProfileCall('IgnoreListedC', 100, 50);
      callFrameC.callFrame.url = SCRIPT_TO_IGNORE;
      const callFrameD = makeProfileCall('IgnoreListedD', 151, 49);
      callFrameD.callFrame.url = SCRIPT_TO_IGNORE;
      const callFrameE = makeProfileCall('E', 100, 25);
      const callFrameF = makeProfileCall('F', 200, 100);

      const allEntries = [callFrameA, callFrameB, callFrameC, callFrameE, callFrameD, callFrameF];
      const rendererData = makeRendererHandlerData(allEntries);
      const workersData: Trace.Handlers.ModelHandlers.Workers.WorkersData = {
        workerSessionIdEvents: [],
        workerIdByThread: new Map(),
        workerURLById: new Map(),
      };
      const warningsData: Trace.Handlers.ModelHandlers.Warnings.WarningsData = {
        perWarning: new Map(),
        perEvent: new Map(),
      };
      // This only includes data used in the thread appender
      const mockParsedTrace = {
        Renderer: rendererData,
        Workers: workersData,
        Warnings: warningsData,
        AuctionWorklets: {worklets: new Map()},
        Meta: {
          traceIsGeneric: false,
        },
      } as Trace.Handlers.Types.ParsedTrace;

      // Add the script to ignore list and then append the flamechart data
      ignoreListManager.ignoreListURL(SCRIPT_TO_IGNORE);
      const {entryData, flameChartData, threadAppenders} = renderThreadAppendersFromParsedData(mockParsedTrace);
      const entryDataNames = entryData.map(entry => {
        if (Trace.Types.Events.isProfileCall(entry)) {
          return entry.callFrame.functionName;
        }
        return entry.name;
      });

      assert.deepEqual(entryDataNames, ['A', 'IgnoreListedB', 'E', 'F']);
      assert.deepEqual(flameChartData.entryLevels, [0, 1, 2, 1]);
      assert.deepEqual(flameChartData.entryStartTimes, [0.1, 0.1, 0.1, 0.2]);
      assert.deepEqual(flameChartData.entryTotalTimes, [0.2, 0.1, 0.025, 0.1]);
      assert.strictEqual(threadAppenders.length, 1);
      assert.strictEqual(threadAppenders[0].titleForEvent(callFrameB), 'On ignore list');
    });
  });
  describe('showAllEvents', () => {
    beforeEach(() => {
      const targetManager = SDK.TargetManager.TargetManager.instance({forceNew: true});
      const workspace = Workspace.Workspace.WorkspaceImpl.instance({forceNew: true});
      const resourceMapping = new Bindings.ResourceMapping.ResourceMapping(targetManager, workspace);
      const debuggerWorkspaceBinding = Bindings.DebuggerWorkspaceBinding.DebuggerWorkspaceBinding.instance({
        forceNew: true,
        resourceMapping,
        targetManager,
      });
      Bindings.IgnoreListManager.IgnoreListManager.instance({
        forceNew: true,
        debuggerWorkspaceBinding,
      });
    });
    afterEach(() => {
      SDK.TargetManager.TargetManager.removeInstance();
      Workspace.Workspace.WorkspaceImpl.removeInstance();
      Bindings.DebuggerWorkspaceBinding.DebuggerWorkspaceBinding.removeInstance();
      Bindings.IgnoreListManager.IgnoreListManager.removeInstance();
    });
    it('appends unknown events to the flame chart data only when the experiment is enabled', async function() {
      const fileName = 'react-hello-world.json.gz';
      const bizarreName = 'BackForwardCacheBufferLimitTracker::DidRemoveFrameOrWorkerFromBackForwardCache';
      // Look up a trace event with an name we are not tracking anywhere and make sure it's not
      // appended to the timeline data.
      const initialTimelineData = await renderThreadAppendersFromTrace(this, fileName);
      let unknownEventIndex = initialTimelineData.entryData.findIndex(entry => {
        const event = entry as Trace.Types.Events.Event;
        return event.name === bizarreName;
      });
      assert.strictEqual(unknownEventIndex, -1);

      // Now enable the experiment and make sure the event is appended to the timeline data this time
      Root.Runtime.experiments.enableForTest('timeline-show-all-events');
      const finalTimelineData = await renderThreadAppendersFromTrace(this, fileName);
      const finalFlamechartData = finalTimelineData.flameChartData;
      unknownEventIndex = finalTimelineData.entryData.findIndex(entry => {
        const event = entry as Trace.Types.Events.Event;
        return event.name === bizarreName;
      });
      assert.isAbove(unknownEventIndex, -1);
      assert.exists(finalFlamechartData.entryStartTimes);
      assert.exists(finalFlamechartData.entryTotalTimes);
      Root.Runtime.experiments.disableForTest('timeline-show-all-events');
    });
  });
  describe('AuctionWorklet threads', () => {
    // We have to set these up because the ThreadAppender includes logic for
    // ignoring events that relies on the IgnoreListManager.
    beforeEach(() => {
      const targetManager = SDK.TargetManager.TargetManager.instance({forceNew: true});
      const workspace = Workspace.Workspace.WorkspaceImpl.instance({forceNew: true});
      const resourceMapping = new Bindings.ResourceMapping.ResourceMapping(targetManager, workspace);
      const debuggerWorkspaceBinding = Bindings.DebuggerWorkspaceBinding.DebuggerWorkspaceBinding.instance({
        forceNew: true,
        resourceMapping,
        targetManager,
      });
      Bindings.IgnoreListManager.IgnoreListManager.instance({
        forceNew: true,
        debuggerWorkspaceBinding,
      });
    });

    afterEach(() => {
      SDK.TargetManager.TargetManager.removeInstance();
      Workspace.Workspace.WorkspaceImpl.removeInstance();
      Bindings.DebuggerWorkspaceBinding.DebuggerWorkspaceBinding.removeInstance();
      Bindings.IgnoreListManager.IgnoreListManager.removeInstance();
    });

    it('finds all the worklet threads', async function() {
      const {threadAppenders} = await renderThreadAppendersFromTrace(this, 'fenced-frame-fledge.json.gz');
      const workletAppenders = threadAppenders.filter(threadAppender => {
        return threadAppender.trackName().includes('Worklet');
      });
      assert.lengthOf(workletAppenders, 6);
    });

    it('sets the title correctly for an Auction Worklet service', async function() {
      const UTILITY_THREAD_PID = 776435 as Trace.Types.Events.ProcessID;
      const UTILITY_THREAD_TID = 1 as Trace.Types.Events.ThreadID;
      const {threadAppenders} = await renderThreadAppendersFromTrace(this, 'fenced-frame-fledge.json.gz');
      const appender = threadAppenders.find(threadAppender => {
        return threadAppender.processId() === UTILITY_THREAD_PID && threadAppender.threadId() === UTILITY_THREAD_TID;
      });
      if (!appender) {
        throw new Error('Could not find expected thread appender');
      }
      assert.strictEqual(appender.trackName(), 'Auction Worklet service — https://ssp-fledge-demo.glitch.me');
    });

    it('sets the title correctly for an Auction Worklet seller service', async function() {
      const SELLER_THREAD_PID = 776435 as Trace.Types.Events.ProcessID;
      const SELLER_THREAD_TID = 6 as Trace.Types.Events.ThreadID;
      const {threadAppenders} = await renderThreadAppendersFromTrace(this, 'fenced-frame-fledge.json.gz');
      const appender = threadAppenders.find(threadAppender => {
        return threadAppender.processId() === SELLER_THREAD_PID && threadAppender.threadId() === SELLER_THREAD_TID;
      });
      if (!appender) {
        throw new Error('Could not find expected thread appender');
      }
      assert.strictEqual(appender.trackName(), 'Seller Worklet — https://ssp-fledge-demo.glitch.me');
    });

    it('sets the title correctly for an Auction Worklet bidder service', async function() {
      const BIDDER_THREAD_PID = 776436 as Trace.Types.Events.ProcessID;
      const BIDDER_THREAD_TID = 6 as Trace.Types.Events.ThreadID;
      const {threadAppenders} = await renderThreadAppendersFromTrace(this, 'fenced-frame-fledge.json.gz');
      const appender = threadAppenders.find(threadAppender => {
        return threadAppender.processId() === BIDDER_THREAD_PID && threadAppender.threadId() === BIDDER_THREAD_TID;
      });
      if (!appender) {
        throw new Error('Could not find expected thread appender');
      }
      assert.strictEqual(appender.trackName(), 'Bidder Worklet — https://dsp-fledge-demo.glitch.me');
    });
  });
});
