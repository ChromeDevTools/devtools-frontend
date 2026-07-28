// Copyright 2023 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import {assert} from 'chai';

import {describeWithEnvironment} from '../../../testing/EnvironmentHelpers.js';
import {TraceLoader} from '../../../testing/TraceLoader.js';
import * as Trace from '../trace.js';

describeWithEnvironment('Handler Threads helper', function() {
  it('returns all the threads for a trace that used tracing', async function() {
    const parsedTrace = await TraceLoader.traceEngine(this, 'web-dev.json.gz');
    const data = parsedTrace.data;

    const allThreads = Array.from(data.Renderer.processes.values()).flatMap(process => {
      return Array.from(process.threads.values());
    });

    const expectedThreadNamesAndTypes = [
      {name: 'CrRendererMain', type: Trace.Handlers.Threads.ThreadType.MAIN_THREAD},
      {name: 'Chrome_ChildIOThread', type: Trace.Handlers.Threads.ThreadType.OTHER},
      {name: 'Compositor', type: Trace.Handlers.Threads.ThreadType.OTHER},
      {name: 'ThreadPoolServiceThread', type: Trace.Handlers.Threads.ThreadType.THREAD_POOL},
      {name: 'Media', type: Trace.Handlers.Threads.ThreadType.OTHER},
      {name: 'ThreadPoolForegroundWorker', type: Trace.Handlers.Threads.ThreadType.THREAD_POOL},
      {name: 'CompositorTileWorker4', type: Trace.Handlers.Threads.ThreadType.RASTERIZER},
      {name: 'CompositorTileWorker2', type: Trace.Handlers.Threads.ThreadType.RASTERIZER},
      {name: 'CompositorTileWorker1', type: Trace.Handlers.Threads.ThreadType.RASTERIZER},
      {name: 'CompositorTileWorkerBackground', type: Trace.Handlers.Threads.ThreadType.RASTERIZER},
      {name: 'ThreadPoolForegroundWorker', type: Trace.Handlers.Threads.ThreadType.THREAD_POOL},
      {name: 'CompositorTileWorker3', type: Trace.Handlers.Threads.ThreadType.RASTERIZER},
    ];

    const threads = Trace.Handlers.Threads.threadsInTrace(data);
    assert.strictEqual(threads.length, allThreads.length);
    assert.deepEqual(threads.map(thread => ({name: thread.name, type: thread.type})), expectedThreadNamesAndTypes);
  });

  it('returns all the threads for a trace that used CPU profiling', async function() {
    // Bit of extra setup required: we need to mimic what the panel does where
    // it takes the CDP Profile and wraps it in fake trace events, before then
    // passing that through to the new engine.
    const profile = await TraceLoader.rawCPUProfile(this, 'node-fibonacci-website.cpuprofile.gz');
    const contents = Trace.Helpers.SamplesIntegrator.SamplesIntegrator.createFakeTraceFromCpuProfile(
        profile,
        Trace.Types.Events.ThreadID(1),
    );

    const {parsedTrace} = await TraceLoader.executeTraceEngineOnFileContents(contents);
    const data = parsedTrace.data;

    // Check that we did indeed parse this properly as a CPU Profile.
    assert.strictEqual(data.Renderer.processes.size, 0);
    assert.strictEqual(data.Samples.profilesInProcess.size, 1);

    const threads = Trace.Handlers.Threads.threadsInTrace(data);
    assert.lengthOf(threads, 1);

    assert.strictEqual(threads.at(0)?.type, Trace.Handlers.Threads.ThreadType.CPU_PROFILE);
    assert.strictEqual(threads.at(0)?.entries.length, 875);
  });

  it('includes threads that only contain CPU profile samples and no renderer trace events', async function() {
    const events: Trace.Types.Events.Event[] = [
      {
        cat: 'disabled-by-default-devtools.timeline',
        name: Trace.Types.Events.Name.TRACING_STARTED_IN_BROWSER,
        ph: Trace.Types.Events.Phase.INSTANT,
        pid: Trace.Types.Events.ProcessID(1),
        tid: Trace.Types.Events.ThreadID(1),
        ts: Trace.Types.Timing.Micro(100),
        args: {
          data: {
            frames: [
              {
                frame: 'frame1',
                url: 'http://example.com',
                processId: 1,
              },
            ],
          },
        },
      } as Trace.Types.Events.TracingStartedInBrowser,
      {
        cat: '__metadata',
        name: Trace.Types.Events.Name.THREAD_NAME,
        ph: Trace.Types.Events.Phase.METADATA,
        pid: Trace.Types.Events.ProcessID(1),
        tid: Trace.Types.Events.ThreadID(1),
        ts: Trace.Types.Timing.Micro(0),
        args: {name: 'CrRendererMain'},
      } as Trace.Types.Events.ThreadName,
      {
        cat: 'disabled-by-default-devtools.timeline',
        name: Trace.Types.Events.Name.RUN_TASK,
        ph: Trace.Types.Events.Phase.COMPLETE,
        pid: Trace.Types.Events.ProcessID(1),
        tid: Trace.Types.Events.ThreadID(1),
        ts: Trace.Types.Timing.Micro(100),
        dur: Trace.Types.Timing.Micro(500),
        args: {},
      } as Trace.Types.Events.RunTask,
      {
        cat: 'disabled-by-default-v8.cpu_profiler',
        name: Trace.Types.Events.Name.PROFILE,
        ph: Trace.Types.Events.Phase.SAMPLE,
        pid: Trace.Types.Events.ProcessID(1),
        tid: Trace.Types.Events.ThreadID(2),
        ts: Trace.Types.Timing.Micro(100),
        args: {
          data: {
            startTime: Trace.Types.Timing.Micro(100),
          },
        },
        id: Trace.Types.Events.ProfileID('0x1'),
      } as Trace.Types.Events.Profile,
      {
        cat: 'disabled-by-default-v8.cpu_profiler',
        name: Trace.Types.Events.Name.PROFILE_CHUNK,
        ph: Trace.Types.Events.Phase.SAMPLE,
        pid: Trace.Types.Events.ProcessID(1),
        tid: Trace.Types.Events.ThreadID(2),
        ts: Trace.Types.Timing.Micro(200),
        id: Trace.Types.Events.ProfileID('0x1'),
        args: {
          data: {
            cpuProfile: {
              nodes: [
                {
                  id: Trace.Types.Events.CallFrameID(1),
                  callFrame: {functionName: '(root)', scriptId: 0, columnNumber: 0, lineNumber: 0, url: ''},
                },
                {
                  id: Trace.Types.Events.CallFrameID(2),
                  callFrame: {functionName: 'wasmTask', scriptId: 1, columnNumber: 0, lineNumber: 0, url: 'test.wasm'},
                  parent: Trace.Types.Events.CallFrameID(1),
                },
              ],
              samples: [Trace.Types.Events.CallFrameID(2), Trace.Types.Events.CallFrameID(2)],
            },
            timeDeltas: [Trace.Types.Timing.Micro(100), Trace.Types.Timing.Micro(100)],
          },
        },
      } as Trace.Types.Events.ProfileChunk,
    ];

    const {parsedTrace} = await TraceLoader.executeTraceEngineOnFileContents(events);
    const threads = Trace.Handlers.Threads.threadsInTrace(parsedTrace.data);
    const sampleOnlyThread = threads.find(t => t.tid === Trace.Types.Events.ThreadID(2));
    assert.exists(sampleOnlyThread);
    assert.lengthOf(sampleOnlyThread.entries, 1);
    assert.strictEqual(sampleOnlyThread.entries[0].name, Trace.Types.Events.Name.PROFILE_CALL);
    assert.strictEqual((sampleOnlyThread.entries[0] as Trace.Types.Events.SyntheticProfileCall).callFrame.functionName,
                       'wasmTask');
    assert.strictEqual(sampleOnlyThread.tree.roots.size, 1);
  });
});
