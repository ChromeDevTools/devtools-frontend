// Copyright 2023 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import {describeWithMockConnection} from '../../../testing/MockConnection.js';
import {TraceLoader} from '../../../testing/TraceLoader.js';
import * as Trace from '../trace.js';

async function processTrace(events: readonly Trace.Types.Events.Event[]): Promise<void> {
  // The FramesHandler depends on a few other handlers, so we run all of them as part of these tests.
  const handlersInOrder: Trace.Handlers.Types.HandlerName[] = [
    'Meta',
    'Samples',
    'AuctionWorklets',
    'Renderer',
    'LayerTree',
    'Frames',
  ];
  for (const handlerName of handlersInOrder) {
    const handler = Trace.Handlers.ModelHandlers[handlerName];
    handler.reset();
    if ('initialize' in handler) {
      handler.initialize();
    }
  }
  for (const event of events) {
    for (const handlerName of handlersInOrder) {
      Trace.Handlers.ModelHandlers[handlerName].handleEvent(event);
    }
  }
  for (const handlerName of handlersInOrder) {
    const handler = Trace.Handlers.ModelHandlers[handlerName];
    if ('finalize' in handler) {
      await handler.finalize();
    }
  }
}

describeWithMockConnection('FramesHandler', () => {
  it('can parse out a trace and return the frames', async function() {
    const rawEvents = await TraceLoader.rawEvents(this, 'web-dev-with-commit.json.gz');
    await processTrace(rawEvents);

    const parsedFrames = Trace.Handlers.ModelHandlers.Frames.data().frames;
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

  it('assigns each frame an index', async function() {
    const rawEvents = await TraceLoader.rawEvents(this, 'web-dev-with-commit.json.gz');
    await processTrace(rawEvents);

    const parsedFrames = Trace.Handlers.ModelHandlers.Frames.data().frames;
    assert.lengthOf(parsedFrames, 18);

    parsedFrames.forEach((frame, arrayIndex) => {
      // Seems silly, but this means we know the frame's index without having
      // to look it up in the trace data.
      assert.strictEqual(frame.index, arrayIndex);
    });
  });

  it('can create LayerPaintEvents from Paint and snapshot events', async function() {
    // Advanced instrumentation trace file is large: allow the bots more time
    // to process it.
    this.timeout(20_000);

    const rawEvents = await TraceLoader.rawEvents(this, 'web-dev-with-advanced-instrumentation.json.gz');
    await processTrace(rawEvents);
    const parsedFrames = Trace.Handlers.ModelHandlers.Frames.data().frames;
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

    const parsedFrames = Trace.Handlers.ModelHandlers.Frames.data().frames;
    assert.lengthOf(parsedFrames, 18);

    const startTime = Trace.Types.Timing.MicroSeconds(parsedFrames[0].startTime);
    const endTime = Trace.Types.Timing.MicroSeconds(parsedFrames[3].endTime);
    const framesWithinWindow = Trace.Handlers.ModelHandlers.Frames.framesWithinWindow(parsedFrames, startTime, endTime);
    assert.deepEqual(framesWithinWindow, [
      parsedFrames[0],
      parsedFrames[1],
      parsedFrames[2],
      parsedFrames[3],
    ]);
  });
});

describe('FramesHandler', () => {
  it('visualizes zero frames when no BeginFrames are added', () => {
    const beginFrameQueue = new Trace.Handlers.ModelHandlers.Frames.TimelineFrameBeginFrameQueue();
    const framesToVisualize = beginFrameQueue.processPendingBeginFramesOnDrawFrame(100);

    assert.isEmpty(framesToVisualize);
  });

  it('visualizes zero frames when no BeginFrame in queue matches DrawFrame', () => {
    const beginFrameQueue = new Trace.Handlers.ModelHandlers.Frames.TimelineFrameBeginFrameQueue();
    beginFrameQueue.addFrameIfNotExists(100, Trace.Types.Timing.MicroSeconds(1000000), false, false);
    beginFrameQueue.addFrameIfNotExists(101, Trace.Types.Timing.MicroSeconds(1000016), false, false);
    beginFrameQueue.addFrameIfNotExists(102, Trace.Types.Timing.MicroSeconds(1000032), false, false);
    const framesToVisualize = beginFrameQueue.processPendingBeginFramesOnDrawFrame(103);

    assert.isEmpty(framesToVisualize);
  });

  it('ignores BeginFrames without corresponding DrawFrames', () => {
    const beginFrameQueue = new Trace.Handlers.ModelHandlers.Frames.TimelineFrameBeginFrameQueue();
    beginFrameQueue.addFrameIfNotExists(100, Trace.Types.Timing.MicroSeconds(1000000), false, false);
    beginFrameQueue.addFrameIfNotExists(101, Trace.Types.Timing.MicroSeconds(1000016), false, false);
    beginFrameQueue.addFrameIfNotExists(102, Trace.Types.Timing.MicroSeconds(1000032), false, false);
    beginFrameQueue.addFrameIfNotExists(
        103, Trace.Types.Timing.MicroSeconds(Trace.Types.Timing.MicroSeconds(1000048)), false, false);

    const framesToVisualize = beginFrameQueue.processPendingBeginFramesOnDrawFrame(102);

    // Visualized frame: 102 (non-dropped).
    // The other frames that are neither drawn nor dropped (100, 101) are
    // excluded from visualization.
    assert.lengthOf(framesToVisualize, 1);
    assert.isFalse(framesToVisualize[0].isDropped);
    assert.strictEqual(framesToVisualize[0].seqId, 102);
    assert.strictEqual(framesToVisualize[0].startTime, Trace.Types.Timing.MicroSeconds(1000032));
  });

  it('visualizes dropped BeginFrames before a presented frame', () => {
    const beginFrameQueue = new Trace.Handlers.ModelHandlers.Frames.TimelineFrameBeginFrameQueue();
    beginFrameQueue.addFrameIfNotExists(100, Trace.Types.Timing.MicroSeconds(1000000), false, false);
    beginFrameQueue.addFrameIfNotExists(101, Trace.Types.Timing.MicroSeconds(1000016), true, false);
    beginFrameQueue.addFrameIfNotExists(102, Trace.Types.Timing.MicroSeconds(1000032), false, false);
    beginFrameQueue.addFrameIfNotExists(103, Trace.Types.Timing.MicroSeconds(1000048), true, false);
    beginFrameQueue.addFrameIfNotExists(104, Trace.Types.Timing.MicroSeconds(1000064), false, false);
    beginFrameQueue.addFrameIfNotExists(105, Trace.Types.Timing.MicroSeconds(1000080), false, false);
    beginFrameQueue.addFrameIfNotExists(106, Trace.Types.Timing.MicroSeconds(1000096), false, false);

    const framesToVisualize = beginFrameQueue.processPendingBeginFramesOnDrawFrame(105);

    // Visualized frames: 101 (dropped), 103 (dropped) and 105 (non-dropped).
    // The other frames that are neither drawn nor dropped (100, 102 and 104)
    // are excluded from visualization.
    assert.lengthOf(framesToVisualize, 3);

    assert.isTrue(framesToVisualize[0].isDropped);
    assert.strictEqual(framesToVisualize[0].seqId, 101);
    assert.strictEqual(framesToVisualize[0].startTime, Trace.Types.Timing.MicroSeconds(1000016));

    assert.isTrue(framesToVisualize[1].isDropped);
    assert.strictEqual(framesToVisualize[1].seqId, 103);
    assert.strictEqual(framesToVisualize[1].startTime, Trace.Types.Timing.MicroSeconds(1000048));

    assert.isFalse(framesToVisualize[2].isDropped);
    assert.strictEqual(framesToVisualize[2].seqId, 105);
    assert.strictEqual(framesToVisualize[2].startTime, Trace.Types.Timing.MicroSeconds(1000080));
  });

  it('changes dropped status of specified frames via setDropped()', () => {
    const beginFrameQueue = new Trace.Handlers.ModelHandlers.Frames.TimelineFrameBeginFrameQueue();
    beginFrameQueue.addFrameIfNotExists(100, Trace.Types.Timing.MicroSeconds(1000000), false, false);
    beginFrameQueue.setDropped(100, true);
    beginFrameQueue.addFrameIfNotExists(101, Trace.Types.Timing.MicroSeconds(1000016), true, false);
    beginFrameQueue.addFrameIfNotExists(102, Trace.Types.Timing.MicroSeconds(1000032), false, false);
    beginFrameQueue.addFrameIfNotExists(103, Trace.Types.Timing.MicroSeconds(1000048), true, false);
    beginFrameQueue.addFrameIfNotExists(104, Trace.Types.Timing.MicroSeconds(1000064), false, false);
    beginFrameQueue.addFrameIfNotExists(105, Trace.Types.Timing.MicroSeconds(1000080), false, false);
    beginFrameQueue.addFrameIfNotExists(106, Trace.Types.Timing.MicroSeconds(1000096), true, false);
    beginFrameQueue.setDropped(101, false);

    const framesToVisualize = beginFrameQueue.processPendingBeginFramesOnDrawFrame(105);

    // Visualized frames: 100 (dropped), 103 (dropped) and 105 (non-dropped).
    // The other frames that are neither drawn nor dropped (101, 102 and 104)
    // are excluded from visualization.
    assert.lengthOf(framesToVisualize, 3);

    assert.isTrue(framesToVisualize[0].isDropped);
    assert.strictEqual(framesToVisualize[0].seqId, 100);
    assert.strictEqual(framesToVisualize[0].startTime, Trace.Types.Timing.MicroSeconds(1000000));

    assert.isTrue(framesToVisualize[1].isDropped);
    assert.strictEqual(framesToVisualize[1].seqId, 103);
    assert.strictEqual(framesToVisualize[1].startTime, Trace.Types.Timing.MicroSeconds(1000048));

    assert.isFalse(framesToVisualize[2].isDropped);
    assert.strictEqual(framesToVisualize[2].seqId, 105);
    assert.strictEqual(framesToVisualize[2].startTime, Trace.Types.Timing.MicroSeconds(1000080));
  });

  it('pops processed frames out of the queue', () => {
    const beginFrameQueue = new Trace.Handlers.ModelHandlers.Frames.TimelineFrameBeginFrameQueue();
    beginFrameQueue.addFrameIfNotExists(100, Trace.Types.Timing.MicroSeconds(1000000), true, false);
    beginFrameQueue.addFrameIfNotExists(101, Trace.Types.Timing.MicroSeconds(1000016), false, false);
    beginFrameQueue.addFrameIfNotExists(102, Trace.Types.Timing.MicroSeconds(1000032), false, false);
    beginFrameQueue.addFrameIfNotExists(103, Trace.Types.Timing.MicroSeconds(1000048), true, false);
    beginFrameQueue.addFrameIfNotExists(104, Trace.Types.Timing.MicroSeconds(1000064), false, false);
    beginFrameQueue.addFrameIfNotExists(105, Trace.Types.Timing.MicroSeconds(1000080), true, false);
    beginFrameQueue.addFrameIfNotExists(106, Trace.Types.Timing.MicroSeconds(1000096), true, false);

    // Pop frame 100, 101 (not visualized) and 102 from queue.
    let framesToVisualize = beginFrameQueue.processPendingBeginFramesOnDrawFrame(102);

    assert.lengthOf(framesToVisualize, 2);

    assert.isTrue(framesToVisualize[0].isDropped);
    assert.strictEqual(framesToVisualize[0].seqId, 100);
    assert.strictEqual(framesToVisualize[0].startTime, Trace.Types.Timing.MicroSeconds(1000000));

    assert.isFalse(framesToVisualize[1].isDropped);
    assert.strictEqual(framesToVisualize[1].seqId, 102);
    assert.strictEqual(framesToVisualize[1].startTime, Trace.Types.Timing.MicroSeconds(1000032));

    // Pop frame 103, 104 (not visualized) and 105 from queue
    framesToVisualize = beginFrameQueue.processPendingBeginFramesOnDrawFrame(105);

    assert.lengthOf(framesToVisualize, 2);

    assert.isTrue(framesToVisualize[0].isDropped);
    assert.strictEqual(framesToVisualize[0].seqId, 103);
    assert.strictEqual(framesToVisualize[0].startTime, Trace.Types.Timing.MicroSeconds(1000048));

    assert.isTrue(framesToVisualize[1].isDropped);
    assert.strictEqual(framesToVisualize[1].seqId, 105);
    assert.strictEqual(framesToVisualize[1].startTime, Trace.Types.Timing.MicroSeconds(1000080));

    // Pop frame 106 from queue
    framesToVisualize = beginFrameQueue.processPendingBeginFramesOnDrawFrame(106);

    assert.lengthOf(framesToVisualize, 1);

    assert.isTrue(framesToVisualize[0].isDropped);
    assert.strictEqual(framesToVisualize[0].seqId, 106);
    assert.strictEqual(framesToVisualize[0].startTime, Trace.Types.Timing.MicroSeconds(1000096));
  });
});
