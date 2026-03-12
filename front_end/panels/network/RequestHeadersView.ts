// Copyright 2022 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.
import '../../ui/kit/kit.js';

import * as Common from '../../core/common/common.js';
import * as Host from '../../core/host/host.js';
import * as i18n from '../../core/i18n/i18n.js';
import * as Platform from '../../core/platform/platform.js';
import * as SDK from '../../core/sdk/sdk.js';
import * as Persistence from '../../models/persistence/persistence.js';
import * as Workspace from '../../models/workspace/workspace.js';
import * as NetworkForward from '../../panels/network/forward/forward.js';
import * as Input from '../../ui/components/input/input.js';
import * as UI from '../../ui/legacy/legacy.js';
import * as Lit from '../../ui/lit/lit.js';
import * as VisualLogging from '../../ui/visual_logging/visual_logging.js';
import * as Sources from '../sources/sources.js';

import * as NetworkComponents from './components/components.js';
import {ShowMoreDetailsWidget} from './ShowMoreDetailsWidget.js';

const {render, html} = Lit;
const {widget} = UI.Widget;

const UIStrings = {
  /**
   * @description Text in Request Headers View of the Network panel
   */
  fromDiskCache: '(from disk cache)',
  /**
   * @description Text in Request Headers View of the Network panel
   */
  fromMemoryCache: '(from memory cache)',
  /**
   * @description Text in Request Headers View of the Network panel
   */
  fromEarlyHints: '(from early hints)',
  /**
   * @description Text in Request Headers View of the Network panel
   */
  fromPrefetchCache: '(from prefetch cache)',
  /**
   * @description Text in Request Headers View of the Network panel
   */
  fromServiceWorker: '(from `service worker`)',
  /**
   * @description Text in Request Headers View of the Network panel
   */
  fromSignedexchange: '(from signed-exchange)',
  /**
   * @description Section header for a list of the main aspects of a http request
   */
  general: 'General',
  /**
   * @description Label for a checkbox to switch between raw and parsed headers
   */
  raw: 'Raw',
  /**
   * @description Text in Request Headers View of the Network panel
   */
  referrerPolicy: 'Referrer Policy',
  /**
   * @description Text in Network Log View Columns of the Network panel
   */
  remoteAddress: 'Remote Address',
  /**
   * @description Text in Request Headers View of the Network panel
   */
  requestHeaders: 'Request Headers',
  /**
   * @description The HTTP method of a request
   */
  requestMethod: 'Request Method',
  /**
   * @description The URL of a request
   */
  requestUrl: 'Request URL',
  /**
   * @description A context menu item in the Network Log View Columns of the Network panel
   */
  responseHeaders: 'Response headers',
  /**
   * @description A context menu item in the Network Log View Columns of the Network panel
   */
  earlyHintsHeaders: 'Early hints headers',
  /**
   * @description Title text for a link to the Sources panel to the file containing the header override definitions
   */
  revealHeaderOverrides: 'Reveal header override definitions',
  /**
   * @description HTTP response code
   */
  statusCode: 'Status Code',
} as const;
const str_ = i18n.i18n.registerUIStrings('panels/network/RequestHeadersView.ts', UIStrings);
const i18nString = i18n.i18n.getLocalizedString.bind(undefined, str_);

interface ViewInput {
  showRequestHeadersText: boolean;
  showResponseHeadersText: boolean;
  request: SDK.NetworkRequest.NetworkRequest;
  toggleShowRawResponseHeaders: () => void;
  toggleShowRawRequestHeaders: () => void;
  revealHeadersFile?: () => void;
  toReveal?: {section: NetworkForward.UIRequestLocation.UIHeaderSection, header?: string};
}
type View = (input: ViewInput, output: object, target: HTMLElement) => void;
export const DEFAULT_VIEW: View = (input, output, target) => {
  const requestHeadersText = input.request.requestHeadersText();
  const statusClasses = ['status'];
  if (input.request.statusCode < 300 || input.request.statusCode === 304) {
    statusClasses.push('green-circle');
  } else if (input.request.statusCode < 400) {
    statusClasses.push('yellow-circle');
  } else {
    statusClasses.push('red-circle');
  }

  let comment = '';
  if (input.request.cachedInMemory()) {
    comment = i18nString(UIStrings.fromMemoryCache);
  } else if (input.request.fromEarlyHints()) {
    comment = i18nString(UIStrings.fromEarlyHints);
  } else if (input.request.fetchedViaServiceWorker) {
    comment = i18nString(UIStrings.fromServiceWorker);
  } else if (input.request.redirectSourceSignedExchangeInfoHasNoErrors()) {
    comment = i18nString(UIStrings.fromSignedexchange);
  } else if (input.request.fromPrefetchCache()) {
    comment = i18nString(UIStrings.fromPrefetchCache);
  } else if (input.request.cached()) {
    comment = i18nString(UIStrings.fromDiskCache);
  }

  if (comment) {
    statusClasses.push('status-with-comment');
  }

  const statusText = [input.request.statusCode, input.request.getInferredStatusText(), comment].join(' ');
  // clang-format off
  render(
      html`
        <style>${NetworkComponents.RequestHeaderSection.requestHeadersViewStyles}</style>
        <style>${Input.checkboxStyles}</style>
        ${renderCategory({
          name: 'general',
          title: i18nString(UIStrings.general),
          forceOpen: input.toReveal?.section === NetworkForward.UIRequestLocation.UIHeaderSection.GENERAL,
          loggingContext: 'general',
          contents: html`<div jslog=${VisualLogging.section('general')}>
            ${renderGeneralRow(input, i18nString(UIStrings.requestUrl), input.request.url(), 'request-url')}
            ${input.request.statusCode? renderGeneralRow(input, i18nString(UIStrings.requestMethod),
                input.request.requestMethod, 'request-method') : Lit.nothing}
            ${input.request.statusCode? renderGeneralRow(input, i18nString(UIStrings.statusCode),
                statusText, 'status-code', statusClasses) : Lit.nothing}
            ${input.request.remoteAddress()? renderGeneralRow(input, i18nString(UIStrings.remoteAddress),
                input.request.remoteAddress(), 'remote-address') : Lit.nothing}
            ${input.request.referrerPolicy()? renderGeneralRow(input, i18nString(UIStrings.referrerPolicy),
              String(input.request.referrerPolicy()), 'referrer-policy') : Lit.nothing}
            </div>`
        })}
        ${!input.request?.earlyHintsHeaders || input.request.earlyHintsHeaders.length === 0
          ? Lit.nothing
          : renderCategory({
            name: 'early-hints-headers',
            onToggleRawHeaders: input.toggleShowRawResponseHeaders,
            title: i18nString(UIStrings.earlyHintsHeaders),
            headerCount: input.request.earlyHintsHeaders.length,
            checked: undefined,
            additionalContent: undefined,
            forceOpen: input.toReveal?.section === NetworkForward.UIRequestLocation.UIHeaderSection.EARLY_HINTS,
            loggingContext: 'early-hints-headers',
            contents: input.showResponseHeadersText ?
              renderRawHeaders(input.request.responseHeadersText) :
              html`
            <devtools-early-hints-header-section .data=${
              {
                request: input.request,
                toReveal: input.toReveal,
              } as NetworkComponents.ResponseHeaderSection
              .ResponseHeaderSectionData}></devtools-early-hints-header-section>
              `
          })}
        ${renderCategory({
          name: 'response-headers',
          onToggleRawHeaders: input.toggleShowRawResponseHeaders,
          title: i18nString(UIStrings.responseHeaders),
          headerCount: input.request.sortedResponseHeaders.length,
          checked: input.request.responseHeadersText ? input.showResponseHeadersText : undefined,
          additionalContent: renderHeaderOverridesLink(input),
          forceOpen: input.toReveal?.section === NetworkForward.UIRequestLocation.UIHeaderSection.RESPONSE,
          loggingContext: 'response-headers',
          contents: input.showResponseHeadersText ?
            renderRawHeaders(input.request.responseHeadersText) :
            html`
          <devtools-response-header-section .data=${{
            request: input.request,
            toReveal: input.toReveal,
          } as NetworkComponents.ResponseHeaderSection.ResponseHeaderSectionData} jslog=${
            VisualLogging.section('response-headers')}></devtools-response-header-section>
            `
        })}
        ${renderCategory({
          name: 'request-headers',
          onToggleRawHeaders: input.toggleShowRawRequestHeaders,
          title: i18nString(UIStrings.requestHeaders),
          headerCount: input.request.requestHeaders().length,
          checked: requestHeadersText ? input.showRequestHeadersText : undefined,
          forceOpen: input.toReveal?.section === NetworkForward.UIRequestLocation.UIHeaderSection.REQUEST,
          loggingContext: 'request-headers',
          contents: (input.showRequestHeadersText && requestHeadersText) ?
            renderRawHeaders(requestHeadersText) :
            html`
          <devtools-widget ${widget(NetworkComponents.RequestHeaderSection.RequestHeaderSection, {
              request: input.request,
              toReveal: input.toReveal,
            })} jslog=${VisualLogging.section('request-headers')}></devtools-widget>`
        })}
      `,
      // clang-format on
      target);
};

export class RequestHeadersView extends UI.Widget.Widget {
  #request?: SDK.NetworkRequest.NetworkRequest;
  #showResponseHeadersText = false;
  #showRequestHeadersText = false;
  #toReveal?: {section: NetworkForward.UIRequestLocation.UIHeaderSection, header?: string} = undefined;
  readonly #workspace = Workspace.Workspace.WorkspaceImpl.instance();
  #view: View;
  get request(): SDK.NetworkRequest.NetworkRequest|undefined {
    return this.#request;
  }

  set request(val) {
    this.#removeEventListeners();
    this.#request = val;
    this.#addEventListeners();
  }

  constructor(target?: HTMLElement, view = DEFAULT_VIEW) {
    super({jslog: `${VisualLogging.pane('headers').track({resize: true})}`});
    this.#view = view;
  }

  #addEventListeners(): void {
    this.#request?.addEventListener(SDK.NetworkRequest.Events.REMOTE_ADDRESS_CHANGED, this.#refreshHeadersView, this);
    this.#request?.addEventListener(SDK.NetworkRequest.Events.FINISHED_LOADING, this.#refreshHeadersView, this);
    this.#request?.addEventListener(SDK.NetworkRequest.Events.REQUEST_HEADERS_CHANGED, this.#refreshHeadersView, this);
    this.#request?.addEventListener(
        SDK.NetworkRequest.Events.RESPONSE_HEADERS_CHANGED, this.#resetAndRefreshHeadersView, this);
    this.#workspace.addEventListener(
        Workspace.Workspace.Events.UISourceCodeAdded, this.#uiSourceCodeAddedOrRemoved, this);
    this.#workspace.addEventListener(
        Workspace.Workspace.Events.UISourceCodeRemoved, this.#uiSourceCodeAddedOrRemoved, this);
    Common.Settings.Settings.instance()
        .moduleSetting('persistence-network-overrides-enabled')
        .addChangeListener(this.requestUpdate, this);
  }

  override wasShown(): void {
    super.wasShown();
    this.#addEventListeners();
    this.#toReveal = undefined;
    this.#refreshHeadersView();
  }

  override willHide(): void {
    super.willHide();
    this.#removeEventListeners();
  }

  #removeEventListeners(): void {
    this.#request?.removeEventListener(
        SDK.NetworkRequest.Events.REMOTE_ADDRESS_CHANGED, this.#refreshHeadersView, this);
    this.#request?.removeEventListener(SDK.NetworkRequest.Events.FINISHED_LOADING, this.#refreshHeadersView, this);
    this.#request?.removeEventListener(
        SDK.NetworkRequest.Events.REQUEST_HEADERS_CHANGED, this.#refreshHeadersView, this);
    this.#request?.removeEventListener(
        SDK.NetworkRequest.Events.RESPONSE_HEADERS_CHANGED, this.#resetAndRefreshHeadersView, this);
    this.#workspace.removeEventListener(
        Workspace.Workspace.Events.UISourceCodeAdded, this.#uiSourceCodeAddedOrRemoved, this);
    this.#workspace.removeEventListener(
        Workspace.Workspace.Events.UISourceCodeRemoved, this.#uiSourceCodeAddedOrRemoved, this);
    Common.Settings.Settings.instance()
        .moduleSetting('persistence-network-overrides-enabled')
        .removeChangeListener(this.requestUpdate, this);
  }

  #resetAndRefreshHeadersView(): void {
    this.#request?.deleteAssociatedData(NetworkComponents.ResponseHeaderSection.RESPONSE_HEADER_SECTION_DATA_KEY);
    this.requestUpdate();
  }

  #refreshHeadersView(): void {
    this.requestUpdate();
  }

  revealHeader(section: NetworkForward.UIRequestLocation.UIHeaderSection, header?: string): void {
    this.#toReveal = {section, header};
    this.requestUpdate();
  }

  #uiSourceCodeAddedOrRemoved(event: Common.EventTarget.EventTargetEvent<Workspace.UISourceCode.UISourceCode>): void {
    if (this.#getHeaderOverridesFileUrl() === event.data.url()) {
      this.requestUpdate();
    }
  }

  override performUpdate(): void {
    if (!this.#request) {
      return;
    }

    let revealHeadersFile;
    const uiSourceCode = this.#workspace.uiSourceCodeForURL(this.#getHeaderOverridesFileUrl());
    if (uiSourceCode) {
      revealHeadersFile = (): void => {
        Sources.SourcesPanel.SourcesPanel.instance().showUISourceCode(uiSourceCode);
        void Sources.SourcesPanel.SourcesPanel.instance().revealInNavigator(uiSourceCode);
      };
    }
    const input: ViewInput = {
      toggleShowRawResponseHeaders: (): void => {
        this.#showResponseHeadersText = !this.#showResponseHeadersText;
        this.requestUpdate();
      },
      toggleShowRawRequestHeaders: (): void => {
        this.#showRequestHeadersText = !this.#showRequestHeadersText;
        this.requestUpdate();
      },
      revealHeadersFile,
      request: this.#request,
      toReveal: this.#toReveal,
      showResponseHeadersText: this.#showResponseHeadersText,
      showRequestHeadersText: this.#showRequestHeadersText,
    };

    this.#view(input, {}, this.contentElement);
  }

  #getHeaderOverridesFileUrl(): Platform.DevToolsPath.UrlString {
    if (!this.#request) {
      return Platform.DevToolsPath.EmptyUrlString;
    }
    const fileUrl = Persistence.NetworkPersistenceManager.NetworkPersistenceManager.instance().fileUrlFromNetworkUrl(
        this.#request.url(), /* ignoreInactive */ true);
    return fileUrl.substring(0, fileUrl.lastIndexOf('/')) + '/' +
        Persistence.NetworkPersistenceManager.HEADERS_FILENAME as Platform.DevToolsPath.UrlString;
  }
}

function renderHeaderOverridesLink(input: ViewInput): Lit.LitTemplate {
  if (!input.revealHeadersFile) {
    return Lit.nothing;
  }

  const revealHeadersFile = (event: Event): void => {
    event.preventDefault();
    input.revealHeadersFile?.();
  };
  const overridesSetting: Common.Settings.Setting<boolean> =
      Common.Settings.Settings.instance().moduleSetting('persistence-network-overrides-enabled');
  // Disabled until https://crbug.com/1079231 is fixed.
  // clang-format off
    const fileIcon = html`
      <devtools-icon name="document" class=${'medium' + overridesSetting.get() ? 'inline-icon dot purple': 'inline-icon'}>
      </devtools-icon>`;
  // clang-format on

  // Disabled until https://crbug.com/1079231 is fixed.
  // clang-format off
    return html`
      <devtools-link
          href="https://goo.gle/devtools-override"
          class="link devtools-link"
          jslogcontext="devtools-override"
      >
        <devtools-icon name="help" class="inline-icon medium">
        </devtools-icon>
      </devtools-link>
      <devtools-link
          @click=${revealHeadersFile}
          class="link devtools-link"
          title=${UIStrings.revealHeaderOverrides}
          jslogcontext="reveal-header-overrides"
      >
        ${fileIcon}${Persistence.NetworkPersistenceManager.HEADERS_FILENAME}
      </devtools-link>
    `;
  // clang-format on
}

function renderRawHeaders(text: string): Lit.TemplateResult {
  return html`<div class="row raw-headers-row"><devtools-widget  class=raw-headers
      ${widget(ShowMoreDetailsWidget, {text})}></devtools-widget></div>`;
}

function renderGeneralRow(
    input: ViewInput, name: Common.UIString.LocalizedString, value: string, id: string,
    classNames?: string[]): Lit.LitTemplate {
  const isHighlighted = input.toReveal?.section === NetworkForward.UIRequestLocation.UIHeaderSection.GENERAL &&
      name.toLowerCase() === input.toReveal?.header?.toLowerCase();
  return html`
      <div class="row ${isHighlighted ? 'header-highlight' : ''}">
        <div class="header-name">${name}</div>
        <div
          id=${id}
          class="header-value ${classNames?.join(' ')}"
          @copy=${() => Host.userMetrics.actionTaken(Host.UserMetrics.Action.NetworkPanelCopyValue)}
        >${value}</div>
      </div>
    `;
}

export function renderCategory(data: {
  name: string,
  title: Common.UIString.LocalizedString,
  contents: Lit.LitTemplate,
  loggingContext: string,
  headerCount?: number,
  checked?: boolean,
  additionalContent?: Lit.LitTemplate,
  forceOpen?: boolean,
  onToggleRawHeaders?: () => void,
}): Lit.LitTemplate {
  const expandedSetting =
      Common.Settings.Settings.instance().createSetting('request-info-' + data.name + '-category-expanded', true);

  const isOpen = (expandedSetting ? expandedSetting.get() : true) || data.forceOpen;
  // Disabled until https://crbug.com/1079231 is fixed.
  // clang-format off
  return html`
      <details ?open=${isOpen} @toggle=${onToggle} aria-label=${data.title}>
        <summary
          class="header"
          @keydown=${onSummaryKeyDown}
          jslog=${VisualLogging.sectionHeader().track({click: true}).context(data.loggingContext)}
        >
          <div class="header-grid-container">
            <div>
              ${data.title}${data.headerCount !== undefined ?
                html`<span class="header-count"> (${data.headerCount})</span>` :
                Lit.nothing
              }
            </div>
            <div class="hide-when-closed">
              ${data.checked !== undefined ? html`
                <devtools-checkbox .checked=${data.checked} @change=${data.onToggleRawHeaders}
                         jslog=${VisualLogging.toggle('raw-headers').track({change: true})}>
                  ${i18nString(UIStrings.raw)}
              </devtools-checkbox>` : Lit.nothing}
            </div>
            <div class="hide-when-closed">${data.additionalContent}</div>
          </div>
        </summary>
        ${data.contents}
      </details>
    `;
  // clang-format on

  function onSummaryKeyDown(event: KeyboardEvent): void {
    if (!event.target) {
      return;
    }
    const summaryElement = event.target as HTMLElement;
    const detailsElement = summaryElement.parentElement as HTMLDetailsElement;
    if (!detailsElement) {
      throw new Error('<details> element is not found for a <summary> element');
    }
    switch (event.key) {
      case 'ArrowLeft':
        detailsElement.open = false;
        break;
      case 'ArrowRight':
        detailsElement.open = true;
        break;
    }
  }

  function onToggle(event: Event): void {
    expandedSetting?.set((event.target as HTMLDetailsElement).open);
  }
}
