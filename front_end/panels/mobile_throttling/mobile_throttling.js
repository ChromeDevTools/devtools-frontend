var __defProp = Object.defineProperty;
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};

// ../../front_end/panels/mobile_throttling/CPUThrottlingSelector.ts
var CPUThrottlingSelector_exports = {};
__export(CPUThrottlingSelector_exports, {
  CPUThrottlingSelector: () => CPUThrottlingSelector,
  DEFAULT_VIEW: () => DEFAULT_VIEW
});
import * as Common2 from "../../core/common/common.js";
import * as i18n5 from "../../core/i18n/i18n.js";
import * as SDK3 from "../../core/sdk/sdk.js";
import * as CrUXManager from "../../models/crux-manager/crux-manager.js";
import * as UI2 from "../../ui/legacy/legacy.js";
import * as Lit from "../../ui/lit/lit.js";
import * as VisualLogging2 from "../../ui/visual_logging/visual_logging.js";
import * as PanelsCommon3 from "../common/common.js";

// ../../front_end/panels/mobile_throttling/ThrottlingManager.ts
var ThrottlingManager_exports = {};
__export(ThrottlingManager_exports, {
  ActionDelegate: () => ActionDelegate,
  CPUPerformanceTier: () => CPUPerformanceTier,
  DEFAULT_SAVE_DATA_VIEW: () => DEFAULT_SAVE_DATA_VIEW,
  SaveDataOverrideSelect: () => SaveDataOverrideSelect,
  ThrottlingManager: () => ThrottlingManager,
  throttlingManager: () => throttlingManager
});
import * as Common from "../../core/common/common.js";
import * as Host from "../../core/host/host.js";
import * as i18n3 from "../../core/i18n/i18n.js";
import * as SDK2 from "../../core/sdk/sdk.js";
import { Icon } from "../../ui/kit/kit.js";
import * as UI from "../../ui/legacy/legacy.js";
import { html, render } from "../../ui/lit/lit.js";
import * as VisualLogging from "../../ui/visual_logging/visual_logging.js";
import * as PanelsCommon2 from "../common/common.js";

// ../../front_end/panels/mobile_throttling/ThrottlingPresets.ts
var ThrottlingPresets_exports = {};
__export(ThrottlingPresets_exports, {
  ThrottlingPresets: () => ThrottlingPresets
});
import * as i18n from "../../core/i18n/i18n.js";
import * as SDK from "../../core/sdk/sdk.js";
import * as PanelsCommon from "../common/common.js";
var UIStrings = {
  /**
   * @description Text for no network throttling.
   */
  noThrottling: "No CPU and no network throttling",
  /**
   * @description Text in throttling presets of the Network panel.
   */
  noInternetConnectivity: "No internet connectivity",
  /**
   * @description Text in throttling presets of the Network panel.
   */
  lowTierMobile: "Low-tier mobile",
  /**
   * @description Text in throttling presets of the Network panel.
   */
  slowGXCpuSlowdown: "Slow 3G & 6x CPU slowdown",
  /**
   * @description Text in throttling presets of the Network panel.
   * @example {2.2} PH1
   */
  slowGXCpuSlowdownCalibrated: "Slow 3G & {PH1}x CPU slowdown",
  /**
   * @description Text in throttling presets of the Network panel.
   */
  midtierMobile: "Mid-tier mobile",
  /**
   * @description Text in throttling presets of the Network panel.
   */
  fastGXCpuSlowdown: "Fast 3G & 4x CPU slowdown",
  /**
   * @description Text in throttling presets of the Network panel.
   * @example {2.2} PH1
   */
  fastGXCpuSlowdownCalibrated: "Fast 3G & {PH1}x CPU slowdown",
  /**
   * @description Text in network throttling selector of the Network panel.
   */
  custom: "Custom",
  /**
   * @description Text in throttling presets of the Network panel.
   */
  checkNetworkAndPerformancePanels: "Check Network and Performance panels"
};
var str_ = i18n.i18n.registerUIStrings("panels/mobile_throttling/ThrottlingPresets.ts", UIStrings);
var i18nString = i18n.i18n.getLocalizedString.bind(void 0, str_);
var ThrottlingPresets = class _ThrottlingPresets {
  static getNoThrottlingConditions() {
    const title = typeof SDK.NetworkManager.NoThrottlingConditions.title === "function" ? SDK.NetworkManager.NoThrottlingConditions.title() : SDK.NetworkManager.NoThrottlingConditions.title;
    return {
      title,
      description: i18nString(UIStrings.noThrottling),
      network: SDK.NetworkManager.NoThrottlingConditions,
      cpuThrottlingOption: PanelsCommon.CPUThrottlingOption.NoThrottlingOption,
      jslogContext: "no-throttling"
    };
  }
  static getOfflineConditions() {
    const title = typeof SDK.NetworkManager.OfflineConditions.title === "function" ? SDK.NetworkManager.OfflineConditions.title() : SDK.NetworkManager.OfflineConditions.title;
    return {
      title,
      description: i18nString(UIStrings.noInternetConnectivity),
      network: SDK.NetworkManager.OfflineConditions,
      cpuThrottlingOption: PanelsCommon.CPUThrottlingOption.NoThrottlingOption,
      jslogContext: "offline"
    };
  }
  static getLowEndMobileConditions() {
    const useCalibrated = PanelsCommon.CPUThrottlingOption.CalibratedLowTierMobileThrottlingOption.rate() !== 0;
    const cpuThrottlingOption = useCalibrated ? PanelsCommon.CPUThrottlingOption.CalibratedLowTierMobileThrottlingOption : PanelsCommon.CPUThrottlingOption.LowTierThrottlingOption;
    const description = useCalibrated ? i18nString(UIStrings.slowGXCpuSlowdownCalibrated, { PH1: cpuThrottlingOption.rate() }) : i18nString(UIStrings.slowGXCpuSlowdown);
    return {
      title: i18nString(UIStrings.lowTierMobile),
      description,
      network: SDK.NetworkManager.Slow3GConditions,
      cpuThrottlingOption,
      jslogContext: "low-end-mobile"
    };
  }
  static getMidTierMobileConditions() {
    const useCalibrated = PanelsCommon.CPUThrottlingOption.CalibratedMidTierMobileThrottlingOption.rate() !== 0;
    const cpuThrottlingOption = useCalibrated ? PanelsCommon.CPUThrottlingOption.CalibratedMidTierMobileThrottlingOption : PanelsCommon.CPUThrottlingOption.MidTierThrottlingOption;
    const description = useCalibrated ? i18nString(UIStrings.fastGXCpuSlowdownCalibrated, { PH1: cpuThrottlingOption.rate() }) : i18nString(UIStrings.fastGXCpuSlowdown);
    return {
      title: i18nString(UIStrings.midtierMobile),
      description,
      network: SDK.NetworkManager.Slow4GConditions,
      cpuThrottlingOption,
      jslogContext: "mid-tier-mobile"
    };
  }
  static getCustomConditions() {
    return {
      title: i18nString(UIStrings.custom),
      description: i18nString(UIStrings.checkNetworkAndPerformancePanels),
      jslogContext: "custom"
    };
  }
  static getMobilePresets() {
    return [
      _ThrottlingPresets.getMidTierMobileConditions(),
      _ThrottlingPresets.getLowEndMobileConditions(),
      _ThrottlingPresets.getCustomConditions()
    ];
  }
  static getAdvancedMobilePresets() {
    return [
      _ThrottlingPresets.getOfflineConditions()
    ];
  }
  static networkPresets = [
    SDK.NetworkManager.Fast4GConditions,
    SDK.NetworkManager.Slow4GConditions,
    SDK.NetworkManager.Slow3GConditions,
    SDK.NetworkManager.OfflineConditions
  ];
  static cpuThrottlingPresets = PanelsCommon.CPUThrottlingOption.cpuThrottlingPresets;
};
globalThis.MobileThrottling = globalThis.MobileThrottling || {};
globalThis.MobileThrottling.networkPresets = ThrottlingPresets.networkPresets;

// ../../front_end/panels/mobile_throttling/ThrottlingManager.ts
var CPUPerformanceTier = SDK2.CPUThrottlingManager.CPUPerformanceTier;
var UIStrings2 = {
  /**
   * @description Text to indicate the network connectivity is offline.
   */
  offline: "Offline",
  /**
   * @description Text in throttling manager of the Network panel.
   */
  forceDisconnectedFromNetwork: "Force disconnected from network",
  /**
   * @description Icon title in throttling manager of the Network panel.
   */
  cpuThrottlingIsEnabled: "CPU throttling is enabled",
  /**
   * @description Screen reader label for a select box that chooses the CPU throttling speed in the Performance panel.
   */
  cpuThrottling: "CPU throttling",
  /**
   * @description Tooltip text in throttling manager of the Performance panel.
   */
  excessConcurrency: "Exceeding the default value may degrade system performance",
  /**
   * @description Tooltip text in throttling manager of the Performance panel.
   */
  resetConcurrency: "Reset to the default value",
  /**
   * @description Label for a checkbox that enables overriding navigator.hardwareConcurrency.
   */
  hardwareConcurrency: "Hardware concurrency",
  /**
   * @description Tooltip text for an input box that overrides navigator.hardwareConcurrency on the page.
   */
  hardwareConcurrencySettingLabel: "Override the value reported by `navigator.hardwareConcurrency`",
  /**
   * @description Text label for a selection box showing that a specific option is recommended for CPU or network throttling.
   * @example {Fast 4G} PH1
   * @example {4x slowdown} PH1
   */
  recommendedThrottling: "{PH1} \u2013 recommended",
  /**
   * @description Text to prompt the user to run the CPU calibration process.
   */
  calibrate: "Calibrate\u2026",
  /**
   * @description Text to prompt the user to re-run the CPU calibration process.
   */
  recalibrate: "Recalibrate\u2026",
  /**
   * @description Text to indicate Save-Data override is not set.
   */
  noSaveDataOverride: "'Save-Data': default",
  /**
   * @description Text to indicate Save-Data override is set to Enabled.
   */
  saveDataOn: "'Save-Data': on",
  /**
   * @description Text to indicate Save-Data override is set to Disabled.
   */
  saveDataOff: "'Save-Data': off",
  /**
   * @description Tooltip text for a select element that overrides navigator.connection.saveData on the page.
   */
  saveDataSettingTooltip: "Override the value reported by `navigator.connection.saveData` on the page"
};
var str_2 = i18n3.i18n.registerUIStrings("panels/mobile_throttling/ThrottlingManager.ts", UIStrings2);
var i18nString2 = i18n3.i18n.getLocalizedString.bind(void 0, str_2);
var throttlingManagerInstance;
var ThrottlingManager = class _ThrottlingManager extends Common.ObjectWrapper.ObjectWrapper {
  cpuThrottlingControls;
  cpuThrottlingOptions;
  customNetworkConditionsSetting;
  currentNetworkThrottlingConditionKeySetting;
  calibratedCpuThrottlingSetting;
  lastNetworkThrottlingConditions;
  cpuThrottlingManager;
  #hardwareConcurrencyOverrideEnabled = false;
  #currentCPUThrottlingOption = PanelsCommon2.CPUThrottlingOption.NoThrottlingOption;
  get hardwareConcurrencyOverrideEnabled() {
    return this.#hardwareConcurrencyOverrideEnabled;
  }
  constructor(settings) {
    super();
    this.cpuThrottlingManager = SDK2.CPUThrottlingManager.CPUThrottlingManager.instance();
    this.cpuThrottlingManager.addEventListener(
      SDK2.CPUThrottlingManager.Events.RATE_CHANGED,
      (event) => this.onCPUThrottlingRateChangedOnSDK(event.data)
    );
    this.cpuThrottlingControls = /* @__PURE__ */ new Set();
    this.cpuThrottlingOptions = ThrottlingPresets.cpuThrottlingPresets;
    this.customNetworkConditionsSetting = SDK2.NetworkManager.customUserNetworkConditionsSetting(settings);
    this.currentNetworkThrottlingConditionKeySetting = SDK2.NetworkManager.activeNetworkThrottlingKeySetting(settings);
    this.calibratedCpuThrottlingSetting = settings.createSetting(
      "calibrated-cpu-throttling",
      {},
      Common.Settings.SettingStorageType.GLOBAL
    );
    this.calibratedCpuThrottlingSetting.addChangeListener(this.onCalibratedSettingChanged, this);
    SDK2.NetworkManager.MultitargetNetworkManager.instance().addEventListener(
      SDK2.NetworkManager.MultitargetNetworkManager.Events.CONDITIONS_CHANGED,
      () => {
        this.lastNetworkThrottlingConditions = this.#getCurrentNetworkConditions();
        const conditions = SDK2.NetworkManager.MultitargetNetworkManager.instance().networkConditions();
        this.currentNetworkThrottlingConditionKeySetting.set(conditions.key);
      }
    );
    if (this.isDirty()) {
      SDK2.NetworkManager.MultitargetNetworkManager.instance().setNetworkConditions(this.#getCurrentNetworkConditions());
    }
  }
  #getCurrentNetworkConditions() {
    const activeKey = this.currentNetworkThrottlingConditionKeySetting.get();
    const definition = SDK2.NetworkManager.getPredefinedCondition(activeKey);
    if (definition) {
      return definition;
    }
    const custom = this.customNetworkConditionsSetting.get().find((conditions) => conditions.key === activeKey);
    return custom ?? SDK2.NetworkManager.NoThrottlingConditions;
  }
  static instance(opts = { forceNew: null }) {
    const { forceNew, settings } = opts;
    if (!throttlingManagerInstance || forceNew) {
      throttlingManagerInstance = new _ThrottlingManager(settings ?? Common.Settings.Settings.instance());
    }
    return throttlingManagerInstance;
  }
  createOfflineToolbarCheckbox() {
    const checkbox = new UI.Toolbar.ToolbarCheckbox(
      i18nString2(UIStrings2.offline),
      i18nString2(UIStrings2.forceDisconnectedFromNetwork),
      forceOffline.bind(this)
    );
    checkbox.element.setAttribute("jslog", `${VisualLogging.toggle("disconnect-from-network").track({ click: true })}`);
    SDK2.NetworkManager.MultitargetNetworkManager.instance().addEventListener(
      SDK2.NetworkManager.MultitargetNetworkManager.Events.CONDITIONS_CHANGED,
      networkConditionsChanged
    );
    checkbox.setChecked(SDK2.NetworkManager.MultitargetNetworkManager.instance().isOffline());
    function forceOffline() {
      if (checkbox.checked()) {
        SDK2.NetworkManager.MultitargetNetworkManager.instance().setNetworkConditions(
          SDK2.NetworkManager.OfflineConditions
        );
      } else {
        const newConditions = !this.lastNetworkThrottlingConditions.download && !this.lastNetworkThrottlingConditions.upload ? SDK2.NetworkManager.NoThrottlingConditions : this.lastNetworkThrottlingConditions;
        SDK2.NetworkManager.MultitargetNetworkManager.instance().setNetworkConditions(newConditions);
      }
    }
    function networkConditionsChanged() {
      checkbox.setChecked(SDK2.NetworkManager.MultitargetNetworkManager.instance().isOffline());
    }
    return checkbox;
  }
  updatePanelIcon() {
    const warnings = [];
    if (this.cpuThrottlingManager.cpuThrottlingRate() !== PanelsCommon2.CPUThrottlingOption.CPUThrottlingRates.NO_THROTTLING) {
      warnings.push(i18nString2(UIStrings2.cpuThrottlingIsEnabled));
    }
    UI.InspectorView.InspectorView.instance().setPanelWarnings("timeline", warnings);
  }
  cpuThrottlingOption() {
    return this.#currentCPUThrottlingOption;
  }
  setCPUThrottlingOption(option) {
    if (this.#currentCPUThrottlingOption === option) {
      return;
    }
    this.#currentCPUThrottlingOption = option;
    this.cpuThrottlingManager.setCPUThrottlingRate(option.rate());
  }
  onCalibratedSettingChanged() {
    if (!this.#currentCPUThrottlingOption.calibratedDeviceType) {
      return;
    }
    const rate = this.#currentCPUThrottlingOption.rate();
    if (rate === 0) {
      this.setCPUThrottlingOption(PanelsCommon2.CPUThrottlingOption.NoThrottlingOption);
      return;
    }
    this.cpuThrottlingManager.setCPUThrottlingRate(rate);
  }
  onCPUThrottlingRateChangedOnSDK(rate) {
    if (rate !== PanelsCommon2.CPUThrottlingOption.CPUThrottlingRates.NO_THROTTLING) {
      Host.userMetrics.actionTaken(Host.UserMetrics.Action.CpuThrottlingEnabled);
    }
    const option = PanelsCommon2.CPUThrottlingOption.determineOptionFromRate(rate, this.#currentCPUThrottlingOption);
    this.#currentCPUThrottlingOption = option;
    const index = this.cpuThrottlingOptions.indexOf(option);
    for (const control of this.cpuThrottlingControls) {
      control.setSelectedIndex(index);
    }
    this.updatePanelIcon();
  }
  createCPUThrottlingSelector() {
    const getCalibrationString = () => {
      const value = this.calibratedCpuThrottlingSetting.get();
      const hasCalibrated = value.low || value.mid;
      return hasCalibrated ? i18nString2(UIStrings2.recalibrate) : i18nString2(UIStrings2.calibrate);
    };
    const optionSelected = () => {
      if (control.selectedIndex() === control.options().length - 1) {
        const index = this.cpuThrottlingOptions.indexOf(this.#currentCPUThrottlingOption);
        control.setSelectedIndex(index);
        void Common.Revealer.reveal(this.calibratedCpuThrottlingSetting);
      } else {
        this.setCPUThrottlingOption(this.cpuThrottlingOptions[control.selectedIndex()]);
      }
    };
    const control = new UI.Toolbar.ToolbarComboBox(optionSelected, i18nString2(UIStrings2.cpuThrottling), "", "cpu-throttling");
    this.cpuThrottlingControls.add(control);
    const currentOption = this.#currentCPUThrottlingOption;
    const optionEls = [];
    const options = this.cpuThrottlingOptions;
    for (let i = 0; i < this.cpuThrottlingOptions.length; ++i) {
      const option = this.cpuThrottlingOptions[i];
      const title = option.title();
      const value = option.jslogContext;
      const optionEl2 = control.createOption(title, value);
      control.addOption(optionEl2);
      if (currentOption === option) {
        control.setSelectedIndex(i);
      }
      optionEls.push(optionEl2);
    }
    const optionEl = control.createOption(getCalibrationString(), "");
    control.addOption(optionEl);
    optionEls.push(optionEl);
    return {
      control,
      updateRecommendedOption(recommendedOption) {
        for (let i = 0; i < optionEls.length - 1; i++) {
          const option = options[i];
          optionEls[i].text = option === recommendedOption ? i18nString2(UIStrings2.recommendedThrottling, { PH1: option.title() }) : option.title();
          optionEls[i].disabled = option.rate() === 0;
        }
        optionEls[optionEls.length - 1].textContent = getCalibrationString();
      }
    };
  }
  createSaveDataOverrideSelector(className) {
    const select = document.createElement("select");
    select.title = i18nString2(UIStrings2.saveDataSettingTooltip);
    UI.ARIAUtils.setLabel(select, i18nString2(UIStrings2.saveDataSettingTooltip));
    if (className) {
      select.className = className;
    }
    UI.Widget.registerWidgetConfig(select, UI.Widget.widgetConfig(SaveDataOverrideSelect));
    return select;
  }
  /** Hardware Concurrency doesn't store state in a setting. */
  createHardwareConcurrencySelector() {
    const numericInput = new UI.Toolbar.ToolbarItem(UI.UIUtils.createInput("devtools-text-input", "number", "hardware-concurrency"));
    numericInput.setTitle(i18nString2(UIStrings2.hardwareConcurrencySettingLabel));
    const inputElement = numericInput.element;
    inputElement.min = "1";
    numericInput.setEnabled(false);
    const checkbox = UI.UIUtils.CheckboxLabel.create(
      i18nString2(UIStrings2.hardwareConcurrency),
      false,
      i18nString2(UIStrings2.hardwareConcurrencySettingLabel),
      "hardware-concurrency"
    );
    const reset = new UI.Toolbar.ToolbarButton("Reset concurrency", "undo", void 0, "hardware-concurrency-reset");
    reset.setTitle(i18nString2(UIStrings2.resetConcurrency));
    const icon = new Icon();
    icon.name = "warning-filled";
    icon.classList.add("small");
    const warning = new UI.Toolbar.ToolbarItem(icon);
    warning.setTitle(i18nString2(UIStrings2.excessConcurrency));
    checkbox.disabled = true;
    reset.element.classList.add("concurrency-hidden");
    warning.element.classList.add("concurrency-hidden");
    void this.cpuThrottlingManager.getHardwareConcurrency().then((defaultValue) => {
      if (defaultValue === void 0) {
        return;
      }
      const setHardwareConcurrency = (value) => {
        if (value >= 1) {
          this.cpuThrottlingManager.setHardwareConcurrency(value);
        }
        if (value > defaultValue) {
          warning.element.classList.remove("concurrency-hidden");
        } else {
          warning.element.classList.add("concurrency-hidden");
        }
        if (value === defaultValue) {
          reset.element.classList.add("concurrency-hidden");
        } else {
          reset.element.classList.remove("concurrency-hidden");
        }
      };
      inputElement.value = `${defaultValue}`;
      inputElement.oninput = () => setHardwareConcurrency(Number(inputElement.value));
      checkbox.disabled = false;
      checkbox.addEventListener("change", () => {
        this.#hardwareConcurrencyOverrideEnabled = checkbox.checked;
        numericInput.setEnabled(this.hardwareConcurrencyOverrideEnabled);
        setHardwareConcurrency(this.hardwareConcurrencyOverrideEnabled ? Number(inputElement.value) : defaultValue);
      });
      reset.addEventListener(UI.Toolbar.ToolbarButton.Events.CLICK, () => {
        inputElement.value = `${defaultValue}`;
        setHardwareConcurrency(defaultValue);
      });
    });
    return { numericInput, reset, warning, checkbox };
  }
  setHardwareConcurrency(concurrency) {
    this.cpuThrottlingManager.setHardwareConcurrency(concurrency);
  }
  effectiveCPUPerformanceTier() {
    return this.cpuThrottlingManager.effectiveCPUPerformanceTier();
  }
  setCPUPerformanceTier(tier) {
    this.cpuThrottlingManager.setCPUPerformanceTier(tier);
  }
  isDirty() {
    const networkConditions = SDK2.NetworkManager.MultitargetNetworkManager.instance().networkConditions();
    const knownCurrentConditions = this.#getCurrentNetworkConditions();
    return !SDK2.NetworkManager.networkConditionsEqual(networkConditions, knownCurrentConditions);
  }
};
var DEFAULT_SAVE_DATA_VIEW = (input, _output, target) => {
  render(html`
    <option value=${SDK2.EmulationModel.DataSaverOverride.UNSET} .selected=${input.selectedOption === SDK2.EmulationModel.DataSaverOverride.UNSET}>${i18nString2(UIStrings2.noSaveDataOverride)}</option>
    <option value=${SDK2.EmulationModel.DataSaverOverride.ENABLED} .selected=${input.selectedOption === SDK2.EmulationModel.DataSaverOverride.ENABLED}>${i18nString2(UIStrings2.saveDataOn)}</option>
    <option value=${SDK2.EmulationModel.DataSaverOverride.DISABLED} .selected=${input.selectedOption === SDK2.EmulationModel.DataSaverOverride.DISABLED}>${i18nString2(UIStrings2.saveDataOff)}</option>
  `, target, { container: { listeners: { change: (e) => input.onSelect(e.target.value) } } });
};
var SaveDataOverrideSelect = class extends UI.Widget.Widget {
  #setting;
  #view;
  constructor(element, view = DEFAULT_SAVE_DATA_VIEW) {
    super(element);
    this.#view = view;
    this.#setting = Common.Settings.Settings.instance().resolve(SDK2.SDKSettings.dataSaverSettingDescriptor);
    this.performUpdate();
  }
  wasShown() {
    super.wasShown();
    this.#setting.addChangeListener(this.requestUpdate, this);
    this.requestUpdate();
  }
  willHide() {
    super.willHide();
    this.#setting.removeChangeListener(this.requestUpdate, this);
  }
  performUpdate() {
    this.#view(
      {
        selectedOption: this.#setting.get(),
        onSelect: (selectedOption) => {
          this.#setting.set(selectedOption);
        }
      },
      void 0,
      this.contentElement
    );
  }
};
var ActionDelegate = class {
  handleAction(_context, actionId) {
    if (actionId === "network-conditions.network-online") {
      SDK2.NetworkManager.MultitargetNetworkManager.instance().setNetworkConditions(
        SDK2.NetworkManager.NoThrottlingConditions
      );
      return true;
    }
    if (actionId === "network-conditions.network-low-end-mobile") {
      SDK2.NetworkManager.MultitargetNetworkManager.instance().setNetworkConditions(SDK2.NetworkManager.Slow3GConditions);
      return true;
    }
    if (actionId === "network-conditions.network-mid-tier-mobile") {
      SDK2.NetworkManager.MultitargetNetworkManager.instance().setNetworkConditions(SDK2.NetworkManager.Slow4GConditions);
      return true;
    }
    if (actionId === "network-conditions.network-offline") {
      SDK2.NetworkManager.MultitargetNetworkManager.instance().setNetworkConditions(
        SDK2.NetworkManager.OfflineConditions
      );
      return true;
    }
    return false;
  }
};
function throttlingManager() {
  return ThrottlingManager.instance();
}

// ../../front_end/panels/mobile_throttling/CPUThrottlingSelector.ts
var { render: render2, html: html2, Directives } = Lit;
var UIStrings3 = {
  /**
   * @description Text label for a selection box showing which CPU throttling option is applied.
   * @example {No throttling} PH1
   */
  cpuThrottling: "CPU throttling: {PH1}",
  /**
   * @description Text label for a selection box showing that a specific option is recommended.
   * @example {4x slowdown} PH1
   */
  recommendedThrottling: "{PH1} \u2013 recommended",
  /**
   * @description Text to prompt the user to run the CPU calibration process.
   */
  calibrate: "Calibrate\u2026",
  /**
   * @description Text to prompt the user to re-run the CPU calibration process.
   */
  recalibrate: "Recalibrate\u2026",
  /**
   * @description CPU preset option with no throttling.
   */
  disabledThrottlingPreset: "Disabled",
  /**
   * @description Default presets category title.
   */
  defaultPresets: "Presets",
  /**
   * @description Label shown above a list of CPU calibration preset options.
   */
  labelCalibratedPresets: "Calibrated presets"
};
var str_3 = i18n5.i18n.registerUIStrings(
  "panels/mobile_throttling/CPUThrottlingSelector.ts",
  UIStrings3
);
var i18nString3 = i18n5.i18n.getLocalizedString.bind(void 0, str_3);
var optionsMap = /* @__PURE__ */ new WeakMap();
var DEFAULT_VIEW = (input, _output, target) => {
  const selectionTitle = input.currentOption.title();
  const hasCalibratedOnce = input.throttling.low || input.throttling.mid;
  const calibrationLabel = hasCalibratedOnce ? i18nString3(UIStrings3.recalibrate) : i18nString3(UIStrings3.calibrate);
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
    } else {
      input.onCalibrateClick();
      event.consume(true);
      element.value = String(
        input.currentOption.calibratedDeviceType ?? input.currentOption.rate()
      );
    }
  }
  render2(
    html2`${input.groups.map((group) => {
      return html2` <optgroup
        label=${group.name}
        title=${group.name}
      >
        ${group.items.map((option) => {
        const title = option === input.recommendedOption ? i18nString3(UIStrings3.recommendedThrottling, {
          PH1: option.title()
        }) : option.title();
        const rate = option.rate();
        return html2`
            <option
              ${Directives.ref(
          (optionEl) => optionEl && optionsMap.set(optionEl, option)
        )}
              .value=${String(option.calibratedDeviceType ?? rate)}
              .selected=${input.currentOption === option}
              ?disabled=${rate === 0}
              title=${title}
              aria-label=${title}
              jslog=${VisualLogging2.item(option.jslogContext).track({
          click: true
        })}
            >
              ${title}
            </option>
          `;
      })}
        ${group.name === i18nString3(UIStrings3.labelCalibratedPresets) ? html2`<option
              .value=${"-1"}
              title=${calibrationLabel}
              aria-label=${calibrationLabel}
              jslog=${VisualLogging2.action(
        "cpu-throttling-selector-calibrate"
      ).track({ click: true })}
            >
              ${calibrationLabel}
            </option>` : Lit.nothing}
      </optgroup>`;
    })}`,
    target,
    {
      container: {
        listeners: { change: onSelect },
        attributes: {
          title: i18nString3(UIStrings3.cpuThrottling, { PH1: selectionTitle }),
          "aria-label": i18nString3(UIStrings3.cpuThrottling, { PH1: selectionTitle }),
          jslog: `${VisualLogging2.dropDown("cpu-throttling").track({ change: true })}`
        }
      }
    }
  );
};
var CPUThrottlingSelector = class _CPUThrottlingSelector extends UI2.Widget.Widget {
  #currentOption;
  #recommendedOption = null;
  #groups = [];
  #calibratedThrottlingSetting;
  #view;
  #cpuThrottlingManager = SDK3.CPUThrottlingManager.CPUThrottlingManager.instance();
  static createForGlobalConditions(element) {
    const selectElement = element.createChild("select");
    const select = new _CPUThrottlingSelector(selectElement);
    select.show(
      element,
      void 0,
      /* suppressOrphanWidgetError= */
      true
    );
    select.performUpdate();
    return select;
  }
  constructor(element, view = DEFAULT_VIEW) {
    super(element);
    this.#currentOption = throttlingManager().cpuThrottlingOption();
    this.#calibratedThrottlingSetting = Common2.Settings.Settings.instance().createSetting(
      "calibrated-cpu-throttling",
      {},
      Common2.Settings.SettingStorageType.GLOBAL
    );
    this.#resetGroups();
    this.#view = view;
    this.performUpdate();
  }
  set recommendedOption(recommendedOption) {
    this.#recommendedOption = recommendedOption;
    this.requestUpdate();
  }
  #updateRecommendation = () => {
    let cpuOption = PanelsCommon3.CPUThrottlingOption.CalibratedMidTierMobileThrottlingOption;
    if (cpuOption.rate() === 0) {
      cpuOption = PanelsCommon3.CPUThrottlingOption.MidTierThrottlingOption;
    }
    this.recommendedOption = cpuOption;
  };
  wasShown() {
    super.wasShown();
    this.#cpuThrottlingManager.addEventListener(
      SDK3.CPUThrottlingManager.Events.RATE_CHANGED,
      this.#onOptionChange,
      this
    );
    this.#calibratedThrottlingSetting.addChangeListener(
      this.#onCalibratedSettingChanged,
      this
    );
    CrUXManager.CrUXManager.instance().addEventListener(
      CrUXManager.Events.FIELD_DATA_CHANGED,
      this.#updateRecommendation
    );
    this.#updateRecommendation();
    this.#onOptionChange();
  }
  willHide() {
    super.willHide();
    this.#calibratedThrottlingSetting.removeChangeListener(
      this.#onCalibratedSettingChanged,
      this
    );
    this.#cpuThrottlingManager.removeEventListener(
      SDK3.CPUThrottlingManager.Events.RATE_CHANGED,
      this.#onOptionChange,
      this
    );
    CrUXManager.CrUXManager.instance().removeEventListener(
      CrUXManager.Events.FIELD_DATA_CHANGED,
      this.#updateRecommendation
    );
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
    void Common2.Revealer.reveal(this.#calibratedThrottlingSetting);
    this.requestUpdate();
  }
  #resetGroups() {
    this.#groups = [
      {
        name: i18nString3(UIStrings3.disabledThrottlingPreset),
        items: ThrottlingPresets.cpuThrottlingPresets.filter(
          (option) => option.rate() === 1 && !option.calibratedDeviceType
        )
      },
      {
        name: i18nString3(UIStrings3.defaultPresets),
        items: ThrottlingPresets.cpuThrottlingPresets.filter(
          (option) => !option.calibratedDeviceType && option.rate() > 1
        )
      },
      {
        name: i18nString3(UIStrings3.labelCalibratedPresets),
        items: ThrottlingPresets.cpuThrottlingPresets.filter(
          (option) => option.calibratedDeviceType
        )
      }
    ];
  }
  performUpdate() {
    const input = {
      recommendedOption: this.#recommendedOption,
      currentOption: this.#currentOption,
      groups: this.#groups,
      throttling: this.#calibratedThrottlingSetting.get(),
      onSelect: this.#onSelect.bind(this),
      onCalibrateClick: this.#onCalibrateClick.bind(this)
    };
    this.#view(input, void 0, this.contentElement);
  }
};

// ../../front_end/panels/mobile_throttling/NetworkPanelIndicator.ts
var NetworkPanelIndicator_exports = {};
__export(NetworkPanelIndicator_exports, {
  NetworkPanelIndicator: () => NetworkPanelIndicator
});
import * as Common3 from "../../core/common/common.js";
import * as i18n7 from "../../core/i18n/i18n.js";
import * as SDK4 from "../../core/sdk/sdk.js";
import * as UI3 from "../../ui/legacy/legacy.js";
var UIStrings4 = {
  /**
   * @description Icon title for warning indicator in the Network panel title.
   */
  networkThrottlingIsEnabled: "Network throttling is enabled",
  /**
   * @description Icon title for warning indicator in the Network panel title.
   */
  requestsMayBeOverridden: "Requests may be overridden locally. See the Sources panel.",
  /**
   * @description Icon title for warning indicator in the Network panel title.
   */
  requestsMayBeBlocked: "Requests may be blocked. See the Request conditions panel."
};
var str_4 = i18n7.i18n.registerUIStrings("panels/mobile_throttling/NetworkPanelIndicator.ts", UIStrings4);
var i18nString4 = i18n7.i18n.getLocalizedString.bind(void 0, str_4);
var NetworkPanelIndicator = class {
  constructor() {
    if (!UI3.InspectorView.InspectorView.instance().hasPanel("network")) {
      return;
    }
    const manager = SDK4.NetworkManager.MultitargetNetworkManager.instance();
    manager.addEventListener(SDK4.NetworkManager.MultitargetNetworkManager.Events.CONDITIONS_CHANGED, updateVisibility);
    manager.addEventListener(
      SDK4.NetworkManager.MultitargetNetworkManager.Events.BLOCKED_PATTERNS_CHANGED,
      updateVisibility
    );
    manager.addEventListener(
      SDK4.NetworkManager.MultitargetNetworkManager.Events.INTERCEPTORS_CHANGED,
      updateVisibility
    );
    Common3.Settings.Settings.instance().resolve(SDK4.SDKSettings.cacheDisabledSettingDescriptor).addChangeListener(updateVisibility, this);
    updateVisibility();
    function updateVisibility() {
      const warnings = [];
      if (manager.isThrottling()) {
        warnings.push(i18nString4(UIStrings4.networkThrottlingIsEnabled));
      }
      if (SDK4.NetworkManager.MultitargetNetworkManager.instance().isIntercepting()) {
        warnings.push(i18nString4(UIStrings4.requestsMayBeOverridden));
      }
      if (manager.isBlocking()) {
        warnings.push(i18nString4(UIStrings4.requestsMayBeBlocked));
      }
      UI3.InspectorView.InspectorView.instance().setPanelWarnings("network", warnings);
    }
  }
};

// ../../front_end/panels/mobile_throttling/NetworkThrottlingSelector.ts
var NetworkThrottlingSelector_exports = {};
__export(NetworkThrottlingSelector_exports, {
  DEFAULT_VIEW: () => DEFAULT_VIEW2,
  Events: () => Events3,
  NetworkThrottlingSelect: () => NetworkThrottlingSelect,
  getRecommendedNetworkConditions: () => getRecommendedNetworkConditions
});
import * as Common4 from "../../core/common/common.js";
import * as i18n9 from "../../core/i18n/i18n.js";
import * as Platform from "../../core/platform/platform.js";
import * as SDK5 from "../../core/sdk/sdk.js";
import * as CrUXManager3 from "../../models/crux-manager/crux-manager.js";
import * as UI4 from "../../ui/legacy/legacy.js";
import * as Lit2 from "../../ui/lit/lit.js";
import * as VisualLogging3 from "../../ui/visual_logging/visual_logging.js";
var { render: render3, html: html3, Directives: Directives2 } = Lit2;
var UIStrings5 = {
  /**
   * @description Text to indicate something is not enabled.
   */
  disabled: "Disabled",
  /**
   * @description Title for a group of configuration options.
   */
  presets: "Presets",
  /**
   * @description Text in network throttling selector of the Network panel.
   */
  custom: "Custom",
  /**
   * @description Title for a network throttling group containing the request blocking option.
   */
  blockingGroup: "Blocking",
  /**
   * @description Text with two placeholders separated by a colon.
   * @example {Node removed} PH1
   * @example {div#id1} PH2
   */
  sS: "{PH1}: {PH2}",
  /**
   * @description Accessibility label for custom add network throttling option.
   * @example {Custom} PH1
   */
  addS: "Add {PH1}",
  /**
   * @description Text in throttling manager of the Network panel.
   */
  add: "Add\u2026",
  /**
   * @description Text label for a selection box showing that a specific option is recommended for CPU or network throttling.
   * @example {Fast 4G} PH1
   * @example {4x slowdown} PH1
   */
  recommendedThrottling: "{PH1} \u2013 recommended"
};
var str_5 = i18n9.i18n.registerUIStrings("panels/mobile_throttling/NetworkThrottlingSelector.ts", UIStrings5);
var i18nString5 = i18n9.i18n.getLocalizedString.bind(void 0, str_5);
var optionsMap2 = /* @__PURE__ */ new WeakMap();
var DEFAULT_VIEW2 = (input, output, target) => {
  const title = (conditions) => typeof conditions.title === "function" ? conditions.title() : conditions.title;
  const jslog = (group, condition) => `${VisualLogging3.item(Platform.StringUtilities.toKebabCase(
    "i18nTitleKey" in condition && condition.i18nTitleKey || title(condition)
  )).track({ click: true })}`;
  let selectedConditions = input.selectedConditions;
  function onSelect(event) {
    const element = event.target;
    if (!element) {
      return;
    }
    const option = element.selectedOptions[0];
    if (!option) {
      return;
    }
    const conditions = optionsMap2.get(option);
    if (conditions) {
      selectedConditions = conditions;
      input.onSelect(conditions);
    } else {
      input.onAddCustomConditions();
      event.consume(true);
      if (selectedConditions) {
        element.value = title(selectedConditions);
      }
    }
  }
  render3(
    // clang-format off
    html3`${input.throttlingGroups.map(
      (group) => html3`<optgroup
            label=${group.title}>
            ${group.items.map((condition) => html3`<option
              ${Directives2.ref((option) => option && optionsMap2.set(option, condition))}
              .selected=${selectedConditions ? SDK5.NetworkManager.networkConditionsEqual(condition, selectedConditions) : group === input.throttlingGroups[0]}
              value=${title(condition)}
              aria-label=${i18nString5(UIStrings5.sS, { PH1: group.title, PH2: title(condition) })}
              jslog=${jslog(group, condition)}>
                ${condition === input.recommendedConditions ? i18nString5(UIStrings5.recommendedThrottling, { PH1: title(condition) }) : title(condition)}
            </option>`)}
        </optgroup>`
    )}
        <optgroup label=${input.customConditionsGroup.title}>
          ${input.customConditionsGroup.items.map((condition) => html3`<option
              ${Directives2.ref((option) => option && optionsMap2.set(option, condition))}
              .selected=${Boolean(selectedConditions && SDK5.NetworkManager.networkConditionsEqual(condition, selectedConditions))}
              value=${title(condition)}
              aria-label=${i18nString5(UIStrings5.sS, { PH1: input.customConditionsGroup.title, PH2: title(condition) })}
              jslog=${VisualLogging3.item("custom-network-throttling-item").track({ click: true })}>
                ${condition === input.recommendedConditions ? i18nString5(UIStrings5.recommendedThrottling, { PH1: title(condition) }) : title(condition)}
          </option>`)}
          <option
            value=${i18nString5(UIStrings5.add)}
            aria-label=${i18nString5(UIStrings5.addS, { PH1: input.customConditionsGroup.title })}
            jslog=${VisualLogging3.action("add").track({ click: true })}>
              ${i18nString5(UIStrings5.add)}
          </option>
        </optgroup>`,
    // clang-format on
    target,
    {
      container: {
        listeners: { change: onSelect },
        attributes: {
          disabled: input.disabled,
          "aria-label": input.title,
          jslog: `${VisualLogging3.dropDown(input.jslogContext).track({ change: true })}`
        }
      }
    }
  );
};
var Events3 = /* @__PURE__ */ ((Events4) => {
  Events4["CONDITIONS_CHANGED"] = "ConditionsChanged";
  return Events4;
})(Events3 || {});
function getRecommendedNetworkConditions(roundTripTimeMetricData) {
  if (roundTripTimeMetricData?.percentiles) {
    const rtt = Number(roundTripTimeMetricData.percentiles.p75);
    return SDK5.NetworkManager.getRecommendedNetworkPreset(rtt);
  }
  return null;
}
var NetworkThrottlingSelectBase = Common4.ObjectWrapper.eventMixin(
  UI4.Widget.Widget
);
var NetworkThrottlingSelect = class _NetworkThrottlingSelect extends NetworkThrottlingSelectBase {
  #settings;
  #customNetworkConditionsSetting;
  #recommendedConditions = null;
  #jslogContext;
  #currentConditions;
  #title;
  #view;
  #variant = _NetworkThrottlingSelect.Variant.GLOBAL_CONDITIONS;
  #disabled = false;
  #boundToGlobalConditions = false;
  #globalConditionsListeners = [];
  static createForGlobalConditions(element, title) {
    const selectElement = element.createChild("select");
    const select = new _NetworkThrottlingSelect(selectElement, { title });
    select.bindToGlobalConditions = true;
    select.show(
      element,
      void 0,
      /* suppressOrphanWidgetError= */
      true
    );
    select.performUpdate();
    return select;
  }
  constructor(element, options = {}, settings = Common4.Settings.Settings.instance(), view = DEFAULT_VIEW2) {
    super(element);
    this.#settings = settings;
    this.#customNetworkConditionsSetting = SDK5.NetworkManager.customUserNetworkConditionsSetting(settings);
    this.#jslogContext = options.jslogContext;
    this.#currentConditions = options.currentConditions;
    this.#title = options.title;
    this.#view = view;
    this.performUpdate();
  }
  wasShown() {
    super.wasShown();
    this.#customNetworkConditionsSetting.addChangeListener(this.requestUpdate, this);
    if (this.#boundToGlobalConditions) {
      this.#addGlobalConditionsListeners();
      this.#onGlobalConditionsChanged();
      this.#updateRecommendation();
    }
    this.requestUpdate();
  }
  willHide() {
    super.willHide();
    this.#customNetworkConditionsSetting.removeChangeListener(this.requestUpdate, this);
    Common4.EventTarget.removeEventListeners(this.#globalConditionsListeners);
  }
  get disabled() {
    return this.#disabled;
  }
  set disabled(disabled) {
    this.#disabled = disabled;
    this.requestUpdate();
  }
  get recommendedConditions() {
    return this.#recommendedConditions;
  }
  set recommendedConditions(recommendedConditions) {
    this.#recommendedConditions = recommendedConditions;
    this.requestUpdate();
  }
  get currentConditions() {
    return this.#currentConditions;
  }
  set currentConditions(currentConditions) {
    this.#currentConditions = currentConditions;
    this.requestUpdate();
  }
  get jslogContext() {
    return this.#jslogContext;
  }
  set jslogContext(jslogContext) {
    this.#jslogContext = jslogContext;
    this.requestUpdate();
  }
  #onConditionsChanged = (event) => {
    const conditions = event.data;
    if (!("block" in conditions)) {
      SDK5.NetworkManager.MultitargetNetworkManager.instance().setNetworkConditions(conditions);
    }
  };
  #onGlobalConditionsChanged = () => {
    this.currentConditions = SDK5.NetworkManager.MultitargetNetworkManager.instance().networkConditions();
  };
  #updateRecommendation = () => {
    const cruxManager = CrUXManager3.CrUXManager.instance();
    const roundTripTimeMetricData = cruxManager.getSelectedFieldMetricData("round_trip_time");
    this.recommendedConditions = getRecommendedNetworkConditions(
      roundTripTimeMetricData
    );
  };
  #addGlobalConditionsListeners() {
    this.#globalConditionsListeners.push(
      SDK5.NetworkManager.MultitargetNetworkManager.instance().addEventListener(
        SDK5.NetworkManager.MultitargetNetworkManager.Events.CONDITIONS_CHANGED,
        this.#onGlobalConditionsChanged
      ),
      // Subscribe to CrUX field data changes to show recommended throttling
      // presets based on real-user RTT data.
      CrUXManager3.CrUXManager.instance().addEventListener(
        CrUXManager3.Events.FIELD_DATA_CHANGED,
        this.#updateRecommendation
      )
    );
  }
  set bindToGlobalConditions(bind) {
    if (bind === this.#boundToGlobalConditions) {
      return;
    }
    this.#boundToGlobalConditions = bind;
    if (bind) {
      this.#jslogContext = SDK5.NetworkManager.activeNetworkThrottlingKeySetting(this.#settings).name;
      ThrottlingManager.instance();
      this.#currentConditions = SDK5.NetworkManager.MultitargetNetworkManager.instance().networkConditions();
      this.addEventListener("ConditionsChanged" /* CONDITIONS_CHANGED */, this.#onConditionsChanged);
      if (this.isShowing()) {
        this.#addGlobalConditionsListeners();
      }
      this.#updateRecommendation();
    } else {
      this.removeEventListener("ConditionsChanged" /* CONDITIONS_CHANGED */, this.#onConditionsChanged);
      Common4.EventTarget.removeEventListeners(this.#globalConditionsListeners);
    }
    this.requestUpdate();
  }
  get variant() {
    return this.#variant;
  }
  set variant(variant) {
    this.#variant = variant;
    this.requestUpdate();
  }
  get title() {
    return this.#title;
  }
  set title(title) {
    this.#title = title;
    this.requestUpdate();
  }
  performUpdate() {
    const customNetworkConditionsSetting = SDK5.NetworkManager.customUserNetworkConditionsSetting(this.#settings);
    const customNetworkConditions = customNetworkConditionsSetting.get();
    const onAddCustomConditions = () => {
      void Common4.Revealer.reveal(customNetworkConditionsSetting);
    };
    const onSelect = (conditions) => {
      this.dispatchEventToListeners("ConditionsChanged" /* CONDITIONS_CHANGED */, conditions);
    };
    const throttlingGroups = [];
    switch (this.#variant) {
      case _NetworkThrottlingSelect.Variant.GLOBAL_CONDITIONS:
        throttlingGroups.push(
          { title: i18nString5(UIStrings5.disabled), items: [SDK5.NetworkManager.NoThrottlingConditions] },
          {
            title: i18nString5(UIStrings5.presets),
            items: [
              SDK5.NetworkManager.Fast4GConditions,
              SDK5.NetworkManager.Slow4GConditions,
              SDK5.NetworkManager.Slow3GConditions,
              SDK5.NetworkManager.OfflineConditions
            ]
          }
        );
        break;
      case _NetworkThrottlingSelect.Variant.INDIVIDUAL_REQUEST_CONDITIONS:
        throttlingGroups.push(
          { title: i18nString5(UIStrings5.blockingGroup), items: [SDK5.NetworkManager.BlockingConditions] },
          {
            title: i18nString5(UIStrings5.presets),
            items: [
              SDK5.NetworkManager.Fast4GConditions,
              SDK5.NetworkManager.Slow4GConditions,
              SDK5.NetworkManager.Slow3GConditions
            ]
          }
        );
        break;
    }
    const customConditionsGroup = { title: i18nString5(UIStrings5.custom), items: customNetworkConditions };
    const viewInput = {
      recommendedConditions: this.#recommendedConditions,
      selectedConditions: this.#currentConditions,
      jslogContext: this.#jslogContext,
      title: this.#title,
      disabled: this.#disabled,
      onSelect,
      onAddCustomConditions,
      throttlingGroups,
      customConditionsGroup
    };
    this.#view(viewInput, void 0, this.contentElement);
  }
};
((NetworkThrottlingSelect2) => {
  let Variant;
  ((Variant2) => {
    Variant2["GLOBAL_CONDITIONS"] = "global-conditions";
    Variant2["INDIVIDUAL_REQUEST_CONDITIONS"] = "individual-request-conditions";
  })(Variant = NetworkThrottlingSelect2.Variant || (NetworkThrottlingSelect2.Variant = {}));
})(NetworkThrottlingSelect || (NetworkThrottlingSelect = {}));

// ../../front_end/panels/mobile_throttling/ThrottlingSettingsTab.ts
var ThrottlingSettingsTab_exports = {};
__export(ThrottlingSettingsTab_exports, {
  CPUThrottlingCard: () => CPUThrottlingCard,
  CPU_THROTTLING_CARD_DEFAULT_VIEW: () => CPU_THROTTLING_CARD_DEFAULT_VIEW,
  DEFAULT_VIEW: () => DEFAULT_VIEW3,
  ThrottlingSettingsTab: () => ThrottlingSettingsTab
});
import "../../ui/components/lists/lists.js";
import "../../ui/kit/kit.js";
import * as Common5 from "../../core/common/common.js";
import * as i18n13 from "../../core/i18n/i18n.js";
import * as Platform2 from "../../core/platform/platform.js";
import * as SDK7 from "../../core/sdk/sdk.js";
import * as Buttons from "../../ui/components/buttons/buttons.js";
import * as UI5 from "../../ui/legacy/legacy.js";
import { Directives as Directives3, html as html4, nothing as nothing2, render as render4 } from "../../ui/lit/lit.js";
import * as VisualLogging4 from "../../ui/visual_logging/visual_logging.js";
import * as PanelsCommon5 from "../common/common.js";

// ../../front_end/panels/mobile_throttling/CalibrationController.ts
import * as i18n11 from "../../core/i18n/i18n.js";
import * as SDK6 from "../../core/sdk/sdk.js";
import * as PanelsCommon4 from "../common/common.js";
var UIStrings6 = {
  /**
   * @description Text to display to user while a calibration process is running.
   */
  runningCalibration: "Running CPU calibration, don\u2019t leave this tab or close DevTools"
};
var str_6 = i18n11.i18n.registerUIStrings("panels/mobile_throttling/CalibrationController.ts", UIStrings6);
var i18nString6 = i18n11.i18n.getLocalizedString.bind(void 0, str_6);
var benchmarkDurationMs = 250;
var midScore = 1e3;
var lowScore = 264;
function truncate(n) {
  return Number(n.toFixed(2));
}
var CalibrationController = class {
  #runtimeModel;
  #emulationModel;
  #originalUrl;
  #result;
  #state = "idle";
  /**
   * The provided `benchmarkDuration` is how long each iteration of the Lighthouse BenchmarkIndex
   * benchmark takes to run. This benchmark will run multiple times throughout the calibration process.
   */
  async start() {
    const primaryPageTarget = SDK6.TargetManager.TargetManager.instance().primaryPageTarget();
    if (!primaryPageTarget) {
      return false;
    }
    const runtimeModel = primaryPageTarget.model(SDK6.RuntimeModel.RuntimeModel);
    const emulationModel = primaryPageTarget.model(SDK6.EmulationModel.EmulationModel);
    if (!runtimeModel || !emulationModel) {
      return false;
    }
    this.#state = "running";
    this.#runtimeModel = runtimeModel;
    this.#emulationModel = emulationModel;
    this.#originalUrl = primaryPageTarget.inspectedURL();
    function setupTestPage(text) {
      const textEl = document.createElement("span");
      textEl.textContent = text;
      document.body.append(textEl);
      document.body.style.cssText = `
        font-family: system-ui, sans-serif;
        height: 100vh;
        margin: 0;
        background-color: antiquewhite;
        font-size: 18px;
        text-align: center;

        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
      `;
      const moonEl = document.createElement("span");
      document.body.append(moonEl);
      moonEl.id = "moon";
      moonEl.textContent = "\u{1F311}";
      moonEl.style.cssText = "font-size: 5em";
    }
    await primaryPageTarget.pageAgent().invoke_navigate({ url: "about:blank" });
    await runtimeModel.agent.invoke_evaluate({
      expression: `
          (${setupTestPage})(${JSON.stringify(i18nString6(UIStrings6.runningCalibration))});

          window.runBenchmark = () => {
            window.runs = window.runs ?? 0;
            moon.textContent = ['\u{1F311}', '\u{1F312}', '\u{1F313}', '\u{1F314}', '\u{1F315}', '\u{1F316}', '\u{1F317}', '\u{1F318}'][window.runs++ % 8];
            return (${computeBenchmarkIndex})(${benchmarkDurationMs});
          }`
    });
    await this.#benchmark();
    return true;
  }
  async #throttle(rate) {
    if (this.#state !== "running") {
      this.#result = void 0;
      throw new Error("Calibration has been canceled");
    }
    await this.#emulationModel.setCPUThrottlingRate(rate);
  }
  async #benchmark() {
    if (this.#state !== "running") {
      this.#result = void 0;
      throw new Error("Calibration has been canceled");
    }
    const { result } = await this.#runtimeModel.agent.invoke_evaluate({
      expression: "runBenchmark()"
    });
    if (!Number.isFinite(result.value)) {
      let err = `unexpected score from benchmark: ${result.value}`;
      if (result.description) {
        err += `
${result.description}`;
      }
      throw new Error(err);
    }
    return result.value;
  }
  async *iterator() {
    const controller = this;
    let isHalfwayDone = false;
    yield { progress: 0 };
    const scoreCache = /* @__PURE__ */ new Map();
    async function run(rate) {
      const cached = scoreCache.get(rate);
      if (cached !== void 0) {
        return cached;
      }
      await controller.#throttle(rate);
      const score = await controller.#benchmark();
      scoreCache.set(rate, score);
      return score;
    }
    async function* find(target, lowerRate, upperRate) {
      const lower = { rate: lowerRate, score: await run(lowerRate) };
      const upper = { rate: upperRate, score: await run(upperRate) };
      let rate = 0;
      let iterations = 0;
      const maxIterations = 8;
      while (iterations++ < maxIterations) {
        rate = truncate((upper.rate + lower.rate) / 2);
        const score = await run(rate);
        if (Math.abs(target - score) < 10) {
          break;
        }
        if (score < target) {
          upper.rate = rate;
          upper.score = score;
        } else {
          lower.rate = rate;
          lower.score = score;
        }
        yield { progress: iterations / maxIterations / 2 + (isHalfwayDone ? 0.5 : 0) };
      }
      return truncate(rate);
    }
    this.#result = {};
    let actualScore = await run(1);
    if (actualScore < midScore) {
      scoreCache.clear();
      actualScore = await run(1);
      if (actualScore < midScore) {
        if (actualScore < lowScore) {
          this.#result = {
            low: PanelsCommon4.CPUThrottlingOption.CalibrationError.DEVICE_TOO_WEAK,
            mid: PanelsCommon4.CPUThrottlingOption.CalibrationError.DEVICE_TOO_WEAK,
            actualScore
          };
          return;
        }
        this.#result = { mid: PanelsCommon4.CPUThrottlingOption.CalibrationError.DEVICE_TOO_WEAK };
        isHalfwayDone = true;
      }
    }
    const initialLowerRate = 1;
    const initialUpperRate = actualScore / lowScore * 1.5;
    const low = yield* find(lowScore, initialLowerRate, initialUpperRate);
    this.#result.low = low;
    if (!this.#result.mid) {
      isHalfwayDone = true;
      yield { progress: 0.5 };
      const midToLowRatio = midScore / lowScore;
      const r = low / midToLowRatio;
      const mid = yield* find(midScore, r - r / 4, r + r / 4);
      this.#result.mid = mid;
    }
    this.#result.actualScore = actualScore;
    yield { progress: 1 };
  }
  abort() {
    if (this.#state === "running") {
      this.#state = "aborting";
    }
  }
  result() {
    return this.#result;
  }
  async end() {
    if (this.#state === "idle") {
      return;
    }
    this.#state = "idle";
    if (this.#originalUrl.startsWith("chrome://")) {
      await this.#runtimeModel.agent.invoke_evaluate({
        expression: "history.back()"
      });
    } else {
      await this.#runtimeModel.agent.invoke_evaluate({
        expression: `window.location.href = ${JSON.stringify(this.#originalUrl)}`
      });
    }
  }
};
function computeBenchmarkIndex(duration = 1e3) {
  const halfTime = duration / 2;
  function benchmarkIndexGC() {
    const start = Date.now();
    let iterations = 0;
    while (Date.now() - start < halfTime) {
      let s = "";
      for (let j = 0; j < 1e4; j++) {
        s += "a";
      }
      if (s.length === 1) {
        throw new Error("will never happen, but prevents compiler optimizations");
      }
      iterations++;
    }
    const durationInSeconds = (Date.now() - start) / 1e3;
    return Math.round(iterations / 10 / durationInSeconds);
  }
  function benchmarkIndexNoGC() {
    const arrA = [];
    const arrB = [];
    for (let i = 0; i < 1e5; i++) {
      arrA[i] = arrB[i] = i;
    }
    const start = Date.now();
    let iterations = 0;
    while (iterations % 10 !== 0 || Date.now() - start < halfTime) {
      const src = iterations % 2 === 0 ? arrA : arrB;
      const tgt = iterations % 2 === 0 ? arrB : arrA;
      for (let j = 0; j < src.length; j++) {
        tgt[j] = src[j];
      }
      iterations++;
    }
    const durationInSeconds = (Date.now() - start) / 1e3;
    return Math.round(iterations / 10 / durationInSeconds);
  }
  return (benchmarkIndexGC() + benchmarkIndexNoGC()) / 2;
}

// gen/front_end/panels/mobile_throttling/throttlingSettingsTab.css.js
var throttlingSettingsTab_css_default = `/*
 * Copyright 2015 The Chromium Authors
 * Use of this source code is governed by a BSD-style license that can be
 * found in the LICENSE file.
 */

.add-conditions-button {
  margin: var(--sys-size-5) 0;
  border: none;
}

.conditions-list {
  flex: auto;

  &:has(.list-item) {
    margin-top: var(--sys-size-3);
  }
}

.settings-container {
  display: flex;
  overflow-x: auto;
}

.settings-container::-webkit-scrollbar {
  -webkit-appearance: none;
  height: var(--sys-size-4);
}

.settings-container::-webkit-scrollbar-thumb {
  border-radius: var(--sys-shape-corner-extra-small);
  background-color: var(--sys-color-primary);
}

.setting {
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  align-items: flex-start;
  gap: var(--sys-size-3);
  padding: var(--sys-size-4);
  flex-shrink: 0;
  width: 74px;
}

.input {
  width: 100%;
}

.conditions-list-item {
  padding: 3px 5px;
  height: 30px;
  display: flex;
  align-items: center;
  position: relative;
  flex: auto 1 1;
}

.conditions-list-text {
  white-space: nowrap;
  text-overflow: ellipsis;
  overflow: hidden;
  flex-basis: var(--sys-size-24);
  user-select: none;
  color: var(--sys-color-on-surface);
  text-align: center;
  position: relative;

  & > input {
    scroll-margin-left: 5px;
  }
}

.conditions-list-text:last-child {
  flex-basis: 100px;
  text-align: left;
}

.conditions-list-title {
  text-align: start;
  display: flex;
  flex-grow: 1;
  align-items: flex-start;
}

.conditions-list-title-text {
  flex: auto;
  text-overflow: ellipsis;
  overflow: hidden;
  white-space: nowrap;
}

.conditions-list-separator {
  flex: 0 0 var(--sys-size-1);
  background-color: var(--sys-color-divider);
  height: 30px;
  margin: 0 var(--sys-size-3);
}

.conditions-list-separator-invisible {
  visibility: hidden;
  height: 100% !important; /* stylelint-disable-line declaration-no-important */
}

.settings-card-container-wrapper {
  scrollbar-gutter: stable;
  padding: var(--sys-size-8) 0;
  overflow: auto;
  position: absolute;
  inset: var(--sys-size-8) 0 0;
}

.settings-card-container {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: var(--sys-size-9);
}

.cpu-preset-section {
  padding: var(--sys-size-7);
  display: flex;
  justify-content: space-between;
}

.cpu-preset-result.not-calibrated {
  font-style: italic;
}

.cpu-preset-calibrate {
  flex-direction: column;
  gap: var(--sys-size-7);
}

.cpu-preset-calibrate .button-container {
  display: flex;
  gap: 10px;
}

.cpu-preset-calibrate .text-container {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.text-with-icon {
  display: flex;
  align-items: center;
  gap: 5px;
}

.conditions-list-header {
  font-weight: bold;
  border-bottom: var(--sys-size-1) solid var(--sys-color-divider);
}

.editor-container {
  display: flex;
  flex-direction: column;
  align-items: stretch;
  flex: none;
  background: var(--sys-color-surface3);
  overflow: hidden;
}

.editor-content {
  flex: auto;
  display: flex;
  flex-direction: column;
  align-items: stretch;
}

.editor-content input {
  margin-right: 10px;
}

.editor-content input.error-input {
  background-color: var(--sys-color-cdt-base-container);
}

.editor-buttons {
  flex: none;
  display: flex;
  flex-direction: row;
  align-items: center;
  justify-content: flex-start;
  padding: 5px;
  gap: var(--sys-size-6);
}

.list-widget-input-validation-error {
  color: var(--sys-color-error);
  margin: 0 5px;
}

.editor-container ~ .add-conditions-button {
  display: none;
}

/*# sourceURL=${import.meta.resolve("./throttlingSettingsTab.css")} */`;

// ../../front_end/panels/mobile_throttling/ThrottlingSettingsTab.ts
var { widget } = UI5.Widget;
var UIStrings7 = {
  /**
   * @description Title for default network throttling profiles card.
   */
  defaultProfiles: "Default profiles",
  /**
   * @description Title for custom network throttling profiles card.
   */
  customProfiles: "Custom profiles",
  /**
   * @description Text of add conditions button in throttling settings tab of the Network panel.
   */
  addCustomProfile: "Add profile",
  /**
   * @description A value in milliseconds.
   * @example {3} PH1
   */
  dms: "{PH1} `ms`",
  /**
   * @description Text in throttling settings tab of the Network panel.
   */
  profileName: "Profile name",
  /**
   * @description Label for a textbox that sets the download speed in the throttling settings tab.
   * Noun, short for 'download speed'.
   */
  download: "Download",
  /**
   * @description Label for a textbox that sets the upload speed in the throttling settings tab.
   * Noun, short for 'upload speed'.
   */
  upload: "Upload",
  /**
   * @description Label for a textbox that sets the latency in the throttling settings tab.
   */
  latency: "Latency",
  /**
   * @description Label for a textbox that sets the packet loss percentage for real-time networks in the throttling settings tab.
   */
  packetLoss: "Packet Loss",
  /**
   * @description Label for a textbox that sets the low-tier mobile device CPU throttling in the throttling settings tab.
   */
  calibratedLowTierMobile: "Low-tier mobile device",
  /**
   * @description Label for a textbox that sets the mid-tier mobile device CPU throttling in the throttling settings tab.
   */
  calibratedMidTierMobile: "Mid-tier mobile device",
  /**
   * @description Label for a textbox that sets the maximum packet queue length for real-time networks in the throttling settings tab.
   */
  packetQueueLength: "Packet Queue Length",
  /**
   * @description Label for a checkbox that allows packet reordering in the throttling settings tab.
   */
  packetReordering: "Packet Reordering",
  /**
   * @description Label for a textbox serving as a unit in the throttling settings tab for the field packet queue length column.
   */
  packet: "packet",
  /**
   * @description Text in throttling settings tab of the Network panel.
   */
  optional: "optional",
  /**
   * @description Error message for profile name input in throttling pane of the Settings panel.
   * @example {49} PH1
   */
  profileNameCharactersLengthMust: "Profile name length must be between 1 and {PH1} characters",
  /**
   * @description Error message for download and upload inputs in throttling pane of the Settings panel.
   * @example {Download} PH1
   * @example {0} PH2
   * @example {10000000} PH3
   */
  sMustBeANumberBetweenSkbsToSkbs: "{PH1} must be a number between {PH2} `kbit/s` to {PH3} `kbit/s` inclusive",
  /**
   * @description Error message for latency input in throttling pane of the Settings panel.
   * @example {0} PH1
   * @example {1000000} PH2
   */
  latencyMustBeAnIntegerBetweenSms: "Latency must be an integer between {PH1} `ms` to {PH2} `ms` inclusive",
  /**
   * @description Error message for packet loss input in throttling pane of the Settings panel.
   * @example {0} PH1
   * @example {100} PH2
   */
  packetLossMustBeAnIntegerBetweenSpct: "Packet Loss must be a number between {PH1} `%` to {PH2} `%` inclusive",
  /**
   * @description Error message for packet queue length input in throttling pane of the Settings panel.
   */
  packetQueueLengthMustBeAnIntegerGreaterOrEqualToZero: "Packet queue length must be greater than or equal to 0",
  /**
   * @description Text in throttling settings tab of the Network panel, indicating the download or
   * upload speed that will be applied in kilobits per second.
   * @example {25} PH1
   */
  dskbits: "{PH1} `kbit/s`",
  /**
   * @description Text in throttling settings tab of the Network panel, indicating the download or
   * upload speed that will be applied in megabits per second.
   * @example {25.4} PH1
   */
  fsmbits: "{PH1} `Mbit/s`",
  /**
   * @description Label for the column packet reordering to indicate it is enabled in the throttling settings tab.
   */
  on: "On",
  /**
   * @description Label for the column packet reordering to indicate it is disabled in the throttling settings tab.
   */
  off: "Off",
  /**
   * @description Text in throttling settings tab of the Settings panel.
   */
  cpuThrottlingPresets: "CPU throttling presets",
  /**
   * @description Button text to prompt the user to run the CPU calibration process.
   */
  calibrate: "Calibrate",
  /**
   * @description Button text to prompt the user to re-run the CPU calibration process.
   */
  recalibrate: "Recalibrate",
  /**
   * @description Button text to prompt the user if they wish to continue with the CPU calibration process.
   */
  continue: "Continue",
  /**
   * @description Button text to allow the user to cancel the CPU calibration process.
   */
  cancel: "Cancel",
  /**
   * @description Button text to save changes when editing a custom profile in the throttling settings tab.
   */
  save: "Save",
  /**
   * @description Button text to add a new custom profile in the throttling settings tab.
   */
  add: "Add",
  /**
   * @description Text to use to indicate that a CPU calibration has not been run yet.
   */
  needsCalibration: "Needs calibration",
  /**
   * @description Text to explain why the user should run the CPU calibration process.
   */
  calibrationCTA: "To use the CPU throttling presets, run the calibration process to determine the ideal throttling rate for your device",
  /**
   * @description Text to explain what CPU throttling presets are.
   */
  cpuCalibrationDescription: "These presets throttle your CPU to approximate the performance of typical low or mid-tier mobile devices",
  /**
   * @description Text to explain how the CPU calibration process will work.
   */
  calibrationConfirmationPrompt: "Calibration will take ~5 seconds, and temporarily navigate away from your current page. Do you wish to continue?",
  /**
   * @description Text to explain an issue that may impact the CPU calibration process.
   */
  calibrationWarningHighCPU: "CPU utilization is too high",
  /**
   * @description Text to explain an issue that may impact the CPU calibration process.
   */
  calibrationWarningRunningOnBattery: "Device is running on battery. Plug in charger for best results.",
  /**
   * @description Text to explain an issue that may impact the CPU calibration process.
   */
  calibrationWarningLowBattery: "Device battery is low (<20%). Results may be impacted by CPU throttling.",
  /**
   * @description Text label for a menu item indicating that a specific slowdown multiplier is applied.
   * @example {2} PH1
   */
  dSlowdown: "{PH1}\xD7 slowdown"
};
var str_7 = i18n13.i18n.registerUIStrings("panels/mobile_throttling/ThrottlingSettingsTab.ts", UIStrings7);
var i18nString7 = i18n13.i18n.getLocalizedString.bind(void 0, str_7);
function createComputePressurePromise() {
  const result = { state: "" };
  if (typeof PressureObserver === "undefined") {
    return Promise.resolve(result);
  }
  return new Promise((resolve) => {
    const observer = new PressureObserver((records) => {
      result.state = records.at(-1).state;
      resolve(result);
    });
    observer.observe("cpu", {
      sampleInterval: 1e3
    });
  });
}
var CPU_THROTTLING_CARD_DEFAULT_VIEW = (input, _output, target) => {
  const renderTextWithIcon = (text, icon) => html4`
    <div class="text-with-icon">
      <devtools-icon name=${icon}></devtools-icon>
      ${text}
    </div>
  `;
  const showCalibrateButton = input.state === "cta" || input.state === "prompting";
  const calibrateButtonText = input.state === "prompting" ? i18nString7(UIStrings7.continue) : input.hasCalibrated ? i18nString7(UIStrings7.recalibrate) : i18nString7(UIStrings7.calibrate);
  const showCancelButton = input.state === "prompting" || input.state === "calibrating";
  const showTextContainer = input.state === "cta" && !input.hasCalibrated || input.state === "prompting";
  const showProgress = input.state === "calibrating";
  render4(
    html4`
        <devtools-card heading=${i18nString7(UIStrings7.cpuThrottlingPresets)}>
          <span>${i18nString7(UIStrings7.cpuCalibrationDescription)}</span>
          <div class="cpu-preset-section">
            ${i18nString7(UIStrings7.calibratedLowTierMobile)}
            <div class=${Directives3.classMap({
      "cpu-preset-result": true,
      "not-calibrated": input.lowNotCalibrated
    })}>
              ${input.lowResultText}
            </div>
          </div>
          <div class="cpu-preset-section">
            ${i18nString7(UIStrings7.calibratedMidTierMobile)}
            <div class=${Directives3.classMap({
      "cpu-preset-result": true,
      "not-calibrated": input.midNotCalibrated
    })}>
              ${input.midResultText}
            </div>
          </div>
          <div class="cpu-preset-section cpu-preset-calibrate">
            <div class="button-container">
              <devtools-button
                class="calibrate-button"
                style=${showCalibrateButton ? "" : "display: none"}
                .variant=${Buttons.Button.Variant.PRIMARY}
                .jslogContext=${"throttling.calibrate"}
                @click=${input.onCalibrateClick}>
                ${calibrateButtonText}
              </devtools-button>
              <devtools-button
                class="cancel-button"
                style=${showCancelButton ? "" : "display: none"}
                .variant=${Buttons.Button.Variant.OUTLINED}
                .jslogContext=${"throttling.calibrate-cancel"}
                @click=${input.onCancelClick}>
                ${i18nString7(UIStrings7.cancel)}
              </devtools-button>
            </div>
            <div
              class="text-container"
              style=${showTextContainer ? "" : "display: none"}>
              ${input.state === "cta" && !input.hasCalibrated ? renderTextWithIcon(i18nString7(UIStrings7.calibrationCTA), "info") : nothing2}
              ${input.state === "prompting" ? html4`
                ${input.warnings.map((warning) => renderTextWithIcon(warning, "warning"))}
                ${renderTextWithIcon(i18nString7(UIStrings7.calibrationConfirmationPrompt), "info")}
              ` : nothing2}
            </div>
            <devtools-progress
              no-stop-button
              style=${showProgress ? "" : "display: none"}
              .worked=${input.progressWorked}
              .totalWork=${1}>
            </devtools-progress>
          </div>
        </devtools-card>
      `,
    target
  );
};
var CPUThrottlingCard = class extends UI5.Widget.Widget {
  #setting;
  computePressurePromise;
  controller;
  state = "cta";
  warnings = [];
  #view;
  #progressWorked = 0;
  constructor(element, view = CPU_THROTTLING_CARD_DEFAULT_VIEW) {
    super(element);
    this.#view = view;
    this.performUpdate();
  }
  wasShown() {
    super.wasShown();
    this.computePressurePromise = createComputePressurePromise();
    this.state = "cta";
    this.performUpdate();
  }
  willHide() {
    super.willHide();
    this.computePressurePromise = void 0;
    if (this.controller) {
      this.controller.abort();
    }
  }
  performUpdate() {
    if (!this.#setting && Common5.Settings.Settings.hasInstance()) {
      this.#setting = Common5.Settings.Settings.instance().createSetting(
        "calibrated-cpu-throttling",
        {},
        Common5.Settings.SettingStorageType.GLOBAL
      );
    }
    if (this.state !== "calibrating") {
      this.controller = void 0;
    }
    const result = this.#setting?.get() ?? {};
    const hasCalibrated = Boolean(result.low || result.mid);
    const resultToString = (result2) => {
      if (result2 === void 0) {
        return i18nString7(UIStrings7.needsCalibration);
      }
      if (typeof result2 === "string") {
        return PanelsCommon5.CPUThrottlingOption.calibrationErrorToString(result2);
      }
      if (typeof result2 !== "number") {
        return `Invalid: ${result2}`;
      }
      return i18nString7(UIStrings7.dSlowdown, { PH1: result2.toFixed(1) });
    };
    this.#view(
      {
        state: this.state,
        hasCalibrated,
        lowResultText: resultToString(result.low),
        lowNotCalibrated: result.low === void 0,
        midResultText: resultToString(result.mid),
        midNotCalibrated: result.mid === void 0,
        warnings: this.warnings,
        progressWorked: this.#progressWorked,
        onCalibrateClick: () => {
          void this.calibrateButtonClicked();
        },
        onCancelClick: () => this.cancelButtonClicked()
      },
      void 0,
      this.element
    );
  }
  async getCalibrationWarnings() {
    const warnings = [];
    if (this.computePressurePromise) {
      const computePressure = await this.computePressurePromise;
      if (computePressure.state === "critical" || computePressure.state === "serious") {
        warnings.push(i18nString7(UIStrings7.calibrationWarningHighCPU));
      }
    }
    const battery = await navigator.getBattery();
    if (!battery.charging) {
      warnings.push(i18nString7(UIStrings7.calibrationWarningRunningOnBattery));
    } else if (battery.level < 0.2) {
      warnings.push(i18nString7(UIStrings7.calibrationWarningLowBattery));
    }
    return warnings;
  }
  async calibrateButtonClicked() {
    if (this.state === "cta") {
      this.warnings = await this.getCalibrationWarnings();
      this.state = "prompting";
      this.requestUpdate();
    } else if (this.state === "prompting") {
      this.state = "calibrating";
      this.requestUpdate();
      void this.runCalibration();
    }
  }
  cancelButtonClicked() {
    if (this.controller) {
      this.controller.abort();
    } else {
      this.state = "cta";
      this.requestUpdate();
    }
  }
  async runCalibration() {
    this.#progressWorked = 0;
    this.requestUpdate();
    this.controller = new CalibrationController();
    try {
      if (!await this.controller.start()) {
        console.error("Calibration failed to start");
        return;
      }
      for await (const result2 of this.controller.iterator()) {
        this.#progressWorked = result2.progress;
        this.requestUpdate();
      }
    } catch (e) {
      console.error(e);
    } finally {
      await this.controller.end();
    }
    const result = this.controller.result();
    if (result && (result.low || result.mid) && this.#setting) {
      this.#setting.set(result);
      this.#progressWorked = 1;
      this.requestUpdate();
      await new Promise((resolve) => setTimeout(resolve, 200));
    }
    this.state = "cta";
    this.requestUpdate();
  }
};
function extractCustomSettingIndex(key) {
  const match = key.match(/USER_CUSTOM_SETTING_(\d+)/);
  if (match?.[1]) {
    return parseInt(match[1], 10);
  }
  return 0;
}
function retrieveOptionsTitle(conditions) {
  return typeof conditions.title === "function" ? conditions.title() : conditions.title;
}
function renderHeaderRow() {
  const profileName = i18nString7(UIStrings7.profileName);
  const columns = [
    i18nString7(UIStrings7.download),
    i18nString7(UIStrings7.upload),
    i18nString7(UIStrings7.latency),
    i18nString7(UIStrings7.packetLoss),
    i18nString7(UIStrings7.packetQueueLength),
    i18nString7(UIStrings7.packetReordering)
  ];
  return html4`
    <div class="conditions-list-item conditions-list-header">
      <div class="conditions-list-text conditions-list-title" title=${profileName}>
        <div class="conditions-list-title-text">${profileName}</div>
      </div>
      ${columns.map((column) => html4`
        <div class="conditions-list-separator"></div>
        <div class="conditions-list-text" title=${column}>${column}</div>
      `)}
    </div>
  `;
}
function renderConditionsItem(conditions) {
  const title = retrieveOptionsTitle(conditions);
  const downloadText = throughputText(conditions.download);
  const uploadText = throughputText(conditions.upload);
  const latencyText = i18nString7(UIStrings7.dms, { PH1: conditions.latency });
  const packetLossText = percentText(conditions.packetLoss ?? 0);
  const packetQueueLengthText = String(conditions.packetQueueLength ?? 0);
  const packetReorderingText = conditions.packetReordering ? i18nString7(UIStrings7.on) : i18nString7(UIStrings7.off);
  return html4`
    <div class="conditions-list-item">
      <div class="conditions-list-text conditions-list-title" title=${title}>
        <div class="conditions-list-title-text">${title}</div>
      </div>
      <div class="conditions-list-separator"></div>
      <div class="conditions-list-text">${downloadText}</div>
      <div class="conditions-list-separator"></div>
      <div class="conditions-list-text">${uploadText}</div>
      <div class="conditions-list-separator"></div>
      <div class="conditions-list-text">${latencyText}</div>
      <div class="conditions-list-separator"></div>
      <div class="conditions-list-text">${packetLossText}</div>
      <div class="conditions-list-separator"></div>
      <div class="conditions-list-text">${packetQueueLengthText}</div>
      <div class="conditions-list-separator"></div>
      <div class="conditions-list-text">${packetReorderingText}</div>
    </div>
  `;
}
function renderEditor(input) {
  const isNew = input.editingIndex === input.customConditions.length;
  const optionalStr = i18nString7(UIStrings7.optional);
  const textFields = [
    {
      name: "title",
      labelText: i18nString7(UIStrings7.profileName),
      placeholder: "",
      isOptional: false
    },
    {
      name: "download",
      labelText: i18nString7(UIStrings7.download),
      placeholder: i18n13.i18n.lockedString("kbit/s"),
      isOptional: true
    },
    {
      name: "upload",
      labelText: i18nString7(UIStrings7.upload),
      placeholder: i18n13.i18n.lockedString("kbit/s"),
      isOptional: true
    },
    {
      name: "latency",
      labelText: i18nString7(UIStrings7.latency),
      placeholder: i18n13.i18n.lockedString("ms"),
      isOptional: true
    },
    {
      name: "packetLoss",
      labelText: i18nString7(UIStrings7.packetLoss),
      placeholder: i18n13.i18n.lockedString("percent"),
      isOptional: true
    },
    {
      name: "packetQueueLength",
      labelText: i18nString7(UIStrings7.packetQueueLength),
      placeholder: i18nString7(UIStrings7.packet),
      isOptional: true
    }
  ];
  const errorMessages = Object.values(input.validationErrors).filter(Boolean);
  const hasErrors = errorMessages.length > 0;
  return html4`
    <div
        class="editor-container"
        jslog=${VisualLogging4.pane("editor").track({ resize: true })}
        @keydown=${(e) => {
    if (Platform2.KeyboardUtilities.isEscKey(e)) {
      e.consume(true);
      input.onCancelEdit();
    }
  }}>
      <div
          class="editor-content"
          @keydown=${(e) => {
    if (e.key === "Enter") {
      e.consume(true);
      input.onCommitEdit();
    }
  }}>
        <div class="settings-container">
          ${textFields.map((field, index) => {
    const isInvalid = input.showValidationErrors && Boolean(input.validationErrors[field.name]);
    return html4`
              <div class="setting">
                <div>${field.labelText}</div>
                <div>
                  <input
                      class=${Directives3.classMap({
      "harmony-input": true,
      input: true,
      "error-input": isInvalid
    })}
                      type="text"
                      ?autofocus=${index === 0}
                      placeholder=${field.placeholder}
                      aria-label=${field.labelText}
                      aria-description=${optionalStr}
                      aria-invalid=${isInvalid ? "true" : "false"}
                      .value=${Directives3.live(input.editingValues[field.name])}
                      jslog=${VisualLogging4.textField().track({ change: true, keydown: "Enter" }).context(field.name)}
                      @input=${(e) => input.onEditorInput(field.name, e.target.value)}>
                  <div style=${field.isOptional ? "" : "visibility: hidden"}>
                    ${optionalStr}
                  </div>
                </div>
              </div>
            `;
  })}
          <div class="setting">
            <div>${i18nString7(UIStrings7.packetReordering)}</div>
            <div>
              <devtools-checkbox
                  class="input"
                  aria-label=${i18nString7(UIStrings7.packetReordering)}
                  aria-description=${optionalStr}
                  .checked=${input.editingValues.packetReordering}
                  .jslogContext=${"packetReordering"}
                  @change=${(e) => input.onEditorInput("packetReordering", e.target.checked)}>
              </devtools-checkbox>
              <div style="visibility: hidden">
                ${optionalStr}
              </div>
            </div>
          </div>
        </div>
      </div>
      <div class="editor-buttons">
        <devtools-button
            .variant=${Buttons.Button.Variant.OUTLINED}
            .jslogContext=${"cancel"}
            jslog=${VisualLogging4.action("cancel").track({ click: true })}
            @click=${input.onCancelEdit}>
          ${i18nString7(UIStrings7.cancel)}
        </devtools-button>
        <devtools-button
            .variant=${Buttons.Button.Variant.PRIMARY}
            .jslogContext=${"commit"}
            .disabled=${hasErrors}
            @click=${input.onCommitEdit}>
          ${isNew ? i18nString7(UIStrings7.add) : i18nString7(UIStrings7.save)}
        </devtools-button>
      </div>
      <div class="list-widget-input-validation-error" role="alert" aria-live="polite">
        ${input.showValidationErrors && hasErrors ? errorMessages.map((msg, i) => html4`${i > 0 ? html4`<br>` : nothing2}${msg}`) : nothing2}
      </div>
    </div>
  `;
}
var DEFAULT_VIEW3 = (input, _output, target) => {
  const editingIndex = input.editingIndex;
  const customBefore = editingIndex !== null ? input.customConditions.slice(0, editingIndex) : input.customConditions;
  const customAfter = editingIndex !== null ? input.customConditions.slice(editingIndex + 1) : [];
  render4(
    html4`
        <div class="settings-card-container-wrapper">
          <div class="settings-card-container throttling-conditions-settings">
            ${widget(CPUThrottlingCard)}
            <devtools-card heading=${i18nString7(UIStrings7.defaultProfiles)}>
              <div>
                ${renderHeaderRow()}
                <devtools-list class="conditions-list">
                  ${input.presets.map((preset) => renderConditionsItem(preset))}
                </devtools-list>
              </div>
            </devtools-card>
            <devtools-card heading=${i18nString7(UIStrings7.customProfiles)}>
              <div>
                ${renderHeaderRow()}
                ${customBefore.length > 0 ? html4`
                  <devtools-list
                      class="conditions-list"
                      editable
                      deletable
                      @edit=${(e) => input.onBeginEdit(e.detail.index)}
                      @delete=${(e) => input.onRemoveCustomProfile(e.detail.index)}>
                    ${customBefore.map((item3) => renderConditionsItem(item3))}
                  </devtools-list>
                ` : nothing2}
                ${editingIndex !== null ? renderEditor(input) : nothing2}
                ${editingIndex !== null && customAfter.length > 0 ? html4`
                  <devtools-list
                      class="conditions-list"
                      editable
                      deletable
                      @edit=${(e) => input.onBeginEdit(editingIndex + 1 + e.detail.index)}
                      @delete=${(e) => input.onRemoveCustomProfile(editingIndex + 1 + e.detail.index)}>
                    ${customAfter.map((item3) => renderConditionsItem(item3))}
                  </devtools-list>
                ` : nothing2}
                <devtools-button
                  class="add-conditions-button"
                  .variant=${Buttons.Button.Variant.OUTLINED}
                  .iconName=${"plus"}
                  .jslogContext=${"network.add-conditions"}
                  @click=${input.onAddCustomProfile}>
                  ${i18nString7(UIStrings7.addCustomProfile)}
                </devtools-button>
              </div>
            </devtools-card>
          </div>
        </div>
      `,
    target,
    { container: { attributes: { jslog: `${VisualLogging4.pane("throttling-conditions")}` } } }
  );
};
var EMPTY_EDITOR_VALUES = {
  title: "",
  download: "",
  upload: "",
  latency: "",
  packetLoss: "",
  packetQueueLength: "",
  packetReordering: false
};
var ThrottlingSettingsTab = class extends UI5.Widget.VBox {
  customUserConditions;
  #view;
  /**
   * We store how many custom conditions the user has defined when we load up
   * DevTools. This is because when the user creates a new one, we need to
   * generate a unique key. We take this value, increment it, and use that as part of the unique key.
   * This means that we are resilient to the user adding & then deleting a
   * profile; we always use this counter which is only ever incremented.
   */
  #customUserConditionsCount;
  #editingIndex = null;
  #editingConditions = null;
  #editingValues = { ...EMPTY_EDITOR_VALUES };
  #showValidationErrors = false;
  constructor(settings, view = DEFAULT_VIEW3) {
    super({
      useShadowDom: true
    });
    this.#view = view;
    this.registerRequiredCSS(throttlingSettingsTab_css_default);
    this.customUserConditions = SDK7.NetworkManager.customUserNetworkConditionsSetting(settings);
    this.customUserConditions.addChangeListener(this.#conditionsUpdated, this);
    const customConditions = this.customUserConditions.get();
    const lastCondition = customConditions.at(-1);
    const key = lastCondition?.key;
    if (key && SDK7.NetworkManager.keyIsCustomUser(key)) {
      const maxIndex = extractCustomSettingIndex(key);
      this.#customUserConditionsCount = maxIndex;
    } else {
      this.#customUserConditionsCount = 0;
    }
    this.performUpdate();
  }
  performUpdate() {
    const customConditions = this.customUserConditions.get();
    const validationErrors = this.#editingIndex !== null ? this.#validateEditorValues(this.#editingValues) : {};
    this.#view(
      {
        presets: ThrottlingPresets.networkPresets,
        customConditions,
        editingIndex: this.#editingIndex,
        editingValues: this.#editingValues,
        validationErrors,
        showValidationErrors: this.#showValidationErrors,
        onAddCustomProfile: () => this.#addButtonClicked(),
        onBeginEdit: this.#beginEdit.bind(this),
        onRemoveCustomProfile: this.#removeCustomProfile.bind(this),
        onEditorInput: this.#onEditorInput.bind(this),
        onCommitEdit: this.#commitEdit.bind(this),
        onCancelEdit: this.#cancelEdit.bind(this)
      },
      void 0,
      this.contentElement
    );
  }
  wasShown() {
    super.wasShown();
    this.#conditionsUpdated();
    this.performUpdate();
  }
  #conditionsUpdated() {
    this.#editingIndex = null;
    this.#editingConditions = null;
    this.#editingValues = { ...EMPTY_EDITOR_VALUES };
    this.#showValidationErrors = false;
    this.requestUpdate();
  }
  #addButtonClicked() {
    this.#customUserConditionsCount++;
    const customConditions = this.customUserConditions.get();
    this.#editingIndex = customConditions.length;
    this.#editingConditions = {
      key: `USER_CUSTOM_SETTING_${this.#customUserConditionsCount}`,
      title: () => "",
      download: -1,
      upload: -1,
      latency: 0,
      packetLoss: 0,
      packetReordering: false
    };
    this.#editingValues = { ...EMPTY_EDITOR_VALUES };
    this.#showValidationErrors = false;
    this.requestUpdate();
  }
  #beginEdit(index) {
    const customConditions = this.customUserConditions.get();
    const conditions = customConditions[index];
    if (!conditions) {
      return;
    }
    this.#editingIndex = index;
    this.#editingConditions = conditions;
    this.#editingValues = {
      title: retrieveOptionsTitle(conditions),
      download: conditions.download <= 0 ? "" : String(conditions.download / (1e3 / 8)),
      upload: conditions.upload <= 0 ? "" : String(conditions.upload / (1e3 / 8)),
      latency: conditions.latency ? String(conditions.latency) : "",
      packetLoss: conditions.packetLoss ? String(conditions.packetLoss) : "",
      packetQueueLength: conditions.packetQueueLength ? String(conditions.packetQueueLength) : "",
      packetReordering: conditions.packetReordering ?? false
    };
    this.#showValidationErrors = false;
    this.requestUpdate();
  }
  #onEditorInput(field, value) {
    this.#editingValues = {
      ...this.#editingValues,
      [field]: value
    };
    this.#showValidationErrors = true;
    this.requestUpdate();
  }
  #cancelEdit() {
    this.#editingIndex = null;
    this.#editingConditions = null;
    this.#editingValues = { ...EMPTY_EDITOR_VALUES };
    this.#showValidationErrors = false;
    this.requestUpdate();
  }
  #commitEdit() {
    if (this.#editingIndex === null || !this.#editingConditions) {
      return;
    }
    const validationErrors = this.#validateEditorValues(this.#editingValues);
    if (Object.keys(validationErrors).length > 0) {
      this.#showValidationErrors = true;
      this.requestUpdate();
      return;
    }
    const conditions = this.#editingConditions;
    conditions.title = this.#editingValues.title.trim();
    const download = this.#editingValues.download.trim();
    conditions.download = download ? parseInt(download, 10) * (1e3 / 8) : -1;
    const upload = this.#editingValues.upload.trim();
    conditions.upload = upload ? parseInt(upload, 10) * (1e3 / 8) : -1;
    const latency = this.#editingValues.latency.trim();
    conditions.latency = latency ? parseInt(latency, 10) : 0;
    const packetLoss = this.#editingValues.packetLoss.trim();
    conditions.packetLoss = packetLoss ? parseFloat(packetLoss) : 0;
    const packetQueueLength = this.#editingValues.packetQueueLength.trim();
    conditions.packetQueueLength = packetQueueLength ? parseFloat(packetQueueLength) : 0;
    conditions.packetReordering = this.#editingValues.packetReordering;
    const list = [...this.customUserConditions.get()];
    if (this.#editingIndex === list.length) {
      list.push(conditions);
    }
    this.#editingIndex = null;
    this.#editingConditions = null;
    this.#editingValues = { ...EMPTY_EDITOR_VALUES };
    this.#showValidationErrors = false;
    this.customUserConditions.set(list);
  }
  #removeCustomProfile(index) {
    const list = [...this.customUserConditions.get()];
    list.splice(index, 1);
    this.customUserConditions.set(list);
  }
  #validateEditorValues(values) {
    const errors = {};
    const maxLength = 49;
    const title = values.title.trim();
    if (title.length === 0 || title.length > maxLength) {
      errors.title = i18nString7(UIStrings7.profileNameCharactersLengthMust, { PH1: maxLength });
    }
    const minThroughput = 0;
    const maxThroughput = 1e7;
    const download = values.download.trim();
    const parsedDownload = Number(download);
    if (Number.isNaN(parsedDownload) || parsedDownload < minThroughput || parsedDownload > maxThroughput) {
      errors.download = i18nString7(
        UIStrings7.sMustBeANumberBetweenSkbsToSkbs,
        { PH1: i18nString7(UIStrings7.download), PH2: minThroughput, PH3: maxThroughput }
      );
    }
    const upload = values.upload.trim();
    const parsedUpload = Number(upload);
    if (Number.isNaN(parsedUpload) || parsedUpload < minThroughput || parsedUpload > maxThroughput) {
      errors.upload = i18nString7(
        UIStrings7.sMustBeANumberBetweenSkbsToSkbs,
        { PH1: i18nString7(UIStrings7.upload), PH2: minThroughput, PH3: maxThroughput }
      );
    }
    const minLatency = 0;
    const maxLatency = 1e6;
    const latency = values.latency.trim();
    const parsedLatency = Number(latency);
    if (!Number.isInteger(parsedLatency) || parsedLatency < minLatency || parsedLatency > maxLatency) {
      errors.latency = i18nString7(UIStrings7.latencyMustBeAnIntegerBetweenSms, { PH1: minLatency, PH2: maxLatency });
    }
    const minPacketLoss = 0;
    const maxPacketLoss = 100;
    const packetLoss = values.packetLoss.trim();
    const parsedPacketLoss = Number(packetLoss);
    if (Number.isNaN(parsedPacketLoss) || parsedPacketLoss < minPacketLoss || parsedPacketLoss > maxPacketLoss) {
      errors.packetLoss = i18nString7(UIStrings7.packetLossMustBeAnIntegerBetweenSpct, { PH1: minPacketLoss, PH2: maxPacketLoss });
    }
    const minPacketQueueLength = 0;
    const packetQueueLength = values.packetQueueLength.trim();
    const parsedPacketQueueLength = Number(packetQueueLength);
    if (Number.isNaN(parsedPacketQueueLength) || parsedPacketQueueLength < minPacketQueueLength) {
      errors.packetQueueLength = i18nString7(UIStrings7.packetQueueLengthMustBeAnIntegerGreaterOrEqualToZero);
    }
    return errors;
  }
};
function throughputText(throughput) {
  if (throughput < 0) {
    return "";
  }
  const throughputInKbps = throughput / (1e3 / 8);
  if (throughputInKbps < 1e3) {
    return i18nString7(UIStrings7.dskbits, { PH1: throughputInKbps });
  }
  if (throughputInKbps < 1e3 * 10) {
    const formattedResult = (throughputInKbps / 1e3).toFixed(1);
    return i18nString7(UIStrings7.fsmbits, { PH1: formattedResult });
  }
  return i18nString7(UIStrings7.fsmbits, { PH1: throughputInKbps / 1e3 | 0 });
}
function percentText(percent) {
  if (percent < 0) {
    return "";
  }
  return String(percent) + "%";
}
export {
  CPUThrottlingSelector_exports as CPUThrottlingSelector,
  NetworkPanelIndicator_exports as NetworkPanelIndicator,
  NetworkThrottlingSelector_exports as NetworkThrottlingSelector,
  ThrottlingManager_exports as ThrottlingManager,
  ThrottlingPresets_exports as ThrottlingPresets,
  ThrottlingSettingsTab_exports as ThrottlingSettingsTab
};
//# sourceMappingURL=mobile_throttling.js.map
