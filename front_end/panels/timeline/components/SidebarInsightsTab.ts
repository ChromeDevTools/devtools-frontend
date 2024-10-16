// Copyright 2024 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import './SidebarSingleInsightSet.js';

import * as Host from '../../../core/host/host.js';
import * as i18n from '../../../core/i18n/i18n.js';
import type * as Platform from '../../../core/platform/platform.js';
import * as Trace from '../../../models/trace/trace.js';
import * as Buttons from '../../../ui/components/buttons/buttons.js';
import * as ComponentHelpers from '../../../ui/components/helpers/helpers.js';
import * as LitHtml from '../../../ui/lit-html/lit-html.js';
import * as Utils from '../utils/utils.js';

import * as Insights from './insights/insights.js';
import type {ActiveInsight} from './Sidebar.js';
import styles from './sidebarInsightsTab.css.js';
import type {SidebarSingleInsightSetData} from './SidebarSingleInsightSet.js';

const {html} = LitHtml;

const FEEDBACK_URL = 'https://crbug.com/371170842' as Platform.DevToolsPath.UrlString;

const UIStrings = {
  /**
   *@description text show in feedback button
   */
  feedbackButton: 'Feedback',
  /**
   *@description text show in feedback tooltip
   */
  feedbackTooltip: 'Insights is an experimental feature. Your feedback will help us improve it.',
};

const str_ = i18n.i18n.registerUIStrings('panels/timeline/components/SidebarInsightsTab.ts', UIStrings);
const i18nString = i18n.i18n.getLocalizedString.bind(undefined, str_);

export class SidebarInsightsTab extends HTMLElement {
  readonly #boundRender = this.#render.bind(this);
  readonly #shadow = this.attachShadow({mode: 'open'});

  #parsedTrace: Trace.Handlers.Types.ParsedTrace|null = null;
  #insights: Trace.Insights.Types.TraceInsightSets|null = null;
  #activeInsight: ActiveInsight|null = null;
  #selectedCategory = Insights.Types.Category.ALL;
  /**
   * When a trace has sets of insights, we show an accordion with each
   * set within. A set can be specific to a single navigation, or include the
   * beginning of the trace up to the first navigation.
   * You can only have one of these open at any time, and we track it via this ID.
   */
  #insightSetKey: string|null = null;

  connectedCallback(): void {
    this.#shadow.adoptedStyleSheets = [styles];
  }

  // TODO(paulirish): add back a disconnectedCallback() to avoid memory leaks that doesn't cause b/372943062

  set parsedTrace(data: Trace.Handlers.Types.ParsedTrace|null) {
    if (data === this.#parsedTrace) {
      return;
    }
    this.#parsedTrace = data;
    this.#insightSetKey = null;

    void ComponentHelpers.ScheduledRender.scheduleRender(this, this.#boundRender);
  }

  set insights(data: Trace.Insights.Types.TraceInsightSets|null) {
    if (data === this.#insights) {
      return;
    }

    this.#insights = data;
    this.#insightSetKey = null;
    if (!this.#insights || !this.#parsedTrace) {
      return;
    }

    // Select by default the first non-trivial insight set:
    // - greater than 5s in duration
    // - or, has a navigation
    // In practice this means selecting either the first or the second insight set.
    const trivialThreshold = Trace.Helpers.Timing.millisecondsToMicroseconds(Trace.Types.Timing.MilliSeconds(5000));
    const insightSets = [...this.#insights.values()];
    this.#insightSetKey =
        insightSets.find(insightSet => insightSet.navigation || insightSet.bounds.range > trivialThreshold)?.id
        // If everything is "trivial", just select the first one.
        ?? insightSets[0]?.id ?? null;

    void ComponentHelpers.ScheduledRender.scheduleRender(this, this.#boundRender);
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
      this.#insightSetKey = this.#activeInsight.insightSetKey;
    }
    void ComponentHelpers.ScheduledRender.scheduleRender(this, this.#boundRender);
  }

  #insightSetToggled(id: string): void {
    this.#insightSetKey = this.#insightSetKey === id ? null : id;
    // Update the active insight set.
    if (this.#insightSetKey !== this.#activeInsight?.insightSetKey) {
      this.dispatchEvent(new Insights.SidebarInsight.InsightDeactivated());
    }
    void ComponentHelpers.ScheduledRender.scheduleRender(this, this.#boundRender);
  }

  #insightSetHovered(id: string): void {
    const data = this.#insights?.get(id);
    data && this.dispatchEvent(new Insights.SidebarInsight.InsightSetHovered(data.bounds));
  }

  #insightSetUnhovered(): void {
    this.dispatchEvent(new Insights.SidebarInsight.InsightSetHovered());
  }

  #onFeedbackClick(): void {
    Host.InspectorFrontendHost.InspectorFrontendHostInstance.openInNewTab(FEEDBACK_URL);
  }

  #onZoomClick(event: Event, id: string): void {
    event.stopPropagation();
    const data = this.#insights?.get(id);
    if (!data) {
      return;
    }
    this.dispatchEvent(new Insights.SidebarInsight.InsightSetZoom(data.bounds));
  }

  #renderZoomButton(insightSetToggled: boolean): LitHtml.TemplateResult {
    const classes = LitHtml.Directives.classMap({
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

  #renderDropdownIcon(insightSetToggled: boolean): LitHtml.TemplateResult {
    const containerClasses = LitHtml.Directives.classMap({
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

  #render(): void {
    if (!this.#parsedTrace || !this.#insights) {
      LitHtml.render(LitHtml.nothing, this.#shadow, {host: this});
      return;
    }

    const hasMultipleInsightSets = this.#insights.size > 1;
    const labels = Utils.Helpers.createUrlLabels([...this.#insights.values()].map(({url}) => url));

    const contents =
        // clang-format off
     html`
      <div class="insight-sets-wrapper">
        ${[...this.#insights.values()].map(({id, url}, index) => {
          const data = {
            parsedTrace: this.#parsedTrace,
            insights: this.#insights,
            insightSetKey: id,
            activeCategory: this.#selectedCategory,
            activeInsight: this.#activeInsight,
          };

          const contents = html`
            <devtools-performance-sidebar-single-navigation
              .data=${data as SidebarSingleInsightSetData}>
            </devtools-performance-sidebar-single-navigation>
          `;

          if (hasMultipleInsightSets) {
            return html`<details
              ?open=${id === this.#insightSetKey}
            >
              <summary
                @click=${() => this.#insightSetToggled(id)}
                @mouseenter=${() => this.#insightSetHovered(id)}
                @mouseleave=${() => this.#insightSetUnhovered()}
                title=${url.href}>
                ${this.#renderDropdownIcon(id === this.#insightSetKey)}
                <span>${labels[index]}</span>
                <span class='zoom-button' @click=${(event: Event) => this.#onZoomClick(event, id)}>${this.#renderZoomButton(id === this.#insightSetKey)}</span>
              </summary>
              ${contents}
            </details>`;
          }

          return contents;
        })}
      </div>

      <div class="feedback-wrapper">
        <devtools-button .variant=${Buttons.Button.Variant.OUTLINED} .iconName=${'experiment'} @click=${this.#onFeedbackClick}>
          ${i18nString(UIStrings.feedbackButton)}
        </devtools-button>

        <p class="tooltip">${i18nString(UIStrings.feedbackTooltip)}</p>
      </div>
    `;
    // clang-format on

    // Insight components contain state, so to prevent insights from previous trace loads breaking things we use the parsedTrace
    // as a render key.
    // Note: newer Lit has `keyed`, but we don't have that, so we do it manually. https://lit.dev/docs/templates/directives/#keyed
    const result = LitHtml.Directives.repeat([contents], () => this.#parsedTrace, template => template);
    LitHtml.render(result, this.#shadow, {host: this});
  }
}

customElements.define('devtools-performance-sidebar-insights', SidebarInsightsTab);

declare global {
  interface HTMLElementTagNameMap {
    'devtools-performance-sidebar-insights': SidebarInsightsTab;
  }
}
