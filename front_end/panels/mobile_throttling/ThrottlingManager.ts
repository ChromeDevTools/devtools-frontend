// Copyright 2017 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.
/* eslint-disable @devtools/no-imperative-dom-api */

import * as Common from '../../core/common/common.js';
import * as Host from '../../core/host/host.js';
import * as i18n from '../../core/i18n/i18n.js';
import * as SDK from '../../core/sdk/sdk.js';
import {Icon} from '../../ui/kit/kit.js';
import * as UI from '../../ui/legacy/legacy.js';
import {html, render} from '../../ui/lit/lit.js';
import * as VisualLogging from '../../ui/visual_logging/visual_logging.js';
import * as PanelsCommon from '../common/common.js';

import {ThrottlingPresets} from './ThrottlingPresets.js';

export interface CPUThrottlingSelectorWrapper {
  control: UI.Toolbar.ToolbarComboBox;
  updateRecommendedOption(recommendedOption: PanelsCommon.CPUThrottlingOption.CPUThrottlingOption|null): void;
}

const UIStrings = {
  /**
   * @description Text to indicate the network connectivity is offline.
   */
  offline: 'Offline',
  /**
   * @description Text in throttling manager of the Network panel.
   */
  forceDisconnectedFromNetwork: 'Force disconnected from network',
  /**
   * @description Icon title in throttling manager of the Network panel.
   */
  cpuThrottlingIsEnabled: 'CPU throttling is enabled',
  /**
   * @description Screen reader label for a select box that chooses the CPU throttling speed in the Performance panel.
   */
  cpuThrottling: 'CPU throttling',
  /**
   * @description Tooltip text in throttling manager of the Performance panel.
   */
  excessConcurrency: 'Exceeding the default value may degrade system performance.',
  /**
   * @description Tooltip text in throttling manager of the Performance panel.
   */
  resetConcurrency: 'Reset to the default value',
  /**
   * @description Label for a checkbox that enables overriding navigator.hardwareConcurrency.
   */
  hardwareConcurrency: 'Hardware concurrency',
  /**
   * @description Tooltip text for an input box that overrides navigator.hardwareConcurrency on the page.
   */
  hardwareConcurrencySettingLabel: 'Override the value reported by `navigator.hardwareConcurrency`',
  /**
   * @description Text label for a selection box showing that a specific option is recommended for CPU or network throttling.
   * @example {Fast 4G} PH1
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
   * @description Text to indicate Save-Data override is not set.
   */
  noSaveDataOverride: '\'Save-Data\': default',
  /**
   * @description Text to indicate Save-Data override is set to Enabled.
   */
  saveDataOn: '\'Save-Data\': on',
  /**
   * @description Text to indicate Save-Data override is set to Disabled.
   */
  saveDataOff: '\'Save-Data\': off',
  /**
   * @description Tooltip text for a select element that overrides navigator.connection.saveData on the page.
   */
  saveDataSettingTooltip: 'Override the value reported by `navigator.connection.saveData` on the page',
} as const;
const str_ = i18n.i18n.registerUIStrings('panels/mobile_throttling/ThrottlingManager.ts', UIStrings);
const i18nString = i18n.i18n.getLocalizedString.bind(undefined, str_);
let throttlingManagerInstance: ThrottlingManager;

export class ThrottlingManager extends Common.ObjectWrapper.ObjectWrapper<void> {
  private readonly cpuThrottlingControls: Set<UI.Toolbar.ToolbarComboBox>;
  private readonly cpuThrottlingOptions: PanelsCommon.CPUThrottlingOption.CPUThrottlingOption[];
  private readonly customNetworkConditionsSetting: Common.Settings.Setting<SDK.NetworkManager.Conditions[]>;
  private readonly currentNetworkThrottlingConditionKeySetting:
      Common.Settings.Setting<SDK.NetworkManager.ThrottlingConditionKey>;
  private readonly calibratedCpuThrottlingSetting:
      Common.Settings.Setting<PanelsCommon.CPUThrottlingOption.CalibratedCPUThrottling>;
  private lastNetworkThrottlingConditions!: SDK.NetworkManager.Conditions;
  private readonly cpuThrottlingManager: SDK.CPUThrottlingManager.CPUThrottlingManager;
  #hardwareConcurrencyOverrideEnabled = false;
  #currentCPUThrottlingOption: PanelsCommon.CPUThrottlingOption.CPUThrottlingOption =
      PanelsCommon.CPUThrottlingOption.NoThrottlingOption;
  get hardwareConcurrencyOverrideEnabled(): boolean {
    return this.#hardwareConcurrencyOverrideEnabled;
  }

  private constructor(settings: Common.Settings.Settings) {
    super();
    this.cpuThrottlingManager = SDK.CPUThrottlingManager.CPUThrottlingManager.instance();
    this.cpuThrottlingManager.addEventListener(
        SDK.CPUThrottlingManager.Events.RATE_CHANGED,
        (event: Common.EventTarget.EventTargetEvent<number>) => this.onCPUThrottlingRateChangedOnSDK(event.data));
    this.cpuThrottlingControls = new Set();
    this.cpuThrottlingOptions = ThrottlingPresets.cpuThrottlingPresets;
    this.customNetworkConditionsSetting = SDK.NetworkManager.customUserNetworkConditionsSetting(settings);

    this.currentNetworkThrottlingConditionKeySetting = SDK.NetworkManager.activeNetworkThrottlingKeySetting(settings);

    this.calibratedCpuThrottlingSetting =
        settings.createSetting<PanelsCommon.CPUThrottlingOption.CalibratedCPUThrottling>(
            'calibrated-cpu-throttling', {}, Common.Settings.SettingStorageType.GLOBAL);
    this.calibratedCpuThrottlingSetting.addChangeListener(this.onCalibratedSettingChanged, this);

    SDK.NetworkManager.MultitargetNetworkManager.instance().addEventListener(
        SDK.NetworkManager.MultitargetNetworkManager.Events.CONDITIONS_CHANGED, () => {
          this.lastNetworkThrottlingConditions = this.#getCurrentNetworkConditions();
          const conditions = SDK.NetworkManager.MultitargetNetworkManager.instance().networkConditions();
          this.currentNetworkThrottlingConditionKeySetting.set(conditions.key);
        });

    if (this.isDirty()) {
      SDK.NetworkManager.MultitargetNetworkManager.instance().setNetworkConditions(this.#getCurrentNetworkConditions());
    }
  }

  #getCurrentNetworkConditions(): SDK.NetworkManager.Conditions {
    const activeKey = this.currentNetworkThrottlingConditionKeySetting.get();
    const definition = SDK.NetworkManager.getPredefinedCondition(activeKey);
    if (definition) {
      return definition;
    }

    const custom = this.customNetworkConditionsSetting.get().find(conditions => conditions.key === activeKey);

    // Fall back to NoThrottling if we failed to find a match.
    return custom ?? SDK.NetworkManager.NoThrottlingConditions;
  }

  static instance(opts: {forceNew: boolean|null, settings?: Common.Settings.Settings} = {forceNew: null}):
      ThrottlingManager {
    const {forceNew, settings} = opts;
    if (!throttlingManagerInstance || forceNew) {
      throttlingManagerInstance = new ThrottlingManager(settings ?? Common.Settings.Settings.instance());
    }

    return throttlingManagerInstance;
  }

  createOfflineToolbarCheckbox(): UI.Toolbar.ToolbarCheckbox {
    const checkbox = new UI.Toolbar.ToolbarCheckbox(
        i18nString(UIStrings.offline), i18nString(UIStrings.forceDisconnectedFromNetwork), forceOffline.bind(this));
    checkbox.element.setAttribute('jslog', `${VisualLogging.toggle('disconnect-from-network').track({click: true})}`);
    SDK.NetworkManager.MultitargetNetworkManager.instance().addEventListener(
        SDK.NetworkManager.MultitargetNetworkManager.Events.CONDITIONS_CHANGED, networkConditionsChanged);
    checkbox.setChecked(SDK.NetworkManager.MultitargetNetworkManager.instance().isOffline());

    function forceOffline(this: ThrottlingManager): void {
      if (checkbox.checked()) {
        SDK.NetworkManager.MultitargetNetworkManager.instance().setNetworkConditions(
            SDK.NetworkManager.OfflineConditions);
      } else {
        const newConditions =
            (!this.lastNetworkThrottlingConditions.download && !this.lastNetworkThrottlingConditions.upload) ?
            SDK.NetworkManager.NoThrottlingConditions :
            this.lastNetworkThrottlingConditions;
        SDK.NetworkManager.MultitargetNetworkManager.instance().setNetworkConditions(newConditions);
      }
    }

    function networkConditionsChanged(): void {
      checkbox.setChecked(SDK.NetworkManager.MultitargetNetworkManager.instance().isOffline());
    }

    return checkbox;
  }

  private updatePanelIcon(): void {
    const warnings = [];
    if (this.cpuThrottlingManager.cpuThrottlingRate() !==
        PanelsCommon.CPUThrottlingOption.CPUThrottlingRates.NO_THROTTLING) {
      warnings.push(i18nString(UIStrings.cpuThrottlingIsEnabled));
    }
    UI.InspectorView.InspectorView.instance().setPanelWarnings('timeline', warnings);
  }

  cpuThrottlingOption(): PanelsCommon.CPUThrottlingOption.CPUThrottlingOption {
    return this.#currentCPUThrottlingOption;
  }

  setCPUThrottlingOption(option: PanelsCommon.CPUThrottlingOption.CPUThrottlingOption): void {
    if (this.#currentCPUThrottlingOption === option) {
      return;
    }
    this.#currentCPUThrottlingOption = option;
    this.cpuThrottlingManager.setCPUThrottlingRate(option.rate());
  }

  private onCalibratedSettingChanged(): void {
    if (!this.#currentCPUThrottlingOption.calibratedDeviceType) {
      return;
    }
    const rate = this.#currentCPUThrottlingOption.rate();
    if (rate === 0) {
      this.setCPUThrottlingOption(PanelsCommon.CPUThrottlingOption.NoThrottlingOption);
      return;
    }
    this.cpuThrottlingManager.setCPUThrottlingRate(rate);
  }

  onCPUThrottlingRateChangedOnSDK(rate: number): void {
    if (rate !== PanelsCommon.CPUThrottlingOption.CPUThrottlingRates.NO_THROTTLING) {
      Host.userMetrics.actionTaken(Host.UserMetrics.Action.CpuThrottlingEnabled);
    }

    const option = PanelsCommon.CPUThrottlingOption.determineOptionFromRate(rate, this.#currentCPUThrottlingOption);
    this.#currentCPUThrottlingOption = option;

    const index = this.cpuThrottlingOptions.indexOf(option);
    for (const control of this.cpuThrottlingControls) {
      control.setSelectedIndex(index);
    }
    this.updatePanelIcon();
  }

  createCPUThrottlingSelector(): CPUThrottlingSelectorWrapper {
    const getCalibrationString = (): Common.UIString.LocalizedString => {
      const value = this.calibratedCpuThrottlingSetting.get();
      const hasCalibrated = value.low || value.mid;
      return hasCalibrated ? i18nString(UIStrings.recalibrate) : i18nString(UIStrings.calibrate);
    };

    const optionSelected = (): void => {
      if (control.selectedIndex() === control.options().length - 1) {
        const index = this.cpuThrottlingOptions.indexOf(this.#currentCPUThrottlingOption);
        control.setSelectedIndex(index);
        void Common.Revealer.reveal(this.calibratedCpuThrottlingSetting);
      } else {
        this.setCPUThrottlingOption(this.cpuThrottlingOptions[control.selectedIndex()]);
      }
    };

    const control =
        new UI.Toolbar.ToolbarComboBox(optionSelected, i18nString(UIStrings.cpuThrottling), '', 'cpu-throttling');
    this.cpuThrottlingControls.add(control);
    const currentOption = this.#currentCPUThrottlingOption;

    const optionEls: HTMLOptionElement[] = [];
    const options = this.cpuThrottlingOptions;

    for (let i = 0; i < this.cpuThrottlingOptions.length; ++i) {
      const option = this.cpuThrottlingOptions[i];
      const title = option.title();
      const value = option.jslogContext;
      const optionEl = control.createOption(title, value);
      control.addOption(optionEl);
      if (currentOption === option) {
        control.setSelectedIndex(i);
      }

      optionEls.push(optionEl);
    }

    const optionEl = control.createOption(getCalibrationString(), '');
    control.addOption(optionEl);
    optionEls.push(optionEl);

    return {
      control,
      updateRecommendedOption(recommendedOption: PanelsCommon.CPUThrottlingOption.CPUThrottlingOption|null) {
        for (let i = 0; i < optionEls.length - 1; i++) {
          const option = options[i];
          optionEls[i].text = option === recommendedOption ?
              i18nString(UIStrings.recommendedThrottling, {PH1: option.title()}) :
              option.title();
          optionEls[i].disabled = option.rate() === 0;
        }

        optionEls[optionEls.length - 1].textContent = getCalibrationString();
      },
    };
  }

  createSaveDataOverrideSelector(className?: string): HTMLSelectElement {
    const select = document.createElement('select');
    select.title = i18nString(UIStrings.saveDataSettingTooltip);
    UI.ARIAUtils.setLabel(select, i18nString(UIStrings.saveDataSettingTooltip));
    if (className) {
      select.className = className;
    }
    UI.Widget.registerWidgetConfig(select, UI.Widget.widgetConfig(SaveDataOverrideSelect));
    return select;
  }

  /** Hardware Concurrency doesn't store state in a setting. */
  createHardwareConcurrencySelector(): {
    numericInput: UI.Toolbar.ToolbarItem,
    reset: UI.Toolbar.ToolbarButton,
    warning: UI.Toolbar.ToolbarItem,
    checkbox: UI.UIUtils.CheckboxLabel,
  } {
    const numericInput =
        new UI.Toolbar.ToolbarItem(UI.UIUtils.createInput('devtools-text-input', 'number', 'hardware-concurrency'));
    numericInput.setTitle(i18nString(UIStrings.hardwareConcurrencySettingLabel));
    const inputElement = numericInput.element;
    inputElement.min = '1';
    numericInput.setEnabled(false);

    const checkbox = UI.UIUtils.CheckboxLabel.create(
        i18nString(UIStrings.hardwareConcurrency), false, i18nString(UIStrings.hardwareConcurrencySettingLabel),
        'hardware-concurrency');

    const reset = new UI.Toolbar.ToolbarButton('Reset concurrency', 'undo', undefined, 'hardware-concurrency-reset');
    reset.setTitle(i18nString(UIStrings.resetConcurrency));
    const icon = new Icon();
    icon.name = 'warning-filled';
    icon.classList.add('small');
    const warning = new UI.Toolbar.ToolbarItem(icon);
    warning.setTitle(i18nString(UIStrings.excessConcurrency));

    checkbox.disabled = true;  // Prevent modification while still wiring things up asynchronously below
    reset.element.classList.add('concurrency-hidden');
    warning.element.classList.add('concurrency-hidden');

    void this.cpuThrottlingManager.getHardwareConcurrency().then(defaultValue => {
      if (defaultValue === undefined) {
        return;
      }

      const setHardwareConcurrency = (value: number): void => {
        if (value >= 1) {
          this.cpuThrottlingManager.setHardwareConcurrency(value);
        }
        if (value > defaultValue) {
          warning.element.classList.remove('concurrency-hidden');
        } else {
          warning.element.classList.add('concurrency-hidden');
        }
        if (value === defaultValue) {
          reset.element.classList.add('concurrency-hidden');
        } else {
          reset.element.classList.remove('concurrency-hidden');
        }
      };

      inputElement.value = `${defaultValue}`;
      inputElement.oninput = () => setHardwareConcurrency(Number(inputElement.value));
      checkbox.disabled = false;
      checkbox.addEventListener('change', () => {
        this.#hardwareConcurrencyOverrideEnabled = checkbox.checked;

        numericInput.setEnabled(this.hardwareConcurrencyOverrideEnabled);
        setHardwareConcurrency(this.hardwareConcurrencyOverrideEnabled ? Number(inputElement.value) : defaultValue);
      });

      reset.addEventListener(UI.Toolbar.ToolbarButton.Events.CLICK, () => {
        inputElement.value = `${defaultValue}`;
        setHardwareConcurrency(defaultValue);
      });
    });

    return {numericInput, reset, warning, checkbox};
  }

  setHardwareConcurrency(concurrency: number): void {
    this.cpuThrottlingManager.setHardwareConcurrency(concurrency);
  }

  private isDirty(): boolean {
    const networkConditions = SDK.NetworkManager.MultitargetNetworkManager.instance().networkConditions();
    const knownCurrentConditions = this.#getCurrentNetworkConditions();
    return !SDK.NetworkManager.networkConditionsEqual(networkConditions, knownCurrentConditions);
  }
}

export interface SaveDataOverrideViewInput {
  selectedOption: SDK.EmulationModel.DataSaverOverride;
  onSelect: (selectedOption: SDK.EmulationModel.DataSaverOverride) => void;
}

export type SaveDataOverrideViewFunction =
    (input: SaveDataOverrideViewInput, output: undefined, target: HTMLSelectElement) => void;

export const DEFAULT_SAVE_DATA_VIEW: SaveDataOverrideViewFunction = (input, _output, target) => {
  // clang-format off
  render(html`
    <option value=${SDK.EmulationModel.DataSaverOverride.UNSET} ?selected=${input.selectedOption === SDK.EmulationModel.DataSaverOverride.UNSET}>${i18nString(UIStrings.noSaveDataOverride)}</option>
    <option value=${SDK.EmulationModel.DataSaverOverride.ENABLED} ?selected=${input.selectedOption === SDK.EmulationModel.DataSaverOverride.ENABLED}>${i18nString(UIStrings.saveDataOn)}</option>
    <option value=${SDK.EmulationModel.DataSaverOverride.DISABLED} ?selected=${input.selectedOption === SDK.EmulationModel.DataSaverOverride.DISABLED}>${i18nString(UIStrings.saveDataOff)}</option>
  `, target, {container: {listeners: {change: (e: Event) => input.onSelect((e.target as HTMLSelectElement).value as SDK.EmulationModel.DataSaverOverride)}}});
  // clang-format on
};

export class SaveDataOverrideSelect extends UI.Widget.Widget<HTMLSelectElement> {
  readonly #setting: Common.Settings.Setting<SDK.EmulationModel.DataSaverOverride>;
  readonly #view: SaveDataOverrideViewFunction;

  constructor(element: HTMLElement, view = DEFAULT_SAVE_DATA_VIEW) {
    super(element);
    this.#view = view;
    this.#setting = Common.Settings.Settings.instance().resolve(SDK.SDKSettings.dataSaverSettingDescriptor);
    this.performUpdate();
  }

  override wasShown(): void {
    super.wasShown();
    this.#setting.addChangeListener(this.requestUpdate, this);
    this.requestUpdate();
  }

  override willHide(): void {
    super.willHide();
    this.#setting.removeChangeListener(this.requestUpdate, this);
  }

  override performUpdate(): void {
    this.#view({
      selectedOption: this.#setting.get(),
      onSelect: selectedOption => {
        this.#setting.set(selectedOption);
      },
    },
               undefined, this.contentElement);
  }
}

export class ActionDelegate implements UI.ActionRegistration.ActionDelegate {
  handleAction(_context: UI.Context.Context, actionId: string): boolean {
    if (actionId === 'network-conditions.network-online') {
      SDK.NetworkManager.MultitargetNetworkManager.instance().setNetworkConditions(
          SDK.NetworkManager.NoThrottlingConditions);
      return true;
    }
    if (actionId === 'network-conditions.network-low-end-mobile') {
      SDK.NetworkManager.MultitargetNetworkManager.instance().setNetworkConditions(SDK.NetworkManager.Slow3GConditions);
      return true;
    }
    if (actionId === 'network-conditions.network-mid-tier-mobile') {
      SDK.NetworkManager.MultitargetNetworkManager.instance().setNetworkConditions(SDK.NetworkManager.Slow4GConditions);
      return true;
    }
    if (actionId === 'network-conditions.network-offline') {
      SDK.NetworkManager.MultitargetNetworkManager.instance().setNetworkConditions(
          SDK.NetworkManager.OfflineConditions);
      return true;
    }
    return false;
  }
}

export function throttlingManager(): ThrottlingManager {
  return ThrottlingManager.instance();
}
