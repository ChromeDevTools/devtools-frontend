// Copyright 2022 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.
/* eslint-disable @devtools/no-lit-render-outside-of-view */
import '../../../ui/legacy/legacy.js';
import * as Host from '../../../core/host/host.js';
import * as i18n from '../../../core/i18n/i18n.js';
import * as Platform from '../../../core/platform/platform.js';
import * as SDK from '../../../core/sdk/sdk.js';
import * as ClientVariations from '../../../third_party/chromium/client-variations/client-variations.js';
import * as Buttons from '../../../ui/components/buttons/buttons.js';
import * as ComponentHelpers from '../../../ui/components/helpers/helpers.js';
import * as Lit from '../../../ui/lit/lit.js';
import * as VisualLogging from '../../../ui/visual_logging/visual_logging.js';
import headerSectionRowStyles from './HeaderSectionRow.css.js';
const { render, html } = Lit;
const UIStrings = {
    /**
     * @description Comment used in decoded X-Client-Data HTTP header output in Headers View of the Network panel
     */
    activeClientExperimentVariation: 'Active `client experiment variation IDs`.',
    /**
     * @description Comment used in decoded X-Client-Data HTTP header output in Headers View of the Network panel
     */
    activeClientExperimentVariationIds: 'Active `client experiment variation IDs` that trigger server-side behavior.',
    /**
     * @description Text in Headers View of the Network panel for X-Client-Data HTTP headers
     */
    decoded: 'Decoded:',
    /**
     * @description The title of a button to enable overriding a HTTP header.
     */
    editHeader: 'Override header',
    /**
     * @description Description of which letters the name of an HTTP header may contain (a-z, A-Z, 0-9, '-', or '_').
     */
    headerNamesOnlyLetters: 'Header names should contain only letters, digits, hyphens or underscores',
    /**
     * @description Text that is usually a hyperlink to more documentation
     */
    learnMore: 'Learn more',
    /**
     * @description Text for a link to the issues panel
     */
    learnMoreInTheIssuesTab: 'Learn more in the issues tab',
    /**
     * @description Hover text prompting the user to reload the whole page or refresh the particular request, so that the changes they made take effect.
     */
    reloadPrompt: 'Refresh the page/request for these changes to take effect',
    /**
     * @description The title of a button which removes a HTTP header override.
     */
    removeOverride: 'Remove this header override',
};
const str_ = i18n.i18n.registerUIStrings('panels/network/components/HeaderSectionRow.ts', UIStrings);
const i18nString = i18n.i18n.getLocalizedString.bind(undefined, str_);
export const isValidHeaderName = (headerName) => {
    return /^[a-z0-9_\-]+$/i.test(headerName);
};
export const compareHeaders = (first, second) => {
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
    static eventName = 'headeredited';
    headerName;
    headerValue;
    constructor(headerName, headerValue) {
        super(HeaderEditedEvent.eventName, {});
        this.headerName = headerName;
        this.headerValue = headerValue;
    }
}
export class HeaderRemovedEvent extends Event {
    static eventName = 'headerremoved';
    headerName;
    headerValue;
    constructor(headerName, headerValue) {
        super(HeaderRemovedEvent.eventName, {});
        this.headerName = headerName;
        this.headerValue = headerValue;
    }
}
export class EnableHeaderEditingEvent extends Event {
    static eventName = 'enableheaderediting';
    constructor() {
        super(EnableHeaderEditingEvent.eventName, {});
    }
}
export class HeaderSectionRow extends HTMLElement {
    #shadow = this.attachShadow({ mode: 'open' });
    #header = null;
    #isHeaderValueEdited = false;
    #isValidHeaderName = true;
    set data(data) {
        this.#header = data.header;
        this.#isHeaderValueEdited =
            this.#header.originalValue !== undefined && this.#header.value !== this.#header.originalValue;
        this.#isValidHeaderName = isValidHeaderName(this.#header.name);
        void ComponentHelpers.ScheduledRender.scheduleRender(this, this.#render);
    }
    #render() {
        if (!ComponentHelpers.ScheduledRender.isScheduledRender(this)) {
            throw new Error('HeaderSectionRow render was not scheduled');
        }
        if (!this.#header) {
            return;
        }
        const rowClasses = Lit.Directives.classMap({
            row: true,
            'header-highlight': Boolean(this.#header.highlight),
            'header-overridden': Boolean(this.#header.isOverride) || this.#isHeaderValueEdited,
            'header-editable': this.#header.valueEditable === 1 /* EditingAllowedStatus.ENABLED */,
            'header-deleted': Boolean(this.#header.isDeleted),
        });
        const headerNameClasses = Lit.Directives.classMap({
            'header-name': true,
            'pseudo-header': this.#header.name.startsWith(':'),
        });
        const headerValueClasses = Lit.Directives.classMap({
            'header-value': true,
            'header-warning': Boolean(this.#header.headerValueIncorrect),
            'flex-columns': this.#header.name === 'x-client-data' && !this.#header.isResponseHeader,
        });
        // The header name is only editable when the header value is editable as well.
        // This ensures the header name's editability reacts correctly to enabling or
        // disabling local overrides.
        const isHeaderNameEditable = this.#header.nameEditable && this.#header.valueEditable === 1 /* EditingAllowedStatus.ENABLED */;
        // Case 1: Headers which were just now added via the 'Add header button'.
        //         'nameEditable' is true only for such headers.
        // Case 2: Headers for which the user clicked the 'remove' button.
        // Case 3: Headers for which there is a mismatch between original header
        //         value and current header value.
        const showReloadInfoIcon = this.#header.nameEditable || this.#header.isDeleted || this.#isHeaderValueEdited;
        // Disabled until https://crbug.com/1079231 is fixed.
        // clang-format off
        render(html `
      <style>${headerSectionRowStyles}</style>
      <div class=${rowClasses}>
        <div class=${headerNameClasses}>
          ${this.#header.headerNotSet ?
            html `<div class="header-badge header-badge-text">${i18n.i18n.lockedString('not-set')}</div> ` :
            Lit.nothing}
          ${isHeaderNameEditable && !this.#isValidHeaderName ?
            html `<devtools-icon class="inline-icon disallowed-characters medium" title=${UIStrings.headerNamesOnlyLetters} name='cross-circle-filled'>
            </devtools-icon>` : Lit.nothing}
          ${isHeaderNameEditable && !this.#header.isDeleted ?
            html `<devtools-editable-span
              @focusout=${this.#onHeaderNameFocusOut}
              @keydown=${this.#onKeyDown}
              @input=${this.#onHeaderNameEdit}
              @paste=${this.#onHeaderNamePaste}
              .data=${{ value: this.#header.name }}
            ></devtools-editable-span>` :
            this.#header.name}
        </div>
        <div
          class=${headerValueClasses}
          @copy=${() => Host.userMetrics.actionTaken(Host.UserMetrics.Action.NetworkPanelCopyValue)}
        >
          ${this.#renderHeaderValue()}
        </div>
        ${showReloadInfoIcon ?
            html `<devtools-icon name="info" class="row-flex-icon flex-right medium" title=${UIStrings.reloadPrompt}>
          </devtools-icon>` : Lit.nothing}
      </div>
      ${this.#maybeRenderBlockedDetails(this.#header.blockedDetails)}
    `, this.#shadow, { host: this });
        // clang-format on
        if (this.#header.highlight) {
            this.scrollIntoView({ behavior: 'auto' });
        }
    }
    #renderHeaderValue() {
        if (!this.#header) {
            return Lit.nothing;
        }
        if (this.#header.name === 'x-client-data' && !this.#header.isResponseHeader) {
            return this.#renderXClientDataHeader(this.#header);
        }
        if (this.#header.isDeleted || this.#header.valueEditable !== 1 /* EditingAllowedStatus.ENABLED */) {
            const showEditHeaderButton = this.#header.isResponseHeader && !this.#header.isDeleted &&
                this.#header.valueEditable !== 2 /* EditingAllowedStatus.FORBIDDEN */;
            // clang-format off
            return html `
      ${this.#header.value || ''}
      ${this.#maybeRenderHeaderValueSuffix(this.#header)}
      ${showEditHeaderButton ? html `
        <devtools-button
          title=${i18nString(UIStrings.editHeader)}
          .accessibleLabel=${i18nString(UIStrings.editHeader)}
          .size=${"SMALL" /* Buttons.Button.Size.SMALL */}
          .iconName=${'edit'}
          .variant=${"icon" /* Buttons.Button.Variant.ICON */}
          @click=${() => {
                this.dispatchEvent(new EnableHeaderEditingEvent());
            }}
          jslog=${VisualLogging.action('enable-header-overrides').track({ click: true })}
          class="enable-editing inline-button"
        ></devtools-button>
      ` : Lit.nothing}
    `;
        }
        return html `
      <devtools-editable-span
        @focusout=${this.#onHeaderValueFocusOut}
        @input=${this.#onHeaderValueEdit}
        @paste=${this.#onHeaderValueEdit}
        @keydown=${this.#onKeyDown}
        .data=${{ value: this.#header.value || '' }}
      ></devtools-editable-span>
      ${this.#maybeRenderHeaderValueSuffix(this.#header)}
      <devtools-button
        title=${i18nString(UIStrings.removeOverride)}
        .size=${"SMALL" /* Buttons.Button.Size.SMALL */}
        .iconName=${'bin'}
        .variant=${"icon" /* Buttons.Button.Variant.ICON */}
        class="remove-header inline-button"
        @click=${this.#onRemoveOverrideClick}
        jslog=${VisualLogging.action('remove-header-override').track({ click: true })}
      ></devtools-button>
    `;
        // clang-format on
    }
    #renderXClientDataHeader(header) {
        const data = ClientVariations.parseClientVariations(header.value || '');
        const output = ClientVariations.formatClientVariations(data, i18nString(UIStrings.activeClientExperimentVariation), i18nString(UIStrings.activeClientExperimentVariationIds));
        // clang-format off
        return html `
      <div>${header.value || ''}</div>
      <div>${i18nString(UIStrings.decoded)}</div>
      <code>${output}</code>
    `;
        // clang-format on
    }
    focus() {
        requestAnimationFrame(() => {
            const editableName = this.#shadow.querySelector('.header-name devtools-editable-span');
            editableName?.focus();
        });
    }
    #maybeRenderHeaderValueSuffix(header) {
        if (header.name === 'set-cookie' && header.setCookieBlockedReasons) {
            const titleText = header.setCookieBlockedReasons.map(SDK.NetworkRequest.setCookieBlockedReasonToUiString).join('\n');
            // Disabled until https://crbug.com/1079231 is fixed.
            // clang-format off
            return html `
        <devtools-icon class="row-flex-icon medium" title=${titleText} name='warning-filled'>
        </devtools-icon>
      `;
            // clang-format on
        }
        return Lit.nothing;
    }
    #maybeRenderBlockedDetails(blockedDetails) {
        if (!blockedDetails) {
            return Lit.nothing;
        }
        // Disabled until https://crbug.com/1079231 is fixed.
        // clang-format off
        return html `
      <div class="call-to-action">
        <div class="call-to-action-body">
          <div class="explanation">${blockedDetails.explanation()}</div>
          ${blockedDetails.examples.map(example => html `
            <div class="example">
              <code>${example.codeSnippet}</code> ${example.comment ? html `<span class="comment"> ${example.comment()}</span>` : ''}
           </div>`)} ${this.#maybeRenderBlockedDetailsLink(blockedDetails)}
        </div>
      </div>
    `;
        // clang-format on
    }
    #maybeRenderBlockedDetailsLink(blockedDetails) {
        if (blockedDetails?.reveal) {
            // Disabled until https://crbug.com/1079231 is fixed.
            // clang-format off
            return html `
        <div class="devtools-link" @click=${blockedDetails.reveal}>
          <devtools-icon name="issue-exclamation-filled" class="inline-icon medium">
          </devtools-icon
          >${i18nString(UIStrings.learnMoreInTheIssuesTab)}
        </div>
      `;
            // clang-format on
        }
        if (blockedDetails?.link) {
            // Disabled until https://crbug.com/1079231 is fixed.
            // clang-format off
            return html `
        <x-link href=${blockedDetails.link.url} class="link">
          <devtools-icon name="open-externally" class="inline-icon extra-large" style="color: var(--icon-link);">
          </devtools-icon
          >${i18nString(UIStrings.learnMore)}
        </x-link>
      `;
            // clang-format on
        }
        return Lit.nothing;
    }
    #onHeaderValueFocusOut(event) {
        const target = event.target;
        if (!this.#header) {
            return;
        }
        const headerValue = target.value.trim();
        if (!compareHeaders(headerValue, this.#header.value?.trim())) {
            this.#header.value = headerValue;
            this.dispatchEvent(new HeaderEditedEvent(this.#header.name, headerValue));
            void ComponentHelpers.ScheduledRender.scheduleRender(this, this.#render);
        }
        // Clear selection (needed when pressing 'enter' in editable span).
        const selection = window.getSelection();
        selection?.removeAllRanges();
        // Reset pasted header name
        this.#header.originalName = '';
    }
    #onHeaderNameFocusOut(event) {
        const target = event.target;
        if (!this.#header) {
            return;
        }
        const headerName = Platform.StringUtilities.toLowerCaseString(target.value.trim());
        // If the header name has been edited to '', reset it to its previous value.
        if (headerName === '') {
            target.value = this.#header.name;
        }
        else if (!compareHeaders(headerName, this.#header.name.trim())) {
            this.#header.name = headerName;
            this.dispatchEvent(new HeaderEditedEvent(headerName, this.#header.value || ''));
            void ComponentHelpers.ScheduledRender.scheduleRender(this, this.#render);
        }
        // Clear selection (needed when pressing 'enter' in editable span).
        const selection = window.getSelection();
        selection?.removeAllRanges();
    }
    #onRemoveOverrideClick() {
        if (!this.#header) {
            return;
        }
        const headerValueElement = this.#shadow.querySelector('.header-value devtools-editable-span');
        if (this.#header.originalValue) {
            headerValueElement.value = this.#header?.originalValue;
        }
        this.dispatchEvent(new HeaderRemovedEvent(this.#header.name, this.#header.value || ''));
    }
    #onKeyDown(event) {
        const target = event.target;
        if (event.key === 'Escape') {
            event.consume();
            if (target.matches('.header-name devtools-editable-span')) {
                target.value = this.#header?.name || '';
                this.#onHeaderNameEdit(event);
            }
            else if (target.matches('.header-value devtools-editable-span')) {
                target.value = this.#header?.value || '';
                this.#onHeaderValueEdit(event);
                if (this.#header?.originalName) {
                    const headerNameElement = this.#shadow.querySelector('.header-name devtools-editable-span');
                    headerNameElement.value = this.#header.originalName;
                    this.#header.originalName = '';
                    headerNameElement.dispatchEvent(new Event('input'));
                    headerNameElement.focus();
                    return;
                }
            }
            target.blur();
        }
    }
    #onHeaderNameEdit(event) {
        const editable = event.target;
        const isValidName = isValidHeaderName(editable.value);
        if (this.#isValidHeaderName !== isValidName) {
            this.#isValidHeaderName = isValidName;
            void ComponentHelpers.ScheduledRender.scheduleRender(this, this.#render);
        }
    }
    #onHeaderValueEdit(event) {
        const editable = event.target;
        const isEdited = this.#header?.originalValue !== undefined && !compareHeaders(this.#header?.originalValue || '', editable.value);
        if (this.#isHeaderValueEdited !== isEdited) {
            this.#isHeaderValueEdited = isEdited;
            if (this.#header) {
                this.#header.highlight = false;
            }
            void ComponentHelpers.ScheduledRender.scheduleRender(this, this.#render);
        }
    }
    #onHeaderNamePaste(event) {
        if (!event.clipboardData) {
            return;
        }
        const nameEl = event.target;
        const clipboardText = event.clipboardData.getData('text/plain') || '';
        const separatorPosition = clipboardText.indexOf(':');
        if (separatorPosition < 1) {
            // Not processing further either case 'abc' or ':abc'
            nameEl.value = clipboardText;
            event.preventDefault();
            nameEl.dispatchEvent(new Event('input', { bubbles: true }));
            return;
        }
        if (this.#header) {
            this.#header.originalName = this.#header.name;
        }
        const headerValue = clipboardText.substring(separatorPosition + 1, clipboardText.length).trim();
        const headerName = clipboardText.substring(0, separatorPosition);
        nameEl.value = headerName;
        nameEl.dispatchEvent(new Event('input'));
        const valueEL = this.#shadow.querySelector('.header-value devtools-editable-span');
        if (valueEL) {
            valueEL.focus();
            valueEL.value = headerValue;
            valueEL.dispatchEvent(new Event('input'));
        }
        event.preventDefault();
    }
}
customElements.define('devtools-header-section-row', HeaderSectionRow);
//# sourceMappingURL=HeaderSectionRow.js.map