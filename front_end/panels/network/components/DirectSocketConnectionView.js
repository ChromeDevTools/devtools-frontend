// Copyright 2025 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.
import * as Common from '../../../core/common/common.js';
import * as Host from '../../../core/host/host.js';
import * as i18n from '../../../core/i18n/i18n.js';
import * as SDK from '../../../core/sdk/sdk.js';
import * as UI from '../../../ui/legacy/legacy.js';
import * as Lit from '../../../ui/lit/lit.js';
import * as VisualLogging from '../../../ui/visual_logging/visual_logging.js';
import requestHeadersViewStyles from './RequestHeadersView.css.js';
const { render, html } = Lit;
const UIStrings = {
    /**
     * @description Section header for a list of the main aspects of a direct socket connection
     */
    general: 'General',
    /**
     * @description Section header for a list of the main aspects of a direct socket connection
     */
    options: 'Options',
    /**
     * @description Section header for a list of the main aspects of a direct socket connection
     */
    openInfo: 'Open Info',
    /**
     * @description Text in Connection info View of the Network panel
     */
    type: 'DirectSocket Type',
    /**
     * @description Text in Connection info View of the Network panel
     */
    errorMessage: 'Error message',
    /**
     * @description Text in Connection info View of the Network panel
     */
    status: 'Status',
    /**
     * @description Text in Connection info View of the Network panel
     */
    directSocketTypeTcp: 'TCP',
    /**
     * @description Text in Connection info View of the Network panel
     */
    directSocketTypeUdpConnected: 'UDP (connected)',
    /**
     * @description Text in Connection info View of the Network panel
     */
    directSocketTypeUdpBound: 'UDP (bound)',
    /**
     * @description Text in Connection info View of the Network panel
     */
    directSocketStatusOpening: 'Opening',
    /**
     * @description Text in Connection info View of the Network panel
     */
    directSocketStatusOpen: 'Open',
    /**
     * @description Text in Connection info View of the Network panel
     */
    directSocketStatusClosed: 'Closed',
    /**
     * @description Text in Connection info View of the Network panel
     */
    directSocketStatusAborted: 'Aborted',
    /**
     * @description Text in Connection info View of the Network panel
     */
    joinedMulticastGroups: 'joinedMulticastGroups',
};
const str_ = i18n.i18n.registerUIStrings('panels/network/components/DirectSocketConnectionView.ts', UIStrings);
const i18nString = i18n.i18n.getLocalizedString.bind(undefined, str_);
function getDirectSocketTypeString(type) {
    switch (type) {
        case SDK.NetworkRequest.DirectSocketType.TCP:
            return i18nString(UIStrings.directSocketTypeTcp);
        case SDK.NetworkRequest.DirectSocketType.UDP_BOUND:
            return i18nString(UIStrings.directSocketTypeUdpBound);
        case SDK.NetworkRequest.DirectSocketType.UDP_CONNECTED:
            return i18nString(UIStrings.directSocketTypeUdpConnected);
    }
}
function getDirectSocketStatusString(status) {
    switch (status) {
        case SDK.NetworkRequest.DirectSocketStatus.OPENING:
            return i18nString(UIStrings.directSocketStatusOpening);
        case SDK.NetworkRequest.DirectSocketStatus.OPEN:
            return i18nString(UIStrings.directSocketStatusOpen);
        case SDK.NetworkRequest.DirectSocketStatus.CLOSED:
            return i18nString(UIStrings.directSocketStatusClosed);
        case SDK.NetworkRequest.DirectSocketStatus.ABORTED:
            return i18nString(UIStrings.directSocketStatusAborted);
    }
}
export const CATEGORY_NAME_GENERAL = 'general';
export const CATEGORY_NAME_OPTIONS = 'options';
export const CATEGORY_NAME_OPEN_INFO = 'open-info';
export const DEFAULT_VIEW = (input, _output, target) => {
    function isCategoryOpen(name) {
        return input.openCategories.includes(name);
    }
    function renderCategory(name, title, content) {
        // clang-format off
        return html `
        <details
          class="direct-socket-category"
          ?open=${isCategoryOpen(name)}
          @toggle=${(e) => input.onToggleCategory(e, name)}
          jslog=${VisualLogging.sectionHeader(name).track({ click: true })}
          aria-label=${title}
        >
          <summary
            class="header"
            @keydown=${(e) => input.onSummaryKeyDown(e, name)}
          >
            <div class="header-grid-container">
              <div>
                ${title}
              </div>
              <div class="hide-when-closed"></div>
            </div>
          </summary>
          ${content}
        </details>
      `;
        // clang-format on
    }
    function renderRow(name, value, classNames) {
        if (!value) {
            return Lit.nothing;
        }
        return html `
        <div class="row">
          <div class="header-name">${name}:</div>
          <div
            class="header-value ${classNames?.join(' ')}"
            @copy=${() => input.onCopyRow()}
          >${value}</div>
        </div>
      `;
    }
    const socketInfo = input.socketInfo;
    const generalContent = html `
      <div jslog=${VisualLogging.section(CATEGORY_NAME_GENERAL)}>
        ${renderRow(i18nString(UIStrings.type), getDirectSocketTypeString(socketInfo.type))}
        ${renderRow(i18nString(UIStrings.status), getDirectSocketStatusString(socketInfo.status))}
        ${renderRow(i18nString(UIStrings.errorMessage), socketInfo.errorMessage)}
        ${renderRow(i18nString(UIStrings.joinedMulticastGroups), socketInfo.joinedMulticastGroups ? Array.from(socketInfo.joinedMulticastGroups).join(', ') : '')}
      </div>`;
    const optionsContent = html `
      <div jslog=${VisualLogging.section(CATEGORY_NAME_OPTIONS)}>
        ${renderRow(i18n.i18n.lockedString('remoteAddress'), socketInfo.createOptions.remoteAddr)}
        ${renderRow(i18n.i18n.lockedString('remotePort'), socketInfo.createOptions.remotePort?.toString(10))}
        ${renderRow(i18n.i18n.lockedString('localAddress'), socketInfo.createOptions.localAddr)}
        ${renderRow(i18n.i18n.lockedString('localPort'), socketInfo.createOptions.localPort?.toString(10))}
        ${renderRow(i18n.i18n.lockedString('noDelay'), socketInfo.createOptions.noDelay?.toString())}
        ${renderRow(i18n.i18n.lockedString('keepAliveDelay'), socketInfo.createOptions.keepAliveDelay?.toString(10))}
        ${renderRow(i18n.i18n.lockedString('sendBufferSize'), socketInfo.createOptions.sendBufferSize?.toString(10))}
        ${renderRow(i18n.i18n.lockedString('receiveBufferSize'), socketInfo.createOptions.receiveBufferSize?.toString(10))}
        ${renderRow(i18n.i18n.lockedString('dnsQueryType'), socketInfo.createOptions.dnsQueryType)}
        ${renderRow(i18n.i18n.lockedString('multicastTimeToLive'), socketInfo.createOptions.multicastTimeToLive?.toString(10))}
        ${renderRow(i18n.i18n.lockedString('multicastLoopback'), socketInfo.createOptions.multicastLoopback?.toString())}
        ${renderRow(i18n.i18n.lockedString('multicastAllowAddressSharing'), socketInfo.createOptions.multicastAllowAddressSharing?.toString())}
      </div>`;
    let openInfoContent = Lit.nothing;
    if (socketInfo.openInfo) {
        openInfoContent = html `
          <div jslog=${VisualLogging.section(CATEGORY_NAME_OPEN_INFO)}>
            ${renderRow(i18n.i18n.lockedString('remoteAddress'), socketInfo.openInfo.remoteAddr)}
            ${renderRow(i18n.i18n.lockedString('remotePort'), socketInfo.openInfo?.remotePort?.toString(10))}
            ${renderRow(i18n.i18n.lockedString('localAddress'), socketInfo.openInfo.localAddr)}
            ${renderRow(i18n.i18n.lockedString('localPort'), socketInfo.openInfo?.localPort?.toString(10))}
          </div>`;
    }
    // clang-format off
    render(html `
    <style>${UI.inspectorCommonStyles}</style>
    <style>${requestHeadersViewStyles}</style>
    ${renderCategory(CATEGORY_NAME_GENERAL, i18nString(UIStrings.general), generalContent)}
    ${renderCategory(CATEGORY_NAME_OPTIONS, i18nString(UIStrings.options), optionsContent)}
    ${socketInfo.openInfo ? renderCategory(CATEGORY_NAME_OPEN_INFO, i18nString(UIStrings.openInfo), openInfoContent) : Lit.nothing}
  `, target);
    // clang-format on
};
export class DirectSocketConnectionView extends UI.Widget.Widget {
    #request;
    #view;
    constructor(request, view = DEFAULT_VIEW) {
        super({
            jslog: `${VisualLogging.pane('connection-info').track({ resize: true })}`,
            useShadowDom: true,
        });
        this.#request = request;
        this.#view = view;
        this.performUpdate();
    }
    wasShown() {
        super.wasShown();
        this.#request.addEventListener(SDK.NetworkRequest.Events.TIMING_CHANGED, this.requestUpdate, this);
    }
    willHide() {
        super.willHide();
        this.#request.removeEventListener(SDK.NetworkRequest.Events.TIMING_CHANGED, this.requestUpdate, this);
    }
    performUpdate() {
        if (!this.#request || !this.#request.directSocketInfo) {
            return;
        }
        const openCategories = [CATEGORY_NAME_GENERAL, CATEGORY_NAME_OPTIONS, CATEGORY_NAME_OPEN_INFO].filter(value => {
            return this.#getCategorySetting(value).get();
        }, this);
        const viewInput = {
            socketInfo: this.#request.directSocketInfo,
            openCategories,
            onSummaryKeyDown: (event, categoryName) => {
                if (!event.target) {
                    return;
                }
                const summaryElement = event.target;
                const detailsElement = summaryElement.parentElement;
                if (!detailsElement) {
                    throw new Error('<details> element is not found for a <summary> element');
                }
                let shouldBeOpen;
                switch (event.key) {
                    case 'ArrowLeft':
                        shouldBeOpen = false;
                        break;
                    case 'ArrowRight':
                        shouldBeOpen = true;
                        break;
                    default:
                        return;
                }
                if (detailsElement.open !== shouldBeOpen) {
                    this.#setIsOpen(categoryName, shouldBeOpen);
                }
            },
            onToggleCategory: (event, categoryName) => {
                const detailsElement = event.target;
                this.#setIsOpen(categoryName, detailsElement.open);
            },
            onCopyRow: () => {
                Host.userMetrics.actionTaken(Host.UserMetrics.Action.NetworkPanelCopyValue);
            }
        };
        this.#view(viewInput, undefined, this.contentElement);
    }
    #setIsOpen(categoryName, open) {
        const setting = this.#getCategorySetting(categoryName);
        setting.set(open);
        this.requestUpdate();
    }
    #getCategorySetting(name) {
        return Common.Settings.Settings.instance().createSetting(`connection-info-${name}-category-expanded`, /* defaultValue= */ true);
    }
}
//# sourceMappingURL=DirectSocketConnectionView.js.map