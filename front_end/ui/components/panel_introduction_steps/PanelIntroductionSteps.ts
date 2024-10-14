// Copyright 2022 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as ComponentHelpers from '../../components/helpers/helpers.js';
import * as LitHtml from '../../lit-html/lit-html.js';
import panelIntroductionStepsStyles from './panelIntroductionSteps.css.js';

const {html} = LitHtml;

export class PanelIntroductionSteps extends HTMLElement {
  readonly #shadow = this.attachShadow({mode: 'open'});
  readonly #boundRender = this.#render.bind(this);

  connectedCallback(): void {
    this.#shadow.adoptedStyleSheets = [panelIntroductionStepsStyles];
    void ComponentHelpers.ScheduledRender.scheduleRender(this, this.#boundRender);
  }

  #render(): void {
    if (!ComponentHelpers.ScheduledRender.isScheduledRender(this)) {
      throw new Error('FeedbackButton render was not scheduled');
    }

    // clang-format off
    LitHtml.render(html`
      <h1><slot name="title">slot: title</slot></h1>

      <ol class="intro-steps">
        <li><slot name="step-1">slot: step-1</slot></li>
        <li><slot name="step-2">slot: step-2</slot></li>
        <li><slot name="step-3">slot: step-3</slot></li>
      </ol>
    `, this.#shadow, {host: this});
    // clang-format on
  }
}

customElements.define('devtools-panel-introduction-steps', PanelIntroductionSteps);

declare global {
  interface HTMLElementTagNameMap {
    'devtools-panel-introduction-steps': PanelIntroductionSteps;
  }
}
