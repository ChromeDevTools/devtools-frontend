// Copyright 2022 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import '../../../ui/components/icon_button/icon_button.js';

import * as Host from '../../../core/host/host.js';
import * as i18n from '../../../core/i18n/i18n.js';
import * as Platform from '../../../core/platform/platform.js';
import * as Buttons from '../../../ui/components/buttons/buttons.js';
import * as Input from '../../../ui/components/input/input.js';
import * as uiI18n from '../../../ui/i18n/i18n.js';
import * as UI from '../../../ui/legacy/legacy.js';
import {
  html,
  i18nTemplate as unboundI18nTemplate,
  type LitTemplate,
  nothing,
  render,
  type TemplateResult
} from '../../../ui/lit/lit.js';
import * as VisualLogging from '../../../ui/visual_logging/visual_logging.js';

import protocolHandlersViewStyles from './protocolHandlersView.css.js';

const PROTOCOL_DOCUMENT_URL = 'https://web.dev/url-protocol-handler/';
const UIStrings = {
  /**
   * @description Status message for when protocol handlers are detected in the manifest
   * @example {protocolhandler/manifest.json} PH1
   */
  protocolDetected:
      'Found valid protocol handler registration in the {PH1}. With the app installed, test the registered protocols.',
  /**
   * @description Status message for when protocol handlers are not detected in the manifest
   * @example {protocolhandler/manifest.json} PH1
   */
  protocolNotDetected:
      'Define protocol handlers in the {PH1} to register your app as a handler for custom protocols when your app is installed.',
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
} as const;

const str_ = i18n.i18n.registerUIStrings('panels/application/components/ProtocolHandlersView.ts', UIStrings);
const i18nString = i18n.i18n.getLocalizedString.bind(undefined, str_);
const i18nTemplate = unboundI18nTemplate.bind(undefined, str_);

function renderStatusMessage(
    protocolHandlers: readonly ProtocolHandler[], manifestLink: Platform.DevToolsPath.UrlString): TemplateResult {
  const manifestInTextLink =
      UI.XLink.XLink.create(manifestLink, i18nString(UIStrings.manifest), undefined, undefined, 'manifest');
  const statusString = protocolHandlers.length > 0 ? UIStrings.protocolDetected : UIStrings.protocolNotDetected;
  // clang-format off
  return html`
    <div class="protocol-handlers-row status">
      <devtools-icon class="inline-icon"
                     name=${protocolHandlers.length > 0 ? 'check-circle' : 'info'}>
      </devtools-icon>
      ${uiI18n.getFormatLocalizedString(str_, statusString, {PH1: manifestInTextLink })}
    </div>`;
  // clang-format on
}

function renderProtocolTest(
    protocolHandlers: readonly ProtocolHandler[], queryInputState: string,
    protocolSelectHandler: (evt: HTMLSelectElementEvent) => void,
    queryInputChangeHandler: (evt: HTMLInputElementEvent) => void, testProtocolClickHandler: () => void): LitTemplate {
  if (protocolHandlers.length === 0) {
    return nothing;
  }
  // clang-format off
  return html`
    <div class="protocol-handlers-row">
      <select class="protocol-select" @change=${protocolSelectHandler}
              aria-label=${i18nString(UIStrings.dropdownLabel)}>
        ${protocolHandlers.filter(p => p.protocol).map(({protocol}) => html`
          <option value=${protocol} jslog=${VisualLogging.item(protocol).track({click: true})}>
            ${protocol}://
          </option>`)}
      </select>
      <input .value=${queryInputState} class="devtools-text-input" type="text"
             @change=${queryInputChangeHandler} aria-label=${i18nString(UIStrings.textboxLabel)}
             placeholder=${i18nString(UIStrings.textboxPlaceholder)} />
      <devtools-button .variant=${Buttons.Button.Variant.PRIMARY} @click=${testProtocolClickHandler}>
        ${i18nString(UIStrings.testProtocol)}
      </devtools-button>
    </div>`;
  // clang-format on
}

interface HTMLSelectElementEvent extends Event {
  target: HTMLSelectElement;
}

interface HTMLInputElementEvent extends Event {
  target: HTMLInputElement;
}

interface ViewInput {
  protocolHandler: ProtocolHandler[];
  manifestLink: Platform.DevToolsPath.UrlString;
  queryInputState: string;
  protocolSelectHandler: (evt: HTMLSelectElementEvent) => void;
  queryInputChangeHandler: (evt: HTMLInputElementEvent) => void;
  testProtocolClickHandler: () => void;
}

type View = (input: ViewInput, output: undefined, target: HTMLElement) => void;

const DEFAULT_VIEW: View = (input, _output, target) => {
  // inspectorCommonStyles is used for the <select> styling that is used for the dropdown
  // clang-format off
  render(html`
    <style>${protocolHandlersViewStyles}</style>
    <style>${UI.inspectorCommonStyles}</style>
    <style>${Input.textInputStyles}</style>
    ${renderStatusMessage(input.protocolHandler, input.manifestLink)}
    <div class="protocol-handlers-row">
      ${i18nTemplate(UIStrings.needHelpReadOur, {PH1: html`
        <x-link href=${PROTOCOL_DOCUMENT_URL} tabindex=0 class="devtools-link" jslog=${
            VisualLogging.link('learn-more').track({click: true, keydown: 'Enter|Space'})}>
          ${i18nString(UIStrings.protocolHandlerRegistrations)}
        </x-link>`})}
    </div>
    ${renderProtocolTest(input.protocolHandler, input.queryInputState, input.protocolSelectHandler,
                         input.queryInputChangeHandler, input.testProtocolClickHandler)}
  `, target);
  // clang-format on
};

export interface ProtocolHandler {
  protocol: string;
  url: string;
}

export interface ProtocolHandlersData {
  protocolHandlers: ProtocolHandler[];
  manifestLink: Platform.DevToolsPath.UrlString;
}

export class ProtocolHandlersView extends UI.Widget.Widget {
  #protocolHandlers: ProtocolHandler[] = [];
  #manifestLink: Platform.DevToolsPath.UrlString = Platform.DevToolsPath.EmptyUrlString;
  #selectedProtocolState = '';
  #queryInputState = '';
  #view: View;

  constructor(element?: HTMLElement, view: View = DEFAULT_VIEW) {
    super(element, {useShadowDom: false});
    this.#view = view;
  }

  set protocolHandlers(protocolHandlers: ProtocolHandler[]) {
    this.#protocolHandlers = protocolHandlers;
    this.requestUpdate();
  }

  get protocolHandlers(): ProtocolHandler[] {
    return this.#protocolHandlers;
  }

  set manifestLink(manifestLink: Platform.DevToolsPath.UrlString) {
    const isNewManifest = this.#manifestLink !== manifestLink;
    this.#manifestLink = manifestLink;
    if (isNewManifest) {
      this.#queryInputState = '';
      this.#selectedProtocolState = this.#protocolHandlers[0]?.protocol ?? '';
    }
    this.requestUpdate();
  }

  get manifestLink(): Platform.DevToolsPath.UrlString {
    return this.#manifestLink;
  }

  #handleProtocolSelect = (evt: HTMLSelectElementEvent): void => {
    this.#selectedProtocolState = evt.target.value;
  };

  #handleQueryInputChange = (evt: HTMLInputElementEvent): void => {
    this.#queryInputState = evt.target.value;
    this.requestUpdate();
  };

  #handleTestProtocolClick = (): void => {
    const protocolURL = `${this.#selectedProtocolState}://${this.#queryInputState}` as Platform.DevToolsPath.UrlString;
    Host.InspectorFrontendHost.InspectorFrontendHostInstance.openInNewTab(protocolURL);
    Host.userMetrics.actionTaken(Host.UserMetrics.Action.CaptureTestProtocolClicked);
  };

  override performUpdate(): void {
    this.#view(
        {
          protocolHandler: this.#protocolHandlers,
          manifestLink: this.#manifestLink,
          queryInputState: this.#queryInputState,
          protocolSelectHandler: this.#handleProtocolSelect,
          queryInputChangeHandler: this.#handleQueryInputChange,
          testProtocolClickHandler: this.#handleTestProtocolClick,
        },
        undefined, this.contentElement);
  }
}
