// Copyright 2022 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as Common from '../../../core/common/common.js';
import * as Host from '../../../core/host/host.js';
import * as i18n from '../../../core/i18n/i18n.js';
import * as Platform from '../../../core/platform/platform.js';
import * as Root from '../../../core/root/root.js';
import * as SDK from '../../../core/sdk/sdk.js';
import * as Persistence from '../../../models/persistence/persistence.js';
import * as Workspace from '../../../models/workspace/workspace.js';
import * as NetworkForward from '../../../panels/network/forward/forward.js';
import * as Buttons from '../../../ui/components/buttons/buttons.js';
import * as ComponentHelpers from '../../../ui/components/helpers/helpers.js';
import * as IconButton from '../../../ui/components/icon_button/icon_button.js';
import * as Input from '../../../ui/components/input/input.js';
import * as UI from '../../../ui/legacy/legacy.js';
import * as LitHtml from '../../../ui/lit-html/lit-html.js';
import * as Sources from '../../sources/sources.js';

import {type RequestHeaderSectionData, RequestHeaderSection} from './RequestHeaderSection.js';
import {
  type ResponseHeaderSectionData,
  ResponseHeaderSection,
  RESPONSE_HEADER_SECTION_DATA_KEY,
} from './ResponseHeaderSection.js';

import requestHeadersViewStyles from './RequestHeadersView.css.js';

const RAW_HEADER_CUTOFF = 3000;
const {render, html} = LitHtml;

const UIStrings = {
  /**
   *@description Text in Request Headers View of the Network panel
   */
  fromDiskCache: '(from disk cache)',
  /**
   *@description Text in Request Headers View of the Network panel
   */
  fromMemoryCache: '(from memory cache)',
  /**
   *@description Text in Request Headers View of the Network panel
   */
  fromPrefetchCache: '(from prefetch cache)',
  /**
   *@description Text in Request Headers View of the Network panel
   */
  fromServiceWorker: '(from `service worker`)',
  /**
   *@description Text in Request Headers View of the Network panel
   */
  fromSignedexchange: '(from signed-exchange)',
  /**
   *@description Text in Request Headers View of the Network panel
   */
  fromWebBundle: '(from Web Bundle)',
  /**
   *@description Section header for a list of the main aspects of a http request
   */
  general: 'General',
  /**
   *@description Label for a link from the network panel's headers view to the file in which
   * header overrides are defined in the sources panel.
   */
  headerOverrides: 'Header overrides',
  /**
   *@description Label for a checkbox to switch between raw and parsed headers
   */
  raw: 'Raw',
  /**
   *@description Text in Request Headers View of the Network panel
   */
  referrerPolicy: 'Referrer Policy',
  /**
   *@description Text in Network Log View Columns of the Network panel
   */
  remoteAddress: 'Remote Address',
  /**
   *@description Text in Request Headers View of the Network panel
   */
  requestHeaders: 'Request Headers',
  /**
   *@description The HTTP method of a request
   */
  requestMethod: 'Request Method',
  /**
   *@description The URL of a request
   */
  requestUrl: 'Request URL',
  /**
   *@description A context menu item in the Network Log View Columns of the Network panel
   */
  responseHeaders: 'Response Headers',
  /**
   *@description Title text for a link to the Sources panel to the file containing the header override definitions
   */
  revealHeaderOverrides: 'Reveal header override definitions',
  /**
   *@description Text to show more content
   */
  showMore: 'Show more',
  /**
   *@description HTTP response code
   */
  statusCode: 'Status Code',
};
const str_ = i18n.i18n.registerUIStrings('panels/network/components/RequestHeadersView.ts', UIStrings);
const i18nString = i18n.i18n.getLocalizedString.bind(undefined, str_);

export class RequestHeadersView extends UI.Widget.VBox {
  readonly #requestHeadersComponent = new RequestHeadersComponent();
  readonly #request: SDK.NetworkRequest.NetworkRequest;

  constructor(request: SDK.NetworkRequest.NetworkRequest) {
    super();
    this.#request = request;
    this.contentElement.appendChild(this.#requestHeadersComponent);
  }

  wasShown(): void {
    this.#request.addEventListener(SDK.NetworkRequest.Events.RemoteAddressChanged, this.#refreshHeadersView, this);
    this.#request.addEventListener(SDK.NetworkRequest.Events.FinishedLoading, this.#refreshHeadersView, this);
    this.#request.addEventListener(SDK.NetworkRequest.Events.RequestHeadersChanged, this.#refreshHeadersView, this);
    this.#request.addEventListener(
        SDK.NetworkRequest.Events.ResponseHeadersChanged, this.#resetAndRefreshHeadersView, this);
    this.#refreshHeadersView();
  }

  willHide(): void {
    this.#request.removeEventListener(SDK.NetworkRequest.Events.RemoteAddressChanged, this.#refreshHeadersView, this);
    this.#request.removeEventListener(SDK.NetworkRequest.Events.FinishedLoading, this.#refreshHeadersView, this);
    this.#request.removeEventListener(SDK.NetworkRequest.Events.RequestHeadersChanged, this.#refreshHeadersView, this);
    this.#request.removeEventListener(
        SDK.NetworkRequest.Events.ResponseHeadersChanged, this.#resetAndRefreshHeadersView, this);
  }

  #resetAndRefreshHeadersView(): void {
    this.#request.deleteAssociatedData(RESPONSE_HEADER_SECTION_DATA_KEY);
    this.#requestHeadersComponent.data = {
      request: this.#request,
    };
  }

  #refreshHeadersView(): void {
    this.#requestHeadersComponent.data = {
      request: this.#request,
    };
  }

  revealHeader(section: NetworkForward.UIRequestLocation.UIHeaderSection, header?: string): void {
    this.#requestHeadersComponent.data = {
      request: this.#request,
      toReveal: {section, header: header},
    };
  }
}

export interface RequestHeadersComponentData {
  request: SDK.NetworkRequest.NetworkRequest;
  toReveal?: {section: NetworkForward.UIRequestLocation.UIHeaderSection, header?: string};
}

export class RequestHeadersComponent extends HTMLElement {
  static readonly litTagName = LitHtml.literal`devtools-request-headers`;
  readonly #shadow = this.attachShadow({mode: 'open'});
  #request?: Readonly<SDK.NetworkRequest.NetworkRequest>;
  #showResponseHeadersText = false;
  #showRequestHeadersText = false;
  #showResponseHeadersTextFull = false;
  #showRequestHeadersTextFull = false;
  #toReveal?: {section: NetworkForward.UIRequestLocation.UIHeaderSection, header?: string} = undefined;
  readonly #workspace = Workspace.Workspace.WorkspaceImpl.instance();

  set data(data: RequestHeadersComponentData) {
    this.#request = data.request;
    this.#toReveal = data.toReveal;
    this.#render();
  }

  connectedCallback(): void {
    this.#shadow.adoptedStyleSheets = [requestHeadersViewStyles];
    this.#workspace.addEventListener(
        Workspace.Workspace.Events.UISourceCodeAdded, this.#uiSourceCodeAddedOrRemoved, this);
    this.#workspace.addEventListener(
        Workspace.Workspace.Events.UISourceCodeRemoved, this.#uiSourceCodeAddedOrRemoved, this);
    Common.Settings.Settings.instance()
        .moduleSetting('persistenceNetworkOverridesEnabled')
        .addChangeListener(this.#render, this);
  }

  disconnectedCallback(): void {
    this.#workspace.removeEventListener(
        Workspace.Workspace.Events.UISourceCodeAdded, this.#uiSourceCodeAddedOrRemoved, this);
    this.#workspace.removeEventListener(
        Workspace.Workspace.Events.UISourceCodeRemoved, this.#uiSourceCodeAddedOrRemoved, this);
    Common.Settings.Settings.instance()
        .moduleSetting('persistenceNetworkOverridesEnabled')
        .removeChangeListener(this.#render, this);
  }

  #uiSourceCodeAddedOrRemoved(event: Common.EventTarget.EventTargetEvent<Workspace.UISourceCode.UISourceCode>): void {
    if (this.#getHeaderOverridesFileUrl() === event.data.url()) {
      this.#render();
    }
  }

  #render(): void {
    if (!this.#request) {
      return;
    }

    // Disabled until https://crbug.com/1079231 is fixed.
    // clang-format off
    render(html`
      ${this.#renderGeneralSection()}
      ${this.#renderResponseHeaders()}
      ${this.#renderRequestHeaders()}
    `, this.#shadow, {host: this});
    // clang-format on
  }

  #renderResponseHeaders(): LitHtml.LitTemplate {
    if (!this.#request) {
      return LitHtml.nothing;
    }

    const toggleShowRaw = (): void => {
      this.#showResponseHeadersText = !this.#showResponseHeadersText;
      this.#render();
    };

    // Disabled until https://crbug.com/1079231 is fixed.
    // clang-format off
    return html`
      <${Category.litTagName}
        @togglerawevent=${toggleShowRaw}
        .data=${{
          name: 'responseHeaders',
          title: i18nString(UIStrings.responseHeaders),
          headerCount: this.#request.sortedResponseHeaders.length,
          checked: this.#request.responseHeadersText ? this.#showResponseHeadersText : undefined,
          additionalContent: this.#renderHeaderOverridesLink(),
          forceOpen: this.#toReveal?.section === NetworkForward.UIRequestLocation.UIHeaderSection.Response,
        } as CategoryData}
        aria-label=${i18nString(UIStrings.responseHeaders)}
      >
        ${this.#showResponseHeadersText ?
            this.#renderRawHeaders(this.#request.responseHeadersText, true) : html`
          <${ResponseHeaderSection.litTagName} .data=${{
            request: this.#request,
            toReveal: this.#toReveal,
          } as ResponseHeaderSectionData}></${ResponseHeaderSection.litTagName}>
        `}
      </${Category.litTagName}>
    `;
    // clang-format on
  }

  #renderHeaderOverridesLink(): LitHtml.LitTemplate {
    const overrideable = Root.Runtime.experiments.isEnabled(Root.Runtime.ExperimentName.HEADER_OVERRIDES);
    if (!overrideable || !this.#workspace.uiSourceCodeForURL(this.#getHeaderOverridesFileUrl())) {
      return LitHtml.nothing;
    }

    const overridesSetting: Common.Settings.Setting<boolean> =
        Common.Settings.Settings.instance().moduleSetting('persistenceNetworkOverridesEnabled');
    // Disabled until https://crbug.com/1079231 is fixed.
    // clang-format off
    const fileIcon = overridesSetting.get() ? html`
      <${IconButton.Icon.Icon.litTagName} class="inline-icon purple-dot" .data=${{
          iconName: 'file-sync_icon',
          width: '11px',
          height: '13px',
        } as IconButton.Icon.IconData}>
      </${IconButton.Icon.Icon.litTagName}>` : html`
      <${IconButton.Icon.Icon.litTagName} class="inline-icon" .data=${{
          iconName: 'file_icon',
          color: 'var(--color-text-primary)',
          width: '12px',
          height: '12px',
        } as IconButton.Icon.IconData}>
      </${IconButton.Icon.Icon.litTagName}>`;
    // clang-format on

    const revealHeadersFile = (event: Event): void => {
      event.preventDefault();
      const uiSourceCode = this.#workspace.uiSourceCodeForURL(this.#getHeaderOverridesFileUrl());
      if (uiSourceCode) {
        Sources.SourcesPanel.SourcesPanel.instance().showUISourceCode(uiSourceCode);
        Sources.SourcesPanel.SourcesPanel.instance().revealInNavigator(uiSourceCode);
      }
    };

    return html`
      <x-link @click=${revealHeadersFile} class="link devtools-link" title=${UIStrings.revealHeaderOverrides}>
        ${fileIcon}${i18nString(UIStrings.headerOverrides)}
      </x-link>
    `;
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

  #renderRequestHeaders(): LitHtml.LitTemplate {
    if (!this.#request) {
      return LitHtml.nothing;
    }
    const requestHeadersText = this.#request.requestHeadersText();

    const toggleShowRaw = (): void => {
      this.#showRequestHeadersText = !this.#showRequestHeadersText;
      this.#render();
    };

    // Disabled until https://crbug.com/1079231 is fixed.
    // clang-format off
    return html`
      <${Category.litTagName}
        @togglerawevent=${toggleShowRaw}
        .data=${{
          name: 'requestHeaders',
          title: i18nString(UIStrings.requestHeaders),
          headerCount: this.#request.requestHeaders().length,
          checked: requestHeadersText? this.#showRequestHeadersText : undefined,
          forceOpen: this.#toReveal?.section === NetworkForward.UIRequestLocation.UIHeaderSection.Request,
        } as CategoryData}
        aria-label=${i18nString(UIStrings.requestHeaders)}
      >
        ${(this.#showRequestHeadersText && requestHeadersText) ?
            this.#renderRawHeaders(requestHeadersText, false) : html`
          <${RequestHeaderSection.litTagName} .data=${{
            request: this.#request,
            toReveal: this.#toReveal,
          } as RequestHeaderSectionData}></${RequestHeaderSection.litTagName}>
        `}
      </${Category.litTagName}>
    `;
    // clang-format on
  }

  #renderRawHeaders(rawHeadersText: string, forResponseHeaders: boolean): LitHtml.TemplateResult {
    const trimmed = rawHeadersText.trim();
    const showFull = forResponseHeaders ? this.#showResponseHeadersTextFull : this.#showRequestHeadersTextFull;
    const isShortened = !showFull && trimmed.length > RAW_HEADER_CUTOFF;

    const showMore = ():void => {
      if (forResponseHeaders) {
        this.#showResponseHeadersTextFull = true;
      } else {
        this.#showRequestHeadersTextFull = true;
      }
      this.#render();
    };

    const onContextMenuOpen = (event: Event): void => {
      const showFull = forResponseHeaders ? this.#showResponseHeadersTextFull : this.#showRequestHeadersTextFull;
      if (!showFull) {
        const contextMenu = new UI.ContextMenu.ContextMenu(event);
        const section = contextMenu.newSection();
        section.appendItem(i18nString(UIStrings.showMore), showMore);
        void contextMenu.show();
      }
    };

    const addContextMenuListener = (el: Element):void => {
      if (isShortened) {
        el.addEventListener('contextmenu', onContextMenuOpen);
      }
    };

    return html`
      <div class="row raw-headers-row" on-render=${ComponentHelpers.Directives.nodeRenderedCallback(addContextMenuListener)}>
        <div class="raw-headers">${isShortened ? trimmed.substring(0, RAW_HEADER_CUTOFF) : trimmed}</div>
        ${isShortened ? html`
          <${Buttons.Button.Button.litTagName}
            .size=${Buttons.Button.Size.SMALL}
            .variant=${Buttons.Button.Variant.SECONDARY}
            @click=${showMore}
          >${i18nString(UIStrings.showMore)}</${Buttons.Button.Button.litTagName}>
        ` : LitHtml.nothing}
      </div>
    `;
  }

  #renderGeneralSection(): LitHtml.LitTemplate {
    if (!this.#request) {
      return LitHtml.nothing;
    }

    const statusClasses = [];
    if (this.#request.statusCode < 300 || this.#request.statusCode === 304) {
      statusClasses.push('green-circle');
    } else if (this.#request.statusCode < 400) {
      statusClasses.push('yellow-circle');
    } else {
      statusClasses.push('red-circle');
    }

    let statusText = this.#request.statusCode + ' ' + this.#request.statusText;
    if (this.#request.cachedInMemory()) {
      statusText += ' ' + i18nString(UIStrings.fromMemoryCache);
      statusClasses.push('status-with-comment');
    } else if (this.#request.fetchedViaServiceWorker) {
      statusText += ' ' + i18nString(UIStrings.fromServiceWorker);
      statusClasses.push('status-with-comment');
    } else if (this.#request.redirectSourceSignedExchangeInfoHasNoErrors()) {
      statusText += ' ' + i18nString(UIStrings.fromSignedexchange);
      statusClasses.push('status-with-comment');
    } else if (this.#request.webBundleInnerRequestInfo()) {
      statusText += ' ' + i18nString(UIStrings.fromWebBundle);
      statusClasses.push('status-with-comment');
    } else if (this.#request.fromPrefetchCache()) {
      statusText += ' ' + i18nString(UIStrings.fromPrefetchCache);
      statusClasses.push('status-with-comment');
    } else if (this.#request.cached()) {
      statusText += ' ' + i18nString(UIStrings.fromDiskCache);
      statusClasses.push('status-with-comment');
    }

    // Disabled until https://crbug.com/1079231 is fixed.
    // clang-format off
    return html`
      <${Category.litTagName}
        .data=${{
          name: 'general',
          title: i18nString(UIStrings.general),
          forceOpen: this.#toReveal?.section === NetworkForward.UIRequestLocation.UIHeaderSection.General,
        } as CategoryData}
        aria-label=${i18nString(UIStrings.general)}
      >
        ${this.#renderGeneralRow(i18nString(UIStrings.requestUrl), this.#request.url())}
        ${this.#request.statusCode? this.#renderGeneralRow(i18nString(UIStrings.requestMethod), this.#request.requestMethod) : LitHtml.nothing}
        ${this.#request.statusCode? this.#renderGeneralRow(i18nString(UIStrings.statusCode), statusText, statusClasses) : LitHtml.nothing}
        ${this.#request.remoteAddress()? this.#renderGeneralRow(i18nString(UIStrings.remoteAddress), this.#request.remoteAddress()) : LitHtml.nothing}
        ${this.#request.referrerPolicy()? this.#renderGeneralRow(i18nString(UIStrings.referrerPolicy), String(this.#request.referrerPolicy())) : LitHtml.nothing}
      </${Category.litTagName}>
    `;
    // clang-format on
  }

  #renderGeneralRow(name: Common.UIString.LocalizedString, value: string, classNames?: string[]): LitHtml.LitTemplate {
    const isHighlighted = this.#toReveal?.section === NetworkForward.UIRequestLocation.UIHeaderSection.General &&
        name.toLowerCase() === this.#toReveal?.header?.toLowerCase();
    return html`
      <div class="row ${isHighlighted ? 'header-highlight' : ''}">
        <div class="header-name">${name}:</div>
        <div
          class="header-value ${classNames?.join(' ')}"
          @copy=${(): void => Host.userMetrics.actionTaken(Host.UserMetrics.Action.NetworkPanelCopyValue)}
        >${value}</div>
      </div>
    `;
  }
}

export class ToggleRawHeadersEvent extends Event {
  static readonly eventName = 'togglerawevent';

  constructor() {
    super(ToggleRawHeadersEvent.eventName, {});
  }
}

export interface CategoryData {
  name: string;
  title: Common.UIString.LocalizedString;
  headerCount?: number;
  checked?: boolean;
  additionalContent?: LitHtml.LitTemplate;
  forceOpen?: boolean;
}

export class Category extends HTMLElement {
  static readonly litTagName = LitHtml.literal`devtools-request-headers-category`;
  readonly #shadow = this.attachShadow({mode: 'open'});
  #expandedSetting?: Common.Settings.Setting<boolean>;
  #title: Common.UIString.LocalizedString = Common.UIString.LocalizedEmptyString;
  #headerCount?: number = undefined;
  #checked: boolean|undefined = undefined;
  #additionalContent: LitHtml.LitTemplate|undefined = undefined;
  #forceOpen: boolean|undefined = undefined;

  connectedCallback(): void {
    this.#shadow.adoptedStyleSheets = [requestHeadersViewStyles, Input.checkboxStyles];
  }

  set data(data: CategoryData) {
    this.#title = data.title;
    this.#expandedSetting =
        Common.Settings.Settings.instance().createSetting('request-info-' + data.name + '-category-expanded', true);
    this.#headerCount = data.headerCount;
    this.#checked = data.checked;
    this.#additionalContent = data.additionalContent;
    this.#forceOpen = data.forceOpen;
    this.#render();
  }

  #onCheckboxToggle(): void {
    this.dispatchEvent(new ToggleRawHeadersEvent());
  }

  #render(): void {
    const isOpen = (this.#expandedSetting ? this.#expandedSetting.get() : true) || this.#forceOpen;
    // Disabled until https://crbug.com/1079231 is fixed.
    // clang-format off
    render(html`
      <details ?open=${isOpen} @toggle=${this.#onToggle}>
        <summary class="header" @keydown=${this.#onSummaryKeyDown}>
          <div class="header-grid-container">
            <div>
              ${this.#title}${this.#headerCount !== undefined ?
                html`<span class="header-count"> (${this.#headerCount})</span>` :
                LitHtml.nothing
              }
            </div>
            <div class="hide-when-closed">
              ${this.#checked !== undefined ? html`
                <label><input type="checkbox" .checked=${this.#checked} @change=${this.#onCheckboxToggle} />${i18nString(UIStrings.raw)}</label>
              ` : LitHtml.nothing}
            </div>
            <div class="hide-when-closed">${this.#additionalContent}</div>
        </summary>
        <slot></slot>
      </details>
    `, this.#shadow, {host: this});
    // clang-format on
  }

  #onSummaryKeyDown(event: KeyboardEvent): void {
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

  #onToggle(event: Event): void {
    this.#expandedSetting?.set((event.target as HTMLDetailsElement).open);
  }
}

ComponentHelpers.CustomElements.defineComponent('devtools-request-headers', RequestHeadersComponent);
ComponentHelpers.CustomElements.defineComponent('devtools-request-headers-category', Category);

declare global {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  interface HTMLElementTagNameMap {
    'devtools-request-headers': RequestHeadersComponent;
    'devtools-request-headers-category': Category;
  }
}
