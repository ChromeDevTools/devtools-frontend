// Copyright 2022 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as ComponentHelpers from '../../../ui/components/helpers/helpers.js';
import * as LitHtml from '../../../ui/lit-html/lit-html.js';

import type * as SDK from '../../../core/sdk/sdk.js';
import * as i18n from '../../../core/i18n/i18n.js';
import * as NetworkForward from '../forward/forward.js';
import * as IconButton from '../../../ui/components/icon_button/icon_button.js';
import * as Platform from '../../../core/platform/platform.js';
import {type HeaderDescriptor, HeaderSectionRow, type HeaderSectionRowData} from './HeaderSectionRow.js';

import requestHeaderSectionStyles from './RequestHeaderSection.css.js';

const {render, html} = LitHtml;

const UIStrings = {
  /**
   *@description Text that is usually a hyperlink to more documentation
   */
  learnMore: 'Learn more',
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
};

const str_ = i18n.i18n.registerUIStrings('panels/network/components/RequestHeaderSection.ts', UIStrings);
const i18nString = i18n.i18n.getLocalizedString.bind(undefined, str_);

export interface RequestHeaderSectionData {
  request: SDK.NetworkRequest.NetworkRequest;
  toReveal?: {section: NetworkForward.UIRequestLocation.UIHeaderSection, header?: string};
}

export class RequestHeaderSection extends HTMLElement {
  static readonly litTagName = LitHtml.literal`devtools-request-header-section`;
  readonly #shadow = this.attachShadow({mode: 'open'});
  #request?: Readonly<SDK.NetworkRequest.NetworkRequest>;
  #headers: HeaderDescriptor[] = [];

  connectedCallback(): void {
    this.#shadow.adoptedStyleSheets = [requestHeaderSectionStyles];
  }

  set data(data: RequestHeaderSectionData) {
    this.#request = data.request;

    this.#headers = this.#request.requestHeaders().map(header => ({
                                                         name: Platform.StringUtilities.toLowerCaseString(header.name),
                                                         value: header.value,
                                                       }));
    this.#headers.sort((a, b) => Platform.StringUtilities.compare(a.name, b.name));

    if (data.toReveal?.section === NetworkForward.UIRequestLocation.UIHeaderSection.Request) {
      this.#headers.filter(header => header.name === data.toReveal?.header?.toLowerCase()).forEach(header => {
        header.highlight = true;
      });
    }

    this.#render();
  }

  #render(): void {
    if (!this.#request) {
      return;
    }

    // Disabled until https://crbug.com/1079231 is fixed.
    // clang-format off
    render(html`
      ${this.#maybeRenderProvisionalHeadersWarning()}
      ${this.#headers.map(header => html`
        <${HeaderSectionRow.litTagName} .data=${{
          header: header,
        } as HeaderSectionRowData}></${HeaderSectionRow.litTagName}>
      `)}
    `, this.#shadow, {host: this});
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
}

ComponentHelpers.CustomElements.defineComponent('devtools-request-header-section', RequestHeaderSection);

declare global {
  interface HTMLElementTagNameMap {
    'devtools-request-header-section': RequestHeaderSection;
  }
}
