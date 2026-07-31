var __defProp = Object.defineProperty;
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};

// gen/front_end/core/root/DevToolsContext.js
var DevToolsContext_exports = {};
__export(DevToolsContext_exports, {
  WritableDevToolsContext: () => WritableDevToolsContext,
  globalInstance: () => globalInstance,
  setGlobalInstance: () => setGlobalInstance
});
var WritableDevToolsContext = class {
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
   * Should only be used by existing `instance` accessors and the bootstrapper.
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
    gInstance = new WritableDevToolsContext();
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
  ExperimentName2["PROTOCOL_MONITOR"] = "protocol-monitor";
  ExperimentName2["INSTRUMENTATION_BREAKPOINTS"] = "instrumentation-breakpoints";
  ExperimentName2["DURABLE_MESSAGES"] = "durable-messages";
  ExperimentName2["JPEG_XL"] = "jpeg-xl";
  ExperimentName2["PLUS_BUTTON"] = "plus-button";
})(ExperimentName || (ExperimentName = {}));

// gen/front_end/core/root/Runtime.js
var Runtime_exports = {};
__export(Runtime_exports, {
  Experiment: () => Experiment,
  ExperimentsSupport: () => ExperimentsSupport,
  GdpProfilesEnterprisePolicyValue: () => GdpProfilesEnterprisePolicyValue,
  GenAiEnterprisePolicyValue: () => GenAiEnterprisePolicyValue,
  HostConfigFreestylerExecutionMode: () => HostConfigFreestylerExecutionMode,
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
var globalObject = globalThis;
function getRemoteBase(location = globalObject.self?.location?.toString() ?? "") {
  const url = new URL(location);
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
  return globalObject.location?.pathname ?? "";
}
function isNodeEntry(pathname) {
  const nodeEntryPoints = ["node_app", "js_app"];
  return nodeEntryPoints.some((component) => pathname.includes(component));
}
var getChromeVersion = () => {
  const chromeRegex = /(?:^|\W)(?:Chrome|HeadlessChrome)\/(\S+)/;
  const userAgent = Platform.HostRuntime.HOST_RUNTIME.getUserAgent();
  const chromeMatch = userAgent.match(chromeRegex);
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
    if (!_Runtime.#queryParamsObject && globalObject.location) {
      _Runtime.#queryParamsObject = new URLSearchParams(globalObject.location.search);
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
  #experiments = /* @__PURE__ */ new Map();
  #enabledForTests = /* @__PURE__ */ new Set();
  #storage = new ExperimentStorage();
  allConfigurableExperiments() {
    return [...this.#experiments.values()];
  }
  register(params) {
    if (this.#isExperiment(params.name)) {
      throw new Error(`Duplicate registration of experiment '${params.name}'`);
    }
    const experiment = new Experiment({ ...params, experiments: this });
    this.#experiments.set(params.name, experiment);
    return experiment;
  }
  isEnabled(experimentName) {
    if (this.#isExperiment(experimentName)) {
      return this.#enabledForTests.has(experimentName) || (this.#experiments.get(experimentName)?.isEnabled() ?? false);
    }
    throw new Error(`Unknown experiment '${experimentName}'`);
  }
  getValueFromStorage(experimentName) {
    return this.#storage.get(experimentName);
  }
  setEnabled(experimentName, enabled) {
    if (this.#isExperiment(experimentName)) {
      this.#experiments.get(experimentName)?.setEnabled(enabled);
      return;
    }
    throw new Error(`Unknown experiment '${experimentName}'`);
  }
  enableForTest(experimentName) {
    if (!this.#isExperiment(experimentName)) {
      throw new Error(`Unknown experiment '${experimentName}'`);
    }
    this.#enabledForTests.add(experimentName);
  }
  disableForTest(experimentName) {
    if (!this.#isExperiment(experimentName)) {
      throw new Error(`Unknown experiment '${experimentName}'`);
    }
    this.#enabledForTests.delete(experimentName);
  }
  isEnabledForTest(experimentName) {
    return this.#enabledForTests.has(experimentName);
  }
  clearForTest() {
    this.#experiments.clear();
    this.#enabledForTests.clear();
  }
  // TODO(crbug.com/464173054) remove after M156
  removeAllExperimentsFromLocalStorage() {
    this.#storage.removeAllExperimentsFromLocalStorage();
  }
  #isExperiment(experimentName) {
    return this.#experiments.has(experimentName);
  }
};
var ExperimentStorage = class {
  #experiments = {};
  constructor() {
    try {
      const storedExperiments = Platform.HostRuntime.HOST_RUNTIME.getLocalStorage()?.getItem("experiments");
      if (storedExperiments) {
        this.#experiments = JSON.parse(storedExperiments);
      }
    } catch (err) {
      console.error("Failed to parse localStorage['experiments']: " + err.message);
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
  removeAllExperimentsFromLocalStorage() {
    Platform.HostRuntime.HOST_RUNTIME.getLocalStorage()?.removeItem("experiments");
  }
};
var Experiment = class {
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
