// Copyright 2023 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as TraceEngine from '../../../../../front_end/models/trace/trace.js';
import * as TraceBounds from '../../../../../front_end/services/trace_bounds/trace_bounds.js';

const baseTraceWindow: TraceEngine.Types.Timing.TraceWindow = {
  min: TraceEngine.Types.Timing.MicroSeconds(0),
  max: TraceEngine.Types.Timing.MicroSeconds(10_000),
  range: TraceEngine.Types.Timing.MicroSeconds(10_000),
};

const baseTraceWindowMilliSeconds: TraceEngine.Types.Timing.TraceWindowMilliSeconds = {
  min: TraceEngine.Types.Timing.MilliSeconds(0),
  max: TraceEngine.Types.Timing.MilliSeconds(10),
  range: TraceEngine.Types.Timing.MilliSeconds(10),
};
describe('TraceBounds', () => {
  it('is initialized with the entire trace window', async () => {
    const manager = TraceBounds.TraceBounds.BoundsManager.instance({forceNew: true, initialBounds: baseTraceWindow});
    assert.deepEqual(manager.entireTraceBoundsMicroSeconds(), baseTraceWindow);
    assert.deepEqual(manager.currentBoundsMicroSeconds(), baseTraceWindow);
  });

  it('provides values in milliseconds also', async () => {
    const manager = TraceBounds.TraceBounds.BoundsManager.instance({forceNew: true, initialBounds: baseTraceWindow});
    assert.deepEqual(manager.entireTraceBoundsMilliSeconds(), baseTraceWindowMilliSeconds);
    assert.deepEqual(manager.currentBoundsMilliSeconds(), baseTraceWindowMilliSeconds);
  });

  it('sets the new bounds and dispatches an event to any listeners', async () => {
    const manager = TraceBounds.TraceBounds.BoundsManager.instance({forceNew: true, initialBounds: baseTraceWindow});
    const onWindowChange = sinon.spy();
    manager.addEventListener(TraceBounds.TraceBounds.CurrentBoundsChanged.eventName, onWindowChange);

    const newBoundsMicroSeconds = {
      min: TraceEngine.Types.Timing.MicroSeconds(10_000),
      max: TraceEngine.Types.Timing.MicroSeconds(20_000),
      range: TraceEngine.Types.Timing.MicroSeconds(10_000),
    };
    const newBoundsMilliSeconds = TraceEngine.Helpers.Timing.traceWindowMilliSeconds(newBoundsMicroSeconds);

    manager.setNewBounds(newBoundsMicroSeconds);

    assert.strictEqual(onWindowChange.callCount, 1);
    const dataFromEvent = onWindowChange.firstCall.args[0] as TraceBounds.TraceBounds.CurrentBoundsChanged;
    assert.deepEqual(dataFromEvent.newBounds, newBoundsMicroSeconds);
    assert.deepEqual(dataFromEvent.newBoundsMilliSeconds, newBoundsMilliSeconds);

    assert.deepEqual(manager.currentBoundsMicroSeconds(), newBoundsMicroSeconds);
    assert.deepEqual(manager.currentBoundsMilliSeconds(), newBoundsMilliSeconds);
  });

  it('does not dispatch an event if the "new" bounds are identical to the existing ones', async () => {
    const manager = TraceBounds.TraceBounds.BoundsManager.instance({forceNew: true, initialBounds: baseTraceWindow});
    const onWindowChange = sinon.spy();
    manager.addEventListener(TraceBounds.TraceBounds.CurrentBoundsChanged.eventName, onWindowChange);

    manager.setNewBounds(baseTraceWindow);

    assert.strictEqual(onWindowChange.callCount, 0);
  });

  it('does not dispatch if the range of the new bounds is 1millseconds or less as that is too small', async () => {
    const manager = TraceBounds.TraceBounds.BoundsManager.instance({forceNew: true, initialBounds: baseTraceWindow});
    const onWindowChange = sinon.spy();
    manager.addEventListener(TraceBounds.TraceBounds.CurrentBoundsChanged.eventName, onWindowChange);

    const newBoundsMicroSeconds = {
      min: TraceEngine.Types.Timing.MicroSeconds(10_000),
      max: TraceEngine.Types.Timing.MicroSeconds(10_500),
      range: TraceEngine.Types.Timing.MicroSeconds(500),
    };
    manager.setNewBounds(newBoundsMicroSeconds);

    assert.strictEqual(onWindowChange.callCount, 0);
  });
});
