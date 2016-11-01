/*
 * Copyright 2014 The Chromium Authors. All rights reserved.
 * Use of this source code is governed by a BSD-style license that can be
 * found in the LICENSE file.
 */

/**
 * @unrestricted
 */
WebInspector.Target = class extends Protocol.Target {
  /**
   * @param {!WebInspector.TargetManager} targetManager
   * @param {string} name
   * @param {number} capabilitiesMask
   * @param {!InspectorBackendClass.Connection.Factory} connectionFactory
   * @param {?WebInspector.Target} parentTarget
   */
  constructor(targetManager, name, capabilitiesMask, connectionFactory, parentTarget) {
    super(connectionFactory);
    this._targetManager = targetManager;
    this._name = name;
    this._inspectedURL = '';
    this._capabilitiesMask = capabilitiesMask;
    this._parentTarget = parentTarget;
    this._id = WebInspector.Target._nextId++;

    /** @type {!Map.<!Function, !WebInspector.SDKModel>} */
    this._modelByConstructor = new Map();
  }

  /**
   * @return {boolean}
   */
  isNodeJS() {
    // TODO(lushnikov): this is an unreliable way to detect Node.js targets.
    return this._capabilitiesMask === WebInspector.Target.Capability.JS || this._isNodeJSForTest;
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
   * @return {!WebInspector.TargetManager}
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
    return this.hasAllCapabilities(WebInspector.Target.Capability.Browser);
  }

  /**
   * @return {boolean}
   */
  hasJSCapability() {
    return this.hasAllCapabilities(WebInspector.Target.Capability.JS);
  }

  /**
   * @return {boolean}
   */
  hasLogCapability() {
    return this.hasAllCapabilities(WebInspector.Target.Capability.Log);
  }

  /**
   * @return {boolean}
   */
  hasNetworkCapability() {
    return this.hasAllCapabilities(WebInspector.Target.Capability.Network);
  }

  /**
   * @return {boolean}
   */
  hasTargetCapability() {
    return this.hasAllCapabilities(WebInspector.Target.Capability.Target);
  }

  /**
   * @return {boolean}
   */
  hasDOMCapability() {
    return this.hasAllCapabilities(WebInspector.Target.Capability.DOM);
  }

  /**
   * @return {?WebInspector.Target}
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
   * @return {?WebInspector.SDKModel}
   */
  model(modelClass) {
    return this._modelByConstructor.get(modelClass) || null;
  }

  /**
   * @return {!Array<!WebInspector.SDKModel>}
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
    this._targetManager.dispatchEventToListeners(WebInspector.TargetManager.Events.InspectedURLChanged, this);
    if (!this._name)
      this._targetManager.dispatchEventToListeners(WebInspector.TargetManager.Events.NameChanged, this);
  }
};

/**
 * @enum {number}
 */
WebInspector.Target.Capability = {
  Browser: 1,
  DOM: 2,
  JS: 4,
  Log: 8,
  Network: 16,
  Target: 32
};

WebInspector.Target._nextId = 1;

/**
 * @unrestricted
 */
WebInspector.SDKObject = class extends WebInspector.Object {
  /**
   * @param {!WebInspector.Target} target
   */
  constructor(target) {
    super();
    this._target = target;
  }

  /**
   * @return {!WebInspector.Target}
   */
  target() {
    return this._target;
  }
};

/**
 * @unrestricted
 */
WebInspector.SDKModel = class extends WebInspector.SDKObject {
  /**
   * @param {!Function} modelClass
   * @param {!WebInspector.Target} target
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
   * @param {!WebInspector.Event} event
   */
  _targetDisposed(event) {
    var target = /** @type {!WebInspector.Target} */ (event.data);
    if (target !== this._target)
      return;
    this.dispose();
  }
};
