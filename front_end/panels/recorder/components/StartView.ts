// Copyright 2023 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import '../../../ui/components/panel_feedback/panel_feedback.js';
import '../../../ui/components/panel_introduction_steps/panel_introduction_steps.js';
import '../../../ui/legacy/legacy.js';

import * as i18n from '../../../core/i18n/i18n.js';
import type * as Platform from '../../../core/platform/platform.js';
import * as Buttons from '../../../ui/components/buttons/buttons.js';
import * as ComponentHelpers from '../../../ui/components/helpers/helpers.js';
import * as LitHtml from '../../../ui/lit-html/lit-html.js';
import * as VisualLogging from '../../../ui/visual_logging/visual_logging.js';
import * as Actions from '../recorder-actions/recorder-actions.js';

import startViewStyles from './startView.css.js';

const {html} = LitHtml;

const UIStrings = {
  /**
   * @description The header of the start page in the Recorder panel.
   */
  header: 'Measure performance across an entire user journey',
  /**
   * @description The Recorder start page contains a list of steps that the user can do. This is the text of the first step.
   */
  step1: 'Record a common user journey on your website or app',
  /**
   * @description The Recorder start page contains a list of steps that the user can do. This is the text of the second step.
   */
  step2: 'Replay the recording to check if the flow is working',
  /**
   * @description The Recorder start page contains a list of steps that the user can do. This is the text of the third step.
   */
  step3: 'Generate a detailed performance trace or export a Puppeteer script for testing',
  /**
   * @description The title of the button that leads to the page for creating a new recording.
   */
  createRecording: 'Create a new recording',
  /**
   * @description The link title in the Preview feature box leading to an article documenting the recorder feature.
   */
  quickStart: 'Quick start: learn the new Recorder panel in DevTools',
};
const str_ = i18n.i18n.registerUIStrings(
    'panels/recorder/components/StartView.ts',
    UIStrings,
);
const i18nString = i18n.i18n.getLocalizedString.bind(undefined, str_);

export const FEEDBACK_URL = 'https://goo.gle/recorder-feedback' as Platform.DevToolsPath.UrlString;
const DOC_URL = 'https://developer.chrome.com/docs/devtools/recorder' as Platform.DevToolsPath.UrlString;

declare global {
  interface HTMLElementTagNameMap {
    'devtools-start-view': StartView;
  }
}

export class CreateRecordingEvent extends Event {
  static readonly eventName = 'createrecording';
  constructor() {
    super(CreateRecordingEvent.eventName);
  }
}

export class StartView extends HTMLElement {
  readonly #shadow = this.attachShadow({mode: 'open'});

  constructor() {
    super();
    this.setAttribute('jslog', `${VisualLogging.section('start-view')}`);
  }

  connectedCallback(): void {
    this.#shadow.adoptedStyleSheets = [startViewStyles];
    void ComponentHelpers.ScheduledRender.scheduleRender(this, this.#render);
  }

  #onClick(): void {
    this.dispatchEvent(new CreateRecordingEvent());
  }

  #render = (): void => {
    // clang-format off
    LitHtml.render(
      html`
        <div class="wrapper">
          <devtools-panel-introduction-steps>
            <span slot="title">${i18nString(UIStrings.header)}</span>
            <span slot="step-1">${i18nString(UIStrings.step1)}</span>
            <span slot="step-2">${i18nString(UIStrings.step2)}</span>
            <span slot="step-3">${i18nString(UIStrings.step3)}</span>
          </devtools-panel-introduction-steps>
          <div class="fit-content">
            <devtools-button .variant=${
        Buttons.Button.Variant.PRIMARY
      } @click=${this.#onClick}
              .jslogContext=${Actions.RecorderActions.CREATE_RECORDING}>
              ${i18nString(UIStrings.createRecording)}
            </devtools-button>
          </div>
          <devtools-panel-feedback .data=${
        {
          feedbackUrl: FEEDBACK_URL,
          quickStartUrl: DOC_URL,
          quickStartLinkText: i18nString(UIStrings.quickStart),
        }
      }>
          </devtools-panel-feedback>
          <div class="align-right">
            <devtools-feedback-button .data=${
        {
          feedbackUrl: FEEDBACK_URL,
        }
      }>
            </devtools-feedback-button>
          </div>
        </div>
      `,
      this.#shadow,
      { host: this },
    );
    // clang-format on
  };
}

customElements.define(
    'devtools-start-view',
    StartView,
);
