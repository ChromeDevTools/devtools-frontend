var __defProp = Object.defineProperty;
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};

// gen/front_end/panels/mobile_throttling/ThrottlingPresets.js
var ThrottlingPresets_exports = {};
__export(ThrottlingPresets_exports, {
  ThrottlingPresets: () => ThrottlingPresets
});
import * as i18n from "./../../core/i18n/i18n.js";
import * as SDK from "./../../core/sdk/sdk.js";
var UIStrings = {
  /**
   * @description Text for no network throttling
   */
  noThrottling: "No CPU and no network throttling",
  /**
   * @description Text in Throttling Presets of the Network panel
   */
  noInternetConnectivity: "No internet connectivity",
  /**
   * @description Text in Throttling Presets of the Network panel
   */
  lowTierMobile: "Low-tier mobile",
  /**
   * @description Text in Throttling Presets of the Network panel
   */
  slowGXCpuSlowdown: "Slow 3G & 6x CPU slowdown",
  /**
   * @description Text in Throttling Presets of the Network panel
   * @example {2.2} PH1
   */
  slowGXCpuSlowdownCalibrated: "Slow 3G & {PH1}x CPU slowdown",
  /**
   * @description Text in Throttling Presets of the Network panel
   */
  midtierMobile: "Mid-tier mobile",
  /**
   * @description Text in Throttling Presets of the Network panel
   */
  fastGXCpuSlowdown: "Fast 3G & 4x CPU slowdown",
  /**
   * @description Text in Throttling Presets of the Network panel
   * @example {2.2} PH1
   */
  fastGXCpuSlowdownCalibrated: "Fast 3G & {PH1}x CPU slowdown",
  /**
   * @description Text in Network Throttling Selector of the Network panel
   */
  custom: "Custom",
  /**
   * @description Text in Throttling Presets of the Network panel
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
      cpuThrottlingOption: SDK.CPUThrottlingManager.NoThrottlingOption,
      jslogContext: "no-throttling"
    };
  }
  static getOfflineConditions() {
    const title = typeof SDK.NetworkManager.OfflineConditions.title === "function" ? SDK.NetworkManager.OfflineConditions.title() : SDK.NetworkManager.OfflineConditions.title;
    return {
      title,
      description: i18nString(UIStrings.noInternetConnectivity),
      network: SDK.NetworkManager.OfflineConditions,
      cpuThrottlingOption: SDK.CPUThrottlingManager.NoThrottlingOption,
      jslogContext: "offline"
    };
  }
  static getLowEndMobileConditions() {
    const useCalibrated = SDK.CPUThrottlingManager.CalibratedLowTierMobileThrottlingOption.rate() !== 0;
    const cpuThrottlingOption = useCalibrated ? SDK.CPUThrottlingManager.CalibratedLowTierMobileThrottlingOption : SDK.CPUThrottlingManager.LowTierThrottlingOption;
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
    const useCalibrated = SDK.CPUThrottlingManager.CalibratedMidTierMobileThrottlingOption.rate() !== 0;
    const cpuThrottlingOption = useCalibrated ? SDK.CPUThrottlingManager.CalibratedMidTierMobileThrottlingOption : SDK.CPUThrottlingManager.MidTierThrottlingOption;
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
  static cpuThrottlingPresets = [
    SDK.CPUThrottlingManager.NoThrottlingOption,
    SDK.CPUThrottlingManager.MidTierThrottlingOption,
    SDK.CPUThrottlingManager.LowTierThrottlingOption,
    SDK.CPUThrottlingManager.ExtraSlowThrottlingOption,
    SDK.CPUThrottlingManager.CalibratedLowTierMobileThrottlingOption,
    SDK.CPUThrottlingManager.CalibratedMidTierMobileThrottlingOption
  ];
};
globalThis.MobileThrottling = globalThis.MobileThrottling || {};
globalThis.MobileThrottling.networkPresets = ThrottlingPresets.networkPresets;

// gen/front_end/panels/mobile_throttling/MobileThrottlingSelector.js
var MobileThrottlingSelector_exports = {};
__export(MobileThrottlingSelector_exports, {
  MobileThrottlingSelector: () => MobileThrottlingSelector
});
import * as i18n5 from "./../../core/i18n/i18n.js";
import * as SDK3 from "./../../core/sdk/sdk.js";

// gen/front_end/panels/mobile_throttling/ThrottlingManager.js
var ThrottlingManager_exports = {};
__export(ThrottlingManager_exports, {
  ActionDelegate: () => ActionDelegate,
  ThrottlingManager: () => ThrottlingManager,
  throttlingManager: () => throttlingManager
});
import * as Common from "./../../core/common/common.js";
import * as Host from "./../../core/host/host.js";
import * as i18n3 from "./../../core/i18n/i18n.js";
import * as SDK2 from "./../../core/sdk/sdk.js";
import * as IconButton from "./../../ui/components/icon_button/icon_button.js";
import * as UI from "./../../ui/legacy/legacy.js";
import * as VisualLogging from "./../../ui/visual_logging/visual_logging.js";
var UIStrings2 = {
  /**
   *@description Text to indicate the network connectivity is offline
   */
  offline: "Offline",
  /**
   *@description Text in Throttling Manager of the Network panel
   */
  forceDisconnectedFromNetwork: "Force disconnected from network",
  /**
   * @description Text for throttling the network
   */
  throttling: "Throttling",
  /**
   * @description Icon title in Throttling Manager of the Network panel
   */
  cpuThrottlingIsEnabled: "CPU throttling is enabled",
  /**
   * @description Screen reader label for a select box that chooses the CPU throttling speed in the Performance panel
   */
  cpuThrottling: "CPU throttling",
  /**
   * @description Tooltip text in Throttling Manager of the Performance panel
   */
  excessConcurrency: "Exceeding the default value may degrade system performance.",
  /**
   * @description Tooltip text in Throttling Manager of the Performance panel
   */
  resetConcurrency: "Reset to the default value",
  /**
   * @description Label for an check box that neables overriding navigator.hardwareConcurrency
   */
  hardwareConcurrency: "Hardware concurrency",
  /**
   * @description Tooltip text for an input box that overrides navigator.hardwareConcurrency on the page
   */
  hardwareConcurrencySettingLabel: "Override the value reported by navigator.hardwareConcurrency",
  /**
   * @description Text label for a selection box showing that a specific option is recommended for CPU or Network throttling.
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
   * @description Tooltip text for an select element that overrides navigator.connection.saveData on the page
   */
  saveDataSettingTooltip: "Override the value reported by navigator.connection.saveData on the page"
};
var str_2 = i18n3.i18n.registerUIStrings("panels/mobile_throttling/ThrottlingManager.ts", UIStrings2);
var i18nString2 = i18n3.i18n.getLocalizedString.bind(void 0, str_2);
var throttlingManagerInstance;
var PromiseQueue = class {
  #promise = Promise.resolve();
  push(promise) {
    return new Promise((r) => {
      this.#promise = this.#promise.then(async () => r(await promise));
    });
  }
};
var ThrottlingManager = class _ThrottlingManager extends Common.ObjectWrapper.ObjectWrapper {
  cpuThrottlingControls;
  cpuThrottlingOptions;
  customNetworkConditionsSetting;
  currentNetworkThrottlingConditionKeySetting;
  calibratedCpuThrottlingSetting;
  lastNetworkThrottlingConditions;
  cpuThrottlingManager;
  #hardwareConcurrencyOverrideEnabled = false;
  #emulationQueue = new PromiseQueue();
  get hardwareConcurrencyOverrideEnabled() {
    return this.#hardwareConcurrencyOverrideEnabled;
  }
  constructor() {
    super();
    this.cpuThrottlingManager = SDK2.CPUThrottlingManager.CPUThrottlingManager.instance();
    this.cpuThrottlingManager.addEventListener("RateChanged", (event) => this.onCPUThrottlingRateChangedOnSDK(event.data));
    this.cpuThrottlingControls = /* @__PURE__ */ new Set();
    this.cpuThrottlingOptions = ThrottlingPresets.cpuThrottlingPresets;
    this.customNetworkConditionsSetting = SDK2.NetworkManager.customUserNetworkConditionsSetting();
    this.currentNetworkThrottlingConditionKeySetting = SDK2.NetworkManager.activeNetworkThrottlingKeySetting();
    this.calibratedCpuThrottlingSetting = Common.Settings.Settings.instance().createSetting(
      "calibrated-cpu-throttling",
      {},
      "Global"
      /* Common.Settings.SettingStorageType.GLOBAL */
    );
    SDK2.NetworkManager.MultitargetNetworkManager.instance().addEventListener("ConditionsChanged", () => {
      this.lastNetworkThrottlingConditions = this.#getCurrentNetworkConditions();
      const conditions = SDK2.NetworkManager.MultitargetNetworkManager.instance().networkConditions();
      this.currentNetworkThrottlingConditionKeySetting.set(conditions.key);
    });
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
    const { forceNew } = opts;
    if (!throttlingManagerInstance || forceNew) {
      throttlingManagerInstance = new _ThrottlingManager();
    }
    return throttlingManagerInstance;
  }
  createOfflineToolbarCheckbox() {
    const checkbox = new UI.Toolbar.ToolbarCheckbox(i18nString2(UIStrings2.offline), i18nString2(UIStrings2.forceDisconnectedFromNetwork), forceOffline.bind(this));
    checkbox.element.setAttribute("jslog", `${VisualLogging.toggle("disconnect-from-network").track({ click: true })}`);
    SDK2.NetworkManager.MultitargetNetworkManager.instance().addEventListener("ConditionsChanged", networkConditionsChanged);
    checkbox.setChecked(SDK2.NetworkManager.MultitargetNetworkManager.instance().isOffline());
    function forceOffline() {
      if (checkbox.checked()) {
        SDK2.NetworkManager.MultitargetNetworkManager.instance().setNetworkConditions(SDK2.NetworkManager.OfflineConditions);
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
  createMobileThrottlingButton() {
    const button = new UI.Toolbar.ToolbarMenuButton(appendItems, void 0, void 0, "mobile-throttling");
    button.setTitle(i18nString2(UIStrings2.throttling));
    button.setDarkText();
    let options = [];
    let selectedIndex = -1;
    const selector = new MobileThrottlingSelector(populate, select);
    return button;
    function appendItems(contextMenu) {
      for (let index = 0; index < options.length; ++index) {
        const conditions = options[index];
        if (!conditions) {
          continue;
        }
        if (conditions.title === ThrottlingPresets.getCustomConditions().title && conditions.description === ThrottlingPresets.getCustomConditions().description) {
          continue;
        }
        contextMenu.defaultSection().appendCheckboxItem(conditions.title, selector.optionSelected.bind(selector, conditions), { checked: selectedIndex === index, jslogContext: conditions.jslogContext });
      }
    }
    function populate(groups) {
      options = [];
      for (const group of groups) {
        for (const conditions of group.items) {
          options.push(conditions);
        }
        options.push(null);
      }
      return options;
    }
    function select(index) {
      selectedIndex = index;
      const option = options[index];
      if (option) {
        button.setText(option.title);
        button.setTitle(`${option.title}: ${option.description}`);
      }
    }
  }
  updatePanelIcon() {
    const warnings = [];
    if (this.cpuThrottlingManager.cpuThrottlingRate() !== SDK2.CPUThrottlingManager.CPUThrottlingRates.NO_THROTTLING) {
      warnings.push(i18nString2(UIStrings2.cpuThrottlingIsEnabled));
    }
    UI.InspectorView.InspectorView.instance().setPanelWarnings("timeline", warnings);
  }
  setCPUThrottlingOption(option) {
    this.cpuThrottlingManager.setCPUThrottlingOption(option);
  }
  onCPUThrottlingRateChangedOnSDK(rate) {
    if (rate !== SDK2.CPUThrottlingManager.CPUThrottlingRates.NO_THROTTLING) {
      Host.userMetrics.actionTaken(Host.UserMetrics.Action.CpuThrottlingEnabled);
    }
    const index = this.cpuThrottlingOptions.indexOf(this.cpuThrottlingManager.cpuThrottlingOption());
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
        const index = this.cpuThrottlingOptions.indexOf(this.cpuThrottlingManager.cpuThrottlingOption());
        control.setSelectedIndex(index);
        void Common.Revealer.reveal(this.calibratedCpuThrottlingSetting);
      } else {
        this.setCPUThrottlingOption(this.cpuThrottlingOptions[control.selectedIndex()]);
      }
    };
    const control = new UI.Toolbar.ToolbarComboBox(optionSelected, i18nString2(UIStrings2.cpuThrottling), "", "cpu-throttling");
    this.cpuThrottlingControls.add(control);
    const currentOption = this.cpuThrottlingManager.cpuThrottlingOption();
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
    const reset = new Option(i18nString2(UIStrings2.noSaveDataOverride), void 0, true, true);
    const enable = new Option(i18nString2(UIStrings2.saveDataOn));
    const disable = new Option(i18nString2(UIStrings2.saveDataOff));
    const handler = (e) => {
      const select2 = e.target;
      switch (select2.selectedOptions.item(0)) {
        case reset:
          for (const emulationModel of SDK2.TargetManager.TargetManager.instance().models(SDK2.EmulationModel.EmulationModel)) {
            void this.#emulationQueue.push(emulationModel.setDataSaverOverride(
              "unset"
              /* SDK.EmulationModel.DataSaverOverride.UNSET */
            ));
          }
          break;
        case enable:
          for (const emulationModel of SDK2.TargetManager.TargetManager.instance().models(SDK2.EmulationModel.EmulationModel)) {
            void this.#emulationQueue.push(emulationModel.setDataSaverOverride(
              "enabled"
              /* SDK.EmulationModel.DataSaverOverride.ENABLED */
            ));
          }
          break;
        case disable:
          for (const emulationModel of SDK2.TargetManager.TargetManager.instance().models(SDK2.EmulationModel.EmulationModel)) {
            void this.#emulationQueue.push(emulationModel.setDataSaverOverride(
              "disabled"
              /* SDK.EmulationModel.DataSaverOverride.DISABLED */
            ));
          }
          break;
      }
      this.dispatchEventToListeners("SaveDataOverrideChanged", select2.selectedIndex);
    };
    const select = new UI.Toolbar.ToolbarComboBox(handler, i18nString2(UIStrings2.saveDataSettingTooltip), className);
    select.addOption(reset);
    select.addOption(enable);
    select.addOption(disable);
    this.addEventListener("SaveDataOverrideChanged", ({ data }) => select.setSelectedIndex(data));
    return select;
  }
  /** Hardware Concurrency doesn't store state in a setting. */
  createHardwareConcurrencySelector() {
    const numericInput = new UI.Toolbar.ToolbarItem(UI.UIUtils.createInput("devtools-text-input", "number", "hardware-concurrency"));
    numericInput.setTitle(i18nString2(UIStrings2.hardwareConcurrencySettingLabel));
    const inputElement = numericInput.element;
    inputElement.min = "1";
    numericInput.setEnabled(false);
    const checkbox = UI.UIUtils.CheckboxLabel.create(i18nString2(UIStrings2.hardwareConcurrency), false, i18nString2(UIStrings2.hardwareConcurrencySettingLabel), "hardware-concurrency");
    const reset = new UI.Toolbar.ToolbarButton("Reset concurrency", "undo", void 0, "hardware-concurrency-reset");
    reset.setTitle(i18nString2(UIStrings2.resetConcurrency));
    const icon = new IconButton.Icon.Icon();
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
      reset.addEventListener("Click", () => {
        inputElement.value = `${defaultValue}`;
        setHardwareConcurrency(defaultValue);
      });
    });
    return { numericInput, reset, warning, checkbox };
  }
  setHardwareConcurrency(concurrency) {
    this.cpuThrottlingManager.setHardwareConcurrency(concurrency);
  }
  isDirty() {
    const networkConditions = SDK2.NetworkManager.MultitargetNetworkManager.instance().networkConditions();
    const knownCurrentConditions = this.#getCurrentNetworkConditions();
    return !SDK2.NetworkManager.networkConditionsEqual(networkConditions, knownCurrentConditions);
  }
};
var ActionDelegate = class {
  handleAction(_context, actionId) {
    if (actionId === "network-conditions.network-online") {
      SDK2.NetworkManager.MultitargetNetworkManager.instance().setNetworkConditions(SDK2.NetworkManager.NoThrottlingConditions);
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
      SDK2.NetworkManager.MultitargetNetworkManager.instance().setNetworkConditions(SDK2.NetworkManager.OfflineConditions);
      return true;
    }
    return false;
  }
};
function throttlingManager() {
  return ThrottlingManager.instance();
}

// gen/front_end/panels/mobile_throttling/MobileThrottlingSelector.js
var UIStrings3 = {
  /**
   * @description Mobile throttling is disabled. The user can select this option to run mobile
   *emulation at a normal speed instead of throttled.
   */
  disabled: "Disabled",
  /**
   * @description Title for a group of pre-decided configuration options for mobile throttling. These
   *are useful default options that users might want.
   */
  presets: "Presets",
  /**
   * @description Title for a group of advanced configuration options for mobile throttling, which
   *might not be applicable to every user or situation.
   */
  advanced: "Advanced"
};
var str_3 = i18n5.i18n.registerUIStrings("panels/mobile_throttling/MobileThrottlingSelector.ts", UIStrings3);
var i18nString3 = i18n5.i18n.getLocalizedString.bind(void 0, str_3);
var MobileThrottlingSelector = class {
  populateCallback;
  selectCallback;
  options;
  constructor(populateCallback, selectCallback) {
    this.populateCallback = populateCallback;
    this.selectCallback = selectCallback;
    SDK3.CPUThrottlingManager.CPUThrottlingManager.instance().addEventListener("RateChanged", this.conditionsChanged, this);
    SDK3.NetworkManager.MultitargetNetworkManager.instance().addEventListener("ConditionsChanged", this.conditionsChanged, this);
    this.options = this.populateOptions();
    this.conditionsChanged();
  }
  optionSelected(conditions) {
    SDK3.NetworkManager.MultitargetNetworkManager.instance().setNetworkConditions(conditions.network);
    throttlingManager().setCPUThrottlingOption(conditions.cpuThrottlingOption);
  }
  populateOptions() {
    const disabledGroup = {
      title: i18nString3(UIStrings3.disabled),
      items: [ThrottlingPresets.getNoThrottlingConditions()]
    };
    const presetsGroup = { title: i18nString3(UIStrings3.presets), items: ThrottlingPresets.getMobilePresets() };
    const advancedGroup = { title: i18nString3(UIStrings3.advanced), items: ThrottlingPresets.getAdvancedMobilePresets() };
    return this.populateCallback([disabledGroup, presetsGroup, advancedGroup]);
  }
  conditionsChanged() {
    this.populateOptions();
    const networkConditions = SDK3.NetworkManager.MultitargetNetworkManager.instance().networkConditions();
    const cpuThrottlingOption = SDK3.CPUThrottlingManager.CPUThrottlingManager.instance().cpuThrottlingOption();
    for (let index = 0; index < this.options.length; ++index) {
      const option = this.options[index];
      if (option && "network" in option && option.network === networkConditions && option.cpuThrottlingOption === cpuThrottlingOption) {
        this.selectCallback(index);
        return;
      }
    }
    const customConditions = ThrottlingPresets.getCustomConditions();
    for (let index = 0; index < this.options.length; ++index) {
      const item2 = this.options[index];
      if (item2 && item2.title === customConditions.title && item2.description === customConditions.description) {
        this.selectCallback(index);
        return;
      }
    }
  }
};

// gen/front_end/panels/mobile_throttling/NetworkPanelIndicator.js
var NetworkPanelIndicator_exports = {};
__export(NetworkPanelIndicator_exports, {
  NetworkPanelIndicator: () => NetworkPanelIndicator
});
import * as Common2 from "./../../core/common/common.js";
import * as i18n7 from "./../../core/i18n/i18n.js";
import * as SDK4 from "./../../core/sdk/sdk.js";
import * as UI2 from "./../../ui/legacy/legacy.js";
var UIStrings4 = {
  /**
   * @description Icon title in Network Panel Indicator of the Network panel
   */
  networkThrottlingIsEnabled: "Network throttling is enabled",
  /**
   * @description Icon title in Network Panel Indicator of the Network panel
   */
  requestsMayBeOverridden: "Requests may be overridden locally, see the Sources panel",
  /**
   * @description Icon title in Network Panel Indicator of the Network panel
   */
  requestsMayBeBlocked: "Requests may be blocked, see the Network request blocking panel",
  /**
   * @description Title of an icon in the Network panel that indicates that accepted content encodings have been overridden.
   */
  acceptedEncodingOverrideSet: "The set of accepted `Content-Encoding` headers has been modified by DevTools, see the Network conditions panel"
};
var str_4 = i18n7.i18n.registerUIStrings("panels/mobile_throttling/NetworkPanelIndicator.ts", UIStrings4);
var i18nString4 = i18n7.i18n.getLocalizedString.bind(void 0, str_4);
var NetworkPanelIndicator = class {
  constructor() {
    if (!UI2.InspectorView.InspectorView.instance().hasPanel("network")) {
      return;
    }
    const manager = SDK4.NetworkManager.MultitargetNetworkManager.instance();
    manager.addEventListener("ConditionsChanged", updateVisibility);
    manager.addEventListener("BlockedPatternsChanged", updateVisibility);
    manager.addEventListener("InterceptorsChanged", updateVisibility);
    manager.addEventListener("AcceptedEncodingsChanged", updateVisibility);
    Common2.Settings.Settings.instance().moduleSetting("cache-disabled").addChangeListener(updateVisibility, this);
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
      if (manager.isAcceptedEncodingOverrideSet()) {
        warnings.push(i18nString4(UIStrings4.acceptedEncodingOverrideSet));
      }
      UI2.InspectorView.InspectorView.instance().setPanelWarnings("network", warnings);
    }
  }
};

// gen/front_end/panels/mobile_throttling/NetworkThrottlingSelector.js
var NetworkThrottlingSelector_exports = {};
__export(NetworkThrottlingSelector_exports, {
  DEFAULT_VIEW: () => DEFAULT_VIEW,
  NetworkThrottlingSelect: () => NetworkThrottlingSelect,
  NetworkThrottlingSelectorWidget: () => NetworkThrottlingSelectorWidget
});
import * as Common3 from "./../../core/common/common.js";
import * as i18n9 from "./../../core/i18n/i18n.js";
import * as Platform from "./../../core/platform/platform.js";
import * as SDK5 from "./../../core/sdk/sdk.js";
import * as UI3 from "./../../ui/legacy/legacy.js";
import * as Lit from "./../../ui/lit/lit.js";
import * as VisualLogging2 from "./../../ui/visual_logging/visual_logging.js";
var { render, html, Directives, nothing } = Lit;
var UIStrings5 = {
  /**
   * @description Text to indicate something is not enabled
   */
  disabled: "Disabled",
  /**
   * @description Title for a group of configuration options
   */
  presets: "Presets",
  /**
   * @description Text in Network Throttling Selector of the Network panel
   */
  custom: "Custom",
  /**
   * @description  Title for a network throttling group containing the request blocking option
   */
  blockingGroup: "Blocking",
  /**
   *@description Text with two placeholders separated by a colon
   *@example {Node removed} PH1
   *@example {div#id1} PH2
   */
  sS: "{PH1}: {PH2}",
  /**
   *@description Accessibility label for custom add network throttling option
   *@example {Custom} PH1
   */
  addS: "Add {PH1}",
  /**
   *@description Text in Throttling Manager of the Network panel
   */
  add: "Add\u2026",
  /**
   * @description Text label for a selection box showing that a specific option is recommended for CPU or Network throttling.
   * @example {Fast 4G} PH1
   * @example {4x slowdown} PH1
   */
  recommendedThrottling: "{PH1} \u2013 recommended"
};
var str_5 = i18n9.i18n.registerUIStrings("panels/mobile_throttling/NetworkThrottlingSelector.ts", UIStrings5);
var i18nString5 = i18n9.i18n.getLocalizedString.bind(void 0, str_5);
var DEFAULT_VIEW = (input, output, target) => {
  const title = (conditions) => typeof conditions.title === "function" ? conditions.title() : conditions.title;
  const jslog = (group, condition) => `${VisualLogging2.item(Platform.StringUtilities.toKebabCase("i18nTitleKey" in condition && condition.i18nTitleKey || title(condition))).track({ click: true })}`;
  const optionsMap = /* @__PURE__ */ new WeakMap();
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
    if (option === element.options[element.options.length - 1]) {
      input.onAddCustomConditions();
      event.consume(true);
      if (selectedConditions) {
        element.value = title(selectedConditions);
      }
    } else {
      const conditions = optionsMap.get(option);
      if (conditions) {
        selectedConditions = conditions;
        input.onSelect(conditions);
      }
    }
  }
  render(
    // clang-format off
    html`<select
      ?disabled=${input.disabled}
      aria-label=${input.title ?? nothing}
      jslog=${VisualLogging2.dropDown().track({ change: true }).context(input.jslogContext)}
      @change=${onSelect}>
          ${input.throttlingGroups.map((group) => html`<optgroup
            label=${group.title}>
            ${group.items.map((condition) => html`<option
              ${Directives.ref((option) => option && optionsMap.set(option, condition))}
              ?selected=${selectedConditions ? SDK5.NetworkManager.networkConditionsEqual(condition, selectedConditions) : group === input.throttlingGroups[0]}
              value=${title(condition)}
              aria-label=${i18nString5(UIStrings5.sS, { PH1: group.title, PH2: title(condition) })}
              jslog=${jslog(group, condition)}>
                ${condition === input.recommendedConditions ? i18nString5(UIStrings5.recommendedThrottling, { PH1: title(condition) }) : title(condition)}
            </option>`)}
        </optgroup>`)}
        <optgroup label=${input.customConditionsGroup.title}>
          ${input.customConditionsGroup.items.map((condition) => html`<option
              ${Directives.ref((option) => option && optionsMap.set(option, condition))}
              ?selected=${selectedConditions && SDK5.NetworkManager.networkConditionsEqual(condition, selectedConditions)}
              value=${title(condition)}
              aria-label=${i18nString5(UIStrings5.sS, { PH1: input.customConditionsGroup.title, PH2: title(condition) })}
              jslog=${VisualLogging2.item("custom-network-throttling-item").track({ click: true })}>
                ${condition === input.recommendedConditions ? i18nString5(UIStrings5.recommendedThrottling, { PH1: title(condition) }) : title(condition)}
          </option>`)}
          <option
            value=${i18nString5(UIStrings5.add)}
            aria-label=${i18nString5(UIStrings5.addS, { PH1: input.customConditionsGroup.title })}
            jslog=${VisualLogging2.action("add").track({ click: true })}>
              ${i18nString5(UIStrings5.add)}
          </option>
        </optgroup>
      </select>`,
    // clang-format on
    target
  );
};
var NetworkThrottlingSelect = class _NetworkThrottlingSelect extends Common3.ObjectWrapper.ObjectWrapper {
  #recommendedConditions = null;
  #element;
  #jslogContext;
  #currentConditions;
  #title;
  #view;
  #variant = "global-conditions";
  #disabled = false;
  static createForGlobalConditions(element, title) {
    ThrottlingManager.instance();
    const select = new _NetworkThrottlingSelect(element, {
      title,
      jslogContext: SDK5.NetworkManager.activeNetworkThrottlingKeySetting().name,
      currentConditions: SDK5.NetworkManager.MultitargetNetworkManager.instance().networkConditions()
    });
    select.addEventListener("conditionsChanged", (ev) => !("block" in ev.data) && SDK5.NetworkManager.MultitargetNetworkManager.instance().setNetworkConditions(ev.data));
    SDK5.NetworkManager.MultitargetNetworkManager.instance().addEventListener("ConditionsChanged", () => {
      select.currentConditions = SDK5.NetworkManager.MultitargetNetworkManager.instance().networkConditions();
    });
    return select;
  }
  constructor(element, options = {}, view = DEFAULT_VIEW) {
    super();
    SDK5.NetworkManager.customUserNetworkConditionsSetting().addChangeListener(this.#performUpdate, this);
    this.#element = element;
    this.#jslogContext = options.jslogContext;
    this.#currentConditions = options.currentConditions;
    this.#title = options.title;
    this.#view = view;
    this.#performUpdate();
  }
  get disabled() {
    return this.#disabled;
  }
  set disabled(disabled) {
    this.#disabled = disabled;
    this.#performUpdate();
  }
  get recommendedConditions() {
    return this.#recommendedConditions;
  }
  set recommendedConditions(recommendedConditions) {
    this.#recommendedConditions = recommendedConditions;
    this.#performUpdate();
  }
  get currentConditions() {
    return this.#currentConditions;
  }
  set currentConditions(currentConditions) {
    this.#currentConditions = currentConditions;
    this.#performUpdate();
  }
  get jslogContext() {
    return this.#jslogContext;
  }
  set jslogContext(jslogContext) {
    this.#jslogContext = jslogContext;
    this.#performUpdate();
  }
  get variant() {
    return this.#variant;
  }
  set variant(variant) {
    this.#variant = variant;
    this.#performUpdate();
  }
  // FIXME Should use requestUpdate once we merge this with the widget
  #performUpdate() {
    const customNetworkConditionsSetting = SDK5.NetworkManager.customUserNetworkConditionsSetting();
    const customNetworkConditions = customNetworkConditionsSetting.get();
    const onAddCustomConditions = () => {
      void Common3.Revealer.reveal(SDK5.NetworkManager.customUserNetworkConditionsSetting());
    };
    const onSelect = (conditions) => {
      this.dispatchEventToListeners("conditionsChanged", conditions);
    };
    const throttlingGroups = [];
    switch (this.#variant) {
      case "global-conditions":
        throttlingGroups.push({ title: i18nString5(UIStrings5.disabled), items: [SDK5.NetworkManager.NoThrottlingConditions] }, {
          title: i18nString5(UIStrings5.presets),
          items: [
            SDK5.NetworkManager.Fast4GConditions,
            SDK5.NetworkManager.Slow4GConditions,
            SDK5.NetworkManager.Slow3GConditions,
            SDK5.NetworkManager.OfflineConditions
          ]
        });
        break;
      case "individual-request-conditions":
        throttlingGroups.push({ title: i18nString5(UIStrings5.blockingGroup), items: [SDK5.NetworkManager.BlockingConditions] }, {
          title: i18nString5(UIStrings5.presets),
          items: [
            SDK5.NetworkManager.Fast4GConditions,
            SDK5.NetworkManager.Slow4GConditions,
            SDK5.NetworkManager.Slow3GConditions
          ]
        });
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
    this.#view(viewInput, {}, this.#element);
  }
};
var NetworkThrottlingSelectorWidget = class extends UI3.Widget.VBox {
  #select;
  #conditionsChangedHandler;
  constructor(element, view = DEFAULT_VIEW) {
    super(element, { useShadowDom: true });
    this.#select = new NetworkThrottlingSelect(this.contentElement, {}, view);
    this.#select.addEventListener("conditionsChanged", ({ data }) => this.#conditionsChangedHandler?.(data));
  }
  get disabled() {
    return this.#select.disabled;
  }
  set disabled(disabled) {
    this.#select.disabled = disabled;
  }
  set variant(variant) {
    this.#select.variant = variant;
  }
  set jslogContext(context) {
    this.#select.jslogContext = context;
  }
  set currentConditions(currentConditions) {
    this.#select.currentConditions = currentConditions;
  }
  set onConditionsChanged(handler) {
    this.#conditionsChangedHandler = handler;
  }
};

// gen/front_end/panels/mobile_throttling/ThrottlingSettingsTab.js
var ThrottlingSettingsTab_exports = {};
__export(ThrottlingSettingsTab_exports, {
  CPUThrottlingCard: () => CPUThrottlingCard,
  ThrottlingSettingsTab: () => ThrottlingSettingsTab
});
import "./../../ui/components/cards/cards.js";
import * as Common4 from "./../../core/common/common.js";
import * as i18n13 from "./../../core/i18n/i18n.js";
import * as SDK7 from "./../../core/sdk/sdk.js";
import * as Buttons from "./../../ui/components/buttons/buttons.js";
import * as IconButton2 from "./../../ui/components/icon_button/icon_button.js";
import * as UI4 from "./../../ui/legacy/legacy.js";
import * as VisualLogging3 from "./../../ui/visual_logging/visual_logging.js";

// gen/front_end/panels/mobile_throttling/CalibrationController.js
import * as i18n11 from "./../../core/i18n/i18n.js";
import * as SDK6 from "./../../core/sdk/sdk.js";
var UIStrings6 = {
  /**
   * @description Text to display to user while a calibration process is running.
   */
  runningCalibration: "Running CPU calibration, please do not leave this tab or close DevTools."
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
            low: SDK6.CPUThrottlingManager.CalibrationError.DEVICE_TOO_WEAK,
            mid: SDK6.CPUThrottlingManager.CalibrationError.DEVICE_TOO_WEAK
          };
          return;
        }
        this.#result = { mid: SDK6.CPUThrottlingManager.CalibrationError.DEVICE_TOO_WEAK };
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
  border-radius: var( --sys-size-3);
  background-color: var(--sys-color-primary);
}

.setting {
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  align-items: flex-start;
  gap: var( --sys-size-3);
  padding: var( --sys-size-4);
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
  flex-basis: var( --sys-size-24);
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
  flex: 0 0 1px;
  background-color: var(--sys-color-divider);
  height: 30px;
  margin: 0 4px;
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
  padding: 14px;
  display: flex;
  justify-content: space-between;
}

.cpu-preset-result.not-calibrated {
  font-style: italic;
}

.cpu-preset-calibrate {
  flex-direction: column;
  gap: 14px;
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

/*# sourceURL=${import.meta.resolve("./throttlingSettingsTab.css")} */`;

// gen/front_end/panels/mobile_throttling/ThrottlingSettingsTab.js
var UIStrings7 = {
  /**
   * @description Text in Throttling Settings Tab of the Network panel
   */
  networkThrottlingProfiles: "Network throttling profiles",
  /**
   * @description Text of add conditions button in Throttling Settings Tab of the Network panel
   */
  addCustomProfile: "Add profile",
  /**
   * @description A value in milliseconds
   * @example {3} PH1
   */
  dms: "{PH1} `ms`",
  /**
   * @description Text in Throttling Settings Tab of the Network panel
   */
  profileName: "Profile Name",
  /**
   * @description Label for a textbox that sets the download speed in the Throttling Settings Tab.
   * Noun, short for 'download speed'.
   */
  download: "Download",
  /**
   * @description Label for a textbox that sets the upload speed in the Throttling Settings Tab.
   * Noun, short for 'upload speed'.
   */
  upload: "Upload",
  /**
   * @description Label for a textbox that sets the latency in the Throttling Settings Tab.
   */
  latency: "Latency",
  /**
   * @description Label for a textbox that sets the packet loss percentage for real-time networks in the Throttling Settings Tab.
   */
  packetLoss: "Packet Loss",
  /**
   * @description Label for a textbox that sets the maximum packet queue length for real-time networks in the Throttling Settings Tab.
   */
  packetQueueLength: "Packet Queue Length",
  /**
   * @description Label for a checkbox that allows packet reordering in the Throttling Settings Tab.
   */
  packetReordering: "Packet Reordering",
  /**
   * @description Label for a textbox serving as a unit in the Throttling Settings Tab for the field Packet Queue Length column.
   */
  packet: "packet",
  /**
   * @description Text in Throttling Settings Tab of the Network panel
   */
  optional: "optional",
  /**
   * @description Error message for Profile Name input in Throtting pane of the Settings
   * @example {49} PH1
   */
  profileNameCharactersLengthMust: "Profile Name characters length must be between 1 to {PH1} inclusive",
  /**
   * @description Error message for Download and Upload inputs in Throttling pane of the Settings
   * @example {Download} PH1
   * @example {0} PH2
   * @example {10000000} PH3
   */
  sMustBeANumberBetweenSkbsToSkbs: "{PH1} must be a number between {PH2} `kbit/s` to {PH3} `kbit/s` inclusive",
  /**
   * @description Error message for Latency input in Throttling pane of the Settings
   * @example {0} PH1
   * @example {1000000} PH2
   */
  latencyMustBeAnIntegerBetweenSms: "Latency must be an integer between {PH1} `ms` to {PH2} `ms` inclusive",
  /**
   * @description Error message for Packet Loss input in Throttling pane of the Settings
   * @example {0} PH1
   * @example {100} PH2
   */
  packetLossMustBeAnIntegerBetweenSpct: "Packet Loss must be a number between {PH1} `%` to {PH2} `%` inclusive",
  /**
   * @description Error message for Packet Queue Length input in Throttling pane of the Settings
   */
  packetQueueLengthMustBeAnIntegerGreaterOrEqualToZero: "Packet Queue Length must be greater or equal to 0",
  /**
   * @description Text in Throttling Settings Tab of the Network panel, indicating the download or
   * upload speed that will be applied in kilobits per second.
   * @example {25} PH1
   */
  dskbits: "{PH1} `kbit/s`",
  /**
   * @description Text in Throttling Settings Tab of the Network panel, indicating the download or
   * upload speed that will be applied in megabits per second.
   * @example {25.4} PH1
   */
  fsmbits: "{PH1} `Mbit/s`",
  /**
   * @description Label for the column Packet Reordering to indicate it is enabled in the Throttling Settings Tab.
   */
  on: "On",
  /**
   * @description Label for the column Packet Reordering to indicate it is disabled in the Throttling Settings Tab.
   */
  off: "Off",
  /**
   * @description Text in Throttling Settings Tab of the Settings panel
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
   * @description Text to use to indicate that a CPU calibration has not been run yet.
   */
  needsCalibration: "Needs calibration",
  /**
   * @description Text to explain why the user should run the CPU calibration process.
   */
  calibrationCTA: "To use the CPU throttling presets, run the calibration process to determine the ideal throttling rate for your device.",
  /**
   * @description Text to explain what CPU throttling presets are.
   */
  cpuCalibrationDescription: "These presets throttle your CPU to approximate the performance of typical low or mid-tier mobile devices.",
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
  calibrationWarningRunningOnBattery: "Device is running on battery, please plug in charger for best results",
  /**
   * @description Text to explain an issue that may impact the CPU calibration process.
   */
  calibrationWarningLowBattery: "Device battery is low (<20%), results may be impacted by CPU throttling",
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
var CPUThrottlingCard = class {
  element;
  setting;
  computePressurePromise;
  controller;
  // UI stuff.
  lowTierMobileDeviceEl;
  midTierMobileDeviceEl;
  calibrateEl;
  textEl;
  calibrateButton;
  cancelButton;
  progress;
  state = "cta";
  warnings = [];
  constructor() {
    this.setting = Common4.Settings.Settings.instance().createSetting(
      "calibrated-cpu-throttling",
      {},
      "Global"
      /* Common.Settings.SettingStorageType.GLOBAL */
    );
    this.element = document.createElement("devtools-card");
    this.element.heading = i18nString7(UIStrings7.cpuThrottlingPresets);
    const descriptionEl = this.element.createChild("span");
    descriptionEl.textContent = i18nString7(UIStrings7.cpuCalibrationDescription);
    this.lowTierMobileDeviceEl = this.element.createChild("div", "cpu-preset-section");
    this.lowTierMobileDeviceEl.append("Low-tier mobile device");
    this.lowTierMobileDeviceEl.createChild("div", "cpu-preset-result");
    this.midTierMobileDeviceEl = this.element.createChild("div", "cpu-preset-section");
    this.midTierMobileDeviceEl.append("Mid-tier mobile device");
    this.midTierMobileDeviceEl.createChild("div", "cpu-preset-result");
    this.calibrateEl = this.element.createChild("div", "cpu-preset-section cpu-preset-calibrate");
    const buttonContainerEl = this.calibrateEl.createChild("div", "button-container");
    this.calibrateButton = new Buttons.Button.Button();
    this.calibrateButton.classList.add("calibrate-button");
    this.calibrateButton.data = {
      variant: "primary",
      jslogContext: "throttling.calibrate"
    };
    this.calibrateButton.addEventListener("click", () => this.calibrateButtonClicked());
    buttonContainerEl.append(this.calibrateButton);
    this.cancelButton = new Buttons.Button.Button();
    this.cancelButton.classList.add("cancel-button");
    this.cancelButton.data = {
      variant: "outlined",
      jslogContext: "throttling.calibrate-cancel"
    };
    this.cancelButton.textContent = i18nString7(UIStrings7.cancel);
    this.cancelButton.addEventListener("click", () => this.cancelButtonClicked());
    buttonContainerEl.append(this.cancelButton);
    this.textEl = this.calibrateEl.createChild("div", "text-container");
    this.progress = this.calibrateEl.createChild("devtools-progress");
    this.progress.setAttribute("no-stop-button", "");
    this.updateState();
  }
  wasShown() {
    this.computePressurePromise = createComputePressurePromise();
    this.state = "cta";
    this.updateState();
  }
  willHide() {
    this.computePressurePromise = void 0;
    if (this.controller) {
      this.controller.abort();
    }
  }
  updateState() {
    if (this.state !== "calibrating") {
      this.controller = void 0;
    }
    const result = this.setting.get();
    const hasCalibrated = result.low || result.mid;
    this.calibrateButton.style.display = "none";
    this.textEl.style.display = "none";
    this.cancelButton.style.display = "none";
    this.progress.style.display = "none";
    if (this.state === "cta") {
      this.calibrateButton.style.display = "";
      this.calibrateButton.textContent = hasCalibrated ? i18nString7(UIStrings7.recalibrate) : i18nString7(UIStrings7.calibrate);
      if (!hasCalibrated) {
        this.textEl.style.display = "";
        this.textEl.textContent = "";
        this.textEl.append(this.createTextWithIcon(i18nString7(UIStrings7.calibrationCTA), "info"));
      }
    } else if (this.state === "prompting") {
      this.calibrateButton.style.display = "";
      this.calibrateButton.textContent = i18nString7(UIStrings7.continue);
      this.cancelButton.style.display = "";
      this.textEl.style.display = "";
      this.textEl.textContent = "";
      for (const warning of this.warnings) {
        this.textEl.append(this.createTextWithIcon(warning, "warning"));
      }
      this.textEl.append(this.createTextWithIcon(i18nString7(UIStrings7.calibrationConfirmationPrompt), "info"));
    } else if (this.state === "calibrating") {
      this.cancelButton.style.display = "";
      this.progress.style.display = "";
    }
    const resultToString = (result2) => {
      if (result2 === void 0) {
        return i18nString7(UIStrings7.needsCalibration);
      }
      if (typeof result2 === "string") {
        return SDK7.CPUThrottlingManager.calibrationErrorToString(result2);
      }
      if (typeof result2 !== "number") {
        return `Invalid: ${result2}`;
      }
      return i18nString7(UIStrings7.dSlowdown, { PH1: result2.toFixed(1) });
    };
    const setPresetResult = (element, result2) => {
      if (!element) {
        throw new Error("expected HTMLElement");
      }
      element.textContent = resultToString(result2);
      element.classList.toggle("not-calibrated", result2 === void 0);
    };
    setPresetResult(this.lowTierMobileDeviceEl.querySelector(".cpu-preset-result"), result.low);
    setPresetResult(this.midTierMobileDeviceEl.querySelector(".cpu-preset-result"), result.mid);
  }
  createTextWithIcon(text, icon) {
    const el = document.createElement("div");
    el.classList.add("text-with-icon");
    el.append(IconButton2.Icon.create(icon));
    el.append(text);
    return el;
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
      this.updateState();
    } else if (this.state === "prompting") {
      this.state = "calibrating";
      this.updateState();
      void this.runCalibration();
    }
  }
  cancelButtonClicked() {
    if (this.controller) {
      this.controller.abort();
    } else {
      this.state = "cta";
      this.updateState();
    }
  }
  async runCalibration() {
    this.progress.worked = 0;
    this.progress.totalWork = 1;
    this.controller = new CalibrationController();
    try {
      if (!await this.controller.start()) {
        console.error("Calibration failed to start");
        return;
      }
      for await (const result2 of this.controller.iterator()) {
        this.progress.worked = result2.progress;
      }
    } catch (e) {
      console.error(e);
    } finally {
      await this.controller.end();
    }
    const result = this.controller.result();
    if (result && (result.low || result.mid)) {
      this.setting.set(result);
      this.progress.worked = 1;
      await new Promise((resolve) => setTimeout(resolve, 200));
    }
    this.state = "cta";
    this.updateState();
  }
};
function extractCustomSettingIndex(key) {
  const match = key.match(/USER_CUSTOM_SETTING_(\d+)/);
  if (match?.[1]) {
    return parseInt(match[1], 10);
  }
  return 0;
}
var ThrottlingSettingsTab = class extends UI4.Widget.VBox {
  list;
  customUserConditions;
  editor;
  cpuThrottlingCard;
  /**
   * We store how many custom conditions the user has defined when we load up
   * DevTools. This is because when the user creates a new one, we need to
   * generate a unique key. We take this value, increment it, and use that as part of the unique key.
   * This means that we are resilient to the user adding & then deleting a
   * profile; we always use this counter which is only ever incremented.
   */
  #customUserConditionsCount;
  constructor() {
    super({
      jslog: `${VisualLogging3.pane("throttling-conditions")}`,
      useShadowDom: true
    });
    this.registerRequiredCSS(throttlingSettingsTab_css_default);
    const settingsContent = this.contentElement.createChild("div", "settings-card-container-wrapper").createChild("div");
    settingsContent.classList.add("settings-card-container", "throttling-conditions-settings");
    this.cpuThrottlingCard = new CPUThrottlingCard();
    settingsContent.append(this.cpuThrottlingCard.element);
    const addButton = new Buttons.Button.Button();
    addButton.classList.add("add-conditions-button");
    addButton.data = {
      variant: "outlined",
      iconName: "plus",
      jslogContext: "network.add-conditions"
    };
    addButton.textContent = i18nString7(UIStrings7.addCustomProfile);
    addButton.addEventListener("click", () => this.addButtonClicked());
    const card = settingsContent.createChild("devtools-card");
    card.heading = i18nString7(UIStrings7.networkThrottlingProfiles);
    const container = card.createChild("div");
    this.list = new UI4.ListWidget.ListWidget(this);
    this.list.element.classList.add("conditions-list");
    this.list.registerRequiredCSS(throttlingSettingsTab_css_default);
    this.list.show(container);
    container.appendChild(addButton);
    this.customUserConditions = SDK7.NetworkManager.customUserNetworkConditionsSetting();
    this.customUserConditions.addChangeListener(this.conditionsUpdated, this);
    const customConditions = this.customUserConditions.get();
    const lastCondition = customConditions.at(-1);
    const key = lastCondition?.key;
    if (key && SDK7.NetworkManager.keyIsCustomUser(key)) {
      const maxIndex = extractCustomSettingIndex(key);
      this.#customUserConditionsCount = maxIndex;
    } else {
      this.#customUserConditionsCount = 0;
    }
  }
  wasShown() {
    super.wasShown();
    this.cpuThrottlingCard.wasShown();
    this.conditionsUpdated();
  }
  willHide() {
    super.willHide();
    this.cpuThrottlingCard.willHide();
  }
  conditionsUpdated() {
    this.list.clear();
    const conditions = this.customUserConditions.get();
    for (let i = 0; i < conditions.length; ++i) {
      this.list.appendItem(conditions[i], true);
    }
    this.list.appendSeparator();
  }
  addButtonClicked() {
    this.#customUserConditionsCount++;
    this.list.addNewItem(this.customUserConditions.get().length, {
      key: `USER_CUSTOM_SETTING_${this.#customUserConditionsCount}`,
      title: () => "",
      download: -1,
      upload: -1,
      latency: 0,
      packetLoss: 0,
      packetReordering: false
    });
  }
  renderItem(conditions, _editable) {
    const element = document.createElement("div");
    element.classList.add("conditions-list-item");
    const title = element.createChild("div", "conditions-list-text conditions-list-title");
    const titleText = title.createChild("div", "conditions-list-title-text");
    const castedTitle = this.retrieveOptionsTitle(conditions);
    titleText.textContent = castedTitle;
    UI4.Tooltip.Tooltip.install(titleText, castedTitle);
    element.createChild("div", "conditions-list-separator");
    element.createChild("div", "conditions-list-text").textContent = throughputText(conditions.download);
    element.createChild("div", "conditions-list-separator");
    element.createChild("div", "conditions-list-text").textContent = throughputText(conditions.upload);
    element.createChild("div", "conditions-list-separator");
    element.createChild("div", "conditions-list-text").textContent = i18nString7(UIStrings7.dms, { PH1: conditions.latency });
    element.createChild("div", "conditions-list-separator");
    element.createChild("div", "conditions-list-text").textContent = percentText(conditions.packetLoss ?? 0);
    element.createChild("div", "conditions-list-separator");
    element.createChild("div", "conditions-list-text").textContent = String(conditions.packetQueueLength ?? 0);
    element.createChild("div", "conditions-list-separator");
    element.createChild("div", "conditions-list-text").textContent = conditions.packetReordering ? i18nString7(UIStrings7.on) : i18nString7(UIStrings7.off);
    return element;
  }
  removeItemRequested(_item, index) {
    const list = this.customUserConditions.get();
    list.splice(index, 1);
    this.customUserConditions.set(list);
  }
  retrieveOptionsTitle(conditions) {
    const castedTitle = typeof conditions.title === "function" ? conditions.title() : conditions.title;
    return castedTitle;
  }
  commitEdit(conditions, editor, isNew) {
    conditions.title = editor.control("title").value.trim();
    const download = editor.control("download").value.trim();
    conditions.download = download ? parseInt(download, 10) * (1e3 / 8) : -1;
    const upload = editor.control("upload").value.trim();
    conditions.upload = upload ? parseInt(upload, 10) * (1e3 / 8) : -1;
    const latency = editor.control("latency").value.trim();
    conditions.latency = latency ? parseInt(latency, 10) : 0;
    const packetLoss = editor.control("packetLoss").value.trim();
    conditions.packetLoss = packetLoss ? parseFloat(packetLoss) : 0;
    const packetQueueLength = editor.control("packetQueueLength").value.trim();
    conditions.packetQueueLength = packetQueueLength ? parseFloat(packetQueueLength) : 0;
    const packetReordering = editor.control("packetReordering").checked;
    conditions.packetReordering = packetReordering;
    const list = this.customUserConditions.get();
    if (isNew) {
      list.push(conditions);
    }
    this.customUserConditions.set(list);
  }
  beginEdit(conditions) {
    const editor = this.createEditor();
    editor.control("title").value = this.retrieveOptionsTitle(conditions);
    editor.control("download").value = conditions.download <= 0 ? "" : String(conditions.download / (1e3 / 8));
    editor.control("upload").value = conditions.upload <= 0 ? "" : String(conditions.upload / (1e3 / 8));
    editor.control("latency").value = conditions.latency ? String(conditions.latency) : "";
    editor.control("packetLoss").value = conditions.packetLoss ? String(conditions.packetLoss) : "";
    editor.control("packetQueueLength").value = conditions.packetQueueLength ? String(conditions.packetQueueLength) : "";
    editor.control("packetReordering").checked = conditions.packetReordering ?? false;
    return editor;
  }
  createEditor() {
    if (this.editor) {
      return this.editor;
    }
    const settings = [
      {
        name: "title",
        labelText: i18nString7(UIStrings7.profileName),
        inputType: "text",
        placeholder: "",
        validator: titleValidator,
        isOptional: false
      },
      {
        name: "download",
        labelText: i18nString7(UIStrings7.download),
        inputType: "text",
        placeholder: i18n13.i18n.lockedString("kbit/s"),
        validator: throughputValidator
      },
      {
        name: "upload",
        labelText: i18nString7(UIStrings7.upload),
        inputType: "text",
        placeholder: i18n13.i18n.lockedString("kbit/s"),
        validator: throughputValidator
      },
      {
        name: "latency",
        labelText: i18nString7(UIStrings7.latency),
        inputType: "text",
        placeholder: i18n13.i18n.lockedString("ms"),
        validator: latencyValidator
      },
      {
        name: "packetLoss",
        labelText: i18nString7(UIStrings7.packetLoss),
        inputType: "text",
        placeholder: i18n13.i18n.lockedString("percent"),
        validator: packetLossValidator
      },
      {
        name: "packetQueueLength",
        labelText: i18nString7(UIStrings7.packetQueueLength),
        inputType: "text",
        placeholder: i18nString7(UIStrings7.packet),
        validator: packetQueueLengthValidator
      },
      {
        name: "packetReordering",
        labelText: i18nString7(UIStrings7.packetReordering),
        inputType: "checkbox",
        placeholder: "",
        validator: packetReorderingValidator,
        isOptional: false
      }
    ];
    const editor = new UI4.ListWidget.Editor();
    this.editor = editor;
    const content = editor.contentElement();
    const settingsContainer = content.createChild("div", "settings-container");
    const createSettingField = (name, labelText, inputType, placeholder, validator, isOptional = true) => {
      const settingElement = settingsContainer.createChild("div", "setting");
      const titleContainer = settingElement.createChild("div");
      titleContainer.textContent = labelText;
      const inputElement = settingElement.createChild("div");
      const input = editor.createInput(name, inputType, placeholder, validator);
      input.classList.add("input");
      UI4.ARIAUtils.setLabel(input, labelText);
      inputElement.appendChild(input);
      const optionalTextElement = inputElement.createChild("div");
      const optionalStr = i18nString7(UIStrings7.optional);
      optionalTextElement.textContent = optionalStr;
      UI4.ARIAUtils.setDescription(input, optionalStr);
      if (!isOptional) {
        optionalTextElement.style.visibility = "hidden";
      }
    };
    settings.forEach((setting) => {
      createSettingField(setting.name, setting.labelText, setting.inputType, setting.placeholder, setting.validator, setting.isOptional);
    });
    return editor;
    function titleValidator(_item, _index, input) {
      const maxLength = 49;
      const value = input.value.trim();
      const valid = value.length > 0 && value.length <= maxLength;
      if (!valid) {
        const errorMessage = i18nString7(UIStrings7.profileNameCharactersLengthMust, { PH1: maxLength });
        return { valid, errorMessage };
      }
      return { valid, errorMessage: void 0 };
    }
    function throughputValidator(_item, _index, input) {
      const minThroughput = 0;
      const maxThroughput = 1e7;
      const value = input.value.trim();
      const parsedValue = Number(value);
      const throughput = input.getAttribute("aria-label");
      const valid = !Number.isNaN(parsedValue) && parsedValue >= minThroughput && parsedValue <= maxThroughput;
      if (!valid) {
        const errorMessage = i18nString7(UIStrings7.sMustBeANumberBetweenSkbsToSkbs, { PH1: String(throughput), PH2: minThroughput, PH3: maxThroughput });
        return { valid, errorMessage };
      }
      return { valid, errorMessage: void 0 };
    }
    function latencyValidator(_item, _index, input) {
      const minLatency = 0;
      const maxLatency = 1e6;
      const value = input.value.trim();
      const parsedValue = Number(value);
      const valid = Number.isInteger(parsedValue) && parsedValue >= minLatency && parsedValue <= maxLatency;
      if (!valid) {
        const errorMessage = i18nString7(UIStrings7.latencyMustBeAnIntegerBetweenSms, { PH1: minLatency, PH2: maxLatency });
        return { valid, errorMessage };
      }
      return { valid, errorMessage: void 0 };
    }
    function packetLossValidator(_item, _index, input) {
      const minPacketLoss = 0;
      const maxPacketLoss = 100;
      const value = input.value.trim();
      const parsedValue = Number(value);
      const valid = parsedValue >= minPacketLoss && parsedValue <= maxPacketLoss;
      if (!valid) {
        const errorMessage = i18nString7(UIStrings7.packetLossMustBeAnIntegerBetweenSpct, { PH1: minPacketLoss, PH2: maxPacketLoss });
        return { valid, errorMessage };
      }
      return { valid, errorMessage: void 0 };
    }
    function packetQueueLengthValidator(_item, _index, input) {
      const minPacketQueueLength = 0;
      const value = input.value.trim();
      const parsedValue = Number(value);
      const valid = parsedValue >= minPacketQueueLength;
      if (!valid) {
        const errorMessage = i18nString7(UIStrings7.packetQueueLengthMustBeAnIntegerGreaterOrEqualToZero);
        return { valid, errorMessage };
      }
      return { valid, errorMessage: void 0 };
    }
    function packetReorderingValidator(_item, _index, _input) {
      return { valid: true, errorMessage: void 0 };
    }
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
  MobileThrottlingSelector_exports as MobileThrottlingSelector,
  NetworkPanelIndicator_exports as NetworkPanelIndicator,
  NetworkThrottlingSelector_exports as NetworkThrottlingSelector,
  ThrottlingManager_exports as ThrottlingManager,
  ThrottlingPresets_exports as ThrottlingPresets,
  ThrottlingSettingsTab_exports as ThrottlingSettingsTab
};
//# sourceMappingURL=mobile_throttling.js.map
