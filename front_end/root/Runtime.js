
// Copyright 2020 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

const REMOTE_MODULE_FALLBACK_REVISION = '@010ddcfda246975d194964ccf20038ebbdec6084';
const instanceSymbol = Symbol('instance');

const originalConsole = console;
const originalAssert = console.assert;

/** @type {!URLSearchParams} */
const queryParamsObject = new URLSearchParams(location.search);

// The following two variables are initialized all the way at the bottom of this file
/** @type {?string} */
let remoteBase;
/** @type {string} */
let importScriptPathPrefix;

let runtimePlatform = '';

/** @type {function(string):string} */
let l10nCallback;

/** @type {!Runtime} */
let runtimeInstance;

/**
 * @unrestricted
 */
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
    /** @type {!Array<!Extension>} */
    this._extensions = [];
    /** @type {!Object<string, function(new:Object):void>} */
    this._cachedTypeClasses = {};
    /** @type {!Object<string, !ModuleDescriptor>} */
    this._descriptorsMap = {};

    for (let i = 0; i < descriptors.length; ++i) {
      this._registerModule(descriptors[i]);
    }
  }

  /**
   * @param {{forceNew: ?boolean, moduleDescriptors: ?Array.<!ModuleDescriptor>}=} opts
   * @return {!Runtime}
   */
  static instance(opts = {forceNew: null, moduleDescriptors: null}) {
    const {forceNew, moduleDescriptors} = opts;
    if (!moduleDescriptors || forceNew) {
      if (!moduleDescriptors) {
        throw new Error(
            `Unable to create settings: targetManager and workspace must be provided: ${new Error().stack}`);
      }

      runtimeInstance = new Runtime(moduleDescriptors);
    }

    return runtimeInstance;
  }

  /**
   * @param {string} url
   * @return {!Promise.<!ArrayBuffer>}
   */
  loadBinaryResourcePromise(url) {
    return internalLoadResourcePromise(url, true);
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
    for (let i = 0; i < segments.length; i++) {
      const segment = segments[i];
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

  /**
   * @param {!ModuleDescriptor|!RuntimeExtensionDescriptor} descriptor
   * @return {boolean}
   */
  static _isDescriptorEnabled(descriptor) {
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
   * @param {function(string):string} localizationFunction
   */
  static setL10nCallback(localizationFunction) {
    l10nCallback = localizationFunction;
  }

  useTestBase() {
    remoteBase = 'http://localhost:8000/inspector-sources/';
    if (Runtime.queryParam('debugFrontend')) {
      remoteBase += 'debug/';
    }
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
    for (let i = 0; i < moduleNames.length; ++i) {
      promises.push(this.loadModulePromise(moduleNames[i]));
    }
    return Promise.all(promises);
  }

  /**
   * @param {!Extension} extension
   * @param {?function(function(new:Object)):boolean} predicate
   * @return {boolean}
   */
  _checkExtensionApplicability(extension, predicate) {
    if (!predicate) {
      return false;
    }
    const contextTypes = extension.descriptor().contextTypes;
    if (!contextTypes) {
      return true;
    }
    for (let i = 0; i < contextTypes.length; ++i) {
      const contextType = this._resolve(contextTypes[i]);
      const isMatching = !!contextType && predicate(contextType);
      if (isMatching) {
        return true;
      }
    }
    return false;
  }

  /**
   * @param {!Extension} extension
   * @param {?Object} context
   * @return {boolean}
   */
  isExtensionApplicableToContext(extension, context) {
    if (!context) {
      return true;
    }
    return this._checkExtensionApplicability(extension, isInstanceOf);

    /**
     * @param {!Function} targetType
     * @return {boolean}
     */
    function isInstanceOf(targetType) {
      return context instanceof targetType;
    }
  }

  /**
   * @param {!Extension} extension
   * @param {!Set.<!Function>=} currentContextTypes
   * @return {boolean}
   */
  isExtensionApplicableToContextTypes(extension, currentContextTypes) {
    if (!extension.descriptor().contextTypes) {
      return true;
    }

    let callback = null;

    if (currentContextTypes) {
      /**
       * @param {!Function} targetType
       * @return {boolean}
       */
      callback = targetType => {
        return currentContextTypes.has(targetType);
      };
    }

    return this._checkExtensionApplicability(extension, callback);
  }

  /**
   * @param {*} type
   * @param {?Object=} context
   * @param {boolean=} sortByTitle
   * @return {!Array.<!Extension>}
   */
  extensions(type, context, sortByTitle) {
    return this._extensions.filter(filter).sort(sortByTitle ? titleComparator : orderComparator);

    /**
     * @param {!Extension} extension
     * @return {boolean}
     */
    function filter(extension) {
      if (extension._type !== type && extension._typeClass() !== type) {
        return false;
      }
      if (!extension.enabled()) {
        return false;
      }
      return !context || extension.isApplicable(context);
    }

    /**
     * @param {!Extension} extension1
     * @param {!Extension} extension2
     * @return {number}
     */
    function orderComparator(extension1, extension2) {
      const order1 = extension1.descriptor()['order'] || 0;
      const order2 = extension2.descriptor()['order'] || 0;
      return order1 - order2;
    }

    /**
     * @param {!Extension} extension1
     * @param {!Extension} extension2
     * @return {number}
     */
    function titleComparator(extension1, extension2) {
      const title1 = extension1.title() || '';
      const title2 = extension2.title() || '';
      return title1.localeCompare(title2);
    }
  }

  /**
   * @param {*} type
   * @param {?Object=} context
   * @return {?Extension}
   */
  extension(type, context) {
    return this.extensions(type, context)[0] || null;
  }

  /**
   * @param {*} type
   * @param {?Object=} context
   * @return {!Promise.<!Array.<!Object>>}
   */
  allInstances(type, context) {
    return Promise.all(this.extensions(type, context).map(extension => extension.instance()));
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
    if (instanceSymbol in constructorFunction &&
        Object.getOwnPropertySymbols(constructorFunction).includes(instanceSymbol)) {
      // @ts-ignore Usage of symbols
      return constructorFunction[instanceSymbol];
    }

    const instance = new constructorFunction();
    // @ts-ignore Usage of symbols
    constructorFunction[instanceSymbol] = instance;
    return instance;
  }
}

/**
 * @unrestricted
 */
export class ModuleDescriptor {
  constructor() {
    /**
     * @type {string}
     */
    this.name;

    /**
     * @type {!Array.<!RuntimeExtensionDescriptor>}
     */
    this.extensions;

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

    /**
     * @type {boolean|undefined}
     */
    this.remote;

    /** @type {string|null} */
    this.experiment;
  }
}

// This class is named like this, because we already have an "ExtensionDescriptor" in the externs
// These two do not share the same structure
/**
 * @unrestricted
 */
export class RuntimeExtensionDescriptor {
  constructor() {
    /**
     * @type {string}
     */
    this.type;

    /**
     * @type {string|undefined}
     */
    this.className;

    /**
     * @type {string|undefined}
     */
    this.factoryName;

    /**
     * @type {!Array.<string>|undefined}
     */
    this.contextTypes;

    /**
     * @type {string|undefined}
     */
    this.bindings;

    /** @type {number} */
    this.order;

    /** @type {string|null} */
    this.extension;

    /** @type {string|null} */
    this.actionId;

    /** @type {string|null} */
    this.experiment;

    /** @type {string|null} */
    this.condition;

    /** @type {string} */
    this.settingName;

    /** @type {string|null} */
    this.settingType;

    /** @type {string} */
    this.defaultValue;

    /** @type {string|null} */
    this.storageType;

    /** @type {string|null} */
    this.userActionCondition;

    /** @type {string|null} */
    this.startPage;

    /** @type {string|null} */
    this.name;
  }
}

// Module namespaces.
// NOTE: Update scripts/build/special_case_namespaces.json if you add a special cased namespace.
/** @type {!Object<string,string>} */
const specialCases = {
  'sdk': 'SDK',
  'js_sdk': 'JSSDK',
  'browser_sdk': 'BrowserSDK',
  'ui': 'UI',
  'object_ui': 'ObjectUI',
  'javascript_metadata': 'JavaScriptMetadata',
  'perf_ui': 'PerfUI',
  'har_importer': 'HARImporter',
  'sdk_test_runner': 'SDKTestRunner',
  'cpu_profiler_test_runner': 'CPUProfilerTestRunner'
};

/**
 * @unrestricted
 */
export class Module {
  /**
   * @param {!Runtime} manager
   * @param {!ModuleDescriptor} descriptor
   */
  constructor(manager, descriptor) {
    this._manager = manager;
    this._descriptor = descriptor;
    this._name = descriptor.name;
    /** @type {!Array<!Extension>} */
    this._extensions = [];

    /** @type {!Map<string, !Array<!Extension>>} */
    this._extensionsByClassName = new Map();
    const extensions = /** @type {?Array.<!RuntimeExtensionDescriptor>} */ (descriptor.extensions);
    for (let i = 0; extensions && i < extensions.length; ++i) {
      const extension = new Extension(this, extensions[i]);
      this._manager._extensions.push(extension);
      this._extensions.push(extension);
    }
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
    return Runtime._isDescriptorEnabled(this._descriptor);
  }

  /**
   * @param {string} name
   * @return {string}
   */
  resource(name) {
    const fullName = this._name + '/' + name;
    const content = self.Runtime.cachedResources[fullName];
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
                                   .then(this._loadResources.bind(this))
                                   .then(this._loadModules.bind(this))
                                   .then(this._loadScripts.bind(this))
                                   .then(() => this._loadedForTest = true);

    return this._pendingLoadPromise;
  }

  /**
   * @return {!Promise.<void>}
   * @this {Module}
   */
  _loadResources() {
    const resources = this._descriptor['resources'];
    if (!resources || !resources.length) {
      return Promise.resolve();
    }
    const promises = [];
    for (let i = 0; i < resources.length; ++i) {
      const url = this._modularizeURL(resources[i]);
      const isHtml = url.endsWith('.html');
      promises.push(loadResourceIntoCache(url, !isHtml /* appendSourceURL */));
    }
    return Promise.all(promises).then(undefined);
  }

  _loadModules() {
    if (!this._descriptor.modules || !this._descriptor.modules.length) {
      return Promise.resolve();
    }

    const namespace = this._computeNamespace();
    // @ts-ignore Legacy global namespace instantation
    self[namespace] = self[namespace] || {};

    const legacyFileName = `${this._name}-legacy.js`;
    const fileName = this._descriptor.modules.includes(legacyFileName) ? legacyFileName : `${this._name}.js`;

    // TODO(crbug.com/1011811): Remove eval when we use TypeScript which does support dynamic imports
    return eval(`import('../${this._name}/${fileName}')`);
  }

  /**
   * @return {!Promise.<void>}
   */
  _loadScripts() {
    if (!this._descriptor.scripts || !this._descriptor.scripts.length) {
      return Promise.resolve();
    }

    const namespace = this._computeNamespace();
    // @ts-ignore Legacy global namespace instantation
    self[namespace] = self[namespace] || {};
    return loadScriptsPromise(this._descriptor.scripts.map(this._modularizeURL, this), this._remoteBase());
  }

  /**
   * @return {string}
   */
  _computeNamespace() {
    return specialCases[this._name] ||
        this._name.split('_').map(a => a.substring(0, 1).toUpperCase() + a.substring(1)).join('');
  }

  /**
   * @param {string} resourceName
   */
  _modularizeURL(resourceName) {
    return Runtime.normalizePath(this._name + '/' + resourceName);
  }

  /**
   * @return {string|undefined}
   */
  _remoteBase() {
    return !Runtime.queryParam('debugFrontend') && this._descriptor.remote && remoteBase || undefined;
  }

  /**
   * @param {string} resourceName
   * @return {!Promise.<string>}
   */
  fetchResource(resourceName) {
    const base = this._remoteBase();
    const sourceURL = getResourceURL(this._modularizeURL(resourceName), base);
    return base ? loadResourcePromiseWithFallback(sourceURL) : loadResourcePromise(sourceURL);
  }

  /**
   * @param {string} value
   * @return {string}
   */
  substituteURL(value) {
    const base = this._remoteBase() || '';
    return value.replace(/@url\(([^\)]*?)\)/g, convertURL.bind(this));

    /**
     * @param {string} match
     * @param {string} url
     * @this {Module}
     */
    function convertURL(match, url) {
      return base + this._modularizeURL(url);
    }
  }
}

/**
 * @unrestricted
 */
export class Extension {
  /**
  * @param {!Module} moduleParam
  * @param {!RuntimeExtensionDescriptor} descriptor
  */
  constructor(moduleParam, descriptor) {
    this._module = moduleParam;
    this._descriptor = descriptor;

    this._type = descriptor.type;
    this._hasTypeClass = this._type.charAt(0) === '@';

    /**
    * @type {?string}
    */
    this._className = descriptor.className || null;
    this._factoryName = descriptor.factoryName || null;
  }

  /**
  * @return {!RuntimeExtensionDescriptor}
  */
  descriptor() {
    return this._descriptor;
  }

  /**
  * @return {!Module}
  */
  module() {
    return this._module;
  }

  /**
  * @return {boolean}
  */
  enabled() {
    return this._module.enabled() && Runtime._isDescriptorEnabled(this.descriptor());
  }

  /**
  * @return {?function(new:Object)}
  */
  _typeClass() {
    if (!this._hasTypeClass) {
      return null;
    }
    return this._module._manager._resolve(this._type.substring(1));
  }

  /**
  * @param {?Object} context
  * @return {boolean}
  */
  isApplicable(context) {
    return this._module._manager.isExtensionApplicableToContext(this, context);
  }

  /**
  * @return {!Promise.<!Object>}
  */
  instance() {
    return this._module._loadPromise().then(this._createInstance.bind(this));
  }

  /**
  * @return {boolean}
  */
  canInstantiate() {
    return !!(this._className || this._factoryName);
  }

  /**
  * @return {!Object}
  */
  _createInstance() {
    const className = this._className || this._factoryName;
    if (!className) {
      throw new Error('Could not instantiate extension with no class');
    }
    const constructorFunction = self.eval(/** @type {string} */ (className));
    if (!(constructorFunction instanceof Function)) {
      throw new Error('Could not instantiate: ' + className);
    }
    if (this._className) {
      return this._module._manager.sharedInstance(constructorFunction);
    }
    return new constructorFunction(this);
  }

  /**
  * @return {string}
  */
  title() {
    // @ts-ignore Magic lookup for objects
    const title = this._descriptor['title-' + runtimePlatform] || this._descriptor['title'];
    if (title && l10nCallback) {
      return l10nCallback(title);
    }
    return title;
  }

  /**
  * @param {function(new:Object)} contextType
  * @return {boolean}
  */
  hasContextType(contextType) {
    const contextTypes = this.descriptor().contextTypes;
    if (!contextTypes) {
      return false;
    }
    for (let i = 0; i < contextTypes.length; ++i) {
      if (contextType === this._module._manager._resolve(contextTypes[i])) {
        return true;
      }
    }
    return false;
  }
}

/**
* @unrestricted
*/
export class ExperimentsSupport {
  constructor() {
    /** @type {!Array<!Experiment>} */
    this._experiments = [];
    /** @type {!Object<string,boolean>} */
    this._experimentNames = {};
    /** @type {!Object<string,boolean>} */
    this._enabledTransiently = {};
    /** @type {!Set<string>} */
    this._serverEnabled = new Set();
  }

  /**
  * @return {!Array.<!Experiment>}
  */
  allConfigurableExperiments() {
    const result = [];
    for (let i = 0; i < this._experiments.length; i++) {
      const experiment = this._experiments[i];
      if (!this._enabledTransiently[experiment.name]) {
        result.push(experiment);
      }
    }
    return result;
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
    Runtime._assert(!this._experimentNames[experimentName], 'Duplicate registration of experiment ' + experimentName);
    this._experimentNames[experimentName] = true;
    this._experiments.push(new Experiment(this, experimentName, experimentTitle, !!unstable));
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
    if (this._enabledTransiently[experimentName]) {
      return true;
    }
    if (this._serverEnabled.has(experimentName)) {
      return true;
    }

    return !!Runtime._experimentsSetting()[experimentName];
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
  setDefaultExperiments(experimentNames) {
    for (let i = 0; i < experimentNames.length; ++i) {
      this._checkExperiment(experimentNames[i]);
      this._enabledTransiently[experimentNames[i]] = true;
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
    this._enabledTransiently[experimentName] = true;
  }

  clearForTest() {
    this._experiments = [];
    this._experimentNames = {};
    this._enabledTransiently = {};
    this._serverEnabled.clear();
  }

  cleanUpStaleExperiments() {
    const experimentsSetting = Runtime._experimentsSetting();
    /** @type {!Object<string,boolean>} */
    const cleanedUpExperimentSetting = {};
    for (let i = 0; i < this._experiments.length; ++i) {
      const experimentName = this._experiments[i].name;
      if (experimentsSetting[experimentName]) {
        cleanedUpExperimentSetting[experimentName] = true;
      }
    }
    this._setExperimentsSetting(cleanedUpExperimentSetting);
  }

  /**
  * @param {string} experimentName
  */
  _checkExperiment(experimentName) {
    Runtime._assert(this._experimentNames[experimentName], 'Unknown experiment ' + experimentName);
  }
}

/**
* @unrestricted
*/
class Experiment {
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
 * @private
 * @param {string} url
 * @param {boolean} asBinary
 * @template T
 * @return {!Promise.<T>}
 */
function internalLoadResourcePromise(url, asBinary) {
  return new Promise(load);

  /**
   * @param {function(?):void} fulfill
   * @param {function(*):void} reject
   */
  function load(fulfill, reject) {
    const xhr = new XMLHttpRequest();
    xhr.open('GET', url, true);
    if (asBinary) {
      xhr.responseType = 'arraybuffer';
    }
    xhr.onreadystatechange = onreadystatechange;

    /**
     * @param {!Event} e
     */
    function onreadystatechange(e) {
      if (xhr.readyState !== XMLHttpRequest.DONE) {
        return;
      }

      const {response} = /** @type {*} */ (e.target);

      const text = asBinary ? new TextDecoder().decode(response) : response;

      // DevTools Proxy server can mask 404s as 200s, check the body to be sure
      const status = /^HTTP\/1.1 404/.test(text) ? 404 : xhr.status;

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
 * @type {!Object<string,boolean>}
 */
const loadedScripts = {};

/**
 * @param {!Array.<string>} scriptNames
 * @param {string=} base
 * @return {!Promise.<void>}
 */
function loadScriptsPromise(scriptNames, base) {
  /** @type {!Array<!Promise<void>>} */
  const promises = [];
  /** @type {!Array<string>} */
  const urls = [];
  const sources = new Array(scriptNames.length);
  let scriptToEval = 0;
  for (let i = 0; i < scriptNames.length; ++i) {
    const scriptName = scriptNames[i];
    const sourceURL = getResourceURL(scriptName, base);

    if (loadedScripts[sourceURL]) {
      continue;
    }
    urls.push(sourceURL);
    const promise = base ? loadResourcePromiseWithFallback(sourceURL) : loadResourcePromise(sourceURL);
    promises.push(promise.then(scriptSourceLoaded.bind(null, i), scriptSourceLoaded.bind(null, i, undefined)));
  }
  return Promise.all(promises).then(undefined);

  /**
   * @param {number} scriptNumber
   * @param {string=} scriptSource
   */
  function scriptSourceLoaded(scriptNumber, scriptSource) {
    sources[scriptNumber] = scriptSource || '';
    // Eval scripts as fast as possible.
    while (typeof sources[scriptToEval] !== 'undefined') {
      evaluateScript(urls[scriptToEval], sources[scriptToEval]);
      ++scriptToEval;
    }
  }

  /**
   * @param {string} sourceURL
   * @param {string=} scriptSource
   */
  function evaluateScript(sourceURL, scriptSource) {
    loadedScripts[sourceURL] = true;
    if (!scriptSource) {
      // Do not reject, as this is normal in the hosted mode.
      console.error('Empty response arrived for script \'' + sourceURL + '\'');
      return;
    }
    self.eval(scriptSource + '\n//# sourceURL=' + sourceURL);
  }
}

/**
 * @param {string} url
 * @return {!Promise.<string>}
 */
function loadResourcePromiseWithFallback(url) {
  return loadResourcePromise(url).catch(err => {
    const urlWithFallbackVersion = url.replace(/@[0-9a-f]{40}/, REMOTE_MODULE_FALLBACK_REVISION);
    // TODO(phulce): mark fallbacks in module.json and modify build script instead
    if (urlWithFallbackVersion === url || !url.includes('lighthouse_worker_module')) {
      throw err;
    }
    return loadResourcePromise(urlWithFallbackVersion);
  });
}

/**
 * @param {string} url
 * @param {boolean} appendSourceURL
 * @return {!Promise<void>}
 */
function loadResourceIntoCache(url, appendSourceURL) {
  return loadResourcePromise(url).then(cacheResource.bind(null, url), cacheResource.bind(null, url, undefined));

  /**
   * @param {string} path
   * @param {string=} content
   */
  function cacheResource(path, content) {
    if (!content) {
      console.error('Failed to load resource: ' + path);
      return;
    }
    const sourceURL = appendSourceURL ? Runtime.resolveSourceURL(path) : '';
    self.Runtime.cachedResources[path] = content + sourceURL;
  }
}

/**
 * @param {string} url
 * @return {!Promise.<string>}
 */
export function loadResourcePromise(url) {
  return internalLoadResourcePromise(url, false);
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

(function validateRemoteBase() {
  if (location.href.startsWith('devtools://devtools/bundled/')) {
    const queryParam = Runtime.queryParam('remoteBase');
    if (queryParam) {
      const versionMatch = /\/serve_file\/(@[0-9a-zA-Z]+)\/?$/.exec(queryParam);
      if (versionMatch) {
        remoteBase = `${location.origin}/remote/serve_file/${versionMatch[1]}/`;
      }
    }
  }
})();

(function() {
const baseUrl = self.location ? self.location.origin + self.location.pathname : '';
importScriptPathPrefix = baseUrl.substring(0, baseUrl.lastIndexOf('/') + 1);
})();

// This must be constructed after the query parameters have been parsed.
export const experiments = new ExperimentsSupport();
