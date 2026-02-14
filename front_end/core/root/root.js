var __defProp = Object.defineProperty;
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};

// gen/front_end/core/root/DevToolsContext.js
var DevToolsContext_exports = {};
__export(DevToolsContext_exports, {
  DevToolsContext: () => DevToolsContext,
  globalInstance: () => globalInstance,
  setGlobalInstance: () => setGlobalInstance
});
var DevToolsContext = class {
  #instances = /* @__PURE__ */ new Map();
  get(ctor) {
    const instance = this.#instances.get(ctor);
    if (!instance) {
      throw new Error(`No instance for ${ctor.name}. Ensure the bootstrapper creates it.`);
    }
    return instance;
  }
  /** @deprecated Should only be used by existing `instance` accessors. */
  has(ctor) {
    return this.#instances.has(ctor);
  }
  /**
   * @deprecated Should only be used by existing `instance` accessors and the bootstrapper.
   * Exists on the public interface only for migration purposes for now.
   */
  set(ctor, instance) {
    this.#instances.set(ctor, instance);
  }
  /** @deprecated Should only be used by existing `removeInstance` static methods. */
  delete(ctor) {
    this.#instances.delete(ctor);
  }
};
var gInstance = null;
function globalInstance() {
  if (!gInstance) {
    gInstance = new DevToolsContext();
  }
  return gInstance;
}
function setGlobalInstance(context) {
  gInstance = context;
}

// gen/front_end/core/root/ExperimentNames.js
var ExperimentNames_exports = {};
__export(ExperimentNames_exports, {
  ExperimentName: () => ExperimentName
});
var ExperimentName;
(function(ExperimentName2) {
  ExperimentName2["ALL"] = "*";
  ExperimentName2["CAPTURE_NODE_CREATION_STACKS"] = "capture-node-creation-stacks";
  ExperimentName2["LIVE_HEAP_PROFILE"] = "live-heap-profile";
  ExperimentName2["PROTOCOL_MONITOR"] = "protocol-monitor";
  ExperimentName2["SAMPLING_HEAP_PROFILER_TIMELINE"] = "sampling-heap-profiler-timeline";
  ExperimentName2["SHOW_OPTION_TO_EXPOSE_INTERNALS_IN_HEAP_SNAPSHOT"] = "show-option-to-expose-internals-in-heap-snapshot";
  ExperimentName2["TIMELINE_INVALIDATION_TRACKING"] = "timeline-invalidation-tracking";
  ExperimentName2["TIMELINE_SHOW_ALL_EVENTS"] = "timeline-show-all-events";
  ExperimentName2["TIMELINE_V8_RUNTIME_CALL_STATS"] = "timeline-v8-runtime-call-stats";
  ExperimentName2["APCA"] = "apca";
  ExperimentName2["FONT_EDITOR"] = "font-editor";
  ExperimentName2["FULL_ACCESSIBILITY_TREE"] = "full-accessibility-tree";
  ExperimentName2["CONTRAST_ISSUES"] = "contrast-issues";
  ExperimentName2["EXPERIMENTAL_COOKIE_FEATURES"] = "experimental-cookie-features";
  ExperimentName2["INSTRUMENTATION_BREAKPOINTS"] = "instrumentation-breakpoints";
  ExperimentName2["AUTHORED_DEPLOYED_GROUPING"] = "authored-deployed-grouping";
  ExperimentName2["JUST_MY_CODE"] = "just-my-code";
  ExperimentName2["USE_SOURCE_MAP_SCOPES"] = "use-source-map-scopes";
  ExperimentName2["TIMELINE_SHOW_POST_MESSAGE_EVENTS"] = "timeline-show-postmessage-events";
  ExperimentName2["TIMELINE_DEBUG_MODE"] = "timeline-debug-mode";
})(ExperimentName || (ExperimentName = {}));

// gen/front_end/core/root/Runtime.js
var Runtime_exports = {};
__export(Runtime_exports, {
  Experiment: () => Experiment,
  ExperimentsSupport: () => ExperimentsSupport,
  GdpProfilesEnterprisePolicyValue: () => GdpProfilesEnterprisePolicyValue,
  GenAiEnterprisePolicyValue: () => GenAiEnterprisePolicyValue,
  HostConfigFreestylerExecutionMode: () => HostConfigFreestylerExecutionMode,
  HostExperiment: () => HostExperiment,
  Runtime: () => Runtime,
  conditions: () => conditions,
  experiments: () => experiments,
  getChromeVersion: () => getChromeVersion,
  getPathName: () => getPathName,
  getRemoteBase: () => getRemoteBase,
  hostConfig: () => hostConfig,
  isNodeEntry: () => isNodeEntry
});
import * as Platform from "./../platform/platform.js";
var runtimePlatform = "";
var runtimeInstance;
var isNode;
var isTraceAppEntry;
function getRemoteBase(location2 = self.location.toString()) {
  const url = new URL(location2);
  const remoteBase = url.searchParams.get("remoteBase");
  if (!remoteBase) {
    return null;
  }
  const version = /\/serve_file\/(@[0-9a-zA-Z]+)\/?$/.exec(remoteBase);
  if (!version) {
    return null;
  }
  return { base: `devtools://devtools/remote/serve_file/${version[1]}/`, version: version[1] };
}
function getPathName() {
  return window.location.pathname;
}
function isNodeEntry(pathname) {
  const nodeEntryPoints = ["node_app", "js_app"];
  return nodeEntryPoints.some((component) => pathname.includes(component));
}
var getChromeVersion = () => {
  const chromeRegex = /(?:^|\W)(?:Chrome|HeadlessChrome)\/(\S+)/;
  const chromeMatch = navigator.userAgent.match(chromeRegex);
  if (chromeMatch && chromeMatch.length > 1) {
    return chromeMatch[1];
  }
  return "";
};
var Runtime = class _Runtime {
  constructor() {
  }
  static instance(opts = { forceNew: null }) {
    const { forceNew } = opts;
    if (!runtimeInstance || forceNew) {
      runtimeInstance = new _Runtime();
    }
    return runtimeInstance;
  }
  static removeInstance() {
    runtimeInstance = void 0;
  }
  static #queryParamsObject;
  static #getSearchParams() {
    if (!_Runtime.#queryParamsObject && "location" in globalThis) {
      _Runtime.#queryParamsObject = new URLSearchParams(location.search);
    }
    return _Runtime.#queryParamsObject;
  }
  static queryParam(name) {
    return _Runtime.#getSearchParams()?.get(name) ?? null;
  }
  static setQueryParamForTesting(name, value) {
    _Runtime.#getSearchParams()?.set(name, value);
  }
  static isNode() {
    if (isNode === void 0) {
      isNode = isNodeEntry(getPathName());
    }
    return isNode;
  }
  /**
   * Returns true if viewing the slimmed-down devtools meant for just viewing a
   * performance trace, e.g. devtools://devtools/bundled/trace_app.html?traceURL=http://...
   */
  static isTraceApp() {
    if (isTraceAppEntry === void 0) {
      isTraceAppEntry = getPathName().includes("trace_app");
    }
    return isTraceAppEntry;
  }
  static setPlatform(platform) {
    runtimePlatform = platform;
  }
  static platform() {
    return runtimePlatform;
  }
  static isDescriptorEnabled(descriptor) {
    const { experiment } = descriptor;
    if (experiment === "*") {
      return true;
    }
    if (experiment?.startsWith("!")) {
      const experimentName = experiment.substring(1);
      if (experiments.isEnabled(experimentName)) {
        return false;
      }
    }
    if (experiment && !experiment.startsWith("!")) {
      const experimentName = experiment;
      if (!experiments.isEnabled(experimentName)) {
        return false;
      }
    }
    const { condition } = descriptor;
    return condition ? condition(hostConfig) : true;
  }
  loadLegacyModule(modulePath) {
    console.log("Loading legacy module: " + modulePath);
    const importPath = `../../${modulePath}`;
    return import(importPath).then((m) => {
      console.log("Loaded legacy module: " + modulePath);
      return m;
    });
  }
};
var ExperimentsSupport = class {
  #experiments = [];
  #hostExperiments = /* @__PURE__ */ new Map();
  #experimentNames = /* @__PURE__ */ new Set();
  #enabledForTests = /* @__PURE__ */ new Set();
  #enabledByDefault = /* @__PURE__ */ new Set();
  #serverEnabled = /* @__PURE__ */ new Set();
  #storage = new ExperimentStorage();
  allConfigurableExperiments() {
    return [...this.#experiments, ...this.#hostExperiments.values()];
  }
  registerHostExperiment(params) {
    if (this.#isHostExperiment(params.name) || this.#isExperiment(params.name)) {
      throw new Error(`Duplicate registration of experiment '${params.name}'`);
    }
    const hostExperiment = new HostExperiment({ ...params, experiments: this });
    this.#hostExperiments.set(params.name, hostExperiment);
    return hostExperiment;
  }
  register(experimentName, experimentTitle, docLink, feedbackLink) {
    if (this.#isHostExperiment(experimentName) || this.#isExperiment(experimentName)) {
      throw new Error(`Duplicate registration of experiment '${experimentName}'`);
    }
    this.#experimentNames.add(experimentName);
    this.#experiments.push(new Experiment(this, experimentName, experimentTitle, docLink ?? Platform.DevToolsPath.EmptyUrlString, feedbackLink ?? Platform.DevToolsPath.EmptyUrlString));
  }
  isEnabled(experimentName) {
    if (this.#isHostExperiment(experimentName)) {
      return this.#enabledForTests.has(experimentName) || (this.#hostExperiments.get(experimentName)?.isEnabled() ?? false);
    }
    if (this.#isExperiment(experimentName)) {
      if (this.#storage.get(experimentName) === false) {
        return false;
      }
      if (this.#enabledForTests.has(experimentName) || this.#enabledByDefault.has(experimentName)) {
        return true;
      }
      if (this.#serverEnabled.has(experimentName)) {
        return true;
      }
      return Boolean(this.#storage.get(experimentName));
    }
    throw new Error(`Unknown experiment '${experimentName}'`);
  }
  getValueFromStorage(experimentName) {
    return this.#storage.get(experimentName);
  }
  setEnabled(experimentName, enabled) {
    if (this.#isHostExperiment(experimentName)) {
      this.#hostExperiments.get(experimentName)?.setEnabled(enabled);
      return;
    }
    if (this.#isExperiment(experimentName)) {
      this.#storage.set(experimentName, enabled);
      return;
    }
    throw new Error(`Unknown experiment '${experimentName}'`);
  }
  // Only applicable to legacy experiments.
  enableExperimentsByDefault(experimentNames) {
    for (const experimentName of experimentNames) {
      if (!this.#isExperiment(experimentName)) {
        throw new Error(`Unknown (legacy) experiment '${experimentName}'`);
      }
      this.#enabledByDefault.add(experimentName);
    }
  }
  // Only applicable to legacy experiments.
  setServerEnabledExperiments(experiments2) {
    for (const experiment of experiments2) {
      const experimentName = experiment;
      if (!this.#isExperiment(experimentName)) {
        throw new Error(`Unknown (legacy) experiment '${experimentName}'`);
      }
      this.#serverEnabled.add(experimentName);
    }
  }
  enableForTest(experimentName) {
    if (!this.#isHostExperiment(experimentName) && !this.#isExperiment(experimentName)) {
      throw new Error(`Unknown experiment '${experimentName}'`);
    }
    this.#enabledForTests.add(experimentName);
  }
  disableForTest(experimentName) {
    if (!this.#isHostExperiment(experimentName) && !this.#isExperiment(experimentName)) {
      throw new Error(`Unknown experiment '${experimentName}'`);
    }
    this.#enabledForTests.delete(experimentName);
  }
  isEnabledForTest(experimentName) {
    return this.#enabledForTests.has(experimentName);
  }
  clearForTest() {
    this.#experiments = [];
    this.#hostExperiments.clear();
    this.#experimentNames.clear();
    this.#enabledForTests.clear();
    this.#enabledByDefault.clear();
    this.#serverEnabled.clear();
  }
  cleanUpStaleExperiments() {
    this.#storage.cleanUpStaleExperiments(this.#experimentNames);
  }
  #isHostExperiment(experimentName) {
    return this.#hostExperiments.has(experimentName);
  }
  #isExperiment(experimentName) {
    return this.#experimentNames.has(experimentName);
  }
};
var ExperimentStorage = class {
  #experiments = {};
  constructor() {
    try {
      const storedExperiments = self.localStorage?.getItem("experiments");
      if (storedExperiments) {
        this.#experiments = JSON.parse(storedExperiments);
      }
    } catch {
      console.error("Failed to parse localStorage['experiments']");
    }
  }
  /**
   * Experiments are stored with a tri-state:
   *   - true: Explicitly enabled.
   *   - false: Explicitly disabled.
   *   - undefined: Disabled.
   */
  get(experimentName) {
    return this.#experiments[experimentName];
  }
  set(experimentName, enabled) {
    this.#experiments[experimentName] = enabled;
    this.#syncToLocalStorage();
  }
  cleanUpStaleExperiments(validExperiments) {
    for (const [key] of Object.entries(this.#experiments)) {
      if (!validExperiments.has(key)) {
        delete this.#experiments[key];
      }
    }
    this.#syncToLocalStorage();
  }
  #syncToLocalStorage() {
    self.localStorage?.setItem("experiments", JSON.stringify(this.#experiments));
  }
};
var Experiment = class {
  name;
  title;
  docLink;
  feedbackLink;
  #experiments;
  constructor(experiments2, name, title, docLink, feedbackLink) {
    this.name = name;
    this.title = title;
    this.docLink = docLink;
    this.feedbackLink = feedbackLink;
    this.#experiments = experiments2;
  }
  isEnabled() {
    return this.#experiments.isEnabled(this.name);
  }
  setEnabled(enabled) {
    this.#experiments.setEnabled(this.name, enabled);
  }
};
var HostExperiment = class {
  name;
  title;
  #experiments;
  // This is the name of the corresponding Chromium flag (in chrome/browser/about_flags.cc).
  // It is NOT the the name of the corresponding Chromium `base::Feature`.
  aboutFlag;
  #isEnabled;
  requiresChromeRestart;
  docLink;
  feedbackLink;
  constructor(params) {
    this.name = params.name;
    this.title = params.title;
    this.#experiments = params.experiments;
    this.aboutFlag = params.aboutFlag;
    this.#isEnabled = params.isEnabled;
    this.requiresChromeRestart = params.requiresChromeRestart;
    this.docLink = params.docLink;
    this.feedbackLink = params.feedbackLink;
  }
  isEnabled() {
    return this.#experiments.isEnabledForTest(this.name) || this.#isEnabled;
  }
  setEnabled(enabled) {
    this.#isEnabled = enabled;
  }
};
var experiments = new ExperimentsSupport();
var GenAiEnterprisePolicyValue;
(function(GenAiEnterprisePolicyValue2) {
  GenAiEnterprisePolicyValue2[GenAiEnterprisePolicyValue2["ALLOW"] = 0] = "ALLOW";
  GenAiEnterprisePolicyValue2[GenAiEnterprisePolicyValue2["ALLOW_WITHOUT_LOGGING"] = 1] = "ALLOW_WITHOUT_LOGGING";
  GenAiEnterprisePolicyValue2[GenAiEnterprisePolicyValue2["DISABLE"] = 2] = "DISABLE";
})(GenAiEnterprisePolicyValue || (GenAiEnterprisePolicyValue = {}));
var HostConfigFreestylerExecutionMode;
(function(HostConfigFreestylerExecutionMode2) {
  HostConfigFreestylerExecutionMode2["ALL_SCRIPTS"] = "ALL_SCRIPTS";
  HostConfigFreestylerExecutionMode2["SIDE_EFFECT_FREE_SCRIPTS_ONLY"] = "SIDE_EFFECT_FREE_SCRIPTS_ONLY";
  HostConfigFreestylerExecutionMode2["NO_SCRIPTS"] = "NO_SCRIPTS";
})(HostConfigFreestylerExecutionMode || (HostConfigFreestylerExecutionMode = {}));
var GdpProfilesEnterprisePolicyValue;
(function(GdpProfilesEnterprisePolicyValue2) {
  GdpProfilesEnterprisePolicyValue2[GdpProfilesEnterprisePolicyValue2["ENABLED"] = 0] = "ENABLED";
  GdpProfilesEnterprisePolicyValue2[GdpProfilesEnterprisePolicyValue2["ENABLED_WITHOUT_BADGES"] = 1] = "ENABLED_WITHOUT_BADGES";
  GdpProfilesEnterprisePolicyValue2[GdpProfilesEnterprisePolicyValue2["DISABLED"] = 2] = "DISABLED";
})(GdpProfilesEnterprisePolicyValue || (GdpProfilesEnterprisePolicyValue = {}));
var hostConfig = /* @__PURE__ */ Object.create(null);
var conditions = {
  canDock: () => Boolean(Runtime.queryParam("can_dock"))
};
export {
  DevToolsContext_exports as DevToolsContext,
  ExperimentNames_exports as ExperimentNames,
  Runtime_exports as Runtime
};
//# sourceMappingURL=root.js.map
