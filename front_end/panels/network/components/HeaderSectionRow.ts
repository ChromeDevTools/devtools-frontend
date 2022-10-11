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
import * as Platform from '../../../core/platform/platform.js';

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

export class HeaderEditedEvent extends Event {
  static readonly eventName = 'headeredited';
  headerName: Platform.StringUtilities.LowerCaseString;
  headerValue: string;

  constructor(headerName: Platform.StringUtilities.LowerCaseString, headerValue: string) {
    super(HeaderEditedEvent.eventName, {});
    this.headerName = headerName;
    this.headerValue = headerValue;
  }
}

export interface HeaderSectionRowData {
  header: HeaderDescriptor;
}

export class HeaderSectionRow extends HTMLElement {
  static readonly litTagName = LitHtml.literal`devtools-header-section-row`;
  readonly #shadow = this.attachShadow({mode: 'open'});
  #header: HeaderDescriptor|null = null;
  readonly #boundRender = this.#render.bind(this);

  connectedCallback(): void {
    this.#shadow.adoptedStyleSheets = [headerSectionRowStyles];
    this.#shadow.addEventListener('focusin', this.#onFocusIn.bind(this));
    this.#shadow.addEventListener('focusout', this.#onFocusOut.bind(this));
    this.#shadow.addEventListener('keydown', this.#onKeyDown.bind(this));
    this.#shadow.addEventListener('paste', this.#onPaste.bind(this));
  }

  set data(data: HeaderSectionRowData) {
    this.#header = data.header;
    void ComponentHelpers.ScheduledRender.scheduleRender(this, this.#boundRender);
  }

  #render(): void {
    if (!ComponentHelpers.ScheduledRender.isScheduledRender(this)) {
      throw new Error('HeaderSectionRow render was not scheduled');
    }

    if (!this.#header) {
      return;
    }

    const rowClasses = LitHtml.Directives.classMap({
      row: true,
      'header-highlight': Boolean(this.#header.highlight),
      'header-overridden': Boolean(this.#header.isOverride),
      'header-editable': Boolean(this.#header.valueEditable),
    });

    // Disabled until https://crbug.com/1079231 is fixed.
    // clang-format off
    render(html`
      <div class=${rowClasses}>
        <div class="header-name">
          ${this.#header.headerNotSet ?
            html`<div class="header-badge header-badge-text">${i18n.i18n.lockedString('not-set')}</div> ` :
            LitHtml.nothing
          }${this.#header.nameEditable ? this.#renderEditable(this.#header.name) : this.#header.name}:
        </div>
        <div
          class="header-value ${this.#header.headerValueIncorrect ? 'header-warning' : ''}"
          @copy=${():void => Host.userMetrics.actionTaken(Host.UserMetrics.Action.NetworkPanelCopyValue)}
        >
          ${this.#header.valueEditable ? this.#renderEditable(this.#header.value || '') : this.#header.value || ''}
          ${this.#maybeRenderHeaderValueSuffix(this.#header)}
        </div>
      </div>
      ${this.#maybeRenderBlockedDetails(this.#header.blockedDetails)}
    `, this.#shadow, {host: this});
    // clang-format on
  }

  focus(): void {
    requestAnimationFrame(() => {
      const editableName = this.#shadow.querySelector<HTMLElement>('.header-name .editable');
      editableName?.focus();
    });
  }

  #renderEditable(value: string): LitHtml.TemplateResult {
    // This uses LitHtml's `live`-directive, so that when checking whether to
    // update during re-render, `value` is compared against the actual live DOM
    // value of the contenteditable element and not the potentially outdated
    // value from the previous render.
    // clang-format off
    return LitHtml.html`<span contenteditable="true" class="editable" tabindex="0" .innerText=${LitHtml.Directives.live(value)}></span>`;
    // clang-format on
  }

  #maybeRenderHeaderValueSuffix(header: HeaderDescriptor): LitHtml.LitTemplate {
    if (header.name === 'set-cookie' && header.setCookieBlockedReasons) {
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

    if (header.name === 'x-client-data') {
      const data = ClientVariations.parseClientVariations(header.value || '');
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

  #selectAllText(target: HTMLElement): void {
    const selection = window.getSelection();
    const range = document.createRange();
    range.selectNodeContents(target);
    selection?.removeAllRanges();
    selection?.addRange(range);
  }

  #onFocusIn(e: Event): void {
    const target = e.target as HTMLElement;
    if (target.matches('.editable')) {
      this.#selectAllText(target);
    }
  }

  #onFocusOut(): void {
    const headerNameElement = this.#shadow.querySelector('.header-name') as HTMLElement;
    const headerValueElement = this.#shadow.querySelector('.header-value') as HTMLElement;
    const headerName = Platform.StringUtilities.toLowerCaseString(headerNameElement.innerText.slice(0, -1));
    const headerValue = headerValueElement.innerText;

    if (headerName !== '') {
      if (headerName !== this.#header?.name || headerValue !== this.#header?.value) {
        this.dispatchEvent(new HeaderEditedEvent(headerName, headerValue));
      }
    } else {
      // If the header name has been edited to '', reset it to its previous value.
      const headerNameEditable = this.#shadow.querySelector('.header-name .editable');
      if (headerNameEditable) {
        (headerNameEditable as HTMLElement).innerText = this.#header?.name || '';
      }
    }

    // clear selection
    const selection = window.getSelection();
    selection?.removeAllRanges();
  }

  #onKeyDown(event: Event): void {
    const keyboardEvent = event as KeyboardEvent;
    const target = event.target as HTMLElement;
    if (keyboardEvent.key === 'Escape') {
      event.consume();
      if (target.matches('.header-name .editable')) {
        target.innerText = this.#header?.name || '';
      } else if (target.matches('.header-value .editable')) {
        target.innerText = this.#header?.value || '';
      }
      target.blur();
    }
    if (keyboardEvent.key === 'Enter') {
      event.preventDefault();
      target.blur();
    }
  }

  #onPaste(event: Event): void {
    const clipboardEvent = event as ClipboardEvent;
    event.preventDefault();
    if (clipboardEvent.clipboardData) {
      const text = clipboardEvent.clipboardData.getData('text/plain');

      const selection = this.#shadow.getSelection();
      if (!selection) {
        return;
      }
      selection.deleteFromDocument();
      selection.getRangeAt(0).insertNode(document.createTextNode(text));
    }
  }
}

ComponentHelpers.CustomElements.defineComponent('devtools-header-section-row', HeaderSectionRow);

declare global {
  interface HTMLElementTagNameMap {
    'devtools-header-section-row': HeaderSectionRow;
  }

  interface HTMLElementEventMap {
    [HeaderEditedEvent.eventName]: HeaderEditedEvent;
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

export interface HeaderDetailsDescriptor {
  name: Platform.StringUtilities.LowerCaseString;
  value: string|null;
  headerValueIncorrect?: boolean;
  blockedDetails?: BlockedDetailsDescriptor;
  headerNotSet?: boolean;
  setCookieBlockedReasons?: Protocol.Network.SetCookieBlockedReason[];
  highlight?: boolean;
}

export interface HeaderEditorDescriptor {
  name: Platform.StringUtilities.LowerCaseString;
  value: string|null;
  originalValue?: string|null;
  isOverride?: boolean;
  valueEditable?: boolean;
  nameEditable?: boolean;
}

export type HeaderDescriptor = HeaderDetailsDescriptor&HeaderEditorDescriptor;
