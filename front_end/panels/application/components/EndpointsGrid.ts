// Copyright 2021 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as i18n from '../../../core/i18n/i18n.js';
import * as ComponentHelpers from '../../../ui/components/helpers/helpers.js';
import * as LitHtml from '../../../ui/lit-html/lit-html.js';

import reportingApiGridStyles from './reportingApiGrid.css.js';

const UIStrings = {
  /**
  *@description Placeholder text when there are no Reporting API endpoints.
  *(https://developers.google.com/web/updates/2018/09/reportingapi#tldr)
  */
  noEndpointsToDisplay: 'No endpoints to display',
};
const str_ = i18n.i18n.registerUIStrings('panels/application/components/EndpointsGrid.ts', UIStrings);
export const i18nString = i18n.i18n.getLocalizedString.bind(undefined, str_);

const {render, html} = LitHtml;

export class EndpointsGrid extends HTMLElement {
  static readonly litTagName = LitHtml.literal`devtools-resources-endpoints-grid`;

  private readonly shadow = this.attachShadow({mode: 'open'});

  connectedCallback(): void {
    this.shadow.adoptedStyleSheets = [reportingApiGridStyles];
    this.render();
  }

  // TODO(crbug.com/1200732): Display info about currently configured endpoints
  private render(): void {
    // Disabled until https://crbug.com/1079231 is fixed.
    // clang-format off
    render(html`
      <div class="reporting-container">
        <div class="reporting-header">${i18n.i18n.lockedString('Endpoints')}</div>
        <div class="reporting-placeholder">
          <div>${i18nString(UIStrings.noEndpointsToDisplay)}</div>
        </div>
      </div>
    `, this.shadow);
    // clang-format on
  }
}

ComponentHelpers.CustomElements.defineComponent('devtools-resources-endpoints-grid', EndpointsGrid);

declare global {
  interface HTMLElementTagNameMap {
    'devtools-resources-endpoints-grid': EndpointsGrid;
  }
}
