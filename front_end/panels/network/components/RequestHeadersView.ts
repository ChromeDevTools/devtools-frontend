// Copyright 2022 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as Common from '../../../core/common/common.js';
import * as i18n from '../../../core/i18n/i18n.js';
import {assertNotNullOrUndefined} from '../../../core/platform/platform.js';
import * as SDK from '../../../core/sdk/sdk.js';
import * as ComponentHelpers from '../../../ui/components/helpers/helpers.js';
import * as UI from '../../../ui/legacy/legacy.js';
import * as LitHtml from '../../../ui/lit-html/lit-html.js';

import requestHeadersViewStyles from './RequestHeadersView.css.js';

const {render, html} = LitHtml;

const UIStrings = {
  /**
  *@description Text in Request Headers View of the Network panel
  */
  fromMemoryCache: '(from memory cache)',
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
  fromPrefetchCache: '(from prefetch cache)',
  /**
  *@description Text in Request Headers View of the Network panel
  */
  fromDiskCache: '(from disk cache)',
  /**
  *@description Text in Request Headers View of the Network panel
  */
  fromWebBundle: '(from Web Bundle)',
  /**
  *@description Section header for a list of the main aspects of a http request
  */
  general: 'General',
  /**
  *@description The URL of a request
  */
  requestUrl: 'Request URL',
  /**
  *@description The HTTP method of a request
  */
  requestMethod: 'Request Method',
  /**
  *@description HTTP response code
  */
  statusCode: 'Status Code',
  /**
  *@description Text in Network Log View Columns of the Network panel
  */
  remoteAddress: 'Remote Address',
  /**
  *@description Text in Request Headers View of the Network panel
  */
  referrerPolicy: 'Referrer Policy',
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
    `, this.#shadow, {host: this});
    // clang-format on
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
      <${Category.litTagName} .data=${{name: 'general', title: i18nString(UIStrings.general)} as CategoryData}>
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

export interface CategoryData {
  name: string;
  title: Common.UIString.LocalizedString;
}

export class Category extends HTMLElement {
  static readonly litTagName = LitHtml.literal`devtools-request-headers-category`;
  readonly #shadow = this.attachShadow({mode: 'open'});
  #expandedSetting?: Common.Settings.Setting<boolean>;
  #title: Common.UIString.LocalizedString = Common.UIString.LocalizedEmptyString;

  connectedCallback(): void {
    this.#shadow.adoptedStyleSheets = [requestHeadersViewStyles];
  }

  set data(data: CategoryData) {
    this.#title = data.title;
    this.#expandedSetting =
        Common.Settings.Settings.instance().createSetting('request-info-' + data.name + '-category-expanded', true);
    this.#render();
  }

  #render(): void {
    // Disabled until https://crbug.com/1079231 is fixed.
    // clang-format off
    render(html`
      <details ?open=${this.#expandedSetting ? this.#expandedSetting.get() : true} @toggle=${this.#onToggle}>
        <summary class="header" @keydown=${this.#onSummaryKeyDown}>${this.#title}</summary>
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
