// Copyright 2024 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.
/* eslint-disable rulesdir/no-lit-render-outside-of-view */

import '../../../ui/components/icon_button/icon_button.js';
import '../../../ui/components/menus/menus.js';

import * as Common from '../../../core/common/common.js';
import * as i18n from '../../../core/i18n/i18n.js';
import * as SDK from '../../../core/sdk/sdk.js';
import * as ComponentHelpers from '../../../ui/components/helpers/helpers.js';
import type * as Menus from '../../../ui/components/menus/menus.js';
import * as Lit from '../../../ui/lit/lit.js';
import * as VisualLogging from '../../../ui/visual_logging/visual_logging.js';
import * as MobileThrottling from '../../mobile_throttling/mobile_throttling.js';

import cpuThrottlingSelectorStyles from './cpuThrottlingSelector.css.js';

const {html} = Lit;

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
   * @description Text label for a selection box showing that a specific option is recommended.
   * @example {4x slowdown} PH1
   */
  recommendedThrottling: '{PH1} – recommended',
  /**
   * @description Text for why user should change a throttling setting.
   */
  recommendedThrottlingReason: 'Consider changing setting to simulate real user environments',
  /**
   * @description Text to prompt the user to run the CPU calibration process.
   */
  calibrate: 'Calibrate…',
  /**
   * @description Text to prompt the user to re-run the CPU calibration process.
   */
  recalibrate: 'Recalibrate…',
  /**
   * @description Label shown above a list of CPU calibration preset options.
   */
  labelCalibratedPresets: 'Calibrated presets',
} as const;

const str_ = i18n.i18n.registerUIStrings('panels/timeline/components/CPUThrottlingSelector.ts', UIStrings);
const i18nString = i18n.i18n.getLocalizedString.bind(undefined, str_);

interface CPUThrottlingGroup {
  name: string;
  items: SDK.CPUThrottlingManager.CPUThrottlingOption[];
  showCustomAddOption?: boolean;
}

export class CPUThrottlingSelector extends HTMLElement {
  readonly #shadow = this.attachShadow({mode: 'open'});

  #currentOption: SDK.CPUThrottlingManager.CPUThrottlingOption;
  #recommendedOption: SDK.CPUThrottlingManager.CPUThrottlingOption|null = null;
  #groups: CPUThrottlingGroup[] = [];
  #calibratedThrottlingSetting: Common.Settings.Setting<SDK.CPUThrottlingManager.CalibratedCPUThrottling>;

  constructor() {
    super();
    this.#currentOption = SDK.CPUThrottlingManager.CPUThrottlingManager.instance().cpuThrottlingOption();
    this.#calibratedThrottlingSetting =
        Common.Settings.Settings.instance().createSetting<SDK.CPUThrottlingManager.CalibratedCPUThrottling>(
            'calibrated-cpu-throttling', {}, Common.Settings.SettingStorageType.GLOBAL);
    this.#resetGroups();
    this.#render();
  }

  set recommendedOption(recommendedOption: SDK.CPUThrottlingManager.CPUThrottlingOption|null) {
    this.#recommendedOption = recommendedOption;
    void ComponentHelpers.ScheduledRender.scheduleRender(this, this.#render);
  }

  connectedCallback(): void {
    SDK.CPUThrottlingManager.CPUThrottlingManager.instance().addEventListener(
        SDK.CPUThrottlingManager.Events.RATE_CHANGED, this.#onOptionChange, this);
    this.#calibratedThrottlingSetting.addChangeListener(this.#onCalibratedSettingChanged, this);
    this.#onOptionChange();
  }

  disconnectedCallback(): void {
    this.#calibratedThrottlingSetting.removeChangeListener(this.#onCalibratedSettingChanged, this);
    SDK.CPUThrottlingManager.CPUThrottlingManager.instance().removeEventListener(
        SDK.CPUThrottlingManager.Events.RATE_CHANGED, this.#onOptionChange, this);
  }

  #onOptionChange(): void {
    this.#currentOption = SDK.CPUThrottlingManager.CPUThrottlingManager.instance().cpuThrottlingOption();

    void ComponentHelpers.ScheduledRender.scheduleRender(this, this.#render);
  }

  #onCalibratedSettingChanged(): void {
    this.#resetGroups();
    void ComponentHelpers.ScheduledRender.scheduleRender(this, this.#render);
  }

  #onMenuItemSelected(event: Menus.SelectMenu.SelectMenuItemSelectedEvent): void {
    let option;
    if (typeof event.itemValue === 'string') {
      if (event.itemValue === 'low-tier-mobile') {
        option = SDK.CPUThrottlingManager.CalibratedLowTierMobileThrottlingOption;
      } else if (event.itemValue === 'mid-tier-mobile') {
        option = SDK.CPUThrottlingManager.CalibratedMidTierMobileThrottlingOption;
      }
    } else {
      const rate = Number(event.itemValue);
      option = MobileThrottling.ThrottlingPresets.ThrottlingPresets.cpuThrottlingPresets.find(
          option => !option.calibratedDeviceType && option.rate() === rate);
    }

    if (option) {
      MobileThrottling.ThrottlingManager.throttlingManager().setCPUThrottlingOption(option);
    }
  }

  #onCalibrateClick(): void {
    void Common.Revealer.reveal(this.#calibratedThrottlingSetting);
  }

  #resetGroups(): void {
    this.#groups = [
      {
        name: '',
        items: MobileThrottling.ThrottlingPresets.ThrottlingPresets.cpuThrottlingPresets.filter(
            option => !option.calibratedDeviceType),
      },
      {
        name: i18nString(UIStrings.labelCalibratedPresets),
        items: MobileThrottling.ThrottlingPresets.ThrottlingPresets.cpuThrottlingPresets.filter(
            option => option.calibratedDeviceType),
      },
    ];
  }

  #render = (): void => {
    let recommendedInfoEl;
    if (this.#recommendedOption && this.#currentOption === SDK.CPUThrottlingManager.NoThrottlingOption) {
      recommendedInfoEl = html`<devtools-icon
        title=${i18nString(UIStrings.recommendedThrottlingReason)}
        name=info></devtools-icon>`;
    }

    const selectionTitle = this.#currentOption.title();
    const setting = this.#calibratedThrottlingSetting.get();
    const hasCalibratedOnce = setting.low || setting.mid;
    const calibrationLabel = hasCalibratedOnce ? i18nString(UIStrings.recalibrate) : i18nString(UIStrings.calibrate);

    // clang-format off
    /* eslint-disable rulesdir/no-deprecated-component-usages */
    const output = html`
      <style>${cpuThrottlingSelectorStyles}</style>
      <devtools-select-menu
            @selectmenuselected=${this.#onMenuItemSelected}
            .showDivider=${true}
            .showArrow=${true}
            .sideButton=${false}
            .showSelectedItem=${true}
            .jslogContext=${'cpu-throttling'}
            .buttonTitle=${i18nString(UIStrings.cpu, {PH1: selectionTitle})}
            .title=${i18nString(UIStrings.cpuThrottling, {PH1: selectionTitle})}
          >
          ${this.#groups.map(group => {
            return html`
              <devtools-menu-group .name=${group.name} .title=${group.name}>
                ${group.items.map(option => {
                  const title = option === this.#recommendedOption ? i18nString(UIStrings.recommendedThrottling, {PH1: option.title()}) : option.title();
                  const rate = option.rate();
                  return html`
                    <devtools-menu-item
                      .value=${option.calibratedDeviceType ?? rate}
                      .selected=${this.#currentOption === option}
                      .disabled=${rate === 0}
                      .title=${title}
                      jslog=${VisualLogging.item(option.jslogContext).track({click: true})}
                    >
                      ${title}
                    </devtools-menu-item>
                  `;
                })}
                ${group.name === 'Calibrated presets' ? html`<devtools-menu-item
                  .value=${-1 /* This won't be displayed unless it has some value. */}
                  .title=${calibrationLabel}
                  jslog=${VisualLogging.action('cpu-throttling-selector-calibrate').track({click: true})}
                  @click=${this.#onCalibrateClick}
                >
                  ${calibrationLabel}
                </devtools-menu-item>` : Lit.nothing}
              </devtools-menu-group>`;
          })}
      </devtools-select-menu>
      ${recommendedInfoEl}
    `;
    /* eslint-enable rulesdir/no-deprecated-component-usages */
    // clang-format on
    Lit.render(output, this.#shadow, {host: this});
  };
}

customElements.define('devtools-cpu-throttling-selector', CPUThrottlingSelector);

declare global {
  interface HTMLElementTagNameMap {
    'devtools-cpu-throttling-selector': CPUThrottlingSelector;
  }
}
