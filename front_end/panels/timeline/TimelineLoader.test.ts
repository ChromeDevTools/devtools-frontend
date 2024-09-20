// Copyright 2023 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import type * as Protocol from '../../generated/protocol.js';
import type * as TimelineModel from '../../models/timeline_model/timeline_model.js';
import type * as Trace from '../../models/trace/trace.js';
import {describeWithEnvironment} from '../../testing/EnvironmentHelpers.js';
import {makeInstantEvent} from '../../testing/TraceHelpers.js';

import * as Timeline from './timeline.js';

async function loadWebDevTraceAsFile(): Promise<File> {
  const file = new URL('./fixtures/traces/web-dev.json.gz', import.meta.url);
  const response = await fetch(file);
  const asBlob = await response.blob();
  const asFile = new File([asBlob], 'web-dev.json.gz', {
    type: 'application/gzip',
  });
  return asFile;
}

async function loadBasicCpuProfileAsFile(): Promise<File> {
  const file = new URL('./fixtures/traces/node-fibonacci-website.cpuprofile.gz', import.meta.url);
  const response = await fetch(file);
  const asBlob = await response.blob();
  const asFile = new File([asBlob], 'node-fibonacci-website.cpuprofile.gz', {
    type: 'application/gzip',
  });
  return asFile;
}

describeWithEnvironment('TimelineLoader', () => {
  const loadingStartedSpy = sinon.spy();
  const loadingProgressSpy = sinon.spy();
  const processingStartedSpy = sinon.spy();
  const loadingCompleteSpy = sinon.spy();
  const recordingProgressSpy = sinon.spy();
  const loadingCompleteForTestSpy = sinon.spy();

  const client: Timeline.TimelineController.Client = {
    async loadingStarted() {
      loadingStartedSpy();
    },
    async loadingProgress(progress?: number) {
      loadingProgressSpy(progress);
    },
    async processingStarted() {
      processingStartedSpy();
    },
    async loadingComplete(
        collectedEvents: Trace.Types.Events.Event[],
        exclusiveFilter: TimelineModel.TimelineModelFilter.TimelineModelFilter|null,
        isCpuProfile: boolean,
    ) {
      loadingCompleteSpy(collectedEvents, exclusiveFilter, isCpuProfile);
    },
    recordingProgress: function(usage: number): void {
      recordingProgressSpy(usage);
    },
    loadingCompleteForTest: function(): void {
      loadingCompleteForTestSpy();
    },
  };

  beforeEach(() => {
    loadingStartedSpy.resetHistory();
    loadingProgressSpy.resetHistory();
    processingStartedSpy.resetHistory();
    loadingCompleteSpy.resetHistory();
    recordingProgressSpy.resetHistory();
    loadingCompleteForTestSpy.resetHistory();
  });

  it('can load a saved trace file', async () => {
    const file = await loadWebDevTraceAsFile();
    const loader = await Timeline.TimelineLoader.TimelineLoader.loadFromFile(file, client);
    await loader.traceFinalizedForTest();
    assert.isTrue(loadingStartedSpy.calledOnce);
    // Exact number is deterministic so we can assert, but the fact it was 29
    // calls doesn't really matter. We just want to check it got called "a
    // bunch of times".
    assert.strictEqual(loadingProgressSpy.callCount, 29);
    assert.isTrue(processingStartedSpy.calledOnce);
    assert.isTrue(loadingCompleteSpy.calledOnce);

    // Get the arguments of the first (and only) call to the loadingComplete
    // function. TS doesn't know what the types are (they are [any, any] by
    // default), so we tell it that they align with the types of the
    // loadingComplete parameters.
    const [collectedEvents, exclusiveFilter, isCpuProfile] =
        loadingCompleteSpy.args[0] as Parameters<Timeline.TimelineController.Client['loadingComplete']>;
    assert.isNull(exclusiveFilter);  // We are not filtering out any events for this trace.
    // Ensure that we loaded something that looks about right!
    assert.lengthOf(collectedEvents, 8252);
    assert.isFalse(isCpuProfile);
  });

  it('can load a saved CPUProfile file', async () => {
    const file = await loadBasicCpuProfileAsFile();
    const loader = await Timeline.TimelineLoader.TimelineLoader.loadFromFile(file, client);
    await loader.traceFinalizedForTest();
    assert.isTrue(loadingStartedSpy.calledOnce);
    // For the CPU Profile we are testing, loadingProgress will be called three times, because the
    // file is not that big.
    assert.strictEqual(loadingProgressSpy.callCount, 3);
    assert.isTrue(processingStartedSpy.calledOnce);
    assert.isTrue(loadingCompleteSpy.calledOnce);

    // Get the arguments of the first (and only) call to the loadingComplete
    // function. TS doesn't know what the types are (they are [any, any] by
    // default), so we tell it that they align with the types of the
    // loadingComplete parameters.
    const [collectedEvents, /* exclusiveFilter */, isCpuProfile] =
        loadingCompleteSpy.args[0] as Parameters<Timeline.TimelineController.Client['loadingComplete']>;
    // We create fake trace event for CPU profile, includes one for
    // TracingStartedInPage, one for metadata, one for root, and one for CPU
    // profile
    assert.lengthOf(collectedEvents, 4);
    assert.isTrue(isCpuProfile);
  });

  it('can load recorded trace events correctly', async () => {
    const testTraceEvents: Trace.Types.Events.Event[] = [
      makeInstantEvent('test-event-1', 1),
      makeInstantEvent('test-event-2', 2),
    ];
    const loader = Timeline.TimelineLoader.TimelineLoader.loadFromEvents(testTraceEvents, client);
    await loader.traceFinalizedForTest();
    assert.isTrue(loadingStartedSpy.calledOnce);
    // For the trace events we are testing, loadingProgress will be called only once, because the
    // fake trace events array is very short.
    assert.isTrue(loadingProgressSpy.calledOnce);
    assert.isTrue(processingStartedSpy.calledOnce);
    assert.isTrue(loadingCompleteSpy.calledOnce);

    // Get the arguments of the first (and only) call to the loadingComplete
    // function. TS doesn't know what the types are (they are [any, any] by
    // default), so we tell it that they align with the types of the
    // loadingComplete parameters.
    const [collectedEvents, exclusiveFilter, isCpuProfile] =
        loadingCompleteSpy.args[0] as Parameters<Timeline.TimelineController.Client['loadingComplete']>;
    assert.isNull(exclusiveFilter);
    // Ensure that we loaded something that looks about right!
    assert.lengthOf(collectedEvents, testTraceEvents.length);
    assert.isFalse(isCpuProfile);
  });

  it('can load recorded CPUProfile correctly', async () => {
    const testProfile: Protocol.Profiler.Profile = {nodes: [], startTime: 0, endTime: 0};
    const loader = Timeline.TimelineLoader.TimelineLoader.loadFromCpuProfile(testProfile, client);
    await loader.traceFinalizedForTest();
    assert.isTrue(loadingStartedSpy.calledOnce);
    // For the CPU Profile we are testing, loadingProgress will be called only once, because the
    // fake Profile is basically empty.
    assert.strictEqual(loadingProgressSpy.callCount, 1);
    assert.isTrue(processingStartedSpy.calledOnce);
    assert.isTrue(loadingCompleteSpy.calledOnce);

    // Get the arguments of the first (and only) call to the loadingComplete
    // function. TS doesn't know what the types are (they are [any, any] by
    // default), so we tell it that they align with the types of the
    // loadingComplete parameters.
    const [collectedEvents, /* exclusiveFilter */, isCpuProfile] =
        loadingCompleteSpy.args[0] as Parameters<Timeline.TimelineController.Client['loadingComplete']>;
    // We create fake trace event for CPU profile, includes one for TracingStartedInPage,
    // one for metadata, one for root, and one for CPU profile
    assert.lengthOf(collectedEvents, 4);
    assert.isTrue(isCpuProfile);
  });
});
