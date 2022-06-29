// Copyright 2022 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as Common from '../../../core/common/common.js';
import * as i18n from '../../../core/i18n/i18n.js';
import {assertNotNullOrUndefined} from '../../../core/platform/platform.js';
import * as SDK from '../../../core/sdk/sdk.js';
import * as Buttons from '../../../ui/components/buttons/buttons.js';
import * as ComponentHelpers from '../../../ui/components/helpers/helpers.js';
import * as UI from '../../../ui/legacy/legacy.js';
import * as LitHtml from '../../../ui/lit-html/lit-html.js';

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
    assertNotNullOrUndefined(this.#request);

    // Disabled until https://crbug.com/1079231 is fixed.
    // clang-format off
    render(html`
      ${this.#renderGeneralSection()}
      ${this.#renderResponseHeaders()}
      ${this.#renderRequestHeaders()}
    `, this.#shadow, {host: this});
    // clang-format on
  }

  #renderResponseHeaders(): LitHtml.TemplateResult {
    assertNotNullOrUndefined(this.#request);

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
          ${this.#request.sortedResponseHeaders.map(header => html`
            <div class="row">
              <div class="header-name">${header.name}:</div>
              <div class="header-value">${header.value}</div>
            </div>
          `)}
        `}
      </${Category.litTagName}>
    `;
  }

  #renderRequestHeaders(): LitHtml.TemplateResult {
    assertNotNullOrUndefined(this.#request);

    const toggleShowRaw = (): void => {
      this.#showRequestHeadersText = !this.#showRequestHeadersText;
      this.#render();
    };

    const requestHeadersText = this.#request.requestHeadersText();

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
          ${this.#request.requestHeaders().map(header => html`
            <div class="row">
              <div class="header-name">${header.name}:</div>
              <div class="header-value">${header.value}</div>
            </div>
          `)}
        `}
      </${Category.litTagName}>
    `;
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

  #renderGeneralSection(): LitHtml.TemplateResult {
    assertNotNullOrUndefined(this.#request);

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
    this.#shadow.adoptedStyleSheets = [requestHeadersViewStyles];
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
