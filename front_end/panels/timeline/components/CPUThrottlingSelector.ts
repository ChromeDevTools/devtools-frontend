// Copyright 2024 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import '../../../ui/components/menus/menus.js';

import * as i18n from '../../../core/i18n/i18n.js';
import * as SDK from '../../../core/sdk/sdk.js';
import * as Buttons from '../../../ui/components/buttons/buttons.js';
import * as ComponentHelpers from '../../../ui/components/helpers/helpers.js';
import type * as Menus from '../../../ui/components/menus/menus.js';
import * as LitHtml from '../../../ui/lit-html/lit-html.js';
import * as VisualLogging from '../../../ui/visual_logging/visual_logging.js';
import * as MobileThrottling from '../../mobile_throttling/mobile_throttling.js';

import cpuThrottlingSelectorStyles from './cpuThrottlingSelector.css.js';

const {html} = LitHtml;

const UIStrings = {
  /**
   * @description Text label for a selection box showing which CPU throttling option is applied.
   * @example {No throttling} PH1
   */
  cpu: 'CPU: {PH1}',
  /**
   * @description Text label for a selection box showing which CPU throttling option is applied.
   * @example {No throttling} PH1
   */
  cpuThrottling: 'CPU throttling: {PH1}',
  /**
   * @description Text label for a menu item indicating that no throttling is applied.
   */
  noThrottling: 'No throttling',
  /**
   * @description Text label for a menu item indicating that a specific slowdown multiplier is applied.
   * @example {2} PH1
   */
  dSlowdown: '{PH1}× slowdown',
  /**
   * @description Text label for a selection box showing that a specific option is recommended.
   * @example {4x slowdown} PH1
   */
  recommendedThrottling: '{PH1} - recommended',
  /**
   * @description Text for why user should change a throttling setting.
   */
  recommendedThrottlingReason: 'Consider changing setting to simulate real user environments',
};

const str_ = i18n.i18n.registerUIStrings('panels/timeline/components/CPUThrottlingSelector.ts', UIStrings);
const i18nString = i18n.i18n.getLocalizedString.bind(undefined, str_);

export class CPUThrottlingSelector extends HTMLElement {
  readonly #shadow = this.attachShadow({mode: 'open'});

  #currentRate: number;
  #recommendedRate: number|null = null;

  constructor() {
    super();
    this.#currentRate = SDK.CPUThrottlingManager.CPUThrottlingManager.instance().cpuThrottlingRate();
    this.#render();
  }

  set recommendedRate(recommendedRate: number|null) {
    this.#recommendedRate = recommendedRate;
    void ComponentHelpers.ScheduledRender.scheduleRender(this, this.#render);
  }

  connectedCallback(): void {
    this.#shadow.adoptedStyleSheets = [cpuThrottlingSelectorStyles];
    SDK.CPUThrottlingManager.CPUThrottlingManager.instance().addEventListener(
        SDK.CPUThrottlingManager.Events.RATE_CHANGED, this.#onRateChange, this);
    this.#onRateChange();
  }

  disconnectedCallback(): void {
    SDK.CPUThrottlingManager.CPUThrottlingManager.instance().removeEventListener(
        SDK.CPUThrottlingManager.Events.RATE_CHANGED, this.#onRateChange, this);
  }

  #onRateChange(): void {
    this.#currentRate = SDK.CPUThrottlingManager.CPUThrottlingManager.instance().cpuThrottlingRate();

    void ComponentHelpers.ScheduledRender.scheduleRender(this, this.#render);
  }

  #onMenuItemSelected(event: Menus.SelectMenu.SelectMenuItemSelectedEvent): void {
    MobileThrottling.ThrottlingManager.throttlingManager().setCPUThrottlingRate(Number(event.itemValue));
  }

  #render = (): void => {
    let recommendedInfoEl;
    if (this.#recommendedRate && this.#currentRate === 1) {
      recommendedInfoEl = html`<devtools-button
        title=${i18nString(UIStrings.recommendedThrottlingReason)}
        .iconName=${'info'}
        .variant=${Buttons.Button.Variant.ICON}
      ></devtools-button>`;
    }

    const selectionTitle = this.#currentRate === 1 ? i18nString(UIStrings.noThrottling) :
                                                     i18nString(UIStrings.dSlowdown, {PH1: this.#currentRate});

    // clang-format off
    const output = html`
      <devtools-select-menu
            @selectmenuselected=${this.#onMenuItemSelected}
            .showDivider=${true}
            .showArrow=${true}
            .sideButton=${false}
            .showSelectedItem=${true}
            .showConnector=${false}
            .jslogContext=${'cpu-throttling'}
            .buttonTitle=${i18nString(UIStrings.cpu, {PH1: selectionTitle})}
            title=${i18nString(UIStrings.cpuThrottling, {PH1: selectionTitle})}
          >
          ${MobileThrottling.ThrottlingPresets.ThrottlingPresets.cpuThrottlingPresets.map(rate => {
            let title = rate === 1 ? i18nString(UIStrings.noThrottling) : i18nString(UIStrings.dSlowdown, {PH1: rate});
            if (rate === this.#recommendedRate) {
              title = i18nString(UIStrings.recommendedThrottling, {PH1: title});
            }

            const jslogContext = rate === 1 ? 'cpu-no-throttling' : `cpu-throttled-${rate}`;
            return html`
              <devtools-menu-item
                .value=${rate}
                .selected=${this.#currentRate === rate}
                jslog=${VisualLogging.item(jslogContext).track({click: true})}
              >
                ${title}
              </devtools-menu-item>
            `;
          })}
      </devtools-select-menu>
      ${recommendedInfoEl}
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
