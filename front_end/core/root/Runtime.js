// Copyright 2020 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.
import * as Platform from '../platform/platform.js';
let runtimePlatform = '';
let runtimeInstance;
let isNode;
let isTraceAppEntry;
/**
 * Returns the base URL (similar to `<base>`).
 * Used to resolve the relative URLs of any additional DevTools files (locale strings, etc) needed.
 * See: https://cs.chromium.org/remoteBase+f:devtools_window
 */
export function getRemoteBase(location = self.location.toString()) {
    const url = new URL(location);
    const remoteBase = url.searchParams.get('remoteBase');
    if (!remoteBase) {
        return null;
    }
    const version = /\/serve_file\/(@[0-9a-zA-Z]+)\/?$/.exec(remoteBase);
    if (!version) {
        return null;
    }
    return { base: `devtools://devtools/remote/serve_file/${version[1]}/`, version: version[1] };
}
export function getPathName() {
    return window.location.pathname;
}
export function isNodeEntry(pathname) {
    const nodeEntryPoints = ['node_app', 'js_app'];
    return nodeEntryPoints.some(component => pathname.includes(component));
}
export const getChromeVersion = () => {
    const chromeRegex = /(?:^|\W)(?:Chrome|HeadlessChrome)\/(\S+)/;
    const chromeMatch = navigator.userAgent.match(chromeRegex);
    if (chromeMatch && chromeMatch.length > 1) {
        return chromeMatch[1];
    }
    return '';
};
export class Runtime {
    constructor() {
    }
    static instance(opts = { forceNew: null }) {
        const { forceNew } = opts;
        if (!runtimeInstance || forceNew) {
            runtimeInstance = new Runtime();
        }
        return runtimeInstance;
    }
    static removeInstance() {
        runtimeInstance = undefined;
    }
    static #queryParamsObject;
    static #getSearchParams() {
        // TODO(crbug.com/451502260): Find a more explicit way to support running in Node.js
        if (!Runtime.#queryParamsObject && 'location' in globalThis) {
            Runtime.#queryParamsObject = new URLSearchParams(location.search);
        }
        return Runtime.#queryParamsObject;
    }
    static queryParam(name) {
        return Runtime.#getSearchParams()?.get(name) ?? null;
    }
    static setQueryParamForTesting(name, value) {
        Runtime.#getSearchParams()?.set(name, value);
    }
    static isNode() {
        if (isNode === undefined) {
            isNode = isNodeEntry(getPathName());
        }
        return isNode;
    }
    /**
     * Returns true if viewing the slimmed-down devtools meant for just viewing a
     * performance trace, e.g. devtools://devtools/bundled/trace_app.html?traceURL=http://...
     */
    static isTraceApp() {
        if (isTraceAppEntry === undefined) {
            isTraceAppEntry = getPathName().includes('trace_app');
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
        if (experiment === '*') {
            return true;
        }
        if (experiment && experiment.startsWith('!') && experiments.isEnabled(experiment.substring(1))) {
            return false;
        }
        if (experiment && !experiment.startsWith('!') && !experiments.isEnabled(experiment)) {
            return false;
        }
        const { condition } = descriptor;
        return condition ? condition(hostConfig) : true;
    }
    loadLegacyModule(modulePath) {
        // eslint-disable-next-line no-console
        console.log('Loading legacy module: ' + modulePath);
        const importPath = `../../${modulePath}`; // Extracted as a variable so esbuild doesn't attempt to bundle all the things.
        return import(importPath).then(m => {
            // eslint-disable-next-line no-console
            console.log('Loaded legacy module: ' + modulePath);
            return m;
        });
    }
}
export class ExperimentsSupport {
    #experiments = [];
    #experimentNames = new Set();
    #enabledTransiently = new Set();
    #enabledByDefault = new Set();
    #serverEnabled = new Set();
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
        // Check for explicitly disabled #experiments first - the code could call setEnable(false) on the experiment enabled
        // by default and we should respect that.
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
}
/** Manages the 'experiments' dictionary in self.localStorage */
class ExperimentStorage {
    #experiments = {};
    constructor() {
        try {
            const storedExperiments = self.localStorage?.getItem('experiments');
            if (storedExperiments) {
                this.#experiments = JSON.parse(storedExperiments);
            }
        }
        catch {
            console.error('Failed to parse localStorage[\'experiments\']');
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
        self.localStorage?.setItem('experiments', JSON.stringify(this.#experiments));
    }
}
export class Experiment {
    name;
    title;
    unstable;
    docLink;
    feedbackLink;
    #experiments;
    constructor(experiments, name, title, unstable, docLink, feedbackLink) {
        this.name = name;
        this.title = title;
        this.unstable = unstable;
        this.docLink = docLink;
        this.feedbackLink = feedbackLink;
        this.#experiments = experiments;
    }
    isEnabled() {
        return this.#experiments.isEnabled(this.name);
    }
    setEnabled(enabled) {
        this.#experiments.setEnabled(this.name, enabled);
    }
}
/** This must be constructed after the query parameters have been parsed. **/
export const experiments = new ExperimentsSupport();
export var GenAiEnterprisePolicyValue;
(function (GenAiEnterprisePolicyValue) {
    GenAiEnterprisePolicyValue[GenAiEnterprisePolicyValue["ALLOW"] = 0] = "ALLOW";
    GenAiEnterprisePolicyValue[GenAiEnterprisePolicyValue["ALLOW_WITHOUT_LOGGING"] = 1] = "ALLOW_WITHOUT_LOGGING";
    GenAiEnterprisePolicyValue[GenAiEnterprisePolicyValue["DISABLE"] = 2] = "DISABLE";
})(GenAiEnterprisePolicyValue || (GenAiEnterprisePolicyValue = {}));
export var HostConfigFreestylerExecutionMode;
(function (HostConfigFreestylerExecutionMode) {
    HostConfigFreestylerExecutionMode["ALL_SCRIPTS"] = "ALL_SCRIPTS";
    HostConfigFreestylerExecutionMode["SIDE_EFFECT_FREE_SCRIPTS_ONLY"] = "SIDE_EFFECT_FREE_SCRIPTS_ONLY";
    HostConfigFreestylerExecutionMode["NO_SCRIPTS"] = "NO_SCRIPTS";
})(HostConfigFreestylerExecutionMode || (HostConfigFreestylerExecutionMode = {}));
export var GdpProfilesEnterprisePolicyValue;
(function (GdpProfilesEnterprisePolicyValue) {
    GdpProfilesEnterprisePolicyValue[GdpProfilesEnterprisePolicyValue["ENABLED"] = 0] = "ENABLED";
    GdpProfilesEnterprisePolicyValue[GdpProfilesEnterprisePolicyValue["ENABLED_WITHOUT_BADGES"] = 1] = "ENABLED_WITHOUT_BADGES";
    GdpProfilesEnterprisePolicyValue[GdpProfilesEnterprisePolicyValue["DISABLED"] = 2] = "DISABLED";
})(GdpProfilesEnterprisePolicyValue || (GdpProfilesEnterprisePolicyValue = {}));
/**
 * The host configuration for this DevTools instance.
 *
 * This is initialized early during app startup and should not be modified
 * afterwards. In some cases it can be necessary to re-request the host
 * configuration from Chrome while DevTools is already running. In these
 * cases, the new host configuration should be reflected here, e.g.:
 *
 * ```js
 * const config = await new Promise<Root.Runtime.HostConfig>(
 *   resolve => InspectorFrontendHostInstance.getHostConfig(resolve));
 * Object.assign(Root.runtime.hostConfig, config);
 * ```
 */
export const hostConfig = Object.create(null);
export const conditions = {
    canDock: () => Boolean(Runtime.queryParam('can_dock')),
};
//# sourceMappingURL=Runtime.js.map