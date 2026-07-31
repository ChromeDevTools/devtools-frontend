// Copyright 2020 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

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

export interface ViewInput extends LinearMemoryNavigatorData {
  onAddressChange?: (address: string, mode: Mode) => void;
  onNavigatePage?: (navigation: Navigation) => void;
  onNavigateHistory?: (navigation: Navigation) => void;
  onRefreshRequest?: () => void;
}

export type View = (input: ViewInput, output: undefined, target: HTMLElement|ShadowRoot) => void;

export const DEFAULT_VIEW: View = (input, _output, target) => {
  // Disabled until https://crbug.com/1079231 is fixed.
  // clang-format off
  const result = html`
    <style>${linearMemoryNavigatorStyles}</style>
    <div class="navigator">
      <div class="navigator-item">
        ${createButton({icon: 'undo', title: i18nString(UIStrings.goBackInAddressHistory),
            onClick: () => input.onNavigateHistory?.(Navigation.BACKWARD), enabled: input.canGoBackInHistory,
            jslogContext:'linear-memory-inspector.history-back'})}
        ${createButton({icon: 'redo', title: i18nString(UIStrings.goForwardInAddressHistory),
            onClick: () => input.onNavigateHistory?.(Navigation.FORWARD), enabled: input.canGoForwardInHistory,
            jslogContext:'linear-memory-inspector.history-forward'})}
      </div>
      <div class="navigator-item">
        ${createButton({icon: 'chevron-left', title: i18nString(UIStrings.previousPage),
            onClick: () => input.onNavigatePage?.(Navigation.BACKWARD), enabled: true,
            jslogContext:'linear-memory-inspector.previous-page'})}
        ${createAddressInput(input)}
        ${createButton({icon: 'chevron-right', title: i18nString(UIStrings.nextPage),
            onClick: () => input.onNavigatePage?.(Navigation.FORWARD), enabled: true,
            jslogContext:'linear-memory-inspector.next-page'})}
      </div>
      ${createButton({icon: 'refresh', title: i18nString(UIStrings.refresh),
          onClick: () => input.onRefreshRequest?.(), enabled: true,
          jslogContext:'linear-memory-inspector.refresh'})}
    </div>
    `;
    render(result, target);
  // clang-format on
};

function createAddressInput(data: ViewInput): Lit.TemplateResult {
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
    @change=${(e: Event) => data.onAddressChange?.((e.target as HTMLInputElement).value, Mode.SUBMITTED)}
    @input=${(e: Event) => data.onAddressChange?.((e.target as HTMLInputElement).value, Mode.EDIT)}
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

function createButton(data: {
  icon: string,
  title: string,
  onClick: () => void,
  enabled: boolean,
  jslogContext: string,
}): Lit.TemplateResult {
  return html`
    <devtools-button class="navigator-button"
      .data=${{variant: Buttons.Button.Variant.ICON,
               iconName: data.icon,
               disabled: !data.enabled} as Buttons.Button.ButtonData}
      jslog=${VisualLogging.action().track({click: true, keydown: 'Enter'}).context(data.jslogContext)}
      title=${data.title}
      @click=${data.onClick}
    ></devtools-button>`;
}

export class LinearMemoryNavigator extends UI.Widget.Widget {
  readonly #view: View;
  #address = '0';
  #error: string|undefined = undefined;
  #valid = true;
  #canGoBackInHistory = false;
  #canGoForwardInHistory = false;
  #mode = Mode.SUBMITTED;

  #onRefreshRequest?: () => void;
  #onAddressChange?: (address: string, mode: Mode) => void;
  #onNavigatePage?: (navigation: Navigation) => void;
  #onNavigateHistory?: (navigation: Navigation) => void;

  get onRefreshRequest(): (() => void)|undefined {
    return this.#onRefreshRequest;
  }

  set onRefreshRequest(callback: (() => void)|undefined) {
    this.#onRefreshRequest = callback;
    this.performUpdate();
  }

  get onAddressChange(): ((address: string, mode: Mode) => void)|undefined {
    return this.#onAddressChange;
  }

  set onAddressChange(callback: ((address: string, mode: Mode) => void)|undefined) {
    this.#onAddressChange = callback;
    this.performUpdate();
  }

  get onNavigatePage(): ((navigation: Navigation) => void)|undefined {
    return this.#onNavigatePage;
  }

  set onNavigatePage(callback: ((navigation: Navigation) => void)|undefined) {
    this.#onNavigatePage = callback;
    this.performUpdate();
  }

  get onNavigateHistory(): ((navigation: Navigation) => void)|undefined {
    return this.#onNavigateHistory;
  }

  set onNavigateHistory(callback: ((navigation: Navigation) => void)|undefined) {
    this.#onNavigateHistory = callback;
    this.performUpdate();
  }

  constructor(element?: HTMLElement, view: View = DEFAULT_VIEW) {
    super(element);
    this.#view = view;
    if (!this.element.shadowRoot) {
      this.element.attachShadow({mode: 'open'});
    }
  }

  get address(): string {
    return this.#address;
  }

  set address(address: string) {
    this.#address = address;
    this.requestUpdate();
  }

  get error(): string|undefined {
    return this.#error;
  }

  set error(error: string|undefined) {
    this.#error = error;
    this.requestUpdate();
  }

  get valid(): boolean {
    return this.#valid;
  }

  set valid(valid: boolean) {
    this.#valid = valid;
    this.requestUpdate();
  }

  get canGoBackInHistory(): boolean {
    return this.#canGoBackInHistory;
  }

  set canGoBackInHistory(canGoBackInHistory: boolean) {
    this.#canGoBackInHistory = canGoBackInHistory;
    this.requestUpdate();
  }

  get canGoForwardInHistory(): boolean {
    return this.#canGoForwardInHistory;
  }

  set canGoForwardInHistory(canGoForwardInHistory: boolean) {
    this.#canGoForwardInHistory = canGoForwardInHistory;
    this.requestUpdate();
  }

  get mode(): Mode {
    return this.#mode;
  }

  set mode(mode: Mode) {
    this.#mode = mode;
    this.requestUpdate();
  }

  override performUpdate(): void {
    const shadowRoot = this.element.shadowRoot;
    if (!shadowRoot) {
      return;
    }
    const viewInput: ViewInput = {
      address: this.#address,
      error: this.#error,
      valid: this.#valid,
      canGoBackInHistory: this.#canGoBackInHistory,
      canGoForwardInHistory: this.#canGoForwardInHistory,
      mode: this.#mode,
      onAddressChange: this.onAddressChange,
      onNavigatePage: this.onNavigatePage,
      onNavigateHistory: this.onNavigateHistory,
      onRefreshRequest: this.onRefreshRequest,
    };
    this.#view(viewInput, undefined, shadowRoot);
  }
}
