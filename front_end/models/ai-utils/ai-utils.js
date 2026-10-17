var __defProp = Object.defineProperty;
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};

// ../../front_end/models/ai-utils/AiHistoryStorage.ts
var AiHistoryStorage_exports = {};
__export(AiHistoryStorage_exports, {
  AiHistoryStorage: () => AiHistoryStorage,
  ConversationType: () => ConversationType,
  Events: () => Events,
  MAX_CONVERSATIONS_COUNT: () => MAX_CONVERSATIONS_COUNT,
  MAX_RECENT_PROMPTS_COUNT: () => MAX_RECENT_PROMPTS_COUNT,
  RECENT_PROMPTS_SIZE_LIMIT: () => RECENT_PROMPTS_SIZE_LIMIT
});
import * as Common from "../../core/common/common.js";
import * as Root from "../../core/root/root.js";
var ConversationType = /* @__PURE__ */ ((ConversationType2) => {
  ConversationType2["NONE"] = "none";
  ConversationType2["STYLING"] = "freestyler";
  ConversationType2["FILE"] = "drjones-file";
  ConversationType2["NETWORK"] = "drjones-network-request";
  ConversationType2["PERFORMANCE"] = "drjones-performance-full";
  ConversationType2["ACCESSIBILITY"] = "accessibility";
  ConversationType2["STORAGE"] = "storage";
  return ConversationType2;
})(ConversationType || {});
var DEFAULT_MAX_STORAGE_SIZE = 50 * 1024 * 1024;
var MAX_RECENT_PROMPTS_COUNT = 20;
var MAX_CONVERSATIONS_COUNT = 50;
var RECENT_PROMPTS_SIZE_LIMIT = 100 * 1024;
var Events = /* @__PURE__ */ ((Events4) => {
  Events4["HISTORY_DELETED"] = "AiHistoryDeleted";
  return Events4;
})(Events || {});
var AiHistoryStorage = class _AiHistoryStorage extends Common.ObjectWrapper.ObjectWrapper {
  #historySetting;
  #imageHistorySettings;
  #recentPromptsSetting;
  #mutex = new Common.Mutex.Mutex();
  #maxStorageSize;
  constructor(settings = Common.Settings.Settings.instance(), maxStorageSize = DEFAULT_MAX_STORAGE_SIZE) {
    super();
    this.#historySetting = settings.createSetting("ai-assistance-history-entries", []);
    this.#imageHistorySettings = settings.createSetting(
      "ai-assistance-history-images",
      []
    );
    this.#recentPromptsSetting = settings.createSetting("ai-assistance-recent-prompts", []);
    this.#maxStorageSize = maxStorageSize;
  }
  clearForTest() {
    this.#historySetting.set([]);
    this.#imageHistorySettings.set([]);
    this.#recentPromptsSetting.set([]);
  }
  async addRecentPrompt(prompt) {
    if (!prompt.trim()) {
      return;
    }
    const release = await this.#mutex.acquire();
    try {
      const recentPrompts = await this.#recentPromptsSetting.forceGet();
      const updatedPrompts = [prompt, ...recentPrompts.filter((p) => p !== prompt)];
      const promptsToBeStored = [];
      let currentStorageSize = 0;
      for (const p of updatedPrompts) {
        if (promptsToBeStored.length >= MAX_RECENT_PROMPTS_COUNT) {
          break;
        }
        if (currentStorageSize + p.length > RECENT_PROMPTS_SIZE_LIMIT) {
          break;
        }
        currentStorageSize += p.length;
        promptsToBeStored.push(p);
      }
      this.#recentPromptsSetting.set(promptsToBeStored);
    } finally {
      release();
    }
  }
  getRecentPrompts() {
    return structuredClone(this.#recentPromptsSetting.get());
  }
  #getImageIdsFromHistory(history) {
    return history.flatMap((item) => {
      if (item.type === "user-query" && typeof item.imageId === "string" && item.imageId) {
        return [item.imageId];
      }
      return [];
    });
  }
  async upsertHistoryEntry(agentEntry) {
    const release = await this.#mutex.acquire();
    try {
      const history = structuredClone(await this.#historySetting.forceGet());
      const historyEntryIndex = history.findIndex((entry) => entry.id === agentEntry.id);
      if (historyEntryIndex !== -1) {
        history[historyEntryIndex] = agentEntry;
      } else {
        history.push(agentEntry);
      }
      const imageIdsForDeletion = [];
      while (history.length > MAX_CONVERSATIONS_COUNT) {
        const evicted = history.shift();
        if (evicted) {
          imageIdsForDeletion.push(...this.#getImageIdsFromHistory(evicted.history));
        }
      }
      if (imageIdsForDeletion.length > 0) {
        const images = structuredClone(await this.#imageHistorySettings.forceGet());
        this.#imageHistorySettings.set(images.filter((entry) => !imageIdsForDeletion.includes(entry.id)));
      }
      this.#historySetting.set(history);
    } finally {
      release();
    }
  }
  async upsertImage(image) {
    const release = await this.#mutex.acquire();
    try {
      const imageHistory = structuredClone(await this.#imageHistorySettings.forceGet());
      const imageHistoryEntryIndex = imageHistory.findIndex((entry) => entry.id === image.id);
      if (imageHistoryEntryIndex !== -1) {
        imageHistory[imageHistoryEntryIndex] = image;
      } else {
        imageHistory.push(image);
      }
      const imagesToBeStored = [];
      let currentStorageSize = 0;
      for (const [, serializedImage] of Array.from(
        imageHistory.entries()
      ).reverse()) {
        if (currentStorageSize >= this.#maxStorageSize) {
          break;
        }
        currentStorageSize += serializedImage.data.length;
        imagesToBeStored.push(serializedImage);
      }
      this.#imageHistorySettings.set(imagesToBeStored.reverse());
    } finally {
      release();
    }
  }
  async deleteHistoryEntry(id) {
    const release = await this.#mutex.acquire();
    try {
      const history = structuredClone(await this.#historySetting.forceGet());
      const conversation = history.find((entry) => entry.id === id);
      if (!conversation) {
        return;
      }
      const imageIdsForDeletion = this.#getImageIdsFromHistory(conversation.history);
      this.#historySetting.set(
        history.filter((entry) => entry.id !== id)
      );
      if (imageIdsForDeletion.length > 0) {
        const images = structuredClone(await this.#imageHistorySettings.forceGet());
        this.#imageHistorySettings.set(images.filter((entry) => !imageIdsForDeletion.includes(entry.id)));
      }
    } finally {
      release();
    }
  }
  async deleteAll() {
    const release = await this.#mutex.acquire();
    try {
      this.#historySetting.set([]);
      this.#imageHistorySettings.set([]);
      this.#recentPromptsSetting.set([]);
    } finally {
      release();
      this.dispatchEventToListeners("AiHistoryDeleted" /* HISTORY_DELETED */);
    }
  }
  getHistory() {
    return structuredClone(this.#historySetting.get());
  }
  getImageHistory() {
    return structuredClone(this.#imageHistorySettings.get());
  }
  static instance(opts = { forceNew: false, maxStorageSize: DEFAULT_MAX_STORAGE_SIZE }) {
    const { forceNew, maxStorageSize, settings } = opts;
    if (!Root.DevToolsContext.globalInstance().has(_AiHistoryStorage) || forceNew) {
      Root.DevToolsContext.globalInstance().set(
        _AiHistoryStorage,
        new _AiHistoryStorage(
          // eslint-disable-next-line @devtools/no-instance-of-migrated-singletons
          settings ?? Common.Settings.Settings.instance(),
          maxStorageSize
        )
      );
    }
    return Root.DevToolsContext.globalInstance().get(_AiHistoryStorage);
  }
  static removeInstance() {
    Root.DevToolsContext.globalInstance().delete(_AiHistoryStorage);
  }
};

// ../../front_end/models/ai-utils/AiSetting.ts
var AiSetting_exports = {};
__export(AiSetting_exports, {
  AiSetting: () => AiSetting,
  Events: () => Events2
});
import * as Common2 from "../../core/common/common.js";
import * as Host from "../../core/host/host.js";
import * as Root2 from "../../core/root/root.js";
var Events2 = /* @__PURE__ */ ((Events4) => {
  Events4["CHANGED"] = "Changed";
  return Events4;
})(Events2 || {});
var AiSetting = class extends Common2.ObjectWrapper.ObjectWrapper {
  #setting;
  #descriptor;
  #hostConfigTracker;
  #settings;
  #boundOnSettingChanged = this.#onSettingChanged.bind(this);
  #boundOnAidaAvailabilityChanged = this.#onAidaAvailabilityChanged.bind(this);
  #isSubscribed = false;
  constructor(descriptor, hostConfigTracker, settings) {
    super();
    this.#descriptor = descriptor;
    this.#hostConfigTracker = hostConfigTracker;
    this.#settings = settings;
    this.#tryResolveSetting();
  }
  addEventListener(eventType, listener, thisObject) {
    const isFirst = !this.hasEventListeners(eventType);
    const descriptor = super.addEventListener(eventType, listener, thisObject);
    if (isFirst) {
      this.#subscribe();
    }
    return descriptor;
  }
  removeEventListener(eventType, listener, thisObject) {
    super.removeEventListener(eventType, listener, thisObject);
    if (!this.hasEventListeners(eventType)) {
      this.#unsubscribe();
    }
  }
  #subscribe() {
    if (this.#isSubscribed) {
      return;
    }
    this.#tryResolveSetting();
    this.#isSubscribed = true;
    this.#hostConfigTracker.addEventListener(
      Host.AidaClient.Events.AIDA_AVAILABILITY_CHANGED,
      this.#boundOnAidaAvailabilityChanged
    );
    this.#setting?.addChangeListener(this.#boundOnSettingChanged);
  }
  #unsubscribe() {
    if (!this.#isSubscribed) {
      return;
    }
    this.#isSubscribed = false;
    this.#hostConfigTracker.removeEventListener(
      Host.AidaClient.Events.AIDA_AVAILABILITY_CHANGED,
      this.#boundOnAidaAvailabilityChanged
    );
    this.#setting?.removeChangeListener(this.#boundOnSettingChanged);
  }
  #tryResolveSetting() {
    const result = this.#settings.maybeResolve(this.#descriptor);
    if ("setting" in result) {
      if (this.#setting !== result.setting) {
        if (this.#setting && this.#isSubscribed) {
          this.#setting.removeChangeListener(this.#boundOnSettingChanged);
        }
        this.#setting = result.setting;
        if (this.#isSubscribed) {
          this.#setting.addChangeListener(this.#boundOnSettingChanged);
        }
      }
    } else if (this.#setting) {
      if (this.#isSubscribed) {
        this.#setting.removeChangeListener(this.#boundOnSettingChanged);
      }
      this.#setting = void 0;
    }
  }
  get unavailable() {
    const availability = this.#descriptor.isAvailable(Root2.Runtime.hostConfig);
    return availability.status === Common2.Settings.SettingAvailability.UNAVAILABLE;
  }
  get disabled() {
    const availability = this.#descriptor.isAvailable(Root2.Runtime.hostConfig);
    return availability.status === Common2.Settings.SettingAvailability.DISABLED;
  }
  get disabledReasons() {
    const availability = this.#descriptor.isAvailable(Root2.Runtime.hostConfig);
    if (availability.status === Common2.Settings.SettingAvailability.DISABLED) {
      return availability.reason;
    }
    return [];
  }
  getIfNotDisabled() {
    if (this.disabled || this.unavailable) {
      return void 0;
    }
    this.#tryResolveSetting();
    return this.#setting?.get();
  }
  setIfNotDisabled(value) {
    if (this.disabled || this.unavailable) {
      return;
    }
    this.#tryResolveSetting();
    this.#setting?.set(value);
  }
  get() {
    return this.getIfNotDisabled();
  }
  set(value) {
    this.setIfNotDisabled(value);
  }
  #onSettingChanged() {
    this.dispatchEventToListeners("Changed" /* CHANGED */);
  }
  #onAidaAvailabilityChanged() {
    this.#tryResolveSetting();
    this.dispatchEventToListeners("Changed" /* CHANGED */);
  }
};

// ../../front_end/models/ai-utils/AiUtils.ts
var AiUtils_exports = {};
__export(AiUtils_exports, {
  DisabledReason: () => DisabledReason,
  FrontendAccessPrecondition: () => FrontendAccessPrecondition,
  REPORT_LEGAL_ISSUE_URL: () => REPORT_LEGAL_ISSUE_URL,
  aiAssistanceEnabledSettingDescriptor: () => aiAssistanceEnabledSettingDescriptor,
  aiAssistanceV2OptInChangeDialogSeenSettingDescriptor: () => aiAssistanceV2OptInChangeDialogSeenSettingDescriptor,
  consoleInsightsEnabledSettingDescriptor: () => consoleInsightsEnabledSettingDescriptor,
  getDisabledReasons: () => getDisabledReasons,
  getIconName: () => getIconName,
  isAiV2Enabled: () => isAiV2Enabled,
  isContextSelectionEnabled: () => isContextSelectionEnabled,
  isGeminiBranding: () => isGeminiBranding,
  isNaturalLanguageInterfaceEnabled: () => isNaturalLanguageInterfaceEnabled,
  runOneShotPrompt: () => runOneShotPrompt
});
import * as Common3 from "../../core/common/common.js";
import * as Host2 from "../../core/host/host.js";
import * as i18n from "../../core/i18n/i18n.js";
import * as Root3 from "../../core/root/root.js";

// ../../front_end/models/ai-utils/debug.ts
var debug_exports = {};
__export(debug_exports, {
  debugLog: () => debugLog,
  isDebugMode: () => isDebugMode,
  isStructuredLogEnabled: () => isStructuredLogEnabled
});
function isDebugMode() {
  try {
    return Boolean(localStorage.getItem("debugAiAssistancePanelEnabled"));
  } catch {
    return false;
  }
}
function isStructuredLogEnabled() {
  try {
    return Boolean(localStorage.getItem("aiAssistanceStructuredLogEnabled"));
  } catch {
    return false;
  }
}
function debugLog(...log) {
  if (!isDebugMode()) {
    return;
  }
  console.log(...log);
}
function setDebugAiAssistanceEnabled(enabled) {
  if (enabled) {
    localStorage.setItem("debugAiAssistancePanelEnabled", "true");
  } else {
    localStorage.removeItem("debugAiAssistancePanelEnabled");
  }
  setAiAssistanceStructuredLogEnabled(enabled);
}
globalThis.setDebugAiAssistanceEnabled = setDebugAiAssistanceEnabled;
function setAiAssistanceStructuredLogEnabled(enabled) {
  if (enabled) {
    localStorage.setItem("aiAssistanceStructuredLogEnabled", "true");
  } else {
    localStorage.removeItem("aiAssistanceStructuredLogEnabled");
  }
}
globalThis.setAiAssistanceStructuredLogEnabled = setAiAssistanceStructuredLogEnabled;

// ../../front_end/models/ai-utils/AiUtils.ts
var REPORT_LEGAL_ISSUE_URL = "https://support.google.com/legal/troubleshooter/1114905?hl=en#ts=1115658%2C13380504";
var DisabledReason = /* @__PURE__ */ ((DisabledReason2) => {
  DisabledReason2["GEO_RESTRICTED"] = "geo-restricted";
  DisabledReason2["POLICY_RESTRICTED"] = "policy-restricted";
  DisabledReason2["WRONG_LOCALE"] = "wrong-locale";
  DisabledReason2["NOT_SUPPORTED"] = "not-supported";
  return DisabledReason2;
})(DisabledReason || {});
function isLocaleRestricted() {
  try {
    const devtoolsLocale = i18n.DevToolsLocale.DevToolsLocale.instance();
    return !devtoolsLocale.locale.startsWith("en-");
  } catch {
    return false;
  }
}
function isGeoRestricted(config) {
  return config?.aidaAvailability?.blockedByGeo === true;
}
function isPolicyRestricted(config) {
  return config?.aidaAvailability?.blockedByEnterprisePolicy === true;
}
function isConsoleInsightsFeatureEnabled(config) {
  return config?.aidaAvailability?.enabled !== false && config?.devToolsConsoleInsights?.enabled === true;
}
var consoleInsightsEnabledSettingDescriptor = {
  name: "console-insights-enabled",
  type: Common3.Settings.SettingType.BOOLEAN,
  defaultValue: false,
  isAvailable: (config) => {
    if (!isConsoleInsightsFeatureEnabled(config)) {
      return {
        status: Common3.Settings.SettingAvailability.UNAVAILABLE,
        reason: ["not-supported" /* NOT_SUPPORTED */]
      };
    }
    const reasons = [];
    if (isGeoRestricted(config)) {
      reasons.push("geo-restricted" /* GEO_RESTRICTED */);
    }
    if (isPolicyRestricted(config)) {
      reasons.push("policy-restricted" /* POLICY_RESTRICTED */);
    }
    if (isLocaleRestricted()) {
      reasons.push("wrong-locale" /* WRONG_LOCALE */);
    }
    if (reasons.length > 0) {
      return {
        status: Common3.Settings.SettingAvailability.DISABLED,
        reason: reasons
      };
    }
    return {
      status: Common3.Settings.SettingAvailability.AVAILABLE
    };
  }
};
function isAiAssistanceFeatureAvailable(config) {
  return Boolean(config?.aidaAvailability?.enabled && (config?.devToolsFreestyler?.enabled || config?.devToolsAiAssistanceNetworkAgent?.enabled || config?.devToolsAiAssistancePerformanceAgent?.enabled || config?.devToolsAiAssistanceFileAgent?.enabled || config?.devToolsAiAssistanceStorageAgent?.enabled));
}
var aiAssistanceEnabledSettingDescriptor = {
  name: "ai-assistance-enabled",
  type: Common3.Settings.SettingType.BOOLEAN,
  defaultValue: false,
  isAvailable: (config) => {
    if (!isAiAssistanceFeatureAvailable(config)) {
      return {
        status: Common3.Settings.SettingAvailability.UNAVAILABLE,
        reason: ["not-supported" /* NOT_SUPPORTED */]
      };
    }
    const reasons = [];
    if (isGeoRestricted(config)) {
      reasons.push("geo-restricted" /* GEO_RESTRICTED */);
    }
    if (isPolicyRestricted(config)) {
      reasons.push("policy-restricted" /* POLICY_RESTRICTED */);
    }
    if (isLocaleRestricted()) {
      reasons.push("wrong-locale" /* WRONG_LOCALE */);
    }
    if (reasons.length > 0) {
      return {
        status: Common3.Settings.SettingAvailability.DISABLED,
        reason: reasons
      };
    }
    return {
      status: Common3.Settings.SettingAvailability.AVAILABLE
    };
  }
};
var aiAssistanceV2OptInChangeDialogSeenSettingDescriptor = {
  name: "ai-assistance-v2-opt-in-change-dialog-seen",
  type: Common3.Settings.SettingType.BOOLEAN,
  defaultValue: false
};
function isGeminiBranding() {
  return !!Root3.Runtime.hostConfig.devToolsGeminiRebranding?.enabled;
}
function isNaturalLanguageInterfaceEnabled() {
  return Boolean(Root3.Runtime.hostConfig.devToolsAiNaturalLanguageInterface?.enabled);
}
function isAiV2Enabled() {
  return Boolean(Root3.Runtime.hostConfig.devToolsAiV2Architecture?.enabled);
}
function isContextSelectionEnabled() {
  return Boolean(Root3.Runtime.hostConfig.devToolsAiAssistanceContextSelectionAgent?.enabled) || isAiV2Enabled();
}
var FrontendAccessPrecondition = /* @__PURE__ */ ((FrontendAccessPrecondition2) => {
  FrontendAccessPrecondition2["IS_OFF_THE_RECORD"] = "is-off-the-record";
  FrontendAccessPrecondition2["AGE_RESTRICTED"] = "age-restricted";
  return FrontendAccessPrecondition2;
})(FrontendAccessPrecondition || {});
function getDisabledReasons(aidaAvailability) {
  const reasons = [];
  if (Root3.Runtime.hostConfig.isOffTheRecord) {
    reasons.push("is-off-the-record" /* IS_OFF_THE_RECORD */);
  }
  if (aidaAvailability !== Host2.AidaClient.AidaAccessPreconditions.AVAILABLE) {
    reasons.push(aidaAvailability);
  }
  if ((aidaAvailability === Host2.AidaClient.AidaAccessPreconditions.AVAILABLE || aidaAvailability === Host2.AidaClient.AidaAccessPreconditions.NO_INTERNET) && Root3.Runtime.hostConfig?.aidaAvailability?.blockedByAge === true) {
    reasons.push("age-restricted" /* AGE_RESTRICTED */);
  }
  return reasons;
}
function getIconName() {
  return isGeminiBranding() ? "spark" : "smart-assistant";
}
async function runOneShotPrompt({
  aidaClient,
  preamble,
  query,
  clientFeature,
  temperature,
  modelId,
  userTier,
  serverSideLoggingEnabled,
  signal
}) {
  const chromeVersion = Root3.Runtime.getChromeVersion();
  if (!chromeVersion) {
    throw new Error("Cannot determine Chrome version");
  }
  const disallowLogging = !serverSideLoggingEnabled;
  const sessionId = crypto.randomUUID();
  const userTierEnum = Host2.AidaClient.convertToUserTierEnum(userTier);
  const finalPreamble = userTierEnum === Host2.AidaClient.UserTier.TESTERS ? preamble : void 0;
  const request = {
    client: Host2.AidaClient.CLIENT_NAME,
    current_message: {
      parts: [{ text: query }],
      role: Host2.AidaClient.Role.USER
    },
    preamble: finalPreamble,
    options: {
      temperature: typeof temperature === "number" && temperature >= 0 ? temperature : void 0,
      model_id: modelId || void 0
    },
    metadata: {
      disable_user_content_logging: disallowLogging,
      string_session_id: sessionId,
      user_tier: userTierEnum,
      client_version: chromeVersion
    },
    functionality_type: Host2.AidaClient.FunctionalityType.CHAT,
    client_feature: clientFeature
  };
  let textResponse = "";
  try {
    for await (const response of aidaClient.doConversation(request, { signal })) {
      if (response.explanation) {
        textResponse = response.explanation;
      }
    }
  } catch (err) {
    debugLog("Error calling AIDA for one-shot prompt", err);
    throw err;
  }
  return textResponse;
}

// ../../front_end/models/ai-utils/BuiltInAi.ts
var BuiltInAi_exports = {};
__export(BuiltInAi_exports, {
  BuiltInAi: () => BuiltInAi,
  Events: () => Events3,
  LanguageModelAvailability: () => LanguageModelAvailability
});
import * as Common4 from "../../core/common/common.js";
import * as Host3 from "../../core/host/host.js";
import * as Root4 from "../../core/root/root.js";
var LanguageModelAvailability = /* @__PURE__ */ ((LanguageModelAvailability2) => {
  LanguageModelAvailability2["UNAVAILABLE"] = "unavailable";
  LanguageModelAvailability2["DOWNLOADABLE"] = "downloadable";
  LanguageModelAvailability2["DOWNLOADING"] = "downloading";
  LanguageModelAvailability2["AVAILABLE"] = "available";
  LanguageModelAvailability2["DISABLED"] = "disabled";
  return LanguageModelAvailability2;
})(LanguageModelAvailability || {});
var BuiltInAi = class _BuiltInAi extends Common4.ObjectWrapper.ObjectWrapper {
  #availability = null;
  #hasGpu;
  #consoleInsightsSession;
  initDoneForTesting;
  #downloadProgress = null;
  #currentlyCreatingSession = false;
  static instance() {
    if (!Root4.DevToolsContext.globalInstance().has(_BuiltInAi)) {
      Root4.DevToolsContext.globalInstance().set(_BuiltInAi, new _BuiltInAi());
    }
    return Root4.DevToolsContext.globalInstance().get(_BuiltInAi);
  }
  constructor() {
    super();
    this.#hasGpu = this.#isGpuAvailable();
    this.initDoneForTesting = this.getLanguageModelAvailability().then(() => this.#sendAvailabilityMetrics()).then(() => this.initialize());
  }
  async getLanguageModelAvailability() {
    if (!Root4.Runtime.hostConfig.devToolsConsoleInsightsTeasers?.enabled) {
      this.#availability = "disabled" /* DISABLED */;
      return this.#availability;
    }
    try {
      this.#availability = await window.LanguageModel.availability({
        expectedInputs: [{
          type: "text",
          languages: ["en"]
        }],
        expectedOutputs: [{
          type: "text",
          languages: ["en"]
        }]
      });
    } catch {
      this.#availability = "unavailable" /* UNAVAILABLE */;
    }
    return this.#availability;
  }
  isDownloading() {
    return this.#availability === "downloading" /* DOWNLOADING */;
  }
  isEventuallyAvailable() {
    if (!this.#hasGpu && !Boolean(Root4.Runtime.hostConfig.devToolsConsoleInsightsTeasers?.allowWithoutGpu)) {
      return false;
    }
    return this.#availability === "available" /* AVAILABLE */ || this.#availability === "downloading" /* DOWNLOADING */ || this.#availability === "downloadable" /* DOWNLOADABLE */;
  }
  #setDownloadProgress(newValue) {
    this.#downloadProgress = newValue;
    this.dispatchEventToListeners("downloadProgressChanged" /* DOWNLOAD_PROGRESS_CHANGED */, this.#downloadProgress);
  }
  getDownloadProgress() {
    return this.#downloadProgress;
  }
  startDownloadingModel() {
    if (!Root4.Runtime.hostConfig.devToolsConsoleInsightsTeasers?.allowWithoutGpu && !this.#hasGpu) {
      return;
    }
    if (this.#availability !== "downloadable" /* DOWNLOADABLE */) {
      return;
    }
    void this.#createSession();
    setTimeout(() => {
      void this.getLanguageModelAvailability();
    }, 1e3);
  }
  #isGpuAvailable() {
    if (typeof document === "undefined") {
      return false;
    }
    const canvas = document.createElement("canvas");
    try {
      const webgl = canvas.getContext("webgl");
      if (!webgl) {
        return false;
      }
      const debugInfo = webgl.getExtension("WEBGL_debug_renderer_info");
      if (!debugInfo) {
        return false;
      }
      const renderer = webgl.getParameter(debugInfo.UNMASKED_RENDERER_WEBGL);
      if (renderer.includes("SwiftShader")) {
        return false;
      }
    } catch {
      return false;
    }
    return true;
  }
  hasSession() {
    return Boolean(this.#consoleInsightsSession);
  }
  async initialize() {
    if (!Root4.Runtime.hostConfig.devToolsConsoleInsightsTeasers?.allowWithoutGpu && !this.#hasGpu) {
      return;
    }
    if (this.#availability !== "available" /* AVAILABLE */ && this.#availability !== "downloading" /* DOWNLOADING */) {
      return;
    }
    await this.#createSession();
  }
  async #createSession() {
    if (this.#currentlyCreatingSession) {
      return;
    }
    this.#currentlyCreatingSession = true;
    const monitor = (m) => {
      m.addEventListener("downloadprogress", ((e) => {
        this.#setDownloadProgress(e.loaded);
      }));
    };
    try {
      this.#consoleInsightsSession = await window.LanguageModel.create({
        monitor,
        initialPrompts: [{
          role: "system",
          content: `
You are an expert web developer. Your goal is to help a human web developer who
is using Chrome DevTools to debug a web site or web app. The Chrome DevTools
console is showing a message which is either an error or a warning. Please help
the user understand the problematic console message.

Your instructions are as follows:
  - Explain the reason why the error or warning is showing up.
  - The explanation has a maximum length of 200 characters. Anything beyond this
    length will be cut off. Make sure that your explanation is at most 200 characters long.
  - Your explanation should not end in the middle of a sentence.
  - Your explanation should consist of a single paragraph only. Do not include any
    headings or code blocks. Only write a single paragraph of text.
  - Your response should be concise and to the point. Avoid lengthy explanations
    or unnecessary details.
          `
        }],
        expectedInputs: [{
          type: "text",
          languages: ["en"]
        }],
        expectedOutputs: [{
          type: "text",
          languages: ["en"]
        }]
      });
      if (this.#availability !== "available" /* AVAILABLE */) {
        this.dispatchEventToListeners("downloadedAndSessionCreated" /* DOWNLOADED_AND_SESSION_CREATED */);
        void this.getLanguageModelAvailability();
      }
    } catch (e) {
      console.error("Error when creating LanguageModel session", e.message);
    }
    this.#currentlyCreatingSession = false;
  }
  static removeInstance() {
    Root4.DevToolsContext.globalInstance().delete(_BuiltInAi);
  }
  async *getConsoleInsight(prompt, abortController) {
    if (!this.#consoleInsightsSession) {
      return;
    }
    let session = null;
    try {
      session = await this.#consoleInsightsSession.clone();
      const stream = session.promptStreaming(prompt, {
        signal: abortController.signal
      });
      for await (const chunk of stream) {
        yield chunk;
      }
    } finally {
      if (session) {
        session.destroy();
      }
    }
  }
  #sendAvailabilityMetrics() {
    if (this.#hasGpu) {
      switch (this.#availability) {
        case "unavailable" /* UNAVAILABLE */:
          Host3.userMetrics.builtInAiAvailability(Host3.UserMetrics.BuiltInAiAvailability.UNAVAILABLE_HAS_GPU);
          break;
        case "downloadable" /* DOWNLOADABLE */:
          Host3.userMetrics.builtInAiAvailability(Host3.UserMetrics.BuiltInAiAvailability.DOWNLOADABLE_HAS_GPU);
          break;
        case "downloading" /* DOWNLOADING */:
          Host3.userMetrics.builtInAiAvailability(Host3.UserMetrics.BuiltInAiAvailability.DOWNLOADING_HAS_GPU);
          break;
        case "available" /* AVAILABLE */:
          Host3.userMetrics.builtInAiAvailability(Host3.UserMetrics.BuiltInAiAvailability.AVAILABLE_HAS_GPU);
          break;
        case "disabled" /* DISABLED */:
          Host3.userMetrics.builtInAiAvailability(Host3.UserMetrics.BuiltInAiAvailability.DISABLED_HAS_GPU);
          break;
      }
    } else {
      switch (this.#availability) {
        case "unavailable" /* UNAVAILABLE */:
          Host3.userMetrics.builtInAiAvailability(Host3.UserMetrics.BuiltInAiAvailability.UNAVAILABLE_NO_GPU);
          break;
        case "downloadable" /* DOWNLOADABLE */:
          Host3.userMetrics.builtInAiAvailability(Host3.UserMetrics.BuiltInAiAvailability.DOWNLOADABLE_NO_GPU);
          break;
        case "downloading" /* DOWNLOADING */:
          Host3.userMetrics.builtInAiAvailability(Host3.UserMetrics.BuiltInAiAvailability.DOWNLOADING_NO_GPU);
          break;
        case "available" /* AVAILABLE */:
          Host3.userMetrics.builtInAiAvailability(Host3.UserMetrics.BuiltInAiAvailability.AVAILABLE_NO_GPU);
          break;
        case "disabled" /* DISABLED */:
          Host3.userMetrics.builtInAiAvailability(Host3.UserMetrics.BuiltInAiAvailability.DISABLED_NO_GPU);
          break;
      }
    }
  }
};
var Events3 = /* @__PURE__ */ ((Events4) => {
  Events4["DOWNLOAD_PROGRESS_CHANGED"] = "downloadProgressChanged";
  Events4["DOWNLOADED_AND_SESSION_CREATED"] = "downloadedAndSessionCreated";
  return Events4;
})(Events3 || {});
export {
  AiHistoryStorage_exports as AiHistoryStorage,
  AiSetting_exports as AiSetting,
  AiUtils_exports as AiUtils,
  BuiltInAi_exports as BuiltInAi,
  debug_exports as Debug
};
//# sourceMappingURL=ai-utils.js.map
