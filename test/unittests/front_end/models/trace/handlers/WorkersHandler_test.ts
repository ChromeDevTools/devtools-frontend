// Copyright 2023 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.
const {assert} = chai;
import * as TraceEngine from '../../../../../../front_end/models/trace/trace.js';
import {TraceLoader} from '../../../helpers/TraceLoader.js';

describe('WorkersHandler', () => {
  beforeEach(() => {
    TraceEngine.Handlers.ModelHandlers.Workers.reset();
  });

  it('collects the worker session ID metadata events', async function() {
    const events = await TraceLoader.rawEvents(this, 'two-workers.json.gz');
    for (const event of events) {
      TraceEngine.Handlers.ModelHandlers.Workers.handleEvent(event);
    }
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
            workerId: '990A76F8BED5B771144F505FF9313D06',
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
            workerId: 'E59E70C44C7664657CE822BB7DC54085',
            workerThreadId: TraceEngine.Types.TraceEvents.ThreadID(35351),
          },
        },
      },
    ]);
  });
});
