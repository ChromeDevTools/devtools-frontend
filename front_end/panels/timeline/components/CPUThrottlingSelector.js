// Copyright 2024 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.
import '../../../ui/kit/kit.js';
import '../../../ui/components/menus/menus.js';
import * as Common from '../../../core/common/common.js';
import * as i18n from '../../../core/i18n/i18n.js';
import * as SDK from '../../../core/sdk/sdk.js';
import * as UI from '../../../ui/legacy/legacy.js';
import * as Lit from '../../../ui/lit/lit.js';
import * as VisualLogging from '../../../ui/visual_logging/visual_logging.js';
import * as MobileThrottling from '../../mobile_throttling/mobile_throttling.js';
import cpuThrottlingSelectorStyles from './cpuThrottlingSelector.css.js';
const { render, html } = Lit;
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
};
const str_ = i18n.i18n.registerUIStrings('panels/timeline/components/CPUThrottlingSelector.ts', UIStrings);
const i18nString = i18n.i18n.getLocalizedString.bind(undefined, str_);
export const DEFAULT_VIEW = (input, _output, target) => {
    let recommendedInfoEl;
    if (input.recommendedOption && input.currentOption === SDK.CPUThrottlingManager.NoThrottlingOption) {
        recommendedInfoEl = html `<devtools-icon
        title=${i18nString(UIStrings.recommendedThrottlingReason)}
        name=info></devtools-icon>`;
    }
    const selectionTitle = input.currentOption.title();
    const hasCalibratedOnce = input.throttling.low || input.throttling.mid;
    const calibrationLabel = hasCalibratedOnce ? i18nString(UIStrings.recalibrate) : i18nString(UIStrings.calibrate);
    // clang-format off
    /* eslint-disable @devtools/no-deprecated-component-usages */
    const template = html `
    <style>${cpuThrottlingSelectorStyles}</style>
    <devtools-select-menu
          @selectmenuselected=${input.onMenuItemSelected}
          .showDivider=${true}
          .showArrow=${true}
          .sideButton=${false}
          .showSelectedItem=${true}
          .jslogContext=${'cpu-throttling'}
          .buttonTitle=${i18nString(UIStrings.cpu, { PH1: selectionTitle })}
          .title=${i18nString(UIStrings.cpuThrottling, { PH1: selectionTitle })}
        >
        ${input.groups.map(group => {
        return html `
            <devtools-menu-group .name=${group.name} .title=${group.name}>
              ${group.items.map(option => {
            const title = option === input.recommendedOption ? i18nString(UIStrings.recommendedThrottling, { PH1: option.title() }) : option.title();
            const rate = option.rate();
            return html `
                  <devtools-menu-item
                    .value=${option.calibratedDeviceType ?? rate}
                    .selected=${input.currentOption === option}
                    .disabled=${rate === 0}
                    .title=${title}
                    jslog=${VisualLogging.item(option.jslogContext).track({ click: true })}
                  >
                    ${title}
                  </devtools-menu-item>
                `;
        })}
              ${group.name === 'Calibrated presets' ? html `<devtools-menu-item
                .value=${-1 /* This won't be displayed unless it has some value. */}
                .title=${calibrationLabel}
                jslog=${VisualLogging.action('cpu-throttling-selector-calibrate').track({ click: true })}
                @click=${input.onCalibrateClick}
              >
                ${calibrationLabel}
              </devtools-menu-item>` : Lit.nothing}
            </devtools-menu-group>`;
    })}
    </devtools-select-menu>
    ${recommendedInfoEl}
  `;
    // clang-format on
    render(template, target);
};
export class CPUThrottlingSelector extends UI.Widget.Widget {
    #currentOption;
    #recommendedOption = null;
    #groups = [];
    #calibratedThrottlingSetting;
    #view;
    constructor(element, view = DEFAULT_VIEW) {
        super(element);
        this.#currentOption = SDK.CPUThrottlingManager.CPUThrottlingManager.instance().cpuThrottlingOption();
        this.#calibratedThrottlingSetting =
            Common.Settings.Settings.instance().createSetting('calibrated-cpu-throttling', {}, "Global" /* Common.Settings.SettingStorageType.GLOBAL */);
        this.#resetGroups();
        this.#view = view;
    }
    set recommendedOption(recommendedOption) {
        this.#recommendedOption = recommendedOption;
        this.requestUpdate();
    }
    wasShown() {
        super.wasShown();
        SDK.CPUThrottlingManager.CPUThrottlingManager.instance().addEventListener("RateChanged" /* SDK.CPUThrottlingManager.Events.RATE_CHANGED */, this.#onOptionChange, this);
        this.#calibratedThrottlingSetting.addChangeListener(this.#onCalibratedSettingChanged, this);
        this.#onOptionChange();
    }
    willHide() {
        super.willHide();
        this.#calibratedThrottlingSetting.removeChangeListener(this.#onCalibratedSettingChanged, this);
        SDK.CPUThrottlingManager.CPUThrottlingManager.instance().removeEventListener("RateChanged" /* SDK.CPUThrottlingManager.Events.RATE_CHANGED */, this.#onOptionChange, this);
    }
    #onOptionChange() {
        this.#currentOption = SDK.CPUThrottlingManager.CPUThrottlingManager.instance().cpuThrottlingOption();
        this.requestUpdate();
    }
    #onCalibratedSettingChanged() {
        this.#resetGroups();
        this.requestUpdate();
    }
    #onMenuItemSelected(event) {
        let option;
        if (typeof event.itemValue === 'string') {
            if (event.itemValue === 'low-tier-mobile') {
                option = SDK.CPUThrottlingManager.CalibratedLowTierMobileThrottlingOption;
            }
            else if (event.itemValue === 'mid-tier-mobile') {
                option = SDK.CPUThrottlingManager.CalibratedMidTierMobileThrottlingOption;
            }
        }
        else {
            const rate = Number(event.itemValue);
            option = MobileThrottling.ThrottlingPresets.ThrottlingPresets.cpuThrottlingPresets.find(option => !option.calibratedDeviceType && option.rate() === rate);
        }
        if (option) {
            MobileThrottling.ThrottlingManager.throttlingManager().setCPUThrottlingOption(option);
        }
    }
    #onCalibrateClick() {
        void Common.Revealer.reveal(this.#calibratedThrottlingSetting);
    }
    #resetGroups() {
        this.#groups = [
            {
                name: '',
                items: MobileThrottling.ThrottlingPresets.ThrottlingPresets.cpuThrottlingPresets.filter(option => !option.calibratedDeviceType),
            },
            {
                name: i18nString(UIStrings.labelCalibratedPresets),
                items: MobileThrottling.ThrottlingPresets.ThrottlingPresets.cpuThrottlingPresets.filter(option => option.calibratedDeviceType),
            },
        ];
    }
    async performUpdate() {
        const input = {
            recommendedOption: this.#recommendedOption,
            currentOption: this.#currentOption,
            groups: this.#groups,
            throttling: this.#calibratedThrottlingSetting.get(),
            onMenuItemSelected: this.#onMenuItemSelected.bind(this),
            onCalibrateClick: this.#onCalibrateClick.bind(this),
        };
        this.#view(input, undefined, this.contentElement);
    }
}
//# sourceMappingURL=CPUThrottlingSelector.js.map