// Copyright 2024 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.
/* eslint-disable rulesdir/no-lit-render-outside-of-view */

/**
 * @file A list of pass/fail conditions for an insight.
 */

import '../../../../ui/components/icon_button/icon_button.js';

import * as i18n from '../../../../core/i18n/i18n.js';
import type * as Trace from '../../../../models/trace/trace.js';
import * as ComponentHelpers from '../../../../ui/components/helpers/helpers.js';
import * as Lit from '../../../../ui/lit/lit.js';

import checklistStyles from './checklist.css.js';

const UIStrings = {
  /**
   * @description Text for a screen-reader label to tell the user that the icon represents a successful insight check
   * @example {Server response time} PH1
   */
  successAriaLabel: 'Insight check passed: {PH1}',
  /**
   * @description Text for a screen-reader label to tell the user that the icon represents an unsuccessful insight check
   * @example {Server response time} PH1
   */
  failedAriaLabel: 'Insight check failed: {PH1}',
} as const;

const str_ = i18n.i18n.registerUIStrings('panels/timeline/components/insights/Checklist.ts', UIStrings);
const i18nString = i18n.i18n.getLocalizedString.bind(undefined, str_);

const {html} = Lit;

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type GenericChecklist = Trace.Insights.Types.Checklist<any>;

export interface ChecklistData {
  checklist: GenericChecklist;
}

export interface TableDataRow {
  values: Array<number|string|Lit.LitTemplate>;
  overlays?: Trace.Types.Overlays.Overlay[];
}

export class Checklist extends HTMLElement {
  readonly #shadow = this.attachShadow({mode: 'open'});
  #checklist?: GenericChecklist;

  set checklist(checklist: GenericChecklist) {
    this.#checklist = checklist;
    void ComponentHelpers.ScheduledRender.scheduleRender(this, this.#render);
  }

  connectedCallback(): void {
    void ComponentHelpers.ScheduledRender.scheduleRender(this, this.#render);
  }

  #getIcon(check: GenericChecklist['']): Lit.TemplateResult {
    const icon = check.value ? 'check-circle' : 'clear';

    const ariaLabel = check.value ? i18nString(UIStrings.successAriaLabel, {PH1: check.label}) :
                                    i18nString(UIStrings.failedAriaLabel, {PH1: check.label});
    return html`
        <devtools-icon
          aria-label=${ariaLabel}
          name=${icon}
          class=${check.value ? 'check-passed' : 'check-failed'}
        ></devtools-icon>
      `;
  }

  async #render(): Promise<void> {
    if (!this.#checklist) {
      return;
    }

    Lit.render(
        html`
          <style>${checklistStyles}</style>
          <ul>
            ${Object.values(this.#checklist).map(check => html`<li>
                ${this.#getIcon(check)}
                <span data-checklist-label>${check.label}</span>
            </li>`)}
          </ul>`,
        this.#shadow, {host: this});
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'devtools-performance-checklist': Checklist;
  }
}

customElements.define('devtools-performance-checklist', Checklist);
