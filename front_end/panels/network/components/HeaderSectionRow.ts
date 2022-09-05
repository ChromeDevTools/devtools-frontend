// Copyright 2022 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as SDK from '../../../core/sdk/sdk.js';
import * as ComponentHelpers from '../../../ui/components/helpers/helpers.js';
import * as LitHtml from '../../../ui/lit-html/lit-html.js';

import type * as Protocol from '../../../generated/protocol.js';
import * as i18n from '../../../core/i18n/i18n.js';
import * as Host from '../../../core/host/host.js';
import * as IconButton from '../../../ui/components/icon_button/icon_button.js';
import * as ClientVariations from '../../../third_party/chromium/client-variations/client-variations.js';

import headerSectionRowStyles from './HeaderSectionRow.css.js';

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
  *@description Text in Headers View of the Network panel for X-Client-Data HTTP headers
  */
  decoded: 'Decoded:',
  /**
  *@description Text that is usually a hyperlink to more documentation
  */
  learnMore: 'Learn more',
  /**
  *@description Text for a link to the issues panel
  */
  learnMoreInTheIssuesTab: 'Learn more in the issues tab',
};

const str_ = i18n.i18n.registerUIStrings('panels/network/components/HeaderSectionRow.ts', UIStrings);
const i18nString = i18n.i18n.getLocalizedString.bind(undefined, str_);

export interface HeaderSectionRowData {
  header: HeaderDescriptor;
}

export class HeaderSectionRow extends HTMLElement {
  static readonly litTagName = LitHtml.literal`devtools-header-section-row`;
  readonly #shadow = this.attachShadow({mode: 'open'});
  #header: HeaderDescriptor|null = null;

  connectedCallback(): void {
    this.#shadow.adoptedStyleSheets = [headerSectionRowStyles];
  }

  set data(data: HeaderSectionRowData) {
    this.#header = data.header;
    this.#render();
  }

  #render(): void {
    if (!this.#header) {
      return;
    }

    // Disabled until https://crbug.com/1079231 is fixed.
    // clang-format off
    render(html`
      <div class="row ${this.#header.highlight ? 'header-highlight' : ''}">
        <div class="header-name">
          ${this.#header.headerNotSet ?
            html`<div class="header-badge header-badge-text">${i18n.i18n.lockedString('not-set')}</div> ` :
            LitHtml.nothing
          }${this.#header.name}:
        </div>
        <div
          class="header-value ${this.#header.headerValueIncorrect ? 'header-warning' : ''}"
          @copy=${():void => Host.userMetrics.actionTaken(Host.UserMetrics.Action.NetworkPanelCopyValue)}
        >
          ${this.#header.value?.toString() || ''}
          ${this.#maybeRenderHeaderValueSuffix(this.#header)}
        </div>
      </div>
      ${this.#maybeRenderBlockedDetails(this.#header.blockedDetails)}
    `, this.#shadow, {host: this});
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
    if (blockedDetails?.reveal) {
      // Disabled until https://crbug.com/1079231 is fixed.
      // clang-format off
      return html`
        <div class="devtools-link" @click=${blockedDetails.reveal}>
          <${IconButton.Icon.Icon.litTagName} class="inline-icon" .data=${{
            iconName: 'issue-exclamation-icon',
            color: 'var(--issue-color-yellow)',
            width: '16px',
            height: '16px',
          } as IconButton.Icon.IconData}>
          </${IconButton.Icon.Icon.litTagName}
          >${i18nString(UIStrings.learnMoreInTheIssuesTab)}
        </div>
      `;
      // clang-format on
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
}

ComponentHelpers.CustomElements.defineComponent('devtools-header-section-row', HeaderSectionRow);

declare global {
  interface HTMLElementTagNameMap {
    'devtools-header-section-row': HeaderSectionRow;
  }
}

interface BlockedDetailsDescriptor {
  explanation: () => string;
  examples: Array<{
    codeSnippet: string,
    comment?: () => string,
  }>;
  link: {
    url: string,
  }|null;
  reveal?: () => void;
}

export interface HeaderDescriptor {
  name: string;
  value: Object|null;
  headerValueIncorrect?: boolean|null;
  blockedDetails?: BlockedDetailsDescriptor;
  headerNotSet: boolean|null;
  setCookieBlockedReasons?: Protocol.Network.SetCookieBlockedReason[];
  highlight?: boolean;
}
