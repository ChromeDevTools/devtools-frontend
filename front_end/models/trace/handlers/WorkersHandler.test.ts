// Copyright 2023 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import {TraceLoader} from '../../../testing/TraceLoader.js';
import * as Trace from '../trace.js';

describe('WorkersHandler', () => {
  beforeEach(async function() {
    Trace.Handlers.ModelHandlers.Workers.reset();
    const events = await TraceLoader.rawEvents(this, 'two-workers.json.gz');
    for (const event of events) {
      Trace.Handlers.ModelHandlers.Workers.handleEvent(event);
    }
    await Trace.Handlers.ModelHandlers.Workers.finalize();
  });
  afterEach(() => {
    Trace.Handlers.ModelHandlers.Workers.reset();
  });

  it('collects the worker session ID metadata events', async function() {
    const data = Trace.Handlers.ModelHandlers.Workers.data();
    assert.deepEqual(data.workerSessionIdEvents, [
      {
        name: 'TracingSessionIdForWorker',
        cat: 'disabled-by-default-devtools.timeline',
        ph: Trace.Types.Events.Phase.INSTANT,
        tid: Trace.Types.Events.ThreadID(37651),
        pid: Trace.Types.Events.ProcessID(71044),
        s: Trace.Types.Events.Scope.THREAD,
        ts: Trace.Types.Timing.MicroSeconds(107351291649),
        tts: Trace.Types.Timing.MicroSeconds(934),
        args: {
          data: {
            frame: '372333E30ECABDA706136ED37FD9FA2B',
            url: 'https://chromedevtools.github.io/performance-stories/two-workers/fib-worker.js',
            workerId: Trace.Types.Events.WorkerId('990A76F8BED5B771144F505FF9313D06'),
            workerThreadId: Trace.Types.Events.ThreadID(37651),
          },
        },
      },
      {
        name: 'TracingSessionIdForWorker',
        cat: 'disabled-by-default-devtools.timeline',
        ph: Trace.Types.Events.Phase.INSTANT,
        tid: Trace.Types.Events.ThreadID(35351),
        pid: Trace.Types.Events.ProcessID(71044),
        s: Trace.Types.Events.Scope.THREAD,
        ts: Trace.Types.Timing.MicroSeconds(107351292507),
        tts: Trace.Types.Timing.MicroSeconds(817),
        args: {
          data: {
            frame: '372333E30ECABDA706136ED37FD9FA2B',
            url: 'https://chromedevtools.github.io/performance-stories/two-workers/fib-worker.js',
            workerId: Trace.Types.Events.WorkerId('E59E70C44C7664657CE822BB7DC54085'),
            workerThreadId: Trace.Types.Events.ThreadID(35351),
          },
        },
      },
    ]);
  });

  it('collects thread id for workers', async function() {
    const data = Trace.Handlers.ModelHandlers.Workers.data();
    const [[thread1, worker1], [thread2, worker2]] = data.workerIdByThread.entries();
    assert.strictEqual(thread1, 37651);
    assert.strictEqual(worker1, '990A76F8BED5B771144F505FF9313D06');
    assert.strictEqual(thread2, 35351);
    assert.strictEqual(worker2, 'E59E70C44C7664657CE822BB7DC54085');
  });

  it('collects the url of workers', async function() {
    const data = Trace.Handlers.ModelHandlers.Workers.data();
    const [[thread1, worker1], [thread2, worker2]] = data.workerURLById.entries();
    assert.strictEqual(thread1, '990A76F8BED5B771144F505FF9313D06');
    assert.strictEqual(worker1, 'https://chromedevtools.github.io/performance-stories/two-workers/fib-worker.js');
    assert.strictEqual(thread2, 'E59E70C44C7664657CE822BB7DC54085');
    assert.strictEqual(worker2, 'https://chromedevtools.github.io/performance-stories/two-workers/fib-worker.js');
  });
});
