// Copyright 2023 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as TraceModel from '../../../../../../front_end/models/trace/trace.js';
import * as Timeline from '../../../../../../front_end/panels/timeline/timeline.js';
import * as PerfUI from '../../../../../../front_end/ui/legacy/components/perf_ui/perf_ui.js';
import {describeWithEnvironment} from '../../../helpers/EnvironmentHelpers.js';
import type * as TimelineModel from '../../../../../../front_end/models/timeline_model/timeline_model.js';
import {TraceLoader} from '../../../helpers/TraceLoader.js';

const {assert} = chai;

function initTrackAppender(
    flameChartData: PerfUI.FlameChart.FlameChartTimelineData, traceParsedData: TraceModel.Handlers.Types.TraceParseData,
    entryData: Timeline.TimelineFlameChartDataProvider.TimelineFlameChartEntry[],
    entryTypeByLevel: Timeline.TimelineFlameChartDataProvider.EntryType[],
    timelineModel: TimelineModel.TimelineModel.TimelineModelImpl): Timeline.ThreadAppender.ThreadAppender[] {
  const compatibilityTracksAppender = new Timeline.CompatibilityTracksAppender.CompatibilityTracksAppender(
      flameChartData, traceParsedData, entryData, entryTypeByLevel, timelineModel);
  return compatibilityTracksAppender.threadAppenders();
}

describeWithEnvironment('ThreadAppender', function() {
  async function renderThreadAppenders(context: Mocha.Context|Mocha.Suite, trace: string): Promise<{
    entryTypeByLevel: Timeline.TimelineFlameChartDataProvider.EntryType[],
    flameChartData: PerfUI.FlameChart.FlameChartTimelineData,
    threadAppenders: Timeline.ThreadAppender.ThreadAppender[],
    entryData: Timeline.TimelineFlameChartDataProvider.TimelineFlameChartEntry[],
    traceParsedData: Readonly<TraceModel.Handlers.Types.TraceParseData>,
  }> {
    const entryTypeByLevel: Timeline.TimelineFlameChartDataProvider.EntryType[] = [];
    const entryData: Timeline.TimelineFlameChartDataProvider.TimelineFlameChartEntry[] = [];
    const flameChartData = PerfUI.FlameChart.FlameChartTimelineData.createEmpty();
    const {traceParsedData, timelineModel} = await TraceLoader.allModels(context, trace);
    const threadAppenders =
        initTrackAppender(flameChartData, traceParsedData, entryData, entryTypeByLevel, timelineModel);
    let level = 0;
    for (const appender of threadAppenders) {
      level = appender.appendTrackAtLevel(level);
    }

    return {
      entryTypeByLevel,
      traceParsedData,
      flameChartData,
      threadAppenders,
      entryData,
    };
  }

  it('creates a thread appender for each thread in a trace', async function() {
    const {threadAppenders} = await renderThreadAppenders(this, 'simple-js-program.json.gz');
    assert.strictEqual(threadAppenders.length, 5);
  });

  it('renders tracks for threads in correct order', async function() {
    const {flameChartData} = await renderThreadAppenders(this, 'multiple-navigations-with-iframes.json.gz');
    assert.strictEqual(flameChartData.groups[0].name, '[RPP] Main — http://localhost:5000/');
    assert.strictEqual(flameChartData.groups[1].name, '[RPP] Frame — https://www.example.com/');
  });

  it('marks all levels used by the track with the TrackAppender type', async function() {
    const {entryTypeByLevel} = await renderThreadAppenders(this, 'simple-js-program.json.gz');
    // This includes all tracks rendered by the ThreadAppender.
    assert.strictEqual(entryTypeByLevel.length, 12);
    assert.isTrue(
        entryTypeByLevel.every(type => type === Timeline.TimelineFlameChartDataProvider.EntryType.TrackAppender));
  });

  it('creates a flamechart groups for track headers and titles', async function() {
    const {flameChartData} = await renderThreadAppenders(this, 'cls-single-frame.json.gz');
    assert.strictEqual(flameChartData.groups.length, 7);
    assert.strictEqual(flameChartData.groups[0].name, '[RPP] Main — https://output.jsbin.com/zajamil/quiet');
    assert.strictEqual(flameChartData.groups[1].name, '[RPP] Raster');
    assert.strictEqual(flameChartData.groups[2].name, '[RPP] Rasterizer Thread 1');
    assert.strictEqual(flameChartData.groups[3].name, '[RPP] Rasterizer Thread 2');
    assert.strictEqual(flameChartData.groups[4].name, '[RPP] Chrome_ChildIOThread');
    assert.strictEqual(flameChartData.groups[5].name, '[RPP] Compositor');
    assert.strictEqual(flameChartData.groups[6].name, '[RPP] ThreadPoolServiceThread');
  });

  it('builds flamechart groups for nested tracks correctly', async function() {
    const {flameChartData} = await renderThreadAppenders(this, 'cls-single-frame.json.gz');
    // This group corresponds to the header that wraps the raster tracks
    // together. It isn't selectable and isn't nested
    assert.strictEqual(flameChartData.groups[1].name, '[RPP] Raster');
    assert.strictEqual(flameChartData.groups[1].selectable, false);
    assert.strictEqual(flameChartData.groups[1].style.nestingLevel, 0);

    // These groups correspond to the raster tracks titles, or the
    // individual raster tracks themselves. They are selectable and
    // nested
    assert.strictEqual(flameChartData.groups[2].name, '[RPP] Rasterizer Thread 1');
    assert.strictEqual(flameChartData.groups[2].selectable, true);
    assert.strictEqual(flameChartData.groups[2].style.nestingLevel, 1);

    assert.strictEqual(flameChartData.groups[3].name, '[RPP] Rasterizer Thread 2');
    assert.strictEqual(flameChartData.groups[3].selectable, true);
    assert.strictEqual(flameChartData.groups[3].style.nestingLevel, 1);
  });

  it('assigns correct names to multiple types of threads', async function() {
    const {flameChartData} = await renderThreadAppenders(this, 'simple-js-program.json.gz');
    assert.strictEqual(flameChartData.groups[0].name, '[RPP] Main — https://www.google.com');
    assert.strictEqual(flameChartData.groups[1].name, '[RPP] Compositor');
    assert.strictEqual(flameChartData.groups[2].name, '[RPP] Chrome_ChildIOThread');
    assert.strictEqual(flameChartData.groups[3].name, '[RPP] ThreadPoolForegroundWorker');
    assert.strictEqual(flameChartData.groups[4].name, '[RPP] ThreadPoolServiceThread');
  });

  it('assigns correct names to worker threads', async function() {
    const {flameChartData} = await renderThreadAppenders(this, 'two-workers.json.gz');
    assert.strictEqual(flameChartData.groups.length, 7);
    assert.strictEqual(
        flameChartData.groups[0].name,
        '[RPP] Main — https://chromedevtools.github.io/performance-stories/two-workers/index.html');
    assert.strictEqual(
        flameChartData.groups[1].name,
        '[RPP] Worker — https://chromedevtools.github.io/performance-stories/two-workers/fib-worker.js');
    assert.strictEqual(
        flameChartData.groups[2].name,
        '[RPP] Worker — https://chromedevtools.github.io/performance-stories/two-workers/fib-worker.js');
    assert.strictEqual(flameChartData.groups[3].name, '[RPP] Compositor');
  });

  it('returns the correct title for a renderer event', async function() {
    const {threadAppenders, traceParsedData} = await renderThreadAppenders(this, 'simple-js-program.json.gz');
    const events = traceParsedData.Renderer?.allRendererEvents;
    if (!events) {
      throw new Error('Could not find renderer events');
    }
    const title = threadAppenders[0].titleForEvent(events[0]);
    assert.strictEqual(title, 'Task');
  });

  it('returns the correct title for a profile call', async function() {
    const {threadAppenders, traceParsedData} = await renderThreadAppenders(this, 'simple-js-program.json.gz');
    const rendererHandler = traceParsedData.Renderer;
    if (!rendererHandler) {
      throw new Error('RendererHandler is undefined');
    }
    const [process] = rendererHandler.processes.values();
    const [thread] = process.threads.values();
    const profileCalls = thread.entries.filter(entry => TraceModel.Types.TraceEvents.isProfileCall(entry));

    if (!profileCalls) {
      throw new Error('Could not find renderer events');
    }
    const anonymousCall = threadAppenders[0].titleForEvent(profileCalls[0]);
    assert.strictEqual(anonymousCall, '(anonymous)');
    const n = threadAppenders[0].titleForEvent(profileCalls[7]);
    assert.strictEqual(n, 'n');
  });

  it('shows the correct title for a trace event when hovered', async function() {
    const {threadAppenders, traceParsedData} = await renderThreadAppenders(this, 'simple-js-program.json.gz');
    const events = traceParsedData.Renderer?.allRendererEvents;
    if (!events) {
      throw new Error('Could not find renderer events');
    }
    const info = threadAppenders[0].highlightedEntryInfo(events[0]);
    assert.strictEqual(info.title, 'Task');
    assert.strictEqual(info.formattedTime, '0.27\u00A0ms');
  });

  it('shows the correct warning for a long task when hovered', async function() {
    const {threadAppenders, traceParsedData} = await renderThreadAppenders(this, 'simple-js-program.json.gz');
    const events = traceParsedData.Renderer?.allRendererEvents;
    if (!events) {
      throw new Error('Could not find renderer events');
    }
    const longTask = events.find(e => (e.dur || 0) > 1_000_000);
    if (!longTask) {
      throw new Error('Could not find long task');
    }
    const info = threadAppenders[0].highlightedEntryInfo(longTask);
    assert.strictEqual(info.warningElements?.length, 1);
    const warning = info.warningElements?.[0];
    if (!(warning instanceof HTMLSpanElement)) {
      throw new Error('Found unexpected warning');
    }
    assert.strictEqual(warning?.innerText, 'Long task took 1.30\u00A0s.');
  });

  it('shows the correct warning for a force recalc styles when hovered', async function() {
    const {threadAppenders, traceParsedData} = await renderThreadAppenders(this, 'large-recalc-style.json.gz');
    const events = traceParsedData.Renderer?.allRendererEvents;
    if (!events) {
      throw new Error('Could not find renderer events');
    }
    const recalcStyles = events.find(event => {
      return (event.name === TraceModel.Types.TraceEvents.KnownEventName.RecalculateStyles ||
              event.name === TraceModel.Types.TraceEvents.KnownEventName.UpdateLayoutTree) &&
          (event.dur && event.dur >= TraceModel.Handlers.ModelHandlers.Warnings.FORCED_LAYOUT_AND_STYLES_THRESHOLD);
    });
    if (!recalcStyles) {
      throw new Error('Could not find styles recalc');
    }
    const info = threadAppenders[0].highlightedEntryInfo(recalcStyles);
    assert.strictEqual(info.warningElements?.length, 1);
    const warning = info.warningElements?.[0];
    if (!(warning instanceof HTMLSpanElement)) {
      throw new Error('Found unexpected warning');
    }
    assert.strictEqual(warning?.innerText, 'Forced reflow is a likely performance bottleneck.');
  });

  it('shows the correct warning for a force layout when hovered', async function() {
    const {threadAppenders, traceParsedData} = await renderThreadAppenders(this, 'large-recalc-style.json.gz');
    const events = traceParsedData.Renderer?.allRendererEvents;
    if (!events) {
      throw new Error('Could not find renderer events');
    }
    const layout = events.find(event => {
      return event.name === TraceModel.Types.TraceEvents.KnownEventName.Layout && event.dur &&
          event.dur >= TraceModel.Handlers.ModelHandlers.Warnings.FORCED_LAYOUT_AND_STYLES_THRESHOLD;
    });
    if (!layout) {
      throw new Error('Could not find layout');
    }
    const info = threadAppenders[0].highlightedEntryInfo(layout);
    assert.strictEqual(info.warningElements?.length, 1);
    const warning = info.warningElements?.[0];
    if (!(warning instanceof HTMLSpanElement)) {
      throw new Error('Found unexpected warning');
    }
    assert.strictEqual(warning?.innerText, 'Forced reflow is a likely performance bottleneck.');
  });

  it('shows the correct warning for slow idle callbacks', async function() {
    const {threadAppenders, traceParsedData} = await renderThreadAppenders(this, 'idle-callback.json.gz');
    const events = traceParsedData.Renderer?.allRendererEvents;
    if (!events) {
      throw new Error('Could not find renderer events');
    }
    const idleCallback = events.find(event => {
      const {duration} = TraceModel.Helpers.Timing.eventTimingsMilliSeconds(event);
      if (!TraceModel.Types.TraceEvents.isTraceEventFireIdleCallback(event)) {
        return false;
      }
      if (duration <= event.args.data.allottedMilliseconds) {
        false;
      }
      return true;
    });
    if (!idleCallback) {
      throw new Error('Could not find idle callback');
    }
    const info = threadAppenders[0].highlightedEntryInfo(idleCallback);
    assert.strictEqual(info.warningElements?.length, 1);
    const warning = info.warningElements?.[0];
    if (!(warning instanceof HTMLSpanElement)) {
      throw new Error('Found unexpected warning');
    }
    assert.strictEqual(warning?.innerText, 'Idle callback execution extended beyond deadline by 79.56\u00A0ms');
  });

  it('shows self time only for events with self time above the threshold when hovered', async function() {
    const {threadAppenders, traceParsedData} = await renderThreadAppenders(this, 'simple-js-program.json.gz');
    const events = traceParsedData.Renderer?.allRendererEvents;
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
    const {threadAppenders, traceParsedData} = await renderThreadAppenders(this, 'simple-js-program.json.gz');
    const events = traceParsedData.Renderer?.allRendererEvents;
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
    const {threadAppenders, traceParsedData} = await renderThreadAppenders(this, 'simple-js-program.json.gz');
    const rendererHandler = traceParsedData.Renderer;
    if (!rendererHandler) {
      throw new Error('RendererHandler is undefined');
    }
    const [process] = rendererHandler.processes.values();
    const [thread] = process.threads.values();
    const profileCalls = thread.entries.filter(entry => TraceModel.Types.TraceEvents.isProfileCall(entry));

    if (!profileCalls) {
      throw new Error('Could not find renderer events');
    }

    const info = threadAppenders[0].highlightedEntryInfo(profileCalls[0]);
    assert.strictEqual(info.title, '(anonymous)');
    assert.strictEqual(info.formattedTime, '15\u00A0μs');
  });
  it('candy-stripes long tasks', async function() {
    const {traceParsedData, flameChartData, entryData} = await renderThreadAppenders(this, 'simple-js-program.json.gz');
    const events = traceParsedData.Renderer?.allRendererEvents;
    if (!events) {
      throw new Error('Could not find renderer events');
    }
    const longTask = events.find(e => (e.dur || 0) > 1_000_000);
    if (!longTask) {
      throw new Error('Could not find long task');
    }
    const entryIndex = entryData.indexOf(longTask);
    const decorationsForEntry = flameChartData.entryDecorations[entryIndex];
    assert.deepEqual(decorationsForEntry, [{type: 'WARNING_TRIANGLE'}, {type: 'CANDY', 'startAtTime': 50_000}]);
  });

  it('does not candy-stripe tasks below the long task threshold', async function() {
    const {traceParsedData, flameChartData, entryData} = await renderThreadAppenders(this, 'simple-js-program.json.gz');
    const events = traceParsedData.Renderer?.allRendererEvents;
    if (!events) {
      throw new Error('Could not find renderer events');
    }
    const entryIndex = entryData.indexOf(events[0]);
    const decorationsForEntry = flameChartData.entryDecorations[entryIndex];
    assert.isUndefined(decorationsForEntry);
  });

});
