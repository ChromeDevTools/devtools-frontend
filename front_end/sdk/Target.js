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
   */
  constructor(targetManager, id, name, capabilitiesMask, connectionFactory, parentTarget) {
    super(connectionFactory);
    this._targetManager = targetManager;
    this._name = name;
    this._inspectedURL = '';
    this._capabilitiesMask = capabilitiesMask;
    this._parentTarget = parentTarget;
    this._id = id;
    this._modelByConstructor = new Map();
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
      var capabilities = SDK.SDKModel._capabilitiesByModelClass.get(modelClass);
      if (capabilities === undefined)
        throw 'Model class is not registered';
      if ((this._capabilitiesMask & capabilities) === capabilities) {
        var model = new modelClass(this);
        this._modelByConstructor.set(modelClass, model);
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

  None: 0,

  AllForTests: (1 << 8) - 1
};

/**
 * @unrestricted
 */
SDK.SDKObject = class extends Common.Object {
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
};

/**
 * @unrestricted
 */
SDK.SDKModel = class extends SDK.SDKObject {
  /**
   * @param {!SDK.Target} target
   */
  constructor(target) {
    super(target);
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
 */
SDK.SDKModel.register = function(modelClass, capabilities) {
  if (!SDK.SDKModel._capabilitiesByModelClass)
    SDK.SDKModel._capabilitiesByModelClass = new Map();
  SDK.SDKModel._capabilitiesByModelClass.set(modelClass, capabilities);
};

/** @type {!Map<function(new:SDK.SDKModel, !SDK.Target), number>} */
SDK.SDKModel._capabilitiesByModelClass;
