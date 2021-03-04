
// Copyright 2020 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

const originalConsole = console;
const originalAssert = console.assert;

/** @type {!URLSearchParams} */
const queryParamsObject = new URLSearchParams(location.search);

// The following variable are initialized all the way at the bottom of this file
/** @type {string} */
let importScriptPathPrefix;

let runtimePlatform = '';

/** @type {!Runtime|undefined} */
let runtimeInstance;

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

  return {base: `${url.origin}/remote/serve_file/${version[1]}/`, version: version[1]};
}

/** @type {!WeakMap<function(new:?), ?>} */
const constructedInstances = new WeakMap();

export class Runtime {
  /**
   * @private
   * @param {!Array.<!ModuleDescriptor>} descriptors
   */
  constructor(descriptors) {
    /** @type {!Array<!Module>} */
    this._modules = [];
    /** @type {!Object<string, !Module>} */
    this._modulesMap = {};
    /** @type {!Object<string, function(new:Object):void>} */
    this._cachedTypeClasses = {};
    /** @type {!Object<string, !ModuleDescriptor>} */
    this._descriptorsMap = {};

    for (const descriptor of descriptors) {
      this._registerModule(descriptor);
    }
  }

  /**
   * @param {{forceNew: ?boolean, moduleDescriptors: ?Array.<!ModuleDescriptor>}=} opts
   * @return {!Runtime}
   */
  static instance(opts = {forceNew: null, moduleDescriptors: null}) {
    const {forceNew, moduleDescriptors} = opts;
    if (!runtimeInstance || forceNew) {
      if (!moduleDescriptors) {
        throw new Error(`Unable to create runtime: moduleDescriptors must be provided: ${new Error().stack}`);
      }

      runtimeInstance = new Runtime(moduleDescriptors);
    }

    return runtimeInstance;
  }

  static removeInstance() {
    runtimeInstance = undefined;
  }

  /**
   * http://tools.ietf.org/html/rfc3986#section-5.2.4
   * @param {string} path
   * @return {string}
   */
  static normalizePath(path) {
    if (path.indexOf('..') === -1 && path.indexOf('.') === -1) {
      return path;
    }

    const normalizedSegments = [];
    const segments = path.split('/');
    for (const segment of segments) {
      if (segment === '.') {
        continue;
      } else if (segment === '..') {
        normalizedSegments.pop();
      } else if (segment) {
        normalizedSegments.push(segment);
      }
    }
    let normalizedPath = normalizedSegments.join('/');
    if (normalizedPath[normalizedPath.length - 1] === '/') {
      return normalizedPath;
    }
    if (path[0] === '/' && normalizedPath) {
      normalizedPath = '/' + normalizedPath;
    }
    if ((path[path.length - 1] === '/') || (segments[segments.length - 1] === '.') ||
        (segments[segments.length - 1] === '..')) {
      normalizedPath = normalizedPath + '/';
    }

    return normalizedPath;
  }

  /**
   * @param {string} name
   * @return {?string}
   */
  static queryParam(name) {
    return queryParamsObject.get(name);
  }

  /**
   * @return {!Object<string,boolean>}
   */
  static _experimentsSetting() {
    try {
      return /** @type {!Object<string,boolean>} */ (
          JSON.parse(self.localStorage && self.localStorage['experiments'] ? self.localStorage['experiments'] : '{}'));
    } catch (e) {
      console.error('Failed to parse localStorage[\'experiments\']');
      return {};
    }
  }

  /**
   * @param {*} value
   * @param {string} message
   */
  static _assert(value, message) {
    if (value) {
      return;
    }
    originalAssert.call(originalConsole, value, message + ' ' + new Error().stack);
  }

  /**
   * @param {string} platform
   */
  static setPlatform(platform) {
    runtimePlatform = platform;
  }

  static platform() {
    return runtimePlatform;
  }

  /**
   * @param {!{experiment: (?string|undefined), condition: (?string|undefined)}} descriptor
   * @return {boolean}
   */
  static isDescriptorEnabled(descriptor) {
    const activatorExperiment = descriptor['experiment'];
    if (activatorExperiment === '*') {
      return true;
    }
    if (activatorExperiment && activatorExperiment.startsWith('!') &&
        experiments.isEnabled(activatorExperiment.substring(1))) {
      return false;
    }
    if (activatorExperiment && !activatorExperiment.startsWith('!') && !experiments.isEnabled(activatorExperiment)) {
      return false;
    }
    const condition = descriptor['condition'];
    if (condition && !condition.startsWith('!') && !Runtime.queryParam(condition)) {
      return false;
    }
    if (condition && condition.startsWith('!') && Runtime.queryParam(condition.substring(1))) {
      return false;
    }
    return true;
  }

  /**
   * @param {string} path
   * @return {string}
   */
  static resolveSourceURL(path) {
    let sourceURL = self.location.href;
    if (self.location.search) {
      sourceURL = sourceURL.replace(self.location.search, '');
    }
    sourceURL = sourceURL.substring(0, sourceURL.lastIndexOf('/') + 1) + path;
    return '\n/*# sourceURL=' + sourceURL + ' */';
  }

  /**
   * @param {string} moduleName
   * @return {!Module}
   */
  module(moduleName) {
    return this._modulesMap[moduleName];
  }

  /**
   * @param {!ModuleDescriptor} descriptor
   */
  _registerModule(descriptor) {
    const module = new Module(this, descriptor);
    this._modules.push(module);
    this._modulesMap[descriptor['name']] = module;
  }

  /**
   * @param {string} moduleName
   * @return {!Promise.<boolean>}
   */
  loadModulePromise(moduleName) {
    return this._modulesMap[moduleName]._loadPromise();
  }

  /**
   * @param {!Array.<string>} moduleNames
   * @return {!Promise.<!Array.<*>>}
   */
  loadAutoStartModules(moduleNames) {
    const promises = [];
    for (const moduleName of moduleNames) {
      promises.push(this.loadModulePromise(moduleName));
    }
    return Promise.all(promises);
  }

  /**
   * @param {string} typeName
   * @return {?function(new:Object)}
   */
  _resolve(typeName) {
    if (!this._cachedTypeClasses[typeName]) {
      /** @type {!Array<string>} */
      const path = typeName.split('.');
      /** @type {*} */
      let object = self;
      for (let i = 0; object && (i < path.length); ++i) {
        object = object[path[i]];
      }
      if (object) {
        this._cachedTypeClasses[typeName] = /** @type {function(new:Object):void} */ (object);
      }
    }
    return this._cachedTypeClasses[typeName] || null;
  }

  /**
   * @param {function(new:T)} constructorFunction
   * @return {!T}
   * @template T
   */
  sharedInstance(constructorFunction) {
    const instanceDescriptor = Object.getOwnPropertyDescriptor(constructorFunction, 'instance');
    if (instanceDescriptor) {
      const method = instanceDescriptor.value;
      if (method instanceof Function) {
        return method.call(null);
      }
    }
    let instance = constructedInstances.get(constructorFunction);
    if (!instance) {
      instance = new constructorFunction();
      constructedInstances.set(constructorFunction, instance);
    }
    return instance;
  }
}

export class ModuleDescriptor {
  constructor() {
    /**
     * @type {string}
     */
    this.name;

    /**
     * @type {!Array.<string>|undefined}
     */
    this.dependencies;

    /**
     * @type {!Array.<string>}
     */
    this.scripts;

    /**
     * @type {!Array.<string>}
     */
    this.modules;

    /**
     * @type {!Array.<string>}
     */
    this.resources;

    /**
     * @type {string|undefined}
     */
    this.condition;

    /** @type {string|null} */
    this.experiment;
  }
}

/**
 * @typedef {{
 *  title: string,
 *  value: (string|boolean),
 *  raw: (boolean|undefined),
 *  text: (string|undefined),
 * }}
 */
// @ts-ignore typedef
export let Option;

export class Module {
  /**
   * @param {!Runtime} manager
   * @param {!ModuleDescriptor} descriptor
   */
  constructor(manager, descriptor) {
    this._manager = manager;
    this._descriptor = descriptor;
    this._name = descriptor.name;
    this._loadedForTest = false;
  }

  /**
   * @return {string}
   */
  name() {
    return this._name;
  }

  /**
   * @return {boolean}
   */
  enabled() {
    return Runtime.isDescriptorEnabled(this._descriptor);
  }

  /**
   * @param {string} name
   * @return {string}
   */
  resource(name) {
    const fullName = this._name + '/' + name;
    const content = cachedResources.get(fullName);
    if (!content) {
      throw new Error(fullName + ' not preloaded. Check module.json');
    }
    return content;
  }

  /**
   * @return {!Promise.<boolean>}
   */
  _loadPromise() {
    if (!this.enabled()) {
      return Promise.reject(new Error('Module ' + this._name + ' is not enabled'));
    }

    if (this._pendingLoadPromise) {
      return this._pendingLoadPromise;
    }

    const dependencies = this._descriptor.dependencies;
    const dependencyPromises = [];
    for (let i = 0; dependencies && i < dependencies.length; ++i) {
      dependencyPromises.push(this._manager._modulesMap[dependencies[i]]._loadPromise());
    }

    this._pendingLoadPromise = Promise.all(dependencyPromises)
                                   .then(this._loadModules.bind(this))
                                   .then(() => {
                                     this._loadedForTest = true;
                                     return this._loadedForTest;
                                   });

    return this._pendingLoadPromise;
  }

  async _loadModules() {
    const legacyFileName = `${this._name}-legacy.js`;
    const moduleFileName = `${this._name}_module.js`;
    const entrypointFileName = `${this._name}.js`;

    // If a module has resources, they are part of the `_module.js` files that are generated
    // by `build_release_applications`. These need to be loaded before any other code is
    // loaded, to make sure that the resource content is properly cached in `cachedResources`.
    if (this._descriptor.modules.includes(moduleFileName)) {
      await import(`../${this._name}/${moduleFileName}`);
    }

    const fileName = this._descriptor.modules.includes(legacyFileName) ? legacyFileName : entrypointFileName;

    await import(`../${this._name}/${fileName}`);
  }

  /**
   * @param {string} resourceName
   */
  _modularizeURL(resourceName) {
    return Runtime.normalizePath(this._name + '/' + resourceName);
  }

  /**
   * @param {string} resourceName
   * @return {!Promise.<string>}
   */
  fetchResource(resourceName) {
    const sourceURL = getResourceURL(this._modularizeURL(resourceName));
    return loadResourcePromise(sourceURL);
  }

  /**
   * @param {string} value
   * @return {string}
   */
  substituteURL(value) {
    return value.replace(/@url\(([^\)]*?)\)/g, convertURL.bind(this));

    /**
     * @param {string} match
     * @param {string} url
     * @this {Module}
     */
    function convertURL(match, url) {
      return importScriptPathPrefix + this._modularizeURL(url);
    }
  }
}

export class ExperimentsSupport {
  constructor() {
    /** @type {!Array<!Experiment>} */
    this._experiments = [];
    /** @type {!Set<string>} */
    this._experimentNames = new Set();
    /** @type {!Set<string>} */
    this._enabledTransiently = new Set();
    /** @type {!Set<string>} */
    this._enabledByDefault = new Set();
    /** @type {!Set<string>} */
    this._serverEnabled = new Set();
  }

  /**
  * @return {!Array.<!Experiment>}
  */
  allConfigurableExperiments() {
    const result = [];
    for (const experiment of this._experiments) {
      if (!this._enabledTransiently.has(experiment.name)) {
        result.push(experiment);
      }
    }
    return result;
  }

  /**
  * @return {!Array.<!Experiment>}
  */
  enabledExperiments() {
    return this._experiments.filter(experiment => experiment.isEnabled());
  }

  /**
  * @param {!Object} value
  */
  _setExperimentsSetting(value) {
    if (!self.localStorage) {
      return;
    }
    self.localStorage['experiments'] = JSON.stringify(value);
  }

  /**
  * @param {string} experimentName
  * @param {string} experimentTitle
  * @param {boolean=} unstable
  */
  register(experimentName, experimentTitle, unstable) {
    Runtime._assert(
        !this._experimentNames.has(experimentName), 'Duplicate registration of experiment ' + experimentName);
    this._experimentNames.add(experimentName);
    this._experiments.push(new Experiment(this, experimentName, experimentTitle, Boolean(unstable)));
  }

  /**
  * @param {string} experimentName
  * @return {boolean}
  */
  isEnabled(experimentName) {
    this._checkExperiment(experimentName);
    // Check for explicitly disabled experiments first - the code could call setEnable(false) on the experiment enabled
    // by default and we should respect that.
    if (Runtime._experimentsSetting()[experimentName] === false) {
      return false;
    }
    if (this._enabledTransiently.has(experimentName) || this._enabledByDefault.has(experimentName)) {
      return true;
    }
    if (this._serverEnabled.has(experimentName)) {
      return true;
    }

    return Boolean(Runtime._experimentsSetting()[experimentName]);
  }

  /**
  * @param {string} experimentName
  * @param {boolean} enabled
  */
  setEnabled(experimentName, enabled) {
    this._checkExperiment(experimentName);
    const experimentsSetting = Runtime._experimentsSetting();
    experimentsSetting[experimentName] = enabled;
    this._setExperimentsSetting(experimentsSetting);
  }

  /**
  * @param {!Array.<string>} experimentNames
  */
  enableExperimentsTransiently(experimentNames) {
    for (const experimentName of experimentNames) {
      this._checkExperiment(experimentName);
      this._enabledTransiently.add(experimentName);
    }
  }

  /**
  * @param {!Array.<string>} experimentNames
  */
  enableExperimentsByDefault(experimentNames) {
    for (const experimentName of experimentNames) {
      this._checkExperiment(experimentName);
      this._enabledByDefault.add(experimentName);
    }
  }

  /**
  * @param {!Array.<string>} experimentNames
  */
  setServerEnabledExperiments(experimentNames) {
    for (const experiment of experimentNames) {
      this._checkExperiment(experiment);
      this._serverEnabled.add(experiment);
    }
  }

  /**
  * @param {string} experimentName
  */
  enableForTest(experimentName) {
    this._checkExperiment(experimentName);
    this._enabledTransiently.add(experimentName);
  }

  clearForTest() {
    this._experiments = [];
    this._experimentNames.clear();
    this._enabledTransiently.clear();
    this._enabledByDefault.clear();
    this._serverEnabled.clear();
  }

  cleanUpStaleExperiments() {
    const experimentsSetting = Runtime._experimentsSetting();
    /** @type {!Object<string,boolean>} */
    const cleanedUpExperimentSetting = {};
    for (const {name: experimentName} of this._experiments) {
      if (experimentsSetting.hasOwnProperty(experimentName)) {
        const isEnabled = experimentsSetting[experimentName];
        if (isEnabled || this._enabledByDefault.has(experimentName)) {
          cleanedUpExperimentSetting[experimentName] = isEnabled;
        }
      }
    }
    this._setExperimentsSetting(cleanedUpExperimentSetting);
  }

  /**
  * @param {string} experimentName
  */
  _checkExperiment(experimentName) {
    Runtime._assert(this._experimentNames.has(experimentName), 'Unknown experiment ' + experimentName);
  }
}

export class Experiment {
  /**
  * @param {!ExperimentsSupport} experiments
  * @param {string} name
  * @param {string} title
  * @param {boolean} unstable
  */
  constructor(experiments, name, title, unstable) {
    this.name = name;
    this.title = title;
    this.unstable = unstable;
    this._experiments = experiments;
  }

  /**
  * @return {boolean}
  */
  isEnabled() {
    return this._experiments.isEnabled(this.name);
  }

  /**
  * @param {boolean} enabled
  */
  setEnabled(enabled) {
    this._experiments.setEnabled(this.name, enabled);
  }
}

/**
 * @param {string} url
 * @return {!Promise.<string>}
 */
export function loadResourcePromise(url) {
  return new Promise(load);

  /**
   * @param {function(?):void} fulfill
   * @param {function(*):void} reject
   */
  function load(fulfill, reject) {
    const xhr = new XMLHttpRequest();
    xhr.open('GET', url, true);
    xhr.onreadystatechange = onreadystatechange;

    /**
     * @param {!Event} e
     */
    function onreadystatechange(e) {
      if (xhr.readyState !== XMLHttpRequest.DONE) {
        return;
      }

      const {response} = /** @type {*} */ (e.target);

      // DevTools Proxy server can mask 404s as 200s, check the body to be sure
      const status = /^HTTP\/1.1 404/.test(response) ? 404 : xhr.status;

      if ([0, 200, 304].indexOf(status) === -1)  // Testing harness file:/// results in 0.
      {
        reject(new Error('While loading from url ' + url + ' server responded with a status of ' + status));
      } else {
        fulfill(response);
      }
    }
    xhr.send(null);
  }
}

/**
 * @param {string} scriptName
 * @param {string=} base
 * @return {string}
 */
function getResourceURL(scriptName, base) {
  const sourceURL = (base || importScriptPathPrefix) + scriptName;
  const schemaIndex = sourceURL.indexOf('://') + 3;
  let pathIndex = sourceURL.indexOf('/', schemaIndex);
  if (pathIndex === -1) {
    pathIndex = sourceURL.length;
  }
  return sourceURL.substring(0, pathIndex) + Runtime.normalizePath(sourceURL.substring(pathIndex));
}

(function() {
const baseUrl = self.location ? self.location.origin + self.location.pathname : '';
importScriptPathPrefix = baseUrl.substring(0, baseUrl.lastIndexOf('/') + 1);
})();

// This must be constructed after the query parameters have been parsed.
export const experiments = new ExperimentsSupport();

/**
 * @type {!Map<string, string>}
 */
export const cachedResources = new Map();

// Only exported for LightHouse, which uses it in `report-generator.js`.
// Do not use this global in DevTools' implementation.
// TODO(crbug.com/1127292): remove this global
globalThis.EXPORTED_CACHED_RESOURCES_ONLY_FOR_LIGHTHOUSE = cachedResources;

/** @type {function():void} */
export let appStartedPromiseCallback;
/** @type {!Promise<void>} */
export const appStarted = new Promise(fulfill => {
  appStartedPromiseCallback = fulfill;
});


/** @enum {string} */
export const ExperimentName = {
  CAPTURE_NODE_CREATION_STACKS: 'captureNodeCreationStacks',
  CSS_OVERVIEW: 'cssOverview',
  LIVE_HEAP_PROFILE: 'liveHeapProfile',
  DEVELOPER_RESOURCES_VIEW: 'developerResourcesView',
  TIMELINE_REPLAY_EVENT: 'timelineReplayEvent',
  CSP_VIOLATIONS_VIEW: 'cspViolationsView',
  WASM_DWARF_DEBUGGING: 'wasmDWARFDebugging',
  ALL: '*',
  PROTOCOL_MONITOR: 'protocolMonitor',
  WEBAUTHN_PANE: 'webauthnPane',
  RECORDER: 'recorder',
};

/** @enum {string} */
export const ConditionName = {
  CAN_DOCK: 'can_dock',
  NOT_SOURCES_HIDE_ADD_FOLDER: '!sources.hide_add_folder',
};
