// Copyright 2020 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.
/* eslint-disable @devtools/no-lit-render-outside-of-view */
import '../../../ui/kit/kit.js';
import * as i18n from '../../../core/i18n/i18n.js';
import * as Buttons from '../../../ui/components/buttons/buttons.js';
import * as Lit from '../../../ui/lit/lit.js';
import * as VisualLogging from '../../../ui/visual_logging/visual_logging.js';
import linearMemoryNavigatorStyles from './linearMemoryNavigator.css.js';
const UIStrings = {
    /**
     * @description Tooltip text that appears when hovering over a valid memory address (e.g. 0x0) in the address line in the Linear memory inspector.
     */
    enterAddress: 'Enter address',
    /**
     * @description Tooltip text that appears when hovering over the button to go back in history in the Linear Memory Navigator
     */
    goBackInAddressHistory: 'Go back in address history',
    /**
     * @description Tooltip text that appears when hovering over the button to go forward in history in the Linear Memory Navigator
     */
    goForwardInAddressHistory: 'Go forward in address history',
    /**
     * @description Tooltip text that appears when hovering over the page back icon in the Linear Memory Navigator
     */
    previousPage: 'Previous page',
    /**
     * @description Tooltip text that appears when hovering over the next page icon in the Linear Memory Navigator
     */
    nextPage: 'Next page',
    /**
     * @description Text to refresh the page
     */
    refresh: 'Refresh',
};
const str_ = i18n.i18n.registerUIStrings('panels/linear_memory_inspector/components/LinearMemoryNavigator.ts', UIStrings);
const i18nString = i18n.i18n.getLocalizedString.bind(undefined, str_);
const { render, html, Directives: { ifDefined } } = Lit;
export class AddressInputChangedEvent extends Event {
    static eventName = 'addressinputchanged';
    data;
    constructor(address, mode) {
        super(AddressInputChangedEvent.eventName);
        this.data = { address, mode };
    }
}
export class PageNavigationEvent extends Event {
    static eventName = 'pagenavigation';
    data;
    constructor(navigation) {
        super(PageNavigationEvent.eventName, {});
        this.data = navigation;
    }
}
export class HistoryNavigationEvent extends Event {
    static eventName = 'historynavigation';
    data;
    constructor(navigation) {
        super(HistoryNavigationEvent.eventName, {});
        this.data = navigation;
    }
}
export class RefreshRequestedEvent extends Event {
    static eventName = 'refreshrequested';
    constructor() {
        super(RefreshRequestedEvent.eventName, {});
    }
}
export class LinearMemoryNavigator extends HTMLElement {
    #shadow = this.attachShadow({ mode: 'open' });
    #address = '0';
    #error = undefined;
    #valid = true;
    #canGoBackInHistory = false;
    #canGoForwardInHistory = false;
    set data(data) {
        this.#address = data.address;
        this.#error = data.error;
        this.#valid = data.valid;
        this.#canGoBackInHistory = data.canGoBackInHistory;
        this.#canGoForwardInHistory = data.canGoForwardInHistory;
        this.#render();
        const addressInput = this.#shadow.querySelector('.address-input');
        if (addressInput) {
            if (data.mode === "Submitted" /* Mode.SUBMITTED */) {
                addressInput.blur();
            }
            else if (data.mode === "InvalidSubmit" /* Mode.INVALID_SUBMIT */) {
                addressInput.select();
            }
        }
    }
    #render() {
        // Disabled until https://crbug.com/1079231 is fixed.
        // clang-format off
        const result = html `
      <style>${linearMemoryNavigatorStyles}</style>
      <div class="navigator">
        <div class="navigator-item">
          ${this.#createButton({ icon: 'undo', title: i18nString(UIStrings.goBackInAddressHistory),
            event: new HistoryNavigationEvent("Backward" /* Navigation.BACKWARD */), enabled: this.#canGoBackInHistory,
            jslogContext: 'linear-memory-inspector.history-back' })}
          ${this.#createButton({ icon: 'redo', title: i18nString(UIStrings.goForwardInAddressHistory),
            event: new HistoryNavigationEvent("Forward" /* Navigation.FORWARD */), enabled: this.#canGoForwardInHistory,
            jslogContext: 'linear-memory-inspector.history-forward' })}
        </div>
        <div class="navigator-item">
          ${this.#createButton({ icon: 'chevron-left', title: i18nString(UIStrings.previousPage),
            event: new PageNavigationEvent("Backward" /* Navigation.BACKWARD */), enabled: true,
            jslogContext: 'linear-memory-inspector.previous-page' })}
          ${this.#createAddressInput()}
          ${this.#createButton({ icon: 'chevron-right', title: i18nString(UIStrings.nextPage),
            event: new PageNavigationEvent("Forward" /* Navigation.FORWARD */), enabled: true,
            jslogContext: 'linear-memory-inspector.next-page' })}
        </div>
        ${this.#createButton({ icon: 'refresh', title: i18nString(UIStrings.refresh),
            event: new RefreshRequestedEvent(), enabled: true,
            jslogContext: 'linear-memory-inspector.refresh' })}
      </div>
      `;
        render(result, this.#shadow, { host: this });
        // clang-format on
    }
    #createAddressInput() {
        const classMap = {
            'address-input': true,
            invalid: !this.#valid,
        };
        return html `<input
      class=${Lit.Directives.classMap(classMap)}
      data-input="true"
      .value=${this.#address}
      jslog=${VisualLogging.textField('linear-memory-inspector.address').track({
            change: true,
        })}
      title=${ifDefined(this.#valid ? i18nString(UIStrings.enterAddress) : this.#error)}
      @change=${this.#onAddressChange.bind(this, "Submitted" /* Mode.SUBMITTED */)}
      @input=${this.#onAddressChange.bind(this, "Edit" /* Mode.EDIT */)}
    />`;
    }
    #onAddressChange(mode, event) {
        const addressInput = event.target;
        this.dispatchEvent(new AddressInputChangedEvent(addressInput.value, mode));
    }
    #createButton(data) {
        return html `
      <devtools-button class="navigator-button"
        .data=${{ variant: "icon" /* Buttons.Button.Variant.ICON */, iconName: data.icon, disabled: !data.enabled }}
        jslog=${VisualLogging.action().track({ click: true, keydown: 'Enter' }).context(data.jslogContext)}
        data-button=${data.event.type} title=${data.title}
        @click=${this.dispatchEvent.bind(this, data.event)}
      ></devtools-button>`;
    }
}
customElements.define('devtools-linear-memory-inspector-navigator', LinearMemoryNavigator);
//# sourceMappingURL=LinearMemoryNavigator.js.map