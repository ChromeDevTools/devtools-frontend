// Copyright 2017 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.
/* eslint-disable rulesdir/no-imperative-dom-api */

import * as Common from '../../core/common/common.js';
import * as Host from '../../core/host/host.js';
import * as i18n from '../../core/i18n/i18n.js';
import * as SDK from '../../core/sdk/sdk.js';
import * as IconButton from '../../ui/components/icon_button/icon_button.js';
import * as UI from '../../ui/legacy/legacy.js';
import * as VisualLogging from '../../ui/visual_logging/visual_logging.js';

import {MobileThrottlingSelector} from './MobileThrottlingSelector.js';
import {
  type Conditions,
  type ConditionsList,
  type MobileThrottlingConditionsGroup,
  ThrottlingPresets,
} from './ThrottlingPresets.js';

export interface CPUThrottlingSelectorWrapper {
  control: UI.Toolbar.ToolbarComboBox;
  updateRecommendedOption(recommendedOption: SDK.CPUThrottlingManager.CPUThrottlingOption|null): void;
}

const UIStrings = {
  /**
   *@description Text to indicate the network connectivity is offline
   */
  offline: 'Offline',
  /**
   *@description Text in Throttling Manager of the Network panel
   */
  forceDisconnectedFromNetwork: 'Force disconnected from network',
  /**
   * @description Text for throttling the network
   */
  throttling: 'Throttling',
  /**
   * @description Icon title in Throttling Manager of the Network panel
   */
  cpuThrottlingIsEnabled: 'CPU throttling is enabled',
  /**
   * @description Screen reader label for a select box that chooses the CPU throttling speed in the Performance panel
   */
  cpuThrottling: 'CPU throttling',
  /**
   * @description Tooltip text in Throttling Manager of the Performance panel
   */
  excessConcurrency: 'Exceeding the default value may degrade system performance.',
  /**
   * @description Tooltip text in Throttling Manager of the Performance panel
   */
  resetConcurrency: 'Reset to the default value',
  /**
   * @description Label for an check box that neables overriding navigator.hardwareConcurrency
   */
  hardwareConcurrency: 'Hardware concurrency',
  /**
   * @description Tooltip text for an input box that overrides navigator.hardwareConcurrency on the page
   */
  hardwareConcurrencySettingLabel: 'Override the value reported by navigator.hardwareConcurrency',
  /**
   * @description Text label for a selection box showing that a specific option is recommended for CPU or Network throttling.
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
  saveDataOn: '\'Save-Data\': force on',
  /**
   * @description Text to indicate Save-Data override is set to Disabled.
   */
  saveDataOff: '\'Save-Data\': force off',
  /**
   * @description Tooltip text for an select element that overrides navigator.connection.saveData on the page
   */
  saveDataSettingTooltip: 'Override the value reported by navigator.connection.saveData on the page',
} as const;
const str_ = i18n.i18n.registerUIStrings('panels/mobile_throttling/ThrottlingManager.ts', UIStrings);
const i18nString = i18n.i18n.getLocalizedString.bind(undefined, str_);
let throttlingManagerInstance: ThrottlingManager;

class PromiseQueue<T> {
  #promise = Promise.resolve();

  push(promise: Promise<T>): Promise<T> {
    return new Promise(r => {
      this.#promise = this.#promise.then(async () => r(await promise));
    });
  }
}

export class ThrottlingManager extends Common.ObjectWrapper.ObjectWrapper<ThrottlingManager.EventTypes> {
  private readonly cpuThrottlingControls: Set<UI.Toolbar.ToolbarComboBox>;
  private readonly cpuThrottlingOptions: SDK.CPUThrottlingManager.CPUThrottlingOption[];
  private readonly customNetworkConditionsSetting: Common.Settings.Setting<SDK.NetworkManager.Conditions[]>;
  private readonly currentNetworkThrottlingConditionKeySetting:
      Common.Settings.Setting<SDK.NetworkManager.ThrottlingConditionKey>;
  private readonly calibratedCpuThrottlingSetting:
      Common.Settings.Setting<SDK.CPUThrottlingManager.CalibratedCPUThrottling>;
  private lastNetworkThrottlingConditions!: SDK.NetworkManager.Conditions;
  private readonly cpuThrottlingManager: SDK.CPUThrottlingManager.CPUThrottlingManager;
  #hardwareConcurrencyOverrideEnabled = false;
  readonly #emulationQueue = new PromiseQueue<void>();
  get hardwareConcurrencyOverrideEnabled(): boolean {
    return this.#hardwareConcurrencyOverrideEnabled;
  }

  private constructor() {
    super();
    this.cpuThrottlingManager = SDK.CPUThrottlingManager.CPUThrottlingManager.instance();
    this.cpuThrottlingManager.addEventListener(
        SDK.CPUThrottlingManager.Events.RATE_CHANGED,
        (event: Common.EventTarget.EventTargetEvent<number>) => this.onCPUThrottlingRateChangedOnSDK(event.data));
    this.cpuThrottlingControls = new Set();
    this.cpuThrottlingOptions = ThrottlingPresets.cpuThrottlingPresets;
    this.customNetworkConditionsSetting = SDK.NetworkManager.customUserNetworkConditionsSetting();

    this.currentNetworkThrottlingConditionKeySetting = SDK.NetworkManager.activeNetworkThrottlingKeySetting();

    this.calibratedCpuThrottlingSetting =
        Common.Settings.Settings.instance().createSetting<SDK.CPUThrottlingManager.CalibratedCPUThrottling>(
            'calibrated-cpu-throttling', {}, Common.Settings.SettingStorageType.GLOBAL);

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

  static instance(opts: {forceNew: boolean|null} = {forceNew: null}): ThrottlingManager {
    const {forceNew} = opts;
    if (!throttlingManagerInstance || forceNew) {
      throttlingManagerInstance = new ThrottlingManager();
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

  createMobileThrottlingButton(): UI.Toolbar.ToolbarMenuButton {
    const button = new UI.Toolbar.ToolbarMenuButton(appendItems, undefined, undefined, 'mobile-throttling');
    button.setTitle(i18nString(UIStrings.throttling));
    button.setDarkText();

    let options: ConditionsList = [];
    let selectedIndex = -1;
    const selector = new MobileThrottlingSelector(populate, select);
    return button;

    function appendItems(contextMenu: UI.ContextMenu.ContextMenu): void {
      for (let index = 0; index < options.length; ++index) {
        const conditions = options[index];
        if (!conditions) {
          continue;
        }
        if (conditions.title === ThrottlingPresets.getCustomConditions().title &&
            conditions.description === ThrottlingPresets.getCustomConditions().description) {
          continue;
        }
        contextMenu.defaultSection().appendCheckboxItem(
            conditions.title, selector.optionSelected.bind(selector, conditions as Conditions),
            {checked: selectedIndex === index, jslogContext: conditions.jslogContext});
      }
    }

    function populate(groups: MobileThrottlingConditionsGroup[]): ConditionsList {
      options = [];
      for (const group of groups) {
        for (const conditions of group.items) {
          options.push(conditions);
        }
        options.push(null);
      }
      return options;
    }

    function select(index: number): void {
      selectedIndex = index;
      const option = options[index];
      if (option) {
        button.setText(option.title);
        button.setTitle(`${option.title}: ${option.description}`);
      }
    }
  }

  private updatePanelIcon(): void {
    const warnings = [];
    if (this.cpuThrottlingManager.cpuThrottlingRate() !== SDK.CPUThrottlingManager.CPUThrottlingRates.NO_THROTTLING) {
      warnings.push(i18nString(UIStrings.cpuThrottlingIsEnabled));
    }
    UI.InspectorView.InspectorView.instance().setPanelWarnings('timeline', warnings);
  }

  setCPUThrottlingOption(option: SDK.CPUThrottlingManager.CPUThrottlingOption): void {
    // This will transitively call onCPUThrottlingRateChangedOnSDK.
    this.cpuThrottlingManager.setCPUThrottlingOption(option);
  }

  onCPUThrottlingRateChangedOnSDK(rate: number): void {
    if (rate !== SDK.CPUThrottlingManager.CPUThrottlingRates.NO_THROTTLING) {
      Host.userMetrics.actionTaken(Host.UserMetrics.Action.CpuThrottlingEnabled);
    }

    const index = this.cpuThrottlingOptions.indexOf(this.cpuThrottlingManager.cpuThrottlingOption());
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
        const index = this.cpuThrottlingOptions.indexOf(this.cpuThrottlingManager.cpuThrottlingOption());
        control.setSelectedIndex(index);
        void Common.Revealer.reveal(this.calibratedCpuThrottlingSetting);
      } else {
        this.setCPUThrottlingOption(this.cpuThrottlingOptions[control.selectedIndex()]);
      }
    };

    const control =
        new UI.Toolbar.ToolbarComboBox(optionSelected, i18nString(UIStrings.cpuThrottling), '', 'cpu-throttling');
    this.cpuThrottlingControls.add(control);
    const currentOption = this.cpuThrottlingManager.cpuThrottlingOption();

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
      updateRecommendedOption(recommendedOption: SDK.CPUThrottlingManager.CPUThrottlingOption|null) {
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

  createSaveDataOverrideSelector(className?: string): UI.Toolbar.ToolbarComboBox {
    const reset = new Option(i18nString(UIStrings.noSaveDataOverride), undefined, true, true);
    const enable = new Option(i18nString(UIStrings.saveDataOn));
    const disable = new Option(i18nString(UIStrings.saveDataOff));
    const handler = (e: Event): void => {
      const select = e.target as HTMLSelectElement;
      switch (select.selectedOptions.item(0)) {
        case reset:
          for (const emulationModel of SDK.TargetManager.TargetManager.instance().models(
                   SDK.EmulationModel.EmulationModel)) {
            void this.#emulationQueue.push(
                emulationModel.setDataSaverOverride(SDK.EmulationModel.DataSaverOverride.UNSET));
          }
          break;
        case enable:
          for (const emulationModel of SDK.TargetManager.TargetManager.instance().models(
                   SDK.EmulationModel.EmulationModel)) {
            void this.#emulationQueue.push(
                emulationModel.setDataSaverOverride(SDK.EmulationModel.DataSaverOverride.ENABLED));
          }
          break;
        case disable:
          for (const emulationModel of SDK.TargetManager.TargetManager.instance().models(
                   SDK.EmulationModel.EmulationModel)) {
            void this.#emulationQueue.push(
                emulationModel.setDataSaverOverride(SDK.EmulationModel.DataSaverOverride.DISABLED));
          }
          break;
      }
      this.dispatchEventToListeners(ThrottlingManager.Events.SAVE_DATA_OVERRIDE_CHANGED, select.selectedIndex);
    };
    const select = new UI.Toolbar.ToolbarComboBox(handler, i18nString(UIStrings.saveDataSettingTooltip), className);
    select.addOption(reset);
    select.addOption(enable);
    select.addOption(disable);

    this.addEventListener(
        ThrottlingManager.Events.SAVE_DATA_OVERRIDE_CHANGED, ({data}) => select.setSelectedIndex(data));

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
    const icon = new IconButton.Icon.Icon();
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

export namespace ThrottlingManager {
  export const enum Events {
    SAVE_DATA_OVERRIDE_CHANGED = 'SaveDataOverrideChanged',
  }

  export interface EventTypes {
    [Events.SAVE_DATA_OVERRIDE_CHANGED]: number;
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
