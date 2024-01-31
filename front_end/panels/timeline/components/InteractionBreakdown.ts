// Copyright 2023 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.
import * as i18n from '../../../core/i18n/i18n.js';
import * as TraceEngine from '../../../models/trace/trace.js';
import * as ComponentHelpers from '../../../ui/components/helpers/helpers.js';
import * as LitHtml from '../../../ui/lit-html/lit-html.js';

import styles from './interactionBreakdown.css.js';

const UIStrings = {
  /**
   *@description Text shown next to the interaction event's input delay time in the detail view.
   */
  inputDelay: 'Input delay',
  /**
   *@description Text shown next to the interaction event's thread processing time in the detail view.
   */
  processingTime: 'Processing time',
  /**
   *@description Text shown next to the interaction event's presentation delay time in the detail view.
   */
  presentationDelay: 'Presentation delay',
};
const str_ = i18n.i18n.registerUIStrings('panels/timeline/components/InteractionBreakdown.ts', UIStrings);
const i18nString = i18n.i18n.getLocalizedString.bind(undefined, str_);

export class InteractionBreakdown extends HTMLElement {
  static readonly litTagName = LitHtml.literal`devtools-interaction-breakdown`;
  readonly #shadow = this.attachShadow({mode: 'open'});
  readonly #boundRender = this.#render.bind(this);
  #entry: TraceEngine.Types.TraceEvents.SyntheticInteractionPair|null = null;

  connectedCallback(): void {
    this.#shadow.adoptedStyleSheets = [styles];
  }

  set entry(entry: TraceEngine.Types.TraceEvents.SyntheticInteractionPair) {
    if (entry === this.#entry) {
      return;
    }
    this.#entry = entry;
    void ComponentHelpers.ScheduledRender.scheduleRender(this, this.#boundRender);
  }

  #render(): void {
    if (!this.#entry) {
      return;
    }
    const inputDelay = TraceEngine.Helpers.Timing.formatMicrosecondsTime(this.#entry.inputDelay);
    const mainThreadTime = TraceEngine.Helpers.Timing.formatMicrosecondsTime(this.#entry.mainThreadHandling);
    const presentationDelay = TraceEngine.Helpers.Timing.formatMicrosecondsTime(this.#entry.presentationDelay);
    LitHtml.render(
        LitHtml.html`<ul class="breakdown">
                     <li data-entry="input-delay">${i18nString(UIStrings.inputDelay)}<span class="value">${
            inputDelay}</span></li>
                     <li data-entry="processing-time">${i18nString(UIStrings.processingTime)}<span class="value">${
            mainThreadTime}</span></li>
                     <li data-entry="presentation-delay">${
            i18nString(UIStrings.presentationDelay)}<span class="value">${presentationDelay}</span></li>
                   </ul>
                   `,
        this.#shadow, {host: this});
  }
}

ComponentHelpers.CustomElements.defineComponent('devtools-interaction-breakdown', InteractionBreakdown);

declare global {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  interface HTMLElementTagNameMap {
    'devtools-interaction-breakdown': InteractionBreakdown;
  }
}
