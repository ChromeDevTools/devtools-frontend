// Copyright 2024 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.
/* eslint-disable rulesdir/no-lit-render-outside-of-view */

import './SidebarSingleInsightSet.js';

import * as Trace from '../../../models/trace/trace.js';
import * as Buttons from '../../../ui/components/buttons/buttons.js';
import * as ComponentHelpers from '../../../ui/components/helpers/helpers.js';
import * as Lit from '../../../ui/lit/lit.js';
import * as Utils from '../utils/utils.js';

import * as Insights from './insights/insights.js';
import type {ActiveInsight} from './Sidebar.js';
import sidebarInsightsTabStyles from './sidebarInsightsTab.css.js';
import type {SidebarSingleInsightSet, SidebarSingleInsightSetData} from './SidebarSingleInsightSet.js';

const {html} = Lit;

export class SidebarInsightsTab extends HTMLElement {
  readonly #shadow = this.attachShadow({mode: 'open'});
  #parsedTrace: Trace.Handlers.Types.ParsedTrace|null = null;
  #traceMetadata: Trace.Types.File.MetaData|null = null;
  #insights: Trace.Insights.Types.TraceInsightSets|null = null;
  #activeInsight: ActiveInsight|null = null;
  #selectedCategory = Trace.Insights.Types.InsightCategory.ALL;
  /**
   * When a trace has sets of insights, we show an accordion with each
   * set within. A set can be specific to a single navigation, or include the
   * beginning of the trace up to the first navigation.
   * You can only have one of these open at any time, and we track it via this ID.
   */
  #selectedInsightSetKey: string|null = null;

  // TODO(paulirish): add back a disconnectedCallback() to avoid memory leaks that doesn't cause b/372943062

  set parsedTrace(data: Trace.Handlers.Types.ParsedTrace|null) {
    if (data === this.#parsedTrace) {
      return;
    }
    this.#parsedTrace = data;
    this.#selectedInsightSetKey = null;

    void ComponentHelpers.ScheduledRender.scheduleRender(this, this.#render);
  }

  set traceMetadata(data: Trace.Types.File.MetaData|null) {
    if (data === this.#traceMetadata) {
      return;
    }
    this.#traceMetadata = data;
    this.#selectedInsightSetKey = null;

    void ComponentHelpers.ScheduledRender.scheduleRender(this, this.#render);
  }

  set insights(data: Trace.Insights.Types.TraceInsightSets|null) {
    if (data === this.#insights) {
      return;
    }

    this.#selectedInsightSetKey = null;
    if (!data || !this.#parsedTrace) {
      return;
    }

    this.#insights = new Map(data);
    /** Select the first set. Filtering out trivial sets was done back in {@link Trace.Processor.#computeInsightsForInitialTracePeriod} */
    this.#selectedInsightSetKey = [...this.#insights.keys()].at(0) ?? null;
    void ComponentHelpers.ScheduledRender.scheduleRender(this, this.#render);
  }

  get activeInsight(): ActiveInsight|null {
    return this.#activeInsight;
  }

  set activeInsight(active: ActiveInsight|null) {
    if (active === this.#activeInsight) {
      return;
    }
    this.#activeInsight = active;

    // Only update the insightSetKey if there is an active insight. Otherwise, closing an insight
    // would also collapse the insight set. Usually the proper insight set is already set because
    // the user has it open already in order for this setter to be called, but insights can also
    // be activated by clicking on a insight chip in the Summary panel, which may require opening
    // a different insight set.
    if (this.#activeInsight) {
      this.#selectedInsightSetKey = this.#activeInsight.insightSetKey;
    }
    void ComponentHelpers.ScheduledRender.scheduleRender(this, this.#render);
  }

  #insightSetToggled(id: string): void {
    this.#selectedInsightSetKey = this.#selectedInsightSetKey === id ? null : id;
    // Update the active insight set.
    if (this.#selectedInsightSetKey !== this.#activeInsight?.insightSetKey) {
      this.dispatchEvent(new Insights.SidebarInsight.InsightDeactivated());
    }
    void ComponentHelpers.ScheduledRender.scheduleRender(this, this.#render);
  }

  #insightSetHovered(id: string): void {
    const data = this.#insights?.get(id);
    data && this.dispatchEvent(new Insights.SidebarInsight.InsightSetHovered(data.bounds));
  }

  #insightSetUnhovered(): void {
    this.dispatchEvent(new Insights.SidebarInsight.InsightSetHovered());
  }

  #onZoomClick(event: Event, id: string): void {
    event.stopPropagation();
    const data = this.#insights?.get(id);
    if (!data) {
      return;
    }
    this.dispatchEvent(new Insights.SidebarInsight.InsightSetZoom(data.bounds));
  }

  #renderZoomButton(insightSetToggled: boolean): Lit.TemplateResult {
    const classes = Lit.Directives.classMap({
      'zoom-icon': true,
      active: insightSetToggled,
    });

    // clang-format off
    return html`
    <div class=${classes}>
        <devtools-button .data=${{
          variant: Buttons.Button.Variant.ICON,
          iconName: 'center-focus-weak',
          size: Buttons.Button.Size.SMALL,
        } as Buttons.Button.ButtonData}
      ></devtools-button></div>`;
    // clang-format on
  }

  #renderDropdownIcon(insightSetToggled: boolean): Lit.TemplateResult {
    const containerClasses = Lit.Directives.classMap({
      'dropdown-icon': true,
      active: insightSetToggled,
    });

    // clang-format off
    return html`
      <div class=${containerClasses}>
        <devtools-button .data=${{
          variant: Buttons.Button.Variant.ICON,
          iconName: 'chevron-right',
          size: Buttons.Button.Size.SMALL,
        } as Buttons.Button.ButtonData}
      ></devtools-button></div>
    `;
    // clang-format on
  }

  highlightActiveInsight(): void {
    if (!this.#activeInsight) {
      return;
    }
    // Find the right set for this insight via the set key.
    const set = this.#shadow?.querySelector<SidebarSingleInsightSet>(
        `devtools-performance-sidebar-single-navigation[data-insight-set-key="${this.#activeInsight.insightSetKey}"]`);
    if (!set) {
      return;
    }
    set.highlightActiveInsight();
  }

  #render(): void {
    if (!this.#parsedTrace || !this.#insights) {
      Lit.render(Lit.nothing, this.#shadow, {host: this});
      return;
    }

    const hasMultipleInsightSets = this.#insights.size > 1;
    const labels = Utils.Helpers.createUrlLabels([...this.#insights.values()].map(({url}) => url));

    const contents =
        // clang-format off
     html`
      <style>${sidebarInsightsTabStyles}</style>
      <div class="insight-sets-wrapper">
        ${[...this.#insights.values()].map(({id, url}, index) => {
          const data: SidebarSingleInsightSetData = {
            insights: this.#insights,
            insightSetKey: id,
            activeCategory: this.#selectedCategory,
            activeInsight: this.#activeInsight,
            parsedTrace: this.#parsedTrace,
            traceMetadata: this.#traceMetadata,
          };

          const contents = html`
            <devtools-performance-sidebar-single-navigation
              data-insight-set-key=${id}
              .data=${data}>
            </devtools-performance-sidebar-single-navigation>
          `;

          if (hasMultipleInsightSets) {
            return html`<details
              ?open=${id === this.#selectedInsightSetKey}
            >
              <summary
                @click=${() => this.#insightSetToggled(id)}
                @mouseenter=${() => this.#insightSetHovered(id)}
                @mouseleave=${() => this.#insightSetUnhovered()}
                title=${url.href}>
                ${this.#renderDropdownIcon(id === this.#selectedInsightSetKey)}
                <span>${labels[index]}</span>
                <span class='zoom-button' @click=${(event: Event) => this.#onZoomClick(event, id)}>${this.#renderZoomButton(id === this.#selectedInsightSetKey)}</span>
              </summary>
              ${contents}
            </details>`;
          }

          return contents;
        })}
      </div>
    `;
    // clang-format on

    // Insight components contain state, so to prevent insights from previous trace loads breaking things we use the parsedTrace
    // as a render key.
    // Note: newer Lit has `keyed`, but we don't have that, so we do it manually. https://lit.dev/docs/templates/directives/#keyed
    const result = Lit.Directives.repeat([contents], () => this.#parsedTrace, template => template);
    Lit.render(result, this.#shadow, {host: this});
  }
}

customElements.define('devtools-performance-sidebar-insights', SidebarInsightsTab);

declare global {
  interface HTMLElementTagNameMap {
    'devtools-performance-sidebar-insights': SidebarInsightsTab;
  }
}
