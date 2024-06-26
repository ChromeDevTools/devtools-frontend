// Copyright 2024 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import {BaseNode, type Node} from '../BaseNode.js';
import type * as Lantern from '../types/lantern.js';

import {type Extras, Metric} from './Metric.js';

class MaxPotentialFID extends Metric {
  // eslint-disable-next-line @typescript-eslint/naming-convention
  static override get coefficients(): Lantern.Simulation.MetricCoefficients {
    return {
      intercept: 0,
      optimistic: 0.5,
      pessimistic: 0.5,
    };
  }

  static override getOptimisticGraph(dependencyGraph: Node): Node {
    return dependencyGraph;
  }

  static override getPessimisticGraph(dependencyGraph: Node): Node {
    return dependencyGraph;
  }

  static override getEstimateFromSimulation(simulation: Lantern.Simulation.Result, extras: Extras):
      Lantern.Simulation.Result {
    if (!extras.fcpResult) {
      throw new Error('missing fcpResult');
    }

    // Intentionally use the opposite FCP estimate, a more pessimistic FCP means that more tasks
    // are excluded from the FID computation, so a higher FCP means lower FID for same work.
    const fcpTimeInMs = extras.optimistic ? extras.fcpResult.pessimisticEstimate.timeInMs :
                                            extras.fcpResult.optimisticEstimate.timeInMs;

    const timings = MaxPotentialFID.getTimingsAfterFCP(
        simulation.nodeTimings,
        fcpTimeInMs,
    );

    return {
      timeInMs: Math.max(...timings.map(timing => timing.duration), 16),
      nodeTimings: simulation.nodeTimings,
    };
  }

  static override compute(data: Lantern.Simulation.MetricComputationDataInput, extras?: Omit<Extras, 'optimistic'>):
      Promise<Lantern.Metrics.Result> {
    const fcpResult = extras?.fcpResult;
    if (!fcpResult) {
      throw new Error('FCP is required to calculate the Max Potential FID metric');
    }

    return super.compute(data, extras);
  }

  static getTimingsAfterFCP(nodeTimings: Lantern.Simulation.Result['nodeTimings'], fcpTimeInMs: number):
      Array<{duration: number}> {
    return Array.from(nodeTimings.entries())
        .filter(([node, timing]) => node.type === BaseNode.types.CPU && timing.endTime > fcpTimeInMs)
        .map(([_, timing]) => timing);
  }
}

export {MaxPotentialFID};
