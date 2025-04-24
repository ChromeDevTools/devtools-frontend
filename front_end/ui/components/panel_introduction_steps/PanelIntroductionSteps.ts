// Copyright 2022 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.
/* eslint-disable rulesdir/no-lit-render-outside-of-view */

import * as ComponentHelpers from '../../components/helpers/helpers.js';
import {html, render} from '../../lit/lit.js';

import panelIntroductionStepsStylesRaw from './panelIntroductionSteps.css.js';

/* eslint-disable rulesdir/no-adopted-style-sheets --
 * TODO(crbug.com/391381439): Fully migrate off of Constructable Stylesheets.
 **/
const panelIntroductionStepsStyles = new CSSStyleSheet();
panelIntroductionStepsStyles.replaceSync(panelIntroductionStepsStylesRaw.cssText);

export class PanelIntroductionSteps extends HTMLElement {
  readonly #shadow = this.attachShadow({mode: 'open'});

  connectedCallback(): void {
    this.#shadow.adoptedStyleSheets = [panelIntroductionStepsStyles];
    void ComponentHelpers.ScheduledRender.scheduleRender(this, this.#render);
  }

  #render(): void {
    if (!ComponentHelpers.ScheduledRender.isScheduledRender(this)) {
      throw new Error('FeedbackButton render was not scheduled');
    }

    // clang-format off
    render(html`
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
