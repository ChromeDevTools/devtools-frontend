// Copyright 2023 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import {describeWithEnvironment} from '../../testing/EnvironmentHelpers.js';
import {TraceLoader} from '../../testing/TraceLoader.js';
import * as TraceModel from '../trace/trace.js';

const {assert} = chai;

describeWithEnvironment('TraceProcessor', function() {
  it('can use a trace processor', async function() {
    const processor = TraceModel.Processor.TraceProcessor.createWithAllHandlers();
    const file = await TraceLoader.rawEvents(this, 'basic.json.gz');

    // Check parsing after instantiation.
    assert.isNull(processor.traceParsedData);
    await processor.parse(file);
    assert.isNotNull(processor.traceParsedData);

    // Check parsing without a reset.
    let thrown;
    try {
      await processor.parse(file);
    } catch (e) {
      thrown = e as Error;
    }
    assert.strictEqual(
        thrown?.message, 'Trace processor can\'t start parsing when not idle. Current state: FINISHED_PARSING');

    // Check parsing after reset.
    processor.reset();
    assert.isNull(processor.traceParsedData);
    assert.isNull(processor.insights);
    await processor.parse(file);
    assert.isNotNull(processor.traceParsedData);
    assert.isNotNull(processor.insights);
    // Cleanup.
    processor.reset();

    // Check simultaneous parsing without waiting.
    let promise;
    try {
      promise = processor.parse(file);
      await processor.parse(file);
    } catch (e) {
      thrown = e as Error;
    } finally {
      // Cleanup.
      await promise;
      processor.reset();
    }
    assert.strictEqual(thrown?.message, 'Trace processor can\'t start parsing when not idle. Current state: PARSING');

    // Check if data is null immediately after resetting.
    assert.isNull(processor.traceParsedData);
    assert.isNull(processor.insights);
    await processor.parse(file);
    assert.isNotNull(processor.traceParsedData);
    assert.isNotNull(processor.insights);
    processor.reset();
    assert.isNull(processor.traceParsedData);
    assert.isNull(processor.insights);

    // Check resetting while parsing.
    try {
      promise = processor.parse(file);
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
    assert.isNull(processor.traceParsedData);
    assert.isNull(processor.insights);
    await processor.parse(file);
    assert.isNotNull(processor.traceParsedData);
    assert.isNotNull(processor.insights);
  });

  it('can be given a subset of handlers to run and will run just those along with the meta handler', async function() {
    const processor = new TraceModel.Processor.TraceProcessor({
      Animation: TraceModel.Handlers.ModelHandlers.Animations,
    });
    const events = await TraceLoader.rawEvents(this, 'animation.json.gz');
    await processor.parse(events);
    assert.isNotNull(processor.traceParsedData);
    assert.deepEqual(Object.keys(processor.traceParsedData || {}), ['Meta', 'Animation']);
  });

  it('does not error if the user does not enable the Meta handler when it is a dependency', async function() {
    assert.doesNotThrow(() => {
      new TraceModel.Processor.TraceProcessor({
        // Screenshots handler depends on Meta handler, so this is invalid.
        // However, the Processor automatically ensures the Meta handler is
        // enabled, so this should not cause an error.
        Screenshots: TraceModel.Handlers.ModelHandlers.Screenshots,
      });
    });
  });

  it('errors if the user does not provide the right handler dependencies', async function() {
    assert.throws(() => {
      new TraceModel.Processor.TraceProcessor({
        Renderer: TraceModel.Handlers.ModelHandlers.Renderer,
        // Invalid: the renderer depends on the samples handler, so the user should pass that in too.
      });
    }, /Required handler Samples not provided/);
  });

  it('emits periodic trace updates', async function() {
    const processor = new TraceModel.Processor.TraceProcessor(
        {
          Renderer: TraceModel.Handlers.ModelHandlers.Renderer,
          Samples: TraceModel.Handlers.ModelHandlers.Samples,
          AuctionWorklets: TraceModel.Handlers.ModelHandlers.AuctionWorklets,
        },
        {
          ...TraceModel.Types.Configuration.DEFAULT,
          processing: {
            ...TraceModel.Types.Configuration.DEFAULT.processing,
            // This trace is 8252 events long, lets emit 8 updates
            eventsPerChunk: 1_000,
          },
        });

    let updateEventCount = 0;

    processor.addEventListener(TraceModel.Processor.TraceParseProgressEvent.eventName, () => {
      updateEventCount++;
    });

    const rawEvents = await TraceLoader.rawEvents(this, 'web-dev.json.gz');
    await processor.parse(rawEvents).then(() => {
      assert.strictEqual(updateEventCount, 8);
    });
  });

  describe('handler sorting', () => {
    const baseHandler = {
      data() {},
      handleEvent() {},
      reset() {},
    };

    function fillHandlers(
        handlersDeps: {[key: string]: {deps ? () : TraceModel.Handlers.Types.TraceEventHandlerName[]}}):
        {[key: string]: TraceModel.Handlers.Types.TraceEventHandler} {
      const handlers: {[key: string]: TraceModel.Handlers.Types.TraceEventHandler} = {};
      for (const handler in handlersDeps) {
        handlers[handler] = {...baseHandler, ...handlersDeps[handler]};
      }
      return handlers;
    }

    it('sorts handlers satisfying their dependencies 1', function() {
      const handlersDeps: {[key: string]: {deps ? () : TraceModel.Handlers.Types.TraceEventHandlerName[]}} = {
        'Meta': {},
        'GPU': {
          deps() {
            return ['Meta'];
          },
        },
        'LayoutShifts': {
          deps() {
            return ['GPU'];
          },
        },
        'NetworkRequests': {
          deps() {
            return ['LayoutShifts'];
          },
        },
        'PageLoadMetrics': {
          deps() {
            return ['Renderer', 'GPU'];
          },
        },
        'Renderer': {
          deps() {
            return ['Screenshots'];
          },
        },
        'Screenshots': {
          deps() {
            return ['NetworkRequests', 'LayoutShifts'];
          },
        },
      };
      const handlers = fillHandlers(handlersDeps);

      const expectedOrder =
          ['Meta', 'GPU', 'LayoutShifts', 'NetworkRequests', 'Screenshots', 'Renderer', 'PageLoadMetrics'];
      assert.deepEqual([...TraceModel.Processor.sortHandlers(handlers).keys()], expectedOrder);
    });
    it('sorts handlers satisfying their dependencies 2', function() {
      const handlersDeps: {[key: string]: {deps ? () : TraceModel.Handlers.Types.TraceEventHandlerName[]}} = {
        'GPU': {
          deps() {
            return ['LayoutShifts', 'NetworkRequests'];
          },
        },
        'LayoutShifts': {
          deps() {
            return ['NetworkRequests'];
          },
        },
        'NetworkRequests': {},
      };
      const handlers = fillHandlers(handlersDeps);

      const expectedOrder = ['NetworkRequests', 'LayoutShifts', 'GPU'];
      assert.deepEqual([...TraceModel.Processor.sortHandlers(handlers).keys()], expectedOrder);
    });
    it('throws an error when a dependency cycle is present among handlers', function() {
      const handlersDeps: {[key: string]: {deps ? () : TraceModel.Handlers.Types.TraceEventHandlerName[]}} = {
        'Meta': {},
        'GPU': {
          deps() {
            return ['Meta'];
          },
        },
        'LayoutShifts': {
          deps() {
            return ['GPU', 'Renderer'];
          },
        },
        'NetworkRequests': {
          deps() {
            return ['LayoutShifts'];
          },
        },
        'Renderer': {
          deps() {
            return ['NetworkRequests'];
          },
        },
      };
      const handlers = fillHandlers(handlersDeps);
      const cyclePath = 'LayoutShifts->Renderer->NetworkRequests->LayoutShifts';
      assert.throws(
          () => TraceModel.Processor.sortHandlers(handlers),
          `Found dependency cycle in trace event handlers: ${cyclePath}`);
    });
  });

  describe('insights', () => {
    it('returns no insights if no navigations', async function() {
      const processor = TraceModel.Processor.TraceProcessor.createWithAllHandlers();
      const file = await TraceLoader.rawEvents(this, 'basic.json.gz');

      await processor.parse(file);
      if (!processor.insights) {
        throw new Error('No insights');
      }

      assert.strictEqual(processor.insights.size, 0);
    });

    it('captures errors thrown by insights', async function() {
      const processor = TraceModel.Processor.TraceProcessor.createWithAllHandlers();
      const file = await TraceLoader.rawEvents(this, 'load-simple.json.gz');

      await processor.parse(file);

      // Create invalid trace data that forces insights to throw an error
      processor.traceParsedData?.NetworkRequests.byTime.forEach(r => {
        // @ts-expect-error
        r.args.data = null;
      });

      if (!processor.insights) {
        throw new Error('No insights');
      }

      const insights = Array.from(processor.insights.values());
      assert.strictEqual(insights.length, 1);
      assert(insights[0].RenderBlocking instanceof Error, 'RenderBlocking did not throw an error');
    });

    it('skips insights that are missing one or more dependencies', async function() {
      const processor = new TraceModel.Processor.TraceProcessor({
        Animation: TraceModel.Handlers.ModelHandlers.Animations,
      });
      const file = await TraceLoader.rawEvents(this, 'load-simple.json.gz');

      await processor.parse(file);
      if (!processor.insights) {
        throw new Error('No insights');
      }

      const insights = Array.from(processor.insights.values());
      assert.strictEqual(processor.insights.size, 1);
      assert.isUndefined(insights[0].RenderBlocking);
    });

    it('returns insights for a navigation', async function() {
      const processor = TraceModel.Processor.TraceProcessor.createWithAllHandlers();
      const file = await TraceLoader.rawEvents(this, 'load-simple.json.gz');

      await processor.parse(file);
      if (!processor.insights) {
        throw new Error('No insights');
      }

      const insights = Array.from(processor.insights.values());
      assert.strictEqual(insights.length, 1);

      if (insights[0].RenderBlocking instanceof Error) {
        throw new Error('RenderBlocking threw an error');
      }

      assert.strictEqual(insights[0].RenderBlocking.renderBlockingRequests.length, 3);
    });

    it('returns insights for multiple navigations', async function() {
      const processor = TraceModel.Processor.TraceProcessor.createWithAllHandlers();
      const file = await TraceLoader.rawEvents(this, 'multiple-navigations.json.gz');

      await processor.parse(file);
      if (!processor.insights) {
        throw new Error('No insights');
      }

      const insights = Array.from(processor.insights.values());
      assert.strictEqual(insights.length, 3);

      if (insights[0].RenderBlocking instanceof Error) {
        throw new Error('RenderBlocking threw an error');
      }
      if (insights[1].RenderBlocking instanceof Error) {
        throw new Error('RenderBlocking threw an error');
      }
      if (insights[2].RenderBlocking instanceof Error) {
        throw new Error('RenderBlocking threw an error');
      }

      assert.strictEqual(insights[0].RenderBlocking.renderBlockingRequests.length, 0);
      assert.strictEqual(insights[1].RenderBlocking.renderBlockingRequests.length, 0);
      assert.strictEqual(insights[2].RenderBlocking.renderBlockingRequests.length, 1);
    });
  });
});
