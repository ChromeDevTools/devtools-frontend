// Copyright 2022 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as TraceModel from '../../../../../../front_end/models/trace/trace.js';

const {assert} = chai;

import {loadEventsFromTraceFile} from '../../../helpers/TraceHelpers.js';

function removeEventWithName(events: TraceModel.Types.TraceEvents.TraceEventData[], filteredName: string) {
  return events.filter((event: TraceModel.Types.TraceEvents.TraceEventData) => {
    const args = event.args as {name?: string};
    if (!('name' in args)) {
      return true;
    }

    return args.name !== filteredName;
  });
}
const defaultTraceEvent: TraceModel.Types.TraceEvents.TraceEventData = {
  name: 'process_name',
  tid: TraceModel.Types.TraceEvents.ThreadID(0),
  pid: TraceModel.Types.TraceEvents.ProcessID(0),
  ts: TraceModel.Types.Timing.MicroSeconds(0),
  cat: 'test',
  ph: TraceModel.Types.TraceEvents.TraceEventPhase.METADATA,
};

describe('MetaHandler', () => {
  let baseEvents: TraceModel.Types.TraceEvents.TraceEventData[];
  beforeEach(async () => {
    let defaultTraceEvents: TraceModel.Types.TraceEvents.TraceEventData[];
    try {
      defaultTraceEvents = await loadEventsFromTraceFile('basic.json.gz');
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
        pid: TraceModel.Types.TraceEvents.ProcessID(23456),
        tid: TraceModel.Types.TraceEvents.ThreadID(775),
        ts: TraceModel.Types.Timing.MicroSeconds(100),
        name: 'navigationStart',
      } as TraceModel.Types.TraceEvents.TraceEventNavigationStart,
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
        pid: TraceModel.Types.TraceEvents.ProcessID(23456),
        tid: TraceModel.Types.TraceEvents.ThreadID(775),
        ts: TraceModel.Types.Timing.MicroSeconds(800),
        name: 'navigationStart',
      } as TraceModel.Types.TraceEvents.TraceEventNavigationStart,
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
        pid: TraceModel.Types.TraceEvents.ProcessID(23456),
        tid: TraceModel.Types.TraceEvents.ThreadID(775),
        ts: TraceModel.Types.Timing.MicroSeconds(1000),
        name: 'navigationStart',
      } as TraceModel.Types.TraceEvents.TraceEventNavigationStart,
    ];

    TraceModel.Handlers.ModelHandlers.Meta.reset();
    TraceModel.Handlers.ModelHandlers.Meta.initialize();
  });

  describe('error handling', () => {
    it('throws if data is called before finalize', () => {
      for (const event of baseEvents) {
        TraceModel.Handlers.ModelHandlers.Meta.handleEvent(event);
      }

      assert.throws(() => {
        TraceModel.Handlers.ModelHandlers.Meta.data();
      }, 'Handler is not finalized');
    });

    it('throws if initialize is called without a reset', () => {
      // Due to the beforeEach the handler is already initialized, so calling
      // it a second time should throw an error.
      assert.throws(() => {
        TraceModel.Handlers.ModelHandlers.Meta.initialize();
      }, 'Handler was not reset');
    });
  });

  describe('browser process ID', () => {
    it('obtains the PID if present', async () => {
      for (const event of baseEvents) {
        TraceModel.Handlers.ModelHandlers.Meta.handleEvent(event);
      }

      await TraceModel.Handlers.ModelHandlers.Meta.finalize();
      const data = TraceModel.Handlers.ModelHandlers.Meta.data();
      assert.strictEqual(data.browserProcessId, TraceModel.Types.TraceEvents.ProcessID(8017));
    });

    it('throws if the PID is not present', async () => {
      // Remove the Browser Process event, which should trigger an error.
      const filteredEvents = removeEventWithName(baseEvents, 'Browser');
      for (const event of filteredEvents) {
        TraceModel.Handlers.ModelHandlers.Meta.handleEvent(event);
      }
      let thrown: Error|null = null;
      try {
        await TraceModel.Handlers.ModelHandlers.Meta.finalize();
      } catch (e) {
        thrown = e as Error;
      }
      assert.strictEqual(thrown?.message, 'Unable to find browser process');
    });
  });

  describe('browser thread ID', () => {
    it('obtains the TID if present', async () => {
      for (const event of baseEvents) {
        TraceModel.Handlers.ModelHandlers.Meta.handleEvent(event);
      }

      await TraceModel.Handlers.ModelHandlers.Meta.finalize();
      const data = TraceModel.Handlers.ModelHandlers.Meta.data();
      assert.strictEqual(data.browserThreadId, TraceModel.Types.TraceEvents.ThreadID(775));
    });

    it('throws if the TID is not present', async () => {
      // Remove the Browser Thread event, which should trigger an error.
      const filteredEvents = removeEventWithName(baseEvents, 'CrBrowserMain');
      for (const event of filteredEvents) {
        TraceModel.Handlers.ModelHandlers.Meta.handleEvent(event);
      }
      let thrown: Error|null = null;
      try {
        await TraceModel.Handlers.ModelHandlers.Meta.finalize();
      } catch (e) {
        thrown = e as Error;
      }
      assert.strictEqual(thrown?.message, 'Unable to find browser thread');
    });
  });

  describe('renderer process ID', () => {
    it('obtains the PID if present', async () => {
      for (const event of baseEvents) {
        TraceModel.Handlers.ModelHandlers.Meta.handleEvent(event);
      }

      await TraceModel.Handlers.ModelHandlers.Meta.finalize();
      const data = TraceModel.Handlers.ModelHandlers.Meta.data();
      assert.strictEqual(data.topLevelRendererIds.size, 1);
      assert.deepStrictEqual([...data.topLevelRendererIds], [TraceModel.Types.TraceEvents.ProcessID(8051)]);
    });

    it('throws if the PID is not present', async () => {
      let traceEvents: TraceModel.Types.TraceEvents.TraceEventData[];
      try {
        traceEvents = await loadEventsFromTraceFile('missing-process-data.json.gz');
      } catch (error) {
        assert.fail(error);
        return;
      }

      TraceModel.Handlers.ModelHandlers.Meta.reset();
      TraceModel.Handlers.ModelHandlers.Meta.initialize();
      for (const event of traceEvents) {
        TraceModel.Handlers.ModelHandlers.Meta.handleEvent(event);
      }
      let thrown: Error|null = null;
      try {
        await TraceModel.Handlers.ModelHandlers.Meta.finalize();
      } catch (e) {
        thrown = e as Error;
      }
      assert.strictEqual(thrown?.message, 'Unable to find renderer processes');
    });
  });

  describe('navigations', () => {
    it('obtains them if present', async () => {
      for (const event of baseEvents) {
        TraceModel.Handlers.ModelHandlers.Meta.handleEvent(event);
      }

      await TraceModel.Handlers.ModelHandlers.Meta.finalize();
      const data = TraceModel.Handlers.ModelHandlers.Meta.data();
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
  });

  describe('frames', () => {
    it('finds the main frame ID', async () => {
      for (const event of baseEvents) {
        TraceModel.Handlers.ModelHandlers.Meta.handleEvent(event);
      }

      await TraceModel.Handlers.ModelHandlers.Meta.finalize();
      const data = TraceModel.Handlers.ModelHandlers.Meta.data();
      assert.strictEqual(data.mainFrameId, '3E1717BE677B75D0536E292E00D6A34A');
    });

    it('finds the main frame ID for a trace that started with a page reload', async () => {
      const events = await loadEventsFromTraceFile('reload-and-trace-page.json.gz');
      TraceModel.Handlers.ModelHandlers.Meta.reset();
      TraceModel.Handlers.ModelHandlers.Meta.initialize();
      for (const event of events) {
        TraceModel.Handlers.ModelHandlers.Meta.handleEvent(event);
      }

      await TraceModel.Handlers.ModelHandlers.Meta.finalize();
      const data = TraceModel.Handlers.ModelHandlers.Meta.data();
      assert.strictEqual(data.mainFrameId, '1D148CB660D1F96ED70D78DC6A53267B');
    });
  });

  describe('finding GPU thread and main frame', () => {
    it('finds the GPU process and GPU Thread', async () => {
      const events = await loadEventsFromTraceFile('threejs-gpu.json.gz');
      TraceModel.Handlers.ModelHandlers.Meta.reset();
      TraceModel.Handlers.ModelHandlers.Meta.initialize();
      for (const event of events) {
        TraceModel.Handlers.ModelHandlers.Meta.handleEvent(event);
      }
      await TraceModel.Handlers.ModelHandlers.Meta.finalize();
      const {gpuProcessId, gpuThreadId} = TraceModel.Handlers.ModelHandlers.Meta.data();
      assert.strictEqual(gpuProcessId, TraceModel.Types.TraceEvents.ProcessID(3581327));
      assert.strictEqual(gpuThreadId, TraceModel.Types.TraceEvents.ThreadID(3581327));
    });

    it('handles traces that do not have a GPU thread and returns undefined for the thread ID', async () => {
      const traceEventsWithNoGPUThread = await loadEventsFromTraceFile('forced-layouts-and-no-gpu.json.gz');
      for (const event of traceEventsWithNoGPUThread) {
        TraceModel.Handlers.ModelHandlers.Meta.handleEvent(event);
      }

      assert.doesNotThrow(async () => {
        await TraceModel.Handlers.ModelHandlers.Meta.finalize();
      });

      const data = TraceModel.Handlers.ModelHandlers.Meta.data();
      assert.isUndefined(data.gpuThreadId);
    });
  });

  it('obtains renderer process IDs when there are no navigations', async () => {
    let traceEvents: TraceModel.Types.TraceEvents.TraceEventData[];
    try {
      traceEvents = await loadEventsFromTraceFile('threejs-gpu.json.gz');
    } catch (error) {
      assert.fail(error);
      return;
    }

    TraceModel.Handlers.ModelHandlers.Meta.reset();
    TraceModel.Handlers.ModelHandlers.Meta.initialize();
    for (const event of traceEvents) {
      TraceModel.Handlers.ModelHandlers.Meta.handleEvent(event);
    }
    await TraceModel.Handlers.ModelHandlers.Meta.finalize();

    const data = TraceModel.Handlers.ModelHandlers.Meta.data();
    assert.deepStrictEqual([...data.topLevelRendererIds], [3601132]);

    const rendererProcesses = data.rendererProcessesByFrame.get(data.mainFrameId);
    if (!rendererProcesses) {
      assert.fail('No renderer processes found');
      return;
    }
    assert.deepStrictEqual([...rendererProcesses?.keys()], [3601132]);
    const windowMinTime = 1143381875846;
    assert.deepStrictEqual(
        [...rendererProcesses?.values()], [{
          'frame': {
            'frame': '1D148CB660D1F96ED70D78DC6A53267B',
            'name': '',
            'processId': 3601132,
            'url': 'https://threejs.org/examples/',
          },
          'window': {'min': windowMinTime, 'max': data.traceBounds.max, 'range': data.traceBounds.max - windowMinTime},
        }]);
  });

  it('handles multiple renderers from navigations', async () => {
    let traceEvents: TraceModel.Types.TraceEvents.TraceEventData[];
    try {
      traceEvents = await loadEventsFromTraceFile('multiple-top-level-renderers.json.gz');
    } catch (error) {
      assert.fail(error);
      return;
    }

    TraceModel.Handlers.ModelHandlers.Meta.reset();
    TraceModel.Handlers.ModelHandlers.Meta.initialize();
    for (const event of traceEvents) {
      TraceModel.Handlers.ModelHandlers.Meta.handleEvent(event);
    }
    await TraceModel.Handlers.ModelHandlers.Meta.finalize();

    const data = TraceModel.Handlers.ModelHandlers.Meta.data();
    assert.deepStrictEqual([...data.topLevelRendererIds], [78450, 78473, 79194]);

    const rendererProcesses = data.rendererProcessesByFrame.get(data.mainFrameId);
    if (!rendererProcesses) {
      assert.fail('No renderer processes found');
      return;
    }

    const windowMinTime = 3550807444741;
    assert.deepStrictEqual([...rendererProcesses?.keys()], [78450, 78473, 79194]);
    assert.deepStrictEqual([...rendererProcesses?.values()], [
      {
        'frame': {
          'frame': 'E70A9327100EBD78F1C03582BBBE8E5F',
          'name': '',
          'processId': 78450,
          'url': 'http://127.0.0.1:8081/',
        },
        'window': {'min': 3550803491779, 'max': 3550805534872, 'range': 2043093},
      },
      {
        'frame': {
          'frame': 'E70A9327100EBD78F1C03582BBBE8E5F',
          'name': '',
          'processId': 78473,
          'url': 'http://localhost:8080/',
        },
        'window': {'min': 3550805534873, 'max': 3550807444740, 'range': 1909867},
      },
      {
        'frame': {
          'frame': 'E70A9327100EBD78F1C03582BBBE8E5F',
          'name': '',
          'processId': 79194,
          'url': 'https://www.google.com/',
        },
        'window': {'min': windowMinTime, 'max': data.traceBounds.max, 'range': data.traceBounds.max - windowMinTime},
      },
    ]);
  });

  it('calculates trace bounds correctly', async () => {
    let traceEvents: TraceModel.Types.TraceEvents.TraceEventData[];
    try {
      traceEvents = await loadEventsFromTraceFile('basic.json.gz');
    } catch (error) {
      assert.fail(error);
      return;
    }

    TraceModel.Handlers.ModelHandlers.Meta.reset();
    TraceModel.Handlers.ModelHandlers.Meta.initialize();
    for (const event of traceEvents) {
      TraceModel.Handlers.ModelHandlers.Meta.handleEvent(event);
    }
    await TraceModel.Handlers.ModelHandlers.Meta.finalize();

    const data = TraceModel.Handlers.ModelHandlers.Meta.data();
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

  it('ignores ::UMA Events', async () => {
    let traceEvents: TraceModel.Types.TraceEvents.TraceEventData[];
    try {
      // This file contains UMA events which need to be ignored.
      traceEvents = await loadEventsFromTraceFile('web-dev.json.gz');
    } catch (error) {
      assert.fail(error);
      return;
    }

    TraceModel.Handlers.ModelHandlers.Meta.reset();
    TraceModel.Handlers.ModelHandlers.Meta.initialize();
    for (const event of traceEvents) {
      TraceModel.Handlers.ModelHandlers.Meta.handleEvent(event);
    }
    await TraceModel.Handlers.ModelHandlers.Meta.finalize();

    const data = TraceModel.Handlers.ModelHandlers.Meta.data();
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
      TraceModel.Handlers.ModelHandlers.Meta.handleEvent(event);
    }

    await TraceModel.Handlers.ModelHandlers.Meta.finalize();
    const data = TraceModel.Handlers.ModelHandlers.Meta.data();
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

  describe('Unsupported files', () => {
    it('throws when TracingStartedInBrowser is missing', async () => {
      let traceEvents: TraceModel.Types.TraceEvents.TraceEventData[];
      try {
        traceEvents = await loadEventsFromTraceFile('missing-tracing-start.json.gz');
      } catch (error) {
        assert.fail(error);
        return;
      }

      TraceModel.Handlers.ModelHandlers.Meta.reset();
      TraceModel.Handlers.ModelHandlers.Meta.initialize();
      for (const event of traceEvents) {
        TraceModel.Handlers.ModelHandlers.Meta.handleEvent(event);
      }

      let thrown: Error|null = null;
      try {
        await TraceModel.Handlers.ModelHandlers.Meta.finalize();
      } catch (e) {
        thrown = e as Error;
      }
      assert.strictEqual(thrown?.message, 'Error parsing trace data: no TracingStartedInBrowser event found.');
    });
  });
});
