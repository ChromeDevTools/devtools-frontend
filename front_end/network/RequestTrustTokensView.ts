// Copyright 2020 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import '../ui/components/components.js';

import type * as Components from '../ui/components/components.js';

import * as LitHtml from '../third_party/lit-html/lit-html.js';
import * as SDK from '../sdk/sdk.js';
import * as UI from '../ui/ui.js';

import * as i18n from '../i18n/i18n.js';
export const UIStrings = {
  /**
  *@description Section heading in the Trust Token tab
  */
  parameters: 'Parameters',
  /**
  *@description Text that refers to some types
  */
  type: 'Type',
  /**
  *@description Label for a Trust Token parameter
  */
  refreshPolicy: 'Refresh policy',
  /**
  *@description Label for a list if origins in the Trust Token tab
  */
  issuers: 'Issuers',
  /**
  *@description Label for a report field in the Network panel
  */
  topLevelOrigin: 'Top level origin',
  /**
  *@description Text for the issuer of an item
  */
  issuer: 'Issuer',
  /**
  *@description Heading of a report section in the Network panel
  */
  result: 'Result',
  /**
  *@description Text for the status of something
  */
  status: 'Status',
  /**
  *@description Label for a field in the Network panel
  */
  numberOfIssuedTokens: 'Number of issued tokens',
  /**
  *@description Text for the success status in the Network panel
  */
  success: 'Success',
  /**
  *@description Text in the network panel for an error status
  */
  failure: 'Failure',
  /**
  *@description Detailed text for a success status in the Network panel
  */
  theOperationsResultWasServedFrom: 'The operations result was served from cache.',
  /**
  *@description Detailed text for a success status in the Network panel
  */
  theOperationWasFulfilledLocally: 'The operation was fulfilled locally, no request was sent.',
  /**
  *@description Text for an error status in the Network panel
  */
  aClientprovidedArgumentWas: 'A client-provided argument was malformed or otherwise invalid.',
  /**
  *@description Text for an error status in the Network panel
  */
  eitherNoInputsForThisOperation:
      'Either no inputs for this operation are available or the output exceeds the operations quota.',
  /**
  *@description Text for an error status in the Network panel
  */
  theServersResponseWasMalformedOr: 'The servers response was malformed or otherwise invalid.',
  /**
  *@description Text for an error status in the Network panel
  */
  theOperationFailedForAnUnknown: 'The operation failed for an unknown reason.',
};
const str_ = i18n.i18n.registerUIStrings('network/RequestTrustTokensView.ts', UIStrings);
const i18nString = i18n.i18n.getLocalizedString.bind(undefined, str_);

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

        .status-icon {
          margin: 0 0.3em 2px 0;
          vertical-align: middle;
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
      <devtools-report-section-header>${i18nString(UIStrings.parameters)}</devtools-report-section-header>
      ${renderRowWithCodeValue(i18nString(UIStrings.type), this.trustTokenData.params.type.toString())}
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
    return renderRowWithCodeValue(i18nString(UIStrings.refreshPolicy), params.refreshPolicy.toString());
  }

  private renderIssuers(params: Protocol.Network.TrustTokenParams): LitHtml.TemplateResult|{} {
    if (!params.issuers || params.issuers.length === 0) {
      return LitHtml.nothing;
    }

    return LitHtml.html`
      <devtools-report-key>${i18nString(UIStrings.issuers)}</devtools-report-key>
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
      ${renderSimpleRowIfValuePresent(i18nString(UIStrings.topLevelOrigin), this.trustTokenData.result.topLevelOrigin)}
      ${renderSimpleRowIfValuePresent(i18nString(UIStrings.issuer), this.trustTokenData.result.issuerOrigin)}`;
  }

  private renderResultSection(): LitHtml.TemplateResult|{} {
    if (!this.trustTokenData || !this.trustTokenData.result) {
      return LitHtml.nothing;
    }
    return LitHtml.html`
      <devtools-report-section-header>${i18nString(UIStrings.result)}</devtools-report-section-header>
      <devtools-report-key>${i18nString(UIStrings.status)}</devtools-report-key>
      <devtools-report-value>
        <span>
          <devtools-icon class="status-icon"
            .data=${getIconForStatusCode(this.trustTokenData.result.status) as Components.Icon.IconData}>
          </devtools-icon>
          <strong>${getSimplifiedStatusTextForStatusCode(this.trustTokenData.result.status)}</strong>
          ${getDetailedTextForStatusCode(this.trustTokenData.result.status)}
        </span>
      </devtools-report-value>
      ${this.renderIssuedTokenCount(this.trustTokenData.result)}
      <devtools-report-divider></devtools-report-divider>
      `;
  }

  private renderIssuedTokenCount(result: Protocol.Network.TrustTokenOperationDoneEvent): LitHtml.TemplateResult|{} {
    if (result.type !== Protocol.Network.TrustTokenOperationType.Issuance) {
      return LitHtml.nothing;
    }
    return renderSimpleRowIfValuePresent(i18nString(UIStrings.numberOfIssuedTokens), result.issuedTokenCount);
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
  return statusConsideredSuccess(status) ? i18nString(UIStrings.success) : i18nString(UIStrings.failure);
}

function getDetailedTextForStatusCode(status: Protocol.Network.TrustTokenOperationDoneEventStatus): string|null {
  switch (status) {
    case Protocol.Network.TrustTokenOperationDoneEventStatus.Ok:
      return null;
    case Protocol.Network.TrustTokenOperationDoneEventStatus.AlreadyExists:
      return i18nString(UIStrings.theOperationsResultWasServedFrom);
    case Protocol.Network.TrustTokenOperationDoneEventStatus.FulfilledLocally:
      return i18nString(UIStrings.theOperationWasFulfilledLocally);
    case Protocol.Network.TrustTokenOperationDoneEventStatus.InvalidArgument:
      return i18nString(UIStrings.aClientprovidedArgumentWas);
    case Protocol.Network.TrustTokenOperationDoneEventStatus.ResourceExhausted:
      return i18nString(UIStrings.eitherNoInputsForThisOperation);
    case Protocol.Network.TrustTokenOperationDoneEventStatus.BadResponse:
      return i18nString(UIStrings.theServersResponseWasMalformedOr);
    case Protocol.Network.TrustTokenOperationDoneEventStatus.FailedPrecondition:
    case Protocol.Network.TrustTokenOperationDoneEventStatus.Unavailable:
    case Protocol.Network.TrustTokenOperationDoneEventStatus.InternalError:
    case Protocol.Network.TrustTokenOperationDoneEventStatus.UnknownError:
      return i18nString(UIStrings.theOperationFailedForAnUnknown);
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
