/*
 * Copyright 2014 The Chromium Authors. All rights reserved.
 * Use of this source code is governed by a BSD-style license that can be
 * found in the LICENSE file.
 */

/**
 * @unrestricted
 */
export default class Target extends Protocol.TargetBase {
  /**
   * @param {!SDK.TargetManager} targetManager
   * @param {string} id
   * @param {string} name
   * @param {!Type} type
   * @param {?SDK.Target} parentTarget
   * @param {string} sessionId
   * @param {boolean} suspended
   * @param {?Protocol.Connection} connection
   */
  constructor(targetManager, id, name, type, parentTarget, sessionId, suspended, connection) {
    const needsNodeJSPatching = type === Type.Node;
    super(needsNodeJSPatching, parentTarget, sessionId, connection);
    this._targetManager = targetManager;
    this._name = name;
    this._inspectedURL = '';
    this._capabilitiesMask = 0;
    switch (type) {
      case Type.Frame:
        this._capabilitiesMask = Capability.Browser | Capability.Storage | Capability.DOM | Capability.JS |
            Capability.Log | Capability.Network | Capability.Target | Capability.Tracing | Capability.Emulation |
            Capability.Input | Capability.Inspector;
        if (!parentTarget) {
          // This matches backend exposing certain capabilities only for the main frame.
          this._capabilitiesMask |=
              Capability.DeviceEmulation | Capability.ScreenCapture | Capability.Security | Capability.ServiceWorker;
          // TODO(dgozman): we report service workers for the whole frame tree on the main frame,
          // while we should be able to only cover the subtree corresponding to the target.
        }
        break;
      case Type.ServiceWorker:
        this._capabilitiesMask =
            Capability.JS | Capability.Log | Capability.Network | Capability.Target | Capability.Inspector;
        if (!parentTarget) {
          this._capabilitiesMask |= Capability.Browser;
        }
        break;
      case Type.Worker:
        this._capabilitiesMask = Capability.JS | Capability.Log | Capability.Network | Capability.Target;
        break;
      case Type.Node:
        this._capabilitiesMask = Capability.JS;
        break;
      case Type.Browser:
        this._capabilitiesMask = Capability.Target;
        break;
    }
    this._type = type;
    this._parentTarget = parentTarget;
    this._id = id;
    this._modelByConstructor = new Map();
    this._isSuspended = suspended;
  }

  createModels(required) {
    this._creatingModels = true;
    // TODO(dgozman): fix this in bindings layer.
    this.model(SDK.ResourceTreeModel);
    const registered = Array.from(SDK.SDKModel.registeredModels.keys());
    for (const modelClass of registered) {
      const info = SDK.SDKModel.registeredModels.get(modelClass);
      if (info.autostart || required.has(modelClass)) {
        this.model(modelClass);
      }
    }
    this._creatingModels = false;
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
   * @return {!Type}
   */
  type() {
    return this._type;
  }

  /**
   * @override
   */
  markAsNodeJSForTest() {
    super.markAsNodeJSForTest();
    this._type = Type.Node;
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
    // TODO(dgozman): get rid of this method, once we never observe targets with
    // capability mask.
    return (this._capabilitiesMask & capabilitiesMask) === capabilitiesMask;
  }

  /**
   * @param {string} label
   * @return {string}
   */
  decorateLabel(label) {
    return (this._type === Type.Worker || this._type === Type.ServiceWorker) ? '\u2699 ' + label : label;
  }

  /**
   * @return {?SDK.Target}
   */
  parentTarget() {
    return this._parentTarget;
  }

  /**
   * @override
   * @param {string} reason
   */
  dispose(reason) {
    super.dispose(reason);
    this._targetManager.removeTarget(this);
    for (const model of this._modelByConstructor.valuesArray()) {
      model.dispose();
    }
  }

  /**
   * @param {function(new:T, !SDK.Target)} modelClass
   * @return {?T}
   * @template T
   */
  model(modelClass) {
    if (!this._modelByConstructor.get(modelClass)) {
      const info = SDK.SDKModel.registeredModels.get(modelClass);
      if (info === undefined) {
        throw 'Model class is not registered @' + new Error().stack;
      }
      if ((this._capabilitiesMask & info.capabilities) === info.capabilities) {
        const model = new modelClass(this);
        this._modelByConstructor.set(modelClass, model);
        if (!this._creatingModels) {
          this._targetManager.modelAdded(this, modelClass, model);
        }
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
    const parsedURL = inspectedURL.asParsedURL();
    this._inspectedURLName = parsedURL ? parsedURL.lastPathComponentWithFragment() : '#' + this._id;
    if (!this.parentTarget()) {
      Host.InspectorFrontendHost.inspectedURLChanged(inspectedURL || '');
    }
    this._targetManager.dispatchEventToListeners(SDK.TargetManager.Events.InspectedURLChanged, this);
    if (!this._name) {
      this._targetManager.dispatchEventToListeners(SDK.TargetManager.Events.NameChanged, this);
    }
  }

  /**
   * @param {string=} reason - optionally provide a reason, so models can respond accordingly
   * @return {!Promise}
   */
  async suspend(reason) {
    if (this._isSuspended) {
      return Promise.resolve();
    }
    this._isSuspended = true;

    await Promise.all(Array.from(this.models().values(), m => m.preSuspendModel(reason)));
    await Promise.all(Array.from(this.models().values(), m => m.suspendModel(reason)));
  }

  /**
   * @return {!Promise}
   */
  async resume() {
    if (!this._isSuspended) {
      return Promise.resolve();
    }
    this._isSuspended = false;

    await Promise.all(Array.from(this.models().values(), m => m.resumeModel()));
    await Promise.all(Array.from(this.models().values(), m => m.postResumeModel()));
  }

  /**
   * @return {boolean}
   */
  suspended() {
    return this._isSuspended;
  }
}

/**
 * @enum {number}
 */
export const Capability = {
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
  Storage: 1 << 13,
  ServiceWorker: 1 << 14,

  None: 0,
};

/**
 * @enum {string}
 */
export const Type = {
  Frame: 'frame',
  ServiceWorker: 'service-worker',
  Worker: 'worker',
  Node: 'node',
  Browser: 'browser',
};

/* Legacy exported object */
self.SDK = self.SDK || {};

/* Legacy exported object */
SDK = SDK || {};

/** @constructor */
SDK.Target = Target;

/**
 * @enum {number}
 */
SDK.Target.Capability = Capability;

/**
 * @enum {string}
 */
SDK.Target.Type = Type;
