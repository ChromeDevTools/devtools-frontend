// Copyright 2021 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import '../../../ui/legacy/components/data_grid/data_grid.js';

import * as i18n from '../../../core/i18n/i18n.js';
import type * as Protocol from '../../../generated/protocol.js';
// inspectorCommonStyles is imported for the empty state styling that is used for the start view
// eslint-disable-next-line rulesdir/es-modules-import
import inspectorCommonStylesRaw from '../../../ui/legacy/inspectorCommon.css.js';
import * as Lit from '../../../ui/lit/lit.js';
import * as VisualLogging from '../../../ui/visual_logging/visual_logging.js';

import reportingApiGridStylesRaw from './reportingApiGrid.css.js';

// TODO(crbug.com/391381439): Fully migrate off of constructed style sheets.
const reportingApiGridStyles = new CSSStyleSheet();
reportingApiGridStyles.replaceSync(reportingApiGridStylesRaw.cssContent);

// TODO(crbug.com/391381439): Fully migrate off of constructed style sheets.
const inspectorCommonStyles = new CSSStyleSheet();
inspectorCommonStyles.replaceSync(inspectorCommonStylesRaw.cssContent);

const UIStrings = {
  /**
   *@description Placeholder text when there are no Reporting API endpoints.
   *(https://developers.google.com/web/updates/2018/09/reportingapi#tldr)
   */
  noEndpointsToDisplay: 'No endpoints to display',
  /**
   *@description Placeholder text when there are no Reporting API endpoints.
   *(https://developers.google.com/web/updates/2018/09/reportingapi#tldr)
   */
  endpointsDescription: 'Here you will find the list of endpoints that receive the reports'
} as const;
const str_ = i18n.i18n.registerUIStrings('panels/application/components/EndpointsGrid.ts', UIStrings);
export const i18nString = i18n.i18n.getLocalizedString.bind(undefined, str_);

const {render, html} = Lit;

export interface EndpointsGridData {
  endpoints: Map<string, Protocol.Network.ReportingApiEndpoint[]>;
}

export class EndpointsGrid extends HTMLElement {

  readonly #shadow = this.attachShadow({mode: 'open'});
  #endpoints = new Map<string, Protocol.Network.ReportingApiEndpoint[]>();

  connectedCallback(): void {
    this.#shadow.adoptedStyleSheets = [reportingApiGridStyles, inspectorCommonStyles];
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
          <devtools-data-grid striped>
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
          </devtools-data-grid>
        ` : html`
          <div class="empty-state">
            <span class="empty-state-header">${i18nString(UIStrings.noEndpointsToDisplay)}</span>
            <span class="empty-state-description">${i18nString(UIStrings.endpointsDescription)}</span>
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
