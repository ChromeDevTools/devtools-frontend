// Copyright 2020 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import '../../../ui/components/report_view/report_view.js';
import '../../../ui/kit/kit.js';

import * as i18n from '../../../core/i18n/i18n.js';
import * as SDK from '../../../core/sdk/sdk.js';
import * as Protocol from '../../../generated/protocol.js';
import * as UI from '../../../ui/legacy/legacy.js';
import * as Lit from '../../../ui/lit/lit.js';
import * as VisualLogging from '../../../ui/visual_logging/visual_logging.js';

import requestTrustTokensViewStyles from './RequestTrustTokensView.css.js';

const {html, render} = Lit;

const UIStrings = {
  /**
   * @description Section heading in the Trust Token tab
   */
  parameters: 'Parameters',
  /**
   * @description Text that refers to some types
   */
  type: 'Type',
  /**
   * @description Label for a Trust Token parameter
   */
  refreshPolicy: 'Refresh policy',
  /**
   * @description Label for a list if origins in the Trust Token tab
   */
  issuers: 'Issuers',
  /**
   * @description Label for a report field in the Network panel
   */
  topLevelOrigin: 'Top level origin',
  /**
   * @description Text for the issuer of an item
   */
  issuer: 'Issuer',
  /**
   * @description Heading of a report section in the Network panel
   */
  result: 'Result',
  /**
   * @description Text for the status of something
   */
  status: 'Status',
  /**
   * @description Label for a field in the Network panel
   */
  numberOfIssuedTokens: 'Number of issued tokens',
  /**
   * @description Text for the success status in the Network panel. Refers to the outcome of a network
   * request which will either be 'Success' or 'Failure'.
   */
  success: 'Success',
  /**
   * @description Text in the network panel for an error status
   */
  failure: 'Failure',
  /**
   * @description Detailed text for a success status in the Network panel
   */
  theOperationsResultWasServedFrom: 'The operations result was served from cache.',
  /**
   * @description Detailed text for a success status in the Network panel
   */
  theOperationWasFulfilledLocally: 'The operation was fulfilled locally, no request was sent.',
  /**
   * @description Text for an error status in the Network panel
   */
  theKeysForThisPSTIssuerAreUnavailable:
      'The keys for this PST issuer are unavailable. The issuer may need to be registered via the Chrome registration process.',
  /**
   * @description Text for an error status in the Network panel
   */
  aClientprovidedArgumentWas: 'A client-provided argument was malformed or otherwise invalid.',
  /**
   * @description Text for an error status in the Network panel
   */
  eitherNoInputsForThisOperation:
      'Either no inputs for this operation are available or the output exceeds the operations quota.',
  /**
   * @description Text for an error status in the Network panel
   */
  theServersResponseWasMalformedOr: 'The servers response was malformed or otherwise invalid.',
  /**
   * @description Text for an error status in the Network panel
   */
  theOperationFailedForAnUnknown: 'The operation failed for an unknown reason.',
  /**
   * @description Text for an error status in the Network panel
   */
  perSiteLimit: 'Per-site issuer limit reached.',
} as const;
const str_ = i18n.i18n.registerUIStrings('panels/network/components/RequestTrustTokensView.ts', UIStrings);
const i18nString = i18n.i18n.getLocalizedString.bind(undefined, str_);

type Status = 'Success'|'Failure';

export interface ViewInput {
  params?: Array<{name: string, value: string|string[], isCode?: boolean}>;
  status?: Status;
  description?: string;
  issuedTokenCount?: number;
}

type View = (input: ViewInput, output: undefined, target: HTMLElement) => void;

function renderRowIfValuePresent<T>(key: string, value: T, isCode?: boolean): Lit.LitTemplate {
  if (!value || (Array.isArray(value) && value.length === 0)) {
    return Lit.nothing;
  }

  // clang-format off
  return html`
    <devtools-report-key>${key}</devtools-report-key>
    <devtools-report-value class=${isCode ? 'code' : ''}>
      ${Array.isArray(value) ? html`
        <ul class="issuers-list">
            ${value.map(item => html`<li>${item}</li>`)}
        </ul>` :
    value}
    </devtools-report-value>
  `;
  // clang-format on
}

const renderResultSection = (status?: Status, description?: string, issuedTokenCount?: number): Lit.LitTemplate => {
  if (!status) {
    return Lit.nothing;
  }

  // clang-format off
  return html`
    <devtools-report-section-header>${i18nString(UIStrings.result)}</devtools-report-section-header>
    <devtools-report-key>${i18nString(UIStrings.status)}</devtools-report-key>
    <devtools-report-value>
      <span>
        <devtools-icon class="status-icon medium ${status === 'Success' ? 'success' : 'failure'}"
        name=${status === 'Success' ? 'check-circle' : 'cross-circle-filled'}>
        </devtools-icon>
        <strong>${status === 'Success' ? i18nString(UIStrings.success) : i18nString(UIStrings.failure)}</strong>
        ${description ? html` ${description}` : Lit.nothing}
      </span>
    </devtools-report-value>
    ${renderRowIfValuePresent(i18nString(UIStrings.numberOfIssuedTokens), issuedTokenCount)}
    <devtools-report-divider></devtools-report-divider>
    `;
  // clang-format on
};

const renderParameterSection = (params: ViewInput['params']): Lit.LitTemplate => {
  if (!params || params.length === 0) {
    return Lit.nothing;
  }
  // clang-format off
  return html`
    <devtools-report-section-header jslog=${VisualLogging.pane('trust-tokens').track({ resize: true })}>
      ${i18nString(UIStrings.parameters)}
    </devtools-report-section-header>
    ${params.map(param => renderRowIfValuePresent(param.name, param.value, param.isCode))}
    <devtools-report-divider></devtools-report-divider>
  `;
  // clang-format on
};

// clang-format off
export const DEFAULT_VIEW: View = (input, output, target): void => {
  render(html`
    <style>${requestTrustTokensViewStyles}</style>
    <devtools-report>
      ${renderParameterSection(input.params)}
      ${renderResultSection(input.status, input.description, input.issuedTokenCount)}
    </devtools-report>
  `, target);
};
// clang-format on

export class RequestTrustTokensView extends UI.Widget.Widget {
  #request: SDK.NetworkRequest.NetworkRequest|null = null;
  #view: View;

  constructor(element?: HTMLElement, view: View = DEFAULT_VIEW) {
    super(element);
    this.#view = view;
  }

  get request(): SDK.NetworkRequest.NetworkRequest|null {
    return this.#request;
  }

  set request(request: SDK.NetworkRequest.NetworkRequest|null) {
    if (this.#request === request) {
      return;
    }
    this.#unsubscribe();
    this.#request = request;
    this.#subscribe();
    this.requestUpdate();
  }

  #subscribe(): void {
    if (this.#request && this.isShowing()) {
      this.#request.addEventListener(SDK.NetworkRequest.Events.TRUST_TOKEN_RESULT_ADDED, this.requestUpdate, this);
    }
  }

  #unsubscribe(): void {
    if (this.#request) {
      this.#request.removeEventListener(SDK.NetworkRequest.Events.TRUST_TOKEN_RESULT_ADDED, this.requestUpdate, this);
    }
  }

  override wasShown(): void {
    super.wasShown();
    this.#subscribe();
    this.requestUpdate();
  }

  override willHide(): void {
    super.willHide();
    this.#unsubscribe();
  }

  override performUpdate(): void {
    if (!this.request) {
      return;
    }

    const trustTokenParams = this.request.trustTokenParams();
    const trustTokenResult = this.request.trustTokenOperationDoneEvent();

    const viewInput: ViewInput = {};

    if (trustTokenParams) {
      viewInput.params = [
        {name: i18nString(UIStrings.type), value: trustTokenParams.operation.toString(), isCode: true},
      ];
      if (trustTokenParams.operation === Protocol.Network.TrustTokenOperationType.Redemption) {
        viewInput.params.push({
          name: i18nString(UIStrings.refreshPolicy),
          value: trustTokenParams.refreshPolicy.toString(),
          isCode: true,
        });
      }
      if (trustTokenParams.issuers && trustTokenParams.issuers.length > 0) {
        viewInput.params.push({name: i18nString(UIStrings.issuers), value: trustTokenParams.issuers});
      }
      if (trustTokenResult?.topLevelOrigin) {
        viewInput.params.push({name: i18nString(UIStrings.topLevelOrigin), value: trustTokenResult.topLevelOrigin});
      }
      if (trustTokenResult?.issuerOrigin) {
        viewInput.params.push({name: i18nString(UIStrings.issuer), value: trustTokenResult.issuerOrigin});
      }
    }

    if (trustTokenResult) {
      viewInput.status = statusConsideredSuccess(trustTokenResult.status) ? 'Success' : 'Failure';
      viewInput.description = getDetailedTextForStatusCode(trustTokenResult.status) ?? undefined;
      viewInput.issuedTokenCount = trustTokenResult.type === Protocol.Network.TrustTokenOperationType.Issuance ?
          trustTokenResult.issuedTokenCount :
          undefined;
    }

    this.#view(viewInput, undefined, this.contentElement);
  }
}

export function statusConsideredSuccess(status: Protocol.Network.TrustTokenOperationDoneEventStatus): boolean {
  return status === Protocol.Network.TrustTokenOperationDoneEventStatus.Ok ||
      status === Protocol.Network.TrustTokenOperationDoneEventStatus.AlreadyExists ||
      status === Protocol.Network.TrustTokenOperationDoneEventStatus.FulfilledLocally;
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
    case Protocol.Network.TrustTokenOperationDoneEventStatus.SiteIssuerLimit:
      return i18nString(UIStrings.perSiteLimit);
  }
}
