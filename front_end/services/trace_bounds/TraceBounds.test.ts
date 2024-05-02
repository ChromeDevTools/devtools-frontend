// Copyright 2023 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as TraceEngine from '../../models/trace/trace.js';
import * as TraceBounds from './trace_bounds.js';

const baseTraceWindow: TraceEngine.Types.Timing.TraceWindowMicroSeconds = {
  min: TraceEngine.Types.Timing.MicroSeconds(0),
  max: TraceEngine.Types.Timing.MicroSeconds(10_000),
  range: TraceEngine.Types.Timing.MicroSeconds(10_000),
};
const baseTraceWindowMilli: TraceEngine.Types.Timing.TraceWindowMilliSeconds =
    TraceEngine.Helpers.Timing.traceWindowMilliSeconds(baseTraceWindow);

describe('TraceBounds', () => {
  it('is initialized with the entire trace window and sets the state accordingly', async () => {
    const manager =
        TraceBounds.TraceBounds.BoundsManager.instance({forceNew: true}).resetWithNewBounds(baseTraceWindow);
    assert.deepEqual(manager.state(), {
      micro: {
        entireTraceBounds: baseTraceWindow,
        minimapTraceBounds: baseTraceWindow,
        timelineTraceWindow: baseTraceWindow,
      },
      milli: {
        entireTraceBounds: baseTraceWindowMilli,
        minimapTraceBounds: baseTraceWindowMilli,
        timelineTraceWindow: baseTraceWindowMilli,
      },
    });
  });

  it('can update the minimap bounds and dispatches a state change event', async () => {
    const manager =
        TraceBounds.TraceBounds.BoundsManager.instance({forceNew: true}).resetWithNewBounds(baseTraceWindow);
    const onStateChange = sinon.spy();
    manager.addEventListener(TraceBounds.TraceBounds.StateChangedEvent.eventName, onStateChange);

    const newMiniMapBounds = {
      min: TraceEngine.Types.Timing.MicroSeconds(10_000),
      max: TraceEngine.Types.Timing.MicroSeconds(20_000),
      range: TraceEngine.Types.Timing.MicroSeconds(10_000),
    };

    manager.setMiniMapBounds(newMiniMapBounds);
    assert.strictEqual(onStateChange.callCount, 1);
    const dataFromEvent = onStateChange.firstCall.args[0] as TraceBounds.TraceBounds.StateChangedEvent;
    assert.strictEqual(dataFromEvent.updateType, 'MINIMAP_BOUNDS');
    assert.deepEqual(dataFromEvent.state.micro, {
      entireTraceBounds: baseTraceWindow,
      minimapTraceBounds: newMiniMapBounds,
      timelineTraceWindow: baseTraceWindow,
    });
  });

  it('dispatches an event when the bounds are completely reset', async () => {
    const manager =
        TraceBounds.TraceBounds.BoundsManager.instance({forceNew: true}).resetWithNewBounds(baseTraceWindow);

    const onStateChange = sinon.spy();
    manager.addEventListener(TraceBounds.TraceBounds.StateChangedEvent.eventName, onStateChange);

    const newBounds = {
      min: TraceEngine.Types.Timing.MicroSeconds(1_000),
      max: TraceEngine.Types.Timing.MicroSeconds(5_000),
      range: TraceEngine.Types.Timing.MicroSeconds(4_000),
    };
    const newBoundsMilli = TraceEngine.Helpers.Timing.traceWindowMilliSeconds(newBounds);
    manager.resetWithNewBounds(newBounds);

    assert.strictEqual(onStateChange.callCount, 1);
    const dataFromEvent = onStateChange.firstCall.args[0] as TraceBounds.TraceBounds.StateChangedEvent;
    assert.strictEqual(dataFromEvent.updateType, 'RESET');
    assert.deepEqual(dataFromEvent.state, {
      micro: {
        entireTraceBounds: newBounds,
        minimapTraceBounds: newBounds,
        timelineTraceWindow: newBounds,
      },
      milli: {
        entireTraceBounds: newBoundsMilli,
        minimapTraceBounds: newBoundsMilli,
        timelineTraceWindow: newBoundsMilli,
      },
    });
  });

  it('can update the visible timeline window and dispatch an event', async () => {
    const manager =
        TraceBounds.TraceBounds.BoundsManager.instance({forceNew: true}).resetWithNewBounds(baseTraceWindow);
    const onStateChange = sinon.spy();
    manager.addEventListener(TraceBounds.TraceBounds.StateChangedEvent.eventName, onStateChange);

    const newVisibleWindow = {
      min: TraceEngine.Types.Timing.MicroSeconds(10_000),
      max: TraceEngine.Types.Timing.MicroSeconds(20_000),
      range: TraceEngine.Types.Timing.MicroSeconds(10_000),
    };

    manager.setTimelineVisibleWindow(newVisibleWindow);

    assert.strictEqual(onStateChange.callCount, 1);
    const dataFromEvent = onStateChange.firstCall.args[0] as TraceBounds.TraceBounds.StateChangedEvent;
    assert.strictEqual(dataFromEvent.updateType, 'VISIBLE_WINDOW');
    assert.deepEqual(dataFromEvent.state.micro, {
      entireTraceBounds: baseTraceWindow,
      minimapTraceBounds: baseTraceWindow,
      timelineTraceWindow: newVisibleWindow,
    });
  });

  it('does not update or dispatch if the range of the new trace window is less than 1ms', async () => {
    const manager =
        TraceBounds.TraceBounds.BoundsManager.instance({forceNew: true}).resetWithNewBounds(baseTraceWindow);
    const onStateChange = sinon.spy();
    manager.addEventListener(TraceBounds.TraceBounds.StateChangedEvent.eventName, onStateChange);

    const newVisibleWindow = {
      min: TraceEngine.Types.Timing.MicroSeconds(10_000),
      max: TraceEngine.Types.Timing.MicroSeconds(10_500),
      range: TraceEngine.Types.Timing.MicroSeconds(500),
    };

    manager.setTimelineVisibleWindow(newVisibleWindow);
    assert.strictEqual(onStateChange.callCount, 0);
    assert.deepEqual(manager.state()?.micro, {
      entireTraceBounds: baseTraceWindow,
      minimapTraceBounds: baseTraceWindow,
      timelineTraceWindow: baseTraceWindow,
    });
  });

  it('does not update or dispatch if the range of the new minimap bounds is less than 1ms', async () => {
    const manager =
        TraceBounds.TraceBounds.BoundsManager.instance({forceNew: true}).resetWithNewBounds(baseTraceWindow);
    const onStateChange = sinon.spy();
    manager.addEventListener(TraceBounds.TraceBounds.StateChangedEvent.eventName, onStateChange);

    const newMiniMapBounds = {
      min: TraceEngine.Types.Timing.MicroSeconds(10_000),
      max: TraceEngine.Types.Timing.MicroSeconds(10_500),
      range: TraceEngine.Types.Timing.MicroSeconds(500),
    };

    manager.setMiniMapBounds(newMiniMapBounds);
    assert.strictEqual(onStateChange.callCount, 0);
    assert.deepEqual(manager.state()?.micro, {
      entireTraceBounds: baseTraceWindow,
      minimapTraceBounds: baseTraceWindow,
      timelineTraceWindow: baseTraceWindow,
    });
  });
});
