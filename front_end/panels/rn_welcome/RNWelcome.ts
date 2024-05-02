// Copyright (c) Meta Platforms, Inc. and affiliates.
// Copyright 2024 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as UI from '../../ui/legacy/legacy.js';
import * as i18n from '../../core/i18n/i18n.js';

import rnWelcomeStyles from './rnWelcome.css.js';
import * as LitHtml from '../../ui/lit-html/lit-html.js';
import type * as Platform from '../../core/platform/platform.js';

const UIStrings = {
  /** @description Label / description */
  techPreviewLabel: 'Technology Preview',
  /** @description Welcome text */
  welcomeMessage: 'Welcome to debugging in React Native',
  /** @description "Debugging docs" link */
  docsLabel: 'Debugging docs',
  /** @description "What's new" link */
  whatsNewLabel: "What's new",
};
const {render, html} = LitHtml;

const str_ = i18n.i18n.registerUIStrings('panels/rn_welcome/RNWelcome.ts', UIStrings);
const i18nString = i18n.i18n.getLocalizedString.bind(undefined, str_);

let rnWelcomeImplInstance: RNWelcomeImpl;

type RNWelcomeOptions = {debuggerBrandName: () => Platform.UIString.LocalizedString};
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

  render(): void {
    const {debuggerBrandName} = this.options;
    const welcomeIconUrl = new URL(
      '../../Images/react_native/welcomeIcon.png',
      import.meta.url,
    ).toString();

    render(html`
      <div class="rn-welcome-panel">
        <div class="rn-welcome-header">
          <img class="rn-welcome-icon" src=${welcomeIconUrl} role="presentation" />
          <div class="rn-welcome-title">
            ${debuggerBrandName()}
          </div>
          <div class="rn-welcome-title-accessory">
            ${i18nString(UIStrings.techPreviewLabel)}
          </div>
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
      </div>
    `, this.contentElement, {host: this});
  }
}
