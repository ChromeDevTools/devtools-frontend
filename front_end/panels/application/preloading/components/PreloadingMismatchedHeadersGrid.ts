// Copyright 2023 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import '../../../../ui/components/data_grid/data_grid.js';

import * as i18n from '../../../../core/i18n/i18n.js';
import {assertNotNullOrUndefined} from '../../../../core/platform/platform.js';
import type * as SDK from '../../../../core/sdk/sdk.js';
import type * as DataGrid from '../../../../ui/components/data_grid/data_grid.js';
import * as LegacyWrapper from '../../../../ui/components/legacy_wrapper/legacy_wrapper.js';
import type * as UI from '../../../../ui/legacy/legacy.js';
import * as LitHtml from '../../../../ui/lit-html/lit-html.js';

import preloadingGridStyles from './preloadingGrid.css.js';

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
};
const str_ = i18n.i18n.registerUIStrings(
    'panels/application/preloading/components/PreloadingMismatchedHeadersGrid.ts', UIStrings);
export const i18nString = i18n.i18n.getLocalizedString.bind(undefined, str_);

const {render, html} = LitHtml;

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
    if (this.#data === null) {
      return;
    }

    const reportsGridData: DataGrid.DataGridController.DataGridControllerData = {
      columns: [
        {
          id: 'header-name',
          title: i18nString(UIStrings.headerName),
          widthWeighting: 30,
          hideable: false,
          visible: true,
          sortable: true,
        },
        {
          id: 'initial-value',
          title: i18nString(UIStrings.initialNavigationValue),
          widthWeighting: 30,
          hideable: false,
          visible: true,
          sortable: true,
        },
        {
          id: 'activation-value',
          title: i18nString(UIStrings.activationNavigationValue),
          widthWeighting: 30,
          hideable: false,
          visible: true,
          sortable: true,
        },
      ],
      rows: this.#buildReportRows(),
      striped: true,
    };

    // Disabled until https://crbug.com/1079231 is fixed.
    // clang-format off
      render(html`
        <div class="preloading-container">
          <devtools-data-grid-controller .data=${reportsGridData}></devtools-data-grid-controller>
        </div>
      `, this.#shadow, {host: this});
    // clang-format on
  }

  #buildReportRows(): DataGrid.DataGridUtils.Row[] {
    assertNotNullOrUndefined(this.#data);
    assertNotNullOrUndefined(this.#data.mismatchedHeaders);

    return this.#data.mismatchedHeaders.map(
        mismatchedHeaders => ({
          cells: [
            {
              columnId: 'header-name',
              value: mismatchedHeaders.headerName,
            },
            {
              columnId: 'initial-value',
              value: mismatchedHeaders.initialValue ?? i18nString(UIStrings.missing),
            },
            {
              columnId: 'activation-value',
              value: mismatchedHeaders.activationValue ?? i18nString(UIStrings.missing),
            },
          ],
        }));
  }
}

customElements.define('devtools-resources-preloading-mismatched-headers-grid', PreloadingMismatchedHeadersGrid);

declare global {
  interface HTMLElementTagNameMap {
    'devtools-resources-preloading-mismatched-headers-grid': PreloadingMismatchedHeadersGrid;
  }
}
