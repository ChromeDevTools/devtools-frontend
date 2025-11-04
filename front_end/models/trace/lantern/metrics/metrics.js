var __defProp = Object.defineProperty;
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};

// gen/front_end/models/trace/lantern/metrics/FirstContentfulPaint.js
import * as Graph2 from "./../graph/graph.js";

// gen/front_end/models/trace/lantern/metrics/Metric.js
import * as Core from "./../core/core.js";
import * as Graph from "./../graph/graph.js";
var Metric = class {
  static getScriptUrls(dependencyGraph, treatNodeAsRenderBlocking) {
    const scriptUrls = /* @__PURE__ */ new Set();
    dependencyGraph.traverse((node) => {
      if (node.type !== Graph.BaseNode.types.NETWORK) {
        return;
      }
      if (node.request.resourceType !== "Script") {
        return;
      }
      if (treatNodeAsRenderBlocking?.(node)) {
        scriptUrls.add(node.request.url);
      }
    });
    return scriptUrls;
  }
  static get coefficients() {
    throw new Core.LanternError("coefficients unimplemented!");
  }
  /**
   * Returns the coefficients, scaled by the throttling settings if needed by the metric.
   * Some lantern metrics (speed-index) use components in their estimate that are not
   * from the simulator. In this case, we need to adjust the coefficients as the target throttling
   * settings change.
   */
  static getScaledCoefficients(_rttMs) {
    return this.coefficients;
  }
  static getOptimisticGraph(_dependencyGraph, _processedNavigation) {
    throw new Core.LanternError("Optimistic graph unimplemented!");
  }
  static getPessimisticGraph(_dependencyGraph, _processedNavigation) {
    throw new Core.LanternError("Pessmistic graph unimplemented!");
  }
  static getEstimateFromSimulation(simulationResult, _extras) {
    return simulationResult;
  }
  static compute(data, extras) {
    const { simulator, graph, processedNavigation } = data;
    const metricName = this.name.replace("Lantern", "");
    const optimisticGraph = this.getOptimisticGraph(graph, processedNavigation);
    const pessimisticGraph = this.getPessimisticGraph(graph, processedNavigation);
    let simulateOptions = { label: `optimistic${metricName}` };
    const optimisticSimulation = simulator.simulate(optimisticGraph, simulateOptions);
    simulateOptions = { label: `pessimistic${metricName}` };
    const pessimisticSimulation = simulator.simulate(pessimisticGraph, simulateOptions);
    const optimisticEstimate = this.getEstimateFromSimulation(optimisticSimulation, { ...extras, optimistic: true });
    const pessimisticEstimate = this.getEstimateFromSimulation(pessimisticSimulation, { ...extras, optimistic: false });
    const coefficients = this.getScaledCoefficients(simulator.rtt);
    const interceptMultiplier = coefficients.intercept > 0 ? Math.min(1, optimisticEstimate.timeInMs / 1e3) : 1;
    const timing = coefficients.intercept * interceptMultiplier + coefficients.optimistic * optimisticEstimate.timeInMs + coefficients.pessimistic * pessimisticEstimate.timeInMs;
    return {
      timing,
      optimisticEstimate,
      pessimisticEstimate,
      optimisticGraph,
      pessimisticGraph
    };
  }
};

// gen/front_end/models/trace/lantern/metrics/FirstContentfulPaint.js
var FirstContentfulPaint = class extends Metric {
  static get coefficients() {
    return {
      intercept: 0,
      optimistic: 0.5,
      pessimistic: 0.5
    };
  }
  /**
   * Computes the set of URLs that *appeared* to be render-blocking based on our filter,
   * *but definitely were not* render-blocking based on the timing of their EvaluateScript task.
   * It also computes the set of corresponding CPU node ids that were needed for the paint at the
   * given timestamp.
   */
  static getRenderBlockingNodeData(graph, { cutoffTimestamp, treatNodeAsRenderBlocking, additionalCpuNodesToTreatAsRenderBlocking }) {
    const scriptUrlToNodeMap = /* @__PURE__ */ new Map();
    const cpuNodes = [];
    graph.traverse((node) => {
      if (node.type === Graph2.BaseNode.types.CPU) {
        if (node.startTime <= cutoffTimestamp) {
          cpuNodes.push(node);
        }
        const scriptUrls = node.getEvaluateScriptURLs();
        for (const url of scriptUrls) {
          const existing = scriptUrlToNodeMap.get(url) || node;
          scriptUrlToNodeMap.set(url, node.startTime < existing.startTime ? node : existing);
        }
      }
    });
    cpuNodes.sort((a, b) => a.startTime - b.startTime);
    const possiblyRenderBlockingScriptUrls = Metric.getScriptUrls(graph, (node) => {
      return node.endTime <= cutoffTimestamp && treatNodeAsRenderBlocking(node);
    });
    const definitelyNotRenderBlockingScriptUrls = /* @__PURE__ */ new Set();
    const renderBlockingCpuNodeIds = /* @__PURE__ */ new Set();
    for (const url of possiblyRenderBlockingScriptUrls) {
      const cpuNodeForUrl = scriptUrlToNodeMap.get(url);
      if (!cpuNodeForUrl) {
        continue;
      }
      if (cpuNodes.includes(cpuNodeForUrl)) {
        renderBlockingCpuNodeIds.add(cpuNodeForUrl.id);
        continue;
      }
      definitelyNotRenderBlockingScriptUrls.add(url);
    }
    const firstLayout = cpuNodes.find((node) => node.didPerformLayout());
    if (firstLayout) {
      renderBlockingCpuNodeIds.add(firstLayout.id);
    }
    const firstPaint = cpuNodes.find((node) => node.childEvents.some((e) => e.name === "Paint"));
    if (firstPaint) {
      renderBlockingCpuNodeIds.add(firstPaint.id);
    }
    const firstParse = cpuNodes.find((node) => node.childEvents.some((e) => e.name === "ParseHTML"));
    if (firstParse) {
      renderBlockingCpuNodeIds.add(firstParse.id);
    }
    if (additionalCpuNodesToTreatAsRenderBlocking) {
      cpuNodes.filter(additionalCpuNodesToTreatAsRenderBlocking).forEach((node) => renderBlockingCpuNodeIds.add(node.id));
    }
    return {
      definitelyNotRenderBlockingScriptUrls,
      renderBlockingCpuNodeIds
    };
  }
  /**
   * Computes the graph required for the first paint of interest.
   */
  static getFirstPaintBasedGraph(dependencyGraph, { cutoffTimestamp, treatNodeAsRenderBlocking, additionalCpuNodesToTreatAsRenderBlocking }) {
    const rbData = this.getRenderBlockingNodeData(dependencyGraph, {
      cutoffTimestamp,
      treatNodeAsRenderBlocking,
      additionalCpuNodesToTreatAsRenderBlocking
    });
    const { definitelyNotRenderBlockingScriptUrls, renderBlockingCpuNodeIds } = rbData;
    return dependencyGraph.cloneWithRelationships((node) => {
      if (node.type === Graph2.BaseNode.types.NETWORK) {
        const endedAfterPaint = node.endTime > cutoffTimestamp || node.startTime > cutoffTimestamp;
        if (endedAfterPaint && !node.isMainDocument()) {
          return false;
        }
        const url = node.request.url;
        if (definitelyNotRenderBlockingScriptUrls.has(url)) {
          return false;
        }
        return treatNodeAsRenderBlocking(node);
      }
      return renderBlockingCpuNodeIds.has(node.id);
    });
  }
  static getOptimisticGraph(dependencyGraph, processedNavigation) {
    return this.getFirstPaintBasedGraph(dependencyGraph, {
      cutoffTimestamp: processedNavigation.timestamps.firstContentfulPaint,
      // In the optimistic graph we exclude resources that appeared to be render blocking but were
      // initiated by a script. While they typically have a very high importance and tend to have a
      // significant impact on the page's content, these resources don't technically block rendering.
      treatNodeAsRenderBlocking: (node) => node.hasRenderBlockingPriority() && node.initiatorType !== "script"
    });
  }
  static getPessimisticGraph(dependencyGraph, processedNavigation) {
    return this.getFirstPaintBasedGraph(dependencyGraph, {
      cutoffTimestamp: processedNavigation.timestamps.firstContentfulPaint,
      treatNodeAsRenderBlocking: (node) => node.hasRenderBlockingPriority()
    });
  }
};

// gen/front_end/models/trace/lantern/metrics/Interactive.js
import * as Core2 from "./../core/core.js";
import * as Graph3 from "./../graph/graph.js";
var CRITICAL_LONG_TASK_THRESHOLD = 20;
var Interactive = class _Interactive extends Metric {
  static get coefficients() {
    return {
      intercept: 0,
      optimistic: 0.45,
      pessimistic: 0.55
    };
  }
  static getOptimisticGraph(dependencyGraph) {
    const minimumCpuTaskDuration = CRITICAL_LONG_TASK_THRESHOLD * 1e3;
    return dependencyGraph.cloneWithRelationships((node) => {
      if (node.type === Graph3.BaseNode.types.CPU) {
        return node.duration > minimumCpuTaskDuration;
      }
      const isImage = node.request.resourceType === "Image";
      const isScript = node.request.resourceType === "Script";
      return !isImage && (isScript || node.request.priority === "High" || node.request.priority === "VeryHigh");
    });
  }
  static getPessimisticGraph(dependencyGraph) {
    return dependencyGraph;
  }
  static getEstimateFromSimulation(simulationResult, extras) {
    if (!extras.lcpResult) {
      throw new Core2.LanternError("missing lcpResult");
    }
    const lastTaskAt = _Interactive.getLastLongTaskEndTime(simulationResult.nodeTimings);
    const minimumTime = extras.optimistic ? extras.lcpResult.optimisticEstimate.timeInMs : extras.lcpResult.pessimisticEstimate.timeInMs;
    return {
      timeInMs: Math.max(minimumTime, lastTaskAt),
      nodeTimings: simulationResult.nodeTimings
    };
  }
  static compute(data, extras) {
    const lcpResult = extras?.lcpResult;
    if (!lcpResult) {
      throw new Core2.LanternError("LCP is required to calculate the Interactive metric");
    }
    const metricResult = super.compute(data, extras);
    metricResult.timing = Math.max(metricResult.timing, lcpResult.timing);
    return metricResult;
  }
  static getLastLongTaskEndTime(nodeTimings, duration = 50) {
    return Array.from(nodeTimings.entries()).filter(([node, timing]) => {
      if (node.type !== Graph3.BaseNode.types.CPU) {
        return false;
      }
      return timing.duration > duration;
    }).map(([_, timing]) => timing.endTime).reduce((max, x) => Math.max(max || 0, x || 0), 0);
  }
};

// gen/front_end/models/trace/lantern/metrics/LargestContentfulPaint.js
import * as Core3 from "./../core/core.js";
var LargestContentfulPaint = class _LargestContentfulPaint extends Metric {
  static get coefficients() {
    return {
      intercept: 0,
      optimistic: 0.5,
      pessimistic: 0.5
    };
  }
  /**
   * Low priority image nodes are usually offscreen and very unlikely to be the
   * resource that is required for LCP. Our LCP graphs include everything except for these images.
   */
  static isNotLowPriorityImageNode(node) {
    if (node.type !== "network") {
      return true;
    }
    const isImage = node.request.resourceType === "Image";
    const isLowPriority = node.request.priority === "Low" || node.request.priority === "VeryLow";
    return !isImage || !isLowPriority;
  }
  static getOptimisticGraph(dependencyGraph, processedNavigation) {
    const lcp = processedNavigation.timestamps.largestContentfulPaint;
    if (!lcp) {
      throw new Core3.LanternError("NO_LCP");
    }
    return FirstContentfulPaint.getFirstPaintBasedGraph(dependencyGraph, {
      cutoffTimestamp: lcp,
      treatNodeAsRenderBlocking: _LargestContentfulPaint.isNotLowPriorityImageNode
    });
  }
  static getPessimisticGraph(dependencyGraph, processedNavigation) {
    const lcp = processedNavigation.timestamps.largestContentfulPaint;
    if (!lcp) {
      throw new Core3.LanternError("NO_LCP");
    }
    return FirstContentfulPaint.getFirstPaintBasedGraph(dependencyGraph, {
      cutoffTimestamp: lcp,
      treatNodeAsRenderBlocking: (_) => true,
      // For pessimistic LCP we'll include *all* layout nodes
      additionalCpuNodesToTreatAsRenderBlocking: (node) => node.didPerformLayout()
    });
  }
  static getEstimateFromSimulation(simulationResult) {
    const nodeTimesNotOffscreenImages = Array.from(simulationResult.nodeTimings.entries()).filter((entry) => _LargestContentfulPaint.isNotLowPriorityImageNode(entry[0])).map((entry) => entry[1].endTime);
    return {
      timeInMs: Math.max(...nodeTimesNotOffscreenImages),
      nodeTimings: simulationResult.nodeTimings
    };
  }
  static compute(data, extras) {
    const fcpResult = extras?.fcpResult;
    if (!fcpResult) {
      throw new Core3.LanternError("FCP is required to calculate the LCP metric");
    }
    const metricResult = super.compute(data, extras);
    metricResult.timing = Math.max(metricResult.timing, fcpResult.timing);
    return metricResult;
  }
};

// gen/front_end/models/trace/lantern/metrics/MaxPotentialFID.js
import * as Core4 from "./../core/core.js";
import * as Graph4 from "./../graph/graph.js";
var MaxPotentialFID = class _MaxPotentialFID extends Metric {
  static get coefficients() {
    return {
      intercept: 0,
      optimistic: 0.5,
      pessimistic: 0.5
    };
  }
  static getOptimisticGraph(dependencyGraph) {
    return dependencyGraph;
  }
  static getPessimisticGraph(dependencyGraph) {
    return dependencyGraph;
  }
  static getEstimateFromSimulation(simulation, extras) {
    if (!extras.fcpResult) {
      throw new Core4.LanternError("missing fcpResult");
    }
    const fcpTimeInMs = extras.optimistic ? extras.fcpResult.pessimisticEstimate.timeInMs : extras.fcpResult.optimisticEstimate.timeInMs;
    const timings = _MaxPotentialFID.getTimingsAfterFCP(simulation.nodeTimings, fcpTimeInMs);
    return {
      timeInMs: Math.max(...timings.map((timing) => timing.duration), 16),
      nodeTimings: simulation.nodeTimings
    };
  }
  static compute(data, extras) {
    const fcpResult = extras?.fcpResult;
    if (!fcpResult) {
      throw new Core4.LanternError("FCP is required to calculate the Max Potential FID metric");
    }
    return super.compute(data, extras);
  }
  static getTimingsAfterFCP(nodeTimings, fcpTimeInMs) {
    return Array.from(nodeTimings.entries()).filter(([node, timing]) => node.type === Graph4.BaseNode.types.CPU && timing.endTime > fcpTimeInMs).map(([_, timing]) => timing);
  }
};

// gen/front_end/models/trace/lantern/metrics/SpeedIndex.js
import * as Core5 from "./../core/core.js";
import * as Graph5 from "./../graph/graph.js";
var mobileSlow4GRtt = 150;
var SpeedIndex = class _SpeedIndex extends Metric {
  static get coefficients() {
    return {
      // Note that the optimistic estimate is based on the real observed speed index rather than a
      // real lantern graph (and the final estimate will be Math.max(FCP, Speed Index)).
      intercept: 0,
      optimistic: 1.4,
      pessimistic: 0.4
    };
  }
  static getScaledCoefficients(rttMs) {
    const defaultCoefficients = this.coefficients;
    const defaultRttExcess = mobileSlow4GRtt - 30;
    const multiplier = Math.max((rttMs - 30) / defaultRttExcess, 0);
    return {
      intercept: defaultCoefficients.intercept * multiplier,
      optimistic: 0.5 + (defaultCoefficients.optimistic - 0.5) * multiplier,
      pessimistic: 0.5 + (defaultCoefficients.pessimistic - 0.5) * multiplier
    };
  }
  static getOptimisticGraph(dependencyGraph) {
    return dependencyGraph;
  }
  static getPessimisticGraph(dependencyGraph) {
    return dependencyGraph;
  }
  static getEstimateFromSimulation(simulationResult, extras) {
    if (!extras.fcpResult) {
      throw new Core5.LanternError("missing fcpResult");
    }
    if (extras.observedSpeedIndex === void 0) {
      throw new Core5.LanternError("missing observedSpeedIndex");
    }
    const fcpTimeInMs = extras.fcpResult.pessimisticEstimate.timeInMs;
    const estimate = extras.optimistic ? extras.observedSpeedIndex : _SpeedIndex.computeLayoutBasedSpeedIndex(simulationResult.nodeTimings, fcpTimeInMs);
    return {
      timeInMs: estimate,
      nodeTimings: simulationResult.nodeTimings
    };
  }
  static compute(data, extras) {
    const fcpResult = extras?.fcpResult;
    if (!fcpResult) {
      throw new Core5.LanternError("FCP is required to calculate the SpeedIndex metric");
    }
    const metricResult = super.compute(data, extras);
    metricResult.timing = Math.max(metricResult.timing, fcpResult.timing);
    return metricResult;
  }
  /**
   * Approximate speed index using layout events from the simulated node timings.
   * The layout-based speed index is the weighted average of the endTime of CPU nodes that contained
   * a 'Layout' task. log(duration) is used as the weight to stand for "significance" to the page.
   *
   * If no layout events can be found or the endTime of a CPU task is too early, FCP is used instead.
   *
   * This approach was determined after evaluating the accuracy/complexity tradeoff of many
   * different methods. Read more in the evaluation doc.
   *
   * @see https://docs.google.com/document/d/1qJWXwxoyVLVadezIp_Tgdk867G3tDNkkVRvUJSH3K1E/edit#
   */
  static computeLayoutBasedSpeedIndex(nodeTimings, fcpTimeInMs) {
    const layoutWeights = [];
    for (const [node, timing] of nodeTimings.entries()) {
      if (node.type !== Graph5.BaseNode.types.CPU) {
        continue;
      }
      if (node.childEvents.some((x) => x.name === "Layout")) {
        const timingWeight = Math.max(Math.log2(timing.endTime - timing.startTime), 0);
        layoutWeights.push({ time: timing.endTime, weight: timingWeight });
      }
    }
    const totalWeightedTime = layoutWeights.map((evt) => evt.weight * Math.max(evt.time, fcpTimeInMs)).reduce((a, b) => a + b, 0);
    const totalWeight = layoutWeights.map((evt) => evt.weight).reduce((a, b) => a + b, 0);
    if (!totalWeight) {
      return fcpTimeInMs;
    }
    return totalWeightedTime / totalWeight;
  }
};

// gen/front_end/models/trace/lantern/metrics/TotalBlockingTime.js
import * as Core6 from "./../core/core.js";
import * as Graph6 from "./../graph/graph.js";

// gen/front_end/models/trace/lantern/metrics/TBTUtils.js
var TBTUtils_exports = {};
__export(TBTUtils_exports, {
  BLOCKING_TIME_THRESHOLD: () => BLOCKING_TIME_THRESHOLD,
  calculateSumOfBlockingTime: () => calculateSumOfBlockingTime,
  calculateTbtImpactForEvent: () => calculateTbtImpactForEvent
});
var BLOCKING_TIME_THRESHOLD = 50;
function calculateTbtImpactForEvent(event, startTimeMs, endTimeMs, topLevelEvent) {
  let threshold = BLOCKING_TIME_THRESHOLD;
  if (topLevelEvent) {
    threshold *= event.duration / topLevelEvent.duration;
  }
  if (event.duration < threshold) {
    return 0;
  }
  if (event.end < startTimeMs) {
    return 0;
  }
  if (event.start > endTimeMs) {
    return 0;
  }
  const clippedStart = Math.max(event.start, startTimeMs);
  const clippedEnd = Math.min(event.end, endTimeMs);
  const clippedDuration = clippedEnd - clippedStart;
  if (clippedDuration < threshold) {
    return 0;
  }
  return clippedDuration - threshold;
}
function calculateSumOfBlockingTime(topLevelEvents, startTimeMs, endTimeMs) {
  if (endTimeMs <= startTimeMs) {
    return 0;
  }
  let sumBlockingTime = 0;
  for (const event of topLevelEvents) {
    sumBlockingTime += calculateTbtImpactForEvent(event, startTimeMs, endTimeMs);
  }
  return sumBlockingTime;
}

// gen/front_end/models/trace/lantern/metrics/TotalBlockingTime.js
var TotalBlockingTime = class _TotalBlockingTime extends Metric {
  static get coefficients() {
    return {
      intercept: 0,
      optimistic: 0.5,
      pessimistic: 0.5
    };
  }
  static getOptimisticGraph(dependencyGraph) {
    return dependencyGraph;
  }
  static getPessimisticGraph(dependencyGraph) {
    return dependencyGraph;
  }
  static getEstimateFromSimulation(simulation, extras) {
    if (!extras.fcpResult) {
      throw new Core6.LanternError("missing fcpResult");
    }
    if (!extras.interactiveResult) {
      throw new Core6.LanternError("missing interactiveResult");
    }
    const fcpTimeInMs = extras.optimistic ? extras.fcpResult.pessimisticEstimate.timeInMs : extras.fcpResult.optimisticEstimate.timeInMs;
    const interactiveTimeMs = extras.optimistic ? extras.interactiveResult.optimisticEstimate.timeInMs : extras.interactiveResult.pessimisticEstimate.timeInMs;
    const minDurationMs = BLOCKING_TIME_THRESHOLD;
    const events = _TotalBlockingTime.getTopLevelEvents(simulation.nodeTimings, minDurationMs);
    return {
      timeInMs: calculateSumOfBlockingTime(events, fcpTimeInMs, interactiveTimeMs),
      nodeTimings: simulation.nodeTimings
    };
  }
  static compute(data, extras) {
    const fcpResult = extras?.fcpResult;
    if (!fcpResult) {
      throw new Core6.LanternError("FCP is required to calculate the TBT metric");
    }
    const interactiveResult = extras?.fcpResult;
    if (!interactiveResult) {
      throw new Core6.LanternError("Interactive is required to calculate the TBT metric");
    }
    return super.compute(data, extras);
  }
  static getTopLevelEvents(nodeTimings, minDurationMs) {
    const events = [];
    for (const [node, timing] of nodeTimings.entries()) {
      if (node.type !== Graph6.BaseNode.types.CPU) {
        continue;
      }
      if (timing.duration < minDurationMs) {
        continue;
      }
      events.push({
        start: timing.startTime,
        end: timing.endTime,
        duration: timing.duration
      });
    }
    return events;
  }
};
export {
  FirstContentfulPaint,
  Interactive,
  LargestContentfulPaint,
  MaxPotentialFID,
  Metric,
  SpeedIndex,
  TBTUtils_exports as TBTUtils,
  TotalBlockingTime
};
//# sourceMappingURL=metrics.js.map
