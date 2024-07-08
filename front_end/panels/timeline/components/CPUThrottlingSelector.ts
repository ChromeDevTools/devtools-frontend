// Copyright 2024 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as i18n from '../../../core/i18n/i18n.js';
import * as SDK from '../../../core/sdk/sdk.js';
import * as ComponentHelpers from '../../../ui/components/helpers/helpers.js';
import * as Menus from '../../../ui/components/menus/menus.js';
import * as LitHtml from '../../../ui/lit-html/lit-html.js';
import * as MobileThrottling from '../../mobile_throttling/mobile_throttling.js';

const {html} = LitHtml;

const UIStrings = {
  /**
   * @description Text label for a menu item indicating that no throttling is applied.
   */
  noThrottling: 'No throttling',
  /**
   * @description Text label for a menu item indicating that a specific slowdown multiplier is applied.
   * @example {2} PH1
   */
  dSlowdown: '{PH1}× slowdown',
};

const str_ = i18n.i18n.registerUIStrings('panels/timeline/components/CPUThrottlingSelector.ts', UIStrings);
const i18nString = i18n.i18n.getLocalizedString.bind(undefined, str_);

export class CPUThrottlingSelector extends HTMLElement {
  static readonly litTagName = LitHtml.literal`devtools-cpu-throttling-selector`;
  readonly #shadow = this.attachShadow({mode: 'open'});

  #currentRate: number;

  constructor() {
    super();
    this.#currentRate = SDK.CPUThrottlingManager.CPUThrottlingManager.instance().cpuThrottlingRate();
    this.#render();
  }

  connectedCallback(): void {
    SDK.CPUThrottlingManager.CPUThrottlingManager.instance().addEventListener(
        SDK.CPUThrottlingManager.Events.RateChanged, this.#onRateChange, this);
  }

  disconnectedCallback(): void {
    SDK.CPUThrottlingManager.CPUThrottlingManager.instance().removeEventListener(
        SDK.CPUThrottlingManager.Events.RateChanged, this.#onRateChange, this);
  }

  #onRateChange(event: {data: SDK.CPUThrottlingManager.EventTypes['RateChanged']}): void {
    this.#currentRate = event.data;
    void ComponentHelpers.ScheduledRender.scheduleRender(this, this.#render);
  }

  #onMenuItemSelected(event: Menus.SelectMenu.SelectMenuItemSelectedEvent): void {
    MobileThrottling.ThrottlingManager.throttlingManager().setCPUThrottlingRate(Number(event.itemValue));
  }

  #render = (): void => {
    // clang-format off
    const output = html`
      <${Menus.SelectMenu.SelectMenu.litTagName}
            @selectmenuselected=${this.#onMenuItemSelected}
            .showDivider=${true}
            .showArrow=${true}
            .sideButton=${false}
            .showSelectedItem=${true}
            .showConnector=${false}
            .buttonTitle=${this.#currentRate === 1 ? i18nString(UIStrings.noThrottling) : i18nString(UIStrings.dSlowdown, {PH1: this.#currentRate})}
          >
          ${MobileThrottling.ThrottlingPresets.ThrottlingPresets.cpuThrottlingPresets.map(rate => {
            const title = rate === 1 ? i18nString(UIStrings.noThrottling) : i18nString(UIStrings.dSlowdown, {PH1: rate});
            return LitHtml.html`
              <${Menus.Menu.MenuItem.litTagName}
                .value=${rate}
                .selected=${this.#currentRate === rate}
              >
                ${title}
              </${Menus.Menu.MenuItem.litTagName}>
            `;
          })}
      </${Menus.SelectMenu.SelectMenu.litTagName}>
    `;
    // clang-format on
    LitHtml.render(output, this.#shadow, {host: this});
  };
}

customElements.define('devtools-cpu-throttling-selector', CPUThrottlingSelector);

declare global {
  interface HTMLElementTagNameMap {
    'devtools-cpu-throttling-selector': CPUThrottlingSelector;
  }
}
