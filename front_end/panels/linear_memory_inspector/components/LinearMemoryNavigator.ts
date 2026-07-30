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
} as const;
const str_ =
    i18n.i18n.registerUIStrings('panels/linear_memory_inspector/components/LinearMemoryNavigator.ts', UIStrings);
const i18nString = i18n.i18n.getLocalizedString.bind(undefined, str_);
const {render, html, Directives: {ifDefined}} = Lit;

export const enum Navigation {
  BACKWARD = 'Backward',
  FORWARD = 'Forward',
}

export class AddressInputChangedEvent extends Event {
  static readonly eventName = 'addressinputchanged';
  data: {address: string, mode: Mode};

  constructor(address: string, mode: Mode) {
    super(AddressInputChangedEvent.eventName);
    this.data = {address, mode};
  }
}

export class PageNavigationEvent extends Event {
  static readonly eventName = 'pagenavigation';
  data: Navigation;

  constructor(navigation: Navigation) {
    super(PageNavigationEvent.eventName, {});
    this.data = navigation;
  }
}

export class HistoryNavigationEvent extends Event {
  static readonly eventName = 'historynavigation';
  data: Navigation;

  constructor(navigation: Navigation) {
    super(HistoryNavigationEvent.eventName, {});
    this.data = navigation;
  }
}

export class RefreshRequestedEvent extends Event {
  static readonly eventName = 'refreshrequested';
  constructor() {
    super(RefreshRequestedEvent.eventName, {});
  }
}

export interface LinearMemoryNavigatorData {
  address: string;
  mode: Mode;
  canGoBackInHistory: boolean;
  canGoForwardInHistory: boolean;
  valid: boolean;
  error: string|undefined;
}

export const enum Mode {
  EDIT = 'Edit',
  SUBMITTED = 'Submitted',
  INVALID_SUBMIT = 'InvalidSubmit',
}

export class LinearMemoryNavigator extends UI.Widget.Widget {
  #address = '0';
  #error: string|undefined = undefined;
  #valid = true;
  #canGoBackInHistory = false;
  #canGoForwardInHistory = false;
  #mode = Mode.SUBMITTED;

  constructor(element?: HTMLElement) {
    super(element);
    /* eslint-disable @devtools/no-imperative-dom-api */
    if (!this.element.shadowRoot) {
      this.element.attachShadow({mode: 'open'});
    }
    /* eslint-enable @devtools/no-imperative-dom-api */
    this.element.classList.remove('vbox', 'flex-auto', 'widget');
    this.element.classList.add('devtools-linear-memory-inspector-navigator');
  }

  set data(data: LinearMemoryNavigatorData) {
    this.#address = data.address;
    this.#error = data.error;
    this.#valid = data.valid;
    this.#canGoBackInHistory = data.canGoBackInHistory;
    this.#canGoForwardInHistory = data.canGoForwardInHistory;
    this.#mode = data.mode;
    this.requestUpdate();
  }

  override performUpdate(): void {
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
    },
                                  this.#onAddressChange.bind(this), this.element.dispatchEvent.bind(this.element),
                                  shadowRoot);
  }

  static #render(data: LinearMemoryNavigatorData, onAddressChange: (mode: Mode, event: Event) => void,
                 dispatchEvent: (event: Event) => void, shadow: ShadowRoot): void {
    // Disabled until https://crbug.com/1079231 is fixed.
    // clang-format off
    const result = html`
      <style>${linearMemoryNavigatorStyles}</style>
      <div class="navigator">
        <div class="navigator-item">
          ${LinearMemoryNavigator.#createButton({icon: 'undo', title: i18nString(UIStrings.goBackInAddressHistory),
              event: new HistoryNavigationEvent(Navigation.BACKWARD), enabled: data.canGoBackInHistory,
              jslogContext:'linear-memory-inspector.history-back'}, dispatchEvent)}
          ${LinearMemoryNavigator.#createButton({icon: 'redo', title: i18nString(UIStrings.goForwardInAddressHistory),
              event: new HistoryNavigationEvent(Navigation.FORWARD), enabled: data.canGoForwardInHistory,
              jslogContext:'linear-memory-inspector.history-forward'}, dispatchEvent)}
        </div>
        <div class="navigator-item">
          ${LinearMemoryNavigator.#createButton({icon: 'chevron-left', title: i18nString(UIStrings.previousPage),
              event: new PageNavigationEvent(Navigation.BACKWARD), enabled: true,
              jslogContext:'linear-memory-inspector.previous-page'}, dispatchEvent)}
          ${LinearMemoryNavigator.#createAddressInput(data, onAddressChange)}
          ${LinearMemoryNavigator.#createButton({icon: 'chevron-right', title: i18nString(UIStrings.nextPage),
              event: new PageNavigationEvent(Navigation.FORWARD), enabled: true,
              jslogContext:'linear-memory-inspector.next-page'}, dispatchEvent)}
        </div>
        ${LinearMemoryNavigator.#createButton({icon: 'refresh', title: i18nString(UIStrings.refresh),
            event: new RefreshRequestedEvent(), enabled: true,
            jslogContext:'linear-memory-inspector.refresh'}, dispatchEvent)}
      </div>
      `;
      render(result, shadow, {host: shadow.host});
    // clang-format on
  }

  static #createAddressInput(data: LinearMemoryNavigatorData,
                             onAddressChange: (mode: Mode, event: Event) => void): Lit.TemplateResult {
    const classMap = {
      'address-input': true,
      invalid: !data.valid,
    };
    return html`<input
      class=${Lit.Directives.classMap(classMap)}
      data-input="true"
      .value=${data.address}
      jslog=${VisualLogging.textField('linear-memory-inspector.address').track({
      change: true,
    })}
      title=${
        ifDefined(
            data.valid ? i18nString(UIStrings.enterAddress) : data.error,
            )}
      @change=${(e: Event) => onAddressChange(Mode.SUBMITTED, e)}
      @input=${(e: Event) => onAddressChange(Mode.EDIT, e)}
      ${Lit.Directives.ref((el: Element|undefined) => {
      if (el) {
        const inputEl = el as HTMLInputElement;
        if (data.mode === Mode.SUBMITTED) {
          inputEl.blur();
        } else if (data.mode === Mode.INVALID_SUBMIT) {
          inputEl.select();
        }
      }
    })}
    />`;
  }

  #onAddressChange(mode: Mode, event: Event): void {
    const addressInput = event.target as HTMLInputElement;
    this.element.dispatchEvent(new AddressInputChangedEvent(addressInput.value, mode));
  }

  static #createButton(data: {icon: string, title: string, event: Event, enabled: boolean, jslogContext: string},
                       dispatchEvent: (event: Event) => void): Lit.TemplateResult {
    return html`
      <devtools-button class="navigator-button"
        .data=${{variant: Buttons.Button.Variant.ICON,
                 iconName: data.icon,
                 disabled: !data.enabled} as Buttons.Button.ButtonData}
        jslog=${VisualLogging.action().track({click: true, keydown: 'Enter'}).context(data.jslogContext)}
        data-button=${data.event.type} title=${data.title}
        @click=${() => dispatchEvent(data.event)}
      ></devtools-button>`;
  }
}
