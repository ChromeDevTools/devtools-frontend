// Copyright 2022 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as Common from '../../../core/common/common.js';
import * as Host from '../../../core/host/host.js';
import * as i18n from '../../../core/i18n/i18n.js';
import * as Platform from '../../../core/platform/platform.js';
import * as SDK from '../../../core/sdk/sdk.js';
import * as Protocol from '../../../generated/protocol.js';
import * as IssuesManager from '../../../models/issues_manager/issues_manager.js';
import * as ClientVariations from '../../../third_party/chromium/client-variations/client-variations.js';
import * as Buttons from '../../../ui/components/buttons/buttons.js';
import * as ComponentHelpers from '../../../ui/components/helpers/helpers.js';
import * as IconButton from '../../../ui/components/icon_button/icon_button.js';
import * as Input from '../../../ui/components/input/input.js';
import * as UI from '../../../ui/legacy/legacy.js';
import * as LitHtml from '../../../ui/lit-html/lit-html.js';

import requestHeadersViewStyles from './RequestHeadersView.css.js';

const RAW_HEADER_CUTOFF = 3000;
const {render, html} = LitHtml;

const UIStrings = {
  /**
  *@description Comment used in decoded X-Client-Data HTTP header output in Headers View of the Network panel
  */
  activeClientExperimentVariation: 'Active `client experiment variation IDs`.',
  /**
  *@description Comment used in decoded X-Client-Data HTTP header output in Headers View of the Network panel
  */
  activeClientExperimentVariationIds: 'Active `client experiment variation IDs` that trigger server-side behavior.',
  /**
  *@description Text in Headers View of the Network panel
  */
  chooseThisOptionIfTheResourceAnd:
      'Choose this option if the resource and the document are served from the same site.',
  /**
  *@description Text in Headers View of the Network panel for X-Client-Data HTTP headers
  */
  decoded: 'Decoded:',
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
  *@description Text that is usually a hyperlink to more documentation
  */
  learnMore: 'Learn more',
  /**
  *@description Text for a link to the issues panel
  */
  learnMoreInTheIssuesTab: 'Learn more in the issues tab',
  /**
  *@description Label for a checkbox to switch between raw and parsed headers
  */
  raw: 'Raw',
  /**
  *@description Text in Headers View of the Network panel
  */
  onlyChooseThisOptionIfAn:
      'Only choose this option if an arbitrary website including this resource does not impose a security risk.',
  /**
  *@description Message to explain lack of raw headers for a particular network request
  */
  provisionalHeadersAreShownDisableCache: 'Provisional headers are shown. Disable cache to see full headers.',
  /**
  *@description Tooltip to explain lack of raw headers for a particular network request
  */
  onlyProvisionalHeadersAre:
      'Only provisional headers are available because this request was not sent over the network and instead was served from a local cache, which doesn’t store the original request headers. Disable cache to see full request headers.',
  /**
  *@description Message to explain lack of raw headers for a particular network request
  */
  provisionalHeadersAreShown: 'Provisional headers are shown.',
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
  *@description Text to show more content
  */
  showMore: 'Show more',
  /**
  *@description HTTP response code
  */
  statusCode: 'Status Code',
  /**
  *@description Text in Headers View of the Network panel
  */
  thisDocumentWasBlockedFrom:
      'This document was blocked from loading in an `iframe` with a `sandbox` attribute because this document specified a cross-origin opener policy.',
  /**
  *@description Text in Headers View of the Network panel
  */
  toEmbedThisFrameInYourDocument:
      'To embed this frame in your document, the response needs to enable the cross-origin embedder policy by specifying the following response header:',
  /**
  *@description Text in Headers View of the Network panel
  */
  toUseThisResourceFromADifferent:
      'To use this resource from a different origin, the server needs to specify a cross-origin resource policy in the response headers:',
  /**
  *@description Text in Headers View of the Network panel
  */
  toUseThisResourceFromADifferentOrigin:
      'To use this resource from a different origin, the server may relax the cross-origin resource policy response header:',
  /**
  *@description Text in Headers View of the Network panel
  */
  toUseThisResourceFromADifferentSite:
      'To use this resource from a different site, the server may relax the cross-origin resource policy response header:',
};
const str_ = i18n.i18n.registerUIStrings('panels/network/components/RequestHeadersView.ts', UIStrings);
const i18nString = i18n.i18n.getLocalizedString.bind(undefined, str_);
const i18nLazyString = i18n.i18n.getLazilyComputedLocalizedString.bind(undefined, str_);

export class RequestHeadersView extends UI.Widget.VBox {
  readonly #headersView = new RequestHeadersComponent();
  readonly #request: SDK.NetworkRequest.NetworkRequest;

  constructor(request: SDK.NetworkRequest.NetworkRequest) {
    super();
    this.#request = request;
    this.contentElement.appendChild(this.#headersView);
  }

  wasShown(): void {
    this.#request.addEventListener(SDK.NetworkRequest.Events.RemoteAddressChanged, this.#refreshHeadersView, this);
    this.#request.addEventListener(SDK.NetworkRequest.Events.FinishedLoading, this.#refreshHeadersView, this);
    this.#refreshHeadersView();
  }

  willHide(): void {
    this.#request.removeEventListener(SDK.NetworkRequest.Events.RemoteAddressChanged, this.#refreshHeadersView, this);
    this.#request.removeEventListener(SDK.NetworkRequest.Events.FinishedLoading, this.#refreshHeadersView, this);
  }

  #refreshHeadersView(): void {
    this.#headersView.data = {
      request: this.#request,
    };
  }
}

export interface RequestHeadersComponentData {
  request: SDK.NetworkRequest.NetworkRequest;
}

export class RequestHeadersComponent extends HTMLElement {
  static readonly litTagName = LitHtml.literal`devtools-request-headers`;
  readonly #shadow = this.attachShadow({mode: 'open'});
  #request?: Readonly<SDK.NetworkRequest.NetworkRequest>;
  #showResponseHeadersText = false;
  #showRequestHeadersText = false;
  #showResponseHeadersTextFull = false;
  #showRequestHeadersTextFull = false;

  set data(data: RequestHeadersComponentData) {
    this.#request = data.request;
    this.#render();
  }

  connectedCallback(): void {
    this.#shadow.adoptedStyleSheets = [requestHeadersViewStyles];
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

    const headersWithIssues = [];
    if (this.#request.wasBlocked()) {
      const headerWithIssues =
          BlockedReasonDetails.get((this.#request.blockedReason() as Protocol.Network.BlockedReason));
      if (headerWithIssues) {
        headersWithIssues.push(headerWithIssues);
      }
    }

    function mergeHeadersWithIssues(
        headers: SDK.NetworkRequest.NameValue[], headersWithIssues: HeaderDescriptor[]): HeaderDescriptor[] {
      let i = 0, j = 0;
      const result: HeaderDescriptor[] = [];
      while (i < headers.length && j < headersWithIssues.length) {
        if (headers[i].name < headersWithIssues[j].name) {
          result.push({...headers[i++], headerNotSet: false});
        } else if (headers[i].name > headersWithIssues[j].name) {
          result.push({...headersWithIssues[j++], headerNotSet: true});
        } else {
          result.push({...headersWithIssues[j++], ...headers[i++], headerNotSet: false});
        }
      }
      while (i < headers.length) {
        result.push({...headers[i++], headerNotSet: false});
      }
      while (j < headersWithIssues.length) {
        result.push({...headersWithIssues[j++], headerNotSet: true});
      }
      return result;
    }

    const mergedHeaders = mergeHeadersWithIssues(this.#request.sortedResponseHeaders.slice(), headersWithIssues);

    const blockedResponseCookies = this.#request.blockedResponseCookies();
    const blockedCookieLineToReasons = new Map<string, Protocol.Network.SetCookieBlockedReason[]>(
        blockedResponseCookies?.map(c => [c.cookieLine, c.blockedReasons]));
    for (const header of mergedHeaders) {
      if (header.name.toLowerCase() === 'set-cookie' && header.value) {
        const matchingBlockedReasons = blockedCookieLineToReasons.get(header.value.toString());
        if (matchingBlockedReasons) {
          header.setCookieBlockedReasons = matchingBlockedReasons;
        }
      }
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
        } as CategoryData}
        aria-label=${i18nString(UIStrings.responseHeaders)}
      >
        ${this.#showResponseHeadersText ?
            this.#renderRawHeaders(this.#request.responseHeadersText, true) : html`
          ${mergedHeaders.map(header => this.#renderHeader(header))}
        `}
      </${Category.litTagName}>
    `;
    // clang-format on
  }

  #renderRequestHeaders(): LitHtml.LitTemplate {
    if (!this.#request) {
      return LitHtml.nothing;
    }

    const headers = this.#request.requestHeaders().slice();
    headers.sort(function(a, b) {
      return Platform.StringUtilities.compare(a.name.toLowerCase(), b.name.toLowerCase());
    });
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
        } as CategoryData}
        aria-label=${i18nString(UIStrings.requestHeaders)}
      >
        ${(this.#showRequestHeadersText && requestHeadersText) ?
            this.#renderRawHeaders(requestHeadersText, false) : html`
          ${this.#maybeRenderProvisionalHeadersWarning()}
          ${headers.map(header => this.#renderHeader({...header, headerNotSet: false}))}
        `}
      </${Category.litTagName}>
    `;
    // clang-format on
  }

  #maybeRenderProvisionalHeadersWarning(): LitHtml.LitTemplate {
    if (!this.#request || this.#request.requestHeadersText() !== undefined) {
      return LitHtml.nothing;
    }

    let cautionText;
    let cautionTitle = '';
    if (this.#request.cachedInMemory() || this.#request.cached()) {
      cautionText = i18nString(UIStrings.provisionalHeadersAreShownDisableCache);
      cautionTitle = i18nString(UIStrings.onlyProvisionalHeadersAre);
    } else {
      cautionText = i18nString(UIStrings.provisionalHeadersAreShown);
    }
    // Disabled until https://crbug.com/1079231 is fixed.
    // clang-format off
    return html`
      <div class="call-to-action">
        <div class="call-to-action-body">
          <div class="explanation" title=${cautionTitle}>
            <${IconButton.Icon.Icon.litTagName} class="inline-icon" .data=${{
                iconName: 'clear-warning_icon',
                width: '12px',
                height: '12px',
              } as IconButton.Icon.IconData}>
            </${IconButton.Icon.Icon.litTagName}>
            ${cautionText} <x-link href="https://developer.chrome.com/docs/devtools/network/reference/#provisional-headers" class="link">${i18nString(UIStrings.learnMore)}</x-link>
          </div>
        </div>
      </div>
    `;
    // clang-format on
  }

  #renderHeader(header: HeaderDescriptor): LitHtml.TemplateResult {
    // Disabled until https://crbug.com/1079231 is fixed.
    // clang-format off
    return html`
      <div class="row">
        <div class="header-name">
          ${header.headerNotSet ?
            html`<div class="header-badge header-badge-text">${i18n.i18n.lockedString('not-set')}</div>` :
            LitHtml.nothing
          }${header.name}:
        </div>
        <div class="header-value ${header.headerValueIncorrect ? 'header-warning' : ''}">
          ${header.value?.toString() || ''}
          ${this.#maybeRenderHeaderValueSuffix(header)}
        </div>
      </div>
      ${this.#maybeRenderBlockedDetails(header.blockedDetails)}
    `;
    // clang-format on
  }

  #maybeRenderHeaderValueSuffix(header: HeaderDescriptor): LitHtml.LitTemplate {
    const headerId = header.name.toLowerCase();

    if (headerId === 'set-cookie' && header.setCookieBlockedReasons) {
      const titleText =
          header.setCookieBlockedReasons.map(SDK.NetworkRequest.setCookieBlockedReasonToUiString).join('\n');
      // Disabled until https://crbug.com/1079231 is fixed.
      // clang-format off
      return html`
        <${IconButton.Icon.Icon.litTagName} class="inline-icon" title=${titleText} .data=${{
            iconName: 'clear-warning_icon',
            width: '12px',
            height: '12px',
          } as IconButton.Icon.IconData}>
        </${IconButton.Icon.Icon.litTagName}>
      `;
      // clang-format on
    }

    if (headerId === 'x-client-data') {
      const data = ClientVariations.parseClientVariations(header.value?.toString() || '');
      const output = ClientVariations.formatClientVariations(
          data, i18nString(UIStrings.activeClientExperimentVariation),
          i18nString(UIStrings.activeClientExperimentVariationIds));
      return html`
        <div>${i18nString(UIStrings.decoded)}</div>
        <code>${output}</code>
      `;
    }

    return LitHtml.nothing;
  }

  #maybeRenderBlockedDetails(blockedDetails?: BlockedDetailsDescriptor): LitHtml.LitTemplate {
    if (!blockedDetails) {
      return LitHtml.nothing;
    }
    // Disabled until https://crbug.com/1079231 is fixed.
    // clang-format off
    return html`
      <div class="call-to-action">
        <div class="call-to-action-body">
          <div class="explanation">${blockedDetails.explanation()}</div>
          ${blockedDetails.examples.map(example => html`
            <div class="example">
              <code>${example.codeSnippet}</code>
              ${example.comment ? html`
                <span class="comment">${example.comment()}</span>
              ` : ''}
            </div>
          `)}
          ${this.#maybeRenderBlockedDetailsLink(blockedDetails)}
        </div>
      </div>
    `;
    // clang-format on
  }

  #maybeRenderBlockedDetailsLink(blockedDetails?: BlockedDetailsDescriptor): LitHtml.LitTemplate {
    if (this.#request && IssuesManager.RelatedIssue.hasIssueOfCategory(this.#request, IssuesManager.Issue.IssueCategory.CrossOriginEmbedderPolicy)) {
      const followLink = (): void => {
        Host.userMetrics.issuesPanelOpenedFrom(Host.UserMetrics.IssueOpener.LearnMoreLinkCOEP);
        if (this.#request) {
          void IssuesManager.RelatedIssue.reveal(
              this.#request, IssuesManager.Issue.IssueCategory.CrossOriginEmbedderPolicy);
        }
      };
      return html`
        <div class="devtools-link" @click=${followLink}>
          <${IconButton.Icon.Icon.litTagName} class="inline-icon" .data=${{
            iconName: 'issue-exclamation-icon',
            color: 'var(--issue-color-yellow)',
            width: '16px',
            height: '16px',
            } as IconButton.Icon.IconData}>
          </${IconButton.Icon.Icon.litTagName}>
          ${i18nString(UIStrings.learnMoreInTheIssuesTab)}
        </div>
      `;
    }
    if (blockedDetails?.link) {
      // Disabled until https://crbug.com/1079231 is fixed.
      // clang-format off
      return html`
        <x-link href=${blockedDetails.link.url} class="link">
          <${IconButton.Icon.Icon.litTagName} class="inline-icon" .data=${{
            iconName: 'link_icon',
            color: 'var(--color-link)',
            width: '16px',
            height: '16px',
          } as IconButton.Icon.IconData}>
          </${IconButton.Icon.Icon.litTagName}
          >${i18nString(UIStrings.learnMore)}
        </x-link>
      `;
      // clang-format on
    }
    return LitHtml.nothing;
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

    let coloredCircleClassName = 'red-circle';
    if (this.#request.statusCode < 300 || this.#request.statusCode === 304) {
      coloredCircleClassName = 'green-circle';
    } else if (this.#request.statusCode < 400) {
      coloredCircleClassName = 'yellow-circle';
    }

    let statusText = this.#request.statusCode + ' ' + this.#request.statusText;
    let statusTextHasComment = false;
    if (this.#request.cachedInMemory()) {
      statusText += ' ' + i18nString(UIStrings.fromMemoryCache);
      statusTextHasComment = true;
    } else if (this.#request.fetchedViaServiceWorker) {
      statusText += ' ' + i18nString(UIStrings.fromServiceWorker);
      statusTextHasComment = true;
    } else if (this.#request.redirectSourceSignedExchangeInfoHasNoErrors()) {
      statusText += ' ' + i18nString(UIStrings.fromSignedexchange);
      statusTextHasComment = true;
    } else if (this.#request.webBundleInnerRequestInfo()) {
      statusText += ' ' + i18nString(UIStrings.fromWebBundle);
      statusTextHasComment = true;
    } else if (this.#request.fromPrefetchCache()) {
      statusText += ' ' + i18nString(UIStrings.fromPrefetchCache);
      statusTextHasComment = true;
    } else if (this.#request.cached()) {
      statusText += ' ' + i18nString(UIStrings.fromDiskCache);
      statusTextHasComment = true;
    }

    // Disabled until https://crbug.com/1079231 is fixed.
    // clang-format off
    return html`
      <${Category.litTagName}
        .data=${{name: 'general', title: i18nString(UIStrings.general)} as CategoryData}
        aria-label=${i18nString(UIStrings.general)}
      >
        <div class="row">
          <div class="header-name">${i18nString(UIStrings.requestUrl)}:</div>
          <div class="header-value">${this.#request.url()}</div>
        </div>
        ${this.#request.statusCode? html`
          <div class="row">
            <div class="header-name">${i18nString(UIStrings.requestMethod)}:</div>
            <div class="header-value">${this.#request.requestMethod}</div>
          </div>
          <div class="row">
            <div class="header-name">${i18nString(UIStrings.statusCode)}:</div>
            <div class="header-value ${coloredCircleClassName} ${statusTextHasComment ? 'status-with-comment' : ''}">${statusText}</div>
          </div>
        ` : ''}
        ${this.#request.remoteAddress()? html`
          <div class="row">
            <div class="header-name">${i18nString(UIStrings.remoteAddress)}:</div>
            <div class="header-value">${this.#request.remoteAddress()}</div>
          </div>
        ` : ''}
        ${this.#request.referrerPolicy()? html`
          <div class="row">
            <div class="header-name">${i18nString(UIStrings.referrerPolicy)}:</div>
            <div class="header-value">${this.#request.referrerPolicy()}</div>
          </div>
        ` : ''}
      </${Category.litTagName}>
    `;
    // clang-format on
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
}

export class Category extends HTMLElement {
  static readonly litTagName = LitHtml.literal`devtools-request-headers-category`;
  readonly #shadow = this.attachShadow({mode: 'open'});
  #expandedSetting?: Common.Settings.Setting<boolean>;
  #title: Common.UIString.LocalizedString = Common.UIString.LocalizedEmptyString;
  #headerCount?: number = undefined;
  #checked: boolean|undefined = undefined;

  connectedCallback(): void {
    this.#shadow.adoptedStyleSheets = [requestHeadersViewStyles, Input.checkboxStyles];
  }

  set data(data: CategoryData) {
    this.#title = data.title;
    this.#expandedSetting =
        Common.Settings.Settings.instance().createSetting('request-info-' + data.name + '-category-expanded', true);
    this.#headerCount = data.headerCount;
    this.#checked = data.checked;
    this.#render();
  }

  #onCheckboxToggle(): void {
    this.dispatchEvent(new ToggleRawHeadersEvent());
  }

  #render(): void {
    const isOpen = this.#expandedSetting ? this.#expandedSetting.get() : true;
    // Disabled until https://crbug.com/1079231 is fixed.
    // clang-format off
    render(html`
      <details ?open=${isOpen} @toggle=${this.#onToggle}>
        <summary class="header" @keydown=${this.#onSummaryKeyDown}>
          ${this.#title}${this.#headerCount ?
            html`<span class="header-count"> (${this.#headerCount})</span>` :
            LitHtml.nothing
          }
          ${this.#checked !== undefined ? html`
            <span class="raw-checkbox-container">
              <label>
                <input type="checkbox" .checked=${this.#checked} @change=${this.#onCheckboxToggle} />
                ${i18nString(UIStrings.raw)}
              </label>
            </span>
          ` : LitHtml.nothing}
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

interface BlockedDetailsDescriptor {
  explanation: () => string;
  examples: Array<{
    codeSnippet: string,
    comment?: (() => string),
  }>;
  link: {
    url: string,
  }|null;
}

interface HeaderDescriptor {
  name: string;
  value: Object|null;
  headerValueIncorrect?: boolean|null;
  blockedDetails?: BlockedDetailsDescriptor;
  headerNotSet: boolean|null;
  setCookieBlockedReasons?: Protocol.Network.SetCookieBlockedReason[];
}

const BlockedReasonDetails = new Map<Protocol.Network.BlockedReason, HeaderDescriptor>([
  [
    Protocol.Network.BlockedReason.CoepFrameResourceNeedsCoepHeader,
    {
      name: 'cross-origin-embedder-policy',
      value: null,
      headerValueIncorrect: null,
      blockedDetails: {
        explanation: i18nLazyString(UIStrings.toEmbedThisFrameInYourDocument),
        examples: [{codeSnippet: 'Cross-Origin-Embedder-Policy: require-corp', comment: undefined}],
        link: {url: 'https://web.dev/coop-coep/'},
      },
      headerNotSet: null,
    },
  ],
  [
    Protocol.Network.BlockedReason.CorpNotSameOriginAfterDefaultedToSameOriginByCoep,
    {
      name: 'cross-origin-resource-policy',
      value: null,
      headerValueIncorrect: null,
      blockedDetails: {
        explanation: i18nLazyString(UIStrings.toUseThisResourceFromADifferent),
        examples: [
          {
            codeSnippet: 'Cross-Origin-Resource-Policy: same-site',
            comment: i18nLazyString(UIStrings.chooseThisOptionIfTheResourceAnd),
          },
          {
            codeSnippet: 'Cross-Origin-Resource-Policy: cross-origin',
            comment: i18nLazyString(UIStrings.onlyChooseThisOptionIfAn),
          },
        ],
        link: {url: 'https://web.dev/coop-coep/'},
      },
      headerNotSet: null,
    },
  ],
  [
    Protocol.Network.BlockedReason.CoopSandboxedIframeCannotNavigateToCoopPage,
    {
      name: 'cross-origin-opener-policy',
      value: null,
      headerValueIncorrect: false,
      blockedDetails: {
        explanation: i18nLazyString(UIStrings.thisDocumentWasBlockedFrom),
        examples: [],
        link: {url: 'https://web.dev/coop-coep/'},
      },
      headerNotSet: null,
    },
  ],
  [
    Protocol.Network.BlockedReason.CorpNotSameSite,
    {
      name: 'cross-origin-resource-policy',
      value: null,
      headerValueIncorrect: true,
      blockedDetails: {
        explanation: i18nLazyString(UIStrings.toUseThisResourceFromADifferentSite),
        examples: [
          {
            codeSnippet: 'Cross-Origin-Resource-Policy: cross-origin',
            comment: i18nLazyString(UIStrings.onlyChooseThisOptionIfAn),
          },
        ],
        link: null,
      },
      headerNotSet: null,
    },
  ],
  [
    Protocol.Network.BlockedReason.CorpNotSameOrigin,
    {
      name: 'cross-origin-resource-policy',
      value: null,
      headerValueIncorrect: true,
      blockedDetails: {
        explanation: i18nLazyString(UIStrings.toUseThisResourceFromADifferentOrigin),
        examples: [
          {
            codeSnippet: 'Cross-Origin-Resource-Policy: same-site',
            comment: i18nLazyString(UIStrings.chooseThisOptionIfTheResourceAnd),
          },
          {
            codeSnippet: 'Cross-Origin-Resource-Policy: cross-origin',
            comment: i18nLazyString(UIStrings.onlyChooseThisOptionIfAn),
          },
        ],
        link: null,
      },
      headerNotSet: null,
    },
  ],
]);
