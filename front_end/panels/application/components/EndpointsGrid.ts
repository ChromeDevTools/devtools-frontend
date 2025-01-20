// Copyright 2021 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import '../../../ui/legacy/components/data_grid/data_grid.js';

import * as i18n from '../../../core/i18n/i18n.js';
import type * as Protocol from '../../../generated/protocol.js';
import * as LitHtml from '../../../ui/lit-html/lit-html.js';
import * as VisualLogging from '../../../ui/visual_logging/visual_logging.js';

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

export interface EndpointsGridData {
  endpoints: Map<string, Protocol.Network.ReportingApiEndpoint[]>;
}

export class EndpointsGrid extends HTMLElement {

  readonly #shadow = this.attachShadow({mode: 'open'});
  #endpoints: Map<string, Protocol.Network.ReportingApiEndpoint[]> = new Map();

  connectedCallback(): void {
    this.#shadow.adoptedStyleSheets = [reportingApiGridStyles];
    this.#render();
  }

  set data(data: EndpointsGridData) {
    this.#endpoints = data.endpoints;
    this.#render();
  }

  #render(): void {
    // Disabled until https://crbug.com/1079231 is fixed.
    // clang-format off
    render(html`
      <div class="reporting-container" jslog=${VisualLogging.section('endpoints')}>
        <div class="reporting-header">${i18n.i18n.lockedString('Endpoints')}</div>
        ${this.#endpoints.size > 0 ? html`
          <devtools-new-data-grid striped>
           <table>
            <tr>
              <th id="origin" weight="30">${i18n.i18n.lockedString('Origin')}</th>
              <th id="name" weight="20">${i18n.i18n.lockedString('Name')}</th>
              <th id="url" weight="30">${i18n.i18n.lockedString('URL')}</th>
            </tr>
            ${Array.from(this.#endpoints).map(([origin, endpointArray]) =>
                endpointArray.map(endpoint => html`<tr>
                  <td>${origin}</td>
                  <td>${endpoint.groupName}</td>
                  <td>${endpoint.url}</td>
                </tr>`))
                .flat()}
            </table>
          </devtools-new-data-grid>
        ` : html`
          <div class="reporting-placeholder">
            <div>${i18nString(UIStrings.noEndpointsToDisplay)}</div>
          </div>
        `}
      </div>
    `, this.#shadow, {host: this});
    // clang-format on
  }
}

customElements.define('devtools-resources-endpoints-grid', EndpointsGrid);

declare global {
  interface HTMLElementTagNameMap {
    'devtools-resources-endpoints-grid': EndpointsGrid;
  }
}
