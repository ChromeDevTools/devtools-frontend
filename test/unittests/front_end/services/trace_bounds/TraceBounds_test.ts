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

describe('TraceBounds', () => {
  it('is initialized with the entire trace window and sets the state accordingly', async () => {
    const manager = TraceBounds.TraceBounds.BoundsManager.instance({forceNew: true, initialBounds: baseTraceWindow});
    assert.deepEqual(manager.state, {
      entireTraceBounds: baseTraceWindow,
      minimapTraceBounds: baseTraceWindow,
      timelineTraceWindow: baseTraceWindow,
    });
  });

  it('can update the minimap bounds and dispatches events', async () => {
    const manager = TraceBounds.TraceBounds.BoundsManager.instance({forceNew: true, initialBounds: baseTraceWindow});
    const onMiniMapBoundsChange = sinon.spy();
    manager.addEventListener(TraceBounds.TraceBounds.MiniMapBoundsChanged.eventName, onMiniMapBoundsChange);

    const newMiniMapBounds = {
      min: TraceEngine.Types.Timing.MicroSeconds(10_000),
      max: TraceEngine.Types.Timing.MicroSeconds(20_000),
      range: TraceEngine.Types.Timing.MicroSeconds(10_000),
    };

    manager.setMiniMapBounds(newMiniMapBounds);
    assert.strictEqual(onMiniMapBoundsChange.callCount, 1);
    const dataFromEvent = onMiniMapBoundsChange.firstCall.args[0] as TraceBounds.TraceBounds.MiniMapBoundsChanged;
    assert.deepEqual(dataFromEvent.state, {
      entireTraceBounds: baseTraceWindow,
      minimapTraceBounds: newMiniMapBounds,
      timelineTraceWindow: baseTraceWindow,
    });
  });

  it('can update the visible timeline window and dispatch an event', async () => {
    const manager = TraceBounds.TraceBounds.BoundsManager.instance({forceNew: true, initialBounds: baseTraceWindow});
    const onVisibleWindowChange = sinon.spy();
    manager.addEventListener(TraceBounds.TraceBounds.TimelineVisibleWindowChanged.eventName, onVisibleWindowChange);

    const newVisibleWindow = {
      min: TraceEngine.Types.Timing.MicroSeconds(10_000),
      max: TraceEngine.Types.Timing.MicroSeconds(20_000),
      range: TraceEngine.Types.Timing.MicroSeconds(10_000),
    };

    manager.setTimelineVisibleWindow(newVisibleWindow);

    assert.strictEqual(onVisibleWindowChange.callCount, 1);
    const dataFromEvent =
        onVisibleWindowChange.firstCall.args[0] as TraceBounds.TraceBounds.TimelineVisibleWindowChanged;
    assert.deepEqual(dataFromEvent.state, {
      entireTraceBounds: baseTraceWindow,
      minimapTraceBounds: baseTraceWindow,
      timelineTraceWindow: newVisibleWindow,
    });
  });

  it('does not update or dispatch if the range of the new trace window is less than 1ms', async () => {
    const manager = TraceBounds.TraceBounds.BoundsManager.instance({forceNew: true, initialBounds: baseTraceWindow});
    const onVisibleWindowChange = sinon.spy();
    manager.addEventListener(TraceBounds.TraceBounds.TimelineVisibleWindowChanged.eventName, onVisibleWindowChange);

    const newVisibleWindow = {
      min: TraceEngine.Types.Timing.MicroSeconds(10_000),
      max: TraceEngine.Types.Timing.MicroSeconds(10_500),
      range: TraceEngine.Types.Timing.MicroSeconds(500),
    };

    manager.setTimelineVisibleWindow(newVisibleWindow);
    assert.strictEqual(onVisibleWindowChange.callCount, 0);
    assert.deepEqual(manager.state, {
      entireTraceBounds: baseTraceWindow,
      minimapTraceBounds: baseTraceWindow,
      timelineTraceWindow: baseTraceWindow,
    });
  });

  it('does not update or dispatch if the range of the new minimap bounds is less than 5ms', async () => {
    const manager = TraceBounds.TraceBounds.BoundsManager.instance({forceNew: true, initialBounds: baseTraceWindow});
    const onMiniMapBoundsChange = sinon.spy();
    manager.addEventListener(TraceBounds.TraceBounds.MiniMapBoundsChanged.eventName, onMiniMapBoundsChange);

    const newMiniMapBounds = {
      min: TraceEngine.Types.Timing.MicroSeconds(10_000),
      max: TraceEngine.Types.Timing.MicroSeconds(14_500),
      range: TraceEngine.Types.Timing.MicroSeconds(4_500),
    };

    manager.setMiniMapBounds(newMiniMapBounds);
    assert.strictEqual(onMiniMapBoundsChange.callCount, 0);
    assert.deepEqual(manager.state, {
      entireTraceBounds: baseTraceWindow,
      minimapTraceBounds: baseTraceWindow,
      timelineTraceWindow: baseTraceWindow,
    });
  });
});
