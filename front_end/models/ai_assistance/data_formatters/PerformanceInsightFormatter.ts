// Copyright 2025 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as Common from '../../../core/common/common.js';
import * as Trace from '../../trace/trace.js';
import type {ConversationSuggestions} from '../agents/AiAgent.js';
import type {AgentFocus} from '../performance/AIContext.js';

import {PerformanceTraceFormatter} from './PerformanceTraceFormatter.js';
import {bytes, millis} from './UnitFormatters.js';

/**
 * For a given frame ID and navigation ID, returns the LCP Event and the LCP Request, if the resource was an image.
 */
function getLCPData(parsedTrace: Trace.TraceModel.ParsedTrace, frameId: string, navigationId: string): {
  lcpEvent: Trace.Types.Events.LargestContentfulPaintCandidate,
  metricScore: Trace.Handlers.ModelHandlers.PageLoadMetrics.LCPMetricScore,
  lcpRequest?: Trace.Types.Events.SyntheticNetworkRequest,
}|null {
  const navMetrics = parsedTrace.data.PageLoadMetrics.metricScoresByFrameId.get(frameId)?.get(navigationId);
  if (!navMetrics) {
    return null;
  }

  const metric = navMetrics.get(Trace.Handlers.ModelHandlers.PageLoadMetrics.MetricName.LCP);
  if (!metric || !Trace.Handlers.ModelHandlers.PageLoadMetrics.metricIsLCP(metric)) {
    return null;
  }
  const lcpEvent = metric?.event;
  if (!lcpEvent || !Trace.Types.Events.isLargestContentfulPaintCandidate(lcpEvent)) {
    return null;
  }

  return {
    lcpEvent,
    lcpRequest: parsedTrace.data.LargestImagePaint.lcpRequestByNavigationId.get(navigationId),
    metricScore: metric,
  };
}

export class PerformanceInsightFormatter extends PerformanceTraceFormatter {
  #insight: Trace.Insights.Types.InsightModel;
  #parsedTrace: Trace.TraceModel.ParsedTrace;

  constructor(focus: AgentFocus, insight: Trace.Insights.Types.InsightModel) {
    super(focus);
    this.#insight = insight;
    this.#parsedTrace = focus.data.parsedTrace;
  }

  #formatMilli(x?: number): string {
    if (x === undefined) {
      return '';
    }
    return millis(x);
  }

  #formatMicro(x?: number): string {
    if (x === undefined) {
      return '';
    }
    return this.#formatMilli(Trace.Helpers.Timing.microToMilli(x as Trace.Types.Timing.Micro));
  }

  /**
   * Information about LCP which we pass to the LLM for all insights that relate to LCP.
   */
  #lcpMetricSharedContext(): string {
    if (!this.#insight.navigationId) {
      // No navigation ID = no LCP.
      return '';
    }
    if (!this.#insight.frameId || !this.#insight.navigationId) {
      return '';
    }

    const data = getLCPData(this.#parsedTrace, this.#insight.frameId, this.#insight.navigationId);
    if (!data) {
      return '';
    }

    const {metricScore, lcpRequest, lcpEvent} = data;
    const theLcpElement =
        lcpEvent.args.data?.nodeName ? `The LCP element (${lcpEvent.args.data.nodeName})` : 'The LCP element';
    const parts: string[] = [
      `The Largest Contentful Paint (LCP) time for this navigation was ${this.#formatMicro(metricScore.timing)}.`,
    ];

    if (lcpRequest) {
      parts.push(`${theLcpElement} is an image fetched from \`${lcpRequest.args.data.url}\`.`);
      const request =
          this.formatNetworkRequests([lcpRequest], {verbose: true, customTitle: 'LCP resource network request'});
      parts.push(request);
    } else {
      parts.push(`${theLcpElement} is text and was not fetched from the network.`);
    }

    return parts.join('\n');
  }

  insightIsSupported(): boolean {
    // Although our types don't show it, Insights can end up as Errors if there
    // is an issue in the processing stage. In this case we should gracefully
    // ignore this error.
    if (this.#insight instanceof Error) {
      return false;
    }
    return typeof this.#description() === 'string';
  }

  getSuggestions(): ConversationSuggestions {
    switch (this.#insight.insightKey) {
      case 'CLSCulprits':
        return [
          {title: 'Help me optimize my CLS score'},
          {title: 'How can I prevent layout shifts on this page?'},
        ];
      case 'DocumentLatency':
        return [
          {title: 'How do I decrease the initial loading time of my page?'},
          {title: 'Did anything slow down the request for this document?'},
        ];
      case 'DOMSize':
        return [{title: 'How can I reduce the size of my DOM?'}];
      case 'DuplicatedJavaScript':
        return [
          {title: 'How do I deduplicate the identified scripts in my bundle?'},
          {title: 'Which duplicated JavaScript modules are the most problematic?'}
        ];
      case 'FontDisplay':
        return [
          {title: 'How can I update my CSS to avoid layout shifts caused by incorrect `font-display` properties?'}
        ];
      case 'ForcedReflow':
        return [
          {title: 'How can I avoid forced reflows and layout thrashing?'},
          {title: 'What is forced reflow and why is it problematic?'}
        ];
      case 'ImageDelivery':
        return [
          {title: 'What should I do to improve and optimize the time taken to fetch and display images on the page?'},
          {title: 'Are all images on my site optimized?'},
        ];
      case 'INPBreakdown':
        return [
          {title: 'Suggest fixes for my longest interaction'}, {title: 'Why is a large INP score problematic?'},
          {title: 'What\'s the biggest contributor to my longest interaction?'}
        ];
      case 'LCPDiscovery':
        return [
          {title: 'Suggest fixes to reduce my LCP'}, {title: 'What can I do to reduce my LCP discovery time?'},
          {title: 'Why is LCP discovery time important?'}
        ];
      case 'LCPBreakdown':
        return [
          {title: 'Help me optimize my LCP score'}, {title: 'Which LCP phase was most problematic?'},
          {title: 'What can I do to reduce the LCP time for this page load?'}
        ];
      case 'NetworkDependencyTree':
        return [{title: 'How do I optimize my network dependency tree?'}];
      case 'RenderBlocking':
        return [
          {title: 'Show me the most impactful render blocking requests that I should focus on'},
          {title: 'How can I reduce the number of render blocking requests?'}
        ];
      case 'SlowCSSSelector':
        return [{title: 'How can I optimize my CSS to increase the performance of CSS selectors?'}];
      case 'ThirdParties':
        return [{title: 'Which third parties are having the largest impact on my page performance?'}];
      case 'Cache':
        return [{title: 'What caching strategies can I apply to improve my page performance?'}];
      case 'Viewport':
        return [{title: 'How do I make sure my page is optimized for mobile viewing?'}];
      case 'ModernHTTP':
        return [
          {title: 'Is my site using the best HTTP practices?'},
          {title: 'Which resources are not using a modern HTTP protocol?'},
        ];
      case 'LegacyJavaScript':
        return [
          {title: 'Is my site polyfilling modern JavaScript features?'},
          {title: 'How can I reduce the amount of legacy JavaScript on my page?'},
        ];
      default:
        throw new Error('Unknown insight key');
    }
  }

  /**
   * Create an AI prompt string out of the Cache Insight model to use with Ask AI.
   * Note: This function accesses the UIStrings within Cache to help build the
   * AI prompt, but does not (and should not) call i18nString to localize these strings. They
   * should all be sent in English (at least for now).
   * @param insight The Cache Insight Model to query.
   * @returns a string formatted for sending to Ask AI.
   */
  formatCacheInsight(insight: Trace.Insights.Models.Cache.CacheInsightModel): string {
    if (insight.requests.length === 0) {
      return Trace.Insights.Models.Cache.UIStrings.noRequestsToCache + '.';
    }

    let output = 'The following resources were associated with ineffficient cache policies:\n';

    for (const entry of insight.requests) {
      output += `\n- ${entry.request.args.data.url}`;
      output += `\n  - Cache Time to Live (TTL): ${entry.ttl} seconds`;
      output += `\n  - Wasted bytes: ${bytes(entry.wastedBytes)}`;
    }

    output += '\n\n' + Trace.Insights.Models.Cache.UIStrings.description;
    return output;
  }

  /**
   * Create an AI prompt string out of the CLS Culprits Insight model to use with Ask AI.
   * @param insight The CLS Culprits Model to query.
   * @returns a string formatted for sending to Ask AI.
   */
  formatClsCulpritsInsight(insight: Trace.Insights.Models.CLSCulprits.CLSCulpritsInsightModel): string {
    const {worstCluster, shifts} = insight;
    if (!worstCluster) {
      return '';
    }

    const baseTime = this.#parsedTrace.data.Meta.traceBounds.min;

    const clusterTimes = {
      start: worstCluster.ts - baseTime,
      end: worstCluster.ts + worstCluster.dur - baseTime,
    } as const;

    const shiftsFormatted = worstCluster.events.map((layoutShift, index) => {
      return TraceEventFormatter.layoutShift(layoutShift, index, this.#parsedTrace, shifts.get(layoutShift));
    });

    return `The worst layout shift cluster was the cluster that started at ${
        this.#formatMicro(clusterTimes.start)} and ended at ${
        this.#formatMicro(clusterTimes.end)}, with a duration of ${this.#formatMicro(worstCluster.dur)}.
The score for this cluster is ${worstCluster.clusterCumulativeScore.toFixed(4)}.

Layout shifts in this cluster:
${shiftsFormatted.join('\n')}`;
  }

  /**
   * Create an AI prompt string out of the Document Latency Insight model to use with Ask AI.
   * @param insight The Document Latency Model to query.
   * @returns a string formatted for sending to Ask AI.
   */
  formatDocumentLatencyInsight(insight: Trace.Insights.Models.DocumentLatency.DocumentLatencyInsightModel): string {
    if (!insight.data) {
      return '';
    }
    const {checklist, documentRequest} = insight.data;
    if (!documentRequest) {
      return '';
    }
    const checklistBulletPoints: Array<{name: string, passed: boolean}> = [];
    checklistBulletPoints.push({
      name: 'The request was not redirected',
      passed: checklist.noRedirects.value,
    });
    checklistBulletPoints.push({
      name: 'Server responded quickly',
      passed: checklist.serverResponseIsFast.value,
    });
    checklistBulletPoints.push({
      name: 'Compression was applied',
      passed: checklist.usesCompression.value,
    });

    return `${this.#lcpMetricSharedContext()}

${this.formatNetworkRequests([documentRequest], {
      verbose: true,
      customTitle: 'Document network request'
    })}

The result of the checks for this insight are:
${checklistBulletPoints.map(point => `- ${point.name}: ${point.passed ? 'PASSED' : 'FAILED'}`).join('\n')}`;
  }

  /**
   * Create an AI prompt string out of the DOM Size model to use with Ask AI.
   * Note: This function accesses the UIStrings within DomSize to help build the
   * AI prompt, but does not (and should not) call i18nString to localize these strings. They
   * should all be sent in English (at least for now).
   * @param insight The DOM Size Insight Model to query.
   * @returns a string formatted for sending to Ask AI.
   */
  formatDomSizeInsight(insight: Trace.Insights.Models.DOMSize.DOMSizeInsightModel): string {
    if (insight.state === 'pass') {
      return 'No DOM size issues were detected.';
    }

    let output = Trace.Insights.Models.DOMSize.UIStrings.description + '\n';

    if (insight.maxDOMStats) {
      output += '\n' + Trace.Insights.Models.DOMSize.UIStrings.statistic + ':\n\n';

      const maxDepthStats = insight.maxDOMStats.args.data.maxDepth;
      const maxChildrenStats = insight.maxDOMStats.args.data.maxChildren;
      output += Trace.Insights.Models.DOMSize.UIStrings.totalElements + ': ' +
          insight.maxDOMStats.args.data.totalElements + '.\n';
      if (maxDepthStats) {
        output += Trace.Insights.Models.DOMSize.UIStrings.maxDOMDepth + ': ' + maxDepthStats.depth +
            ` nodes, starting with element '${maxDepthStats.nodeName}'` +
            ' (node id: ' + maxDepthStats.nodeId + ').\n';
      }
      if (maxChildrenStats) {
        output += Trace.Insights.Models.DOMSize.UIStrings.maxChildren + ': ' + maxChildrenStats.numChildren +
            `, for parent '${maxChildrenStats.nodeName}'` +
            ' (node id: ' + maxChildrenStats.nodeId + ').\n';
      }
    }

    if (insight.largeLayoutUpdates.length > 0 || insight.largeStyleRecalcs.length > 0) {
      output += `\nLarge layout updates/style calculations:\n`;
    }

    if (insight.largeLayoutUpdates.length > 0) {
      for (const update of insight.largeLayoutUpdates) {
        output += `\n  - Layout update: Duration: ${this.#formatMicro(update.dur)},`;
        output += ` with ${update.args.beginData.dirtyObjects} of ${
            update.args.beginData.totalObjects} nodes needing layout.`;
      }
    }

    if (insight.largeStyleRecalcs.length > 0) {
      for (const recalc of insight.largeStyleRecalcs) {
        output += `\n  - Style recalculation: Duration: ${this.#formatMicro(recalc.dur)}, `;
        output += `with ${recalc.args.elementCount} elements affected.`;
      }
    }

    return output;
  }

  /**
   * Create an AI prompt string out of the Duplicated JavaScript Insight model to use with Ask AI.
   * @param insight The Duplicated JavaScript Model to query.
   * @returns a string formatted for sending to Ask AI.
   */
  formatDuplicatedJavaScriptInsight(
      insight: Trace.Insights.Models.DuplicatedJavaScript.DuplicatedJavaScriptInsightModel): string {
    const totalWastedBytes = insight.wastedBytes;
    const duplicatedScriptsByModule = insight.duplicationGroupedByNodeModules;

    if (duplicatedScriptsByModule.size === 0) {
      return 'There is no duplicated JavaScript in the page modules';
    }

    const filesFormatted =
        Array.from(duplicatedScriptsByModule)
            .map(
                ([module, duplication]) =>
                    `- Source: ${module} - Duplicated bytes: ${duplication.estimatedDuplicateBytes} bytes`)
            .join('\n');

    return `Total wasted bytes: ${totalWastedBytes} bytes.

Duplication grouped by Node modules: ${filesFormatted}`;
  }

  /**
   * Create an AI prompt string out of the NetworkDependencyTree Insight model to use with Ask AI.
   * Note: This function accesses the UIStrings within NetworkDependencyTree to help build the
   * AI prompt, but does not (and should not) call i18nString to localize these strings. They
   * should all be sent in English (at least for now).
   * @param insight The Network Dependency Tree Insight Model to query.
   * @returns a string formatted for sending to Ask AI.
   */
  formatFontDisplayInsight(insight: Trace.Insights.Models.FontDisplay.FontDisplayInsightModel): string {
    if (insight.fonts.length === 0) {
      return 'No font display issues were detected.';
    }

    let output = 'The following font display issues were found:\n';

    for (const font of insight.fonts) {
      let fontName = font.name;
      if (!fontName) {
        const url = new Common.ParsedURL.ParsedURL(font.request.args.data.url);
        fontName = url.isValid ? url.lastPathComponent : '(not available)';
      }
      output += `\n - Font name: ${fontName}, URL: ${font.request.args.data.url}, Property 'font-display' set to: '${
          font.display}', Wasted time: ${this.#formatMilli(font.wastedTime)}.`;
    }

    output += '\n\n' + Trace.Insights.Models.FontDisplay.UIStrings.description;
    return output;
  }

  /**
   * Create an AI prompt string out of the Forced Reflow Insight model to use with Ask AI.
   * Note: This function accesses the UIStrings within ForcedReflow model to help build the
   * AI prompt, but does not (and should not) call i18nString to localize these strings. They
   * should all be sent in English (at least for now).
   * @param insight The ForcedReflow Insight Model to query.
   * @returns a string formatted for sending to Ask AI.
   */
  formatForcedReflowInsight(insight: Trace.Insights.Models.ForcedReflow.ForcedReflowInsightModel): string {
    let output = Trace.Insights.Models.ForcedReflow.UIStrings.description + '\n\n';

    if (insight.topLevelFunctionCallData || insight.aggregatedBottomUpData.length > 0) {
      output += 'The forced reflow checks revealed one or more problems.\n\n';
    } else {
      output += 'The forced reflow checks revealed no problems.';
      return output;
    }

    function callFrameToString(frame: Trace.Types.Events.CallFrame|null): string {
      if (frame === null) {
        return Trace.Insights.Models.ForcedReflow.UIStrings.unattributed;
      }

      let result = `${frame.functionName || Trace.Insights.Models.ForcedReflow.UIStrings.anonymous}`;
      if (frame.url) {
        result += ` @ ${frame.url}:${frame.lineNumber}:${frame.columnNumber}`;
      } else {
        result += ' @ unknown location';
      }
      return result;
    }

    if (insight.topLevelFunctionCallData) {
      output += 'The following is the top function call that caused forced reflow(s):\n\n';
      output += ' - ' + callFrameToString(insight.topLevelFunctionCallData.topLevelFunctionCall);
      output += `\n\n${Trace.Insights.Models.ForcedReflow.UIStrings.totalReflowTime}: ${
          this.#formatMicro(insight.topLevelFunctionCallData.totalReflowTime)}\n`;
    } else {
      output += 'No top-level functions causing forced reflows were identified.\n';
    }

    if (insight.aggregatedBottomUpData.length > 0) {
      output += '\n' + Trace.Insights.Models.ForcedReflow.UIStrings.relatedStackTrace + ' (including total time):\n';
      for (const data of insight.aggregatedBottomUpData) {
        output += `\n - ${this.#formatMicro(data.totalTime)} in ${callFrameToString(data.bottomUpData)}`;
      }
    } else {
      output += '\nNo aggregated bottom-up causes of forced reflows were identified.';
    }

    return output;
  }

  /**
   * Create an AI prompt string out of the INP Brekdown Insight model to use with Ask AI.
   * @param insight The INP Breakdown Model to query.
   * @returns a string formatted for sending to Ask AI.
   */
  formatImageDeliveryInsight(insight: Trace.Insights.Models.ImageDelivery.ImageDeliveryInsightModel): string {
    const optimizableImages = insight.optimizableImages;
    if (optimizableImages.length === 0) {
      return 'There are no unoptimized images on this page.';
    }

    const imageDetails = optimizableImages
                             .map(image => {
                               // List potential optimizations for the image
                               const optimizations =
                                   image.optimizations
                                       .map(optimization => {
                                         const message =
                                             Trace.Insights.Models.ImageDelivery.getOptimizationMessage(optimization);
                                         const byteSavings = bytes(optimization.byteSavings);
                                         return `${message} (Est ${byteSavings})`;
                                       })
                                       .join('\n');

                               return `### ${image.request.args.data.url}
- Potential savings: ${bytes(image.byteSavings)}
- Optimizations:\n${optimizations}`;
                             })
                             .join('\n\n');

    return `Total potential savings: ${bytes(insight.wastedBytes)}

The following images could be optimized:\n\n${imageDetails}`;
  }

  /**
   * Create an AI prompt string out of the INP Brekdown Insight model to use with Ask AI.
   * @param insight The INP Breakdown Model to query.
   * @returns a string formatted for sending to Ask AI.
   */
  formatInpBreakdownInsight(insight: Trace.Insights.Models.INPBreakdown.INPBreakdownInsightModel): string {
    const event = insight.longestInteractionEvent;
    if (!event) {
      return '';
    }

    const inpInfoForEvent =
        `The longest interaction on the page was a \`${event.type}\` which had a total duration of \`${
            this.#formatMicro(event.dur)}\`. The timings of each of the three phases were:

1. Input delay: ${this.#formatMicro(event.inputDelay)}
2. Processing duration: ${this.#formatMicro(event.mainThreadHandling)}
3. Presentation delay: ${this.#formatMicro(event.presentationDelay)}.`;

    return inpInfoForEvent;
  }

  /**
   * Create an AI prompt string out of the LCP Brekdown Insight model to use with Ask AI.
   * @param insight The LCP Breakdown Model to query.
   * @returns a string formatted for sending to Ask AI.
   */
  formatLcpBreakdownInsight(insight: Trace.Insights.Models.LCPBreakdown.LCPBreakdownInsightModel): string {
    const {subparts, lcpMs} = insight;
    if (!lcpMs || !subparts) {
      return '';
    }

    // Text based LCP has TTFB & Render delay
    // Image based has TTFB, Load delay, Load time and Render delay
    // Note that we expect every trace + LCP to have TTFB + Render delay, but
    // very old traces are missing the data, so we have to code defensively
    // in case the subparts are not present.
    const phaseBulletPoints: Array<{name: string, value: string, percentage: string}> = [];

    Object.values(subparts).forEach((subpart: Trace.Insights.Models.LCPBreakdown.Subpart) => {
      const phaseMilli = Trace.Helpers.Timing.microToMilli(subpart.range);
      const percentage = (phaseMilli / lcpMs * 100).toFixed(1);
      phaseBulletPoints.push({name: subpart.label, value: this.#formatMilli(phaseMilli), percentage});
    });

    return `${this.#lcpMetricSharedContext()}

We can break this time down into the ${phaseBulletPoints.length} phases that combine to make the LCP time:

${
        phaseBulletPoints.map(phase => `- ${phase.name}: ${phase.value} (${phase.percentage}% of total LCP time)`)
            .join('\n')}`;
  }

  /**
   * Create an AI prompt string out of the LCP Brekdown Insight model to use with Ask AI.
   * @param insight The LCP Breakdown Model to query.
   * @returns a string formatted for sending to Ask AI.
   */
  formatLcpDiscoveryInsight(insight: Trace.Insights.Models.LCPDiscovery.LCPDiscoveryInsightModel): string {
    const {checklist, lcpEvent, lcpRequest, earliestDiscoveryTimeTs} = insight;
    if (!checklist || !lcpEvent || !lcpRequest || !earliestDiscoveryTimeTs) {
      return '';
    }

    const checklistBulletPoints: Array<{name: string, passed: boolean}> = [];
    checklistBulletPoints.push({
      name: checklist.priorityHinted.label,
      passed: checklist.priorityHinted.value,
    });
    checklistBulletPoints.push({
      name: checklist.eagerlyLoaded.label,
      passed: checklist.eagerlyLoaded.value,
    });
    checklistBulletPoints.push({
      name: checklist.requestDiscoverable.label,
      passed: checklist.requestDiscoverable.value,
    });

    return `${this.#lcpMetricSharedContext()}

The result of the checks for this insight are:
${checklistBulletPoints.map(point => `- ${point.name}: ${point.passed ? 'PASSED' : 'FAILED'}`).join('\n')}`;
  }

  /**
   * Create an AI prompt string out of the Legacy JavaScript Insight model to use with Ask AI.
   * @param insight The Legacy JavaScript Model to query.
   * @returns a string formatted for sending to Ask AI.
   */
  formatLegacyJavaScriptInsight(insight: Trace.Insights.Models.LegacyJavaScript.LegacyJavaScriptInsightModel): string {
    const legacyJavaScriptResults = insight.legacyJavaScriptResults;

    if (legacyJavaScriptResults.size === 0) {
      return 'There is no significant amount of legacy JavaScript on the page.';
    }

    const filesFormatted =
        Array.from(legacyJavaScriptResults)
            .map(([script, result]) => `\n- Script: ${script.url} - Wasted bytes: ${result.estimatedByteSavings} bytes
Matches:
${result.matches.map(match => `Line: ${match.line}, Column: ${match.column}, Name: ${match.name}`).join('\n')}`)
            .join('\n');

    return `Total legacy JavaScript: ${legacyJavaScriptResults.size} files.

Legacy JavaScript by file:
${filesFormatted}`;
  }

  /**
   * Create an AI prompt string out of the Modern HTTP Insight model to use with Ask AI.
   * @param insight The Modern HTTP Model to query.
   * @returns a string formatted for sending to Ask AI.
   */
  formatModernHttpInsight(insight: Trace.Insights.Models.ModernHTTP.ModernHTTPInsightModel): string {
    const requestSummary = (insight.http1Requests.length === 1) ?
        this.formatNetworkRequests(insight.http1Requests, {verbose: true}) :
        this.formatNetworkRequests(insight.http1Requests);

    if (requestSummary.length === 0) {
      return 'There are no requests that were served over a legacy HTTP protocol.';
    }

    return `Here is a list of the network requests that were served over a legacy HTTP protocol:
${requestSummary}`;
  }

  /**
   * Create an AI prompt string out of the NetworkDependencyTree Insight model to use with Ask AI.
   * Note: This function accesses the UIStrings within NetworkDependencyTree to help build the
   * AI prompt, but does not (and should not) call i18nString to localize these strings. They
   * should all be sent in English (at least for now).
   * @param insight The Network Dependency Tree Insight Model to query.
   * @returns a string formatted for sending to Ask AI.
   */
  formatNetworkDependencyTreeInsight(
      insight: Trace.Insights.Models.NetworkDependencyTree.NetworkDependencyTreeInsightModel): string {
    let output = insight.fail ?
        'The network dependency tree checks found one or more problems.\n\n' :
        'The network dependency tree checks revealed no problems, but optimization suggestions may be available.\n\n';

    const rootNodes = insight.rootNodes;
    if (rootNodes.length > 0) {
      output += `Max critical path latency is ${this.#formatMicro(insight.maxTime)}\n\n`;
      output += 'The following is the critical request chain:\n';

      function formatNode(
          this: PerformanceInsightFormatter, node: Trace.Insights.Models.NetworkDependencyTree.CriticalRequestNode,
          indent: string): string {
        const url = node.request.args.data.url;
        const time = this.#formatMicro(node.timeFromInitialRequest);
        const isLongest = node.isLongest ? ' (longest chain)' : '';
        let nodeString = `${indent}- ${url} (${time})${isLongest}\n`;
        for (const child of node.children) {
          nodeString += formatNode.call(this, child, indent + '  ');
        }
        return nodeString;
      }

      for (const rootNode of rootNodes) {
        output += formatNode.call(this, rootNode, '');
      }
      output += '\n';
    } else {
      output += `${Trace.Insights.Models.NetworkDependencyTree.UIStrings.noNetworkDependencyTree}.\n\n`;
    }

    if (insight.preconnectedOrigins?.length > 0) {
      output += `${Trace.Insights.Models.NetworkDependencyTree.UIStrings.preconnectOriginsTableTitle}:\n`;
      output += `${Trace.Insights.Models.NetworkDependencyTree.UIStrings.preconnectOriginsTableDescription}\n`;
      for (const origin of insight.preconnectedOrigins) {
        const headerText = 'headerText' in origin ? `'${origin.headerText}'` : ``;
        output += `
  - ${origin.url}
    - ${Trace.Insights.Models.NetworkDependencyTree.UIStrings.columnSource}: '${origin.source}'`;
        if (headerText) {
          output += `\n   - Header: ${headerText}`;
        }
        if (origin.unused) {
          output += `\n   - Warning: ${Trace.Insights.Models.NetworkDependencyTree.UIStrings.unusedWarning}`;
        }
        if (origin.crossorigin) {
          output += `\n   - Warning: ${Trace.Insights.Models.NetworkDependencyTree.UIStrings.crossoriginWarning}`;
        }
      }
      if (insight.preconnectedOrigins.length >
          Trace.Insights.Models.NetworkDependencyTree.TOO_MANY_PRECONNECTS_THRESHOLD) {
        output +=
            `\n\n**Warning**: ${Trace.Insights.Models.NetworkDependencyTree.UIStrings.tooManyPreconnectLinksWarning}`;
      }
    } else {
      output += `${Trace.Insights.Models.NetworkDependencyTree.UIStrings.noPreconnectOrigins}.`;
    }

    if (insight.preconnectCandidates.length > 0 &&
        insight.preconnectedOrigins.length <
            Trace.Insights.Models.NetworkDependencyTree.TOO_MANY_PRECONNECTS_THRESHOLD) {
      output += `\n\n${Trace.Insights.Models.NetworkDependencyTree.UIStrings.estSavingTableTitle}:\n${
          Trace.Insights.Models.NetworkDependencyTree.UIStrings.estSavingTableDescription}\n`;
      for (const candidate of insight.preconnectCandidates) {
        output += `\nAdding [preconnect] to origin '${candidate.origin}' would save ${
            this.#formatMilli(candidate.wastedMs)}.`;
      }
    }

    return output;
  }

  /**
   * Create an AI prompt string out of the Render Blocking Insight model to use with Ask AI.
   * @param insight The Render Blocking Model to query.
   * @returns a string formatted for sending to Ask AI.
   */
  formatRenderBlockingInsight(insight: Trace.Insights.Models.RenderBlocking.RenderBlockingInsightModel): string {
    const requestSummary = this.formatNetworkRequests(insight.renderBlockingRequests);

    if (requestSummary.length === 0) {
      return 'There are no network requests that are render blocking.';
    }

    return `Here is a list of the network requests that were render blocking on this page and their duration:

${requestSummary}`;
  }

  /**
   * Create an AI prompt string out of the Slow CSS Selector Insight model to use with Ask AI.
   * Note: This function accesses the UIStrings within SlowCSSSelector to help build the
   * AI prompt, but does not (and should not) call i18nString to localize these strings. They
   * should all be sent in English (at least for now).
   * @param insight The Network Dependency Tree Insight Model to query.
   * @returns a string formatted for sending to Ask AI.
   */
  formatSlowCssSelectorsInsight(insight: Trace.Insights.Models.SlowCSSSelector.SlowCSSSelectorInsightModel): string {
    let output = '';

    if (!insight.topSelectorElapsedMs && !insight.topSelectorMatchAttempts) {
      return Trace.Insights.Models.SlowCSSSelector.UIStrings.enableSelectorData;
    }

    output += 'One or more slow CSS selectors were identified as negatively affecting page performance:\n\n';

    if (insight.topSelectorElapsedMs) {
      output += `${
          Trace.Insights.Models.SlowCSSSelector.UIStrings.topSelectorElapsedTime} (as ranked by elapsed time in ms):\n`;
      output += `${this.#formatMicro(insight.topSelectorElapsedMs['elapsed (us)'])}: ${
          insight.topSelectorElapsedMs.selector}\n\n`;
    }

    if (insight.topSelectorMatchAttempts) {
      output += Trace.Insights.Models.SlowCSSSelector.UIStrings.topSelectorMatchAttempt + ':\n';
      output += `${insight.topSelectorMatchAttempts.match_attempts} attempts for selector: '${
          insight.topSelectorMatchAttempts.selector}'\n\n`;
    }

    output += `${Trace.Insights.Models.SlowCSSSelector.UIStrings.total}:\n`;
    output +=
        `${Trace.Insights.Models.SlowCSSSelector.UIStrings.elapsed}: ${this.#formatMicro(insight.totalElapsedMs)}\n`;
    output += `${Trace.Insights.Models.SlowCSSSelector.UIStrings.matchAttempts}: ${insight.totalMatchAttempts}\n`;
    output += `${Trace.Insights.Models.SlowCSSSelector.UIStrings.matchCount}: ${insight.totalMatchCount}\n\n`;

    output += Trace.Insights.Models.SlowCSSSelector.UIStrings.description;

    return output;
  }

  /**
   * Create an AI prompt string out of the ThirdParties Insight model to use with Ask AI.
   * Note: This function accesses the UIStrings within ThirdParties to help build the
   * AI prompt, but does not (and should not) call i18nString to localize these strings. They
   * should all be sent in English (at least for now).
   * @param insight The Third Parties Insight Model to query.
   * @returns a string formatted for sending to Ask AI.
   */
  formatThirdPartiesInsight(insight: Trace.Insights.Models.ThirdParties.ThirdPartiesInsightModel): string {
    let output = '';

    const entitySummaries = insight.entitySummaries ?? [];
    const firstPartyEntity = insight.firstPartyEntity;

    const thirdPartyTransferSizeEntries =
        entitySummaries.filter(s => s.entity !== firstPartyEntity).toSorted((a, b) => b.transferSize - a.transferSize);
    const thirdPartyMainThreadTimeEntries = entitySummaries.filter(s => s.entity !== firstPartyEntity)
                                                .toSorted((a, b) => b.mainThreadTime - a.mainThreadTime);

    if (!thirdPartyTransferSizeEntries.length && !thirdPartyMainThreadTimeEntries.length) {
      return `No 3rd party scripts were found on this page.`;
    }

    if (thirdPartyTransferSizeEntries.length) {
      output += `The following list contains the largest transfer sizes by a 3rd party script:\n\n`;
      for (const entry of thirdPartyTransferSizeEntries) {
        if (entry.transferSize > 0) {
          output += `- ${entry.entity.name}: ${bytes(entry.transferSize)}\n`;
        }
      }
      output += '\n';
    }

    if (thirdPartyMainThreadTimeEntries.length) {
      output += `The following list contains the largest amount spent by a 3rd party script on the main thread:\n\n`;
      for (const entry of thirdPartyMainThreadTimeEntries) {
        if (entry.mainThreadTime > 0) {
          output += `- ${entry.entity.name}: ${this.#formatMilli(entry.mainThreadTime)}\n`;
        }
      }
      output += '\n';
    }

    output += Trace.Insights.Models.ThirdParties.UIStrings.description;
    return output;
  }

  /**
   * Create an AI prompt string out of the Viewport [Mobile] Insight model to use with Ask AI.
   * Note: This function accesses the UIStrings within Viewport to help build the
   * AI prompt, but does not (and should not) call i18nString to localize these strings. They
   * should all be sent in English (at least for now).
   * @param insight The Network Dependency Tree Insight Model to query.
   * @returns a string formatted for sending to Ask AI.
   */
  formatViewportInsight(insight: Trace.Insights.Models.Viewport.ViewportInsightModel): string {
    let output = '';

    output += 'The webpage is ' + (insight.mobileOptimized ? 'already' : 'not') + ' optimized for mobile viewing.\n';

    const hasMetaTag = insight.viewportEvent;
    if (hasMetaTag) {
      output += `\nThe viewport meta tag was found: \`${insight.viewportEvent?.args?.data.content}\`.`;
    } else {
      output += `\nThe viewport meta tag is missing.`;
    }

    if (!hasMetaTag) {
      output += '\n\n' + Trace.Insights.Models.Viewport.UIStrings.description;
    }
    return output;
  }

  /**
   * Formats and outputs the insight's data.
   * Pass `{headingLevel: X}` to determine what heading level to use for the
   * titles in the markdown output. The default is 2 (##).
   */
  formatInsight(opts: {headingLevel: number} = {headingLevel: 2}): string {
    const header = '#'.repeat(opts.headingLevel);

    const {title} = this.#insight;
    return `${header} Insight Title: ${title}

${header} Insight Summary:
${this.#description()}

${header} Detailed analysis:
${this.#details()}

${header} Estimated savings: ${this.estimatedSavings() || 'none'}

${header} External resources:
${this.#links()}`;
  }

  #details(): string {
    if (Trace.Insights.Models.Cache.isCacheInsight(this.#insight)) {
      return this.formatCacheInsight(this.#insight);
    }

    if (Trace.Insights.Models.CLSCulprits.isCLSCulpritsInsight(this.#insight)) {
      return this.formatClsCulpritsInsight(this.#insight);
    }

    if (Trace.Insights.Models.DocumentLatency.isDocumentLatencyInsight(this.#insight)) {
      return this.formatDocumentLatencyInsight(this.#insight);
    }

    if (Trace.Insights.Models.DOMSize.isDomSizeInsight(this.#insight)) {
      return this.formatDomSizeInsight(this.#insight);
    }

    if (Trace.Insights.Models.DuplicatedJavaScript.isDuplicatedJavaScriptInsight(this.#insight)) {
      return this.formatDuplicatedJavaScriptInsight(this.#insight);
    }

    if (Trace.Insights.Models.FontDisplay.isFontDisplayInsight(this.#insight)) {
      return this.formatFontDisplayInsight(this.#insight);
    }

    if (Trace.Insights.Models.ForcedReflow.isForcedReflowInsight(this.#insight)) {
      return this.formatForcedReflowInsight(this.#insight);
    }

    if (Trace.Insights.Models.ImageDelivery.isImageDeliveryInsight(this.#insight)) {
      return this.formatImageDeliveryInsight(this.#insight);
    }

    if (Trace.Insights.Models.INPBreakdown.isINPBreakdownInsight(this.#insight)) {
      return this.formatInpBreakdownInsight(this.#insight);
    }

    if (Trace.Insights.Models.LCPBreakdown.isLCPBreakdownInsight(this.#insight)) {
      return this.formatLcpBreakdownInsight(this.#insight);
    }

    if (Trace.Insights.Models.LCPDiscovery.isLCPDiscoveryInsight(this.#insight)) {
      return this.formatLcpDiscoveryInsight(this.#insight);
    }

    if (Trace.Insights.Models.LegacyJavaScript.isLegacyJavaScript(this.#insight)) {
      return this.formatLegacyJavaScriptInsight(this.#insight);
    }

    if (Trace.Insights.Models.ModernHTTP.isModernHTTPInsight(this.#insight)) {
      return this.formatModernHttpInsight(this.#insight);
    }

    if (Trace.Insights.Models.NetworkDependencyTree.isNetworkDependencyTreeInsight(this.#insight)) {
      return this.formatNetworkDependencyTreeInsight(this.#insight);
    }

    if (Trace.Insights.Models.RenderBlocking.isRenderBlockingInsight(this.#insight)) {
      return this.formatRenderBlockingInsight(this.#insight);
    }

    if (Trace.Insights.Models.SlowCSSSelector.isSlowCSSSelectorInsight(this.#insight)) {
      return this.formatSlowCssSelectorsInsight(this.#insight);
    }

    if (Trace.Insights.Models.ThirdParties.isThirdPartyInsight(this.#insight)) {
      return this.formatThirdPartiesInsight(this.#insight);
    }

    if (Trace.Insights.Models.Viewport.isViewportInsight(this.#insight)) {
      return this.formatViewportInsight(this.#insight);
    }

    return '';
  }

  estimatedSavings(): string {
    return Object.entries(this.#insight.metricSavings ?? {})
        .map(([k, v]) => {
          if (k === 'CLS') {
            return `${k} ${v.toFixed(2)}`;
          }
          return `${k} ${Math.round(v)} ms`;
        })
        .join(', ');
  }

  #links(): string {
    switch (this.#insight.insightKey) {
      case 'CLSCulprits':
        return `- https://wdeb.dev/articles/cls
- https://web.dev/articles/optimize-cls`;
      case 'DocumentLatency':
        return '- https://web.dev/articles/optimize-ttfb';
      case 'DOMSize':
        return '- https://developer.chrome.com/docs/lighthouse/performance/dom-size/';
      case 'DuplicatedJavaScript':
        return '';
      case 'FontDisplay':
        return `- https://web.dev/articles/preload-optional-fonts
- https://fonts.google.com/knowledge/glossary/foit
- https://developer.chrome.com/blog/font-fallbacks`;
      case 'ForcedReflow':
        return '- https://developers.google.com/web/fundamentals/performance/rendering/avoid-large-complex-layouts-and-layout-thrashing#avoid-forced-synchronous-layouts';
      case 'ImageDelivery':
        return '- https://developer.chrome.com/docs/lighthouse/performance/uses-optimized-images/';
      case 'INPBreakdown':
        return `- https://web.dev/articles/inp
- https://web.dev/explore/how-to-optimize-inp
- https://web.dev/articles/optimize-long-tasks
- https://web.dev/articles/avoid-large-complex-layouts-and-layout-thrashing`;
      case 'LCPDiscovery':
        return `- https://web.dev/articles/lcp
- https://web.dev/articles/optimize-lcp`;
      case 'LCPBreakdown':
        return `- https://web.dev/articles/lcp
- https://web.dev/articles/optimize-lcp`;
      case 'NetworkDependencyTree':
        return `- https://web.dev/learn/performance/understanding-the-critical-path
- https://developer.chrome.com/docs/lighthouse/performance/uses-rel-preconnect/`;
      case 'RenderBlocking':
        return `- https://web.dev/articles/lcp
- https://web.dev/articles/optimize-lcp`;
      case 'SlowCSSSelector':
        return '- https://developer.chrome.com/docs/devtools/performance/selector-stats';
      case 'ThirdParties':
        return '- https://web.dev/articles/optimizing-content-efficiency-loading-third-party-javascript/';
      case 'Viewport':
        return '- https://developer.chrome.com/blog/300ms-tap-delay-gone-away/';
      case 'Cache':
        return '- https://web.dev/uses-long-cache-ttl/';
      case 'ModernHTTP':
        return '- https://developer.chrome.com/docs/lighthouse/best-practices/uses-http2';
      case 'LegacyJavaScript':
        return `- https://web.dev/articles/baseline-and-polyfills
- https://philipwalton.com/articles/the-state-of-es5-on-the-web/`;
    }
  }

  #description(): string | undefined {
    switch (this.#insight.insightKey) {
      case 'CLSCulprits':
        return `Cumulative Layout Shifts (CLS) is a measure of the largest burst of layout shifts for every unexpected layout shift that occurs during the lifecycle of a page. This is a Core Web Vital and the thresholds for categorizing a score are:
- Good: 0.1 or less
- Needs improvement: more than 0.1 and less than or equal to 0.25
- Bad: over 0.25`;
      case 'DocumentLatency':
        return `This insight checks that the first request is responded to promptly. We use the following criteria to check this:
1. Was the initial request redirected?
2. Did the server respond in 600ms or less? We want developers to aim for as close to 100ms as possible, but our threshold for this insight is 600ms.
3. Was there compression applied to the response to minimize the transfer size?`;
      case 'DOMSize':
        return `This insight evaluates some key metrics about the Document Object Model (DOM) and identifies excess in the DOM tree, for example:
- The maximum number of elements within the DOM.
- The maximum number of children for any given element.
- Excessive depth of the DOM structure.
- The largest layout and style recalculation events.`;
      case 'DuplicatedJavaScript':
        return `This insight identifies large, duplicated JavaScript modules that are present in your application and create redundant code.
  This wastes network bandwidth and slows down your page, as the user's browser must download and process the same code multiple times.`;
      case 'FontDisplay':
        return 'This insight identifies font issues when a webpage uses custom fonts, for example when font-display is not set to `swap`, `fallback` or `optional`, causing the "Flash of Invisible Text" problem (FOIT).';
      case 'ForcedReflow':
        return `This insight identifies forced synchronous layouts (also known as forced reflows) and layout thrashing caused by JavaScript accessing layout properties at suboptimal points in time.`;
      case 'ImageDelivery':
        return 'This insight identifies unoptimized images that are downloaded at a much higher resolution than they are displayed. Properly sizing and compressing these assets will decrease their download time, directly improving the perceived page load time and LCP';
      case 'INPBreakdown':
        return `Interaction to Next Paint (INP) is a metric that tracks the responsiveness of the page when the user interacts with it. INP is a Core Web Vital and the thresholds for how we categorize a score are:
- Good: 200 milliseconds or less.
- Needs improvement: more than 200 milliseconds and 500 milliseconds or less.
- Bad: over 500 milliseconds.

For a given slow interaction, we can break it down into 3 phases:
1. Input delay: starts when the user initiates an interaction with the page, and ends when the event callbacks for the interaction begin to run.
2. Processing duration: the time it takes for the event callbacks to run to completion.
3. Presentation delay: the time it takes for the browser to present the next frame which contains the visual result of the interaction.

The sum of these three phases is the total latency. It is important to optimize each of these phases to ensure interactions take as little time as possible. Focusing on the phase that has the largest score is a good way to start optimizing.`;
      case 'LCPDiscovery':
        return `This insight analyzes the time taken to discover the LCP resource and request it on the network. It only applies if the LCP element was a resource like an image that has to be fetched over the network. There are 3 checks this insight makes:
1. Did the resource have \`fetchpriority=high\` applied?
2. Was the resource discoverable in the initial document, rather than injected from a script or stylesheet?
3. The resource was not lazy loaded as this can delay the browser loading the resource.

It is important that all of these checks pass to minimize the delay between the initial page load and the LCP resource being loaded.`;
      case 'LCPBreakdown':
        return 'This insight is used to analyze the time spent that contributed to the final LCP time and identify which of the 4 phases (or 2 if there was no LCP resource) are contributing most to the delay in rendering the LCP element.';
      case 'NetworkDependencyTree':
        return `This insight analyzes the network dependency tree to identify:
- The maximum critical path latency (the longest chain of network requests that the browser must download before it can render the page).
- Whether current [preconnect] tags are appropriate, according to the following rules:
   1. They should all be in use (no unnecessary preconnects).
   2. All preconnects should specify cross-origin correctly.
   3. The maximum of 4 preconnects should be respected.
- Opportunities to add [preconnect] for a faster loading experience.`;
      case 'RenderBlocking':
        return 'This insight identifies network requests that were render blocking. Render blocking requests are impactful because they are deemed critical to the page and therefore the browser stops rendering the page until it has dealt with these resources. For this insight make sure you fully inspect the details of each render blocking network request and prioritize your suggestions to the user based on the impact of each render blocking request.';
      case 'SlowCSSSelector':
        return `This insight identifies CSS selectors that are slowing down your page's rendering performance.`;
      case 'ThirdParties':
        return 'This insight analyzes the performance impact of resources loaded from third-party servers and aggregates the performance cost, in terms of download transfer sizes and total amount of time that third party scripts spent executing on the main thread.';
      case 'Viewport':
        return 'The insight identifies web pages that are not specifying the viewport meta tag for mobile devies, which avoids the artificial 300-350ms delay designed to help differentiate between tap and double-click.';
      case 'Cache':
        return 'This insight identifies static resources that are not cached effectively by the browser.';
      case 'ModernHTTP':
        return `Modern HTTP protocols, such as HTTP/2, are more efficient than older versions like HTTP/1.1 because they allow for multiple requests and responses to be sent over a single network connection, significantly improving page load performance by reducing latency and overhead. This insight identifies requests that can be upgraded to a modern HTTP protocol.

We apply a conservative approach when flagging HTTP/1.1 usage. This insight will only flag requests that meet all of the following criteria:
1.  Were served over HTTP/1.1 or an earlier protocol.
2.  Originate from an origin that serves at least 6 static asset requests, as the benefits of multiplexing are less significant with fewer requests.
3.  Are not served from 'localhost' or coming from a third-party source, where developers have no control over the server's protocol.

To pass this insight, ensure your server supports and prioritizes a modern HTTP protocol (like HTTP/2) for static assets, especially when serving a substantial number of them.`;
      case 'LegacyJavaScript':
        return `This insight identified legacy JavaScript in your application's modules that may be creating unnecessary code.

Polyfills and transforms enable older browsers to use new JavaScript features. However, many are not necessary for modern browsers. Consider modifying your JavaScript build process to not transpile Baseline features, unless you know you must support older browsers.`;
    }
  }
}

export class TraceEventFormatter {
  static layoutShift(
      shift: Trace.Types.Events.SyntheticLayoutShift, index: number, parsedTrace: Trace.TraceModel.ParsedTrace,
      rootCauses?: Trace.Insights.Models.CLSCulprits.LayoutShiftRootCausesData): string {
    const baseTime = parsedTrace.data.Meta.traceBounds.min;

    const potentialRootCauses: string[] = [];
    if (rootCauses) {
      rootCauses.iframes.forEach(
          iframe => potentialRootCauses.push(
              `An iframe (id: ${iframe.frame}, url: ${iframe.url ?? 'unknown'} was injected into the page)`));
      rootCauses.webFonts.forEach(req => {
        potentialRootCauses.push(`A font that was loaded over the network (${req.args.data.url}).`);
      });
      // TODO(b/413285103): use the nice strings for non-composited animations.
      // The code for this lives in TimelineUIUtils but that cannot be used
      // within models. We should move it and then expose the animations info
      // more nicely.
      rootCauses.nonCompositedAnimations.forEach(_ => {
        potentialRootCauses.push('A non composited animation.');
      });
      rootCauses.unsizedImages.forEach(img => {
        // TODO(b/413284569): if we store a nice human readable name for this
        // image in the trace metadata, we can do something much nicer here.
        const url = img.paintImageEvent.args.data.url;
        const nodeName = img.paintImageEvent.args.data.nodeName;
        const extraText = url ? `url: ${url}` : `id: ${img.backendNodeId}`;
        potentialRootCauses.push(`An unsized image (${nodeName}) (${extraText}).`);
      });
    }
    const rootCauseText = potentialRootCauses.length ?
        `- Potential root causes:\n  - ${potentialRootCauses.join('\n  - ')}` :
        '- No potential root causes identified';

    const startTime = Trace.Helpers.Timing.microToMilli(Trace.Types.Timing.Micro(shift.ts - baseTime));
    return `### Layout shift ${index + 1}:
- Start time: ${millis(startTime)}
- Score: ${shift.args.data?.weighted_score_delta.toFixed(4)}
${rootCauseText}`;
  }
}
