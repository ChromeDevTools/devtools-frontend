// Copyright (c) 2021 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as Common from '../../../core/common/common.js';
import * as i18n from '../../../core/i18n/i18n.js';
import type * as Platform from '../../../core/platform/platform.js';
import type * as SDK from '../../../core/sdk/sdk.js';
import type * as Protocol from '../../../generated/protocol.js';
import type * as Logs from '../../../models/logs/logs.js';
import * as NetworkForward from '../../../panels/network/forward/forward.js';
import * as IconButton from '../../../ui/components/icon_button/icon_button.js';
import * as Coordinator from '../../../ui/components/render_coordinator/render_coordinator.js';
import * as LitHtml from '../../../ui/lit-html/lit-html.js';
import * as VisualLogging from '../../../ui/visual_logging/visual_logging.js';

import requestLinkIconStyles from './requestLinkIcon.css.js';

const UIStrings = {
  /**
   * @description Title for a link to show a request in the network panel
   * @example {https://example.org/index.html} url
   */
  clickToShowRequestInTheNetwork: 'Click to open the network panel and show request for URL: {url}',
  /**
   * @description Title for an link to show a request that is unavailable because the request couldn't be resolved
   */
  requestUnavailableInTheNetwork: 'Request unavailable in the network panel, try reloading the inspected page',
  /**
   * @description Label for the shortened URL displayed in a link to show a request in the network panel
   */
  shortenedURL: 'Shortened URL',
};
const str_ = i18n.i18n.registerUIStrings('ui/components/request_link_icon/RequestLinkIcon.ts', UIStrings);
const i18nString = i18n.i18n.getLocalizedString.bind(undefined, str_);

const coordinator = Coordinator.RenderCoordinator.RenderCoordinator.instance();

export interface RequestLinkIconData {
  linkToPreflight?: boolean;
  request?: SDK.NetworkRequest.NetworkRequest|null;
  affectedRequest?: {requestId: Protocol.Network.RequestId, url?: string};
  highlightHeader?: {section: NetworkForward.UIRequestLocation.UIHeaderSection, name: string};
  networkTab?: NetworkForward.UIRequestLocation.UIRequestTabs;
  requestResolver?: Logs.RequestResolver.RequestResolver;
  displayURL?: boolean;
  // If displayURL && urlToDisplay !== undefined, uses urlToDisplay for the text of the link.
  // If displayURL only, uses filename of the URL.
  urlToDisplay?: string;
  additionalOnClickAction?: () => void;
  revealOverride?: (revealable: unknown, omitFocus?: boolean) => Promise<void>;
}

export const extractShortPath = (path: Platform.DevToolsPath.UrlString): string => {
  // 1st regex matches everything after last '/'
  // if path ends with '/', 2nd regex returns everything between the last two '/'
  return (/[^/]+$/.exec(path) || /[^/]+\/$/.exec(path) || [''])[0];
};

export class RequestLinkIcon extends HTMLElement {
  static readonly litTagName = LitHtml.literal`devtools-request-link-icon`;
  readonly #shadow = this.attachShadow({mode: 'open'});
  #linkToPreflight?: boolean;
  // The value `null` indicates that the request is not available,
  // `undefined` that it is still being resolved.
  #request?: SDK.NetworkRequest.NetworkRequest|null;
  #highlightHeader?: {section: NetworkForward.UIRequestLocation.UIHeaderSection, name: string};
  #requestResolver?: Logs.RequestResolver.RequestResolver;
  #displayURL: boolean = false;
  #urlToDisplay?: string;
  #networkTab?: NetworkForward.UIRequestLocation.UIRequestTabs;
  #affectedRequest?: {requestId: Protocol.Network.RequestId, url?: string};
  #additionalOnClickAction?: () => void;
  #reveal = Common.Revealer.reveal;

  set data(data: RequestLinkIconData) {
    this.#linkToPreflight = data.linkToPreflight;
    this.#request = data.request;
    if (data.affectedRequest) {
      this.#affectedRequest = {...data.affectedRequest};
    }
    this.#highlightHeader = data.highlightHeader;
    this.#networkTab = data.networkTab;
    this.#requestResolver = data.requestResolver;
    this.#displayURL = data.displayURL ?? false;
    this.#urlToDisplay = data.urlToDisplay;
    this.#additionalOnClickAction = data.additionalOnClickAction;
    if (data.revealOverride) {
      this.#reveal = data.revealOverride;
    }
    if (!this.#request && data.affectedRequest) {
      if (!this.#requestResolver) {
        throw new Error('A `RequestResolver` must be provided if an `affectedRequest` is provided.');
      }
      this.#requestResolver.waitFor(data.affectedRequest.requestId)
          .then(request => {
            this.#request = request;
            return this.#render();
          })
          .catch(() => {
            this.#request = null;
          });
    }
    void this.#render();
  }

  connectedCallback(): void {
    this.#shadow.adoptedStyleSheets = [requestLinkIconStyles];
  }

  get data(): RequestLinkIconData {
    return {
      linkToPreflight: this.#linkToPreflight,
      request: this.#request,
      affectedRequest: this.#affectedRequest,
      highlightHeader: this.#highlightHeader,
      networkTab: this.#networkTab,
      requestResolver: this.#requestResolver,
      displayURL: this.#displayURL,
      urlToDisplay: this.#urlToDisplay,
      additionalOnClickAction: this.#additionalOnClickAction,
      revealOverride: this.#reveal !== Common.Revealer.reveal ? this.#reveal : undefined,
    };
  }

  handleClick(event: MouseEvent): void {
    if (event.button !== 0) {
      return;  // Only handle left-click for now.
    }
    const linkedRequest = this.#linkToPreflight ? this.#request?.preflightRequest() : this.#request;
    if (!linkedRequest) {
      return;
    }
    if (this.#highlightHeader) {
      const requestLocation = NetworkForward.UIRequestLocation.UIRequestLocation.header(
          linkedRequest, this.#highlightHeader.section, this.#highlightHeader.name);
      void this.#reveal(requestLocation);
    } else {
      const requestLocation = NetworkForward.UIRequestLocation.UIRequestLocation.tab(
          linkedRequest, this.#networkTab ?? NetworkForward.UIRequestLocation.UIRequestTabs.HeadersComponent);
      void this.#reveal(requestLocation);
    }
    this.#additionalOnClickAction?.();
    event.consume();
  }

  #getTooltip(): Platform.UIString.LocalizedString {
    if (this.#request) {
      return i18nString(UIStrings.clickToShowRequestInTheNetwork, {url: this.#request.url()});
    }
    return i18nString(UIStrings.requestUnavailableInTheNetwork);
  }

  #getUrlForDisplaying(): Platform.DevToolsPath.UrlString|undefined {
    if (!this.#request) {
      return this.#affectedRequest?.url as Platform.DevToolsPath.UrlString;
    }
    return this.#request.url();
  }

  #maybeRenderURL(): LitHtml.LitTemplate {
    if (!this.#displayURL) {
      return LitHtml.nothing;
    }

    const url = this.#getUrlForDisplaying();
    if (!url) {
      return LitHtml.nothing;
    }

    if (this.#urlToDisplay) {
      return LitHtml.html`<span title=${url}>${this.#urlToDisplay}</span>`;
    }

    const filename = extractShortPath(url);
    return LitHtml.html`<span aria-label=${i18nString(UIStrings.shortenedURL)} title=${url}>${filename}</span>`;
  }

  async #render(): Promise<void> {
    return coordinator.write(() => {
      // clang-format off
      LitHtml.render(LitHtml.html`
      <button class=${LitHtml.Directives.classMap({'link': Boolean(this.#request)})}
              title=${this.#getTooltip()}
              jslog=${VisualLogging.link('request').track({click: true})}
              @click=${this.handleClick}>
        <${IconButton.Icon.Icon.litTagName} name="arrow-up-down-circle"></${IconButton.Icon.Icon.litTagName}>
        ${this.#maybeRenderURL()}
      </button>`,
      this.#shadow, {host: this});
      // clang-format on
    });
  }
}

customElements.define('devtools-request-link-icon', RequestLinkIcon);

declare global {
  interface HTMLElementTagNameMap {
    'devtools-request-link-icon': RequestLinkIcon;
  }
}
