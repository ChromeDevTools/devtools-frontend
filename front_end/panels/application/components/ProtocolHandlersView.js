// Copyright 2022 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.
/* eslint-disable @devtools/no-lit-render-outside-of-view */
import '../../../ui/components/icon_button/icon_button.js';
import * as Host from '../../../core/host/host.js';
import * as i18n from '../../../core/i18n/i18n.js';
import * as Platform from '../../../core/platform/platform.js';
import * as Buttons from '../../../ui/components/buttons/buttons.js';
import * as Input from '../../../ui/components/input/input.js';
import * as uiI18n from '../../../ui/i18n/i18n.js';
import * as UI from '../../../ui/legacy/legacy.js';
import * as Lit from '../../../ui/lit/lit.js';
import * as VisualLogging from '../../../ui/visual_logging/visual_logging.js';
import protocolHandlersViewStyles from './protocolHandlersView.css.js';
const { html } = Lit;
const PROTOCOL_DOCUMENT_URL = 'https://web.dev/url-protocol-handler/';
const UIStrings = {
    /**
     * @description Status message for when protocol handlers are detected in the manifest
     * @example {protocolhandler/manifest.json} PH1
     */
    protocolDetected: 'Found valid protocol handler registration in the {PH1}. With the app installed, test the registered protocols.',
    /**
     * @description Status message for when protocol handlers are not detected in the manifest
     * @example {protocolhandler/manifest.json} PH1
     */
    protocolNotDetected: 'Define protocol handlers in the {PH1} to register your app as a handler for custom protocols when your app is installed.',
    /**
     * @description Text wrapping a link pointing to more information on handling protocol handlers
     * @example {https://example.com/} PH1
     */
    needHelpReadOur: 'Need help? Read {PH1}.',
    /**
     * @description Link text for more information on URL protocol handler registrations for PWAs
     */
    protocolHandlerRegistrations: 'URL protocol handler registration for PWAs',
    /**
     * @description In text hyperlink to the PWA manifest
     */
    manifest: 'manifest',
    /**
     * @description Text for test protocol button
     */
    testProtocol: 'Test protocol',
    /**
     * @description Aria text for screen reader to announce they can select a protocol handler in the dropdown
     */
    dropdownLabel: 'Select protocol handler',
    /**
     * @description Aria text for screen reader to announce they can enter query parameters or endpoints into the textbox
     */
    textboxLabel: 'Query parameter or endpoint for protocol handler',
    /**
     * @description Placeholder for textbox input field, rest of the URL of protocol to test.
     */
    textboxPlaceholder: 'Enter URL',
};
const str_ = i18n.i18n.registerUIStrings('panels/application/components/ProtocolHandlersView.ts', UIStrings);
const i18nString = i18n.i18n.getLocalizedString.bind(undefined, str_);
export class ProtocolHandlersView extends HTMLElement {
    #shadow = this.attachShadow({ mode: 'open' });
    #protocolHandlers = [];
    #manifestLink = Platform.DevToolsPath.EmptyUrlString;
    #selectedProtocolState = '';
    #queryInputState = '';
    set data(data) {
        const isNewManifest = this.#manifestLink !== data.manifestLink;
        this.#protocolHandlers = data.protocolHandlers;
        this.#manifestLink = data.manifestLink;
        if (isNewManifest) {
            this.#update();
        }
    }
    #update() {
        this.#queryInputState = '';
        this.#selectedProtocolState = this.#protocolHandlers[0]?.protocol ?? '';
        this.#render();
    }
    #renderStatusMessage() {
        const manifestInTextLink = UI.XLink.XLink.create(this.#manifestLink, i18nString(UIStrings.manifest), undefined, undefined, 'manifest');
        const statusString = this.#protocolHandlers.length > 0 ? UIStrings.protocolDetected : UIStrings.protocolNotDetected;
        // clang-format off
        return html `
    <div class="protocol-handlers-row status">
            <devtools-icon class="inline-icon"
                           name=${this.#protocolHandlers.length > 0 ? 'check-circle' : 'info'}>
            </devtools-icon>
            ${uiI18n.getFormatLocalizedString(str_, statusString, {
            PH1: manifestInTextLink,
        })}
    </div>
    `;
        // clang-format on
    }
    #renderProtocolTest() {
        if (this.#protocolHandlers.length === 0) {
            return Lit.nothing;
        }
        const protocolOptions = this.#protocolHandlers.filter(p => p.protocol)
            .map(p => html `<option value=${p.protocol} jslog=${VisualLogging.item(p.protocol).track({
            click: true,
        })}>${p.protocol}://</option>`);
        return html `
       <div class="protocol-handlers-row">
        <select class="protocol-select" @change=${this.#handleProtocolSelect} aria-label=${i18nString(UIStrings.dropdownLabel)}>
           ${protocolOptions}
        </select>
        <input .value=${this.#queryInputState} class="devtools-text-input" type="text" @change=${this.#handleQueryInputChange} aria-label=${i18nString(UIStrings.textboxLabel)}
        placeholder=${i18nString(UIStrings.textboxPlaceholder)} />
        <devtools-button .variant=${"primary" /* Buttons.Button.Variant.PRIMARY */} @click=${this.#handleTestProtocolClick}>
            ${i18nString(UIStrings.testProtocol)}
        </devtools-button>
        </div>
      `;
    }
    #handleProtocolSelect = (evt) => {
        this.#selectedProtocolState = evt.target.value;
    };
    #handleQueryInputChange = (evt) => {
        this.#queryInputState = evt.target.value;
        this.#render();
    };
    #handleTestProtocolClick = () => {
        const protocolURL = `${this.#selectedProtocolState}://${this.#queryInputState}`;
        Host.InspectorFrontendHost.InspectorFrontendHostInstance.openInNewTab(protocolURL);
        Host.userMetrics.actionTaken(Host.UserMetrics.Action.CaptureTestProtocolClicked);
    };
    #render() {
        const protocolDocLink = UI.XLink.XLink.create(PROTOCOL_DOCUMENT_URL, i18nString(UIStrings.protocolHandlerRegistrations), undefined, undefined, 'learn-more');
        // inspectorCommonStyles is used for the <select> styling that is used for the dropdown
        // clang-format off
        Lit.render(html `
      <style>${protocolHandlersViewStyles}</style>
      <style>${UI.inspectorCommonStyles}</style>
      <style>${Input.textInputStyles}</style>
      ${this.#renderStatusMessage()}
      <div class="protocol-handlers-row">
          ${uiI18n.getFormatLocalizedString(str_, UIStrings.needHelpReadOur, { PH1: protocolDocLink })}
      </div>
      ${this.#renderProtocolTest()}
    `, this.#shadow, { host: this });
        // clang-format on
    }
}
customElements.define('devtools-protocol-handlers-view', ProtocolHandlersView);
//# sourceMappingURL=ProtocolHandlersView.js.map