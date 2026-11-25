var __defProp = Object.defineProperty;
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};

// ../../front_end/models/devtools_state/providers/CPUThrottlingStateProvider.ts
var CPUThrottlingStateProvider_exports = {};
__export(CPUThrottlingStateProvider_exports, {
  CPUThrottlingStateProvider: () => CPUThrottlingStateProvider
});
import * as Common from "../../core/common/common.js";
import * as SDK from "../../core/sdk/sdk.js";

// ../../front_end/models/devtools_state/State.ts
var State_exports = {};
__export(State_exports, {
  Events: () => Events,
  StateKind: () => StateKind
});
var StateKind = /* @__PURE__ */ ((StateKind2) => {
  StateKind2["CPU_THROTTLING"] = "cpu-throttling";
  StateKind2["CACHE_DISABLED"] = "cache-disabled";
  StateKind2["JAVASCRIPT_DISABLED"] = "java-script-disabled";
  return StateKind2;
})(StateKind || {});
var Events = /* @__PURE__ */ ((Events2) => {
  Events2["STATE_CHANGED"] = "StateChanged";
  return Events2;
})(Events || {});

// ../../front_end/models/devtools_state/providers/CPUThrottlingStateProvider.ts
var NO_CPU_THROTTLING_RATE = 1;
var CPUThrottlingStateProvider = class extends Common.ObjectWrapper.ObjectWrapper {
  #cpuThrottlingManager;
  #eventListeners;
  constructor(cpuThrottlingManager) {
    super();
    this.#cpuThrottlingManager = cpuThrottlingManager;
    this.#eventListeners = [
      this.#cpuThrottlingManager.addEventListener(
        SDK.CPUThrottlingManager.Events.RATE_CHANGED,
        () => {
          this.dispatchEventToListeners(
            "StateChanged" /* STATE_CHANGED */,
            this.#toState()
          );
        }
      )
    ];
  }
  allStates() {
    return [this.#toState()];
  }
  async reveal(kind) {
    if (kind === "cpu-throttling" /* CPU_THROTTLING */) {
      await Common.Revealer.reveal(this.#cpuThrottlingManager);
    }
  }
  reset(kind) {
    if (kind === "cpu-throttling" /* CPU_THROTTLING */ && this.#cpuThrottlingManager.cpuThrottlingRate() !== NO_CPU_THROTTLING_RATE) {
      this.#cpuThrottlingManager.setCPUThrottlingRate(NO_CPU_THROTTLING_RATE);
    }
  }
  #toState() {
    const rate = this.#cpuThrottlingManager.cpuThrottlingRate();
    return {
      kind: "cpu-throttling" /* CPU_THROTTLING */,
      value: rate,
      isDefault: rate === NO_CPU_THROTTLING_RATE
    };
  }
  dispose() {
    Common.EventTarget.removeEventListeners(this.#eventListeners);
  }
};

// ../../front_end/models/devtools_state/providers/SettingsStateProvider.ts
var SettingsStateProvider_exports = {};
__export(SettingsStateProvider_exports, {
  SettingsStateProvider: () => SettingsStateProvider
});
import * as Common2 from "../../core/common/common.js";
import * as SDK2 from "../../core/sdk/sdk.js";
var TRACKED_SETTINGS = [
  { kind: "cache-disabled" /* CACHE_DISABLED */, descriptor: SDK2.SDKSettings.cacheDisabledSettingDescriptor },
  { kind: "java-script-disabled" /* JAVASCRIPT_DISABLED */, descriptor: SDK2.SDKSettings.javaScriptDisabledSettingDescriptor }
];
var TRACKED_SETTINGS_BY_NAME = new Map(TRACKED_SETTINGS.map((entry) => [entry.descriptor.name, entry]));
var SettingsStateProvider = class extends Common2.ObjectWrapper.ObjectWrapper {
  #settings;
  #eventListeners;
  constructor(settings) {
    super();
    this.#settings = settings;
    this.#eventListeners = [
      this.#settings.addChangeListener((event) => {
        const entry = TRACKED_SETTINGS_BY_NAME.get(event.data.name);
        if (!entry) {
          return;
        }
        this.dispatchEventToListeners("StateChanged" /* STATE_CHANGED */, this.#toState(entry));
      })
    ];
  }
  allStates() {
    return TRACKED_SETTINGS.map((entry) => this.#toState(entry));
  }
  async reveal(kind) {
    for (const entry of TRACKED_SETTINGS) {
      if (entry.kind === kind) {
        await Common2.Revealer.reveal(this.#settings.resolve(entry.descriptor));
      }
    }
  }
  reset(kind) {
    for (const entry of TRACKED_SETTINGS) {
      if (entry.kind === kind) {
        const setting = this.#settings.resolve(entry.descriptor);
        if (setting.get() !== setting.defaultValue) {
          setting.set(setting.defaultValue);
        }
        return;
      }
    }
  }
  #toState(entry) {
    const setting = this.#settings.resolve(entry.descriptor);
    const value = setting.get();
    return {
      kind: entry.kind,
      value,
      isDefault: value === setting.defaultValue
    };
  }
  dispose() {
    Common2.EventTarget.removeEventListeners(this.#eventListeners);
  }
};

// ../../front_end/models/devtools_state/StateManager.ts
var StateManager_exports = {};
__export(StateManager_exports, {
  StateManager: () => StateManager
});
import * as Common3 from "../../core/common/common.js";
var StateManager = class extends Common3.ObjectWrapper.ObjectWrapper {
  #providers;
  #eventListeners;
  constructor(providers) {
    super();
    this.#providers = providers;
    this.#eventListeners = providers.map(
      (provider) => provider.addEventListener(
        "StateChanged" /* STATE_CHANGED */,
        (event) => this.dispatchEventToListeners("StateChanged" /* STATE_CHANGED */, event.data)
      )
    );
  }
  state(kind) {
    return this.allStates().find((state) => state.kind === kind) ?? null;
  }
  allStates() {
    return this.#providers.flatMap((provider) => provider.allStates());
  }
  nonDefaultStates() {
    return this.allStates().filter((state) => !state.isDefault);
  }
  async reveal(kind) {
    for (const provider of this.#providers) {
      await provider.reveal(kind);
    }
  }
  reset(kind) {
    for (const provider of this.#providers) {
      provider.reset(kind);
    }
  }
  dispose() {
    Common3.EventTarget.removeEventListeners(this.#eventListeners);
    for (const provider of this.#providers) {
      provider.dispose();
    }
  }
};
export {
  CPUThrottlingStateProvider_exports as CPUThrottlingStateProvider,
  SettingsStateProvider_exports as SettingsStateProvider,
  State_exports as State,
  StateManager_exports as StateManager
};
//# sourceMappingURL=devtools_state.js.map
