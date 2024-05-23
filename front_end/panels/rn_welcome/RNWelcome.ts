// Copyright (c) Meta Platforms, Inc. and affiliates.
// Copyright 2024 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as UI from '../../ui/legacy/legacy.js';
import * as Host from '../../core/host/host.js';
import * as i18n from '../../core/i18n/i18n.js';

import rnWelcomeStyles from './rnWelcome.css.js';
import * as LitHtml from '../../ui/lit-html/lit-html.js';
import type * as Platform from '../../core/platform/platform.js';

const UIStrings = {
  /** @description Label / description */
  techPreviewLabel: 'Beta',
  /** @description Welcome text */
  welcomeMessage: 'Welcome to debugging in React Native',
  /** @description "Debugging docs" link */
  docsLabel: 'Debugging docs',
  /** @description "What's new" link */
  whatsNewLabel: "What's new",
  /** @description "Debugging Basics" title (docs item 1) */
  docsDebuggingBasics: 'Debugging Basics',
  /** @description "Debugging Basics" item detail */
  docsDebuggingBasicsDetail: 'Overview of debugging tools in React Native',
  /** @description "React DevTools" title (docs item 2 - pre-launch) */
  docsReactDevTools: 'React DevTools',
  /** @description "React DevTools" item detail */
  docsReactDevToolsDetail: 'Debug React components with React DevTools',
  /** @description "React Native DevTools" title (docs item 2 - post launch) */
  docsRNDevTools: 'React Native DevTools',
  /** @description "React Native DevTools" item detail */
  docsRNDevToolsDetail: 'Explore features available in React Native DevTools',
};
const {render, html} = LitHtml;

const str_ = i18n.i18n.registerUIStrings('panels/rn_welcome/RNWelcome.ts', UIStrings);
const i18nString = i18n.i18n.getLocalizedString.bind(undefined, str_);

let rnWelcomeImplInstance: RNWelcomeImpl;

type RNWelcomeOptions = {
  debuggerBrandName: () => Platform.UIString.LocalizedString,
  showBetaLabel?: boolean
};

export class RNWelcomeImpl extends UI.Widget.VBox {
  private readonly options: RNWelcomeOptions;

  static instance(options: RNWelcomeOptions): RNWelcomeImpl {
    if (!rnWelcomeImplInstance) {
      rnWelcomeImplInstance = new RNWelcomeImpl(options);
    }
    return rnWelcomeImplInstance;
  }

  private constructor(options: RNWelcomeOptions) {
    super(true, true);

    this.options = options;
  }

  override wasShown(): void {
    super.wasShown();
    this.registerCSSFiles([rnWelcomeStyles]);
    this.render();
    UI.InspectorView.InspectorView.instance().showDrawer({focus: true, hasTargetDrawer: false});
  }

  private _handleLinkPress(url: string): void {
    Host.InspectorFrontendHost.InspectorFrontendHostInstance.openInNewTab(
      url as Platform.DevToolsPath.UrlString,
    );
  }

  render(): void {
    const {debuggerBrandName, showBetaLabel = false} = this.options;
    const welcomeIconUrl = new URL(
      '../../Images/react_native/welcomeIcon.png',
      import.meta.url,
    ).toString();

    render(html`
      <div class="rn-welcome-panel">
        <header class="rn-welcome-hero">
          <div class="rn-welcome-heading">
            <img class="rn-welcome-icon" src="${welcomeIconUrl}" role="presentation" />
            <h1 class="rn-welcome-title">
              ${debuggerBrandName()}
            </h1>
            ${showBetaLabel ? html`
              <div class="rn-welcome-title-accessory">
                ${i18nString(UIStrings.techPreviewLabel)}
              </div>
            ` : null}
          </div>
          <div class="rn-welcome-tagline">
            ${i18nString(UIStrings.welcomeMessage)}
          </div>
          <div class="rn-welcome-links">
            <x-link class="devtools-link" href="https://reactnative.dev/docs/debugging">
              ${i18nString(UIStrings.docsLabel)}
            </x-link>
            <x-link class="devtools-link" href="https://reactnative.dev/blog">
              ${i18nString(UIStrings.whatsNewLabel)}
            </x-link>
          </div>
        </header>
        <section class="rn-welcome-docsfeed">
          <h2 class="rn-welcome-h2">Learn</h2>
          <button class="rn-welcome-docsfeed-item" type="button" role="link" @click=${this._handleLinkPress.bind(this, 'https:\/\/reactnative.dev/docs/debugging')} title="${i18nString(UIStrings.docsDebuggingBasics)}">
            <div class="rn-welcome-image" style="background-image: url('https://reactnative.dev/assets/images/debugging-dev-menu-2453a57e031a9da86b2ed42f16ffe82a.jpg')"></div>
            <div>
              <p class="devtools-link">${i18nString(UIStrings.docsDebuggingBasics)}</p>
              <p>${i18nString(UIStrings.docsDebuggingBasicsDetail)}</p>
            </div>
          </button>
          <button class="rn-welcome-docsfeed-item" type="button" role="link" @click=${this._handleLinkPress.bind(this, 'https:\/\/reactnative.dev/docs/debugging/react-devtools')} title="${i18nString(UIStrings.docsReactDevTools)}">
            <div class="rn-welcome-image" style="background-image: url('https://reactnative.dev/assets/images/debugging-react-devtools-detail-914f08a97163dd51ebe732fd8ae4ea3c.jpg')"></div>
            <div>
              <p class="devtools-link">${i18nString(UIStrings.docsReactDevTools)}</p>
              <p>${i18nString(UIStrings.docsReactDevToolsDetail)}</p>
            </div>
          </button>
          <!-- TODO(huntie): Re-enable this item when docs are complete, replacing React DevTools guide -->
          <!-- <button class="rn-welcome-docsfeed-item" type="button" role="link" @click=${this._handleLinkPress.bind(this, 'https:\/\/reactnative.dev/docs/debugging')} title="${i18nString(UIStrings.docsRNDevTools)}">
            <div class="rn-welcome-image" style="background-image: url('https://reactnative.dev/assets/images/debugging-react-devtools-detail-914f08a97163dd51ebe732fd8ae4ea3c.jpg')"></div>
            <div>
              <p class="devtools-link">${i18nString(UIStrings.docsRNDevTools)}</p>
              <p>${i18nString(UIStrings.docsRNDevToolsDetail)}</p>
            </div>
          </button> -->
        </section>
      </div>
    `, this.contentElement, {host: this});
  }
}
