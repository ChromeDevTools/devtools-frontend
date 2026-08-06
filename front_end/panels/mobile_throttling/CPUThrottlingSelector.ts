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

import {throttlingManager} from './ThrottlingManager.js';
import {ThrottlingPresets} from './ThrottlingPresets.js';

const {render, html, Directives} = Lit;

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
} as const;

const str_ = i18n.i18n.registerUIStrings(
    'panels/mobile_throttling/CPUThrottlingSelector.ts',
    UIStrings,
);
const i18nString = i18n.i18n.getLocalizedString.bind(undefined, str_);

interface CPUThrottlingGroup {
  name: string;
  items: PanelsCommon.CPUThrottlingOption.CPUThrottlingOption[];
}

interface ViewInput {
  recommendedOption: PanelsCommon.CPUThrottlingOption.CPUThrottlingOption|null;
  currentOption: PanelsCommon.CPUThrottlingOption.CPUThrottlingOption;
  groups: CPUThrottlingGroup[];
  throttling: PanelsCommon.CPUThrottlingOption.CalibratedCPUThrottling;
  onSelect: (
      option: PanelsCommon.CPUThrottlingOption.CPUThrottlingOption,
      ) => void;
  onCalibrateClick: () => void;
}

const optionsMap = new WeakMap<HTMLOptionElement, PanelsCommon.CPUThrottlingOption.CPUThrottlingOption>();

export const DEFAULT_VIEW = (
    input: ViewInput,
    _output: undefined,
    target: HTMLElement,
    ): void => {
  const selectionTitle = input.currentOption.title();
  const hasCalibratedOnce = input.throttling.low || input.throttling.mid;
  const calibrationLabel = hasCalibratedOnce ? i18nString(UIStrings.recalibrate) : i18nString(UIStrings.calibrate);

  function onSelect(event: Event): void {
    const element = event.target as HTMLSelectElement | null;
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
    } else {
      input.onCalibrateClick();
      event.consume(true);
      element.value = String(
          input.currentOption.calibratedDeviceType ?? input.currentOption.rate(),
      );
    }
  }

  // clang-format off
  render(
    html`${input.groups.map(group => {
      return html` <optgroup
        label=${group.name}
        title=${group.name}
      >
        ${group.items.map(option => {
          const title =
            option === input.recommendedOption
              ? i18nString(UIStrings.recommendedThrottling, {
                  PH1: option.title(),
                })
              : option.title();
          const rate = option.rate();
          return html`
            <option
              ${Directives.ref(
                optionEl =>
                  optionEl &&
                  optionsMap.set(optionEl as HTMLOptionElement, option),
              )}
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
          ? html`<option
              .value=${
                '-1' /* This won't be displayed unless it has some value. */
              }
              title=${calibrationLabel}
              aria-label=${calibrationLabel}
              jslog=${VisualLogging.action(
                'cpu-throttling-selector-calibrate',
              ).track({click: true})}
            >
              ${calibrationLabel}
            </option>`
          : Lit.nothing}
      </optgroup>`;
    })}`,
    target,
    {
      container: {
        listeners: {change: onSelect},
        attributes: {
          title: i18nString(UIStrings.cpuThrottling, {PH1: selectionTitle}),
          'aria-label': i18nString(UIStrings.cpuThrottling, {PH1: selectionTitle}),
          jslog: `${VisualLogging.dropDown('cpu-throttling').track({change: true})}`,
        },
      },
    },
  );
  // clang-format on
};

type View = typeof DEFAULT_VIEW;

export class CPUThrottlingSelector extends UI.Widget.Widget {
  #currentOption: PanelsCommon.CPUThrottlingOption.CPUThrottlingOption;
  #recommendedOption: PanelsCommon.CPUThrottlingOption.CPUThrottlingOption|null = null;
  #groups: CPUThrottlingGroup[] = [];
  #calibratedThrottlingSetting: Common.Settings.Setting<PanelsCommon.CPUThrottlingOption.CalibratedCPUThrottling>;
  readonly #view: View;
  readonly #cpuThrottlingManager = SDK.CPUThrottlingManager.CPUThrottlingManager.instance();

  static createForGlobalConditions(
      element: HTMLElement,
      ): CPUThrottlingSelector {
    const selectElement = element.createChild('select');
    const select = new CPUThrottlingSelector(selectElement);
    select.show(element, undefined, /* suppressOrphanWidgetError= */ true);
    select.performUpdate();
    return select;
  }

  constructor(element?: HTMLElement, view: View = DEFAULT_VIEW) {
    super(element);
    this.#currentOption = throttlingManager().cpuThrottlingOption();
    this.#calibratedThrottlingSetting =
        Common.Settings.Settings.instance().createSetting<PanelsCommon.CPUThrottlingOption.CalibratedCPUThrottling>(
            'calibrated-cpu-throttling',
            {},
            Common.Settings.SettingStorageType.GLOBAL,
        );
    this.#resetGroups();
    this.#view = view;
    this.performUpdate();
  }

  set recommendedOption(
      recommendedOption: PanelsCommon.CPUThrottlingOption.CPUThrottlingOption|null,
  ) {
    this.#recommendedOption = recommendedOption;
    this.requestUpdate();
  }

  #updateRecommendation = (): void => {
    let cpuOption: PanelsCommon.CPUThrottlingOption.CPUThrottlingOption =
        PanelsCommon.CPUThrottlingOption.CalibratedMidTierMobileThrottlingOption;
    if (cpuOption.rate() === 0) {
      cpuOption = PanelsCommon.CPUThrottlingOption.MidTierThrottlingOption;
    }
    this.recommendedOption = cpuOption;
  };

  override wasShown(): void {
    super.wasShown();
    this.#cpuThrottlingManager.addEventListener(
        SDK.CPUThrottlingManager.Events.RATE_CHANGED,
        this.#onOptionChange,
        this,
    );
    this.#calibratedThrottlingSetting.addChangeListener(
        this.#onCalibratedSettingChanged,
        this,
    );
    CrUXManager.CrUXManager.instance().addEventListener(
        CrUXManager.Events.FIELD_DATA_CHANGED,
        this.#updateRecommendation,
    );
    this.#updateRecommendation();
    this.#onOptionChange();
  }

  override willHide(): void {
    super.willHide();
    this.#calibratedThrottlingSetting.removeChangeListener(
        this.#onCalibratedSettingChanged,
        this,
    );
    this.#cpuThrottlingManager.removeEventListener(
        SDK.CPUThrottlingManager.Events.RATE_CHANGED,
        this.#onOptionChange,
        this,
    );
    CrUXManager.CrUXManager.instance().removeEventListener(
        CrUXManager.Events.FIELD_DATA_CHANGED,
        this.#updateRecommendation,
    );
  }

  #onOptionChange(): void {
    this.#currentOption = throttlingManager().cpuThrottlingOption();
    this.requestUpdate();
  }

  #onCalibratedSettingChanged(): void {
    this.#resetGroups();
    this.requestUpdate();
  }

  #onSelect(
      option: PanelsCommon.CPUThrottlingOption.CPUThrottlingOption,
      ): void {
    throttlingManager().setCPUThrottlingOption(option);
  }

  #onCalibrateClick(): void {
    void Common.Revealer.reveal(this.#calibratedThrottlingSetting);
    this.requestUpdate();
  }

  #resetGroups(): void {
    this.#groups = [
      {
        name: i18nString(UIStrings.disabledThrottlingPreset),
        items: ThrottlingPresets.cpuThrottlingPresets.filter(
            option => option.rate() === 1 && !option.calibratedDeviceType,
            ),
      },
      {
        name: i18nString(UIStrings.defaultPresets),
        items: ThrottlingPresets.cpuThrottlingPresets.filter(
            option => !option.calibratedDeviceType && option.rate() > 1,
            ),
      },
      {
        name: i18nString(UIStrings.labelCalibratedPresets),
        items: ThrottlingPresets.cpuThrottlingPresets.filter(
            option => option.calibratedDeviceType,
            ),
      },
    ];
  }

  override performUpdate(): void {
    const input: ViewInput = {
      recommendedOption: this.#recommendedOption,
      currentOption: this.#currentOption,
      groups: this.#groups,
      throttling: this.#calibratedThrottlingSetting.get(),
      onSelect: this.#onSelect.bind(this),
      onCalibrateClick: this.#onCalibrateClick.bind(this),
    };
    this.#view(input, undefined, this.contentElement as HTMLSelectElement);
  }
}
