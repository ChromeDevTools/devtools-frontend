// Copyright 2023 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import type * as TraceModel from '../../../../../front_end/models/trace/trace.js';
import * as Worker from '../../../../../front_end/models/trace/worker/worker.js';

const {assert} = chai;

import {loadEventsFromTraceFile} from '../../helpers/TraceHelpers.js';

describe('TraceProcessor', async () => {
  it('can use a trace processor', async () => {
    const processor = Worker.Processor.TraceProcessor.create();
    const file = await loadEventsFromTraceFile('basic.json.gz');

    // Check parsing after instantiation.
    assert.isNull(processor.data);
    await processor.parse(file);
    assert.isNotNull(processor.data);

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
    assert.isNull(processor.data);
    await processor.parse(file);
    assert.isNotNull(processor.data);
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
    assert.isNull(processor.data);
    await processor.parse(file);
    assert.isNotNull(processor.data);
    processor.reset();
    assert.isNull(processor.data);

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
    assert.isNull(processor.data);
    await processor.parse(file);
    assert.isNotNull(processor.data);
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

    it('sorts handlers satisfying their dependencies 1', () => {
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
      assert.deepEqual([...Worker.Processor.sortHandlers(handlers).keys()], expectedOrder);
    });
    it('sorts handlers satisfying their dependencies 2', () => {
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
      assert.deepEqual([...Worker.Processor.sortHandlers(handlers).keys()], expectedOrder);
    });
    it('throws an error when a dependency cycle is present among handlers', () => {
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
          () => Worker.Processor.sortHandlers(handlers),
          `Found dependency cycle in trace event handlers: ${cyclePath}`);
    });
  });
});
