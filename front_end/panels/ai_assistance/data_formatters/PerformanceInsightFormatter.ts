// Copyright 2025 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.
import * as i18n from '../../../core/i18n/i18n.js';
import * as Trace from '../../../models/trace/trace.js';

function formatMilli(x: number|undefined): string {
  if (x === undefined) {
    return '';
  }
  return i18n.TimeUtilities.preciseMillisToString(x, 2);
}

export class PerformanceInsightFormatter {
  #insight: Trace.Insights.Types.InsightModel<{}, {}>;
  constructor(insight: Trace.Insights.Types.InsightModel<{}, {}>) {
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
      const {phases, lcpMs} = this.#insight;
      if (!lcpMs) {
        return '';
      }

      return `All time units given to you are in milliseconds.
The actual LCP time is ${formatMilli(lcpMs)};

We can break this time down into the 4 phases that combine to make up the LCP time:

- Time to first byte: ${formatMilli(phases?.ttfb)}
- Load delay: ${formatMilli(phases?.loadDelay)}
- Load time: ${formatMilli(phases?.loadTime)}
- Render delay: ${formatMilli(phases?.renderDelay)}`;
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
      case 'LongCriticalNetworkTree':
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
        return 'This insight is used to analyse the loading of the LCP resource and identify which of the 4 phases are contributing most to the delay in rendering the LCP element. For this insight it can be useful to get a list of all network requests that happened before the LCP time and look for slow requests. You can also look for main thread activity during the phases, in particular the load delay and render delay phases.';
      case 'LongCriticalNetworkTree':
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
