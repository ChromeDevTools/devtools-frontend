// Copyright 2022 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as Host from '../../../core/host/host.js';
import * as i18n from '../../../core/i18n/i18n.js';
import * as Platform from '../../../core/platform/platform.js';
import * as Buttons from '../../../ui/components/buttons/buttons.js';
import * as ComponentHelpers from '../../../ui/components/helpers/helpers.js';
import * as IconButton from '../../../ui/components/icon_button/icon_button.js';
import * as Input from '../../../ui/components/input/input.js';
// inspectorCommonStyles is imported for the chrome-select class that is used for the dropdown
// eslint-disable-next-line rulesdir/es_modules_import
import inspectorCommonStyles from '../../../ui/legacy/inspectorCommon.css.js';
import * as UI from '../../../ui/legacy/legacy.js';
import * as LitHtml from '../../../ui/lit-html/lit-html.js';

import protocolHandlersViewStyles from './protocolHandlersView.css.js';

const PROTOCOL_DOCUMENT_URL = 'https://web.dev/url-protocol-handler/';
const UIStrings = {
  /**
   *@description Status message for when protocol handlers are detected in the manifest
   *@example {protocolhandler/manifest.json} PH1
   */
  protocolDetected:
      'Found valid protocol handler registration in the {PH1}. With the app installed, test the registered protocols.',
  /**
   *@description Status message for when protocol handlers are not detected in the manifest
   *@example {protocolhandler/manifest.json} PH1
   */
  protocolNotDetected:
      'Define protocol handlers in the {PH1} to register your app as a handler for custom protocols when your app is installed.',
  /**
   *@description Text wrapping a link pointing to more information on handling protocol handlers
   *@example {https://example.com/} PH1
   */
  needHelpReadOur: 'Need help? Read {PH1}.',
  /**
   *@description Link text for more information on URL protocol handler registrations for PWAs
   */
  protocolHandlerRegistrations: 'URL protocol handler registration for PWAs',
  /**
   *@description In text hyperlink to the PWA manifest
   */
  manifest: 'manifest',
  /**
   *@description Text for test protocol button
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

interface HTMLSelectElementEvent extends Event {
  target: HTMLSelectElement;
}

interface HTMLInputElementEvent extends Event {
  target: HTMLInputElement;
}

export interface ProtocolHandler {
  protocol: string;
  url: string;
}

export interface ProtocolHandlersData {
  protocolHandlers: ProtocolHandler[];
  manifestLink: Platform.DevToolsPath.UrlString;
}

export class ProtocolHandlersView extends HTMLElement {
  static readonly litTagName = LitHtml.literal`devtools-protocol-handlers-view`;
  readonly #shadow = this.attachShadow({mode: 'open'});
  #protocolHandlers: ProtocolHandler[] = [];
  #manifestLink: Platform.DevToolsPath.UrlString = Platform.DevToolsPath.EmptyUrlString;
  #selectedProtocolState: string = '';
  #queryInputState: string = '';

  set data(data: ProtocolHandlersData) {
    const isNewManifest = this.#manifestLink !== data.manifestLink;
    this.#protocolHandlers = data.protocolHandlers;
    this.#manifestLink = data.manifestLink;
    if (isNewManifest) {
      this.#update();
    }
  }

  #update(): void {
    this.#queryInputState = '';
    this.#selectedProtocolState = this.#protocolHandlers[0]?.protocol ?? '';
    this.#render();
  }

  #renderStatusMessage(): LitHtml.TemplateResult {
    const manifestInTextLink = UI.XLink.XLink.create(this.#manifestLink, i18nString(UIStrings.manifest));
    const statusString = this.#protocolHandlers.length > 0 ? UIStrings.protocolDetected : UIStrings.protocolNotDetected;
    const iconData: IconButton.Icon.IconData = {
      iconName: this.#protocolHandlers.length > 0 ? 'ic_checkmark_16x16' : 'ic_info_black_18dp',
      color: this.#protocolHandlers.length > 0 ? 'var( --color-ic-file-image)' : 'var(--color-link)',
      width: '16px',
    };
    return LitHtml.html`
    <div class="protocol-handlers-row status">
            <${IconButton.Icon.Icon.litTagName} class="inline-icon" .data=${iconData as IconButton.Icon.IconData}>
            </${IconButton.Icon.Icon.litTagName}>
            ${i18n.i18n.getFormatLocalizedString(str_, statusString, {
      PH1: manifestInTextLink,
    })}
    </div>
    `;
  }

  #renderProtocolTest(): LitHtml.LitTemplate {
    if (this.#protocolHandlers.length === 0) {
      return LitHtml.nothing;
    }
    const protocolOptions = this.#protocolHandlers.filter(p => p.protocol)
                                .map(p => LitHtml.html`<option value=${p.protocol}>${p.protocol}://</option>`);
    return LitHtml.html`
       <div class="protocol-handlers-row">
        <select class="chrome-select protocol-select" @change=${this.#handleProtocolSelect} aria-label=${
        i18nString(UIStrings.dropdownLabel)}>
           ${protocolOptions}
        </select>
        <input .value=${this.#queryInputState} class="devtools-text-input" type="text" @change=${
        this.#handleQueryInputChange} aria-label=${i18nString(UIStrings.textboxLabel)}
        placeholder=${i18nString(UIStrings.textboxPlaceholder)}/>
        <${Buttons.Button.Button.litTagName} .variant=${Buttons.Button.Variant.PRIMARY} @click=${
        this.#handleTestProtocolClick}>
            ${i18nString(UIStrings.testProtocol)}
        </${Buttons.Button.Button.litTagName}>
        </div>
      `;
  }

  #handleProtocolSelect = (evt: HTMLSelectElementEvent): void => {
    this.#selectedProtocolState = evt.target.value;
  };

  #handleQueryInputChange = (evt: HTMLInputElementEvent): void => {
    this.#queryInputState = evt.target.value;
    this.#render();
  };

  #handleTestProtocolClick = (): void => {
    const protocolURL = `${this.#selectedProtocolState}://${this.#queryInputState}` as Platform.DevToolsPath.UrlString;
    Host.InspectorFrontendHost.InspectorFrontendHostInstance.openInNewTab(protocolURL);
    Host.userMetrics.actionTaken(Host.UserMetrics.Action.CaptureTestProtocolClicked);
  };

  connectedCallback(): void {
    this.#shadow.adoptedStyleSheets = [
      protocolHandlersViewStyles,
      inspectorCommonStyles,
      Input.textInputStyles,
    ];
  }

  #render(): void {
    const protocolDocLink =
        UI.XLink.XLink.create(PROTOCOL_DOCUMENT_URL, i18nString(UIStrings.protocolHandlerRegistrations));
    // clang-format off
    LitHtml.render(LitHtml.html`
      ${this.#renderStatusMessage()}
      <div class="protocol-handlers-row">
          ${i18n.i18n.getFormatLocalizedString(str_, UIStrings.needHelpReadOur, {PH1: protocolDocLink})}
      </div>
      ${this.#renderProtocolTest()}
    `, this.#shadow, {host: this});
    // clang-format on
  }
}

ComponentHelpers.CustomElements.defineComponent('devtools-protocol-handlers-view', ProtocolHandlersView);

declare global {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  interface HTMLElementTagNameMap {
    'devtools-protocol-handlers-view': ProtocolHandlersView;
  }
}
