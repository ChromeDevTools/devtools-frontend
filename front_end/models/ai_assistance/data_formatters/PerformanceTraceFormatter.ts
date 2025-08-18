// Copyright 2025 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as Platform from '../../../core/platform/platform.js';
import * as TimelineUtils from '../../../panels/timeline/utils/utils.js';
import * as Trace from '../../trace/trace.js';

import {PerformanceInsightFormatter, TraceEventFormatter} from './PerformanceInsightFormatter.js';

const ms = (ms: number): string => `${Platform.NumberUtilities.floor(ms, 1)} ms`;

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
      }
      if (inp) {
        parts.push(`  - INP: ${Math.round(inp.value / 1000)} ms, event: ${this.serializeEvent(inp.event)}`);
      }
      if (cls) {
        const eventText = cls.worstClusterEvent ? `, event: ${this.serializeEvent(cls.worstClusterEvent)}` : '';
        parts.push(`  - CLS: ${cls.value}${eventText}`);
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
          insightParts.push(`estimated wasted bytes: ${Math.round(model.wastedBytes / 1000)} kB`);
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

    // Sorted by selfTime.
    // No nodes less than 1 ms.
    // Limit 10.
    const topNodes = [...rootNode.children().values()]
                         .filter(n => n.totalTime >= 1)
                         .sort((a, b) => b.selfTime - a.selfTime)
                         .slice(0, 10);

    function nodeToText(node: Trace.Extras.TraceTree.Node): string {
      const event = node.event;

      let frame = Trace.Helpers.Trace.getZeroIndexedStackTraceInEventPayload(event)?.[0];
      if (Trace.Types.Events.isProfileCall(event)) {
        frame = event.callFrame;
      }

      let source: string;
      if (frame) {
        source = `${frame.functionName}`;
        if (frame.url) {
          source += ` (url: ${frame.url}`;
          if (frame.lineNumber !== -1) {
            source += `, line: ${frame.lineNumber}`;
          }
          if (frame.columnNumber !== -1) {
            source += `, column: ${frame.columnNumber}`;
          }
          source += ')';
        }
      } else {
        source = String(node.id);
      }

      return `- self: ${ms(node.selfTime)}, total: ${ms(node.totalTime)}, source: ${source}`;
    }

    const listText = topNodes.map(nodeToText).join('\n');
    const format =
        'This is the bottom-up summary for the entire trace. Only the top 10 activities (sorted by self time) are shown. An activity is all the aggregated time spent on the same type of work. For example, it can be all the time spent in a specific JavaScript function, or all the time spent in a specific browser rendering stage (like layout, v8 compile, parsing html). "Self time" represents the aggregated time spent directly in an activity, across all occurrences. "Total time" represents the aggregated time spent in an activity or any of its children.';
    return `${format}\n${listText}`;
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
    const topMainThreadTimeEntries = summaries.toSorted((a, b) => b.mainThreadTime - a.mainThreadTime).slice(0, 5);
    if (!topMainThreadTimeEntries.length) {
      return '';
    }

    const listText = topMainThreadTimeEntries
                         .map(s => {
                           const transferSize = `${Math.round(s.transferSize / 1000)} kB`;
                           return `- name: ${s.entity.name}, main thread time: ${
                               ms(s.mainThreadTime)}, network transfer size: ${transferSize}`;
                         })
                         .join('\n');
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

  formatMainThreadTrackSummary(min: Trace.Types.Timing.Micro, max: Trace.Types.Timing.Micro): string {
    const tree = TimelineUtils.InsightAIContext.AIQueries.mainThreadActivityTopDown(
        this.#insightSet?.navigation?.args.data?.navigationId,
        {min, max, range: (max - min) as Trace.Types.Timing.Micro},
        this.#parsedTrace,
    );
    if (!tree) {
      return 'No main thread activity found';
    }

    // TODO(b/425270067): include eventKey for each node/event (instead of "id").
    return tree.serialize();
  }
}
