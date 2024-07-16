// Copyright 2024 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import type * as TraceEngine from '../../../../models/trace/trace.js';
import * as ComponentHelpers from '../../../../ui/components/helpers/helpers.js';
import * as LitHtml from '../../../../ui/lit-html/lit-html.js';
import sidebarStyles from '../sidebar.css.js';

import sidebarInsightStyles from './sidebarInsight.css.js';
import * as SidebarInsightNamespace from './SidebarInsight.js';

export class LCPPhases extends HTMLElement {
  static readonly litTagName = LitHtml.literal`devtools-performance-lcp-by-phases`;
  readonly #shadow = this.attachShadow({mode: 'open'});
  readonly #boundRender = this.#render.bind(this);
  #insightTitle: string = 'LCP by Phase';
  #expanded: boolean = false;
  #insights: TraceEngine.Insights.Types.TraceInsightData|null = null;
  #navigationId: string|null = null;
  #phaseData: Array<{phase: string, timing: number|TraceEngine.Types.Timing.MilliSeconds, percent: string}>|null = null;

  set insights(insights: TraceEngine.Insights.Types.TraceInsightData|null) {
    this.#insights = insights;
    this.#phaseData = this.getPhaseData(this.#insights, this.#navigationId);
    void ComponentHelpers.ScheduledRender.scheduleRender(this, this.#boundRender);
  }

  set navigationId(navigationId: string|null) {
    this.#navigationId = navigationId;
    void ComponentHelpers.ScheduledRender.scheduleRender(this, this.#boundRender);
  }

  #toggleClick(): void {
    this.#expanded = !this.#expanded;
    void ComponentHelpers.ScheduledRender.scheduleRender(this, this.#boundRender);
  }

  getPhaseData(insights: TraceEngine.Insights.Types.TraceInsightData|null, navigationId: string|null):
      Array<{phase: string, timing: number|TraceEngine.Types.Timing.MilliSeconds, percent: string}> {
    if (!insights || !navigationId) {
      return [];
    }
    const insightsByNavigation = insights.get(navigationId);
    if (!insightsByNavigation) {
      return [];
    }
    const lcpInsight = insightsByNavigation.LargestContentfulPaint;
    if (lcpInsight instanceof Error) {
      return [];
    }

    const timing = lcpInsight.lcpMs;
    const phases = lcpInsight.phases;

    if (!timing || !phases) {
      return [];
    }

    const {ttfb, loadDelay, loadTime, renderDelay} = phases;

    if (loadDelay && loadTime) {
      const phaseData = [
        {phase: 'Time to first byte', timing: ttfb, percent: `${(100 * ttfb / timing).toFixed(0)}%`},
        {phase: 'Resource load delay', timing: loadDelay, percent: `${(100 * loadDelay / timing).toFixed(0)}%`},
        {phase: 'Resource load duration', timing: loadTime, percent: `${(100 * loadTime / timing).toFixed(0)}%`},
        {phase: 'Resource render delay', timing: renderDelay, percent: `${(100 * renderDelay / timing).toFixed(0)}%`},
      ];
      return phaseData;
    }

    // If the lcp is text, we only have ttfb and render delay.
    const phaseData = [
      {phase: 'Time to first byte', timing: ttfb, percent: `${(100 * ttfb / timing).toFixed(0)}%`},
      {phase: 'Resource render delay', timing: renderDelay, percent: `${(100 * renderDelay / timing).toFixed(0)}%`},
    ];
    return phaseData;
  }

  renderLCPPhases(): LitHtml.LitTemplate {
    const showLCPPhases = this.#phaseData ? this.#phaseData.length > 0 : false;

    // clang-format off
        if (this.#expanded) {
          return LitHtml.html`${showLCPPhases ? LitHtml.html`
            <div class="insights" @click=${this.#toggleClick}>
              <${SidebarInsightNamespace.SidebarInsight.litTagName} .data=${{
                  title: this.#insightTitle,
                  expanded: this.#expanded,
              } as SidebarInsightNamespace.InsightDetails}>
              <div slot="insight-description" class="insight-description">
                Each
                <x-link class="link" href="https://web.dev/articles/optimize-lcp#lcp-breakdown">phase has specific recommendations to improve.</x-link>
                In an ideal load, the two delay phases should be quite short.
              </div>
              <div slot="insight-content" class="table-container">
                <dl>
                  <dt class="dl-title">Phase</dt>
                  <dd class="dl-title">% of LCP</dd>
                  ${this.#phaseData?.map(phase => LitHtml.html`
                    <dt>${phase.phase}</dt>
                    <dd class="dl-value">${phase.percent}</dd>
                  `)}
                </dl>
              </div>
              </${SidebarInsightNamespace}>
            </div>` : LitHtml.nothing}`;
        }

        return LitHtml.html`
        <div class="insights" @click=${this.#toggleClick}>
          <${SidebarInsightNamespace.SidebarInsight.litTagName} .data=${{
                title: this.#insightTitle,
                expanded: this.#expanded,
            } as SidebarInsightNamespace.InsightDetails}>
          </${SidebarInsightNamespace}>
        </div>`;
    // clang-format on
  }

  connectedCallback(): void {
    this.#shadow.adoptedStyleSheets = [sidebarInsightStyles, sidebarStyles];
  }

  #render(): void {
    const output = this.renderLCPPhases();
    LitHtml.render(output, this.#shadow, {host: this});
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'devtools-performance-lcp-by-phases': LCPPhases;
  }
}

customElements.define('devtools-performance-lcp-by-phases', LCPPhases);
