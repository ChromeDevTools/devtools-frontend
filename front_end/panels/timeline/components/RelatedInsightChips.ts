// Copyright 2024 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as i18n from '../../../core/i18n/i18n.js';
import type * as Trace from '../../../models/trace/trace.js';
import * as ComponentHelpers from '../../../ui/components/helpers/helpers.js';
import * as Lit from '../../../ui/lit/lit.js';

import stylesRaw from './relatedInsightChips.css.js';

// TODO(crbug.com/391381439): Fully migrate off of constructed style sheets.
const styles = new CSSStyleSheet();
styles.replaceSync(stylesRaw.cssContent);

const {html} = Lit;

const UIStrings = {
  /**
   *@description prefix shown next to related insight chips
   */
  insightKeyword: 'Insight',
  /**
   * @description Prefix shown next to related insight chips and containing the insight name.
   * @example {Improve image delivery} PH1
   */
  insightWithName: 'Insight: {PH1}',
};
const str_ = i18n.i18n.registerUIStrings('panels/timeline/components/RelatedInsightChips.ts', UIStrings);
const i18nString = i18n.i18n.getLocalizedString.bind(undefined, str_);

export interface RelatedInsight {
  insightLabel: string;
  messages: string[];
  activateInsight: () => void;
}
export type EventToRelatedInsightsMap = Map<Trace.Types.Events.Event, RelatedInsight[]>;

export interface Data {
  eventToRelatedInsightsMap: EventToRelatedInsightsMap;
  activeEvent: Trace.Types.Events.Event|null;
}
export class RelatedInsightChips extends HTMLElement {
  #shadow = this.attachShadow({mode: 'open'});

  #boundRender = this.#render.bind(this);

  #data: Data = {eventToRelatedInsightsMap: new Map(), activeEvent: null};

  connectedCallback(): void {
    this.#shadow.adoptedStyleSheets = [styles];
    this.#render();
  }

  set activeEvent(event: Data['activeEvent']) {
    if (event === this.#data.activeEvent) {
      return;
    }
    this.#data.activeEvent = event;
    void ComponentHelpers.ScheduledRender.scheduleRender(this, this.#boundRender);
  }

  set eventToRelatedInsightsMap(map: Data['eventToRelatedInsightsMap']) {
    this.#data.eventToRelatedInsightsMap = map;
    void ComponentHelpers.ScheduledRender.scheduleRender(this, this.#boundRender);
  }

  #insightClick(insight: RelatedInsight): (e: Event) => void {
    return (event: Event) => {
      event.preventDefault();
      insight.activateInsight();
    };
  }

  #render(): void {
    const {activeEvent, eventToRelatedInsightsMap} = this.#data;
    const relatedInsights = activeEvent ? eventToRelatedInsightsMap.get(activeEvent) ?? [] : [];
    if (!activeEvent || eventToRelatedInsightsMap.size === 0 || relatedInsights.length === 0) {
      Lit.render(html``, this.#shadow, {host: this});
      return;
    }

    // TODO: Render insight messages in a separate UX
    // Right before insight chips is acceptable for now
    const insightMessages = relatedInsights.flatMap(insight => {
      return insight.messages.map(message => html`
        <li class="insight-message-box">
          <button type="button" @click=${this.#insightClick(insight)}>
            <div class="insight-label">${i18nString(UIStrings.insightWithName, {
                                    PH1: insight.insightLabel,
                                  })}</div>
            <div class="insight-message">${message}</div>
          </button>
        </li>
      `);
    });

    const insightChips = relatedInsights.flatMap(insight => {
      // clang-format off
      return [html`
        <li class="insight-chip">
          <button type="button" @click=${this.#insightClick(insight)}>
            <span class="keyword">${i18nString(UIStrings.insightKeyword)}</span>
            <span class="insight-label">${insight.insightLabel}</span>
          </button>
        </li>
      `];
      // clang-format on
    });

    // clang-format off
    Lit.render(html`
      <ul>${insightMessages}</ul>
      <ul>${insightChips}</ul>
    `, this.#shadow, {host: this});
    // clang-format on
  }
}

customElements.define('devtools-related-insight-chips', RelatedInsightChips);
