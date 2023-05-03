// Copyright 2023 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import '../../../ui/legacy/legacy.js';

import * as i18n from '../../../core/i18n/i18n.js';
import type * as Platform from '../../../core/platform/platform.js';
import * as Buttons from '../../../ui/components/buttons/buttons.js';
import * as ComponentHelpers from '../../../ui/components/helpers/helpers.js';
import * as PanelFeedback from '../../../ui/components/panel_feedback/panel_feedback.js';
import * as PanelIntroductionSteps from '../../../ui/components/panel_introduction_steps/panel_introduction_steps.js';
import * as LitHtml from '../../../ui/lit-html/lit-html.js';

import startViewStyles from './startView.css.js';

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
  static readonly litTagName = LitHtml.literal`devtools-start-view`;
  readonly #shadow = this.attachShadow({mode: 'open'});

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
      LitHtml.html`
        <div class="wrapper">
          <${
            PanelIntroductionSteps.PanelIntroductionSteps.PanelIntroductionSteps
              .litTagName
          }>
            <span slot="title">${i18nString(UIStrings.header)}</span>
            <span slot="step-1">${i18nString(UIStrings.step1)}</span>
            <span slot="step-2">${i18nString(UIStrings.step2)}</span>
            <span slot="step-3">${i18nString(UIStrings.step3)}</span>
          </${
            PanelIntroductionSteps.PanelIntroductionSteps.PanelIntroductionSteps
              .litTagName
          }>
          <div class="fit-content">
            <${Buttons.Button.Button.litTagName} .variant=${
        Buttons.Button.Variant.PRIMARY
      } @click=${this.#onClick}>
              ${i18nString(UIStrings.createRecording)}
            </${Buttons.Button.Button.litTagName}>
          </div>
          <${PanelFeedback.PanelFeedback.PanelFeedback.litTagName} .data=${
        {
          feedbackUrl: FEEDBACK_URL,
          quickStartUrl: DOC_URL,
          quickStartLinkText: i18nString(UIStrings.quickStart),
        } as PanelFeedback.PanelFeedback.PanelFeedbackData
      }>
          </${PanelFeedback.PanelFeedback.PanelFeedback.litTagName}>
          <div class="align-right">
            <${PanelFeedback.FeedbackButton.FeedbackButton.litTagName} .data=${
        {
          feedbackUrl: FEEDBACK_URL,
        } as PanelFeedback.FeedbackButton.FeedbackButtonData
      }>
            </${PanelFeedback.FeedbackButton.FeedbackButton.litTagName}>
          </div>
        </div>
      `,
      this.#shadow,
      { host: this },
    );
    // clang-format on
  };
}

ComponentHelpers.CustomElements.defineComponent(
    'devtools-start-view',
    StartView,
);
