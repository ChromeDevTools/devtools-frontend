// Copyright 2020 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.
import '../../../ui/components/report_view/report_view.js';
import '../../../ui/kit/kit.js';
import * as i18n from '../../../core/i18n/i18n.js';
import * as SDK from '../../../core/sdk/sdk.js';
import * as UI from '../../../ui/legacy/legacy.js';
import * as Lit from '../../../ui/lit/lit.js';
import * as VisualLogging from '../../../ui/visual_logging/visual_logging.js';
import requestTrustTokensViewStyles from './RequestTrustTokensView.css.js';
const { html, render } = Lit;
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
function renderRowIfValuePresent(key, value, isCode) {
    if (!value || (Array.isArray(value) && value.length === 0)) {
        return Lit.nothing;
    }
    // clang-format off
    return html `
    <devtools-report-key>${key}</devtools-report-key>
    <devtools-report-value class=${isCode ? 'code' : ''}>
      ${Array.isArray(value) ? html `
        <ul class="issuers-list">
            ${value.map(item => html `<li>${item}</li>`)}
        </ul>` :
        value}
    </devtools-report-value>
  `;
    // clang-format on
}
const renderResultSection = (status, description, issuedTokenCount) => {
    if (!status) {
        return Lit.nothing;
    }
    // clang-format off
    return html `
    <devtools-report-section-header>${i18nString(UIStrings.result)}</devtools-report-section-header>
    <devtools-report-key>${i18nString(UIStrings.status)}</devtools-report-key>
    <devtools-report-value>
      <span>
        <devtools-icon class="status-icon medium ${status === 'Success' ? 'success' : 'failure'}"
        name=${status === 'Success' ? 'check-circle' : 'cross-circle-filled'}>
        </devtools-icon>
        <strong>${status === 'Success' ? i18nString(UIStrings.success) : i18nString(UIStrings.failure)}</strong>
        ${description ? html ` ${description}` : Lit.nothing}
      </span>
    </devtools-report-value>
    ${renderRowIfValuePresent(i18nString(UIStrings.numberOfIssuedTokens), issuedTokenCount)}
    <devtools-report-divider></devtools-report-divider>
    `;
    // clang-format on
};
const renderParameterSection = (params) => {
    if (!params || params.length === 0) {
        return Lit.nothing;
    }
    // clang-format off
    return html `
    <devtools-report-section-header jslog=${VisualLogging.pane('trust-tokens').track({ resize: true })}>
      ${i18nString(UIStrings.parameters)}
    </devtools-report-section-header>
    ${params.map(param => renderRowIfValuePresent(param.name, param.value, param.isCode))}
    <devtools-report-divider></devtools-report-divider>
  `;
    // clang-format on
};
// clang-format off
export const DEFAULT_VIEW = (input, output, target) => {
    render(html `
    <style>${requestTrustTokensViewStyles}</style>
    <devtools-report>
      ${renderParameterSection(input.params)}
      ${renderResultSection(input.status, input.description, input.issuedTokenCount)}
    </devtools-report>
  `, target);
};
// clang-format on
export class RequestTrustTokensView extends UI.Widget.Widget {
    #request = null;
    #view;
    constructor(element, view = DEFAULT_VIEW) {
        super(element);
        this.#view = view;
    }
    get request() {
        return this.#request;
    }
    set request(request) {
        if (this.#request === request) {
            return;
        }
        this.#unsubscribe();
        this.#request = request;
        this.#subscribe();
        this.requestUpdate();
    }
    #subscribe() {
        if (this.#request && this.isShowing()) {
            this.#request.addEventListener(SDK.NetworkRequest.Events.TRUST_TOKEN_RESULT_ADDED, this.requestUpdate, this);
        }
    }
    #unsubscribe() {
        if (this.#request) {
            this.#request.removeEventListener(SDK.NetworkRequest.Events.TRUST_TOKEN_RESULT_ADDED, this.requestUpdate, this);
        }
    }
    wasShown() {
        super.wasShown();
        this.#subscribe();
        this.requestUpdate();
    }
    willHide() {
        super.willHide();
        this.#unsubscribe();
    }
    performUpdate() {
        if (!this.request) {
            return;
        }
        const trustTokenParams = this.request.trustTokenParams();
        const trustTokenResult = this.request.trustTokenOperationDoneEvent();
        const viewInput = {};
        if (trustTokenParams) {
            viewInput.params = [
                { name: i18nString(UIStrings.type), value: trustTokenParams.operation.toString(), isCode: true },
            ];
            if (trustTokenParams.operation === "Redemption" /* Protocol.Network.TrustTokenOperationType.Redemption */) {
                viewInput.params.push({
                    name: i18nString(UIStrings.refreshPolicy),
                    value: trustTokenParams.refreshPolicy.toString(),
                    isCode: true,
                });
            }
            if (trustTokenParams.issuers && trustTokenParams.issuers.length > 0) {
                viewInput.params.push({ name: i18nString(UIStrings.issuers), value: trustTokenParams.issuers });
            }
            if (trustTokenResult?.topLevelOrigin) {
                viewInput.params.push({ name: i18nString(UIStrings.topLevelOrigin), value: trustTokenResult.topLevelOrigin });
            }
            if (trustTokenResult?.issuerOrigin) {
                viewInput.params.push({ name: i18nString(UIStrings.issuer), value: trustTokenResult.issuerOrigin });
            }
        }
        if (trustTokenResult) {
            viewInput.status = statusConsideredSuccess(trustTokenResult.status) ? 'Success' : 'Failure';
            viewInput.description = getDetailedTextForStatusCode(trustTokenResult.status) ?? undefined;
            viewInput.issuedTokenCount = trustTokenResult.type === "Issuance" /* Protocol.Network.TrustTokenOperationType.Issuance */ ?
                trustTokenResult.issuedTokenCount :
                undefined;
        }
        this.#view(viewInput, undefined, this.contentElement);
    }
}
export function statusConsideredSuccess(status) {
    return status === "Ok" /* Protocol.Network.TrustTokenOperationDoneEventStatus.Ok */ ||
        status === "AlreadyExists" /* Protocol.Network.TrustTokenOperationDoneEventStatus.AlreadyExists */ ||
        status === "FulfilledLocally" /* Protocol.Network.TrustTokenOperationDoneEventStatus.FulfilledLocally */;
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
//# sourceMappingURL=RequestTrustTokensView.js.map