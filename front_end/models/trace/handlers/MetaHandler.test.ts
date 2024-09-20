// Copyright 2022 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import {defaultTraceEvent} from '../../../testing/TraceHelpers.js';
import {TraceLoader} from '../../../testing/TraceLoader.js';
import * as Trace from '../trace.js';

describe('MetaHandler', function() {
  let baseEvents: Trace.Types.Events.Event[];
  beforeEach(async function() {
    let defaultTraceEvents: readonly Trace.Types.Events.Event[];
    try {
      defaultTraceEvents = await TraceLoader.rawEvents(this, 'basic.json.gz');
    } catch (error) {
      assert.fail(error);
      return;
    }

    baseEvents = [
      ...defaultTraceEvents,
      {
        ...defaultTraceEvent,
        args: {
          data: {
            isLoadingMainFrame: true,
            isOutermostMainFrame: true,
            documentLoaderURL: 'test1',
            navigationId: 'navigation-1',
          },
          frame: '3E1717BE677B75D0536E292E00D6A34A',
        },
        pid: Trace.Types.Events.ProcessID(23456),
        tid: Trace.Types.Events.ThreadID(775),
        ts: Trace.Types.Timing.MicroSeconds(100),
        name: 'navigationStart',
      } as Trace.Types.Events.NavigationStart,
      {
        ...defaultTraceEvent,
        // Should be ignored based on empty documentLoaderURL
        args: {
          data: {
            isLoadingMainFrame: true,
            isOutermostMainFrame: true,
            documentLoaderURL: '',
            navigationId: 'navigation-2',
          },
        },
        pid: Trace.Types.Events.ProcessID(23456),
        tid: Trace.Types.Events.ThreadID(775),
        ts: Trace.Types.Timing.MicroSeconds(800),
        name: 'navigationStart',
      } as Trace.Types.Events.NavigationStart,
      {
        ...defaultTraceEvent,
        args: {
          data: {
            isLoadingMainFrame: true,
            isOutermostMainFrame: true,
            documentLoaderURL: 'test3',
            navigationId: 'navigation-3',
          },
        },
        pid: Trace.Types.Events.ProcessID(23456),
        tid: Trace.Types.Events.ThreadID(775),
        ts: Trace.Types.Timing.MicroSeconds(1000),
        name: 'navigationStart',
      } as Trace.Types.Events.NavigationStart,
    ];

    Trace.Handlers.ModelHandlers.Meta.reset();
    Trace.Handlers.ModelHandlers.Meta.initialize();
  });

  describe('error handling', function() {
    it('throws if data is called before finalize', function() {
      for (const event of baseEvents) {
        Trace.Handlers.ModelHandlers.Meta.handleEvent(event);
      }

      assert.throws(() => {
        Trace.Handlers.ModelHandlers.Meta.data();
      }, 'Handler is not finalized');
    });

    it('throws if initialize is called without a reset', function() {
      // Due to the beforeEach the handler is already initialized, so calling
      // it a second time should throw an error.
      assert.throws(() => {
        Trace.Handlers.ModelHandlers.Meta.initialize();
      }, 'Handler was not reset');
    });
  });

  describe('browser process ID', function() {
    it('obtains the PID if present', async () => {
      for (const event of baseEvents) {
        Trace.Handlers.ModelHandlers.Meta.handleEvent(event);
      }

      await Trace.Handlers.ModelHandlers.Meta.finalize();
      const data = Trace.Handlers.ModelHandlers.Meta.data();
      assert.strictEqual(data.browserProcessId, Trace.Types.Events.ProcessID(8017));
    });
  });

  describe('browser thread ID', function() {
    it('obtains the TID if present', async () => {
      for (const event of baseEvents) {
        Trace.Handlers.ModelHandlers.Meta.handleEvent(event);
      }

      await Trace.Handlers.ModelHandlers.Meta.finalize();
      const data = Trace.Handlers.ModelHandlers.Meta.data();
      assert.strictEqual(data.browserThreadId, Trace.Types.Events.ThreadID(775));
    });
  });

  describe('renderer process ID', function() {
    it('obtains the PID if present', async () => {
      for (const event of baseEvents) {
        Trace.Handlers.ModelHandlers.Meta.handleEvent(event);
      }

      await Trace.Handlers.ModelHandlers.Meta.finalize();
      const data = Trace.Handlers.ModelHandlers.Meta.data();
      assert.strictEqual(data.topLevelRendererIds.size, 1);
      assert.deepStrictEqual([...data.topLevelRendererIds], [Trace.Types.Events.ProcessID(8051)]);
    });
  });

  describe('navigations', function() {
    it('obtains them if present', async () => {
      for (const event of baseEvents) {
        Trace.Handlers.ModelHandlers.Meta.handleEvent(event);
      }

      await Trace.Handlers.ModelHandlers.Meta.finalize();
      const data = Trace.Handlers.ModelHandlers.Meta.data();
      // navigation-2 is discarded because it has no URL.
      // navigation-3 doesn't have a frame id so it is discarded as well.
      assert.strictEqual(data.navigationsByFrameId.size, 1);
      assert.strictEqual(data.navigationsByNavigationId.size, 1);

      const firstNavigation = data.navigationsByNavigationId.get('navigation-1');
      if (!firstNavigation?.args.data) {
        assert.fail('Navigation data was expected in trace events');
        return;
      }

      assert.strictEqual(firstNavigation.args.data.documentLoaderURL, 'test1');
    });

    it('provides a list of main frame only navigations', async function() {
      const events = await TraceLoader.rawEvents(this, 'multiple-navigations-with-iframes.json.gz');
      Trace.Handlers.ModelHandlers.Meta.reset();
      Trace.Handlers.ModelHandlers.Meta.initialize();
      for (const event of events) {
        Trace.Handlers.ModelHandlers.Meta.handleEvent(event);
      }

      await Trace.Handlers.ModelHandlers.Meta.finalize();
      const data = Trace.Handlers.ModelHandlers.Meta.data();
      const allNavigationsCount = data.navigationsByNavigationId.size;
      assert.isTrue(data.mainFrameNavigations.length < allNavigationsCount);
      assert.isTrue(data.mainFrameNavigations.every(event => {
        return event.args.frame === data.mainFrameId;
      }));
    });
  });

  describe('frames', function() {
    it('finds the main frame ID', async () => {
      for (const event of baseEvents) {
        Trace.Handlers.ModelHandlers.Meta.handleEvent(event);
      }

      await Trace.Handlers.ModelHandlers.Meta.finalize();
      const data = Trace.Handlers.ModelHandlers.Meta.data();
      assert.strictEqual(data.mainFrameId, '3E1717BE677B75D0536E292E00D6A34A');
    });

    it('finds the main frame ID for a trace that started with a page reload', async function() {
      const events = await TraceLoader.rawEvents(this, 'reload-and-trace-page.json.gz');
      Trace.Handlers.ModelHandlers.Meta.reset();
      Trace.Handlers.ModelHandlers.Meta.initialize();
      for (const event of events) {
        Trace.Handlers.ModelHandlers.Meta.handleEvent(event);
      }

      await Trace.Handlers.ModelHandlers.Meta.finalize();
      const data = Trace.Handlers.ModelHandlers.Meta.data();
      assert.strictEqual(data.mainFrameId, '1D148CB660D1F96ED70D78DC6A53267B');
    });
    it('tracks the frames for found processes', async function() {
      const events = await TraceLoader.rawEvents(this, 'reload-and-trace-page.json.gz');
      Trace.Handlers.ModelHandlers.Meta.reset();
      Trace.Handlers.ModelHandlers.Meta.initialize();
      for (const event of events) {
        Trace.Handlers.ModelHandlers.Meta.handleEvent(event);
      }

      await Trace.Handlers.ModelHandlers.Meta.finalize();
      const data = Trace.Handlers.ModelHandlers.Meta.data();
      assert.strictEqual(data.frameByProcessId.size, 1);
      const [[processId, framesInProcess]] = data.frameByProcessId.entries();
      assert.strictEqual(processId, 3581385);
      assert.strictEqual(framesInProcess.size, 1);
      const [{url}] = framesInProcess.values();
      assert.strictEqual(url, 'https://example.com/');
    });
  });

  describe('finding GPU thread and main frame', function() {
    it('finds the GPU process and GPU Thread', async function() {
      const events = await TraceLoader.rawEvents(this, 'threejs-gpu.json.gz');
      Trace.Handlers.ModelHandlers.Meta.reset();
      Trace.Handlers.ModelHandlers.Meta.initialize();
      for (const event of events) {
        Trace.Handlers.ModelHandlers.Meta.handleEvent(event);
      }
      await Trace.Handlers.ModelHandlers.Meta.finalize();
      const {gpuProcessId, gpuThreadId} = Trace.Handlers.ModelHandlers.Meta.data();
      assert.strictEqual(gpuProcessId, Trace.Types.Events.ProcessID(3581327));
      assert.strictEqual(gpuThreadId, Trace.Types.Events.ThreadID(3581327));
    });

    it('handles traces that do not have a GPU thread and returns undefined for the thread ID', async function() {
      const traceEventsWithNoGPUThread = await TraceLoader.rawEvents(this, 'forced-layouts-and-no-gpu.json.gz');
      for (const event of traceEventsWithNoGPUThread) {
        Trace.Handlers.ModelHandlers.Meta.handleEvent(event);
      }

      assert.doesNotThrow(async () => {
        await Trace.Handlers.ModelHandlers.Meta.finalize();
      });

      const data = Trace.Handlers.ModelHandlers.Meta.data();
      assert.isUndefined(data.gpuThreadId);
    });
  });

  it('obtains renderer process IDs when there are no navigations', async function() {
    let traceEvents: readonly Trace.Types.Events.Event[];
    try {
      traceEvents = await TraceLoader.rawEvents(this, 'threejs-gpu.json.gz');
    } catch (error) {
      assert.fail(error);
      return;
    }

    Trace.Handlers.ModelHandlers.Meta.reset();
    Trace.Handlers.ModelHandlers.Meta.initialize();
    for (const event of traceEvents) {
      Trace.Handlers.ModelHandlers.Meta.handleEvent(event);
    }
    await Trace.Handlers.ModelHandlers.Meta.finalize();

    const data = Trace.Handlers.ModelHandlers.Meta.data();
    assert.deepStrictEqual([...data.topLevelRendererIds], [3601132]);

    const rendererProcesses = data.rendererProcessesByFrame.get(data.mainFrameId);
    if (!rendererProcesses) {
      assert.fail('No renderer processes found');
      return;
    }
    assert.deepStrictEqual([...rendererProcesses?.keys()], [3601132]);
    const windowMinTime = 1143381875846;
    assert.deepStrictEqual(
        [...rendererProcesses?.values()], [[{
          frame: {
            frame: '1D148CB660D1F96ED70D78DC6A53267B',
            name: '',
            processId: 3601132,
            url: 'https://threejs.org/examples/',
          },
          window: {min: windowMinTime, max: data.traceBounds.max, range: data.traceBounds.max - windowMinTime},
        }]]);
  });

  it('handles multiple renderers from navigations', async function() {
    let traceEvents: readonly Trace.Types.Events.Event[];
    try {
      traceEvents = await TraceLoader.rawEvents(this, 'multiple-top-level-renderers.json.gz');
    } catch (error) {
      assert.fail(error);
      return;
    }

    Trace.Handlers.ModelHandlers.Meta.reset();
    Trace.Handlers.ModelHandlers.Meta.initialize();
    for (const event of traceEvents) {
      Trace.Handlers.ModelHandlers.Meta.handleEvent(event);
    }
    await Trace.Handlers.ModelHandlers.Meta.finalize();

    const data = Trace.Handlers.ModelHandlers.Meta.data();
    assert.deepStrictEqual([...data.topLevelRendererIds], [78450, 78473, 79194]);

    const rendererProcesses = data.rendererProcessesByFrame.get(data.mainFrameId);
    if (!rendererProcesses) {
      assert.fail('No renderer processes found');
      return;
    }

    const windowMinTime = 3550807444741;
    assert.deepStrictEqual([...rendererProcesses?.keys()], [78450, 78473, 79194]);
    assert.deepStrictEqual([...rendererProcesses?.values()], [
      [{
        frame: {
          frame: 'E70A9327100EBD78F1C03582BBBE8E5F',
          name: '',
          processId: 78450,
          url: 'http://127.0.0.1:8081/',
        },
        window: {min: 3550803491779, max: 3550805534872, range: 2043093},
      }],
      [{
        frame: {
          frame: 'E70A9327100EBD78F1C03582BBBE8E5F',
          name: '',
          processId: 78473,
          url: 'http://localhost:8080/',
        },
        window: {min: 3550805534873, max: 3550807444740, range: 1909867},
      }],
      [{
        frame: {
          frame: 'E70A9327100EBD78F1C03582BBBE8E5F',
          name: '',
          processId: 79194,
          url: 'https://www.google.com/',
        },
        window: {min: windowMinTime, max: data.traceBounds.max, range: data.traceBounds.max - windowMinTime},
      }],
    ]);
  });
  it('handles multiple renderers from navigations where a process handled multiple URLs ', async function() {
    let traceEvents: readonly Trace.Types.Events.Event[];
    try {
      traceEvents = await TraceLoader.rawEvents(this, 'simple-js-program.json.gz');
    } catch (error) {
      assert.fail(error);
      return;
    }

    Trace.Handlers.ModelHandlers.Meta.reset();
    Trace.Handlers.ModelHandlers.Meta.initialize();
    for (const event of traceEvents) {
      Trace.Handlers.ModelHandlers.Meta.handleEvent(event);
    }
    await Trace.Handlers.ModelHandlers.Meta.finalize();

    const data = Trace.Handlers.ModelHandlers.Meta.data();
    assert.deepStrictEqual([...data.topLevelRendererIds], [2080]);

    const rendererProcesses = data.rendererProcessesByFrame.get(data.mainFrameId);
    if (!rendererProcesses) {
      assert.fail('No renderer processes found');
      return;
    }

    assert.deepStrictEqual([...rendererProcesses?.keys()], [2080]);
    assert.deepStrictEqual([...rendererProcesses?.values()], [
      [
        {
          frame: {
            frame: '1F729458403A23CF1D8D246095129AC4',
            name: '',
            processId: 2080,
            url: 'about:blank',
          },
          window: {
            min: 251126654355,
            max: 251126663397,
            range: 9042,
          },
        },
        {
          frame: {
            frame: '1F729458403A23CF1D8D246095129AC4',
            name: '',
            processId: 2080,
            url: 'https://www.google.com',
          },
          window: {
            min: 251126663398,
            max: 251128073034,
            range: 1409636,
          },
        },
      ],
    ]);
  });

  it('calculates trace bounds correctly', async function() {
    let traceEvents: readonly Trace.Types.Events.Event[];
    try {
      traceEvents = await TraceLoader.rawEvents(this, 'basic.json.gz');
    } catch (error) {
      assert.fail(error);
      return;
    }

    Trace.Handlers.ModelHandlers.Meta.reset();
    Trace.Handlers.ModelHandlers.Meta.initialize();
    for (const event of traceEvents) {
      Trace.Handlers.ModelHandlers.Meta.handleEvent(event);
    }
    await Trace.Handlers.ModelHandlers.Meta.finalize();

    const data = Trace.Handlers.ModelHandlers.Meta.data();
    const {
      max,
      min,
      range,
    } = data.traceBounds;
    const expectedMin = 50_442_438_975;
    const expectedMax = 50_442_438_976;
    assert.strictEqual(min, expectedMin, 'Min calculated incorrectly');
    assert.strictEqual(max, expectedMax, 'Max calculated incorrectly');
    assert.strictEqual(range, expectedMax - expectedMin, 'Range calculated incorrectly');
  });

  it('calculates the min trace bound correctly if no TracingStartedInBrowser event is found', async function() {
    const baseEvents = await TraceLoader.rawEvents(this, 'basic.json.gz');
    // We are about to mutate these events, so copy them to avoid mutating the
    // cached events from the TraceLoader.
    const traceEvents = baseEvents.slice().filter(event => {
      // Delete the tracing started in browser event to force the min bounds to
      // be calculated based on the event with the smallest timestamp.
      return event.name !== 'TracingStartedInBrowser';
    });

    Trace.Handlers.ModelHandlers.Meta.reset();
    Trace.Handlers.ModelHandlers.Meta.initialize();
    for (const event of traceEvents) {
      Trace.Handlers.ModelHandlers.Meta.handleEvent(event);
    }
    await Trace.Handlers.ModelHandlers.Meta.finalize();

    const data = Trace.Handlers.ModelHandlers.Meta.data();
    const expectedMin = 50_442_438_976;
    assert.strictEqual(data.traceBounds.min, expectedMin, 'Min calculated incorrectly');
  });

  it('ignores ::UMA Events', async function() {
    let traceEvents: readonly Trace.Types.Events.Event[];
    try {
      // This file contains UMA events which need to be ignored.
      traceEvents = await TraceLoader.rawEvents(this, 'web-dev.json.gz');
    } catch (error) {
      assert.fail(error);
      return;
    }

    Trace.Handlers.ModelHandlers.Meta.reset();
    Trace.Handlers.ModelHandlers.Meta.initialize();
    for (const event of traceEvents) {
      Trace.Handlers.ModelHandlers.Meta.handleEvent(event);
    }
    await Trace.Handlers.ModelHandlers.Meta.finalize();

    const data = Trace.Handlers.ModelHandlers.Meta.data();
    const {
      max,
      min,
      range,
    } = data.traceBounds;
    const expectedMin = 1_020_034_823_047;
    const expectedMax = 1_020_036_087_961;
    assert.strictEqual(min, expectedMin, 'Min calculated incorrectly');
    assert.strictEqual(max, expectedMax, 'Max calculated incorrectly');
    assert.strictEqual(range, expectedMax - expectedMin, 'Range calculated incorrectly');
  });

  it('collects all thread metadata in all processes', async () => {
    for (const event of baseEvents) {
      Trace.Handlers.ModelHandlers.Meta.handleEvent(event);
    }

    await Trace.Handlers.ModelHandlers.Meta.finalize();
    const data = Trace.Handlers.ModelHandlers.Meta.data();
    const collected = [...data.threadsInProcess.values()].map(threadInProcess => [...threadInProcess.values()]);

    expect(collected.map(process => process.map(thread => thread.args.name))).to.deep.equal([
      [
        'swapper',
        'VizCompositorThread',
        'ThreadPoolServiceThread',
        'ThreadPoolBackgroundWorker',
        'GpuWatchdog',
        'ThreadPoolForegroundWorker',
      ],
      [
        'CrBrowserMain',
        'Chrome_IOThread',
        'ThreadPoolServiceThread',
        'Chrome_DevToolsADBThread',
        'ThreadPoolForegroundWorker',
      ],
      [
        'CrRendererMain',
        'Compositor',
        'Chrome_ChildIOThread',
        'ThreadPoolServiceThread',
        'ThreadPoolForegroundWorker',
      ],
      [
        'CrRendererMain',
        'Compositor',
        'Chrome_ChildIOThread',
        'ThreadPoolServiceThread',
        'ThreadPoolForegroundWorker',
      ],
    ]);
  });

  it('can handle edge cases where there are multiple navigations with the same ID', async function() {
    // For context to why this test and trace file exist, see crbug.com/1503982
    // If an HTML page contains <script>window.location.href =
    // 'javascript:console.log(1)'</script>, the backend will emit two
    // navigationStarted events that are identical except for timestamps, and
    // this caused the trace engine to crash.
    // To ensure that we handle this case, we have this test which makes sure a
    // trace that does have two navigations with the same ID does not cause the
    // MetaHandler to throw an error.
    const events = await TraceLoader.rawEvents(this, 'multiple-navigations-same-id.json.gz');
    assert.doesNotThrow(function() {
      for (const event of events) {
        Trace.Handlers.ModelHandlers.Meta.handleEvent(event);
      }
    });
  });

  it('marks a generic trace as generic', async function() {
    const events = await TraceLoader.rawEvents(this, 'generic-about-tracing.json.gz');
    for (const event of events) {
      Trace.Handlers.ModelHandlers.Meta.handleEvent(event);
    }
    await Trace.Handlers.ModelHandlers.Meta.finalize();
    assert.isTrue(Trace.Handlers.ModelHandlers.Meta.data().traceIsGeneric);
  });

  it('marks a web trace as being not generic', async function() {
    const events = await TraceLoader.rawEvents(this, 'web-dev-with-commit.json.gz');
    for (const event of events) {
      Trace.Handlers.ModelHandlers.Meta.handleEvent(event);
    }
    await Trace.Handlers.ModelHandlers.Meta.finalize();
    assert.isFalse(Trace.Handlers.ModelHandlers.Meta.data().traceIsGeneric);
  });

  it('sets the main frame URL from the TracingStartedInBrowser event', async function() {
    // This trace has the right URL in TracingStartedInBrowser
    const events = await TraceLoader.rawEvents(this, 'web-dev-with-commit.json.gz');
    for (const event of events) {
      Trace.Handlers.ModelHandlers.Meta.handleEvent(event);
    }
    await Trace.Handlers.ModelHandlers.Meta.finalize();
    const data = Trace.Handlers.ModelHandlers.Meta.data();
    assert.strictEqual(data.mainFrameURL, 'https://web.dev/');
  });

  it('will alter the main frame URL based on the first main frame navigation', async function() {
    // This trace has the wrong URL in TracingStartedInBrowser - but it will be
    // corrected by looking at the first main frame navigation.
    const events = await TraceLoader.rawEvents(this, 'web-dev-initial-url.json.gz');
    for (const event of events) {
      Trace.Handlers.ModelHandlers.Meta.handleEvent(event);
    }
    await Trace.Handlers.ModelHandlers.Meta.finalize();
    const data = Trace.Handlers.ModelHandlers.Meta.data();
    assert.strictEqual(data.mainFrameURL, 'https://web.dev/articles/inp');
  });

  it('returns a list of processes and process_name events', async function() {
    const events = await TraceLoader.rawEvents(this, 'web-dev-initial-url.json.gz');
    for (const event of events) {
      Trace.Handlers.ModelHandlers.Meta.handleEvent(event);
    }
    await Trace.Handlers.ModelHandlers.Meta.finalize();
    const data = Trace.Handlers.ModelHandlers.Meta.data();
    const pidsToNames = Array.from(data.processNames.entries(), ([pid, event]) => {
      return [pid, event.args.name];
    });
    assert.deepEqual(pidsToNames, [
      [Trace.Types.Events.ProcessID(37605), 'Browser'],
      [Trace.Types.Events.ProcessID(48544), 'Renderer'],
      [Trace.Types.Events.ProcessID(37613), 'GPU Process'],
      [Trace.Types.Events.ProcessID(48531), 'Renderer'],
    ]);
  });

  it('does not set a frame as a main frame if it has no URL.', async function() {
    // This test exists because of a bug report from this trace where we
    // incorrectly set the main frame ID, causing DevTools to pick an advert in
    // an iframe as the main thread. This happened because we happily set
    // mainFrameID to a frame that had no URL, which doesn't make sense.
    const events = await TraceLoader.rawEvents(this, 'wrong-main-frame-bug.json.gz');
    for (const event of events) {
      Trace.Handlers.ModelHandlers.Meta.handleEvent(event);
    }
    await Trace.Handlers.ModelHandlers.Meta.finalize();
    const data = Trace.Handlers.ModelHandlers.Meta.data();
    assert.strictEqual(data.mainFrameId, 'D1731088F5DE299149240DF9E6025291');
  });

  it('will use isOutermostMainFrame to determine the main frame from the TracingStartedInBrowser event if it is present',
     async function() {
       const events = await TraceLoader.rawEvents(this, 'web-dev-outermost-frames.json.gz');
       for (const event of events) {
         Trace.Handlers.ModelHandlers.Meta.handleEvent(event);
       }
       await Trace.Handlers.ModelHandlers.Meta.finalize();
       const data = Trace.Handlers.ModelHandlers.Meta.data();
       assert.strictEqual(data.mainFrameId, '881522AC20B813B0C0E99E27CEBAB951');
     });

  it('will use isInPrimaryPage along with isOutermostMainFrame to identify the main frame from TracingStartedInBrowser',
     async function() {
       // See crbug.com/343873756 for context on this bug report and fix.
       const events = await TraceLoader.rawEvents(this, 'primary-page-frame.json.gz');
       for (const event of events) {
         Trace.Handlers.ModelHandlers.Meta.handleEvent(event);
       }
       await Trace.Handlers.ModelHandlers.Meta.finalize();
       const data = Trace.Handlers.ModelHandlers.Meta.data();
       // If you look at the trace, this is the frame that is both:
       // isInPrimaryPage === true
       // isOutermostMainFrame == true
       //
       // The other frames have isOutermostMainFrame == true (as they are pre-rendered pages)
       // But they are not in the primary page.
       assert.strictEqual(data.mainFrameId, '07B7D55F5BE0ADB8AAD6502F2D3859FF');
     });
});
