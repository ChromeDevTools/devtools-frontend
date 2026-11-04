import type * as Graph from '../graph/graph.js';
import type * as Simulation from '../simulation/simulation.js';
import type * as Types from '../types/types.js';
import { type Extras, Metric, type MetricCoefficients, type MetricComputationDataInput, type MetricResult } from './Metric.js';
declare class LargestContentfulPaint extends Metric {
    static get coefficients(): MetricCoefficients;
    /**
     * Low priority image nodes are usually offscreen and very unlikely to be the
     * resource that is required for LCP. Our LCP graphs include everything except for these images.
     */
    static isNotLowPriorityImageNode(node: Graph.Node): boolean;
    /**
     * Finds the NetworkNode corresponding to the LCP image in the dependency graph, if LCP was an image.
     */
    static findLcpNode(dependencyGraph: Graph.Node, processedNavigation: Types.Simulation.ProcessedNavigation): Graph.NetworkNode | null;
    static getOptimisticGraph(dependencyGraph: Graph.Node, processedNavigation: Types.Simulation.ProcessedNavigation): Graph.Node;
    static getPessimisticGraph(dependencyGraph: Graph.Node, processedNavigation: Types.Simulation.ProcessedNavigation): Graph.Node;
    static getEstimateFromSimulation(simulationResult: Simulation.Result, extras?: Extras): Simulation.Result;
    static compute(data: MetricComputationDataInput, extras?: Omit<Extras, 'optimistic'>): MetricResult;
}
export { LargestContentfulPaint };
