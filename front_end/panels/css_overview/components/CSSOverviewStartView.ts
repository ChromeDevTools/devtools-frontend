// Copyright 2019 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as i18n from '../../../core/i18n/i18n.js';
import type * as Platform from '../../../core/platform/platform.js';
import * as Buttons from '../../../ui/components/buttons/buttons.js';
import * as PanelFeedback from '../../../ui/components/panel_feedback/panel_feedback.js';
import * as PanelIntroductionSteps from '../../../ui/components/panel_introduction_steps/panel_introduction_steps.js';
import * as LitHtml from '../../../ui/lit-html/lit-html.js';

import cssOverviewStartViewStyles from './cssOverviewStartView.css.js';

const UIStrings = {
  /**
   *@description Label for the capture button in the CSS overview panel
   */
  captureOverview: 'Capture overview',
  /**
   *@description Header for the summary of CSS overview
   */
  identifyCSSImprovements: 'Identify potential CSS improvements',
  /**
   *@description First point of the summarized features of CSS overview
   */
  capturePageCSSOverview: 'Capture an overview of your page’s CSS',
  /**
   *@description Second point of the summarized features of CSS overview
   */
  identifyCSSImprovementsWithExampleIssues:
      'Identify potential CSS improvements (e.g. low contrast issues, unused declarations, color or font mismatches)',
  /**
   *@description Third point of the summarized features of CSS overview
   */
  locateAffectedElements: 'Locate the affected elements in the Elements panel',
  /**
   *@description Title of the link to the quick start video and documentation to CSS overview panel
   */
  quickStartWithCSSOverview: 'Quick start: get started with the new CSS overview panel',
};
const str_ = i18n.i18n.registerUIStrings('panels/css_overview/components/CSSOverviewStartView.ts', UIStrings);
const i18nString = i18n.i18n.getLocalizedString.bind(undefined, str_);

const {render, html} = LitHtml;

const FEEDBACK_LINK = 'https://g.co/devtools/css-overview-feedback' as Platform.DevToolsPath.UrlString;
const DOC_LINK = 'https://developer.chrome.com/docs/devtools/css-overview' as Platform.DevToolsPath.UrlString;
export class OverviewStartRequestedEvent extends Event {
  static readonly eventName = 'overviewstartrequested';

  constructor() {
    super(OverviewStartRequestedEvent.eventName);
  }
}

export class CSSOverviewStartView extends HTMLElement {
  static readonly litTagName = LitHtml.literal`devtools-css-overview-start-view`;
  readonly #shadow = this.attachShadow({mode: 'open'});

  connectedCallback(): void {
    this.#shadow.adoptedStyleSheets = [cssOverviewStartViewStyles];
    this.#render();
  }

  show(): void {
    this.classList.remove('hidden');
  }

  hide(): void {
    this.classList.add('hidden');
  }

  #onStartCaptureClick(): void {
    this.dispatchEvent(new OverviewStartRequestedEvent());
  }

  #render(): void {
    // Disabled until https://crbug.com/1079231 is fixed.
    // clang-format off
    render(html`
      <div class="css-overview-start-view">
        <${PanelIntroductionSteps.PanelIntroductionSteps.PanelIntroductionSteps.litTagName}>
          <span slot="title">${i18nString(UIStrings.identifyCSSImprovements)}</span>
          <span slot="step-1">${i18nString(UIStrings.capturePageCSSOverview)}</span>
          <span slot="step-2">${i18nString(UIStrings.identifyCSSImprovementsWithExampleIssues)}</span>
          <span slot="step-3">${i18nString(UIStrings.locateAffectedElements)}</span>
        </${PanelIntroductionSteps.PanelIntroductionSteps.PanelIntroductionSteps.litTagName}>
        <div class="start-capture-wrapper">
          <${Buttons.Button.Button.litTagName}
            class="start-capture"
            .variant=${Buttons.Button.Variant.PRIMARY}
            .jslogContext=${'css-overview.capture-overview'}
            @click=${this.#onStartCaptureClick}>
            ${i18nString(UIStrings.captureOverview)}
          </${Buttons.Button.Button.litTagName}>
        </div>
        <${PanelFeedback.PanelFeedback.PanelFeedback.litTagName} .data=${{
            feedbackUrl: FEEDBACK_LINK,
            quickStartUrl: DOC_LINK,
            quickStartLinkText: i18nString(UIStrings.quickStartWithCSSOverview),
          } as PanelFeedback.PanelFeedback.PanelFeedbackData}>
        </${PanelFeedback.PanelFeedback.PanelFeedback.litTagName}>
        <${PanelFeedback.FeedbackButton.FeedbackButton.litTagName} .data=${{
          feedbackUrl: FEEDBACK_LINK,
          } as PanelFeedback.FeedbackButton.FeedbackButtonData}>
        </${PanelFeedback.FeedbackButton.FeedbackButton.litTagName}>
      </div>
    `, this.#shadow, {
      host: this,
    });
    // clang-format on

    const startButton = this.#shadow.querySelector<HTMLElement>('.start-capture');
    if (startButton) {
      startButton.focus();
    }
  }
}

customElements.define('devtools-css-overview-start-view', CSSOverviewStartView);

declare global {
  interface HTMLElementTagNameMap {
    'devtools-css-overview-start-view': CSSOverviewStartView;
  }
}
