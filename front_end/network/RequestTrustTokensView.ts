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

  wasShown(): void {
    this.request.addEventListener(SDK.NetworkRequest.Events.TrustTokenResultAdded, this.refreshReportView, this);

    this.refreshReportView();
  }

  willHide(): void {
    this.request.removeEventListener(SDK.NetworkRequest.Events.TrustTokenResultAdded, this.refreshReportView, this);
  }

  private refreshReportView(): void {
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

  private render(): void {
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

        .status-row {
          display: flex;
          align-items: baseline;
        }

        .status-icon {
          margin-right: 6px;
        }

        .status-text {
          display: flex;
          flex-direction: column;
        }
      </style>
      <devtools-report>
        ${this.renderParameterSection()}
        ${this.renderResultSection()}
      </devtools-report>
    `, this.shadow);
    // clang-format on
  }

  private renderParameterSection(): LitHtml.TemplateResult|{} {
    if (!this.trustTokenData || !this.trustTokenData.params) {
      return LitHtml.nothing;
    }

    return LitHtml.html`
      <devtools-report-section-header>${ls`Parameters`}</devtools-report-section-header>
      ${renderRowWithCodeValue(ls`Type`, this.trustTokenData.params.type.toString())}
      ${this.renderRefreshPolicy(this.trustTokenData.params)}
      ${this.renderIssuers(this.trustTokenData.params)}
      ${this.renderIssuerAndTopLevelOriginFromResult()}
      <devtools-report-divider></devtools-report-divider>
    `;
  }

  private renderRefreshPolicy(params: Protocol.Network.TrustTokenParams): LitHtml.TemplateResult|{} {
    if (params.type !== Protocol.Network.TrustTokenOperationType.Redemption) {
      return LitHtml.nothing;
    }
    return renderRowWithCodeValue(ls`Refresh policy`, params.refreshPolicy.toString());
  }

  private renderIssuers(params: Protocol.Network.TrustTokenParams): LitHtml.TemplateResult|{} {
    if (!params.issuers || params.issuers.length === 0) {
      return LitHtml.nothing;
    }

    return LitHtml.html`
      <devtools-report-key>${ls`Issuers`}</devtools-report-key>
      <devtools-report-value>
        <ul class="issuers-list">
          ${params.issuers.map(issuer => LitHtml.html`<li>${issuer}</li>`)}
        </ul>
      </devtools-report-value>
    `;
  }

  // The issuer and top level origin are technically parameters but reported in the
  // result structure due to the timing when they are calculated in the backend.
  // Nonetheless, we show them as part of the parameter section.
  private renderIssuerAndTopLevelOriginFromResult(): LitHtml.TemplateResult|{} {
    if (!this.trustTokenData || !this.trustTokenData.result) {
      return LitHtml.nothing;
    }

    return LitHtml.html`
      ${renderSimpleRowIfValuePresent(ls`Top level origin`, this.trustTokenData.result.topLevelOrigin)}
      ${renderSimpleRowIfValuePresent(ls`Issuer`, this.trustTokenData.result.issuerOrigin)}`;
  }

  private renderResultSection(): LitHtml.TemplateResult|{} {
    if (!this.trustTokenData || !this.trustTokenData.result) {
      return LitHtml.nothing;
    }
    return LitHtml.html`
      <devtools-report-section-header>${ls`Result`}</devtools-report-section-header>
      <devtools-report-key>${ls`Status`}</devtools-report-key>
      <devtools-report-value>
        <div class="status-row">
          <devtools-icon class="status-icon"
            .data=${getIconForStatusCode(this.trustTokenData.result.status) as Components.Icon.IconData}>
          </devtools-icon>
          <div class="status-text">
            <span><strong>${getSimplifiedStatusTextForStatusCode(this.trustTokenData.result.status)}</strong></span>
            <span>${getDetailedTextForStatusCode(this.trustTokenData.result.status)}</span>
          </div>
        </div>
      </devtools-report-value>
      ${this.renderIssuedTokenCount(this.trustTokenData.result)}
      <devtools-report-divider></devtools-report-divider>
      `;
  }

  private renderIssuedTokenCount(result: Protocol.Network.TrustTokenOperationDoneEvent): LitHtml.TemplateResult|{} {
    if (result.type !== Protocol.Network.TrustTokenOperationType.Issuance) {
      return LitHtml.nothing;
    }
    return renderSimpleRowIfValuePresent(ls`Number of issued tokens`, result.issuedTokenCount);
  }
}

const SUCCESS_ICON_DATA: Components.Icon.IconWithName = {
  color: 'rgb(12, 164, 12)',
  iconName: 'ic_checkmark_16x16',
  width: '12px',
};

const FAILURE_ICON_DATA: Components.Icon.IconWithName = {
  color: '',
  iconName: 'error_icon',
  width: '12px',
};

export function statusConsideredSuccess(status: Protocol.Network.TrustTokenOperationDoneEventStatus): boolean {
  return status === Protocol.Network.TrustTokenOperationDoneEventStatus.Ok ||
      status === Protocol.Network.TrustTokenOperationDoneEventStatus.AlreadyExists ||
      status === Protocol.Network.TrustTokenOperationDoneEventStatus.FulfilledLocally;
}

function getIconForStatusCode(status: Protocol.Network.TrustTokenOperationDoneEventStatus):
    Components.Icon.IconWithName {
  return statusConsideredSuccess(status) ? SUCCESS_ICON_DATA : FAILURE_ICON_DATA;
}

function getSimplifiedStatusTextForStatusCode(status: Protocol.Network.TrustTokenOperationDoneEventStatus): string {
  return statusConsideredSuccess(status) ? ls`Success` : ls`Failure`;
}

function getDetailedTextForStatusCode(status: Protocol.Network.TrustTokenOperationDoneEventStatus): string|null {
  switch (status) {
    case Protocol.Network.TrustTokenOperationDoneEventStatus.Ok:
      return null;
    case Protocol.Network.TrustTokenOperationDoneEventStatus.AlreadyExists:
      return ls`The operations result was served from cache.`;
    case Protocol.Network.TrustTokenOperationDoneEventStatus.FulfilledLocally:
      return ls`The operation was fulfilled locally, no request was sent.`;
    case Protocol.Network.TrustTokenOperationDoneEventStatus.InvalidArgument:
      return ls`A client-provided argument was malformed or otherwise invalid.`;
    case Protocol.Network.TrustTokenOperationDoneEventStatus.ResourceExhausted:
      return ls`Either no inputs for this operation are available or the output exceeds the operations quota.`;
    case Protocol.Network.TrustTokenOperationDoneEventStatus.BadResponse:
      return ls`The servers response was malformed or otherwise invalid.`;
    case Protocol.Network.TrustTokenOperationDoneEventStatus.FailedPrecondition:
    case Protocol.Network.TrustTokenOperationDoneEventStatus.Unavailable:
    case Protocol.Network.TrustTokenOperationDoneEventStatus.InternalError:
    case Protocol.Network.TrustTokenOperationDoneEventStatus.UnknownError:
      return ls`The operation failed for an unknown reason.`;
  }
}

function renderSimpleRowIfValuePresent<T>(key: string, value: T|undefined): LitHtml.TemplateResult|{} {
  if (value === undefined) {
    return LitHtml.nothing;
  }

  return LitHtml.html`
    <devtools-report-key>${key}</devtools-report-key>
    <devtools-report-value>${value}</devtools-report-value>
  `;
}

function renderRowWithCodeValue(key: string, value: string): LitHtml.TemplateResult {
  return LitHtml.html`
    <devtools-report-key>${key}</devtools-report-key>
    <devtools-report-value class="code">${value}</devtools-report-value>
  `;
}

customElements.define('devtools-trust-token-report', RequestTrustTokensReport);

declare global {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  interface HTMLElementTagNameMap {
    'devtools-trust-token-report': RequestTrustTokensReport;
  }
}
