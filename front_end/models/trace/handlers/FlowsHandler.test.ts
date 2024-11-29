// Copyright 2024 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import {
  makeCompleteEvent,
  makeFlowPhaseEvent,
} from '../../../testing/TraceHelpers.js';
import * as Trace from '../trace.js';

async function getFlowsHandlerData(events: Trace.Types.Events.Event[]):
    Promise<ReturnType<typeof Trace.Handlers.ModelHandlers.Flows.data>> {
  Trace.Handlers.ModelHandlers.Flows.reset();
  for (const event of events) {
    Trace.Handlers.ModelHandlers.Flows.handleEvent(event);
  }
  await Trace.Handlers.ModelHandlers.Flows.finalize();
  return Trace.Handlers.ModelHandlers.Flows.data();
}
const cat = 'mewtwo';
const pid = 0;
const tid = 0;

describe('FlowsHandler', function() {
  it('parses a flow correctly', async () => {
    const events = [
      // Trace events linked to flow phase events.
      makeCompleteEvent('A', 0, 10, cat, pid, tid),
      makeCompleteEvent('B', 10, 10, cat, pid, tid),
      makeCompleteEvent('C', 20, 10, cat, pid, tid),

      // Flow phase events
      makeFlowPhaseEvent('A', 0, cat, Trace.Types.Events.Phase.FLOW_START, 1, pid, tid),
      makeFlowPhaseEvent('A', 10, cat, Trace.Types.Events.Phase.FLOW_STEP, 1, pid, tid),
      makeFlowPhaseEvent('A', 20, cat, Trace.Types.Events.Phase.FLOW_END, 1, pid, tid),

    ];

    const {flows} = await getFlowsHandlerData(events);
    assert.lengthOf(flows, 1);
    assert.deepEqual(flows[0], events.slice(0, 3));
  });
  it('handles multiple flows with the same group token', async function() {
    const events = [
      // Flow 1 phase events
      makeFlowPhaseEvent('A', 0, cat, Trace.Types.Events.Phase.FLOW_START, 1, pid, tid),
      makeFlowPhaseEvent('A', 10, cat, Trace.Types.Events.Phase.FLOW_STEP, 1, pid, tid),
      makeFlowPhaseEvent('A', 20, cat, Trace.Types.Events.Phase.FLOW_END, 1, pid, tid),

      // Flow 2 phase
      makeFlowPhaseEvent('A', 30, cat, Trace.Types.Events.Phase.FLOW_START, 2, pid, tid),
      makeFlowPhaseEvent('A', 40, cat, Trace.Types.Events.Phase.FLOW_STEP, 2, pid, tid),
      makeFlowPhaseEvent('A', 50, cat, Trace.Types.Events.Phase.FLOW_END, 2, pid, tid),

      // Flow 1 events
      makeCompleteEvent('A', 0, 10, cat, pid, tid),
      makeCompleteEvent('B', 10, 10, cat, pid, tid),
      makeCompleteEvent('C', 20, 10, cat, pid, tid),

      // Flow 2 events
      makeCompleteEvent('A', 30, 10, cat, pid, tid),
      makeCompleteEvent('B', 40, 10, cat, pid, tid),
      makeCompleteEvent('C', 50, 10, cat, pid, tid),
    ];

    const {flows} = await getFlowsHandlerData(events);
    assert.lengthOf(flows, 2);
    assert.deepEqual(flows[0], events.slice(6, 9));
    assert.deepEqual(flows[1], events.slice(9));
  });

  it('handles events belonging to multiple flows', async function() {
    const events = [
      // Flow 1 phase events
      makeFlowPhaseEvent('A', 0, cat, Trace.Types.Events.Phase.FLOW_START, 1, pid, tid),
      makeFlowPhaseEvent('A', 10, cat, Trace.Types.Events.Phase.FLOW_END, 1, pid, tid),

      // Flow 2 phase events
      makeFlowPhaseEvent('B', 10, cat, Trace.Types.Events.Phase.FLOW_START, 2, pid, tid),
      makeFlowPhaseEvent('B', 20, cat, Trace.Types.Events.Phase.FLOW_END, 2, pid, tid),

      // Flow 1 & 2: A -> B, B -> C
      makeCompleteEvent('A', 0, 10, cat, pid, tid),
      makeCompleteEvent('B', 10, 10, cat, pid, tid),
      makeCompleteEvent('C', 20, 10, cat, pid, tid),
    ];

    const {flows} = await getFlowsHandlerData(events);
    assert.lengthOf(flows, 2);
    // Flow 1: A -> B
    assert.deepEqual(flows[0], events.slice(4, 6));
    // Flow 2: B -> C
    assert.deepEqual(flows[1], events.slice(5));
  });
  it('handles a flow connecting different threads', async function() {
    const otherThread = 1;
    const events = [
      // Flow phase events. Flow events happen in different threads
      makeFlowPhaseEvent('A', 0, cat, Trace.Types.Events.Phase.FLOW_START, 1, pid, tid),
      makeFlowPhaseEvent('A', 10, cat, Trace.Types.Events.Phase.FLOW_STEP, 1, pid, otherThread),
      makeFlowPhaseEvent('A', 20, cat, Trace.Types.Events.Phase.FLOW_END, 1, pid, otherThread),

      makeCompleteEvent('A', 0, 10, cat, pid, tid),
      makeCompleteEvent('B', 10, 10, cat, pid, otherThread),
      makeCompleteEvent('C', 20, 10, cat, pid, otherThread),
    ];

    const {flows} = await getFlowsHandlerData(events);
    assert.lengthOf(flows, 1);
    assert.deepEqual(flows[0], events.slice(3, 6));
  });

  it('does not link flow phase events to trace events if the thread ids are different', async function() {
    const otherThread = 1;
    const events = [
      // Flow phase events. Flow events happen in different threads
      makeFlowPhaseEvent('A', 0, cat, Trace.Types.Events.Phase.FLOW_START, 1, pid, tid),
      makeFlowPhaseEvent('A', 20, cat, Trace.Types.Events.Phase.FLOW_END, 1, pid, tid),

      // Flow events (pid and tid combination differs from the one
      // of the flow phase events, thus they should not be matched).
      makeCompleteEvent('A', 0, 10, cat, pid, otherThread),
      makeCompleteEvent('C', 20, 10, cat, pid, otherThread),
    ];

    const {flows} = await getFlowsHandlerData(events);
    assert.lengthOf(flows, 0);
  });

  it('handles multiple flows with different group tokens', async function() {
    const pidForFlow2 = 1;
    const tidForFlow2 = 1;
    const events = [
      // Flow 1 phase events
      makeFlowPhaseEvent('A', 0, cat, Trace.Types.Events.Phase.FLOW_START, 1, pid, tid),
      makeFlowPhaseEvent('A', 10, cat, Trace.Types.Events.Phase.FLOW_STEP, 1, pid, tid),
      makeFlowPhaseEvent('A', 20, cat, Trace.Types.Events.Phase.FLOW_END, 1, pid, tid),

      // Flow 2 phase events. Using different pid and tid to ensure
      // the flow group token is different from flow 1.
      // The overlapping timestamps should not cause issues identifying
      // the events belonging to the two different flows.
      makeFlowPhaseEvent('A', 0, cat, Trace.Types.Events.Phase.FLOW_START, 2, pidForFlow2, tidForFlow2),
      makeFlowPhaseEvent('A', 10, cat, Trace.Types.Events.Phase.FLOW_STEP, 2, pidForFlow2, tidForFlow2),
      makeFlowPhaseEvent('A', 20, cat, Trace.Types.Events.Phase.FLOW_END, 2, pidForFlow2, tidForFlow2),

      // Flow 1 events
      makeCompleteEvent('A', 0, 10, cat, pid, tid),
      makeCompleteEvent('B', 10, 10, cat, pid, tid),
      makeCompleteEvent('C', 20, 10, cat, pid, tid),

      // Flow 2 events
      makeCompleteEvent('A', 0, 10, cat, pidForFlow2, tidForFlow2),
      makeCompleteEvent('B', 10, 10, cat, pidForFlow2, tidForFlow2),
      makeCompleteEvent('C', 20, 10, cat, pidForFlow2, tidForFlow2),
    ];

    const {flows} = await getFlowsHandlerData(events);
    assert.lengthOf(flows, 2);
    assert.deepEqual(flows[0], events.slice(6, 9));
    assert.deepEqual(flows[1], events.slice(9));
  });
  it('ignores events with no corresponding flow phase event', async function() {
    const events = [
      // Flow 1 phase events
      makeFlowPhaseEvent('A', 0, cat, Trace.Types.Events.Phase.FLOW_START, 1, pid, tid),
      makeFlowPhaseEvent('A', 10, cat, Trace.Types.Events.Phase.FLOW_STEP, 1, pid, tid),
      makeFlowPhaseEvent('A', 20, cat, Trace.Types.Events.Phase.FLOW_END, 1, pid, tid),

      // Flow 1 events
      makeCompleteEvent('A', 0, 10, cat, pid, tid),
      makeCompleteEvent('B', 10, 10, cat, pid, tid),
      makeCompleteEvent('C', 20, 10, cat, pid, tid),

      // non-flow events.
      makeCompleteEvent('A', 30, 10, cat, pid, tid),
      makeCompleteEvent('B', 40, 10, cat, pid, tid),
      makeCompleteEvent('C', 50, 10, cat, pid, tid),
    ];

    const {flows} = await getFlowsHandlerData(events);
    assert.lengthOf(flows, 1);
    assert.deepEqual(flows[0], events.slice(3, 6));
  });
});
