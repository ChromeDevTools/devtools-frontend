// Copyright 2017 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import '../../ui/kit/kit.js';

import * as Common from '../../core/common/common.js';
import * as Host from '../../core/host/host.js';
import * as i18n from '../../core/i18n/i18n.js';
import * as SDK from '../../core/sdk/sdk.js';
import * as Buttons from '../../ui/components/buttons/buttons.js';
import * as UI from '../../ui/legacy/legacy.js';
import {Directives, html, render} from '../../ui/lit/lit.js';
import * as VisualLogging from '../../ui/visual_logging/visual_logging.js';
import * as PanelsCommon from '../common/common.js';

import hardwareConcurrencySelectorStyles from './hardwareConcurrencySelector.css.js';

export import CPUPerformanceTier = SDK.CPUThrottlingManager.CPUPerformanceTier;

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
   * @description Tooltip text in throttling manager of the Performance panel.
   */
  excessConcurrency: 'Exceeding the default value may degrade system performance',
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
  private readonly customNetworkConditionsSetting: Common.Settings.Setting<SDK.NetworkManager.Conditions[]>;
  private readonly currentNetworkThrottlingConditionKeySetting:
      Common.Settings.Setting<SDK.NetworkManager.ThrottlingConditionKey>;
  private readonly calibratedCpuThrottlingSetting:
      Common.Settings.Setting<PanelsCommon.CPUThrottlingOption.CalibratedCPUThrottling>;
  private lastNetworkThrottlingConditions!: SDK.NetworkManager.Conditions;
  private readonly cpuThrottlingManager: SDK.CPUThrottlingManager.CPUThrottlingManager;
  #currentCPUThrottlingOption: PanelsCommon.CPUThrottlingOption.CPUThrottlingOption =
      PanelsCommon.CPUThrottlingOption.NoThrottlingOption;
  private constructor(settings: Common.Settings.Settings) {
    super();
    this.cpuThrottlingManager = SDK.CPUThrottlingManager.CPUThrottlingManager.instance();
    this.cpuThrottlingManager.addEventListener(
        SDK.CPUThrottlingManager.Events.RATE_CHANGED,
        (event: Common.EventTarget.EventTargetEvent<number>) => this.onCPUThrottlingRateChangedOnSDK(event.data));
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
    const checkbox = new UI.Toolbar.ToolbarCheckbox(i18nString(UIStrings.offline),
                                                    i18nString(UIStrings.forceDisconnectedFromNetwork),
                                                    forceOffline.bind(this), 'disconnect-from-network');
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

    this.updatePanelIcon();
  }

  effectiveCPUPerformanceTier(): CPUPerformanceTier|undefined {
    return this.cpuThrottlingManager.effectiveCPUPerformanceTier();
  }

  setCPUPerformanceTier(tier?: CPUPerformanceTier): void {
    this.cpuThrottlingManager.setCPUPerformanceTier(tier);
  }

  private isDirty(): boolean {
    const networkConditions = SDK.NetworkManager.MultitargetNetworkManager.instance().networkConditions();
    const knownCurrentConditions = this.#getCurrentNetworkConditions();
    return !SDK.NetworkManager.networkConditionsEqual(networkConditions, knownCurrentConditions);
  }
}

export interface HardwareConcurrencyViewInput {
  initialized: boolean;
  overrideEnabled: boolean;
  value: number;
  defaultValue: number;
  onToggle: (enabled: boolean) => void;
  onInput: (value: number) => void;
  onReset: () => void;
}

export type HardwareConcurrencyView = (input: HardwareConcurrencyViewInput, output: undefined, target: HTMLElement) =>
    void;

export const DEFAULT_HARDWARE_CONCURRENCY_VIEW: HardwareConcurrencyView = (input, _output, target) => {
  const showReset = input.overrideEnabled && input.value !== input.defaultValue;
  const showWarning = input.overrideEnabled && input.value > input.defaultValue;
  const onInput = (event: Event): void => {
    const value = (event.target as HTMLInputElement).value;
    // Keep the field empty while the user clears it to type a new value.
    if (value !== '') {
      input.onInput(Number(value));
    }
  };
  // clang-format off
  render(html`
    <style>${hardwareConcurrencySelectorStyles}</style>
    <devtools-checkbox
        title=${i18nString(UIStrings.hardwareConcurrency)}
        .checked=${input.overrideEnabled}
        ?disabled=${!input.initialized}
        .jslogContext=${'hardware-concurrency'}
        @change=${(e: Event) => input.onToggle((e.target as UI.UIUtils.CheckboxLabel).checked)}>
      ${i18nString(UIStrings.hardwareConcurrency)}
      <div class="devtools-checkbox-subtitle">${i18nString(UIStrings.hardwareConcurrencySettingLabel)}</div>
    </devtools-checkbox>
    <div class="concurrency-details">
      <input
          class="harmony-input"
          type="number"
          min="1"
          spellcheck="false"
          .value=${Directives.live(input.initialized ? String(input.value) : '')}
          ?disabled=${!input.overrideEnabled}
          title=${i18nString(UIStrings.hardwareConcurrencySettingLabel)}
          aria-label=${i18nString(UIStrings.hardwareConcurrencySettingLabel)}
          jslog=${VisualLogging.textField('hardware-concurrency').track({keydown: 'Enter', change: true})}
          @input=${onInput} />
      <devtools-button
          class=${Directives.classMap({'concurrency-hidden': !showReset})}
          .iconName=${'undo'}
          .variant=${Buttons.Button.Variant.ICON}
          .title=${i18nString(UIStrings.resetConcurrency)}
          .accessibleLabel=${i18nString(UIStrings.resetConcurrency)}
          .jslogContext=${'hardware-concurrency-reset'}
          @click=${input.onReset}>
      </devtools-button>
      <devtools-icon
          name="warning-filled"
          class=${Directives.classMap({
            small: true,
            'concurrency-hidden': !showWarning,
          })}
          title=${i18nString(UIStrings.excessConcurrency)}
          aria-label=${i18nString(UIStrings.excessConcurrency)}>
      </devtools-icon>
    </div>
  `, target, {container: {classes: ['concurrency-section']}});
  // clang-format on
};

/** Hardware Concurrency doesn't store state in a setting. */
export class HardwareConcurrencySelector extends UI.Widget.Widget {
  readonly #view: HardwareConcurrencyView;
  readonly #cpuThrottlingManager = SDK.CPUThrottlingManager.CPUThrottlingManager.instance();
  #defaultValue?: number;
  #loadingDefaultValue = false;
  #value = 0;
  #overrideEnabled = false;

  constructor(element?: HTMLElement, view: HardwareConcurrencyView = DEFAULT_HARDWARE_CONCURRENCY_VIEW) {
    super(element);
    this.#view = view;
  }

  override wasShown(): void {
    super.wasShown();
    if (this.#defaultValue === undefined && !this.#loadingDefaultValue) {
      void this.#loadDefaultValue();
    }
    this.requestUpdate();
  }

  async #loadDefaultValue(): Promise<void> {
    this.#loadingDefaultValue = true;
    try {
      const defaultValue = await this.#cpuThrottlingManager.getHardwareConcurrency();
      this.#defaultValue = defaultValue;
      this.#value = defaultValue;
      this.requestUpdate();
    } catch {
      // Reading the default value fails if, for example, the page navigates
      // meanwhile. Keep the controls disabled and retry when shown again.
    } finally {
      this.#loadingDefaultValue = false;
    }
  }

  #applyConcurrency(value: number): void {
    if (value >= 1) {
      this.#cpuThrottlingManager.setHardwareConcurrency(value);
    }
  }

  #onToggle(enabled: boolean): void {
    if (this.#defaultValue === undefined) {
      return;
    }
    this.#overrideEnabled = enabled;
    this.#applyConcurrency(enabled ? this.#value : this.#defaultValue);
    this.requestUpdate();
  }

  #onInput(value: number): void {
    if (this.#defaultValue === undefined) {
      return;
    }
    this.#value = value;
    if (this.#overrideEnabled) {
      this.#applyConcurrency(value);
    }
    this.requestUpdate();
  }

  #onReset(): void {
    if (this.#defaultValue === undefined) {
      return;
    }
    this.#value = this.#defaultValue;
    if (this.#overrideEnabled) {
      this.#applyConcurrency(this.#defaultValue);
    }
    this.requestUpdate();
  }

  override performUpdate(): void {
    this.#view({
      initialized: this.#defaultValue !== undefined,
      overrideEnabled: this.#overrideEnabled,
      value: this.#value,
      defaultValue: this.#defaultValue ?? 0,
      onToggle: this.#onToggle.bind(this),
      onInput: this.#onInput.bind(this),
      onReset: this.#onReset.bind(this),
    },
               undefined, this.contentElement);
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
    <option value=${SDK.EmulationModel.DataSaverOverride.UNSET} .selected=${input.selectedOption === SDK.EmulationModel.DataSaverOverride.UNSET}>${i18nString(UIStrings.noSaveDataOverride)}</option>
    <option value=${SDK.EmulationModel.DataSaverOverride.ENABLED} .selected=${input.selectedOption === SDK.EmulationModel.DataSaverOverride.ENABLED}>${i18nString(UIStrings.saveDataOn)}</option>
    <option value=${SDK.EmulationModel.DataSaverOverride.DISABLED} .selected=${input.selectedOption === SDK.EmulationModel.DataSaverOverride.DISABLED}>${i18nString(UIStrings.saveDataOff)}</option>
  `, target, {
    container: {
      attributes: {
        title: i18nString(UIStrings.saveDataSettingTooltip),
        'aria-label': i18nString(UIStrings.saveDataSettingTooltip),
      },
      listeners: {
        change: (e: Event) => {
          input.onSelect((e.target as HTMLSelectElement).value as SDK.EmulationModel.DataSaverOverride);
        },
      },
    },
  });
  // clang-format on
};

export class SaveDataOverrideSelect extends UI.Widget.Widget<HTMLSelectElement> {
  readonly #setting: Common.Settings.Setting<SDK.EmulationModel.DataSaverOverride>;
  readonly #view: SaveDataOverrideViewFunction;

  constructor(element: HTMLElement, view: SaveDataOverrideViewFunction = DEFAULT_SAVE_DATA_VIEW) {
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
