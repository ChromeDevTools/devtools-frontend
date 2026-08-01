// Copyright 2020 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.
/* eslint-disable @devtools/no-lit-render-outside-of-view */
import '../../../ui/kit/kit.js';
import * as i18n from '../../../core/i18n/i18n.js';
import * as Buttons from '../../../ui/components/buttons/buttons.js';
import * as UI from '../../../ui/legacy/legacy.js';
import * as Lit from '../../../ui/lit/lit.js';
import * as VisualLogging from '../../../ui/visual_logging/visual_logging.js';
import linearMemoryNavigatorStyles from './linearMemoryNavigator.css.js';
const UIStrings = {
    /**
     * @description Tooltip text that appears when hovering over a valid memory address (for example, 0x0) in the address line in the Memory inspector panel.
     */
    enterAddress: 'Enter address',
    /**
     * @description Tooltip text that appears when hovering over the button to go back in history in the Memory inspector panel.
     */
    goBackInAddressHistory: 'Go back in address history',
    /**
     * @description Tooltip text that appears when hovering over the button to go forward in history in the Memory inspector panel.
     */
    goForwardInAddressHistory: 'Go forward in address history',
    /**
     * @description Tooltip text that appears when hovering over the page back icon in the Memory inspector panel.
     */
    previousPage: 'Previous page',
    /**
     * @description Tooltip text that appears when hovering over the next page icon in the Memory inspector panel.
     */
    nextPage: 'Next page',
    /**
     * @description Tooltip text that appears when hovering over the refresh button in the Memory inspector panel.
     */
    refresh: 'Refresh',
};
const str_ = i18n.i18n.registerUIStrings('panels/linear_memory_inspector/components/LinearMemoryNavigator.ts', UIStrings);
const i18nString = i18n.i18n.getLocalizedString.bind(undefined, str_);
const { render, html, Directives: { ifDefined } } = Lit;
export class LinearMemoryNavigator extends UI.Widget.Widget {
    #address = '0';
    #error = undefined;
    #valid = true;
    #canGoBackInHistory = false;
    #canGoForwardInHistory = false;
    #mode = "Submitted" /* Mode.SUBMITTED */;
    #onRefreshRequest;
    #onAddressChange;
    #onNavigatePage;
    #onNavigateHistory;
    get onRefreshRequest() {
        return this.#onRefreshRequest;
    }
    set onRefreshRequest(callback) {
        this.#onRefreshRequest = callback;
        this.performUpdate();
    }
    get onAddressChange() {
        return this.#onAddressChange;
    }
    set onAddressChange(callback) {
        this.#onAddressChange = callback;
        this.performUpdate();
    }
    get onNavigatePage() {
        return this.#onNavigatePage;
    }
    set onNavigatePage(callback) {
        this.#onNavigatePage = callback;
        this.performUpdate();
    }
    get onNavigateHistory() {
        return this.#onNavigateHistory;
    }
    set onNavigateHistory(callback) {
        this.#onNavigateHistory = callback;
        this.performUpdate();
    }
    constructor(element) {
        super(element);
        if (!this.element.shadowRoot) {
            this.element.attachShadow({ mode: 'open' });
        }
    }
    get address() {
        return this.#address;
    }
    set address(address) {
        this.#address = address;
        this.requestUpdate();
    }
    get error() {
        return this.#error;
    }
    set error(error) {
        this.#error = error;
        this.requestUpdate();
    }
    get valid() {
        return this.#valid;
    }
    set valid(valid) {
        this.#valid = valid;
        this.requestUpdate();
    }
    get canGoBackInHistory() {
        return this.#canGoBackInHistory;
    }
    set canGoBackInHistory(canGoBackInHistory) {
        this.#canGoBackInHistory = canGoBackInHistory;
        this.requestUpdate();
    }
    get canGoForwardInHistory() {
        return this.#canGoForwardInHistory;
    }
    set canGoForwardInHistory(canGoForwardInHistory) {
        this.#canGoForwardInHistory = canGoForwardInHistory;
        this.requestUpdate();
    }
    get mode() {
        return this.#mode;
    }
    set mode(mode) {
        this.#mode = mode;
        this.requestUpdate();
    }
    performUpdate() {
        const shadowRoot = this.element.shadowRoot;
        if (!shadowRoot) {
            return;
        }
        LinearMemoryNavigator.#render({
            address: this.#address,
            error: this.#error,
            valid: this.#valid,
            canGoBackInHistory: this.#canGoBackInHistory,
            canGoForwardInHistory: this.#canGoForwardInHistory,
            mode: this.#mode,
        }, this.onAddressChange, this.onNavigatePage, this.onNavigateHistory, this.onRefreshRequest, shadowRoot);
    }
    static #render(data, onAddressChange, onNavigatePage, onNavigateHistory, onRefreshRequest, shadow) {
        // Disabled until https://crbug.com/1079231 is fixed.
        // clang-format off
        const result = html `
      <style>${linearMemoryNavigatorStyles}</style>
      <div class="navigator">
        <div class="navigator-item">
          ${LinearMemoryNavigator.#createButton({ icon: 'undo', title: i18nString(UIStrings.goBackInAddressHistory),
            onClick: () => onNavigateHistory?.("Backward" /* Navigation.BACKWARD */), enabled: data.canGoBackInHistory,
            jslogContext: 'linear-memory-inspector.history-back' })}
          ${LinearMemoryNavigator.#createButton({ icon: 'redo', title: i18nString(UIStrings.goForwardInAddressHistory),
            onClick: () => onNavigateHistory?.("Forward" /* Navigation.FORWARD */), enabled: data.canGoForwardInHistory,
            jslogContext: 'linear-memory-inspector.history-forward' })}
        </div>
        <div class="navigator-item">
          ${LinearMemoryNavigator.#createButton({ icon: 'chevron-left', title: i18nString(UIStrings.previousPage),
            onClick: () => onNavigatePage?.("Backward" /* Navigation.BACKWARD */), enabled: true,
            jslogContext: 'linear-memory-inspector.previous-page' })}
          ${LinearMemoryNavigator.#createAddressInput(data, onAddressChange)}
          ${LinearMemoryNavigator.#createButton({ icon: 'chevron-right', title: i18nString(UIStrings.nextPage),
            onClick: () => onNavigatePage?.("Forward" /* Navigation.FORWARD */), enabled: true,
            jslogContext: 'linear-memory-inspector.next-page' })}
        </div>
        ${LinearMemoryNavigator.#createButton({ icon: 'refresh', title: i18nString(UIStrings.refresh),
            onClick: () => onRefreshRequest?.(), enabled: true,
            jslogContext: 'linear-memory-inspector.refresh' })}
      </div>
      `;
        render(result, shadow);
        // clang-format on
    }
    static #createAddressInput(data, onAddressChange) {
        const classMap = {
            'address-input': true,
            invalid: !data.valid,
        };
        return html `<input
      class=${Lit.Directives.classMap(classMap)}
      data-input="true"
      .value=${data.address}
      jslog=${VisualLogging.textField('linear-memory-inspector.address').track({
            change: true,
        })}
      title=${ifDefined(data.valid ? i18nString(UIStrings.enterAddress) : data.error)}
      @change=${(e) => onAddressChange?.(e.target.value, "Submitted" /* Mode.SUBMITTED */)}
      @input=${(e) => onAddressChange?.(e.target.value, "Edit" /* Mode.EDIT */)}
      ${Lit.Directives.ref((el) => {
            if (el) {
                const inputEl = el;
                if (data.mode === "Submitted" /* Mode.SUBMITTED */) {
                    inputEl.blur();
                }
                else if (data.mode === "InvalidSubmit" /* Mode.INVALID_SUBMIT */) {
                    inputEl.select();
                }
            }
        })}
    />`;
    }
    static #createButton(data) {
        return html `
      <devtools-button class="navigator-button"
        .data=${{ variant: "icon" /* Buttons.Button.Variant.ICON */,
            iconName: data.icon,
            disabled: !data.enabled }}
        jslog=${VisualLogging.action().track({ click: true, keydown: 'Enter' }).context(data.jslogContext)}
        title=${data.title}
        @click=${data.onClick}
      ></devtools-button>`;
    }
}
//# sourceMappingURL=LinearMemoryNavigator.js.map