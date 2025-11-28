// Copyright 2020 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.
/* eslint-disable @devtools/no-lit-render-outside-of-view */
import '../../../ui/components/report_view/report_view.js';
import '../../../ui/kit/kit.js';
import * as i18n from '../../../core/i18n/i18n.js';
import * as SDK from '../../../core/sdk/sdk.js';
import * as LegacyWrapper from '../../../ui/components/legacy_wrapper/legacy_wrapper.js';
import * as Lit from '../../../ui/lit/lit.js';
import * as VisualLogging from '../../../ui/visual_logging/visual_logging.js';
import requestTrustTokensViewStyles from './RequestTrustTokensView.css.js';
const { html } = Lit;
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
    theKeysForThisPSTIssuerAreUnavailable: 'The keys for this PST issuer are unavailable. The issuer may need to be registered via the Chrome registration process.',
    /**
     * @description Text for an error status in the Network panel
     */
    aClientprovidedArgumentWas: 'A client-provided argument was malformed or otherwise invalid.',
    /**
     * @description Text for an error status in the Network panel
     */
    eitherNoInputsForThisOperation: 'Either no inputs for this operation are available or the output exceeds the operations quota.',
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
};
const str_ = i18n.i18n.registerUIStrings('panels/network/components/RequestTrustTokensView.ts', UIStrings);
const i18nString = i18n.i18n.getLocalizedString.bind(undefined, str_);
export class RequestTrustTokensView extends LegacyWrapper.LegacyWrapper.WrappableComponent {
    #shadow = this.attachShadow({ mode: 'open' });
    #request;
    constructor(request) {
        super();
        this.#request = request;
    }
    wasShown() {
        super.wasShown();
        this.#request.addEventListener(SDK.NetworkRequest.Events.TRUST_TOKEN_RESULT_ADDED, this.render, this);
        void this.render();
    }
    willHide() {
        super.willHide();
        this.#request.removeEventListener(SDK.NetworkRequest.Events.TRUST_TOKEN_RESULT_ADDED, this.render, this);
    }
    async render() {
        if (!this.#request) {
            throw new Error('Trying to render a Trust Token report without providing data');
        }
        // Disabled until https://crbug.com/1079231 is fixed.
        // clang-format off
        Lit.render(html `
      <style>${requestTrustTokensViewStyles}</style>
      <devtools-report>
        ${this.#renderParameterSection()}
        ${this.#renderResultSection()}
      </devtools-report>
    `, this.#shadow, { host: this });
        // clang-format on
    }
    #renderParameterSection() {
        const trustTokenParams = this.#request.trustTokenParams();
        if (!trustTokenParams) {
            return Lit.nothing;
        }
        return html `
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
    #renderRefreshPolicy(params) {
        if (params.operation !== "Redemption" /* Protocol.Network.TrustTokenOperationType.Redemption */) {
            return Lit.nothing;
        }
        return renderRowWithCodeValue(i18nString(UIStrings.refreshPolicy), params.refreshPolicy.toString());
    }
    #renderIssuers(params) {
        if (!params.issuers || params.issuers.length === 0) {
            return Lit.nothing;
        }
        return html `
      <devtools-report-key>${i18nString(UIStrings.issuers)}</devtools-report-key>
      <devtools-report-value>
        <ul class="issuers-list">
          ${params.issuers.map(issuer => html `<li>${issuer}</li>`)}
        </ul>
      </devtools-report-value>
    `;
    }
    // The issuer and top level origin are technically parameters but reported in the
    // result structure due to the timing when they are calculated in the backend.
    // Nonetheless, we show them as part of the parameter section.
    #renderIssuerAndTopLevelOriginFromResult() {
        const trustTokenResult = this.#request.trustTokenOperationDoneEvent();
        if (!trustTokenResult) {
            return Lit.nothing;
        }
        return html `
      ${renderSimpleRowIfValuePresent(i18nString(UIStrings.topLevelOrigin), trustTokenResult.topLevelOrigin)}
      ${renderSimpleRowIfValuePresent(i18nString(UIStrings.issuer), trustTokenResult.issuerOrigin)}`;
    }
    #renderResultSection() {
        const trustTokenResult = this.#request.trustTokenOperationDoneEvent();
        if (!trustTokenResult) {
            return Lit.nothing;
        }
        return html `
      <devtools-report-section-header>${i18nString(UIStrings.result)}</devtools-report-section-header>
      <devtools-report-key>${i18nString(UIStrings.status)}</devtools-report-key>
      <devtools-report-value>
        <span>
          <devtools-icon class="status-icon medium"
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
    #renderIssuedTokenCount(result) {
        if (result.type !== "Issuance" /* Protocol.Network.TrustTokenOperationType.Issuance */) {
            return Lit.nothing;
        }
        return renderSimpleRowIfValuePresent(i18nString(UIStrings.numberOfIssuedTokens), result.issuedTokenCount);
    }
}
const SUCCESS_ICON_DATA = {
    color: 'var(--icon-checkmark-green)',
    iconName: 'check-circle',
};
const FAILURE_ICON_DATA = {
    color: 'var(--icon-error)',
    iconName: 'cross-circle-filled',
};
export function statusConsideredSuccess(status) {
    return status === "Ok" /* Protocol.Network.TrustTokenOperationDoneEventStatus.Ok */ ||
        status === "AlreadyExists" /* Protocol.Network.TrustTokenOperationDoneEventStatus.AlreadyExists */ ||
        status === "FulfilledLocally" /* Protocol.Network.TrustTokenOperationDoneEventStatus.FulfilledLocally */;
}
function getIconForStatusCode(status) {
    return statusConsideredSuccess(status) ? SUCCESS_ICON_DATA : FAILURE_ICON_DATA;
}
function getSimplifiedStatusTextForStatusCode(status) {
    return statusConsideredSuccess(status) ? i18nString(UIStrings.success) : i18nString(UIStrings.failure);
}
function getDetailedTextForStatusCode(status) {
    switch (status) {
        case "Ok" /* Protocol.Network.TrustTokenOperationDoneEventStatus.Ok */:
            return null;
        case "AlreadyExists" /* Protocol.Network.TrustTokenOperationDoneEventStatus.AlreadyExists */:
            return i18nString(UIStrings.theOperationsResultWasServedFrom);
        case "FulfilledLocally" /* Protocol.Network.TrustTokenOperationDoneEventStatus.FulfilledLocally */:
            return i18nString(UIStrings.theOperationWasFulfilledLocally);
        case "InvalidArgument" /* Protocol.Network.TrustTokenOperationDoneEventStatus.InvalidArgument */:
            return i18nString(UIStrings.aClientprovidedArgumentWas);
        case "ResourceExhausted" /* Protocol.Network.TrustTokenOperationDoneEventStatus.ResourceExhausted */:
            return i18nString(UIStrings.eitherNoInputsForThisOperation);
        case "BadResponse" /* Protocol.Network.TrustTokenOperationDoneEventStatus.BadResponse */:
            return i18nString(UIStrings.theServersResponseWasMalformedOr);
        case "MissingIssuerKeys" /* Protocol.Network.TrustTokenOperationDoneEventStatus.MissingIssuerKeys */:
            return i18nString(UIStrings.theKeysForThisPSTIssuerAreUnavailable);
        case "FailedPrecondition" /* Protocol.Network.TrustTokenOperationDoneEventStatus.FailedPrecondition */:
        case "ResourceLimited" /* Protocol.Network.TrustTokenOperationDoneEventStatus.ResourceLimited */:
        case "InternalError" /* Protocol.Network.TrustTokenOperationDoneEventStatus.InternalError */:
        case "Unauthorized" /* Protocol.Network.TrustTokenOperationDoneEventStatus.Unauthorized */:
        case "UnknownError" /* Protocol.Network.TrustTokenOperationDoneEventStatus.UnknownError */:
            return i18nString(UIStrings.theOperationFailedForAnUnknown);
        case "SiteIssuerLimit" /* Protocol.Network.TrustTokenOperationDoneEventStatus.SiteIssuerLimit */:
            return i18nString(UIStrings.perSiteLimit);
    }
}
function renderSimpleRowIfValuePresent(key, value) {
    if (value === undefined) {
        return Lit.nothing;
    }
    return html `
    <devtools-report-key>${key}</devtools-report-key>
    <devtools-report-value>${value}</devtools-report-value>
  `;
}
function renderRowWithCodeValue(key, value) {
    return html `
    <devtools-report-key>${key}</devtools-report-key>
    <devtools-report-value class="code">${value}</devtools-report-value>
  `;
}
customElements.define('devtools-trust-token-report', RequestTrustTokensView);
//# sourceMappingURL=RequestTrustTokensView.js.map