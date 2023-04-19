// Copyright (c) 2020 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as i18n from '../../../core/i18n/i18n.js';
import * as LitHtml from '../../lit-html/lit-html.js';
import * as ComponentHelpers from '../helpers/helpers.js';
import * as IconButton from '../icon_button/icon_button.js';
import linearMemoryNavigatorStyles from './linearMemoryNavigator.css.js';

const UIStrings = {
  /**
   *@description Tooltip text that appears when hovering over a valid memory address (e.g. 0x0) in the address line in the Linear Memory Inspector.
   */
  enterAddress: 'Enter address',
  /**
   *@description Tooltip text that appears when hovering over the button to go back in history in the Linear Memory Navigator
   */
  goBackInAddressHistory: 'Go back in address history',
  /**
   *@description Tooltip text that appears when hovering over the button to go forward in history in the Linear Memory Navigator
   */
  goForwardInAddressHistory: 'Go forward in address history',
  /**
   *@description Tooltip text that appears when hovering over the page back icon in the Linear Memory Navigator
   */
  previousPage: 'Previous page',
  /**
   *@description Tooltip text that appears when hovering over the next page icon in the Linear Memory Navigator
   */
  nextPage: 'Next page',
  /**
   *@description Text to refresh the page
   */
  refresh: 'Refresh',
};
const str_ = i18n.i18n.registerUIStrings('ui/components/linear_memory_inspector/LinearMemoryNavigator.ts', UIStrings);
const i18nString = i18n.i18n.getLocalizedString.bind(undefined, str_);
const {render, html} = LitHtml;

export const enum Navigation {
  Backward = 'Backward',
  Forward = 'Forward',
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
  Edit = 'Edit',
  Submitted = 'Submitted',
  InvalidSubmit = 'InvalidSubmit',
}

export class LinearMemoryNavigator extends HTMLElement {
  static readonly litTagName = LitHtml.literal`devtools-linear-memory-inspector-navigator`;

  readonly #shadow = this.attachShadow({mode: 'open'});
  #address = '0';
  #error: string|undefined = undefined;
  #valid = true;
  #canGoBackInHistory = false;
  #canGoForwardInHistory = false;

  connectedCallback(): void {
    this.#shadow.adoptedStyleSheets = [linearMemoryNavigatorStyles];
  }

  set data(data: LinearMemoryNavigatorData) {
    this.#address = data.address;
    this.#error = data.error;
    this.#valid = data.valid;
    this.#canGoBackInHistory = data.canGoBackInHistory;
    this.#canGoForwardInHistory = data.canGoForwardInHistory;
    this.#render();

    const addressInput = this.#shadow.querySelector<HTMLInputElement>('.address-input');
    if (addressInput) {
      if (data.mode === Mode.Submitted) {
        addressInput.blur();
      } else if (data.mode === Mode.InvalidSubmit) {
        addressInput.select();
      }
    }
  }

  #render(): void {
    // Disabled until https://crbug.com/1079231 is fixed.
    // clang-format off
    const result = html`
      <div class="navigator">
        <div class="navigator-item">
          ${this.#createButton({icon: 'undo', title: i18nString(UIStrings.goBackInAddressHistory),
              event: new HistoryNavigationEvent(Navigation.Backward), enabled: this.#canGoBackInHistory})}
          ${this.#createButton({icon: 'redo', title: i18nString(UIStrings.goForwardInAddressHistory),
              event: new HistoryNavigationEvent(Navigation.Forward), enabled: this.#canGoForwardInHistory})}
        </div>
        <div class="navigator-item">
          ${this.#createButton({icon: 'chevron-left', title: i18nString(UIStrings.previousPage),
              event: new PageNavigationEvent(Navigation.Backward), enabled: true})}
          ${this.#createAddressInput()}
          ${this.#createButton({icon: 'chevron-right', title: i18nString(UIStrings.nextPage),
              event: new PageNavigationEvent(Navigation.Forward), enabled: true})}
        </div>
        ${this.#createButton({icon: 'refresh', title: i18nString(UIStrings.refresh),
            event: new RefreshRequestedEvent(), enabled: true})}
      </div>
      `;
      render(result, this.#shadow, {host: this});
    // clang-format on
  }

  #createAddressInput(): LitHtml.TemplateResult {
    const classMap = {
      'address-input': true,
      invalid: !this.#valid,
    };
    return html`
      <input class=${LitHtml.Directives.classMap(classMap)} data-input="true" .value=${this.#address}
        title=${this.#valid ? i18nString(UIStrings.enterAddress) : this.#error} @change=${
        this.#onAddressChange.bind(this, Mode.Submitted)} @input=${this.#onAddressChange.bind(this, Mode.Edit)}/>`;
  }

  #onAddressChange(mode: Mode, event: Event): void {
    const addressInput = event.target as HTMLInputElement;
    this.dispatchEvent(new AddressInputChangedEvent(addressInput.value, mode));
  }

  #createButton(data: {icon: string, title: string, event: Event, enabled: boolean}): LitHtml.TemplateResult {
    return html`
      <button class="navigator-button" ?disabled=${!data.enabled}
        data-button=${data.event.type} title=${data.title}
        @click=${this.dispatchEvent.bind(this, data.event)}>
        <${IconButton.Icon.Icon.litTagName} .data=${
        {iconName: data.icon, color: 'var(--icon-default)', width: '20px', height: '20px'} as
        IconButton.Icon.IconWithName}>
        </${IconButton.Icon.Icon.litTagName}>
      </button>`;
  }
}

ComponentHelpers.CustomElements.defineComponent('devtools-linear-memory-inspector-navigator', LinearMemoryNavigator);

declare global {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  interface HTMLElementTagNameMap {
    'devtools-linear-memory-inspector-navigator': LinearMemoryNavigator;
  }
}
