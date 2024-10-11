// Copyright 2022 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import './RequestHeaderSection.js';

import * as Common from '../../../core/common/common.js';
import * as Host from '../../../core/host/host.js';
import * as i18n from '../../../core/i18n/i18n.js';
import * as Platform from '../../../core/platform/platform.js';
import * as SDK from '../../../core/sdk/sdk.js';
import * as Persistence from '../../../models/persistence/persistence.js';
import * as Workspace from '../../../models/workspace/workspace.js';
import * as NetworkForward from '../../../panels/network/forward/forward.js';
import * as Buttons from '../../../ui/components/buttons/buttons.js';
import * as ComponentHelpers from '../../../ui/components/helpers/helpers.js';
import type * as IconButton from '../../../ui/components/icon_button/icon_button.js';
import * as Input from '../../../ui/components/input/input.js';
import * as LegacyWrapper from '../../../ui/components/legacy_wrapper/legacy_wrapper.js';
import * as Coordinator from '../../../ui/components/render_coordinator/render_coordinator.js';
import * as UI from '../../../ui/legacy/legacy.js';
import * as LitHtml from '../../../ui/lit-html/lit-html.js';
import * as VisualLogging from '../../../ui/visual_logging/visual_logging.js';
import * as Sources from '../../sources/sources.js';

import type {RequestHeaderSectionData} from './RequestHeaderSection.js';
import requestHeadersViewStyles from './RequestHeadersView.css.js';
import {
  RESPONSE_HEADER_SECTION_DATA_KEY,
  type ResponseHeaderSectionData,
} from './ResponseHeaderSection.js';

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
  fromEarlyHints: '(from early hints)',
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
   *@description A context menu item in the Network Log View Columns of the Network panel
   */
  earlyHintsHeaders: 'Early Hints Headers',
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

const coordinator = Coordinator.RenderCoordinator.RenderCoordinator.instance();

export class RequestHeadersView extends LegacyWrapper.LegacyWrapper.WrappableComponent {
  #request: Readonly<SDK.NetworkRequest.NetworkRequest>;
  readonly #shadow = this.attachShadow({mode: 'open'});
  #showResponseHeadersText = false;
  #showRequestHeadersText = false;
  #showResponseHeadersTextFull = false;
  #showRequestHeadersTextFull = false;
  #toReveal?: {section: NetworkForward.UIRequestLocation.UIHeaderSection, header?: string} = undefined;
  readonly #workspace = Workspace.Workspace.WorkspaceImpl.instance();

  constructor(request: SDK.NetworkRequest.NetworkRequest) {
    super();
    this.#request = request;
    this.setAttribute('jslog', `${VisualLogging.pane('headers').track({resize: true})}`);
  }

  override wasShown(): void {
    this.#request.addEventListener(SDK.NetworkRequest.Events.REMOTE_ADDRESS_CHANGED, this.#refreshHeadersView, this);
    this.#request.addEventListener(SDK.NetworkRequest.Events.FINISHED_LOADING, this.#refreshHeadersView, this);
    this.#request.addEventListener(SDK.NetworkRequest.Events.REQUEST_HEADERS_CHANGED, this.#refreshHeadersView, this);
    this.#request.addEventListener(
        SDK.NetworkRequest.Events.RESPONSE_HEADERS_CHANGED, this.#resetAndRefreshHeadersView, this);
    this.#toReveal = undefined;
    this.#refreshHeadersView();
  }

  override willHide(): void {
    this.#request.removeEventListener(SDK.NetworkRequest.Events.REMOTE_ADDRESS_CHANGED, this.#refreshHeadersView, this);
    this.#request.removeEventListener(SDK.NetworkRequest.Events.FINISHED_LOADING, this.#refreshHeadersView, this);
    this.#request.removeEventListener(
        SDK.NetworkRequest.Events.REQUEST_HEADERS_CHANGED, this.#refreshHeadersView, this);
    this.#request.removeEventListener(
        SDK.NetworkRequest.Events.RESPONSE_HEADERS_CHANGED, this.#resetAndRefreshHeadersView, this);
  }

  #resetAndRefreshHeadersView(): void {
    this.#request.deleteAssociatedData(RESPONSE_HEADER_SECTION_DATA_KEY);
    void this.render();
  }

  #refreshHeadersView(): void {
    void this.render();
  }

  revealHeader(section: NetworkForward.UIRequestLocation.UIHeaderSection, header?: string): void {
    this.#toReveal = {section, header};
    void this.render();
  }

  connectedCallback(): void {
    this.#shadow.adoptedStyleSheets = [requestHeadersViewStyles];
    this.#workspace.addEventListener(
        Workspace.Workspace.Events.UISourceCodeAdded, this.#uiSourceCodeAddedOrRemoved, this);
    this.#workspace.addEventListener(
        Workspace.Workspace.Events.UISourceCodeRemoved, this.#uiSourceCodeAddedOrRemoved, this);
    Common.Settings.Settings.instance()
        .moduleSetting('persistence-network-overrides-enabled')
        .addChangeListener(this.render, this);
  }

  disconnectedCallback(): void {
    this.#workspace.removeEventListener(
        Workspace.Workspace.Events.UISourceCodeAdded, this.#uiSourceCodeAddedOrRemoved, this);
    this.#workspace.removeEventListener(
        Workspace.Workspace.Events.UISourceCodeRemoved, this.#uiSourceCodeAddedOrRemoved, this);
    Common.Settings.Settings.instance()
        .moduleSetting('persistence-network-overrides-enabled')
        .removeChangeListener(this.render, this);
  }

  #uiSourceCodeAddedOrRemoved(event: Common.EventTarget.EventTargetEvent<Workspace.UISourceCode.UISourceCode>): void {
    if (this.#getHeaderOverridesFileUrl() === event.data.url()) {
      void this.render();
    }
  }

  override async render(): Promise<void> {
    if (!this.#request) {
      return;
    }

    return coordinator.write(() => {
      // Disabled until https://crbug.com/1079231 is fixed.
      // clang-format off
      render(html`
        ${this.#renderGeneralSection()}
        ${this.#renderEarlyHintsHeaders()}
        ${this.#renderResponseHeaders()}
        ${this.#renderRequestHeaders()}
      `, this.#shadow, {host: this});

      // clang-format on
    });
  }

  #renderEarlyHintsHeaders(): LitHtml.LitTemplate {
    if (!this.#request || !this.#request.earlyHintsHeaders || this.#request.earlyHintsHeaders.length === 0) {
      return LitHtml.nothing;
    }

    const toggleShowRaw = (): void => {
      this.#showResponseHeadersText = !this.#showResponseHeadersText;
      void this.render();
    };

    // Disabled until https://crbug.com/1079231 is fixed.
    // clang-format off
    return html`
      <devtools-request-headers-category
        @togglerawevent=${toggleShowRaw}
        .data=${{
        name: 'early-hints-headers',
        title: i18nString(UIStrings.earlyHintsHeaders),
        headerCount: this.#request.earlyHintsHeaders.length,
        checked: undefined,
        additionalContent: undefined,
        forceOpen: this.#toReveal?.section === NetworkForward.UIRequestLocation.UIHeaderSection.EARLY_HINTS,
        loggingContext: 'early-hints-headers',
      } as CategoryData}
        aria-label=${i18nString(UIStrings.earlyHintsHeaders)}
      >
        ${this.#showResponseHeadersText ?
        this.#renderRawHeaders(this.#request.responseHeadersText, true) : html`
          <devtools-early-hints-header-section .data=${{
            request: this.#request,
            toReveal: this.#toReveal,
          } as ResponseHeaderSectionData}></devtools-early-hints-header-section>
        `}
      </devtools-request-headers-category>
    `;
    // clang-format on
  }

  #renderResponseHeaders(): LitHtml.LitTemplate {
    if (!this.#request) {
      return LitHtml.nothing;
    }

    const toggleShowRaw = (): void => {
      this.#showResponseHeadersText = !this.#showResponseHeadersText;
      void this.render();
    };

    // Disabled until https://crbug.com/1079231 is fixed.
    // clang-format off
    return html`
      <devtools-request-headers-category
        @togglerawevent=${toggleShowRaw}
        .data=${{
          name: 'response-headers',
          title: i18nString(UIStrings.responseHeaders),
          headerCount: this.#request.sortedResponseHeaders.length,
          checked: this.#request.responseHeadersText ? this.#showResponseHeadersText : undefined,
          additionalContent: this.#renderHeaderOverridesLink(),
          forceOpen: this.#toReveal?.section === NetworkForward.UIRequestLocation.UIHeaderSection.RESPONSE,
          loggingContext: 'response-headers',
        } as CategoryData}
        aria-label=${i18nString(UIStrings.responseHeaders)}
      >
        ${this.#showResponseHeadersText ?
            this.#renderRawHeaders(this.#request.responseHeadersText, true) : html`
          <devtools-response-header-section .data=${{
            request: this.#request,
            toReveal: this.#toReveal,
          } as ResponseHeaderSectionData} jslog=${VisualLogging.section('response-headers')}></devtools-response-header-section>
        `}
      </devtools-request-headers-category>
    `;
    // clang-format on
  }

  #renderHeaderOverridesLink(): LitHtml.LitTemplate {
    if (!this.#workspace.uiSourceCodeForURL(this.#getHeaderOverridesFileUrl())) {
      return LitHtml.nothing;
    }

    const overridesSetting: Common.Settings.Setting<boolean> =
        Common.Settings.Settings.instance().moduleSetting('persistence-network-overrides-enabled');
    // Disabled until https://crbug.com/1079231 is fixed.
    // clang-format off
    const fileIcon = html`
      <devtools-icon class=${overridesSetting.get() ? 'inline-icon dot purple': 'inline-icon'} .data=${{
          iconName: 'document',
          width: '16px',
          height: '16px',
        } as IconButton.Icon.IconData}>
      </devtools-icon>`;
    // clang-format on

    const revealHeadersFile = (event: Event): void => {
      event.preventDefault();
      const uiSourceCode = this.#workspace.uiSourceCodeForURL(this.#getHeaderOverridesFileUrl());
      if (uiSourceCode) {
        Sources.SourcesPanel.SourcesPanel.instance().showUISourceCode(uiSourceCode);
        void Sources.SourcesPanel.SourcesPanel.instance().revealInNavigator(uiSourceCode);
      }
    };

    // Disabled until https://crbug.com/1079231 is fixed.
    // clang-format off
    return html`
      <x-link
          href="https://goo.gle/devtools-override"
          class="link devtools-link"
          jslog=${VisualLogging.link('devtools-override').track({click: true})}
      >
        <devtools-icon class="inline-icon" .data=${{
            iconName: 'help',
            width: '16px',
            height: '16px',
          } as IconButton.Icon.IconData}>
        </devtools-icon
      ></x-link>
      <x-link
          @click=${revealHeadersFile}
          class="link devtools-link"
          title=${UIStrings.revealHeaderOverrides}
          jslog=${VisualLogging.link('reveal-header-overrides').track({click: true})}
      >
        ${fileIcon}${Persistence.NetworkPersistenceManager.HEADERS_FILENAME}
      </x-link>
    `;
    // clang-format on
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
      void this.render();
    };

    // Disabled until https://crbug.com/1079231 is fixed.
    // clang-format off
    return html`
      <devtools-request-headers-category
        @togglerawevent=${toggleShowRaw}
        .data=${{
          name: 'request-headers',
          title: i18nString(UIStrings.requestHeaders),
          headerCount: this.#request.requestHeaders().length,
          checked: requestHeadersText? this.#showRequestHeadersText : undefined,
          forceOpen: this.#toReveal?.section === NetworkForward.UIRequestLocation.UIHeaderSection.REQUEST,
          loggingContext: 'request-headers',
        } as CategoryData}
        aria-label=${i18nString(UIStrings.requestHeaders)}
      >
        ${(this.#showRequestHeadersText && requestHeadersText) ?
            this.#renderRawHeaders(requestHeadersText, false) : html`
          <devtools-request-header-section .data=${{
            request: this.#request,
            toReveal: this.#toReveal,
          } as RequestHeaderSectionData} jslog=${VisualLogging.section('request-headers')}></devtools-request-header-section>
        `}
      </devtools-request-headers-category>
    `;
    // clang-format on
  }

  #renderRawHeaders(rawHeadersText: string, forResponseHeaders: boolean): LitHtml.TemplateResult {
    const trimmed = rawHeadersText.trim();
    const showFull = forResponseHeaders ? this.#showResponseHeadersTextFull : this.#showRequestHeadersTextFull;
    const isShortened = !showFull && trimmed.length > RAW_HEADER_CUTOFF;

    const showMore = (): void => {
      if (forResponseHeaders) {
        this.#showResponseHeadersTextFull = true;
      } else {
        this.#showRequestHeadersTextFull = true;
      }
      void this.render();
    };

    const onContextMenuOpen = (event: Event): void => {
      const showFull = forResponseHeaders ? this.#showResponseHeadersTextFull : this.#showRequestHeadersTextFull;
      if (!showFull) {
        const contextMenu = new UI.ContextMenu.ContextMenu(event);
        const section = contextMenu.newSection();
        section.appendItem(i18nString(UIStrings.showMore), showMore, {jslogContext: 'show-more'});
        void contextMenu.show();
      }
    };

    const addContextMenuListener = (el: Element): void => {
      if (isShortened) {
        el.addEventListener('contextmenu', onContextMenuOpen);
      }
    };

    // Disabled until https://crbug.com/1079231 is fixed.
    // clang-format off
    return html`
      <div class="row raw-headers-row" on-render=${ComponentHelpers.Directives.nodeRenderedCallback(addContextMenuListener)}>
        <div class="raw-headers">${isShortened ? trimmed.substring(0, RAW_HEADER_CUTOFF) : trimmed}</div>
        ${isShortened ? html`
          <devtools-button
            .size=${Buttons.Button.Size.SMALL}
            .variant=${Buttons.Button.Variant.OUTLINED}
            @click=${showMore}
            jslog=${VisualLogging.action('raw-headers-show-more').track({click: true})}
          >${i18nString(UIStrings.showMore)}</devtools-button>
        ` : LitHtml.nothing}
      </div>
    `;
    // clang-format on
  }

  #renderGeneralSection(): LitHtml.LitTemplate {
    if (!this.#request) {
      return LitHtml.nothing;
    }

    const statusClasses = ['status'];
    if (this.#request.statusCode < 300 || this.#request.statusCode === 304) {
      statusClasses.push('green-circle');
    } else if (this.#request.statusCode < 400) {
      statusClasses.push('yellow-circle');
    } else {
      statusClasses.push('red-circle');
    }

    let comment = '';
    if (this.#request.cachedInMemory()) {
      comment = i18nString(UIStrings.fromMemoryCache);
    } else if (this.#request.fromEarlyHints()) {
      comment = i18nString(UIStrings.fromEarlyHints);
    } else if (this.#request.fetchedViaServiceWorker) {
      comment = i18nString(UIStrings.fromServiceWorker);
    } else if (this.#request.redirectSourceSignedExchangeInfoHasNoErrors()) {
      comment = i18nString(UIStrings.fromSignedexchange);
    } else if (this.#request.webBundleInnerRequestInfo()) {
      comment = i18nString(UIStrings.fromWebBundle);
    } else if (this.#request.fromPrefetchCache()) {
      comment = i18nString(UIStrings.fromPrefetchCache);
    } else if (this.#request.cached()) {
      comment = i18nString(UIStrings.fromDiskCache);
    }

    if (comment) {
      statusClasses.push('status-with-comment');
    }

    const statusText = [this.#request.statusCode, this.#request.getInferredStatusText(), comment].join(' ');

    // Disabled until https://crbug.com/1079231 is fixed.
    // clang-format off
    return html`
      <devtools-request-headers-category
        .data=${{
          name: 'general',
          title: i18nString(UIStrings.general),
          forceOpen: this.#toReveal?.section === NetworkForward.UIRequestLocation.UIHeaderSection.GENERAL,
          loggingContext: 'general',
        } as CategoryData}
        aria-label=${i18nString(UIStrings.general)}
      >
      <div jslog=${VisualLogging.section('general')}>
        ${this.#renderGeneralRow(i18nString(UIStrings.requestUrl), this.#request.url())}
        ${this.#request.statusCode? this.#renderGeneralRow(i18nString(UIStrings.requestMethod), this.#request.requestMethod) : LitHtml.nothing}
        ${this.#request.statusCode? this.#renderGeneralRow(i18nString(UIStrings.statusCode), statusText, statusClasses) : LitHtml.nothing}
        ${this.#request.remoteAddress()? this.#renderGeneralRow(i18nString(UIStrings.remoteAddress), this.#request.remoteAddress()) : LitHtml.nothing}
        ${this.#request.referrerPolicy()? this.#renderGeneralRow(i18nString(UIStrings.referrerPolicy), String(this.#request.referrerPolicy())) : LitHtml.nothing}
      </div>
      </devtools-request-headers-category>
    `;
    // clang-format on
  }

  #renderGeneralRow(name: Common.UIString.LocalizedString, value: string, classNames?: string[]): LitHtml.LitTemplate {
    const isHighlighted = this.#toReveal?.section === NetworkForward.UIRequestLocation.UIHeaderSection.GENERAL &&
        name.toLowerCase() === this.#toReveal?.header?.toLowerCase();
    return html`
      <div class="row ${isHighlighted ? 'header-highlight' : ''}">
        <div class="header-name">${name}:</div>
        <div
          class="header-value ${classNames?.join(' ')}"
          @copy=${() => Host.userMetrics.actionTaken(Host.UserMetrics.Action.NetworkPanelCopyValue)}
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
  loggingContext: string;
}

export class Category extends HTMLElement {
  readonly #shadow = this.attachShadow({mode: 'open'});
  #expandedSetting?: Common.Settings.Setting<boolean>;
  #title: Common.UIString.LocalizedString = Common.UIString.LocalizedEmptyString;
  #headerCount?: number = undefined;
  #checked: boolean|undefined = undefined;
  #additionalContent: LitHtml.LitTemplate|undefined = undefined;
  #forceOpen: boolean|undefined = undefined;
  #loggingContext = '';

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
    this.#loggingContext = data.loggingContext;
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
        <summary
          class="header"
          @keydown=${this.#onSummaryKeyDown}
          jslog=${VisualLogging.sectionHeader().track({click: true}).context(this.#loggingContext)}
        >
          <div class="header-grid-container">
            <div>
              ${this.#title}${this.#headerCount !== undefined ?
                html`<span class="header-count"> (${this.#headerCount})</span>` :
                LitHtml.nothing
              }
            </div>
            <div class="hide-when-closed">
              ${this.#checked !== undefined ? html`
                <label><input
                    type="checkbox"
                    .checked=${this.#checked}
                    @change=${this.#onCheckboxToggle}
                    jslog=${VisualLogging.toggle('raw-headers').track({change: true})}
                />${i18nString(UIStrings.raw)}</label>
              ` : LitHtml.nothing}
            </div>
            <div class="hide-when-closed">${this.#additionalContent}</div>
          </div>
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

customElements.define('devtools-request-headers', RequestHeadersView);
customElements.define('devtools-request-headers-category', Category);

declare global {
  interface HTMLElementTagNameMap {
    'devtools-request-headers': RequestHeadersView;
    'devtools-request-headers-category': Category;
  }
}
