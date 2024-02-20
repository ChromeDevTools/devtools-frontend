// Copyright 2021 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as i18n from '../../../core/i18n/i18n.js';
import type * as Protocol from '../../../generated/protocol.js';
import * as DataGrid from '../../../ui/components/data_grid/data_grid.js';
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
  static readonly litTagName = LitHtml.literal`devtools-resources-endpoints-grid`;

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
    const endpointsGridData: DataGrid.DataGridController.DataGridControllerData = {
      columns: [
        {
          id: 'origin',
          title: i18n.i18n.lockedString('Origin'),
          widthWeighting: 30,
          hideable: false,
          visible: true,
        },
        {
          id: 'name',
          title: i18n.i18n.lockedString('Name'),
          widthWeighting: 20,
          hideable: false,
          visible: true,
        },
        {
          id: 'url',
          title: i18n.i18n.lockedString('URL'),
          widthWeighting: 30,
          hideable: false,
          visible: true,
        },
      ],
      rows: this.#buildReportRows(),
    };

    // Disabled until https://crbug.com/1079231 is fixed.
    // clang-format off
    render(html`
      <div class="reporting-container" jslog=${VisualLogging.section('endpoints')}>
        <div class="reporting-header">${i18n.i18n.lockedString('Endpoints')}</div>
        ${this.#endpoints.size > 0 ? html`
          <${DataGrid.DataGridController.DataGridController.litTagName} .data=${
              endpointsGridData as DataGrid.DataGridController.DataGridControllerData}>
          </${DataGrid.DataGridController.DataGridController.litTagName}>
        ` : html`
          <div class="reporting-placeholder">
            <div>${i18nString(UIStrings.noEndpointsToDisplay)}</div>
          </div>
        `}
      </div>
    `, this.#shadow, {host: this});
    // clang-format on
  }

  #buildReportRows(): DataGrid.DataGridUtils.Row[] {
    return Array.from(this.#endpoints)
        .map(([origin, endpointArray]) => endpointArray.map(endpoint => {
          return {
            cells: [
              {columnId: 'origin', value: origin},
              {columnId: 'name', value: endpoint.groupName},
              {columnId: 'url', value: endpoint.url},
            ],
          };
        }))
        .flat();
  }
}

customElements.define('devtools-resources-endpoints-grid', EndpointsGrid);

declare global {
  interface HTMLElementTagNameMap {
    'devtools-resources-endpoints-grid': EndpointsGrid;
  }
}
