var __defProp = Object.defineProperty;
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};

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
  static queryParamsObject;
  static getSearchParams() {
    if (!_Runtime.queryParamsObject) {
      _Runtime.queryParamsObject = new URLSearchParams(location.search);
    }
    return _Runtime.queryParamsObject;
  }
  static queryParam(name) {
    return _Runtime.getSearchParams().get(name);
  }
  static setQueryParamForTesting(name, value) {
    _Runtime.getSearchParams().set(name, value);
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
    if (experiment && experiment.startsWith("!") && experiments.isEnabled(experiment.substring(1))) {
      return false;
    }
    if (experiment && !experiment.startsWith("!") && !experiments.isEnabled(experiment)) {
      return false;
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
  #experimentNames = /* @__PURE__ */ new Set();
  #enabledTransiently = /* @__PURE__ */ new Set();
  #enabledByDefault = /* @__PURE__ */ new Set();
  #serverEnabled = /* @__PURE__ */ new Set();
  #storage = new ExperimentStorage();
  allConfigurableExperiments() {
    const result = [];
    for (const experiment of this.#experiments) {
      if (!this.#enabledTransiently.has(experiment.name)) {
        result.push(experiment);
      }
    }
    return result;
  }
  register(experimentName, experimentTitle, unstable, docLink, feedbackLink) {
    if (this.#experimentNames.has(experimentName)) {
      throw new Error(`Duplicate registration of experiment '${experimentName}'`);
    }
    this.#experimentNames.add(experimentName);
    this.#experiments.push(new Experiment(this, experimentName, experimentTitle, Boolean(unstable), docLink ?? Platform.DevToolsPath.EmptyUrlString, feedbackLink ?? Platform.DevToolsPath.EmptyUrlString));
  }
  isEnabled(experimentName) {
    this.checkExperiment(experimentName);
    if (this.#storage.get(experimentName) === false) {
      return false;
    }
    if (this.#enabledTransiently.has(experimentName) || this.#enabledByDefault.has(experimentName)) {
      return true;
    }
    if (this.#serverEnabled.has(experimentName)) {
      return true;
    }
    return Boolean(this.#storage.get(experimentName));
  }
  setEnabled(experimentName, enabled) {
    this.checkExperiment(experimentName);
    this.#storage.set(experimentName, enabled);
  }
  enableExperimentsTransiently(experimentNames) {
    for (const experimentName of experimentNames) {
      this.checkExperiment(experimentName);
      this.#enabledTransiently.add(experimentName);
    }
  }
  enableExperimentsByDefault(experimentNames) {
    for (const experimentName of experimentNames) {
      this.checkExperiment(experimentName);
      this.#enabledByDefault.add(experimentName);
    }
  }
  setServerEnabledExperiments(experimentNames) {
    for (const experiment of experimentNames) {
      this.checkExperiment(experiment);
      this.#serverEnabled.add(experiment);
    }
  }
  enableForTest(experimentName) {
    this.checkExperiment(experimentName);
    this.#enabledTransiently.add(experimentName);
  }
  disableForTest(experimentName) {
    this.checkExperiment(experimentName);
    this.#enabledTransiently.delete(experimentName);
  }
  clearForTest() {
    this.#experiments = [];
    this.#experimentNames.clear();
    this.#enabledTransiently.clear();
    this.#enabledByDefault.clear();
    this.#serverEnabled.clear();
  }
  cleanUpStaleExperiments() {
    this.#storage.cleanUpStaleExperiments(this.#experimentNames);
  }
  checkExperiment(experimentName) {
    if (!this.#experimentNames.has(experimentName)) {
      throw new Error(`Unknown experiment '${experimentName}'`);
    }
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
  unstable;
  docLink;
  feedbackLink;
  #experiments;
  constructor(experiments2, name, title, unstable, docLink, feedbackLink) {
    this.name = name;
    this.title = title;
    this.unstable = unstable;
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
  Runtime_exports as Runtime
};
//# sourceMappingURL=root.js.map
