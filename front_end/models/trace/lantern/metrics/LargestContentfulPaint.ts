// Copyright 2024 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import {type Node} from '../BaseNode.js';
import {LanternError} from '../LanternError.js';
import type * as Lantern from '../types/lantern.js';

import {FirstContentfulPaint} from './FirstContentfulPaint.js';
import {type Extras, Metric} from './Metric.js';

class LargestContentfulPaint extends Metric {
  // eslint-disable-next-line @typescript-eslint/naming-convention
  static override get coefficients(): Lantern.Simulation.MetricCoefficients {
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
  static isNotLowPriorityImageNode(node: Node): boolean {
    if (node.type !== 'network') {
      return true;
    }
    const isImage = node.request.resourceType === 'Image';
    const isLowPriority = node.request.priority === 'Low' || node.request.priority === 'VeryLow';
    return !isImage || !isLowPriority;
  }

  static override getOptimisticGraph(
      dependencyGraph: Node, processedNavigation: Lantern.Simulation.ProcessedNavigation): Node {
    const lcp = processedNavigation.timestamps.largestContentfulPaint;
    if (!lcp) {
      throw new LanternError('NO_LCP');
    }

    return FirstContentfulPaint.getFirstPaintBasedGraph(dependencyGraph, {
      cutoffTimestamp: lcp,
      treatNodeAsRenderBlocking: LargestContentfulPaint.isNotLowPriorityImageNode,
    });
  }

  static override getPessimisticGraph(
      dependencyGraph: Node, processedNavigation: Lantern.Simulation.ProcessedNavigation): Node {
    const lcp = processedNavigation.timestamps.largestContentfulPaint;
    if (!lcp) {
      throw new LanternError('NO_LCP');
    }

    return FirstContentfulPaint.getFirstPaintBasedGraph(dependencyGraph, {
      cutoffTimestamp: lcp,
      treatNodeAsRenderBlocking: _ => true,
      // For pessimistic LCP we'll include *all* layout nodes
      additionalCpuNodesToTreatAsRenderBlocking: node => node.didPerformLayout(),
    });
  }

  static override getEstimateFromSimulation(simulationResult: Lantern.Simulation.Result): Lantern.Simulation.Result {
    const nodeTimesNotOffscreenImages = Array.from(simulationResult.nodeTimings.entries())
                                            .filter(entry => LargestContentfulPaint.isNotLowPriorityImageNode(entry[0]))
                                            .map(entry => entry[1].endTime);

    return {
      timeInMs: Math.max(...nodeTimesNotOffscreenImages),
      nodeTimings: simulationResult.nodeTimings,
    };
  }

  static override async compute(
      data: Lantern.Simulation.MetricComputationDataInput,
      extras?: Omit<Extras, 'optimistic'>): Promise<Lantern.Metrics.Result> {
    const fcpResult = extras?.fcpResult;
    if (!fcpResult) {
      throw new Error('FCP is required to calculate the LCP metric');
    }

    const metricResult = await super.compute(data, extras);
    metricResult.timing = Math.max(metricResult.timing, fcpResult.timing);
    return metricResult;
  }
}

export {LargestContentfulPaint};
