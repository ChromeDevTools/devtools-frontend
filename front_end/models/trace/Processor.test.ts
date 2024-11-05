// Copyright 2023 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import {describeWithEnvironment} from '../../testing/EnvironmentHelpers.js';
import {TraceLoader} from '../../testing/TraceLoader.js';
import * as Trace from '../trace/trace.js';

describeWithEnvironment('TraceProcessor', function() {
  it('can use a trace processor', async function() {
    const processor = Trace.Processor.TraceProcessor.createWithAllHandlers();
    const file = await TraceLoader.rawEvents(this, 'basic.json.gz');

    // Check parsing after instantiation.
    assert.isNull(processor.parsedTrace);
    await processor.parse(file, {isFreshRecording: true, isCPUProfile: false});
    assert.isNotNull(processor.parsedTrace);

    // Check parsing without a reset.
    let thrown;
    try {
      await processor.parse(file, {isFreshRecording: true, isCPUProfile: false});
    } catch (e) {
      thrown = e as Error;
    }
    assert.strictEqual(
        thrown?.message, 'Trace processor can\'t start parsing when not idle. Current state: FINISHED_PARSING');

    // Check parsing after reset.
    processor.reset();
    assert.isNull(processor.parsedTrace);
    assert.isNull(processor.insights);
    await processor.parse(file, {isFreshRecording: true, isCPUProfile: false});
    assert.isNotNull(processor.parsedTrace);
    assert.isNotNull(processor.insights);
    // Cleanup.
    processor.reset();

    // Check simultaneous parsing without waiting.
    let promise;
    try {
      promise = processor.parse(file, {isFreshRecording: true, isCPUProfile: false});
      await processor.parse(file, {isFreshRecording: true, isCPUProfile: false});

    } catch (e) {
      thrown = e as Error;
    } finally {
      // Cleanup.
      await promise;
      processor.reset();
    }
    assert.strictEqual(thrown?.message, 'Trace processor can\'t start parsing when not idle. Current state: PARSING');

    // Check if data is null immediately after resetting.
    assert.isNull(processor.parsedTrace);
    assert.isNull(processor.insights);
    await processor.parse(file, {isFreshRecording: true, isCPUProfile: false});
    assert.isNotNull(processor.parsedTrace);
    assert.isNotNull(processor.insights);
    processor.reset();
    assert.isNull(processor.parsedTrace);
    assert.isNull(processor.insights);

    // Check resetting while parsing.
    try {
      promise = processor.parse(file, {isFreshRecording: true, isCPUProfile: false});
      processor.reset();
    } catch (e) {
      thrown = e as Error;
    } finally {
      // Cleanup.
      await promise;
      processor.reset();
    }
    assert.strictEqual(thrown?.message, 'Trace processor can\'t reset while parsing.');

    // Check parsing after resetting while parsing.
    assert.isNull(processor.parsedTrace);
    assert.isNull(processor.insights);
    await processor.parse(file, {isFreshRecording: true, isCPUProfile: false});
    assert.isNotNull(processor.parsedTrace);
    assert.isNotNull(processor.insights);
  });

  it('can be given a subset of handlers to run and will run just those along with the meta handler', async function() {
    const processor = new Trace.Processor.TraceProcessor({
      Animations: Trace.Handlers.ModelHandlers.Animations,
    });
    const events = await TraceLoader.rawEvents(this, 'animation.json.gz');
    await processor.parse(events, {isFreshRecording: true, isCPUProfile: false});
    assert.isNotNull(processor.parsedTrace);
    assert.deepEqual(Object.keys(processor.parsedTrace || {}), ['Meta', 'Animations']);
  });

  it('does not error if the user does not enable the Meta handler when it is a dependency', async function() {
    assert.doesNotThrow(() => {
      new Trace.Processor.TraceProcessor({
        // Screenshots handler depends on Meta handler, so this is invalid.
        // However, the Processor automatically ensures the Meta handler is
        // enabled, so this should not cause an error.
        Screenshots: Trace.Handlers.ModelHandlers.Screenshots,
      });
    });
  });

  it('errors if the user does not provide the right handler dependencies', async function() {
    assert.throws(() => {
      new Trace.Processor.TraceProcessor({
        Renderer: Trace.Handlers.ModelHandlers.Renderer,
        // Invalid: the renderer depends on the samples handler, so the user should pass that in too.
      });
    }, /Required handler Samples not provided/);
  });

  it('emits periodic trace updates', async function() {
    const processor = new Trace.Processor.TraceProcessor(
        {
          Renderer: Trace.Handlers.ModelHandlers.Renderer,
          Samples: Trace.Handlers.ModelHandlers.Samples,
          AuctionWorklets: Trace.Handlers.ModelHandlers.AuctionWorklets,
        },
        Trace.Types.Configuration.defaults());

    let updateEventCount = 0;

    processor.addEventListener(Trace.Processor.TraceParseProgressEvent.eventName, () => {
      updateEventCount++;
    });

    const rawEvents = await TraceLoader.rawEvents(this, 'web-dev-outermost-frames.json.gz');
    // This trace has 106,110 events. At default of 50k chunks we should see 2 updates.
    // Additional progress updates are emitted for handers, etc.
    await processor.parse(rawEvents, {isFreshRecording: true, isCPUProfile: false}).then(() => {
      assert.isAtLeast(updateEventCount, 2);
    });
  });

  describe('handler sorting', () => {
    const baseHandler = {
      data() {},
      handleEvent() {},
      async finalize() {},
      reset() {},
    };

    function fillHandlers(handlersDeps: {[key: string]: {deps ? () : Trace.Handlers.Types.HandlerName[]}}):
        {[key: string]: Trace.Handlers.Types.Handler} {
      const handlers: {[key: string]: Trace.Handlers.Types.Handler} = {};
      for (const handler in handlersDeps) {
        handlers[handler] = {...baseHandler, ...handlersDeps[handler]};
      }
      return handlers;
    }

    it('sorts handlers satisfying their dependencies 1', function() {
      const handlersDeps: {[key: string]: {deps ? () : Trace.Handlers.Types.HandlerName[]}} = {
        Meta: {},
        GPU: {
          deps() {
            return ['Meta'];
          },
        },
        LayoutShifts: {
          deps() {
            return ['GPU'];
          },
        },
        NetworkRequests: {
          deps() {
            return ['LayoutShifts'];
          },
        },
        PageLoadMetrics: {
          deps() {
            return ['Renderer', 'GPU'];
          },
        },
        Renderer: {
          deps() {
            return ['Screenshots'];
          },
        },
        Screenshots: {
          deps() {
            return ['NetworkRequests', 'LayoutShifts'];
          },
        },
      };
      const handlers = fillHandlers(handlersDeps);

      const expectedOrder =
          ['Meta', 'GPU', 'LayoutShifts', 'NetworkRequests', 'Screenshots', 'Renderer', 'PageLoadMetrics'];
      assert.deepEqual([...Trace.Processor.sortHandlers(handlers).keys()], expectedOrder);
    });
    it('sorts handlers satisfying their dependencies 2', function() {
      const handlersDeps: {[key: string]: {deps ? () : Trace.Handlers.Types.HandlerName[]}} = {
        GPU: {
          deps() {
            return ['LayoutShifts', 'NetworkRequests'];
          },
        },
        LayoutShifts: {
          deps() {
            return ['NetworkRequests'];
          },
        },
        NetworkRequests: {},
      };
      const handlers = fillHandlers(handlersDeps);

      const expectedOrder = ['NetworkRequests', 'LayoutShifts', 'GPU'];
      assert.deepEqual([...Trace.Processor.sortHandlers(handlers).keys()], expectedOrder);
    });
    it('throws an error when a dependency cycle is present among handlers', function() {
      const handlersDeps: {[key: string]: {deps ? () : Trace.Handlers.Types.HandlerName[]}} = {
        Meta: {},
        GPU: {
          deps() {
            return ['Meta'];
          },
        },
        LayoutShifts: {
          deps() {
            return ['GPU', 'Renderer'];
          },
        },
        NetworkRequests: {
          deps() {
            return ['LayoutShifts'];
          },
        },
        Renderer: {
          deps() {
            return ['NetworkRequests'];
          },
        },
      };
      const handlers = fillHandlers(handlersDeps);
      const cyclePath = 'LayoutShifts->Renderer->NetworkRequests->LayoutShifts';
      assert.throws(
          () => Trace.Processor.sortHandlers(handlers), `Found dependency cycle in trace event handlers: ${cyclePath}`);
    });
  });

  describe('insights', () => {
    it('returns a single group of insights even if no navigations', async function() {
      const processor = Trace.Processor.TraceProcessor.createWithAllHandlers();
      const file = await TraceLoader.rawEvents(this, 'basic.json.gz');

      await processor.parse(file, {isFreshRecording: true, isCPUProfile: false});
      if (!processor.insights) {
        throw new Error('No insights');
      }

      assert.strictEqual(processor.insights.size, 1);
      assert.deepStrictEqual([...processor.insights.keys()], [Trace.Types.Events.NO_NAVIGATION]);
    });

    it('captures errors thrown by insights', async function() {
      sinon.stub(Trace.Processor.TraceProcessor, 'getEnabledInsightRunners').callsFake(() => {
        return {
          RenderBlocking: {
            generateInsight: () => {
              throw new Error('forced error');
            },
            deps: Trace.Insights.Models.RenderBlocking.deps,
          },
        };
      });

      const processor = Trace.Processor.TraceProcessor.createWithAllHandlers();
      const file = await TraceLoader.rawEvents(this, 'load-simple.json.gz');

      await processor.parse(file, {isFreshRecording: true, isCPUProfile: false});
      if (!processor.insights) {
        throw new Error('No insights');
      }

      const insights = Array.from(processor.insights.values());
      assert.strictEqual(insights.length, 2);
      assert(insights[1].model.RenderBlocking instanceof Error, 'RenderBlocking did not throw an error');
      assert.strictEqual(insights[1].model.RenderBlocking.message, 'forced error');
    });

    it('skips insights that are missing one or more dependencies', async function() {
      const processor = new Trace.Processor.TraceProcessor({
        Animations: Trace.Handlers.ModelHandlers.Animations,
      });
      const file = await TraceLoader.rawEvents(this, 'load-simple.json.gz');

      await processor.parse(file, {isFreshRecording: true, isCPUProfile: false});
      if (!processor.insights) {
        throw new Error('No insights');
      }

      assert.deepStrictEqual([...processor.insights.keys()], [
        Trace.Types.Events.NO_NAVIGATION,
        '0BCFC23BC7D7BEDC9F93E912DCCEC1DA',
      ]);

      const insights = Array.from(processor.insights.values());
      assert.isUndefined(insights[0].model.RenderBlocking);
      assert.isUndefined(insights[1].model.RenderBlocking);
    });

    it('returns insights for a navigation', async function() {
      const processor = Trace.Processor.TraceProcessor.createWithAllHandlers();
      const file = await TraceLoader.rawEvents(this, 'load-simple.json.gz');

      await processor.parse(file, {isFreshRecording: true, isCPUProfile: false});
      if (!processor.insights) {
        throw new Error('No insights');
      }

      assert.deepStrictEqual([...processor.insights.keys()], [
        Trace.Types.Events.NO_NAVIGATION,
        '0BCFC23BC7D7BEDC9F93E912DCCEC1DA',
      ]);

      const insights = Array.from(processor.insights.values());
      if (insights[0].model.RenderBlocking instanceof Error) {
        throw new Error('RenderBlocking threw an error');
      }
      if (insights[1].model.RenderBlocking instanceof Error) {
        throw new Error('RenderBlocking threw an error');
      }

      assert.strictEqual(insights[0].model.RenderBlocking.renderBlockingRequests.length, 0);
      assert.strictEqual(insights[1].model.RenderBlocking.renderBlockingRequests.length, 2);
    });

    it('returns insights for multiple navigations', async function() {
      const processor = Trace.Processor.TraceProcessor.createWithAllHandlers();
      const file = await TraceLoader.rawEvents(this, 'multiple-navigations.json.gz');

      await processor.parse(file, {isFreshRecording: true, isCPUProfile: false});
      if (!processor.insights) {
        throw new Error('No insights');
      }

      assert.deepStrictEqual([...processor.insights.keys()], [
        Trace.Types.Events.NO_NAVIGATION,
        '83ACBFD389F1F66EF79CEDB4076EB44A',
        '70BCD304FD2C098BA2513488AB0FF3F2',
        '71CF0F2B9FE50F2CB31B261D129D06E8',
      ]);

      const insights = Array.from(processor.insights.values());
      if (insights[0].model.RenderBlocking instanceof Error) {
        throw new Error('RenderBlocking threw an error');
      }
      if (insights[1].model.RenderBlocking instanceof Error) {
        throw new Error('RenderBlocking threw an error');
      }
      if (insights[2].model.RenderBlocking instanceof Error) {
        throw new Error('RenderBlocking threw an error');
      }
      if (insights[3].model.RenderBlocking instanceof Error) {
        throw new Error('RenderBlocking threw an error');
      }

      assert.strictEqual(insights[0].model.RenderBlocking.renderBlockingRequests.length, 0);
      assert.strictEqual(insights[1].model.RenderBlocking.renderBlockingRequests.length, 0);
      assert.strictEqual(insights[2].model.RenderBlocking.renderBlockingRequests.length, 0);
      assert.strictEqual(insights[3].model.RenderBlocking.renderBlockingRequests.length, 1);
    });
  });
});
