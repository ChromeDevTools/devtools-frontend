/*
 * Copyright 2014 The Chromium Authors. All rights reserved.
 * Use of this source code is governed by a BSD-style license that can be
 * found in the LICENSE file.
 */

/**
 * @unrestricted
 */
SDK.Target = class extends Protocol.TargetBase {
  /**
   * @param {!SDK.TargetManager} targetManager
   * @param {string} id
   * @param {string} name
   * @param {number} capabilitiesMask
   * @param {!Protocol.InspectorBackend.Connection.Factory} connectionFactory
   * @param {?SDK.Target} parentTarget
   * @param {boolean} suspended
   */
  constructor(targetManager, id, name, capabilitiesMask, connectionFactory, parentTarget, suspended) {
    super(connectionFactory);
    this._targetManager = targetManager;
    this._name = name;
    this._inspectedURL = '';
    this._capabilitiesMask = capabilitiesMask;
    this._parentTarget = parentTarget;
    this._id = id;
    this._modelByConstructor = new Map();
    this._isSuspended = suspended;
  }

  createModels(required) {
    this._creatingModels = true;
    // TODO(dgozman): fix this in bindings layer.
    this.model(SDK.ResourceTreeModel);
    var registered = Array.from(SDK.SDKModel._registeredModels.keys());
    for (var modelClass of registered) {
      var info = SDK.SDKModel._registeredModels.get(modelClass);
      if (info.autostart || required.has(modelClass))
        this.model(modelClass);
    }
    this._creatingModels = false;
  }

  /**
   * @return {boolean}
   */
  isNodeJS() {
    // TODO(lushnikov): this is an unreliable way to detect Node.js targets.
    return this._capabilitiesMask === SDK.Target.Capability.JS || this._isNodeJSForTest;
  }

  setIsNodeJSForTest() {
    this._isNodeJSForTest = true;
  }

  /**
   * @return {string}
   */
  id() {
    return this._id;
  }

  /**
   * @return {string}
   */
  name() {
    return this._name || this._inspectedURLName;
  }

  /**
   * @return {!SDK.TargetManager}
   */
  targetManager() {
    return this._targetManager;
  }

  /**
   * @param {number} capabilitiesMask
   * @return {boolean}
   */
  hasAllCapabilities(capabilitiesMask) {
    return (this._capabilitiesMask & capabilitiesMask) === capabilitiesMask;
  }

  /**
   * @param {string} label
   * @return {string}
   */
  decorateLabel(label) {
    return !this.hasBrowserCapability() ? '\u2699 ' + label : label;
  }

  /**
   * @return {boolean}
   */
  hasBrowserCapability() {
    return this.hasAllCapabilities(SDK.Target.Capability.Browser);
  }

  /**
   * @return {boolean}
   */
  hasJSCapability() {
    return this.hasAllCapabilities(SDK.Target.Capability.JS);
  }

  /**
   * @return {boolean}
   */
  hasLogCapability() {
    return this.hasAllCapabilities(SDK.Target.Capability.Log);
  }

  /**
   * @return {boolean}
   */
  hasNetworkCapability() {
    return this.hasAllCapabilities(SDK.Target.Capability.Network);
  }

  /**
   * @return {boolean}
   */
  hasTargetCapability() {
    return this.hasAllCapabilities(SDK.Target.Capability.Target);
  }

  /**
   * @return {boolean}
   */
  hasDOMCapability() {
    return this.hasAllCapabilities(SDK.Target.Capability.DOM);
  }

  /**
   * @return {?SDK.Target}
   */
  parentTarget() {
    return this._parentTarget;
  }

  /**
   * @override
   */
  dispose() {
    this._targetManager.removeTarget(this);
    for (var model of this._modelByConstructor.valuesArray())
      model.dispose();
  }

  /**
   * @param {function(new:T, !SDK.Target)} modelClass
   * @return {?T}
   * @template T
   */
  model(modelClass) {
    if (!this._modelByConstructor.get(modelClass)) {
      var info = SDK.SDKModel._registeredModels.get(modelClass);
      if (info === undefined)
        throw 'Model class is not registered @' + new Error().stack;
      if ((this._capabilitiesMask & info.capabilities) === info.capabilities) {
        var model = new modelClass(this);
        this._modelByConstructor.set(modelClass, model);
        if (!this._creatingModels)
          this._targetManager.modelAdded(this, modelClass, model);
      }
    }
    return this._modelByConstructor.get(modelClass) || null;
  }

  /**
   * @return {!Map<function(new:SDK.SDKModel, !SDK.Target), !SDK.SDKModel>}
   */
  models() {
    return this._modelByConstructor;
  }

  /**
   * @return {string}
   */
  inspectedURL() {
    return this._inspectedURL;
  }

  /**
   * @param {string} inspectedURL
   */
  setInspectedURL(inspectedURL) {
    this._inspectedURL = inspectedURL;
    var parsedURL = inspectedURL.asParsedURL();
    this._inspectedURLName = parsedURL ? parsedURL.lastPathComponentWithFragment() : '#' + this._id;
    if (!this.parentTarget())
      InspectorFrontendHost.inspectedURLChanged(inspectedURL || '');
    this._targetManager.dispatchEventToListeners(SDK.TargetManager.Events.InspectedURLChanged, this);
    if (!this._name)
      this._targetManager.dispatchEventToListeners(SDK.TargetManager.Events.NameChanged, this);
  }

  /**
   * @return {!Promise}
   */
  suspend() {
    if (this._isSuspended)
      return Promise.resolve();
    this._isSuspended = true;

    var promises = [];
    for (var model of this.models().values())
      promises.push(model.suspendModel());
    return Promise.all(promises);
  }

  /**
   * @return {!Promise}
   */
  resume() {
    if (!this._isSuspended)
      return Promise.resolve();
    this._isSuspended = false;

    var promises = [];
    for (var model of this.models().values())
      promises.push(model.resumeModel());
    return Promise.all(promises);
  }

  /**
   * @return {boolean}
   */
  suspended() {
    return this._isSuspended;
  }
};

/**
 * @enum {number}
 */
SDK.Target.Capability = {
  Browser: 1 << 0,
  DOM: 1 << 1,
  JS: 1 << 2,
  Log: 1 << 3,
  Network: 1 << 4,
  Target: 1 << 5,
  ScreenCapture: 1 << 6,
  Tracing: 1 << 7,
  Emulation: 1 << 8,
  Security: 1 << 9,
  Input: 1 << 10,
  Inspector: 1 << 11,
  DeviceEmulation: 1 << 12,

  None: 0,

  AllForTests: (1 << 13) - 1
};

/**
 * @unrestricted
 */
SDK.SDKModel = class extends Common.Object {
  /**
   * @param {!SDK.Target} target
   */
  constructor(target) {
    super();
    this._target = target;
  }

  /**
   * @return {!SDK.Target}
   */
  target() {
    return this._target;
  }

  /**
   * @return {!Promise}
   */
  suspendModel() {
    return Promise.resolve();
  }

  /**
   * @return {!Promise}
   */
  resumeModel() {
    return Promise.resolve();
  }

  dispose() {
  }
};


/**
 * @param {function(new:SDK.SDKModel, !SDK.Target)} modelClass
 * @param {number} capabilities
 * @param {boolean} autostart
 */
SDK.SDKModel.register = function(modelClass, capabilities, autostart) {
  if (!SDK.SDKModel._registeredModels)
    SDK.SDKModel._registeredModels = new Map();
  SDK.SDKModel._registeredModels.set(modelClass, {capabilities: capabilities, autostart: autostart});
};

/** @type {!Map<function(new:SDK.SDKModel, !SDK.Target), !{capabilities: number, autostart: boolean}>} */
SDK.SDKModel._registeredModels;
