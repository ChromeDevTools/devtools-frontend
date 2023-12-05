// Copyright 2023 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

const {assert} = chai;
import * as TraceEngine from '../../../../../../front_end/models/trace/trace.js';
import {TraceLoader} from '../../../helpers/TraceLoader.js';
import {describeWithMockConnection} from '../../../helpers/MockConnection.js';

async function processTrace(events: readonly TraceEngine.Types.TraceEvents.TraceEventData[]): Promise<void> {
  // The FramesHandler depends on a few other handlers, so we run all of them as part of these tests.
  const handlersInOrder: TraceEngine.Handlers.Types.TraceEventHandlerName[] = [
    'Meta',
    'Samples',
    'AuctionWorklets',
    'Renderer',
    'LayerTree',
    'Frames',
  ];
  for (const handlerName of handlersInOrder) {
    const handler = TraceEngine.Handlers.ModelHandlers[handlerName];
    handler.reset();
    if ('initialize' in handler) {
      handler.initialize();
    }
  }
  for (const event of events) {
    for (const handlerName of handlersInOrder) {
      TraceEngine.Handlers.ModelHandlers[handlerName].handleEvent(event);
    }
  }
  for (const handlerName of handlersInOrder) {
    const handler = TraceEngine.Handlers.ModelHandlers[handlerName];
    if ('finalize' in handler) {
      await handler.finalize();
    }
  }
}

describeWithMockConnection('FramesHandler', () => {
  it('can parse out a trace and return the frames', async function() {
    const rawEvents = await TraceLoader.rawEvents(this, 'web-dev-with-commit.json.gz');
    await processTrace(rawEvents);

    const parsedFrames = TraceEngine.Handlers.ModelHandlers.Frames.data().frames;
    assert.lengthOf(parsedFrames, 18);

    // Assert a couple of frames to check the data, including one that is partial and was dropped.
    assert.strictEqual(parsedFrames[0].startTime, 122411104714);
    assert.strictEqual(parsedFrames[0].duration, 37847);
    assert.isFalse(parsedFrames[0].isPartial);
    assert.isFalse(parsedFrames[0].isPartial);

    assert.strictEqual(parsedFrames[2].startTime, 122411159244);
    assert.strictEqual(parsedFrames[2].duration, 16683);
    assert.isTrue(parsedFrames[2].isPartial);
    assert.isTrue(parsedFrames[2].dropped);
  });

  it('can create LayerPaintEvents from Paint and snapshot events', async function() {
    // Advanced instrumentation trace file is large: allow the bots more time
    // to process it.
    this.timeout(20_000);

    const rawEvents = await TraceLoader.rawEvents(this, 'web-dev-with-advanced-instrumentation.json.gz');
    await processTrace(rawEvents);
    const parsedFrames = TraceEngine.Handlers.ModelHandlers.Frames.data().frames;
    assert.lengthOf(parsedFrames, 25);
    const frameWithPaints = parsedFrames.at(2);
    if (!frameWithPaints) {
      throw new Error('Could not find frame at index 2');
    }
    // Check we have the right one.
    assert.strictEqual(frameWithPaints.seqId, 1127448);
    assert.lengthOf(frameWithPaints.paints, 7);
  });

  it('can return frames within a given window', async function() {
    const rawEvents = await TraceLoader.rawEvents(this, 'web-dev-with-commit.json.gz');
    await processTrace(rawEvents);

    const parsedFrames = TraceEngine.Handlers.ModelHandlers.Frames.data().frames;
    assert.lengthOf(parsedFrames, 18);

    const startTime = TraceEngine.Types.Timing.MicroSeconds(parsedFrames[0].startTime);
    const endTime = TraceEngine.Types.Timing.MicroSeconds(parsedFrames[3].endTime);
    const framesWithinWindow =
        TraceEngine.Handlers.ModelHandlers.Frames.framesWithinWindow(parsedFrames, startTime, endTime);
    assert.deepEqual(framesWithinWindow, [
      parsedFrames[0],
      parsedFrames[1],
      parsedFrames[2],
      parsedFrames[3],
    ]);
  });
});
