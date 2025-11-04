// Copyright 2025 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.
import '../../ui/components/switch/switch.js';
import '../../ui/components/cards/cards.js';
import '../../ui/legacy/components/data_grid/data_grid.js';
import '../../ui/components/buttons/buttons.js';
import * as i18n from '../../core/i18n/i18n.js';
import * as Root from '../../core/root/root.js';
import * as SDK from '../../core/sdk/sdk.js';
import * as UI from '../../ui/legacy/legacy.js';
import * as Lit from '../../ui/lit/lit.js';
import ipProtectionViewStyles from './ipProtectionView.css.js';
const { render, html } = Lit;
const { widgetConfig } = UI.Widget;
const UIStrings = {
    /**
     *@description Title in the view's header for the IP Protection tool in the Privacy & Security panel
     */
    viewTitle: 'IP Protection Proxy Controls',
    /**
     *@description Explanation in the view's header about the purpose of this IP Protection tool
     */
    viewExplanation: 'Test how this site will perform if IP Proxy is enabled in Chrome',
    /**
     *@description Title in the card within the IP Protection tool
     */
    cardTitle: 'IP Protection Proxy Status',
    /**
     *@description Subheading for bypassing IP protection toggle
     */
    bypassTitle: 'Bypass IP Protection',
    /**
     *@description Description of bypass IP protection toggle
     */
    bypassDescription: 'Temporarily bypass IP protection for testing',
    /**
     * @description Text informing the user that IP Proxy is not available
     */
    notInIncognito: 'IP proxy unavailable',
    /**
     * @description Description in the widget instructing users to open site in incognito
     */
    openIncognito: 'IP proxy is only available within incognito mode. Open site in incognito.',
    /**
     * @description Column header for the ID of a proxy request in the Proxy Request View panel.
     */
    idColumn: 'ID',
    /**
     * @description Column header for the URL of a proxy request in the Proxy Request View panel.
     */
    urlColumn: 'URL',
    /**
     * @description Column header for the HTTP method of a proxy request in the Proxy Request View panel.
     */
    methodColumn: 'Method',
    /**
     * @description Column header for the status code of a proxy request in the Proxy Request View panel.
     */
    statusColumn: 'Status',
    /**
     * @description Title for the grid of proxy requests.
     */
    proxyRequests: 'Proxy Requests',
    /**
     * @description The status text for the available status of the IP protection proxy.
     */
    Available: 'IP Protection is enabled and active.',
    /**
     * @description The status text for when the feature is not enabled.
     */
    FeatureNotEnabled: 'IP Protection feature is not enabled.',
    /**
     * @description The status text for when the masked domain list is not enabled.
     */
    MaskedDomainListNotEnabled: 'Masked Domain List feature is not enabled.',
    /**
     * @description The status text for when the masked domain list is not populated.
     */
    MaskedDomainListNotPopulated: 'Masked Domain List is not populated.',
    /**
     * @description The status text for when authentication tokens are unavailable.
     */
    AuthTokensUnavailable: 'Limit for authentication tokens was reached. IP Protection will be paused.',
    /**
     * @description The status text for when the proxy is unavailable for another reason.
     */
    Unavailable: 'IP Protection is unavailable.',
    /**
     * @description The status text for when the proxy is bypassed by DevTools.
     */
    BypassedByDevTools: 'IP Protection is being bypassed by DevTools.',
    /**
     * @description The status text for when the status is unknown or being loaded.
     */
    statusUnknown: 'Status unknown',
};
const str_ = i18n.i18n.registerUIStrings('panels/security/IPProtectionView.ts', UIStrings);
export const i18nString = i18n.i18n.getLocalizedString.bind(undefined, str_);
// Explicitly reference dynamically referenced UIStrings to prevent the linter from removing
// eslint-disable-next-line @typescript-eslint/no-unused-vars
const allStatusStrings = [
    UIStrings.Available,
    UIStrings.FeatureNotEnabled,
    UIStrings.MaskedDomainListNotEnabled,
    UIStrings.MaskedDomainListNotPopulated,
    UIStrings.AuthTokensUnavailable,
    UIStrings.Unavailable,
    UIStrings.BypassedByDevTools,
    UIStrings.statusUnknown,
];
const INCOGNITO_EXPLANATION_URL = 'https://support.google.com/chrome/answer/95464?hl=en&co=GENIE.Platform%3DDesktop';
export const DEFAULT_VIEW = (input, _output, target) => {
    const { status } = input;
    const statusText = status ? i18nString(UIStrings[status]) : i18nString(UIStrings.statusUnknown);
    // clang-format off
    const cardHeader = html `
    <div class="card-header">
      <div class="lhs">
        <div class="text">
          <h2 class="main-text">${i18nString(UIStrings.cardTitle)}</h2>
          <div class="body subtext">${statusText}</div>
        </div>
      </div>
      <div class="status-badge">
       ${status === "Available" /* Protocol.Network.IpProxyStatus.Available */ ?
        html `<devtools-icon class="status-icon green-status-icon" role="presentation" name="check-circle"></devtools-icon>` :
        html `<devtools-icon class="status-icon red-status-icon" role="presentation" name="cross-circle-filled"></devtools-icon>`}
      </div>
    </div>
  `;
    render(html `
    <style>
      ${ipProtectionViewStyles}
    </style>
    ${Root.Runtime.hostConfig.isOffTheRecord ? html `
      <div class="overflow-auto">
        <div class="ip-protection">
          <div class="header">
            <h1>${i18nString(UIStrings.viewTitle)}</h1>
            <div class="body">${i18nString(UIStrings.viewExplanation)}</div>
          </div>
          <devtools-card class="card-container">
            <div class="card">
              ${cardHeader}
              <div>
                <div class="card-row">
                  <div class="lhs">
                    <h3 class="main-text">${i18nString(UIStrings.bypassTitle)}</h3>
                    <div class="body subtext">${i18nString(UIStrings.bypassDescription)}</div>
                  </div>
                  <div>
                    <devtools-switch></devtools-switch>
                  </div>
                </div>
              </div>
            </div>
          </devtools-card>
          <devtools-data-grid striped name=${i18nString(UIStrings.proxyRequests)}>
          <table>
            <thead>
              <tr>
                <th id="id" sortable>${i18nString(UIStrings.idColumn)}</th>
                <th id="url" sortable>${i18nString(UIStrings.urlColumn)}</th>
                <th id="method" sortable>${i18nString(UIStrings.methodColumn)}</th>
                <th id="status" sortable>${i18nString(UIStrings.statusColumn)}</th>
              </tr>
            </thead>
            <tbody id="proxy-requests-body">
              ${input.proxyRequests.map((request, index) => html `
                <tr data-request-id=${request.requestId}>
                  <td>${index + 1}</td>
                  <td>${request.url}</td>
                  <td>${request.requestMethod}</td>
                  <td>${String(request.statusCode)}</td>
                </tr>
              `)}
            </tbody>
          </table>
        </devtools-data-grid>
        </div>
      </div>
    ` :
        html `
      <div class="empty-report">
        <devtools-widget
          class="learn-more"
          .widgetConfig=${widgetConfig(UI.EmptyWidget.EmptyWidget, {
            header: i18nString(UIStrings.notInIncognito),
            text: i18nString(UIStrings.openIncognito),
            link: INCOGNITO_EXPLANATION_URL,
        })}>
        </devtools-widget>
      </div>
    `}
  `, target);
    // clang-format on
};
export class IPProtectionView extends UI.Widget.VBox {
    #view;
    #proxyRequests = [];
    #status = null;
    constructor(element, view = DEFAULT_VIEW) {
        super(element, { useShadowDom: true });
        this.#view = view;
        // TODO(crbug.com/429153435): Replace with real data.
        this.#proxyRequests = [
            { requestId: '1', url: 'https://example.com/api/data', requestMethod: 'GET', statusCode: 200 },
            { requestId: '2', url: 'https://example.com/api/submit', requestMethod: 'POST', statusCode: 404 },
            { requestId: '3', url: 'https://example.com/assets/style.css', requestMethod: 'GET', statusCode: 200 },
        ];
    }
    async wasShown() {
        super.wasShown();
        SDK.TargetManager.TargetManager.instance().addModelListener(SDK.ResourceTreeModel.ResourceTreeModel, SDK.ResourceTreeModel.Events.PrimaryPageChanged, this.#updateIpProtectionStatus, this);
        await this.#updateIpProtectionStatus();
    }
    willHide() {
        SDK.TargetManager.TargetManager.instance().removeModelListener(SDK.ResourceTreeModel.ResourceTreeModel, SDK.ResourceTreeModel.Events.PrimaryPageChanged, this.#updateIpProtectionStatus, this);
        super.willHide();
    }
    async #updateIpProtectionStatus() {
        const target = SDK.TargetManager.TargetManager.instance().primaryPageTarget();
        if (!target) {
            this.#status = null;
            this.requestUpdate();
            return;
        }
        const model = target.model(SDK.NetworkManager.NetworkManager);
        if (!model) {
            this.#status = null;
            this.requestUpdate();
            return;
        }
        const status = await model.getIpProtectionProxyStatus();
        this.#status = status;
        this.requestUpdate();
    }
    get proxyRequests() {
        return this.#proxyRequests;
    }
    performUpdate() {
        const input = { status: this.#status, proxyRequests: this.#proxyRequests };
        this.#view(input, this, this.contentElement);
    }
}
//# sourceMappingURL=IPProtectionView.js.map