// Copyright 2021 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.
/* eslint-disable rulesdir/no-lit-render-outside-of-view */

import * as Host from '../../../core/host/host.js';
import * as i18n from '../../../core/i18n/i18n.js';
import * as Platform from '../../../core/platform/platform.js';
import * as ComponentHelpers from '../../components/helpers/helpers.js';
import {html, render} from '../../lit/lit.js';
import * as Buttons from '../buttons/buttons.js';

const UIStrings = {
  /**
   * @description The title of the button that leads to the feedback form.
   */
  feedback: 'Feedback',
} as const;

const str_ = i18n.i18n.registerUIStrings('ui/components/panel_feedback/FeedbackButton.ts', UIStrings);
const i18nString = i18n.i18n.getLocalizedString.bind(undefined, str_);

export interface FeedbackButtonData {
  feedbackUrl: Platform.DevToolsPath.UrlString;
}
export class FeedbackButton extends HTMLElement {
  readonly #shadow = this.attachShadow({mode: 'open'});

  #props: FeedbackButtonData = {
    feedbackUrl: Platform.DevToolsPath.EmptyUrlString,
  };

  set data(data: FeedbackButtonData) {
    this.#props = data;
    void ComponentHelpers.ScheduledRender.scheduleRender(this, this.#render);
  }

  #onFeedbackClick(): void {
    Host.InspectorFrontendHost.InspectorFrontendHostInstance.openInNewTab(this.#props.feedbackUrl);
  }

  #render(): void {
    if (!ComponentHelpers.ScheduledRender.isScheduledRender(this)) {
      throw new Error('FeedbackButton render was not scheduled');
    }

    // clang-format off
    render(html`
      <devtools-button
          @click=${this.#onFeedbackClick}
          .iconName=${'review'}
          .variant=${Buttons.Button.Variant.OUTLINED}
          .jslogContext=${'feedback'}
      >${i18nString(UIStrings.feedback)}</devtools-button>
      `, this.#shadow, {host: this});
    // clang-format on
  }
}

customElements.define('devtools-feedback-button', FeedbackButton);

declare global {
  interface HTMLElementTagNameMap {
    'devtools-feedback-button': FeedbackButton;
  }
}
