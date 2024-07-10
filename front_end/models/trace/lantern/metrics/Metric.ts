// Copyright 2024 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as Core from '../core/core.js';
import * as Graph from '../graph/graph.js';
import type * as Simulation from '../simulation/simulation.js';
import type * as Types from '../types/types.js';

export interface MetricComputationDataInput {
  simulator: Simulation.Simulator;
  graph: Graph.Node<unknown>;
  processedNavigation: Types.Simulation.ProcessedNavigation;
}

export interface MetricCoefficients {
  intercept: number;
  optimistic: number;
  pessimistic: number;
}

export interface MetricResult<T = Types.AnyNetworkObject> {
  timing: number;
  timestamp?: never;
  optimisticEstimate: Simulation.Result<T>;
  pessimisticEstimate: Simulation.Result<T>;
  optimisticGraph: Graph.Node<T>;
  pessimisticGraph: Graph.Node;
}

export interface Extras {
  optimistic: boolean;
  fcpResult?: MetricResult;
  lcpResult?: MetricResult;
  interactiveResult?: MetricResult;
  observedSpeedIndex?: number;
}

class Metric {
  static getScriptUrls(dependencyGraph: Graph.Node, treatNodeAsRenderBlocking?: (node: Graph.NetworkNode) => boolean):
      Set<string> {
    const scriptUrls: Set<string> = new Set();

    dependencyGraph.traverse(node => {
      if (node.type !== Graph.BaseNode.types.NETWORK) {
        return;
      }
      if (node.request.resourceType !== 'Script') {
        return;
      }
      if (treatNodeAsRenderBlocking?.(node)) {
        scriptUrls.add(node.request.url);
      }
    });

    return scriptUrls;
  }

  static get coefficients(): MetricCoefficients {
    throw new Core.LanternError('coefficients unimplemented!');
  }

  /* eslint-disable @typescript-eslint/no-unused-vars */

  /**
   * Returns the coefficients, scaled by the throttling settings if needed by the metric.
   * Some lantern metrics (speed-index) use components in their estimate that are not
   * from the simulator. In this case, we need to adjust the coefficients as the target throttling
   * settings change.
   */
  static getScaledCoefficients(rttMs: number): MetricCoefficients {
    return this.coefficients;
  }

  static getOptimisticGraph(dependencyGraph: Graph.Node, processedNavigation: Types.Simulation.ProcessedNavigation):
      Graph.Node {
    throw new Core.LanternError('Optimistic graph unimplemented!');
  }

  static getPessimisticGraph(dependencyGraph: Graph.Node, processedNavigation: Types.Simulation.ProcessedNavigation):
      Graph.Node {
    throw new Core.LanternError('Pessmistic graph unimplemented!');
  }

  static getEstimateFromSimulation(simulationResult: Simulation.Result, extras: Extras): Simulation.Result {
    return simulationResult;
  }

  /* eslint-enable @typescript-eslint/no-unused-vars */

  static compute(data: MetricComputationDataInput, extras?: Omit<Extras, 'optimistic'>): MetricResult {
    const {simulator, graph, processedNavigation} = data;

    const metricName = this.name.replace('Lantern', '');
    const optimisticGraph = this.getOptimisticGraph(graph, processedNavigation);
    const pessimisticGraph = this.getPessimisticGraph(graph, processedNavigation);

    let simulateOptions = {label: `optimistic${metricName}`};
    const optimisticSimulation = simulator.simulate(optimisticGraph, simulateOptions);

    simulateOptions = {label: `pessimistic${metricName}`};
    const pessimisticSimulation = simulator.simulate(pessimisticGraph, simulateOptions);

    const optimisticEstimate = this.getEstimateFromSimulation(
        optimisticSimulation,
        {...extras, optimistic: true},
    );

    const pessimisticEstimate = this.getEstimateFromSimulation(
        pessimisticSimulation,
        {...extras, optimistic: false},
    );

    const coefficients = this.getScaledCoefficients(simulator.rtt);
    // Estimates under 1s don't really follow the normal curve fit, minimize the impact of the intercept
    const interceptMultiplier = coefficients.intercept > 0 ? Math.min(1, optimisticEstimate.timeInMs / 1000) : 1;
    const timing = coefficients.intercept * interceptMultiplier +
        coefficients.optimistic * optimisticEstimate.timeInMs + coefficients.pessimistic * pessimisticEstimate.timeInMs;

    return {
      timing,
      optimisticEstimate,
      pessimisticEstimate,
      optimisticGraph,
      pessimisticGraph,
    };
  }
}

export {Metric};
