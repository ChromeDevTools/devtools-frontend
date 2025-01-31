// Copyright 2021 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import '../../../ui/legacy/components/data_grid/data_grid.js';
import '../../../ui/components/icon_button/icon_button.js';
import '../../../ui/legacy/legacy.js';

import * as i18n from '../../../core/i18n/i18n.js';
import * as Root from '../../../core/root/root.js';
import type * as Protocol from '../../../generated/protocol.js';
import * as Lit from '../../../ui/lit/lit.js';
import * as VisualLogging from '../../../ui/visual_logging/visual_logging.js';

import reportingApiGridStylesRaw from './reportingApiGrid.css.js';

// TODO(crbug.com/391381439): Fully migrate off of constructed style sheets.
const reportingApiGridStyles = new CSSStyleSheet();
reportingApiGridStyles.replaceSync(reportingApiGridStylesRaw.cssContent);

const UIStrings = {
  /**
   *@description Placeholder text when there are no Reporting API reports.
   *(https://developers.google.com/web/updates/2018/09/reportingapi#sending)
   */
  noReportsToDisplay: 'No reports to display',
  /**
   *@description Column header for a table displaying Reporting API reports.
   *Status is one of 'Queued', 'Pending', 'MarkedForRemoval' or 'Success'.
   */
  status: 'Status',
  /**
   *@description Column header for a table displaying Reporting API reports.
   *Destination is the name of the endpoint the report is being sent to.
   */
  destination: 'Destination',
  /**
   *@description Column header for a table displaying Reporting API reports.
   *The column contains the timestamp of when a report was generated.
   */
  generatedAt: 'Generated at',
};
const str_ = i18n.i18n.registerUIStrings('panels/application/components/ReportsGrid.ts', UIStrings);
export const i18nString = i18n.i18n.getLocalizedString.bind(undefined, str_);

const {render, html} = Lit;

export class ReportsGridStatusHeader extends HTMLElement {
  readonly #shadow = this.attachShadow({mode: 'open'});

  connectedCallback(): void {
    this.#shadow.adoptedStyleSheets = [reportingApiGridStyles];
    this.#render();
  }

  #render(): void {
    // Disabled until https://crbug.com/1079231 is fixed.
    // clang-format off
    render(html`
      ${i18nString(UIStrings.status)}
      <x-link href="https://web.dev/reporting-api/#report-status"
      jslog=${VisualLogging.link('report-status').track({click: true})}>
        <devtools-icon class="inline-icon" .data=${{
          iconName: 'help',
          color: 'var(--icon-link)',
          width: '16px',
          height: '16px',
          }}></devtools-icon>
      </x-link>
    `, this.#shadow, {host: this});
    // clang-format on
  }
}

export interface ReportsGridData {
  reports: Protocol.Network.ReportingApiReport[];
}

export class ReportsGrid extends HTMLElement {
  readonly #shadow = this.attachShadow({mode: 'open'});
  #reports: Protocol.Network.ReportingApiReport[] = [];
  #protocolMonitorExperimentEnabled = false;

  connectedCallback(): void {
    this.#shadow.adoptedStyleSheets = [reportingApiGridStyles];
    this.#protocolMonitorExperimentEnabled = Root.Runtime.experiments.isEnabled('protocol-monitor');
    this.#render();
  }

  set data(data: ReportsGridData) {
    this.#reports = data.reports;
    this.#render();
  }

  #render(): void {
    // Disabled until https://crbug.com/1079231 is fixed.
    // clang-format off
    render(html`
      <div class="reporting-container" jslog=${VisualLogging.section('reports')}>
        <div class="reporting-header">${i18n.i18n.lockedString('Reports')}</div>
        ${this.#reports.length > 0 ? html`
          <devtools-data-grid striped @select=${this.#onSelect}>
            <table>
              <tr>
                ${this.#protocolMonitorExperimentEnabled ? html`
                  <th id="id" weight="30">${i18n.i18n.lockedString('ID')}</th>
                ` : ''}
                <th id="url" weight="30">${i18n.i18n.lockedString('URL')}</th>
                <th id="type" weight="20">${i18n.i18n.lockedString('Type')}</th>
                <th id="status" weight="20">
                    <devtools-resources-reports-grid-status-header></devtools-resources-reports-grid-status-header>
                </th>
                <th id="destination" weight="20">${i18nString(UIStrings.destination)}</th>
                <th id="timestamp" weight="20">${i18nString(UIStrings.generatedAt)}</th>
                <th id="body" weight="20">${i18n.i18n.lockedString('Body')}</th>
              </tr>
              ${this.#reports.map(report => html`
                <tr data-id=${report.id}>
                  ${this.#protocolMonitorExperimentEnabled ? html`<td>${report.id}</td>` : ''}
                  <td>${report.initiatorUrl}</td>
                  <td>${report.type}</td>
                  <td>${report.status}</td>
                  <td>${report.destination}</td>
                  <td>${new Date(report.timestamp * 1000).toLocaleString()}</td>
                  <td>${JSON.stringify(report.body)}</td>
                </tr>
              `)}
            </table>
          </devtools-data-grid>
        ` : html`
          <div class="reporting-placeholder">
            <div>${i18nString(UIStrings.noReportsToDisplay)}</div>
          </div>
        `}
      </div>
    `, this.#shadow, {host: this});
    // clang-format on
  }

  #onSelect(e: CustomEvent<HTMLElement|null>): void {
    if (e.detail) {
      this.dispatchEvent(new CustomEvent('select', {detail: e.detail.dataset.id}));
    }
  }
}

customElements.define('devtools-resources-reports-grid-status-header', ReportsGridStatusHeader);
customElements.define('devtools-resources-reports-grid', ReportsGrid);

declare global {
  interface HTMLElementTagNameMap {
    'devtools-resources-reports-grid-status-header': ReportsGridStatusHeader;
    'devtools-resources-reports-grid': ReportsGrid;
  }
}
