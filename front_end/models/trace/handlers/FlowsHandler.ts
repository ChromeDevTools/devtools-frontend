// Copyright 2024 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.
import * as Types from '../types/types.js';

// A flow is a logic connection between trace events. We display this
// connection as arrows between trace events belonging to the same flow.

// In the trace event format, flows are represented with pairing "flow
// phase" events. Each flow phase event corresponds to one trace event
// and indicates the role a trace event plays in a flow (start, step or
// end). For each flow, one `start` and one `end` phase events are
// included, while the amount of `step` phase events can be >= 0.

// A flow phase event is assigned to a trace event when their cat, tid,
// pid and ts are equal (see @flowPhaseBindingTokenForEvent ).

// It's possible for a single event to belong to multiple flows. In that
// case, it will have multiple corresponding flow phase events (one
// per flow).

// To parse flows, we first handle flow phase events, by creating unique
// flows with the timestamps of each phase. Then, we place trace events
// in the flows where their corresponding phase events were placed (if
// there are any corresponding flow phase events at all).
const flowDataByGroupToken = new Map<string, {flowId: number, times: Types.Timing.MicroSeconds[]}>();
const flowPhaseBindingTokenToFlowId = new Map<string, Set<number>>();
const flowsById = new Map<number, {times: Types.Timing.MicroSeconds[], events: Types.Events.Event[]}>();
const flowEvents: Types.Events.FlowEvent[] = [];
const nonFlowEvents: Types.Events.Event[] = [];
let flows: Types.Events.Event[][] = [];
const ID_COMPONENT_SEPARATOR = '-$-';
export function reset(): void {
  flows = [];
  flowEvents.length = 0;
  nonFlowEvents.length = 0;
  flowDataByGroupToken.clear();
  flowPhaseBindingTokenToFlowId.clear();
  flowsById.clear();
}

export function handleEvent(event: Types.Events.Event): void {
  if (Types.Events.isFlowPhaseEvent(event)) {
    flowEvents.push(event);
    return;
  }
  nonFlowEvents.push(event);
}

function processNonFlowEvent(event: Types.Events.Event): void {
  const flowPhaseBindingToken = flowPhaseBindingTokenForEvent(event);
  const flowIds = flowPhaseBindingTokenToFlowId.get(flowPhaseBindingToken);
  if (!flowIds) {
    return;
  }
  for (const flowId of flowIds) {
    const flow = flowsById.get(flowId);
    if (!flow) {
      continue;
    }
    const timeIndex = flow.times.indexOf(event.ts);
    if (timeIndex < 0) {
      continue;
    }
    flow.events[timeIndex] = event;
  }
}

/**
 * Creates unique flows by tracking flow phase events. A new created
 * flow whenever a flow start phase event is detected.
 * Subsequent flow phase events with the same group token are added to
 * this flow until a flow end phase is detected.
 */
function processFlowEvent(flowPhaseEvent: Types.Events.FlowEvent): void {
  const flowGroup = flowGroupTokenForFlowPhaseEvent(flowPhaseEvent);
  switch (flowPhaseEvent.ph) {
    case (Types.Events.Phase.FLOW_START): {
      const flowMetadata = {flowId: flowPhaseEvent.id, times: [flowPhaseEvent.ts]};
      flowDataByGroupToken.set(flowGroup, flowMetadata);
      addFlowIdToFlowPhaseBinding(flowPhaseBindingTokenForEvent(flowPhaseEvent), flowMetadata.flowId);
      return;
    }
    case (Types.Events.Phase.FLOW_STEP): {
      const flow = flowDataByGroupToken.get(flowGroup);
      if (!flow || flow.times.length < 0) {
        // Found non-start flow event with no corresponding start flow,
        // start event. Quietly ignore problematic event.
        return;
      }
      addFlowIdToFlowPhaseBinding(flowPhaseBindingTokenForEvent(flowPhaseEvent), flow.flowId);
      flow.times.push(flowPhaseEvent.ts);
      return;
    }
    case (Types.Events.Phase.FLOW_END): {
      const flow = flowDataByGroupToken.get(flowGroup);
      if (!flow || flow.times.length < 0) {
        // Found non-start flow event with no corresponding start flow,
        // start event. Quietly ignore problematic event.
        return;
      }
      addFlowIdToFlowPhaseBinding(flowPhaseBindingTokenForEvent(flowPhaseEvent), flow.flowId);
      flow.times.push(flowPhaseEvent.ts);
      flowsById.set(flow.flowId, {times: flow.times, events: []});
      // We don't need this data anymore as the flow has been finished,
      // so we can drop it.
      flowDataByGroupToken.delete(flowGroup);
    }
  }
}

/**
 * A single trace event can belong to multiple flows. This method
 * tracks which flows (flowId) an event belongs to (given
 * its flow phase binding token).
 */
function addFlowIdToFlowPhaseBinding(flowPhaseBinding: string, flowId: number): void {
  let flowIds = flowPhaseBindingTokenToFlowId.get(flowPhaseBinding);
  if (!flowIds) {
    flowIds = new Set();
  }
  flowIds.add(flowId);
  flowPhaseBindingTokenToFlowId.set(flowPhaseBinding, flowIds);
}

/**
 * Returns a token to group flow phase events (start, step and end)
 * belonging to the same flow. Flow phase events belonging to the same
 * flow share category, thread id, process id and name.
 *
 * Note that other phase events of other flows can share these
 * attributes too. For this reason, we group flow phase events in
 * cycles. A cycle starts on a flow start phase event and finishes on a
 * flow end phase event. For this reason, flow phase events need to be
 * handled in timestamp order.
 */
function flowGroupTokenForFlowPhaseEvent(event: Types.Events.FlowEvent): string {
  return `${event.cat}${ID_COMPONENT_SEPARATOR}${event.name}${ID_COMPONENT_SEPARATOR}${event.id}`;
}

/**
 * A flow phase binding is a token that allows us to associate a flow
 * phase event to its corresponding event. This association indicates
 * what role a trace event plays in a flow.
 * We can assign a trace event with a flow phase when its category,
 * thread id, process id and timestamp matches those of a flow phase
 * event.
 */
function flowPhaseBindingTokenForEvent(event: Types.Events.Event): string {
  // This function is called many times (one per event) and creating a
  // string every time can trigger GC. If this becomes a problem, a
  // possible optimization is to use a multi-key map with the
  // binding token components, a trade off between memory performance
  // and readability.
  return `${event.cat}${ID_COMPONENT_SEPARATOR}${event.tid}${ID_COMPONENT_SEPARATOR}${event.pid}${
      ID_COMPONENT_SEPARATOR}${event.ts}`;
}

export async function finalize(): Promise<void> {
  // Order is important: flow events need to be handled first.
  flowEvents.forEach(processFlowEvent);
  nonFlowEvents.forEach(processNonFlowEvent);
  flows = [...flowsById.values()].map(f => f.events).filter(flow => flow.length > 1);
}

export function data(): {flows: Types.Events.Event[][]} {
  return {
    flows,
  };
}
