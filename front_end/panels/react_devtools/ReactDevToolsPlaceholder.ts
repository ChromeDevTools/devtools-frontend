// Copyright (c) Meta Platforms, Inc. and affiliates.
// Copyright 2024 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as i18n from '../../core/i18n/i18n.js';
import * as UI from '../../ui/legacy/legacy.js';
import * as LitHtml from '../../ui/lit-html/lit-html.js';

import ReactDevToolsPlaceholderStyles from './reactDevToolsPlaceholder.css.js';

const UIStrings = {
  /** @description Placeholder message */
  placeholderMessage: '[FB-only] React DevTools is coming soon! ⚡',
};
const {render, html} = LitHtml;

const str_ = i18n.i18n.registerUIStrings('panels/react_devtools/ReactDevToolsPlaceholder.ts', UIStrings);
const i18nString = i18n.i18n.getLocalizedString.bind(undefined, str_);

let instance: ReactDevToolsPlaceholderImpl;

export class ReactDevToolsPlaceholderImpl extends UI.Widget.VBox {
  static instance(opts: {forceNew: null|boolean} = {forceNew: null}): ReactDevToolsPlaceholderImpl {
    const {forceNew} = opts;
    if (!instance || forceNew) {
      instance = new ReactDevToolsPlaceholderImpl();
    }
    return instance;
  }

  private constructor() {
    super(true, true);
  }

  override wasShown(): void {
    super.wasShown();
    this.registerCSSFiles([ReactDevToolsPlaceholderStyles]);
    this.render();
    UI.InspectorView.InspectorView.instance().setDrawerMinimized(true);
  }

  override willHide(): void {
    UI.InspectorView.InspectorView.instance().setDrawerMinimized(false);
  }

  render(): void {
    render(
        html`
        <div class="rn-devtools-placeholder-panel">
          <div class="rn-devtoools-placeholder-main">
            <div class="rn-devtoools-placeholder-title">
              ${i18nString(UIStrings.placeholderMessage)}
            </div>
            <div class="rn-devtools-placeholder-detail">
              Soon, you will be able to use React DevTools within this panel and
              inspect multiple apps at once. In the meantime, you can connect to
              your app using the standalone React DevTools.
            </div>
            <div class="rn-devtools-placeholder-detail">
              <code class="rn-devtools-placeholder-code">js1 devtools</code>
              or
              <code class="rn-devtools-placeholder-code"
                >npx react-devtools</code
              >
            </div>
          </div>
        </div>
      `,
        this.contentElement, {host: this});
  }
}
