/*
 * Copyright (C) 2014 Google Inc. All rights reserved.
 *
 * Redistribution and use in source and binary forms, with or without
 * modification, are permitted provided that the following conditions are
 * met:
 *
 *     * Redistributions of source code must retain the above copyright
 * notice, this list of conditions and the following disclaimer.
 *     * Redistributions in binary form must reproduce the above
 * copyright notice, this list of conditions and the following disclaimer
 * in the documentation and/or other materials provided with the
 * distribution.
 *     * Neither the name of Google Inc. nor the names of its
 * contributors may be used to endorse or promote products derived from
 * this software without specific prior written permission.
 *
 * THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS
 * "AS IS" AND ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT
 * LIMITED TO, THE IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS FOR
 * A PARTICULAR PURPOSE ARE DISCLAIMED. IN NO EVENT SHALL THE COPYRIGHT
 * OWNER OR CONTRIBUTORS BE LIABLE FOR ANY DIRECT, INDIRECT, INCIDENTAL,
 * SPECIAL, EXEMPLARY, OR CONSEQUENTIAL DAMAGES (INCLUDING, BUT NOT
 * LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR SERVICES; LOSS OF USE,
 * DATA, OR PROFITS; OR BUSINESS INTERRUPTION) HOWEVER CAUSED AND ON ANY
 * THEORY OF LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY, OR TORT
 * (INCLUDING NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE
 * OF THIS SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.
 */

// This gets all concatenated module descriptors in the release mode.
var allDescriptors = [];
var applicationDescriptor;
var _loadedScripts = {};

// FIXME: This is a workaround to force Closure compiler provide
// the standard ES6 runtime for all modules. This should be removed
// once Closure provides standard externs for Map et al.
for (var k of []) {
}

(function() {
  var baseUrl = self.location ? self.location.origin + self.location.pathname : '';
  self._importScriptPathPrefix = baseUrl.substring(0, baseUrl.lastIndexOf('/') + 1);
})();

/**
 * @constructor
 * @param {!Array.<!Runtime.ModuleDescriptor>} descriptors
 */
function Runtime(descriptors) {
  /** @type {!Array<!Runtime.Module>} */
  this._modules = [];
  /** @type {!Object<string, !Runtime.Module>} */
  this._modulesMap = {};
  /** @type {!Array<!Runtime.Extension>} */
  this._extensions = [];
  /** @type {!Object<string, !function(new:Object)>} */
  this._cachedTypeClasses = {};
  /** @type {!Object<string, !Runtime.ModuleDescriptor>} */
  this._descriptorsMap = {};

  for (var i = 0; i < descriptors.length; ++i)
    this._registerModule(descriptors[i]);
}

/**
 * @param {string} url
 * @return {!Promise.<string>}
 */
Runtime.loadResourcePromise = function(url) {
  return new Promise(load);

  /**
   * @param {function(?)} fulfill
   * @param {function(*)} reject
   */
  function load(fulfill, reject) {
    var xhr = new XMLHttpRequest();
    xhr.open('GET', url, true);
    xhr.onreadystatechange = onreadystatechange;

    /**
     * @param {Event} e
     */
    function onreadystatechange(e) {
      if (xhr.readyState !== XMLHttpRequest.DONE)
        return;

      if ([0, 200, 304].indexOf(xhr.status) === -1)  // Testing harness file:/// results in 0.
        reject(new Error(
            'While loading from url ' + url + ' server responded with a status of ' + xhr.status));
      else
        fulfill(e.target.response);
    }
    xhr.send(null);
  }
};

/**
 * http://tools.ietf.org/html/rfc3986#section-5.2.4
 * @param {string} path
 * @return {string}
 */
Runtime.normalizePath = function(path) {
  if (path.indexOf('..') === -1 && path.indexOf('.') === -1)
    return path;

  var normalizedSegments = [];
  var segments = path.split('/');
  for (var i = 0; i < segments.length; i++) {
    var segment = segments[i];
    if (segment === '.')
      continue;
    else if (segment === '..')
      normalizedSegments.pop();
    else if (segment)
      normalizedSegments.push(segment);
  }
  var normalizedPath = normalizedSegments.join('/');
  if (normalizedPath[normalizedPath.length - 1] === '/')
    return normalizedPath;
  if (path[0] === '/' && normalizedPath)
    normalizedPath = '/' + normalizedPath;
  if ((path[path.length - 1] === '/') || (segments[segments.length - 1] === '.') ||
      (segments[segments.length - 1] === '..'))
    normalizedPath = normalizedPath + '/';

  return normalizedPath;
};

/**
 * @param {!Array.<string>} scriptNames
 * @param {string=} base
 * @return {!Promise.<undefined>}
 */
Runtime._loadScriptsPromise = function(scriptNames, base) {
  /** @type {!Array<!Promise<undefined>>} */
  var promises = [];
  /** @type {!Array<string>} */
  var urls = [];
  var sources = new Array(scriptNames.length);
  var scriptToEval = 0;
  for (var i = 0; i < scriptNames.length; ++i) {
    var scriptName = scriptNames[i];
    var sourceURL = (base || self._importScriptPathPrefix) + scriptName;

    var schemaIndex = sourceURL.indexOf('://') + 3;
    var pathIndex = sourceURL.indexOf('/', schemaIndex);
    if (pathIndex === -1)
      pathIndex = sourceURL.length;
    sourceURL =
        sourceURL.substring(0, pathIndex) + Runtime.normalizePath(sourceURL.substring(pathIndex));

    if (_loadedScripts[sourceURL])
      continue;
    urls.push(sourceURL);
    promises.push(Runtime.loadResourcePromise(sourceURL).then(
        scriptSourceLoaded.bind(null, i), scriptSourceLoaded.bind(null, i, undefined)));
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
    _loadedScripts[sourceURL] = true;
    if (!scriptSource) {
      // Do not reject, as this is normal in the hosted mode.
      console.error('Empty response arrived for script \'' + sourceURL + '\'');
      return;
    }
    self.eval(scriptSource + '\n//# sourceURL=' + sourceURL);
  }
};

/**
 * @type {!Object.<string, string>}
 */
Runtime._queryParamsObject = {
  __proto__: null
};

Runtime._instanceSymbol = Symbol('instance');
Runtime._extensionSymbol = Symbol('extension');

/**
 * @type {!Object.<string, string>}
 */
Runtime.cachedResources = {
  __proto__: null
};

/**
 * @param {string} url
 * @param {boolean} appendSourceURL
 * @return {!Promise<undefined>}
 */
Runtime.loadResourceIntoCache = function(url, appendSourceURL) {
  return Runtime.loadResourcePromise(url).then(
      cacheResource.bind(this, url), cacheResource.bind(this, url, undefined));

  /**
   * @param {string} path
   * @param {string=} content
   */
  function cacheResource(path, content) {
    if (!content) {
      console.error('Failed to load resource: ' + path);
      return;
    }
    var sourceURL = appendSourceURL ? Runtime.resolveSourceURL(path) : '';
    Runtime.cachedResources[path] = content + sourceURL;
  }
};

/**
 * @param {string} appName
 * @return {!Promise.<undefined>}
 */
Runtime.startApplication = function(appName) {
  console.timeStamp('Runtime.startApplication');

  var allDescriptorsByName = {};
  for (var i = 0; i < allDescriptors.length; ++i) {
    var d = allDescriptors[i];
    allDescriptorsByName[d['name']] = d;
  }

  var applicationPromise;
  if (applicationDescriptor)
    applicationPromise = Promise.resolve(applicationDescriptor);
  else
    applicationPromise = Runtime.loadResourcePromise(appName + '.json').then(JSON.parse.bind(JSON));

  return applicationPromise.then(parseModuleDescriptors);

  /**
     * @param {!{modules: !Array.<!Object>, has_html: boolean}} appDescriptor
     * @return {!Promise.<undefined>}
     */
  function parseModuleDescriptors(appDescriptor) {
    var configuration = appDescriptor.modules;
    var moduleJSONPromises = [];
    var coreModuleNames = [];
    for (var i = 0; i < configuration.length; ++i) {
      var descriptor = configuration[i];
      var name = descriptor['name'];
      var moduleJSON = allDescriptorsByName[name];
      if (moduleJSON)
        moduleJSONPromises.push(Promise.resolve(moduleJSON));
      else
        moduleJSONPromises.push(
            Runtime.loadResourcePromise(name + '/module.json').then(JSON.parse.bind(JSON)));
      if (descriptor['type'] === 'autostart')
        coreModuleNames.push(name);
    }

    return Promise.all(moduleJSONPromises).then(instantiateRuntime);

    /**
         * @param {!Array.<!Object>} moduleDescriptors
         * @return {!Promise.<undefined>}
         */
    function instantiateRuntime(moduleDescriptors) {
      for (var i = 0; i < moduleDescriptors.length; ++i) {
        moduleDescriptors[i].name = configuration[i]['name'];
        moduleDescriptors[i].condition = configuration[i]['condition'];
        moduleDescriptors[i].remote = configuration[i]['type'] === 'remote';
      }
      self.runtime = new Runtime(moduleDescriptors);
      if (coreModuleNames)
        return /** @type {!Promise<undefined>} */ (
            self.runtime._loadAutoStartModules(coreModuleNames));
      return Promise.resolve();
    }
  }
};

/**
 * @param {string} appName
 * @return {!Promise.<undefined>}
 */
Runtime.startWorker = function(appName) {
  return Runtime.startApplication(appName).then(sendWorkerReady);

  function sendWorkerReady() { self.postMessage('workerReady'); }
};

/** @type {?function(!MessagePort)} */
Runtime._sharedWorkerNewPortCallback = null;
/** @type {!Array<!MessagePort>} */
Runtime._sharedWorkerConnectedPorts = [];

/**
 * @param {string} appName
 */
Runtime.startSharedWorker = function(appName) {
  var startPromise = Runtime.startApplication(appName);

  /**
   * @param {!MessageEvent} event
   */
  self.onconnect = function(event) {
    var newPort = /** @type {!MessagePort} */ (event.ports[0]);
    startPromise.then(sendWorkerReadyAndContinue);

    function sendWorkerReadyAndContinue() {
      newPort.postMessage('workerReady');
      if (Runtime._sharedWorkerNewPortCallback)
        Runtime._sharedWorkerNewPortCallback.call(null, newPort);
      else
        Runtime._sharedWorkerConnectedPorts.push(newPort);
    }
  };
};

/**
 * @param {function(!MessagePort)} callback
 */
Runtime.setSharedWorkerNewPortCallback = function(callback) {
  Runtime._sharedWorkerNewPortCallback = callback;
  while (Runtime._sharedWorkerConnectedPorts.length) {
    var port = Runtime._sharedWorkerConnectedPorts.shift();
    callback.call(null, port);
  }
};

/**
 * @param {string} name
 * @return {?string}
 */
Runtime.queryParam = function(name) {
  return Runtime._queryParamsObject[name] || null;
};

/**
 * @return {!Object}
 */
Runtime._experimentsSetting = function() {
  try {
    return /** @type {!Object} */ (JSON.parse(
        self.localStorage && self.localStorage['experiments'] ? self.localStorage['experiments'] :
                                                                '{}'));
  } catch (e) {
    console.error('Failed to parse localStorage[\'experiments\']');
    return {};
  }
};

Runtime._console = console;
Runtime._originalAssert = console.assert;
Runtime._assert = function(value, message) {
  if (value)
    return;
  Runtime._originalAssert.call(Runtime._console, value, message + ' ' + new Error().stack);
};

Runtime._platform = '';

/**
 * @param {string} platform
 */
Runtime.setPlatform = function(platform) {
  Runtime._platform = platform;
};

Runtime.prototype = {
  useTestBase: function() {
    Runtime._remoteBase = 'http://localhost:8000/inspector-sources/';
    if (Runtime.queryParam('debugFrontend'))
      Runtime._remoteBase += 'debug/';
  },

  /**
   * @param {!Runtime.ModuleDescriptor} descriptor
   */
  _registerModule: function(descriptor) {
    var module = new Runtime.Module(this, descriptor);
    this._modules.push(module);
    this._modulesMap[descriptor['name']] = module;
  },

  /**
     * @param {string} moduleName
     * @return {!Promise.<undefined>}
     */
  loadModulePromise: function(moduleName) { return this._modulesMap[moduleName]._loadPromise(); },

  /**
     * @param {!Array.<string>} moduleNames
     * @return {!Promise.<!Array.<*>>}
     */
  _loadAutoStartModules: function(moduleNames) {
    var promises = [];
    for (var i = 0; i < moduleNames.length; ++i)
      promises.push(this.loadModulePromise(moduleNames[i]));
    return Promise.all(promises);
  },

  /**
     * @param {!Runtime.Extension} extension
     * @param {?function(function(new:Object)):boolean} predicate
     * @return {boolean}
     */
  _checkExtensionApplicability: function(extension, predicate) {
    if (!predicate)
      return false;
    var contextTypes = extension.descriptor().contextTypes;
    if (!contextTypes)
      return true;
    for (var i = 0; i < contextTypes.length; ++i) {
      var contextType = this._resolve(contextTypes[i]);
      var isMatching = !!contextType && predicate(contextType);
      if (isMatching)
        return true;
    }
    return false;
  },

  /**
     * @param {!Runtime.Extension} extension
     * @param {?Object} context
     * @return {boolean}
     */
  isExtensionApplicableToContext: function(extension, context) {
    if (!context)
      return true;
    return this._checkExtensionApplicability(extension, isInstanceOf);

    /**
         * @param {!Function} targetType
         * @return {boolean}
         */
    function isInstanceOf(targetType) { return context instanceof targetType; }
  },

  /**
     * @param {!Runtime.Extension} extension
     * @param {!Set.<!Function>=} currentContextTypes
     * @return {boolean}
     */
  isExtensionApplicableToContextTypes: function(extension, currentContextTypes) {
    if (!extension.descriptor().contextTypes)
      return true;

    return this._checkExtensionApplicability(
        extension, currentContextTypes ? isContextTypeKnown : null);

    /**
         * @param {!Function} targetType
         * @return {boolean}
         */
    function isContextTypeKnown(targetType) { return currentContextTypes.has(targetType); }
  },

  /**
     * @param {*} type
     * @param {?Object=} context
     * @param {boolean=} sortByTitle
     * @return {!Array.<!Runtime.Extension>}
     */
  extensions: function(type, context, sortByTitle) {
    return this._extensions.filter(filter).sort(sortByTitle ? titleComparator : orderComparator);

    /**
         * @param {!Runtime.Extension} extension
         * @return {boolean}
         */
    function filter(extension) {
      if (extension._type !== type && extension._typeClass() !== type)
        return false;
      if (!extension.enabled())
        return false;
      return !context || extension.isApplicable(context);
    }

    /**
         * @param {!Runtime.Extension} extension1
         * @param {!Runtime.Extension} extension2
         * @return {number}
         */
    function orderComparator(extension1, extension2) {
      var order1 = extension1.descriptor()['order'] || 0;
      var order2 = extension2.descriptor()['order'] || 0;
      return order1 - order2;
    }

    /**
         * @param {!Runtime.Extension} extension1
         * @param {!Runtime.Extension} extension2
         * @return {number}
         */
    function titleComparator(extension1, extension2) {
      var title1 = extension1.title() || '';
      var title2 = extension2.title() || '';
      return title1.localeCompare(title2);
    }
  },

  /**
     * @param {*} type
     * @param {?Object=} context
     * @return {?Runtime.Extension}
     */
  extension: function(type, context) { return this.extensions(type, context)[0] || null; },

  /**
     * @param {*} type
     * @param {?Object=} context
     * @return {!Promise.<!Array.<!Object>>}
     */
  allInstances: function(type, context) {
    return Promise.all(this.extensions(type, context).map(extension => extension.instance()));
  },

  /**
     * @return {?function(new:Object)}
     */
  _resolve: function(typeName) {
    if (!this._cachedTypeClasses[typeName]) {
      var path = typeName.split('.');
      var object = self;
      for (var i = 0; object && (i < path.length); ++i)
        object = object[path[i]];
      if (object)
        this._cachedTypeClasses[typeName] = /** @type function(new:Object) */ (object);
    }
    return this._cachedTypeClasses[typeName] || null;
  },

  /**
     * @param {!Function} constructorFunction
     * @return {!Object}
     */
  sharedInstance: function(constructorFunction) {
    if (Runtime._instanceSymbol in constructorFunction)
      return constructorFunction[Runtime._instanceSymbol];
    var instance = new constructorFunction();
    constructorFunction[Runtime._instanceSymbol] = instance;
    return instance;
  }
};

/**
 * @constructor
 */
Runtime.ModuleDescriptor = function() {
  /**
   * @type {string}
   */
  this.name;

  /**
   * @type {!Array.<!Runtime.ExtensionDescriptor>}
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
   * @type {string|undefined}
   */
  this.condition;

  /**
   * @type {boolean|undefined}
   */
  this.remote;
};

/**
 * @constructor
 */
Runtime.ExtensionDescriptor = function() {
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
};

/**
 * @constructor
 * @param {!Runtime} manager
 * @param {!Runtime.ModuleDescriptor} descriptor
 */
Runtime.Module = function(manager, descriptor) {
  this._manager = manager;
  this._descriptor = descriptor;
  this._name = descriptor.name;
  /** @type {!Array<!Runtime.Extension>} */
  this._extensions = [];

  /** @type {!Map<string, !Array<!Runtime.Extension>>} */
  this._extensionsByClassName = new Map();
  var extensions = /** @type {?Array.<!Runtime.ExtensionDescriptor>} */ (descriptor.extensions);
  for (var i = 0; extensions && i < extensions.length; ++i) {
    var extension = new Runtime.Extension(this, extensions[i]);
    this._manager._extensions.push(extension);
    this._extensions.push(extension);
  }
  this._loadedForTest = false;
};

Runtime.Module.prototype = {
  /**
     * @return {string}
     */
  name: function() { return this._name; },

  /**
     * @return {boolean}
     */
  enabled: function() { return Runtime._isDescriptorEnabled(this._descriptor); },

  /**
     * @param {string} name
     * @return {string}
     */
  resource: function(name) {
    var fullName = this._name + '/' + name;
    var content = Runtime.cachedResources[fullName];
    if (!content)
      throw new Error(fullName + ' not preloaded. Check module.json');
    return content;
  },

  /**
     * @return {!Promise.<undefined>}
     */
  _loadPromise: function() {
    if (!this.enabled())
      return Promise.reject(new Error('Module ' + this._name + ' is not enabled'));

    if (this._pendingLoadPromise)
      return this._pendingLoadPromise;

    var dependencies = this._descriptor.dependencies;
    var dependencyPromises = [];
    for (var i = 0; dependencies && i < dependencies.length; ++i)
      dependencyPromises.push(this._manager._modulesMap[dependencies[i]]._loadPromise());

    this._pendingLoadPromise = Promise.all(dependencyPromises)
                                   .then(this._loadResources.bind(this))
                                   .then(this._loadScripts.bind(this))
                                   .then(() => this._loadedForTest = true);

    return this._pendingLoadPromise;
  },

  /**
     * @return {!Promise.<undefined>}
     * @this {Runtime.Module}
     */
  _loadResources: function() {
    var resources = this._descriptor['resources'];
    if (!resources || !resources.length)
      return Promise.resolve();
    var promises = [];
    for (var i = 0; i < resources.length; ++i) {
      var url = this._modularizeURL(resources[i]);
      promises.push(Runtime.loadResourceIntoCache(url, true));
    }
    return Promise.all(promises).then(undefined);
  },

  /**
     * @return {!Promise.<undefined>}
     */
  _loadScripts: function() {
    if (!this._descriptor.scripts || !this._descriptor.scripts.length)
      return Promise.resolve();
    return Runtime._loadScriptsPromise(
        this._descriptor.scripts.map(this._modularizeURL, this), this._remoteBase());
  },

  /**
   * @param {string} resourceName
   */
  _modularizeURL: function(resourceName) {
    return Runtime.normalizePath(this._name + '/' + resourceName);
  },

  /**
     * @return {string|undefined}
     */
  _remoteBase: function() {
    return !Runtime.queryParam('debugFrontend') && this._descriptor.remote && Runtime._remoteBase ||
        undefined;
  },

  /**
     * @param {string} value
     * @return {string}
     */
  substituteURL: function(value) {
    var base = this._remoteBase() || '';
    return value.replace(/@url\(([^\)]*?)\)/g, convertURL.bind(this));

    function convertURL(match, url) { return base + this._modularizeURL(url); }
  }
};

/**
 * @param {!Object} descriptor
 * @return {boolean}
 */
Runtime._isDescriptorEnabled = function(descriptor) {
  var activatorExperiment = descriptor['experiment'];
  if (activatorExperiment === '*')
    return Runtime.experiments.supportEnabled();
  if (activatorExperiment && activatorExperiment.startsWith('!') &&
      Runtime.experiments.isEnabled(activatorExperiment.substring(1)))
    return false;
  if (activatorExperiment && !activatorExperiment.startsWith('!') &&
      !Runtime.experiments.isEnabled(activatorExperiment))
    return false;
  var condition = descriptor['condition'];
  if (condition && !condition.startsWith('!') && !Runtime.queryParam(condition))
    return false;
  if (condition && condition.startsWith('!') && Runtime.queryParam(condition.substring(1)))
    return false;
  return true;
};

/**
 * @constructor
 * @param {!Runtime.Module} module
 * @param {!Runtime.ExtensionDescriptor} descriptor
 */
Runtime.Extension = function(module, descriptor) {
  this._module = module;
  this._descriptor = descriptor;

  this._type = descriptor.type;
  this._hasTypeClass = this._type.charAt(0) === '@';

  /**
   * @type {?string}
   */
  this._className = descriptor.className || null;
  this._factoryName = descriptor.factoryName || null;
};

Runtime.Extension.prototype = {
  /**
     * @return {!Object}
     */
  descriptor: function() { return this._descriptor; },

  /**
     * @return {!Runtime.Module}
     */
  module: function() { return this._module; },

  /**
     * @return {boolean}
     */
  enabled: function() {
    return this._module.enabled() && Runtime._isDescriptorEnabled(this.descriptor());
  },

  /**
     * @return {?function(new:Object)}
     */
  _typeClass: function() {
    if (!this._hasTypeClass)
      return null;
    return this._module._manager._resolve(this._type.substring(1));
  },

  /**
     * @param {?Object} context
     * @return {boolean}
     */
  isApplicable: function(context) {
    return this._module._manager.isExtensionApplicableToContext(this, context);
  },

  /**
     * @return {!Promise.<!Object>}
     */
  instance: function() {
    return this._module._loadPromise().then(this._createInstance.bind(this));
  },

  /**
     * @return {!Object}
     */
  _createInstance: function() {
    var className = this._className || this._factoryName;
    if (!className)
      throw new Error('Could not instantiate extension with no class');
    var constructorFunction = self.eval(/** @type {string} */ (className));
    if (!(constructorFunction instanceof Function))
      throw new Error('Could not instantiate: ' + className);
    if (this._className)
      return this._module._manager.sharedInstance(constructorFunction);
    return new constructorFunction(this);
  },

  /**
     * @return {string}
     */
  title: function() {
    // FIXME: should be WebInspector.UIString() but runtime is not l10n aware yet.
    return this._descriptor['title-' + Runtime._platform] || this._descriptor['title'];
  },

  /**
     * @param {function(new:Object)} contextType
     * @return {boolean}
     */
  hasContextType: function(contextType) {
    var contextTypes = this.descriptor().contextTypes;
    if (!contextTypes)
      return false;
    for (var i = 0; i < contextTypes.length; ++i) {
      if (contextType === this._module._manager._resolve(contextTypes[i]))
        return true;
    }
    return false;
  }
};

/**
 * @constructor
 */
Runtime.ExperimentsSupport = function() {
  this._supportEnabled = Runtime.queryParam('experiments') !== null;
  this._experiments = [];
  this._experimentNames = {};
  this._enabledTransiently = {};
};

Runtime.ExperimentsSupport.prototype = {
  /**
     * @return {!Array.<!Runtime.Experiment>}
     */
  allConfigurableExperiments: function() {
    var result = [];
    for (var i = 0; i < this._experiments.length; i++) {
      var experiment = this._experiments[i];
      if (!this._enabledTransiently[experiment.name])
        result.push(experiment);
    }
    return result;
  },

  /**
     * @return {boolean}
     */
  supportEnabled: function() { return this._supportEnabled; },

  /**
   * @param {!Object} value
   */
  _setExperimentsSetting: function(value) {
    if (!self.localStorage)
      return;
    self.localStorage['experiments'] = JSON.stringify(value);
  },

  /**
   * @param {string} experimentName
   * @param {string} experimentTitle
   * @param {boolean=} hidden
   */
  register: function(experimentName, experimentTitle, hidden) {
    Runtime._assert(
        !this._experimentNames[experimentName],
        'Duplicate registration of experiment ' + experimentName);
    this._experimentNames[experimentName] = true;
    this._experiments.push(new Runtime.Experiment(this, experimentName, experimentTitle, !!hidden));
  },

  /**
     * @param {string} experimentName
     * @return {boolean}
     */
  isEnabled: function(experimentName) {
    this._checkExperiment(experimentName);

    if (this._enabledTransiently[experimentName])
      return true;
    if (!this.supportEnabled())
      return false;

    return !!Runtime._experimentsSetting()[experimentName];
  },

  /**
   * @param {string} experimentName
   * @param {boolean} enabled
   */
  setEnabled: function(experimentName, enabled) {
    this._checkExperiment(experimentName);
    var experimentsSetting = Runtime._experimentsSetting();
    experimentsSetting[experimentName] = enabled;
    this._setExperimentsSetting(experimentsSetting);
  },

  /**
   * @param {!Array.<string>} experimentNames
   */
  setDefaultExperiments: function(experimentNames) {
    for (var i = 0; i < experimentNames.length; ++i) {
      this._checkExperiment(experimentNames[i]);
      this._enabledTransiently[experimentNames[i]] = true;
    }
  },

  /**
   * @param {string} experimentName
   */
  enableForTest: function(experimentName) {
    this._checkExperiment(experimentName);
    this._enabledTransiently[experimentName] = true;
  },

  clearForTest: function() {
    this._experiments = [];
    this._experimentNames = {};
    this._enabledTransiently = {};
  },

  cleanUpStaleExperiments: function() {
    var experimentsSetting = Runtime._experimentsSetting();
    var cleanedUpExperimentSetting = {};
    for (var i = 0; i < this._experiments.length; ++i) {
      var experimentName = this._experiments[i].name;
      if (experimentsSetting[experimentName])
        cleanedUpExperimentSetting[experimentName] = true;
    }
    this._setExperimentsSetting(cleanedUpExperimentSetting);
  },

  /**
   * @param {string} experimentName
   */
  _checkExperiment: function(experimentName) {
    Runtime._assert(this._experimentNames[experimentName], 'Unknown experiment ' + experimentName);
  }
};

/**
 * @constructor
 * @param {!Runtime.ExperimentsSupport} experiments
 * @param {string} name
 * @param {string} title
 * @param {boolean} hidden
 */
Runtime.Experiment = function(experiments, name, title, hidden) {
  this.name = name;
  this.title = title;
  this.hidden = hidden;
  this._experiments = experiments;
};

Runtime.Experiment.prototype = {
  /**
     * @return {boolean}
     */
  isEnabled: function() { return this._experiments.isEnabled(this.name); },

  /**
   * @param {boolean} enabled
   */
  setEnabled: function(enabled) { this._experiments.setEnabled(this.name, enabled); }
};

{
  (function parseQueryParameters() {
    var queryParams = location.search;
    if (!queryParams)
      return;
    var params = queryParams.substring(1).split('&');
    for (var i = 0; i < params.length; ++i) {
      var pair = params[i].split('=');
      var name = pair.shift();
      Runtime._queryParamsObject[name] = pair.join('=');
    }
    var flags = Runtime._queryParamsObject['flags'];
    delete Runtime._queryParamsObject['flags'];
    if (flags) {
      try {
        var parsedFlags = JSON.parse(window.decodeURIComponent(flags));
        for (var key in parsedFlags)
          Runtime._queryParamsObject[key] = parsedFlags[key];
      } catch (e) {
        console.error('Invalid startup flag: ' + e);
      }
    }
  })();
}


// This must be constructed after the query parameters have been parsed.
Runtime.experiments = new Runtime.ExperimentsSupport();

/**
 * @type {?string}
 */
Runtime._remoteBase = Runtime.queryParam('remoteBase');
{
  (function validateRemoteBase() {
    var remoteBaseRegexp =
        /^https:\/\/chrome-devtools-frontend\.appspot\.com\/serve_file\/@[0-9a-zA-Z]+\/?$/;
    if (Runtime._remoteBase && !remoteBaseRegexp.test(Runtime._remoteBase))
      Runtime._remoteBase = null;
  })();
}

/**
 * @param {string} path
 * @return {string}
 */
Runtime.resolveSourceURL = function(path) {
  var sourceURL = self.location.href;
  if (self.location.search)
    sourceURL = sourceURL.replace(self.location.search, '');
  sourceURL = sourceURL.substring(0, sourceURL.lastIndexOf('/') + 1) + path;
  return '\n/*# sourceURL=' + sourceURL + ' */';
};

/** @type {!Runtime} */
var runtime;
