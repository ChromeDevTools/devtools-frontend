// Copyright 2020 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import '../ui/components/components.js';

import type * as Components from '../ui/components/components.js';

import * as LitHtml from '../third_party/lit-html/lit-html.js';
import * as Platform from '../platform/platform.js';
import * as UI from '../ui/ui.js';

const ls = Platform.UIString.ls;

export class RequestTrustTokensView extends UI.Widget.VBox {
  private readonly reportView = new RequestTrustTokensReport();

  constructor(params: Protocol.Network.TrustTokenParams) {
    super();

    this.reportView.data = params;
    this.contentElement.appendChild(this.reportView);
  }
}

export class RequestTrustTokensReport extends HTMLElement {
  private readonly shadow = this.attachShadow({mode: 'open'});
  private params?: Readonly<Protocol.Network.TrustTokenParams>;

  set data(data: Protocol.Network.TrustTokenParams) {
    this.params = data;
    this.render();
  }

  private render() {
    if (!this.params) {
      throw new Error('Trying to render a Trust Token report without providing data');
    }

    // Disabled until https://crbug.com/1079231 is fixed.
    // clang-format off
    LitHtml.render(LitHtml.html`
      <style>
        .code {
          font-family: var(--monospace-font-family);
          font-size: var(--monospace-font-size);
        }

        .issuers-list {
          display: flex;
          flex-direction: column;
          list-style-type: none;
          padding: 0;
          margin: 0;
        }
      </style>
      <devtools-report>
        <devtools-report-section .data=${{sectionTitle: ls`Parameters`} as Components.ReportView.ReportSectionData}>
          ${renderRowWithCodeValue(ls`Type`, this.params.type.toString())}
          ${this.renderRefreshPolicy()}
          ${this.renderIssuers()}
        </devtools-report-section>
      </devtools-report>
    `, this.shadow);
    // clang-format on
  }

  private renderRefreshPolicy() {
    if (!this.params || this.params.type !== Protocol.Network.TrustTokenOperationType.Redemption) {
      return LitHtml.nothing;
    }
    return renderRowWithCodeValue(ls`Refresh policy`, this.params.refreshPolicy.toString());
  }

  private renderIssuers() {
    if (!this.params || !this.params.issuers || this.params.issuers.length === 0) {
      return LitHtml.nothing;
    }

    // Disabled until https://crbug.com/1079231 is fixed.
    // clang-format off
    return LitHtml.html`
      <devtools-report-row>
        <span slot="name">${ls`Issuers`}</span>
        <ul slot="value" class="issuers-list">
          ${this.params.issuers.map(issuer => LitHtml.html`<li>${issuer}</li>`)}
        </ul>
      </devtools-report-row>
    `;
  }
}

function renderRowWithCodeValue(name: string, value: string) {
  // Disabled until https://crbug.com/1079231 is fixed.
  // clang-format off
  return LitHtml.html`
    <devtools-report-row>
      <span slot="name">${name}</span>
      <span slot="value" class="code">${value}</span>
    </devtools-report-row>
  `;
  // clang-format on
}

customElements.define('devtools-trust-token-report', RequestTrustTokensReport);

declare global {
  interface HTMLElementTagNameMap {
    'devtools-trust-token-report': RequestTrustTokensReport;
  }
}
