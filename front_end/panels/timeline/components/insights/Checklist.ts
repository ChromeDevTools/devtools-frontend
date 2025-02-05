// Copyright 2024 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

/**
 * @fileoverview A list of pass/fail conditions for an insight.
 */

import '../../../../ui/components/icon_button/icon_button.js';

import * as i18n from '../../../../core/i18n/i18n.js';
import type * as Trace from '../../../../models/trace/trace.js';
import * as ComponentHelpers from '../../../../ui/components/helpers/helpers.js';
import * as UI from '../../../../ui/legacy/legacy.js';
import * as Lit from '../../../../ui/lit/lit.js';
import type * as Overlays from '../../overlays/overlays.js';

import checklistStylesRaw from './checklist.css.js';

const UIStrings = {
  /**
   *@description Text for a screen-reader label to tell the user that the icon represents a successful insight check
   *@example {Server response time} PH1
   */
  successAriaLabel: 'Insight check passed: {PH1}',
  /**
   *@description Text for a screen-reader label to tell the user that the icon represents an unsuccessful insight check
   *@example {Server response time} PH1
   */
  failedAriaLabel: 'Insight check failed: {PH1}',
};

const str_ = i18n.i18n.registerUIStrings('panels/timeline/components/insights/Checklist.ts', UIStrings);
const i18nString = i18n.i18n.getLocalizedString.bind(undefined, str_);

// TODO(crbug.com/391381439): Fully migrate off of constructed style sheets.
const checklistStyles = new CSSStyleSheet();
checklistStyles.replaceSync(checklistStylesRaw.cssContent);

const {html} = Lit;

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type GenericChecklist = Trace.Insights.Types.Checklist<any>;

export interface ChecklistData {
  checklist: GenericChecklist;
}

export interface TableDataRow {
  values: Array<number|string|Lit.LitTemplate>;
  overlays?: Overlays.Overlays.TimelineOverlay[];
}

export class Checklist extends HTMLElement {
  readonly #shadow = this.attachShadow({mode: 'open'});
  readonly #boundRender = this.#render.bind(this);
  #checklist?: GenericChecklist;

  set checklist(checklist: GenericChecklist) {
    this.#checklist = checklist;
    void ComponentHelpers.ScheduledRender.scheduleRender(this, this.#boundRender);
  }

  connectedCallback(): void {
    this.#shadow.adoptedStyleSheets.push(checklistStyles);
    UI.UIUtils.injectCoreStyles(this.#shadow);

    void ComponentHelpers.ScheduledRender.scheduleRender(this, this.#boundRender);
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
          <ul>
            ${Object.values(this.#checklist).map(check => html`<li>
                ${this.#getIcon(check)}
                <span>${check.label}</span>
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
