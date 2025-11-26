// Copyright 2022 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.
/* eslint-disable @devtools/no-lit-render-outside-of-view, @devtools/enforce-custom-element-definitions-location */
import * as ComponentHelpers from '../../components/helpers/helpers.js';
import { html, render } from '../../lit/lit.js';
import panelIntroductionStepsStyles from './panelIntroductionSteps.css.js';
export class PanelIntroductionSteps extends HTMLElement {
    #shadow = this.attachShadow({ mode: 'open' });
    connectedCallback() {
        void ComponentHelpers.ScheduledRender.scheduleRender(this, this.#render);
    }
    #render() {
        if (!ComponentHelpers.ScheduledRender.isScheduledRender(this)) {
            throw new Error('FeedbackButton render was not scheduled');
        }
        // clang-format off
        render(html `
      <style>${panelIntroductionStepsStyles}</style>
      <h1><slot name="title">slot: title</slot></h1>

      <ol class="intro-steps">
        <li><slot name="step-1">slot: step-1</slot></li>
        <li><slot name="step-2">slot: step-2</slot></li>
        <li><slot name="step-3">slot: step-3</slot></li>
      </ol>
    `, this.#shadow, { host: this });
        // clang-format on
    }
}
customElements.define('devtools-panel-introduction-steps', PanelIntroductionSteps);
//# sourceMappingURL=PanelIntroductionSteps.js.map