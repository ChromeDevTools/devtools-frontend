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
  async function renderTrackAppender(context: Mocha.Context|Mocha.Suite, trace: string): Promise<{
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
    const {threadAppenders} = await renderTrackAppender(this, 'simple-js-program.json.gz');
    assert.strictEqual(threadAppenders.length, 5);
  });

  it('renders tracks for threads in correct order', async function() {
    const {flameChartData} = await renderTrackAppender(this, 'multiple-navigations-with-iframes.json.gz');
    assert.strictEqual(flameChartData.groups[0].name, '[RPP] Main — http://localhost:5000/');
    assert.strictEqual(flameChartData.groups[1].name, '[RPP] Frame — https://www.example.com/');
  });

  it('marks all levels used by the track with the TrackAppender type', async function() {
    const {entryTypeByLevel} = await renderTrackAppender(this, 'simple-js-program.json.gz');
    // This includes all tracks rendered by the ThreadAppender.
    assert.strictEqual(entryTypeByLevel.length, 12);
    assert.isTrue(
        entryTypeByLevel.every(type => type === Timeline.TimelineFlameChartDataProvider.EntryType.TrackAppender));
  });

  it('creates a flamechart group for each thread', async function() {
    const {flameChartData} = await renderTrackAppender(this, 'cls-single-frame.json.gz');
    assert.strictEqual(flameChartData.groups.length, 6);
    assert.strictEqual(flameChartData.groups[0].name, '[RPP] Main — https://output.jsbin.com/zajamil/quiet');
  });

  it('assigns correct names to multiple types of threads', async function() {
    const {flameChartData} = await renderTrackAppender(this, 'simple-js-program.json.gz');
    assert.strictEqual(flameChartData.groups.length, 5);
    assert.strictEqual(flameChartData.groups[0].name, '[RPP] Main — https://www.google.com');
    assert.strictEqual(flameChartData.groups[1].name, '[RPP] Compositor');
    assert.strictEqual(flameChartData.groups[2].name, '[RPP] Chrome_ChildIOThread');
    assert.strictEqual(flameChartData.groups[3].name, '[RPP] ThreadPoolForegroundWorker');
    assert.strictEqual(flameChartData.groups[4].name, '[RPP] ThreadPoolServiceThread');
  });

  it('returns the correct title for a renderer event', async function() {
    const {threadAppenders, traceParsedData} = await renderTrackAppender(this, 'simple-js-program.json.gz');
    const events = traceParsedData.Renderer?.allRendererEvents;
    if (!events) {
      throw new Error('Could not find renderer events');
    }
    const title = threadAppenders[0].titleForEvent(events[0]);
    assert.strictEqual(title, 'Task');
  });

  it('returns the correct title for a profile call', async function() {
    const {threadAppenders, traceParsedData} = await renderTrackAppender(this, 'simple-js-program.json.gz');
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
    const {threadAppenders, traceParsedData} = await renderTrackAppender(this, 'simple-js-program.json.gz');
    const events = traceParsedData.Renderer?.allRendererEvents;
    if (!events) {
      throw new Error('Could not find renderer events');
    }
    const info = threadAppenders[0].highlightedEntryInfo(events[0]);
    assert.deepEqual(info, {
      title: 'Task',
      formattedTime: '0.27\u00A0ms',
    });
  });

  it('shows the correct title for a profile call when hovered', async function() {
    const {threadAppenders, traceParsedData} = await renderTrackAppender(this, 'simple-js-program.json.gz');
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
    assert.deepEqual(info, {
      title: '(anonymous)',
      formattedTime: '15\u00A0μs',
    });
  });
});
