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
import * as Buttons from '../../../ui/components/buttons/buttons.js';

import {EditableSpan, type EditableSpanData} from './EditableSpan.js';
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
   *@description The title of a button to enable overriding a HTTP header.
   */
  editHeader: 'Override header',
  /**
   *@description Description of which letters the name of an HTTP header may contain (a-z, A-Z, 0-9, '-', or '_').
   */
  headerNamesOnlyLetters: 'Header names should contain only letters, digits, hyphens or underscores',
  /**
   *@description Text that is usually a hyperlink to more documentation
   */
  learnMore: 'Learn more',
  /**
   *@description Text for a link to the issues panel
   */
  learnMoreInTheIssuesTab: 'Learn more in the issues tab',
  /**
   *@description Hover text prompting the user to reload the whole page or refresh the particular request, so that the changes they made take effect.
   */
  reloadPrompt: 'Refresh the page/request for these changes to take effect',
  /**
   *@description The title of a button which removes a HTTP header override.
   */
  removeOverride: 'Remove this header override',
};

const str_ = i18n.i18n.registerUIStrings('panels/network/components/HeaderSectionRow.ts', UIStrings);
const i18nString = i18n.i18n.getLocalizedString.bind(undefined, str_);

const trashIconUrl = new URL('../../../Images/bin.svg', import.meta.url).toString();
const editIconUrl = new URL('../../../Images/edit.svg', import.meta.url).toString();

export const isValidHeaderName = (headerName: string): boolean => {
  return /^[a-z0-9_\-]+$/i.test(headerName);
};

export const compareHeaders = (first: string|null|undefined, second: string|null|undefined): boolean => {
  // Replaces all whitespace characters with regular spaces.
  // When working with contenteditables, their content can contain (non-obvious)
  // non-breaking spaces (NBSPs). It would be tricky to get rid of NBSPs during
  // editing and saving, so we just handle them after reading them in.
  // Tab characters are invalid in headers (and DevTools shows a warning for
  // them), the replacement here ensures that headers containing tabs are not
  // incorrectly marked as being overridden.
  return first?.replaceAll(/\s/g, ' ') === second?.replaceAll(/\s/g, ' ');
};

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

export class HeaderRemovedEvent extends Event {
  static readonly eventName = 'headerremoved';
  headerName: Platform.StringUtilities.LowerCaseString;
  headerValue: string;

  constructor(headerName: Platform.StringUtilities.LowerCaseString, headerValue: string) {
    super(HeaderRemovedEvent.eventName, {});
    this.headerName = headerName;
    this.headerValue = headerValue;
  }
}

export class EnableHeaderEditingEvent extends Event {
  static readonly eventName = 'enableheaderediting';

  constructor() {
    super(EnableHeaderEditingEvent.eventName, {});
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
  #isHeaderValueEdited = false;
  #isValidHeaderName = true;

  connectedCallback(): void {
    this.#shadow.adoptedStyleSheets = [headerSectionRowStyles];
  }

  set data(data: HeaderSectionRowData) {
    this.#header = data.header;
    this.#isHeaderValueEdited =
        this.#header.originalValue !== undefined && this.#header.value !== this.#header.originalValue;
    this.#isValidHeaderName = isValidHeaderName(this.#header.name);
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
      'header-overridden': Boolean(this.#header.isOverride) || this.#isHeaderValueEdited,
      'header-editable': Boolean(this.#header.valueEditable),
      'header-deleted': Boolean(this.#header.isDeleted),
    });

    const headerNameClasses = LitHtml.Directives.classMap({
      'header-name': true,
      'pseudo-header': this.#header.name.startsWith(':'),
    });

    const headerValueClasses = LitHtml.Directives.classMap({
      'header-value': true,
      'header-warning': Boolean(this.#header.headerValueIncorrect),
      'flex-columns': this.#header.name === 'x-client-data' && !this.#header.isResponseHeader,
    });

    // The header name is only editable when the header value is editable as well.
    // This ensures the header name's editability reacts correctly to enabling or
    // disabling local overrides.
    const isHeaderNameEditable = this.#header.nameEditable && this.#header.valueEditable;

    // Case 1: Headers which were just now added via the 'Add header button'.
    //         'nameEditable' is true only for such headers.
    // Case 2: Headers for which the user clicked the 'remove' button.
    // Case 3: Headers for which there is a mismatch between original header
    //         value and current header value.
    const showReloadInfoIcon = this.#header.nameEditable || this.#header.isDeleted || this.#isHeaderValueEdited;

    // Disabled until https://crbug.com/1079231 is fixed.
    // clang-format off
    render(html`
      <div class=${rowClasses}>
        <div class=${headerNameClasses}>
          ${this.#header.headerNotSet ?
            html`<div class="header-badge header-badge-text">${i18n.i18n.lockedString('not-set')}</div> ` :
            LitHtml.nothing
          }
          ${isHeaderNameEditable && !this.#isValidHeaderName ?
            html`<${IconButton.Icon.Icon.litTagName} class="inline-icon disallowed-characters" title=${UIStrings.headerNamesOnlyLetters} .data=${{
              iconName: 'cross-circle-filled',
              width: '16px',
              height: '16px',
              color: 'var(--icon-error)',
            } as IconButton.Icon.IconData}>
            </${IconButton.Icon.Icon.litTagName}>` : LitHtml.nothing
          }
          ${isHeaderNameEditable && !this.#header.isDeleted ?
            html`<${EditableSpan.litTagName}
              @focusout=${this.#onHeaderNameFocusOut}
              @keydown=${this.#onKeyDown}
              @input=${this.#onHeaderNameEdit}
              @paste=${this.#onHeaderNameEdit}
              .data=${{value: this.#header.name} as EditableSpanData}
            ></${EditableSpan.litTagName}>` :
            this.#header.name}:
        </div>
        <div
          class=${headerValueClasses}
          @copy=${():void => Host.userMetrics.actionTaken(Host.UserMetrics.Action.NetworkPanelCopyValue)}
        >
          ${this.#renderHeaderValue()}
        </div>
        ${showReloadInfoIcon ?
          html`<${IconButton.Icon.Icon.litTagName} class="row-flex-icon flex-right" title=${UIStrings.reloadPrompt} .data=${{
            iconName: 'info',
            width: '16px',
            height: '16px',
            color: 'var(--icon-default)',
          } as IconButton.Icon.IconData}>
          </${IconButton.Icon.Icon.litTagName}>` : LitHtml.nothing
        }
      </div>
      ${this.#maybeRenderBlockedDetails(this.#header.blockedDetails)}
    `, this.#shadow, {host: this});
    // clang-format on

    if (this.#header.highlight) {
      this.scrollIntoView({behavior: 'auto'});
    }
  }

  #renderHeaderValue(): LitHtml.LitTemplate {
    if (!this.#header) {
      return LitHtml.nothing;
    }
    if (this.#header.name === 'x-client-data' && !this.#header.isResponseHeader) {
      return this.#renderXClientDataHeader(this.#header);
    }

    if (this.#header.isDeleted || !this.#header.valueEditable) {
      // clang-format off
      return html`
      ${this.#header.value || ''}
      ${this.#maybeRenderHeaderValueSuffix(this.#header)}
      ${this.#header.isResponseHeader && !this.#header.isDeleted ? html`
        <${Buttons.Button.Button.litTagName}
          title=${i18nString(UIStrings.editHeader)}
          .size=${Buttons.Button.Size.TINY}
          .iconUrl=${editIconUrl}
          .variant=${Buttons.Button.Variant.ROUND}
          .iconWidth=${'16px'}
          .iconHeight=${'16px'}
          @click=${(): void => {
            this.dispatchEvent(new EnableHeaderEditingEvent());
          }}
          class="enable-editing inline-button"
        ></${Buttons.Button.Button.litTagName}>
      ` : LitHtml.nothing}
    `;
    }
    return html`
      <${EditableSpan.litTagName}
        @focusout=${this.#onHeaderValueFocusOut}
        @input=${this.#onHeaderValueEdit}
        @paste=${this.#onHeaderValueEdit}
        @keydown=${this.#onKeyDown}
        .data=${{value: this.#header.value || ''} as EditableSpanData}
      ></${EditableSpan.litTagName}>
      ${this.#maybeRenderHeaderValueSuffix(this.#header)}
      <${Buttons.Button.Button.litTagName}
        title=${i18nString(UIStrings.removeOverride)}
        .size=${Buttons.Button.Size.TINY}
        .iconUrl=${trashIconUrl}
        .variant=${Buttons.Button.Variant.ROUND}
        .iconWidth=${'13px'}
        .iconHeight=${'13px'}
        class="remove-header inline-button"
        @click=${this.#onRemoveOverrideClick}
      ></${Buttons.Button.Button.litTagName}>
    `;
    // clang-format on
  }

  #renderXClientDataHeader(header: HeaderDescriptor): LitHtml.LitTemplate {
    const data = ClientVariations.parseClientVariations(header.value || '');
    const output = ClientVariations.formatClientVariations(
        data, i18nString(UIStrings.activeClientExperimentVariation),
        i18nString(UIStrings.activeClientExperimentVariationIds));
    // clang-format off
    return html`
      <div>${header.value || ''}</div>
      <div>${i18nString(UIStrings.decoded)}</div>
      <code>${output}</code>
    `;
    // clang-format on
  }

  override focus(): void {
    requestAnimationFrame(() => {
      const editableName = this.#shadow.querySelector<HTMLElement>('.header-name devtools-editable-span');
      editableName?.focus();
    });
  }

  #maybeRenderHeaderValueSuffix(header: HeaderDescriptor): LitHtml.LitTemplate {
    if (header.name === 'set-cookie' && header.setCookieBlockedReasons) {
      const titleText =
          header.setCookieBlockedReasons.map(SDK.NetworkRequest.setCookieBlockedReasonToUiString).join('\n');
      // Disabled until https://crbug.com/1079231 is fixed.
      // clang-format off
      return html`
        <${IconButton.Icon.Icon.litTagName} class="row-flex-icon" title=${titleText} .data=${{
            iconName: 'warning-filled',
            color: 'var(--icon-warning)',
            width: '16px',
            height: '16px',
          } as IconButton.Icon.IconData}>
        </${IconButton.Icon.Icon.litTagName}>
      `;
      // clang-format on
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
            iconName: 'issue-exclamation-filled',
            color: 'var(--icon-warning)',
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
            iconName: 'open-externally',
            color: 'var(--icon-link)',
            width: '20px',
            height: '20px',
          } as IconButton.Icon.IconData}>
          </${IconButton.Icon.Icon.litTagName}
          >${i18nString(UIStrings.learnMore)}
        </x-link>
      `;
      // clang-format on
    }
    return LitHtml.nothing;
  }

  #onHeaderValueFocusOut(event: Event): void {
    const target = event.target as EditableSpan;
    if (!this.#header) {
      return;
    }
    const headerValue = target.value.trim();
    if (!compareHeaders(headerValue, this.#header.value?.trim())) {
      this.#header.value = headerValue;
      this.dispatchEvent(new HeaderEditedEvent(this.#header.name, headerValue));
      void ComponentHelpers.ScheduledRender.scheduleRender(this, this.#boundRender);
    }

    // Clear selection (needed when pressing 'enter' in editable span).
    const selection = window.getSelection();
    selection?.removeAllRanges();
  }

  #onHeaderNameFocusOut(event: Event): void {
    const target = event.target as EditableSpan;
    if (!this.#header) {
      return;
    }
    const headerName = Platform.StringUtilities.toLowerCaseString(target.value.trim());
    // If the header name has been edited to '', reset it to its previous value.
    if (headerName === '') {
      target.value = this.#header.name;
    } else if (!compareHeaders(headerName, this.#header.name.trim())) {
      this.#header.name = headerName;
      this.dispatchEvent(new HeaderEditedEvent(headerName, this.#header.value || ''));
      void ComponentHelpers.ScheduledRender.scheduleRender(this, this.#boundRender);
    }

    // Clear selection (needed when pressing 'enter' in editable span).
    const selection = window.getSelection();
    selection?.removeAllRanges();
  }

  #onRemoveOverrideClick(): void {
    if (!this.#header) {
      return;
    }
    const headerValueElement = this.#shadow.querySelector('.header-value devtools-editable-span') as EditableSpan;
    if (this.#header.originalValue) {
      headerValueElement.value = this.#header?.originalValue;
    }
    this.dispatchEvent(new HeaderRemovedEvent(this.#header.name, this.#header.value || ''));
  }

  #onKeyDown(event: Event): void {
    const keyboardEvent = event as KeyboardEvent;
    const target = event.target as EditableSpan;
    if (keyboardEvent.key === 'Escape') {
      event.consume();
      if (target.matches('.header-name devtools-editable-span')) {
        target.value = this.#header?.name || '';
        this.#onHeaderNameEdit(event);
      } else if (target.matches('.header-value devtools-editable-span')) {
        target.value = this.#header?.value || '';
        this.#onHeaderValueEdit(event);
      }
      target.blur();
    }
  }

  #onHeaderNameEdit(event: Event): void {
    const editable = event.target as EditableSpan;
    const isValidName = isValidHeaderName(editable.value);
    if (this.#isValidHeaderName !== isValidName) {
      this.#isValidHeaderName = isValidName;
      void ComponentHelpers.ScheduledRender.scheduleRender(this, this.#boundRender);
    }
  }

  #onHeaderValueEdit(event: Event): void {
    const editable = event.target as EditableSpan;
    const isEdited =
        this.#header?.originalValue !== undefined && !compareHeaders(this.#header?.originalValue || '', editable.value);
    if (this.#isHeaderValueEdited !== isEdited) {
      this.#isHeaderValueEdited = isEdited;
      if (this.#header) {
        this.#header.highlight = false;
      }
      void ComponentHelpers.ScheduledRender.scheduleRender(this, this.#boundRender);
    }
  }
}

ComponentHelpers.CustomElements.defineComponent('devtools-header-section-row', HeaderSectionRow);

declare global {
  interface HTMLElementTagNameMap {
    'devtools-header-section-row': HeaderSectionRow;
    'devtools-editable-span': EditableSpan;
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
  isResponseHeader?: boolean;
}

export interface HeaderEditorDescriptor {
  name: Platform.StringUtilities.LowerCaseString;
  value: string|null;
  originalValue?: string|null;
  isOverride?: boolean;
  valueEditable?: boolean;
  nameEditable?: boolean;
  isDeleted?: boolean;
}

export type HeaderDescriptor = HeaderDetailsDescriptor&HeaderEditorDescriptor;
