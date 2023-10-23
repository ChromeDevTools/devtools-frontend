// Copyright 2023 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

const {assert} = chai;
import * as TraceEngine from '../../../../../../front_end/models/trace/trace.js';
import * as TimelineModel from '../../../../../../front_end/models/timeline_model/timeline_model.js';
import {TraceLoader} from '../../../helpers/TraceLoader.js';
import {describeWithEnvironment} from '../../../helpers/EnvironmentHelpers.js';

describeWithEnvironment('Handler Threads helper', function() {
  it('returns all the threads for a trace that used tracing', async function() {
    const traceData = await TraceLoader.traceEngine(this, 'web-dev.json.gz');

    const allThreads = Array.from(traceData.Renderer.processes.values()).flatMap(process => {
      return Array.from(process.threads.values());
    });

    const expectedThreadNamesAndTypes = [
      {name: 'CrRendererMain', type: TraceEngine.Handlers.Threads.ThreadType.MAIN_THREAD},
      {name: 'Chrome_ChildIOThread', type: TraceEngine.Handlers.Threads.ThreadType.OTHER},
      {name: 'Compositor', type: TraceEngine.Handlers.Threads.ThreadType.OTHER},
      {name: 'ThreadPoolServiceThread', type: TraceEngine.Handlers.Threads.ThreadType.OTHER},
      {name: 'Media', type: TraceEngine.Handlers.Threads.ThreadType.OTHER},
      {name: 'ThreadPoolForegroundWorker', type: TraceEngine.Handlers.Threads.ThreadType.OTHER},
      {name: 'CompositorTileWorker4', type: TraceEngine.Handlers.Threads.ThreadType.RASTERIZER},
      {name: 'CompositorTileWorker2', type: TraceEngine.Handlers.Threads.ThreadType.RASTERIZER},
      {name: 'CompositorTileWorker1', type: TraceEngine.Handlers.Threads.ThreadType.RASTERIZER},
      {name: 'CompositorTileWorkerBackground', type: TraceEngine.Handlers.Threads.ThreadType.RASTERIZER},
      {name: 'ThreadPoolForegroundWorker', type: TraceEngine.Handlers.Threads.ThreadType.OTHER},
      {name: 'CompositorTileWorker3', type: TraceEngine.Handlers.Threads.ThreadType.RASTERIZER},
    ];

    const threads = TraceEngine.Handlers.Threads.threadsInTrace(traceData);
    assert.strictEqual(threads.length, allThreads.length);
    assert.deepEqual(threads.map(thread => ({name: thread.name, type: thread.type})), expectedThreadNamesAndTypes);
  });

  it('returns all the threads for a trace that used CPU profiling', async function() {
    // Bit of extra setup required: we need to mimic what the panel does where
    // it takes the CDP Profile and wraps it in fake trace events, before then
    // passing that through to the new engine.
    const rawEvents = await TraceLoader.rawCPUProfile(this, 'node-fibonacci-website.cpuprofile.gz');
    const events = TimelineModel.TimelineJSProfile.TimelineJSProfileProcessor.createFakeTraceFromCpuProfile(
        rawEvents,
        1,
        true,
    );
    const {traceParsedData} = await TraceLoader.executeTraceEngineOnFileContents(
        events as unknown as TraceEngine.Types.TraceEvents.TraceEventData[]);

    // Check that we did indeed parse this properly as a CPU Profile.
    assert.strictEqual(traceParsedData.Renderer.processes.size, 0);
    assert.strictEqual(traceParsedData.Samples.profilesInProcess.size, 1);

    const threads = TraceEngine.Handlers.Threads.threadsInTrace(traceParsedData);
    assert.strictEqual(threads.length, 1);

    assert.strictEqual(threads.at(0)?.type, TraceEngine.Handlers.Threads.ThreadType.CPU_PROFILE);
    assert.strictEqual(threads.at(0)?.entries.length, 875);
  });
});
