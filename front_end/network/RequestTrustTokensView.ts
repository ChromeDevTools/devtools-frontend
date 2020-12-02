// Copyright 2020 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import '../ui/components/components.js';

import type * as Components from '../ui/components/components.js';

import * as LitHtml from '../third_party/lit-html/lit-html.js';
import * as Platform from '../platform/platform.js';
import * as SDK from '../sdk/sdk.js';
import * as UI from '../ui/ui.js';

const ls = Platform.UIString.ls;

export class RequestTrustTokensView extends UI.Widget.VBox {
  private readonly reportView = new RequestTrustTokensReport();
  private readonly request: SDK.NetworkRequest.NetworkRequest;

  constructor(request: SDK.NetworkRequest.NetworkRequest) {
    super();
    this.request = request;

    this.contentElement.appendChild(this.reportView);
  }

  wasShown() {
    this.request.addEventListener(SDK.NetworkRequest.Events.TrustTokenResultAdded, this.refreshReportView, this);

    this.refreshReportView();
  }

  willHide() {
    this.request.removeEventListener(SDK.NetworkRequest.Events.TrustTokenResultAdded, this.refreshReportView, this);
  }

  private refreshReportView() {
    this.reportView.data = {
      params: this.request.trustTokenParams(),
      result: this.request.trustTokenOperationDoneEvent(),
    };
  }
}

export interface RequestTrustTokensReportData {
  params?: Readonly<Protocol.Network.TrustTokenParams>;
  result?: Readonly<Protocol.Network.TrustTokenOperationDoneEvent>;
}

export class RequestTrustTokensReport extends HTMLElement {
  private readonly shadow = this.attachShadow({mode: 'open'});
  private trustTokenData?: Readonly<RequestTrustTokensReportData>;

  set data(data: RequestTrustTokensReportData) {
    this.trustTokenData = data;
    this.render();
  }

  private render() {
    if (!this.trustTokenData) {
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
        ${this.renderParameterSection()}
      </devtools-report>
    `, this.shadow);
    // clang-format on
  }

  private renderParameterSection() {
    if (!this.trustTokenData || !this.trustTokenData.params) {
      return LitHtml.nothing;
    }
    // Disabled until https://crbug.com/1079231 is fixed.
    // clang-format off
    return LitHtml.html`
      <devtools-report-section .data=${{sectionTitle: ls`Parameters`} as Components.ReportView.ReportSectionData}>
        ${renderRowWithCodeValue(ls`Type`, this.trustTokenData.params.type.toString())}
        ${this.renderRefreshPolicy(this.trustTokenData.params)}
        ${this.renderIssuers(this.trustTokenData.params)}
      </devtools-report-section>
    `;
    // clang-format on
  }

  private renderRefreshPolicy(params: Protocol.Network.TrustTokenParams) {
    if (params.type !== Protocol.Network.TrustTokenOperationType.Redemption) {
      return LitHtml.nothing;
    }
    return renderRowWithCodeValue(ls`Refresh policy`, params.refreshPolicy.toString());
  }

  private renderIssuers(params: Protocol.Network.TrustTokenParams) {
    if (!params.issuers || params.issuers.length === 0) {
      return LitHtml.nothing;
    }

    // Disabled until https://crbug.com/1079231 is fixed.
    // clang-format off
    return LitHtml.html`
      <devtools-report-row>
        <span slot="name">${ls`Issuers`}</span>
        <ul slot="value" class="issuers-list">
          ${params.issuers.map(issuer => LitHtml.html`<li>${issuer}</li>`)}
        </ul>
      </devtools-report-row>
    `;
    // clang-format on
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
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  interface HTMLElementTagNameMap {
    'devtools-trust-token-report': RequestTrustTokensReport;
  }
}
