// Copyright 2020 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import '../../../ui/components/report_view/report_view.js';
import '../../../ui/components/icon_button/icon_button.js';

import * as i18n from '../../../core/i18n/i18n.js';
import * as SDK from '../../../core/sdk/sdk.js';
import * as Protocol from '../../../generated/protocol.js';
import type * as IconButton from '../../../ui/components/icon_button/icon_button.js';
import * as LegacyWrapper from '../../../ui/components/legacy_wrapper/legacy_wrapper.js';
import * as LitHtml from '../../../ui/lit-html/lit-html.js';
import * as VisualLogging from '../../../ui/visual_logging/visual_logging.js';

import requestTrustTokensViewStyles from './RequestTrustTokensView.css.js';

const {html} = LitHtml;

const UIStrings = {
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
   * @description Text for the success status in the Network panel. Refers to the outcome of a network
   * request which will either be 'Success' or 'Failure'.
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
  theKeysForThisPSTIssuerAreUnavailable:
      'The keys for this PST issuer are unavailable. The issuer may need to be registered via the Chrome registration process.',
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
const str_ = i18n.i18n.registerUIStrings('panels/network/components/RequestTrustTokensView.ts', UIStrings);
const i18nString = i18n.i18n.getLocalizedString.bind(undefined, str_);

export class RequestTrustTokensView extends LegacyWrapper.LegacyWrapper.WrappableComponent {
  readonly #shadow = this.attachShadow({mode: 'open'});
  readonly #request: SDK.NetworkRequest.NetworkRequest;

  constructor(request: SDK.NetworkRequest.NetworkRequest) {
    super();
    this.#request = request;
  }

  override wasShown(): void {
    this.#request.addEventListener(SDK.NetworkRequest.Events.TRUST_TOKEN_RESULT_ADDED, this.render, this);
    void this.render();
  }

  override willHide(): void {
    this.#request.removeEventListener(SDK.NetworkRequest.Events.TRUST_TOKEN_RESULT_ADDED, this.render, this);
  }

  connectedCallback(): void {
    this.#shadow.adoptedStyleSheets = [requestTrustTokensViewStyles];
  }

  override async render(): Promise<void> {
    if (!this.#request) {
      throw new Error('Trying to render a Trust Token report without providing data');
    }

    // Disabled until https://crbug.com/1079231 is fixed.
    // clang-format off
    LitHtml.render(html`<devtools-report>
        ${this.#renderParameterSection()}
        ${this.#renderResultSection()}
      </devtools-report>
    `, this.#shadow, {host: this});
    // clang-format on
  }

  #renderParameterSection(): LitHtml.LitTemplate {
    const trustTokenParams = this.#request.trustTokenParams();
    if (!trustTokenParams) {
      return LitHtml.nothing;
    }

    return html`
      <devtools-report-section-header jslog=${VisualLogging.pane('trust-tokens').track({
      resize: true,
    })}>${i18nString(UIStrings.parameters)}</devtools-report-section-header>
      ${renderRowWithCodeValue(i18nString(UIStrings.type), trustTokenParams.operation.toString())}
      ${this.#renderRefreshPolicy(trustTokenParams)}
      ${this.#renderIssuers(trustTokenParams)}
      ${this.#renderIssuerAndTopLevelOriginFromResult()}
      <devtools-report-divider></devtools-report-divider>
    `;
  }

  #renderRefreshPolicy(params: Protocol.Network.TrustTokenParams): LitHtml.LitTemplate {
    if (params.operation !== Protocol.Network.TrustTokenOperationType.Redemption) {
      return LitHtml.nothing;
    }
    return renderRowWithCodeValue(i18nString(UIStrings.refreshPolicy), params.refreshPolicy.toString());
  }

  #renderIssuers(params: Protocol.Network.TrustTokenParams): LitHtml.LitTemplate {
    if (!params.issuers || params.issuers.length === 0) {
      return LitHtml.nothing;
    }

    return html`
      <devtools-report-key>${i18nString(UIStrings.issuers)}</devtools-report-key>
      <devtools-report-value>
        <ul class="issuers-list">
          ${params.issuers.map(issuer => html`<li>${issuer}</li>`)}
        </ul>
      </devtools-report-value>
    `;
  }

  // The issuer and top level origin are technically parameters but reported in the
  // result structure due to the timing when they are calculated in the backend.
  // Nonetheless, we show them as part of the parameter section.
  #renderIssuerAndTopLevelOriginFromResult(): LitHtml.LitTemplate {
    const trustTokenResult = this.#request.trustTokenOperationDoneEvent();
    if (!trustTokenResult) {
      return LitHtml.nothing;
    }

    return html`
      ${renderSimpleRowIfValuePresent(i18nString(UIStrings.topLevelOrigin), trustTokenResult.topLevelOrigin)}
      ${renderSimpleRowIfValuePresent(i18nString(UIStrings.issuer), trustTokenResult.issuerOrigin)}`;
  }

  #renderResultSection(): LitHtml.LitTemplate {
    const trustTokenResult = this.#request.trustTokenOperationDoneEvent();
    if (!trustTokenResult) {
      return LitHtml.nothing;
    }
    return html`
      <devtools-report-section-header>${i18nString(UIStrings.result)}</devtools-report-section-header>
      <devtools-report-key>${i18nString(UIStrings.status)}</devtools-report-key>
      <devtools-report-value>
        <span>
          <devtools-icon class="status-icon"
            .data=${getIconForStatusCode(trustTokenResult.status)}>
          </devtools-icon>
          <strong>${getSimplifiedStatusTextForStatusCode(trustTokenResult.status)}</strong>
          ${getDetailedTextForStatusCode(trustTokenResult.status)}
        </span>
      </devtools-report-value>
      ${this.#renderIssuedTokenCount(trustTokenResult)}
      <devtools-report-divider></devtools-report-divider>
      `;
  }

  #renderIssuedTokenCount(result: Protocol.Network.TrustTokenOperationDoneEvent): LitHtml.LitTemplate {
    if (result.type !== Protocol.Network.TrustTokenOperationType.Issuance) {
      return LitHtml.nothing;
    }
    return renderSimpleRowIfValuePresent(i18nString(UIStrings.numberOfIssuedTokens), result.issuedTokenCount);
  }
}

const SUCCESS_ICON_DATA: IconButton.Icon.IconWithName = {
  color: 'var(--icon-checkmark-green)',
  iconName: 'check-circle',
  width: '16px',
  height: '16px',
};

const FAILURE_ICON_DATA: IconButton.Icon.IconWithName = {
  color: 'var(--icon-error)',
  iconName: 'cross-circle-filled',
  width: '16px',
  height: '16px',
};

export function statusConsideredSuccess(status: Protocol.Network.TrustTokenOperationDoneEventStatus): boolean {
  return status === Protocol.Network.TrustTokenOperationDoneEventStatus.Ok ||
      status === Protocol.Network.TrustTokenOperationDoneEventStatus.AlreadyExists ||
      status === Protocol.Network.TrustTokenOperationDoneEventStatus.FulfilledLocally;
}

function getIconForStatusCode(status: Protocol.Network.TrustTokenOperationDoneEventStatus):
    IconButton.Icon.IconWithName {
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
    case Protocol.Network.TrustTokenOperationDoneEventStatus.MissingIssuerKeys:
      return i18nString(UIStrings.theKeysForThisPSTIssuerAreUnavailable);
    case Protocol.Network.TrustTokenOperationDoneEventStatus.FailedPrecondition:
    case Protocol.Network.TrustTokenOperationDoneEventStatus.ResourceLimited:
    case Protocol.Network.TrustTokenOperationDoneEventStatus.InternalError:
    case Protocol.Network.TrustTokenOperationDoneEventStatus.Unauthorized:
    case Protocol.Network.TrustTokenOperationDoneEventStatus.UnknownError:
      return i18nString(UIStrings.theOperationFailedForAnUnknown);
  }
}

function renderSimpleRowIfValuePresent<T>(key: string, value: T|undefined): LitHtml.LitTemplate {
  if (value === undefined) {
    return LitHtml.nothing;
  }

  return html`
    <devtools-report-key>${key}</devtools-report-key>
    <devtools-report-value>${value}</devtools-report-value>
  `;
}

function renderRowWithCodeValue(key: string, value: string): LitHtml.TemplateResult {
  return html`
    <devtools-report-key>${key}</devtools-report-key>
    <devtools-report-value class="code">${value}</devtools-report-value>
  `;
}

customElements.define('devtools-trust-token-report', RequestTrustTokensView);

declare global {
  interface HTMLElementTagNameMap {
    'devtools-trust-token-report': RequestTrustTokensView;
  }
}
