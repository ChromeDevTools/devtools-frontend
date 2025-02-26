// Copyright 2023 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import '../../../../ui/legacy/components/data_grid/data_grid.js';

import * as i18n from '../../../../core/i18n/i18n.js';
import type * as SDK from '../../../../core/sdk/sdk.js';
import * as LegacyWrapper from '../../../../ui/components/legacy_wrapper/legacy_wrapper.js';
import type * as UI from '../../../../ui/legacy/legacy.js';
import * as Lit from '../../../../ui/lit/lit.js';

import preloadingGridStylesRaw from './preloadingGrid.css.js';

// TODO(crbug.com/391381439): Fully migrate off of constructed style sheets.
const preloadingGridStyles = new CSSStyleSheet();
preloadingGridStyles.replaceSync(preloadingGridStylesRaw.cssContent);

const UIStrings = {
  /**
   *@description The name of the HTTP request header.
   */
  headerName: 'Header name',
  /**
   *@description The value of the HTTP request header in initial navigation.
   */
  initialNavigationValue: 'Value in initial navigation',
  /**
   *@description The value of the HTTP request header in activation navigation.
   */
  activationNavigationValue: 'Value in activation navigation',
  /**
   *@description The string to indicate the value of the header is missing.
   */
  missing: '(missing)',
} as const;
const str_ = i18n.i18n.registerUIStrings(
    'panels/application/preloading/components/PreloadingMismatchedHeadersGrid.ts', UIStrings);
export const i18nString = i18n.i18n.getLocalizedString.bind(undefined, str_);

const {render, html} = Lit;

export class PreloadingMismatchedHeadersGrid extends LegacyWrapper.LegacyWrapper.WrappableComponent<UI.Widget.VBox> {
  readonly #shadow = this.attachShadow({mode: 'open'});
  #data: SDK.PreloadingModel.PrerenderAttempt|null = null;
  connectedCallback(): void {
    this.#shadow.adoptedStyleSheets = [preloadingGridStyles];
    this.#render();
  }

  set data(data: SDK.PreloadingModel.PrerenderAttempt) {
    if (data.mismatchedHeaders === null) {
      return;
    }
    this.#data = data;
    this.#render();
  }

  #render(): void {
    if (!this.#data?.mismatchedHeaders) {
      return;
    }

    // Disabled until https://crbug.com/1079231 is fixed.
    // clang-format off
      render(html`
        <div class="preloading-container">
          <devtools-data-grid striped inline>
            <table>
              <tr>
                <th id="header-name" weight="30" sortable>
                  ${i18nString(UIStrings.headerName)}
                </th>
                <th id="initial-value" weight="30" sortable>
                  ${i18nString(UIStrings.initialNavigationValue)}
                </th>
                <th id="activation-value" weight="30" sortable>
                  ${i18nString(UIStrings.activationNavigationValue)}
                </th>
              </tr>
              ${this.#data.mismatchedHeaders.map(mismatchedHeaders => html`
                <tr>
                  <td>${mismatchedHeaders.headerName}</td>
                  <td>${mismatchedHeaders.initialValue ?? i18nString(UIStrings.missing)}</td>
                  <td>${mismatchedHeaders.activationValue ?? i18nString(UIStrings.missing)}</td>
                </tr>
              `)}
            </table>
          </devtools-data-grid>
        </div>
      `, this.#shadow, {host: this});
    // clang-format on
  }
}

customElements.define('devtools-resources-preloading-mismatched-headers-grid', PreloadingMismatchedHeadersGrid);

declare global {
  interface HTMLElementTagNameMap {
    'devtools-resources-preloading-mismatched-headers-grid': PreloadingMismatchedHeadersGrid;
  }
}
