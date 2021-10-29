// Copyright 2019 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as i18n from '../../../core/i18n/i18n.js';
import * as Buttons from '../../../ui/components/buttons/buttons.js';
import * as ComponentHelpers from '../../../ui/components/helpers/helpers.js';
import * as IconButton from '../../../ui/components/icon_button/icon_button.js';
import * as LitHtml from '../../../ui/lit-html/lit-html.js';

import cssOverviewStartViewStyles from './cssOverviewStartView.css.js';

const UIStrings = {
  /**
  *@description Label for the capture button in the CSS Overview Panel
  */
  captureOverview: 'Capture overview',
  /**
  *@description Header for the summary of CSS Overview
  */
  identifyCSSImprovements: 'Identify potential CSS improvements',
  /**
  *@description First point of the summarized features of CSS Overview
  */
  capturePageCSSOverview: 'Capture an overview of your page’s CSS',
  /**
  *@description Second point of the summarized features of CSS Overview
  */
  identifyCSSImprovementsWithExampleIssues:
      'Identify potential CSS improvements (e.g. low contrast issues, unused declarations, color or font mismatches)',
  /**
  *@description Third point of the summarized features of CSS Overview
  */
  locateAffectedElements: 'Locate the affected elements in the Elements panel',
  /**
  *@description Title of the "Preview feature" reminder box
  */
  previewFeature: 'Preview feature',
  /**
  *@description Sentence to convey the feature is being actively worked on and we are looking for feedback
  *@example {https://goo.gle/css-overview-feedback} PH1
  */
  activelyWorkingAndLookingForS: 'Our team is actively working on this feature and we are looking for your {PH1}!',
  /**
  *@description Link text of the inline anchor to navigate to a feedback page
  */
  feedbackInline: 'feedback',
  /**
  *@description Title of the section to the quick start video and documentation to CSS Overview panel
  */
  videoAndDocumentation: 'Video and documentation',
  /**
  *@description Title of the link to the quick start video and documentation to CSS Overview panel
  */
  quickStartWithCSSOverview: 'Quick start: get started with the new CSS Overview panel',
  /**
  *@description Link text of the standalone button to navigate to a feedback page
  */
  feedbackStandalone: 'Feedback',
};
const str_ = i18n.i18n.registerUIStrings('panels/css_overview/components/CSSOverviewStartView.ts', UIStrings);
const i18nString = i18n.i18n.getLocalizedString.bind(undefined, str_);

const {render, html} = LitHtml;

const FEEDBACK_LINK = 'https://goo.gle/css-overview-feedback';
const DOC_LINK = 'https://developer.chrome.com/docs/devtools/css-overview';
export class OverviewStartRequestedEvent extends Event {
  static readonly eventName = 'overviewstartrequested';

  constructor() {
    super(OverviewStartRequestedEvent.eventName);
  }
}

export class CSSOverviewStartView extends HTMLElement {
  static readonly litTagName = LitHtml.literal`devtools-css-overview-start-view`;
  readonly #shadow = this.attachShadow({mode: 'open'});
  #feedbackLink: HTMLAnchorElement;

  constructor() {
    super();
    this.#feedbackLink = document.createElement('a');
    this.#feedbackLink.href = FEEDBACK_LINK;
    this.#feedbackLink.target = '_blank';
    this.#feedbackLink.innerText = i18nString(UIStrings.feedbackInline);
  }

  connectedCallback(): void {
    this.#shadow.adoptedStyleSheets = [cssOverviewStartViewStyles];
    this.render();
  }

  show(): void {
    this.classList.remove('hidden');
  }

  hide(): void {
    this.classList.add('hidden');
  }

  private onStartCaptureClick(): void {
    this.dispatchEvent(new OverviewStartRequestedEvent());
  }

  private render(): void {
    // Disabled until https://crbug.com/1079231 is fixed.
    // clang-format off
    // eslint-disable-next-line rulesdir/ban_a_tags_in_lit_html
    render(html`
      <div class="css-overview-start-view">
        <h1 class="summary-header">${i18nString(UIStrings.identifyCSSImprovements)}</h1>
        <ol class="summary-list">
          <li>${i18nString(UIStrings.capturePageCSSOverview)}</li>
          <li>${i18nString(UIStrings.identifyCSSImprovementsWithExampleIssues)}</li>
          <li>${i18nString(UIStrings.locateAffectedElements)}</li>
        </ol>
        <div class="start-capture-wrapper">
          <${Buttons.Button.Button.litTagName}
            class="start-capture"
            .variant=${Buttons.Button.Variant.PRIMARY}
            @click=${this.onStartCaptureClick}>
            ${i18nString(UIStrings.captureOverview)}
          </${Buttons.Button.Button.litTagName}>
        </div>
        <section class="preview-feature">
          <h1 class="preview-header">
            <${IconButton.Icon.Icon.litTagName} class="preview-icon" .data=${{
                iconName: 'ic_preview_feature',
                width: '24px',
                height: '24px',
                color: 'var(--color-primary)',
              } as IconButton.Icon.IconData}></${IconButton.Icon.Icon.litTagName}>
              ${i18nString(UIStrings.previewFeature)}
          </h1>
          <div class="feedback-prompt">${i18n.i18n.getFormatLocalizedString(str_, UIStrings.activelyWorkingAndLookingForS, {PH1: this.#feedbackLink})}</div>
          <div class="resources">
            <div class="thumbnail-wrapper">
              <${IconButton.Icon.Icon.litTagName} .data=${{
                iconName: 'preview_feature_video_thumbnail',
                width: '144px',
                height: '92px',
              } as IconButton.Icon.IconData}></${IconButton.Icon.Icon.litTagName}>
            </div>
            <div>
              <h1 class="video-doc-header">${i18nString(UIStrings.videoAndDocumentation)}</h1>
              <a href=${DOC_LINK} target="_blank">${i18nString(UIStrings.quickStartWithCSSOverview)}</a>
            </div>
          </div>
        </section>
        <a class="feedback-standalone" href=${FEEDBACK_LINK} target="_blank">${i18nString(UIStrings.feedbackStandalone)}</a>
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

ComponentHelpers.CustomElements.defineComponent('devtools-css-overview-start-view', CSSOverviewStartView);

declare global {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  interface HTMLElementTagNameMap {
    'devtools-css-overview-start-view': CSSOverviewStartView;
  }
}
