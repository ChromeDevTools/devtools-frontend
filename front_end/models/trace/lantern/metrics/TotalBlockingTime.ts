// Copyright 2024 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as Core from '../core/core.js';
import * as Graph from '../graph/graph.js';
import type * as Simulation from '../simulation/simulation.js';

import {
  type Extras,
  Metric,
  type MetricCoefficients,
  type MetricComputationDataInput,
  type MetricResult,
} from './Metric.js';
import {BLOCKING_TIME_THRESHOLD, calculateSumOfBlockingTime} from './TBTUtils.js';

class TotalBlockingTime extends Metric {
  static override get coefficients(): MetricCoefficients {
    return {
      intercept: 0,
      optimistic: 0.5,
      pessimistic: 0.5,
    };
  }

  static override getOptimisticGraph(dependencyGraph: Graph.Node): Graph.Node {
    return dependencyGraph;
  }

  static override getPessimisticGraph(dependencyGraph: Graph.Node): Graph.Node {
    return dependencyGraph;
  }

  static override getEstimateFromSimulation(simulation: Simulation.Result, extras: Extras): Simulation.Result {
    if (!extras.fcpResult) {
      throw new Core.LanternError('missing fcpResult');
    }
    if (!extras.interactiveResult) {
      throw new Core.LanternError('missing interactiveResult');
    }

    // Intentionally use the opposite FCP estimate. A pessimistic FCP is higher than equal to an
    // optimistic FCP, which means potentially more tasks are excluded from the Total Blocking Time
    // computation. So a more pessimistic FCP gives a more optimistic Total Blocking Time for the
    // same work.
    const fcpTimeInMs = extras.optimistic ? extras.fcpResult.pessimisticEstimate.timeInMs :
                                            extras.fcpResult.optimisticEstimate.timeInMs;

    // Similarly, we always have pessimistic TTI >= optimistic TTI. Therefore, picking optimistic
    // TTI means our window of interest is smaller and thus potentially more tasks are excluded from
    // Total Blocking Time computation, yielding a lower (more optimistic) Total Blocking Time value
    // for the same work.
    const interactiveTimeMs = extras.optimistic ? extras.interactiveResult.optimisticEstimate.timeInMs :
                                                  extras.interactiveResult.pessimisticEstimate.timeInMs;

    const minDurationMs = BLOCKING_TIME_THRESHOLD;

    const events = TotalBlockingTime.getTopLevelEvents(
        simulation.nodeTimings,
        minDurationMs,
    );

    return {
      timeInMs: calculateSumOfBlockingTime(
          events,
          fcpTimeInMs,
          interactiveTimeMs,
          ),
      nodeTimings: simulation.nodeTimings,
    };
  }

  static override compute(data: MetricComputationDataInput, extras?: Omit<Extras, 'optimistic'>): MetricResult {
    const fcpResult = extras?.fcpResult;
    if (!fcpResult) {
      throw new Core.LanternError('FCP is required to calculate the TBT metric');
    }

    const interactiveResult = extras?.fcpResult;
    if (!interactiveResult) {
      throw new Core.LanternError('Interactive is required to calculate the TBT metric');
    }

    return super.compute(data, extras);
  }

  static getTopLevelEvents(nodeTimings: Simulation.Result['nodeTimings'], minDurationMs: number):
      {start: number, end: number, duration: number}[] {
    const events: Array<{start: number, end: number, duration: number}> = [];

    for (const [node, timing] of nodeTimings.entries()) {
      if (node.type !== Graph.BaseNode.types.CPU) {
        continue;
      }
      // Filtering out events below minimum duration.
      if (timing.duration < minDurationMs) {
        continue;
      }

      events.push({
        start: timing.startTime,
        end: timing.endTime,
        duration: timing.duration,
      });
    }

    return events;
  }
}

export {TotalBlockingTime};
