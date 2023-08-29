// Copyright 2023 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.
const {assert} = chai;
import * as TraceEngine from '../../../../../../front_end/models/trace/trace.js';
import {TraceLoader} from '../../../helpers/TraceLoader.js';

describe('WorkersHandler', () => {
  beforeEach(async function() {
    TraceEngine.Handlers.ModelHandlers.Workers.reset();
    const events = await TraceLoader.rawEvents(this, 'two-workers.json.gz');
    TraceEngine.Handlers.ModelHandlers.Workers.initialize();
    for (const event of events) {
      TraceEngine.Handlers.ModelHandlers.Workers.handleEvent(event);
    }
    await TraceEngine.Handlers.ModelHandlers.Workers.finalize();
  });
  afterEach(() => {
    TraceEngine.Handlers.ModelHandlers.Workers.reset();
  });

  it('collects the worker session ID metadata events', async function() {
    const data = TraceEngine.Handlers.ModelHandlers.Workers.data();
    assert.deepEqual(data.workerSessionIdEvents, [
      {
        name: 'TracingSessionIdForWorker',
        cat: 'disabled-by-default-devtools.timeline',
        ph: TraceEngine.Types.TraceEvents.Phase.INSTANT,
        tid: TraceEngine.Types.TraceEvents.ThreadID(37651),
        pid: TraceEngine.Types.TraceEvents.ProcessID(71044),
        s: TraceEngine.Types.TraceEvents.TraceEventScope.THREAD,
        ts: TraceEngine.Types.Timing.MicroSeconds(107351291649),
        tts: TraceEngine.Types.Timing.MicroSeconds(934),
        args: {
          data: {
            frame: '372333E30ECABDA706136ED37FD9FA2B',
            url: 'https://chromedevtools.github.io/performance-stories/two-workers/fib-worker.js',
            workerId: TraceEngine.Types.TraceEvents.WorkerId('990A76F8BED5B771144F505FF9313D06'),
            workerThreadId: TraceEngine.Types.TraceEvents.ThreadID(37651),
          },
        },
      },
      {
        name: 'TracingSessionIdForWorker',
        cat: 'disabled-by-default-devtools.timeline',
        ph: TraceEngine.Types.TraceEvents.Phase.INSTANT,
        tid: TraceEngine.Types.TraceEvents.ThreadID(35351),
        pid: TraceEngine.Types.TraceEvents.ProcessID(71044),
        s: TraceEngine.Types.TraceEvents.TraceEventScope.THREAD,
        ts: TraceEngine.Types.Timing.MicroSeconds(107351292507),
        tts: TraceEngine.Types.Timing.MicroSeconds(817),
        args: {
          data: {
            frame: '372333E30ECABDA706136ED37FD9FA2B',
            url: 'https://chromedevtools.github.io/performance-stories/two-workers/fib-worker.js',
            workerId: TraceEngine.Types.TraceEvents.WorkerId('E59E70C44C7664657CE822BB7DC54085'),
            workerThreadId: TraceEngine.Types.TraceEvents.ThreadID(35351),
          },
        },
      },
    ]);
  });

  it('collects thread id for workers', async function() {
    const data = TraceEngine.Handlers.ModelHandlers.Workers.data();
    const [[thread1, worker1], [thread2, worker2]] = data.workerIdByThread.entries();
    assert.strictEqual(thread1, 37651);
    assert.strictEqual(worker1, '990A76F8BED5B771144F505FF9313D06');
    assert.strictEqual(thread2, 35351);
    assert.strictEqual(worker2, 'E59E70C44C7664657CE822BB7DC54085');
  });

  it('collects the url of workers', async function() {
    const data = TraceEngine.Handlers.ModelHandlers.Workers.data();
    const [[thread1, worker1], [thread2, worker2]] = data.workerURLById.entries();
    assert.strictEqual(thread1, '990A76F8BED5B771144F505FF9313D06');
    assert.strictEqual(worker1, 'https://chromedevtools.github.io/performance-stories/two-workers/fib-worker.js');
    assert.strictEqual(thread2, 'E59E70C44C7664657CE822BB7DC54085');
    assert.strictEqual(worker2, 'https://chromedevtools.github.io/performance-stories/two-workers/fib-worker.js');
  });
});
