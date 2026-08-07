// Copyright 2026 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.
import * as Common from '../../core/common/common.js';
import * as i18n from '../../core/i18n/i18n.js';
import * as SDK from '../../core/sdk/sdk.js';
import * as CrUXManager from '../../models/crux-manager/crux-manager.js';
import * as UI from '../../ui/legacy/legacy.js';
import * as Lit from '../../ui/lit/lit.js';
import * as VisualLogging from '../../ui/visual_logging/visual_logging.js';
import * as PanelsCommon from '../common/common.js';
import { throttlingManager } from './ThrottlingManager.js';
import { ThrottlingPresets } from './ThrottlingPresets.js';
const { render, html, Directives } = Lit;
const UIStrings = {
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
     * @description Text to prompt the user to run the CPU calibration process.
     */
    calibrate: 'Calibrate…',
    /**
     * @description Text to prompt the user to re-run the CPU calibration process.
     */
    recalibrate: 'Recalibrate…',
    /**
     * @description CPU preset option with no throttling.
     */
    disabledThrottlingPreset: 'Disabled',
    /**
     * @description Default presets category title.
     */
    defaultPresets: 'Presets',
    /**
     * @description Label shown above a list of CPU calibration preset options.
     */
    labelCalibratedPresets: 'Calibrated presets',
};
const str_ = i18n.i18n.registerUIStrings('panels/mobile_throttling/CPUThrottlingSelector.ts', UIStrings);
const i18nString = i18n.i18n.getLocalizedString.bind(undefined, str_);
const optionsMap = new WeakMap();
export const DEFAULT_VIEW = (input, _output, target) => {
    const selectionTitle = input.currentOption.title();
    const hasCalibratedOnce = input.throttling.low || input.throttling.mid;
    const calibrationLabel = hasCalibratedOnce ? i18nString(UIStrings.recalibrate) : i18nString(UIStrings.calibrate);
    function onSelect(event) {
        const element = event.target;
        if (!element) {
            return;
        }
        const option = element.selectedOptions[0];
        if (!option) {
            return;
        }
        const condition = optionsMap.get(option);
        if (condition) {
            input.onSelect(condition);
        }
        else {
            input.onCalibrateClick();
            event.consume(true);
            element.value = String(input.currentOption.calibratedDeviceType ?? input.currentOption.rate());
        }
    }
    // clang-format off
    render(html `${input.groups.map(group => {
        return html ` <optgroup
        label=${group.name}
        title=${group.name}
      >
        ${group.items.map(option => {
            const title = option === input.recommendedOption
                ? i18nString(UIStrings.recommendedThrottling, {
                    PH1: option.title(),
                })
                : option.title();
            const rate = option.rate();
            return html `
            <option
              ${Directives.ref(optionEl => optionEl &&
                optionsMap.set(optionEl, option))}
              .value=${String(option.calibratedDeviceType ?? rate)}
              ?selected=${input.currentOption === option}
              ?disabled=${rate === 0}
              title=${title}
              aria-label=${title}
              jslog=${VisualLogging.item(option.jslogContext).track({
                click: true,
            })}
            >
              ${title}
            </option>
          `;
        })}
        ${group.name === i18nString(UIStrings.labelCalibratedPresets)
            ? html `<option
              .value=${'-1' /* This won't be displayed unless it has some value. */}
              title=${calibrationLabel}
              aria-label=${calibrationLabel}
              jslog=${VisualLogging.action('cpu-throttling-selector-calibrate').track({ click: true })}
            >
              ${calibrationLabel}
            </option>`
            : Lit.nothing}
      </optgroup>`;
    })}`, target, {
        container: {
            listeners: { change: onSelect },
            attributes: {
                title: i18nString(UIStrings.cpuThrottling, { PH1: selectionTitle }),
                'aria-label': i18nString(UIStrings.cpuThrottling, { PH1: selectionTitle }),
                jslog: `${VisualLogging.dropDown('cpu-throttling').track({ change: true })}`,
            },
        },
    });
    // clang-format on
};
export class CPUThrottlingSelector extends UI.Widget.Widget {
    #currentOption;
    #recommendedOption = null;
    #groups = [];
    #calibratedThrottlingSetting;
    #view;
    #cpuThrottlingManager = SDK.CPUThrottlingManager.CPUThrottlingManager.instance();
    static createForGlobalConditions(element) {
        const selectElement = element.createChild('select');
        const select = new CPUThrottlingSelector(selectElement);
        select.show(element, undefined, /* suppressOrphanWidgetError= */ true);
        select.performUpdate();
        return select;
    }
    constructor(element, view = DEFAULT_VIEW) {
        super(element);
        this.#currentOption = throttlingManager().cpuThrottlingOption();
        this.#calibratedThrottlingSetting =
            Common.Settings.Settings.instance().createSetting('calibrated-cpu-throttling', {}, "Global" /* Common.Settings.SettingStorageType.GLOBAL */);
        this.#resetGroups();
        this.#view = view;
        this.performUpdate();
    }
    set recommendedOption(recommendedOption) {
        this.#recommendedOption = recommendedOption;
        this.requestUpdate();
    }
    #updateRecommendation = () => {
        let cpuOption = PanelsCommon.CPUThrottlingOption.CalibratedMidTierMobileThrottlingOption;
        if (cpuOption.rate() === 0) {
            cpuOption = PanelsCommon.CPUThrottlingOption.MidTierThrottlingOption;
        }
        this.recommendedOption = cpuOption;
    };
    wasShown() {
        super.wasShown();
        this.#cpuThrottlingManager.addEventListener("RateChanged" /* SDK.CPUThrottlingManager.Events.RATE_CHANGED */, this.#onOptionChange, this);
        this.#calibratedThrottlingSetting.addChangeListener(this.#onCalibratedSettingChanged, this);
        CrUXManager.CrUXManager.instance().addEventListener("field-data-changed" /* CrUXManager.Events.FIELD_DATA_CHANGED */, this.#updateRecommendation);
        this.#updateRecommendation();
        this.#onOptionChange();
    }
    willHide() {
        super.willHide();
        this.#calibratedThrottlingSetting.removeChangeListener(this.#onCalibratedSettingChanged, this);
        this.#cpuThrottlingManager.removeEventListener("RateChanged" /* SDK.CPUThrottlingManager.Events.RATE_CHANGED */, this.#onOptionChange, this);
        CrUXManager.CrUXManager.instance().removeEventListener("field-data-changed" /* CrUXManager.Events.FIELD_DATA_CHANGED */, this.#updateRecommendation);
    }
    #onOptionChange() {
        this.#currentOption = throttlingManager().cpuThrottlingOption();
        this.requestUpdate();
    }
    #onCalibratedSettingChanged() {
        this.#resetGroups();
        this.requestUpdate();
    }
    #onSelect(option) {
        throttlingManager().setCPUThrottlingOption(option);
    }
    #onCalibrateClick() {
        void Common.Revealer.reveal(this.#calibratedThrottlingSetting);
        this.requestUpdate();
    }
    #resetGroups() {
        this.#groups = [
            {
                name: i18nString(UIStrings.disabledThrottlingPreset),
                items: ThrottlingPresets.cpuThrottlingPresets.filter(option => option.rate() === 1 && !option.calibratedDeviceType),
            },
            {
                name: i18nString(UIStrings.defaultPresets),
                items: ThrottlingPresets.cpuThrottlingPresets.filter(option => !option.calibratedDeviceType && option.rate() > 1),
            },
            {
                name: i18nString(UIStrings.labelCalibratedPresets),
                items: ThrottlingPresets.cpuThrottlingPresets.filter(option => option.calibratedDeviceType),
            },
        ];
    }
    performUpdate() {
        const input = {
            recommendedOption: this.#recommendedOption,
            currentOption: this.#currentOption,
            groups: this.#groups,
            throttling: this.#calibratedThrottlingSetting.get(),
            onSelect: this.#onSelect.bind(this),
            onCalibrateClick: this.#onCalibrateClick.bind(this),
        };
        this.#view(input, undefined, this.contentElement);
    }
}
//# sourceMappingURL=CPUThrottlingSelector.js.map