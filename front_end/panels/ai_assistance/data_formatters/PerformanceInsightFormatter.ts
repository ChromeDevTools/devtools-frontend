// Copyright 2025 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.
import * as i18n from '../../../core/i18n/i18n.js';
import * as Trace from '../../../models/trace/trace.js';

import {
  NetworkRequestFormatter,
} from './NetworkRequestFormatter.js';

function formatMilli(x: number|undefined): string {
  if (x === undefined) {
    return '';
  }
  return i18n.TimeUtilities.preciseMillisToString(x, 2);
}

function formatMicro(x: number|undefined): string {
  if (x === undefined) {
    return '';
  }
  return formatMilli(Trace.Helpers.Timing.microToMilli(x as Trace.Types.Timing.Micro));
}

export class PerformanceInsightFormatter {
  #insight: Trace.Insights.Types.InsightModel;
  constructor(insight: Trace.Insights.Types.InsightModel) {
    this.#insight = insight;
  }

  formatInsight(): string {
    const {title} = this.#insight;
    return `## Insight title: ${title}

## Insight Description:
${this.#description()}

## External resources:
${this.#links()}

## Insight details:
${this.#details()}`;
  }

  #details(): string {
    if (Trace.Insights.Models.LCPPhases.isLCPPhases(this.#insight)) {
      const {phases, lcpMs, lcpRequest} = this.#insight;
      if (!lcpMs) {
        return '';
      }

      // Text based LCP has TTFB & Render delay
      // Image based has TTFB, Load delay, Load time and Render delay
      // Note that we expect every trace + LCP to have TTFB + Render delay, but
      // very old traces are missing the data, so we have to code defensively
      // in case the phases are not present.
      const phaseBulletPoints: Array<{name: string, value: string}> = [];
      if (phases?.ttfb) {
        phaseBulletPoints.push({name: 'Time to first byte', value: formatMilli(phases.ttfb)});
      }
      if (phases?.loadDelay) {
        phaseBulletPoints.push({name: 'Load delay', value: formatMilli(phases.loadDelay)});
      }
      if (phases?.loadTime) {
        phaseBulletPoints.push({name: 'Load time', value: formatMilli(phases.loadTime)});
      }
      if (phases?.renderDelay) {
        phaseBulletPoints.push({name: 'Render delay', value: formatMilli(phases.renderDelay)});
      }

      let lcpRequestText = '';
      if (lcpRequest) {
        lcpRequestText = `\nThe LCP resource was downloaded from: ${lcpRequest.args.data.url}.`;
      }

      return `All time units given to you are in milliseconds.
The actual LCP time is ${formatMilli(lcpMs)}.${lcpRequestText}

We can break this time down into the ${phaseBulletPoints.length} phases that combine to make up the LCP time:

${phaseBulletPoints.map(phase => `- ${phase.name}: ${phase.value}`).join('\n')}`;
    }
    return '';
  }

  #links(): string {
    switch (this.#insight.insightKey) {
      case 'CLSCulprits':
        return '';
      case 'DocumentLatency':
        return '';
      case 'DOMSize':
        return '';
      case 'DuplicateJavaScript':
        return '';
      case 'FontDisplay':
        return '';
      case 'ForcedReflow':
        return '';
      case 'ImageDelivery':
        return '';
      case 'InteractionToNextPaint':
        return '';
      case 'LCPDiscovery':
        return '';
      case 'LCPPhases':
        return `- https://web.dev/articles/lcp
- https://web.dev/articles/optimize-lcp`;
      case 'NetworkDependencyTree':
        return '';
      case 'RenderBlocking':
        return '';
      case 'SlowCSSSelector':
        return '';
      case 'ThirdParties':
        return '';
      case 'Viewport':
        return '';
    }
  }

  #description(): string {
    switch (this.#insight.insightKey) {
      case 'CLSCulprits':
        return '';
      case 'DocumentLatency':
        return '';
      case 'DOMSize':
        return '';
      case 'DuplicateJavaScript':
        return '';
      case 'FontDisplay':
        return '';
      case 'ForcedReflow':
        return '';
      case 'ImageDelivery':
        return '';
      case 'InteractionToNextPaint':
        return '';
      case 'LCPDiscovery':
        return '';
      case 'LCPPhases':
        return 'This insight is used to analyse the time spent that contributed to the final LCP time and identify which of the 4 phases (or 2 if there was no LCP resource) are contributing most to the delay in rendering the LCP element. For this insight it can be useful to get a list of all network requests that happened before the LCP time and look for slow requests. You can also look for main thread activity during the phases, in particular the load delay and render delay phases.';
      case 'NetworkDependencyTree':
        return '';
      case 'RenderBlocking':
        return '';
      case 'SlowCSSSelector':
        return '';
      case 'ThirdParties':
        return '';
      case 'Viewport':
        return '';
    }
  }
}

export class TraceEventFormatter {
  /**
   * This is the data passed to a network request when the Performance Insights
   * agent is asking for information. It is a slimmed down version of the
   * request's data to avoid using up too much of the context window.
   * IMPORTANT: these set of fields have been reviewed by Chrome Privacy &
   * Security; be careful about adding new data here. If you are in doubt please
   * talk to jacktfranklin@.
   */
  static networkRequest(
      request: Trace.Types.Events.SyntheticNetworkRequest, parsedTrace: Trace.Handlers.Types.ParsedTrace): string {
    const {url, statusCode, initialPriority, priority, fromServiceWorker, mimeType, responseHeaders, syntheticData} =
        request.args.data;

    // Note: unlike other agents, we do have the ability to include
    // cross-origins, hence why we do not sanitize the URLs here.
    const navigationForEvent = Trace.Helpers.Trace.getNavigationForTraceEvent(
        request,
        request.args.data.frame,
        parsedTrace.Meta.navigationsByFrameId,
    );
    const baseTime = navigationForEvent?.ts ?? parsedTrace.Meta.traceBounds.min;

    // Gets all the timings for this request, relative to the base time.
    // Note that this is the start time, not total time. E.g. "queueing: X"
    // means that the request was queued at Xms, not that it queued for Xms.
    const startTimesForLifecycle = {
      start: request.ts - baseTime,
      queueing: syntheticData.downloadStart - baseTime,
      requestSent: syntheticData.sendStartTime - baseTime,
      downloadComplete: syntheticData.finishTime - baseTime,
      processingComplete: request.ts + request.dur - baseTime,

    } as const;

    const renderBlocking = Trace.Helpers.Network.isSyntheticNetworkRequestEventRenderBlocking(request);

    return `## Network request: ${url}
Timings:
- Start time: ${formatMicro(startTimesForLifecycle.start)}
- Queued at: ${formatMicro(startTimesForLifecycle.queueing)}
- Request sent at: ${formatMicro(startTimesForLifecycle.requestSent)}
- Download complete at: ${formatMicro(startTimesForLifecycle.downloadComplete)}
- Fully completed at: ${formatMicro(startTimesForLifecycle.processingComplete)}
- Total request duration: ${formatMicro(request.dur)}
Status code: ${statusCode}
MIME Type: ${mimeType}
Priority:
- Initial: ${initialPriority}
- Final: ${priority}
Render blocking?: ${renderBlocking ? 'Yes' : 'No'}
From a service worker: ${fromServiceWorker ? 'Yes' : 'No'}
${NetworkRequestFormatter.formatHeaders('Response headers', responseHeaders, true)}`;
  }
}
