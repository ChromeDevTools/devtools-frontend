// Copyright 2025 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as Platform from '../../../core/platform/platform.js';
import * as TimelineUtils from '../../../panels/timeline/utils/utils.js';
import * as Trace from '../../trace/trace.js';

import {PerformanceInsightFormatter, TraceEventFormatter} from './PerformanceInsightFormatter.js';

const ms = (ms: number): string => `${Platform.NumberUtilities.floor(ms, 1)} ms`;
const kb = (bytes: number): string => `${Math.round(bytes / 1000)} kB`;

export class PerformanceTraceFormatter {
  #parsedTrace: Trace.Handlers.Types.ParsedTrace;
  #insightSet: Trace.Insights.Types.InsightSet|null;
  #traceMetadata: Trace.Types.File.MetaData;
  #eventsSerializer: TimelineUtils.EventsSerializer.EventsSerializer;

  constructor(
      focus: TimelineUtils.AIContext.AgentFocus, eventsSerializer: TimelineUtils.EventsSerializer.EventsSerializer) {
    if (focus.data.type !== 'full') {
      throw new Error('unexpected agent focus');
    }

    this.#parsedTrace = focus.data.parsedTrace;
    this.#insightSet = focus.data.insightSet;
    this.#traceMetadata = focus.data.traceMetadata;
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
    const traceMetadata = this.#traceMetadata;

    const parts = [];

    const lcp = insightSet ? Trace.Insights.Common.getLCP(insightSet) : null;
    const cls = insightSet ? Trace.Insights.Common.getCLS(insightSet) : null;
    const inp = insightSet ? Trace.Insights.Common.getINP(insightSet) : null;

    parts.push(`URL: ${parsedTrace.Meta.mainFrameURL}`);
    parts.push(`Bounds: ${this.serializeBounds(parsedTrace.Meta.traceBounds)}`);
    parts.push('CPU throttling: ' + (traceMetadata.cpuThrottling ? `${traceMetadata.cpuThrottling}x` : 'none'));
    parts.push(`Network throttling: ${traceMetadata.networkThrottling ?? 'none'}`);
    if (lcp || cls || inp) {
      parts.push('Metrics:');
      if (lcp) {
        parts.push(`  - LCP: ${Math.round(lcp.value / 1000)} ms, event: ${this.serializeEvent(lcp.event)}`);
        const subparts = insightSet?.model.LCPBreakdown.subparts;
        if (subparts) {
          const serializeSubpart = (subpart: Trace.Insights.Models.LCPBreakdown.Subpart): string => {
            return `${ms(subpart.range / 1000)}, bounds: ${this.serializeBounds(subpart)}`;
          };
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
      parts.push('Metrics: n/a');
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

        const insightBounds = TimelineUtils.InsightAIContext.insightBounds(model, insightSet.bounds);
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
          insightParts.push(`estimated wasted bytes: ${kb(model.wastedBytes)}`);
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

    function nodeToText(node: Trace.Extras.TraceTree.Node): string {
      const event = node.event;

      let frame = Trace.Helpers.Trace.getZeroIndexedStackTraceInEventPayload(event)?.[0];
      if (Trace.Types.Events.isProfileCall(event)) {
        frame = event.callFrame;
      }

      let source = TimelineUtils.EntryName.nameForEntry(event);
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

      return `- self: ${ms(node.selfTime)}, total: ${ms(node.totalTime)}, source: ${source}`;
    }

    const listText = topNodes.map(nodeToText).join('\n');
    const format = `This is the bottom-up summary for the entire trace. Only the top ${
        limit} activities (sorted by self time) are shown. An activity is all the aggregated time spent on the same type of work. For example, it can be all the time spent in a specific JavaScript function, or all the time spent in a specific browser rendering stage (like layout, v8 compile, parsing html). "Self time" represents the aggregated time spent directly in an activity, across all occurrences. "Total time" represents the aggregated time spent in an activity or any of its children.`;
    return `${format}\n\n${listText}`;
  }

  formatMainThreadBottomUpSummary(): string {
    const parsedTrace = this.#parsedTrace;
    const insightSet = this.#insightSet;

    const bounds = parsedTrace.Meta.traceBounds;
    const rootNode = TimelineUtils.InsightAIContext.AIQueries.mainThreadActivityBottomUp(
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
                           const transferSize = `${kb(s.transferSize)}`;
                           return `- name: ${s.entity.name}, main thread time: ${
                               ms(s.mainThreadTime)}, network transfer size: ${transferSize}`;
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

    const bounds = parsedTrace.Meta.traceBounds;
    const longestTaskTrees = TimelineUtils.InsightAIContext.AIQueries.longestTasks(
        insightSet?.navigation?.args.data?.navigationId, bounds, parsedTrace, 3);
    if (!longestTaskTrees || longestTaskTrees.length === 0) {
      return 'Longest tasks: none';
    }

    const listText = longestTaskTrees
                         .map(tree => {
                           const time = ms(tree.rootNode.totalTime);
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
      const eventsString = events.slice(0, 5)
                               .map(e => TimelineUtils.EntryName.nameForEntry(e) + ' ' + this.serializeEvent(e))
                               .join(', ');
      results.push(`- ${insightKey}: ${eventsString}`);
    }
    return results.join('\n');
  }

  formatMainThreadTrackSummary(bounds: Trace.Types.Timing.TraceWindowMicro): string {
    const results = [];

    const topDownTree = TimelineUtils.InsightAIContext.AIQueries.mainThreadActivityTopDown(
        this.#insightSet?.navigation?.args.data?.navigationId,
        bounds,
        this.#parsedTrace,
    );
    if (topDownTree) {
      results.push('# Top-down main thread summary');
      results.push(topDownTree.serialize(2 /* headerLevel */));
    }

    const bottomUpRootNode = TimelineUtils.InsightAIContext.AIQueries.mainThreadActivityBottomUp(
        this.#insightSet?.navigation?.args.data?.navigationId,
        bounds,
        this.#parsedTrace,
    );
    if (bottomUpRootNode) {
      results.push('# Bottom-up main thread summary');
      results.push(this.#serializeBottomUpRootNode(bottomUpRootNode, 20));
    }

    const thirdPartySummaries = Trace.Extras.ThirdParties.summarizeByThirdParty(this.#parsedTrace, bounds);
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

    const requests = this.#parsedTrace.NetworkRequests.byTime.filter(
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
}
