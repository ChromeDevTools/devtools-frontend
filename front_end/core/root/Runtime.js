// Copyright 2020 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.
import * as Platform from '../platform/platform.js';
let runtimePlatform = '';
let runtimeInstance;
let isNode;
let isTraceAppEntry;
const globalObject = globalThis;
/**
 * Returns the base URL (similar to `<base>`).
 * Used to resolve the relative URLs of any additional DevTools files (locale strings, etc) needed.
 * See: https://cs.chromium.org/remoteBase+f:devtools_window
 */
export function getRemoteBase(location = globalObject.self?.location?.toString() ?? '') {
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
    return globalObject.location?.pathname ?? '';
}
export function isNodeEntry(pathname) {
    const nodeEntryPoints = ['node_app', 'js_app'];
    return nodeEntryPoints.some(component => pathname.includes(component));
}
export const getChromeVersion = () => {
    const chromeRegex = /(?:^|\W)(?:Chrome|HeadlessChrome)\/(\S+)/;
    const userAgent = Platform.HostRuntime.HOST_RUNTIME.getUserAgent();
    const chromeMatch = userAgent.match(chromeRegex);
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
        if (!Runtime.#queryParamsObject && globalObject.location) {
            Runtime.#queryParamsObject = new URLSearchParams(globalObject.location.search);
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
        if (experiment?.startsWith('!')) {
            const experimentName = experiment.substring(1);
            if (experiments.isEnabled(experimentName)) {
                return false;
            }
        }
        if (experiment && !experiment.startsWith('!')) {
            const experimentName = experiment;
            if (!experiments.isEnabled(experimentName)) {
                return false;
            }
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
    #experiments = new Map();
    #enabledForTests = new Set();
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
}
// TODO(crbug.com/464173054) remove after M156
/** Manages the 'experiments' dictionary in globalThis.localStorage */
class ExperimentStorage {
    #experiments = {};
    constructor() {
        try {
            const storedExperiments = Platform.HostRuntime.HOST_RUNTIME.getLocalStorage()?.getItem('experiments');
            if (storedExperiments) {
                this.#experiments = JSON.parse(storedExperiments);
            }
        }
        catch (err) {
            console.error('Failed to parse localStorage[\'experiments\']: ' + err.message);
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
        Platform.HostRuntime.HOST_RUNTIME.getLocalStorage()?.removeItem('experiments');
    }
}
export class Experiment {
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