// Copyright 2025 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as CrUXManager from '../../crux-manager/crux-manager.js';
import * as Trace from '../../trace/trace.js';
import type {AICallTree} from '../performance/AICallTree.js';
import type {AgentFocus} from '../performance/AIContext.js';
import {AIQueries} from '../performance/AIQueries.js';

import {PerformanceInsightFormatter, TraceEventFormatter} from './PerformanceInsightFormatter.js';
import {bytes, micros, millis} from './UnitFormatters.js';

export class PerformanceTraceFormatter {
  #parsedTrace: Trace.TraceModel.ParsedTrace;
  #insightSet: Trace.Insights.Types.InsightSet|null;
  #eventsSerializer: Trace.EventsSerializer.EventsSerializer;

  constructor(focus: AgentFocus, eventsSerializer: Trace.EventsSerializer.EventsSerializer) {
    this.#parsedTrace = focus.data.parsedTrace;
    this.#insightSet = focus.data.insightSet;
    this.#eventsSerializer = eventsSerializer;
  }

  serializeEvent(event: Trace.Types.Events.Event): string {
    const key = this.#eventsSerializer.keyForEvent(event);
    return `(eventKey: ${key}, ts: ${event.ts})`;
  }

  serializeBounds(bounds: Trace.Types.Timing.TraceWindowMicro): string {
    return `{min: ${bounds.min}, max: ${bounds.max}}`;
  }

  formatTraceSummary(): string {
    const parsedTrace = this.#parsedTrace;
    const insightSet = this.#insightSet;
    const traceMetadata = this.#parsedTrace.metadata;
    const data = parsedTrace.data;

    const parts = [];

    const lcp = insightSet ? Trace.Insights.Common.getLCP(insightSet) : null;
    const cls = insightSet ? Trace.Insights.Common.getCLS(insightSet) : null;
    const inp = insightSet ? Trace.Insights.Common.getINP(insightSet) : null;

    parts.push(`URL: ${data.Meta.mainFrameURL}`);
    parts.push(`Bounds: ${this.serializeBounds(data.Meta.traceBounds)}`);
    parts.push('CPU throttling: ' + (traceMetadata.cpuThrottling ? `${traceMetadata.cpuThrottling}x` : 'none'));
    parts.push(`Network throttling: ${traceMetadata.networkThrottling ?? 'none'}`);
    if (lcp || cls || inp) {
      parts.push('Metrics (lab / observed):');
      if (lcp) {
        parts.push(`  - LCP: ${Math.round(lcp.value / 1000)} ms, event: ${this.serializeEvent(lcp.event)}`);
        const subparts = insightSet?.model.LCPBreakdown.subparts;
        if (subparts) {
          const serializeSubpart = (subpart: Trace.Insights.Models.LCPBreakdown.Subpart): string => {
            return `${micros(subpart.range)}, bounds: ${this.serializeBounds(subpart)}`;
          };
          parts.push('  - LCP breakdown:');
          parts.push(`    - TTFB: ${serializeSubpart(subparts.ttfb)}`);
          if (subparts.loadDelay !== undefined) {
            parts.push(`    - Load delay: ${serializeSubpart(subparts.loadDelay)}`);
          }
          if (subparts.loadDuration !== undefined) {
            parts.push(`    - Load duration: ${serializeSubpart(subparts.loadDuration)}`);
          }
          parts.push(`    - Render delay: ${serializeSubpart(subparts.renderDelay)}`);
        }
      }
      if (inp) {
        parts.push(`  - INP: ${Math.round(inp.value / 1000)} ms, event: ${this.serializeEvent(inp.event)}`);
      }
      if (cls) {
        const eventText = cls.worstClusterEvent ? `, event: ${this.serializeEvent(cls.worstClusterEvent)}` : '';
        parts.push(`  - CLS: ${cls.value.toFixed(2)}${eventText}`);
      }
    } else {
      parts.push('Metrics (lab / observed): n/a');
    }

    const fieldMetrics = insightSet &&
        Trace.Insights.Common.getFieldMetricsForInsightSet(
            insightSet, traceMetadata, CrUXManager.CrUXManager.instance().getSelectedScope());
    const fieldLcp = fieldMetrics?.lcp;
    const fieldInp = fieldMetrics?.inp;
    const fieldCls = fieldMetrics?.cls;

    if (fieldLcp || fieldInp || fieldCls) {
      parts.push('Metrics (field / real users):');

      const serializeFieldMetricTimingResult =
          (fieldMetric: Trace.Insights.Common.CrUXFieldMetricTimingResult): string => {
            return `${Math.round(fieldMetric.value / 1000)} ms (scope: ${fieldMetric.pageScope})`;
          };

      const serializeFieldMetricNumberResult =
          (fieldMetric: Trace.Insights.Common.CrUXFieldMetricNumberResult): string => {
            return `${fieldMetric.value.toFixed(2)} (scope: ${fieldMetric.pageScope})`;
          };

      if (fieldLcp) {
        parts.push(`  - LCP: ${serializeFieldMetricTimingResult(fieldLcp)}`);

        const fieldLcpBreakdown = fieldMetrics?.lcpBreakdown;
        if (fieldLcpBreakdown &&
            (fieldLcpBreakdown.ttfb || fieldLcpBreakdown.loadDelay || fieldLcpBreakdown.loadDuration ||
             fieldLcpBreakdown.renderDelay)) {
          parts.push('  - LCP breakdown:');
          if (fieldLcpBreakdown.ttfb) {
            parts.push(`    - TTFB: ${serializeFieldMetricTimingResult(fieldLcpBreakdown.ttfb)}`);
          }
          if (fieldLcpBreakdown.loadDelay) {
            parts.push(`    - Load delay: ${serializeFieldMetricTimingResult(fieldLcpBreakdown.loadDelay)}`);
          }
          if (fieldLcpBreakdown.loadDuration) {
            parts.push(`    - Load duration: ${serializeFieldMetricTimingResult(fieldLcpBreakdown.loadDuration)}`);
          }
          if (fieldLcpBreakdown.renderDelay) {
            parts.push(`    - Render delay: ${serializeFieldMetricTimingResult(fieldLcpBreakdown.renderDelay)}`);
          }
        }
      }
      if (fieldInp) {
        parts.push(`  - INP: ${serializeFieldMetricTimingResult(fieldInp)}`);
      }
      if (fieldCls) {
        parts.push(`  - CLS: ${serializeFieldMetricNumberResult(fieldCls)}`);
      }

      parts.push(
          '  - The above data is from CrUX–Chrome User Experience Report. It\'s how the page performs for real users.');
      parts.push('  - The values shown above are the p75 measure of all real Chrome users');
      parts.push('  - The scope indicates if the data came from the entire origin, or a specific url');
      parts.push(
          '  - Lab metrics describe how this specific page load performed, while field metrics are an aggregation ' +
          'of results from real-world users. Best practice is to prioritize metrics that are bad in field data. ' +
          'Lab metrics may be better or worse than fields metrics depending on the developer\'s machine, network, or the ' +
          'actions performed while tracing.');
    } else {
      parts.push('Metrics (field / real users): n/a – no data for this page in CrUX');
    }

    if (insightSet) {
      parts.push('Available insights:');
      for (const [insightName, model] of Object.entries(insightSet.model)) {
        if (model.state === 'pass') {
          continue;
        }

        const formatter = new PerformanceInsightFormatter(parsedTrace, model);
        if (!formatter.insightIsSupported()) {
          continue;
        }

        const insightBounds = Trace.Insights.Common.insightBounds(model, insightSet.bounds);
        const insightParts = [
          `insight name: ${insightName}`,
          `description: ${model.description}`,
          `relevant trace bounds: ${this.serializeBounds(insightBounds)}`,
        ];
        const metricSavingsText = formatter.estimatedSavings();
        if (metricSavingsText) {
          insightParts.push(`estimated metric savings: ${metricSavingsText}`);
        }
        if (model.wastedBytes) {
          insightParts.push(`estimated wasted bytes: ${bytes(model.wastedBytes)}`);
        }
        for (const suggestion of formatter.getSuggestions()) {
          insightParts.push(`example question: ${suggestion.title}`);
        }
        const insightPartsText = insightParts.join('\n    ');
        parts.push(`  - ${insightPartsText}`);
      }
    } else {
      parts.push('Available insights: none');
    }

    return parts.join('\n');
  }

  formatCriticalRequests(): string {
    const parsedTrace = this.#parsedTrace;
    const insightSet = this.#insightSet;
    const criticalRequests: Trace.Types.Events.SyntheticNetworkRequest[] = [];

    const walkRequest = (node: Trace.Insights.Models.NetworkDependencyTree.CriticalRequestNode): void => {
      criticalRequests.push(node.request);
      node.children.forEach(walkRequest);
    };

    insightSet?.model.NetworkDependencyTree.rootNodes.forEach(walkRequest);
    if (!criticalRequests.length) {
      return '';
    }

    return 'Critical network requests:\n' +
        TraceEventFormatter.networkRequests(criticalRequests, parsedTrace, {verbose: false});
  }

  #serializeBottomUpRootNode(rootNode: Trace.Extras.TraceTree.BottomUpRootNode, limit: number): string {
    // Sorted by selfTime.
    // No nodes less than 1 ms.
    // Limit.
    const topNodes = [...rootNode.children().values()]
                         .filter(n => n.totalTime >= 1)
                         .sort((a, b) => b.selfTime - a.selfTime)
                         .slice(0, limit);

    function nodeToText(this: PerformanceTraceFormatter, node: Trace.Extras.TraceTree.Node): string {
      const event = node.event;

      let frame;
      if (Trace.Types.Events.isProfileCall(event)) {
        frame = event.callFrame;
      } else {
        frame = Trace.Helpers.Trace.getStackTraceTopCallFrameInEventPayload(event);
      }

      let source = Trace.Name.forEntry(event);
      if (frame?.url) {
        source += ` (url: ${frame.url}`;
        if (frame.lineNumber !== -1) {
          source += `, line: ${frame.lineNumber}`;
        }
        if (frame.columnNumber !== -1) {
          source += `, column: ${frame.columnNumber}`;
        }
        source += ')';
      }

      return `- self: ${millis(node.selfTime)}, total: ${millis(node.totalTime)}, source: ${source}`;
    }

    const listText = topNodes.map(node => nodeToText.call(this, node)).join('\n');
    const format = `This is the bottom-up summary for the entire trace. Only the top ${
        limit} activities (sorted by self time) are shown. An activity is all the aggregated time spent on the same type of work. For example, it can be all the time spent in a specific JavaScript function, or all the time spent in a specific browser rendering stage (like layout, v8 compile, parsing html). "Self time" represents the aggregated time spent directly in an activity, across all occurrences. "Total time" represents the aggregated time spent in an activity or any of its children.`;
    return `${format}\n\n${listText}`;
  }

  formatMainThreadBottomUpSummary(): string {
    const parsedTrace = this.#parsedTrace;
    const insightSet = this.#insightSet;

    const bounds = parsedTrace.data.Meta.traceBounds;
    const rootNode = AIQueries.mainThreadActivityBottomUp(
        insightSet?.navigation?.args.data?.navigationId,
        bounds,
        parsedTrace,
    );
    if (!rootNode) {
      return '';
    }

    return this.#serializeBottomUpRootNode(rootNode, 10);
  }

  #formatThirdPartyEntitySummaries(summaries: Trace.Extras.ThirdParties.EntitySummary[]): string {
    const topMainThreadTimeEntries = summaries.toSorted((a, b) => b.mainThreadTime - a.mainThreadTime).slice(0, 5);
    if (!topMainThreadTimeEntries.length) {
      return '';
    }

    const listText = topMainThreadTimeEntries
                         .map(s => {
                           const transferSize = `${bytes(s.transferSize)}`;
                           return `- name: ${s.entity.name}, main thread time: ${
                               millis(s.mainThreadTime)}, network transfer size: ${transferSize}`;
                         })
                         .join('\n');
    return listText;
  }

  formatThirdPartySummary(): string {
    const insightSet = this.#insightSet;
    if (!insightSet) {
      return '';
    }

    const thirdParties = insightSet.model.ThirdParties;
    let summaries = thirdParties.entitySummaries ?? [];
    if (thirdParties.firstPartyEntity) {
      summaries = summaries.filter(s => s.entity !== thirdParties?.firstPartyEntity || null);
    }

    const listText = this.#formatThirdPartyEntitySummaries(summaries);
    if (!listText) {
      return '';
    }

    return `Third party summary:\n${listText}`;
  }

  formatLongestTasks(): string {
    const parsedTrace = this.#parsedTrace;
    const insightSet = this.#insightSet;

    const bounds = parsedTrace.data.Meta.traceBounds;
    const longestTaskTrees =
        AIQueries.longestTasks(insightSet?.navigation?.args.data?.navigationId, bounds, parsedTrace, 3);
    if (!longestTaskTrees || longestTaskTrees.length === 0) {
      return 'Longest tasks: none';
    }

    const listText = longestTaskTrees
                         .map(tree => {
                           const time = millis(tree.rootNode.totalTime);
                           return `- total time: ${time}, event: ${this.serializeEvent(tree.rootNode.event)}`;
                         })
                         .join('\n');
    return `Longest ${longestTaskTrees.length} tasks:\n${listText}`;
  }

  #serializeRelatedInsightsForEvents(events: Trace.Types.Events.Event[]): string {
    if (!events.length) {
      return '';
    }

    const insightNameToRelatedEvents = new Map<string, Trace.Types.Events.Event[]>();
    if (this.#insightSet) {
      for (const model of Object.values(this.#insightSet.model)) {
        if (!model.relatedEvents) {
          continue;
        }

        const modeRelatedEvents =
            Array.isArray(model.relatedEvents) ? model.relatedEvents : [...model.relatedEvents.keys()];
        if (!modeRelatedEvents.length) {
          continue;
        }

        const relatedEvents = modeRelatedEvents.filter(e => events.includes(e));
        if (relatedEvents.length) {
          insightNameToRelatedEvents.set(model.insightKey, relatedEvents);
        }
      }
    }

    if (!insightNameToRelatedEvents.size) {
      return '';
    }

    const results = [];
    for (const [insightKey, events] of insightNameToRelatedEvents) {
      // Limit to 5, because some insights (namely ThirdParties) can have a huge
      // number of related events. Mostly, insights probably don't have more than
      // 5.
      const eventsString =
          events.slice(0, 5).map(e => Trace.Name.forEntry(e) + ' ' + this.serializeEvent(e)).join(', ');
      results.push(`- ${insightKey}: ${eventsString}`);
    }
    return results.join('\n');
  }

  formatMainThreadTrackSummary(bounds: Trace.Types.Timing.TraceWindowMicro): string {
    const results = [];

    const topDownTree = AIQueries.mainThreadActivityTopDown(
        this.#insightSet?.navigation?.args.data?.navigationId,
        bounds,
        this.#parsedTrace,
    );
    if (topDownTree) {
      results.push('# Top-down main thread summary');
      results.push(this.formatCallTree(topDownTree, 2 /* headerLevel */));
    }

    const bottomUpRootNode = AIQueries.mainThreadActivityBottomUp(
        this.#insightSet?.navigation?.args.data?.navigationId,
        bounds,
        this.#parsedTrace,
    );
    if (bottomUpRootNode) {
      results.push('# Bottom-up main thread summary');
      results.push(this.#serializeBottomUpRootNode(bottomUpRootNode, 20));
    }

    const thirdPartySummaries = Trace.Extras.ThirdParties.summarizeByThirdParty(this.#parsedTrace.data, bounds);
    if (thirdPartySummaries.length) {
      results.push('# Third parties');
      results.push(this.#formatThirdPartyEntitySummaries(thirdPartySummaries));
    }

    const relatedInsightsText = this.#serializeRelatedInsightsForEvents(
        [...topDownTree?.rootNode.events ?? [], ...bottomUpRootNode?.events ?? []]);
    if (relatedInsightsText) {
      results.push('# Related insights');
      results.push(
          'Here are all the insights that contain some related event from the main thread in the given range.');
      results.push(relatedInsightsText);
    }

    if (!results.length) {
      return 'No main thread activity found';
    }

    return results.join('\n\n');
  }

  formatNetworkTrackSummary(bounds: Trace.Types.Timing.TraceWindowMicro): string {
    const results = [];

    const requests = this.#parsedTrace.data.NetworkRequests.byTime.filter(
        request => Trace.Helpers.Timing.eventIsInBounds(request, bounds));
    const requestsText = TraceEventFormatter.networkRequests(requests, this.#parsedTrace, {verbose: false});
    results.push('# Network requests summary');
    results.push(requestsText || 'No requests in the given bounds');

    const relatedInsightsText = this.#serializeRelatedInsightsForEvents(requests);
    if (relatedInsightsText) {
      results.push('# Related insights');
      results.push('Here are all the insights that contain some related request from the given range.');
      results.push(relatedInsightsText);
    }

    return results.join('\n\n');
  }

  formatCallTree(tree: AICallTree, headerLevel = 1): string {
    const results = [tree.serialize(headerLevel), ''];

    // TODO(b/425270067): add eventKey to tree.serialize, but need to wait for other
    // performance agent to be consolidated.
    results.push('#'.repeat(headerLevel) + ' Node id to eventKey\n');
    results.push('These node ids correspond to the call tree nodes listed in the above section.\n');
    tree.breadthFirstWalk(tree.rootNode.children().values(), (node, nodeId) => {
      results.push(`${nodeId}: ${this.#eventsSerializer.keyForEvent(node.event)}`);
    });

    results.push('\nIMPORTANT: Never show eventKey to the user.');

    return results.join('\n');
  }
}
