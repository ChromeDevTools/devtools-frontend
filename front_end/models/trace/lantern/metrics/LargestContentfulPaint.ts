// Copyright 2024 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as Core from '../core/core.js';
import type * as Graph from '../graph/graph.js';
import type * as Simulation from '../simulation/simulation.js';
import type * as Types from '../types/types.js';

import {FirstContentfulPaint} from './FirstContentfulPaint.js';
import {
  type Extras,
  Metric,
  type MetricCoefficients,
  type MetricComputationDataInput,
  type MetricResult,
} from './Metric.js';

class LargestContentfulPaint extends Metric {
  static override get coefficients(): MetricCoefficients {
    return {
      intercept: 0,
      optimistic: 0.5,
      pessimistic: 0.5,
    };
  }

  /**
   * Low priority image nodes are usually offscreen and very unlikely to be the
   * resource that is required for LCP. Our LCP graphs include everything except for these images.
   */
  static isNotLowPriorityImageNode(node: Graph.Node): boolean {
    if (node.type !== 'network') {
      return true;
    }
    const isImage = node.request.resourceType === 'Image';
    const isLowPriority = node.request.priority === 'Low' || node.request.priority === 'VeryLow';
    return !isImage || !isLowPriority;
  }

  static override getOptimisticGraph(
      dependencyGraph: Graph.Node, processedNavigation: Types.Simulation.ProcessedNavigation): Graph.Node {
    const lcp = processedNavigation.timestamps.largestContentfulPaint;
    if (!lcp) {
      throw new Core.LanternError('NO_LCP');
    }

    return FirstContentfulPaint.getFirstPaintBasedGraph(dependencyGraph, {
      cutoffTimestamp: lcp,
      treatNodeAsRenderBlocking: LargestContentfulPaint.isNotLowPriorityImageNode,
    });
  }

  static override getPessimisticGraph(
      dependencyGraph: Graph.Node, processedNavigation: Types.Simulation.ProcessedNavigation): Graph.Node {
    const lcp = processedNavigation.timestamps.largestContentfulPaint;
    if (!lcp) {
      throw new Core.LanternError('NO_LCP');
    }

    return FirstContentfulPaint.getFirstPaintBasedGraph(dependencyGraph, {
      cutoffTimestamp: lcp,
      treatNodeAsRenderBlocking: _ => true,
      // For pessimistic LCP we'll include *all* layout nodes
      additionalCpuNodesToTreatAsRenderBlocking: node => node.didPerformLayout(),
    });
  }

  static override getEstimateFromSimulation(simulationResult: Simulation.Result): Simulation.Result {
    const nodeTimesNotOffscreenImages = Array.from(simulationResult.nodeTimings.entries())
                                            .filter(entry => LargestContentfulPaint.isNotLowPriorityImageNode(entry[0]))
                                            .map(entry => entry[1].endTime);

    return {
      timeInMs: Math.max(...nodeTimesNotOffscreenImages),
      nodeTimings: simulationResult.nodeTimings,
    };
  }

  static override compute(data: MetricComputationDataInput, extras?: Omit<Extras, 'optimistic'>): MetricResult {
    const fcpResult = extras?.fcpResult;
    if (!fcpResult) {
      throw new Core.LanternError('FCP is required to calculate the LCP metric');
    }

    const metricResult = super.compute(data, extras);
    metricResult.timing = Math.max(metricResult.timing, fcpResult.timing);
    return metricResult;
  }
}

export {LargestContentfulPaint};
