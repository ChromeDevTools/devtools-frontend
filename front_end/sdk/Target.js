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
   * @param {string} name
   * @param {number} capabilitiesMask
   * @param {!InspectorBackendClass.Connection.Factory} connectionFactory
   * @param {?SDK.Target} parentTarget
   */
  constructor(targetManager, name, capabilitiesMask, connectionFactory, parentTarget) {
    super(connectionFactory);
    this._targetManager = targetManager;
    this._name = name;
    this._inspectedURL = '';
    this._capabilitiesMask = capabilitiesMask;
    this._parentTarget = parentTarget;
    this._id = SDK.Target._nextId++;

    /** @type {!Map.<!Function, !SDK.SDKModel>} */
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
   * @return {number}
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
   * @param {!Function} modelClass
   * @return {?SDK.SDKModel}
   */
  model(modelClass) {
    return this._modelByConstructor.get(modelClass) || null;
  }

  /**
   * @return {!Array<!SDK.SDKModel>}
   */
  models() {
    return this._modelByConstructor.valuesArray();
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
  Browser: 1,
  DOM: 2,
  JS: 4,
  Log: 8,
  Network: 16,
  Target: 32,

  AllForTests: 63
};

SDK.Target._nextId = 1;

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
   * @param {!Function} modelClass
   * @param {!SDK.Target} target
   */
  constructor(modelClass, target) {
    super(target);
    target._modelByConstructor.set(modelClass, this);
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

  /**
   * @param {!Common.Event} event
   */
  _targetDisposed(event) {
    var target = /** @type {!SDK.Target} */ (event.data);
    if (target !== this._target)
      return;
    this.dispose();
  }
};
