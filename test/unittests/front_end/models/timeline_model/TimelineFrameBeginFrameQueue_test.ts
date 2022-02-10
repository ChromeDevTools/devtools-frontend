// Copyright 2021 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

const {assert} = chai;

import * as TimelineModel from '../../../../../front_end/models/timeline_model/timeline_model.js';

describe('TimelineFrameBeginFrameQueue', () => {
  it('visualizes zero frames when no BeginFrames are added', () => {
    const beginFrameQueue = new TimelineModel.TimelineFrameModel.TimelineFrameBeginFrameQueue();
    const framesToVisualize = beginFrameQueue.processPendingBeginFramesOnDrawFrame(100);

    assert.isEmpty(framesToVisualize);
  });

  it('visualizes zero frames when no BeginFrame in queue matches DrawFrame', () => {
    const beginFrameQueue = new TimelineModel.TimelineFrameModel.TimelineFrameBeginFrameQueue();
    beginFrameQueue.addFrameIfNotExists(100, 1000000, false, false);
    beginFrameQueue.addFrameIfNotExists(101, 1000016, false, false);
    beginFrameQueue.addFrameIfNotExists(102, 1000032, false, false);
    const framesToVisualize = beginFrameQueue.processPendingBeginFramesOnDrawFrame(103);

    assert.isEmpty(framesToVisualize);
  });

  it('ignores BeginFrames without corresponding DrawFrames', () => {
    const beginFrameQueue = new TimelineModel.TimelineFrameModel.TimelineFrameBeginFrameQueue();
    beginFrameQueue.addFrameIfNotExists(100, 1000000, false, false);
    beginFrameQueue.addFrameIfNotExists(101, 1000016, false, false);
    beginFrameQueue.addFrameIfNotExists(102, 1000032, false, false);
    beginFrameQueue.addFrameIfNotExists(103, 1000048, false, false);

    const framesToVisualize = beginFrameQueue.processPendingBeginFramesOnDrawFrame(102);

    // Visualized frame: 102 (non-dropped).
    // The other frames that are neither drawn nor dropped (100, 101) are
    // excluded from visualization.
    assert.lengthOf(framesToVisualize, 1);
    assert.isFalse(framesToVisualize[0].isDropped);
    assert.strictEqual(framesToVisualize[0].seqId, 102);
    assert.strictEqual(framesToVisualize[0].startTime, 1000032);
  });

  it('visualizes dropped BeginFrames before a presented frame', () => {
    const beginFrameQueue = new TimelineModel.TimelineFrameModel.TimelineFrameBeginFrameQueue();
    beginFrameQueue.addFrameIfNotExists(100, 1000000, false, false);
    beginFrameQueue.addFrameIfNotExists(101, 1000016, true, false);
    beginFrameQueue.addFrameIfNotExists(102, 1000032, false, false);
    beginFrameQueue.addFrameIfNotExists(103, 1000048, true, false);
    beginFrameQueue.addFrameIfNotExists(104, 1000064, false, false);
    beginFrameQueue.addFrameIfNotExists(105, 1000080, false, false);
    beginFrameQueue.addFrameIfNotExists(106, 1000096, false, false);

    const framesToVisualize = beginFrameQueue.processPendingBeginFramesOnDrawFrame(105);

    // Visualized frames: 101 (dropped), 103 (dropped) and 105 (non-dropped).
    // The other frames that are neither drawn nor dropped (100, 102 and 104)
    // are excluded from visualization.
    assert.lengthOf(framesToVisualize, 3);

    assert.isTrue(framesToVisualize[0].isDropped);
    assert.strictEqual(framesToVisualize[0].seqId, 101);
    assert.strictEqual(framesToVisualize[0].startTime, 1000016);

    assert.isTrue(framesToVisualize[1].isDropped);
    assert.strictEqual(framesToVisualize[1].seqId, 103);
    assert.strictEqual(framesToVisualize[1].startTime, 1000048);

    assert.isFalse(framesToVisualize[2].isDropped);
    assert.strictEqual(framesToVisualize[2].seqId, 105);
    assert.strictEqual(framesToVisualize[2].startTime, 1000080);
  });

  it('changes dropped status of specified frames via setDropped()', () => {
    const beginFrameQueue = new TimelineModel.TimelineFrameModel.TimelineFrameBeginFrameQueue();
    beginFrameQueue.addFrameIfNotExists(100, 1000000, false, false);
    beginFrameQueue.setDropped(100, true);
    beginFrameQueue.addFrameIfNotExists(101, 1000016, true, false);
    beginFrameQueue.addFrameIfNotExists(102, 1000032, false, false);
    beginFrameQueue.addFrameIfNotExists(103, 1000048, true, false);
    beginFrameQueue.addFrameIfNotExists(104, 1000064, false, false);
    beginFrameQueue.addFrameIfNotExists(105, 1000080, false, false);
    beginFrameQueue.addFrameIfNotExists(106, 1000096, true, false);
    beginFrameQueue.setDropped(101, false);

    const framesToVisualize = beginFrameQueue.processPendingBeginFramesOnDrawFrame(105);

    // Visualized frames: 100 (dropped), 103 (dropped) and 105 (non-dropped).
    // The other frames that are neither drawn nor dropped (101, 102 and 104)
    // are excluded from visualization.
    assert.lengthOf(framesToVisualize, 3);

    assert.isTrue(framesToVisualize[0].isDropped);
    assert.strictEqual(framesToVisualize[0].seqId, 100);
    assert.strictEqual(framesToVisualize[0].startTime, 1000000);

    assert.isTrue(framesToVisualize[1].isDropped);
    assert.strictEqual(framesToVisualize[1].seqId, 103);
    assert.strictEqual(framesToVisualize[1].startTime, 1000048);

    assert.isFalse(framesToVisualize[2].isDropped);
    assert.strictEqual(framesToVisualize[2].seqId, 105);
    assert.strictEqual(framesToVisualize[2].startTime, 1000080);
  });

  it('pops processed frames out of the queue', () => {
    const beginFrameQueue = new TimelineModel.TimelineFrameModel.TimelineFrameBeginFrameQueue();
    beginFrameQueue.addFrameIfNotExists(100, 1000000, true, false);
    beginFrameQueue.addFrameIfNotExists(101, 1000016, false, false);
    beginFrameQueue.addFrameIfNotExists(102, 1000032, false, false);
    beginFrameQueue.addFrameIfNotExists(103, 1000048, true, false);
    beginFrameQueue.addFrameIfNotExists(104, 1000064, false, false);
    beginFrameQueue.addFrameIfNotExists(105, 1000080, true, false);
    beginFrameQueue.addFrameIfNotExists(106, 1000096, true, false);

    // Pop frame 100, 101 (not visualized) and 102 from queue.
    let framesToVisualize = beginFrameQueue.processPendingBeginFramesOnDrawFrame(102);

    assert.lengthOf(framesToVisualize, 2);

    assert.isTrue(framesToVisualize[0].isDropped);
    assert.strictEqual(framesToVisualize[0].seqId, 100);
    assert.strictEqual(framesToVisualize[0].startTime, 1000000);

    assert.isFalse(framesToVisualize[1].isDropped);
    assert.strictEqual(framesToVisualize[1].seqId, 102);
    assert.strictEqual(framesToVisualize[1].startTime, 1000032);

    // Pop frame 103, 104 (not visualized) and 105 from queue
    framesToVisualize = beginFrameQueue.processPendingBeginFramesOnDrawFrame(105);

    assert.lengthOf(framesToVisualize, 2);

    assert.isTrue(framesToVisualize[0].isDropped);
    assert.strictEqual(framesToVisualize[0].seqId, 103);
    assert.strictEqual(framesToVisualize[0].startTime, 1000048);

    assert.isTrue(framesToVisualize[1].isDropped);
    assert.strictEqual(framesToVisualize[1].seqId, 105);
    assert.strictEqual(framesToVisualize[1].startTime, 1000080);

    // Pop frame 106 from queue
    framesToVisualize = beginFrameQueue.processPendingBeginFramesOnDrawFrame(106);

    assert.lengthOf(framesToVisualize, 1);

    assert.isTrue(framesToVisualize[0].isDropped);
    assert.strictEqual(framesToVisualize[0].seqId, 106);
    assert.strictEqual(framesToVisualize[0].startTime, 1000096);
  });
});
