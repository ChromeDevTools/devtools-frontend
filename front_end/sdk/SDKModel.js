// Copyright 2019 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as Common from '../common/common.js';
import * as Host from '../host/host.js';
import * as Platform from '../platform/platform.js';
import * as ProtocolClient from '../protocol_client/protocol_client.js';

/** @type {!Map<function(new:SDKModel, !Target), !{capabilities: number, autostart: boolean}>} */
const _registeredModels = new Map();

/**
 * @unrestricted
 */
export class SDKModel extends Common.ObjectWrapper.ObjectWrapper {
  /**
   * @param {!Target} target
   */
  constructor(target) {
    super();
    this._target = target;
  }

  /**
   * @return {!Target}
   */
  target() {
    return this._target;
  }

  /**
   * Override this method to perform tasks that are required to suspend the
   * model and that still need other models in an unsuspended state.
   * @param {string=} reason - optionally provide a reason, the model can respond accordingly
   * @return {!Promise<void>}
   */
  preSuspendModel(reason) {
    return Promise.resolve();
  }

  /**
   * @param {string=} reason - optionally provide a reason, the model can respond accordingly
   * @return {!Promise<void>}
   */
  suspendModel(reason) {
    return Promise.resolve();
  }

  /**
   * @return {!Promise<void>}
   */
  resumeModel() {
    return Promise.resolve();
  }

  /**
   * Override this method to perform tasks that are required to after resuming
   * the model and that require all models already in an unsuspended state.
   * @return {!Promise<void>}
   */
  postResumeModel() {
    return Promise.resolve();
  }

  dispose() {
  }

  /**
   * @param {function(new:SDKModel, !Target)} modelClass
   * @param {number} capabilities
   * @param {boolean} autostart
   */
  static register(modelClass, capabilities, autostart) {
    _registeredModels.set(modelClass, {capabilities, autostart});
  }

  static get registeredModels() {
    return _registeredModels;
  }
}

/**
 * @unrestricted
 */
export class Target extends ProtocolClient.InspectorBackend.TargetBase {
  /**
   * @param {!TargetManager} targetManager
   * @param {string} id
   * @param {string} name
   * @param {!Type} type
   * @param {?Target} parentTarget
   * @param {string} sessionId
   * @param {boolean} suspended
   * @param {?ProtocolClient.InspectorBackend.Connection} connection
   */
  constructor(targetManager, id, name, type, parentTarget, sessionId, suspended, connection) {
    const needsNodeJSPatching = type === Type.Node;
    super(needsNodeJSPatching, parentTarget, sessionId, connection);
    this._targetManager = targetManager;
    this._name = name;
    this._inspectedURL = '';
    this._inspectedURLName = '';
    this._capabilitiesMask = 0;
    switch (type) {
      case Type.Frame:
        this._capabilitiesMask = Capability.Browser | Capability.Storage | Capability.DOM | Capability.JS |
            Capability.Log | Capability.Network | Capability.Target | Capability.Tracing | Capability.Emulation |
            Capability.Input | Capability.Inspector | Capability.Audits;
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

  /**
   * TODO(1011811): Replace type with !Set<function(new:SDKModel, !Target)> once we no longer type-check with closure.
   * @param {*} required
   */
  createModels(required) {
    this._creatingModels = true;
    // TODO(dgozman): fix this in bindings layer.
    // @ts-ignore ResourceTreeModel inherits from SDKModel introducing a cyclic dependency. Use the global for now.
    this.model(SDK.ResourceTreeModel);
    const registered = Array.from(SDKModel.registeredModels.keys());
    for (const modelClass of registered) {
      const info =
          /** @type {!{capabilities: number, autostart: boolean}} */ (SDKModel.registeredModels.get(modelClass));
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
   * @return {!TargetManager}
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
   * @return {?Target}
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
    for (const model of this._modelByConstructor.values()) {
      model.dispose();
    }
  }

  /**
   * @param {function(new:SDKModel, !Target)} modelClass
   * @return {?T}
   * @template T
   */
  model(modelClass) {
    if (!this._modelByConstructor.get(modelClass)) {
      const info = SDKModel.registeredModels.get(modelClass);
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
   * @return {!Map<function(new:SDKModel, !Target), !SDKModel>}
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
    const parsedURL = Common.ParsedURL.ParsedURL.fromString(inspectedURL);
    this._inspectedURLName = parsedURL ? parsedURL.lastPathComponentWithFragment() : '#' + this._id;
    if (!this.parentTarget()) {
      Host.InspectorFrontendHost.InspectorFrontendHostInstance.inspectedURLChanged(inspectedURL || '');
    }
    this._targetManager.dispatchEventToListeners(Events.InspectedURLChanged, this);
    if (!this._name) {
      this._targetManager.dispatchEventToListeners(Events.NameChanged, this);
    }
  }

  /**
   * @param {string=} reason - optionally provide a reason, so models can respond accordingly
   * @return {!Promise<void>}
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
   * @return {!Promise<void>}
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
  Audits: 1 << 15,

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

/**
 * @type {!TargetManager}
 */
let targetManagerInstance;

export class TargetManager extends Common.ObjectWrapper.ObjectWrapper {
  /**
   * @private
   */
  constructor() {
    super();
    /** @type {!Set.<!Target>} */
    this._targets = new Set();
    /** @type {!Set.<!Observer>} */
    this._observers = new Set();
    /** @type {!Platform.Multimap<symbol, !{modelClass: function(new:SDKModel, !Target), thisObject: (!Object|undefined), listener: function(!Common.EventTarget.EventTargetEvent):void}>} */
    this._modelListeners = new Platform.Multimap();
    /** @type {!Platform.Multimap<function(new:SDKModel, !Target), !SDKModelObserver<*>>} */
    this._modelObservers = new Platform.Multimap();
    this._isSuspended = false;
  }

  /**
   * @param {{forceNew: boolean}} opts
   */
  static instance({forceNew} = {forceNew: false}) {
    if (!targetManagerInstance || forceNew) {
      targetManagerInstance = new TargetManager();
    }

    return targetManagerInstance;
  }

  /**
   * @param {string=} reason - optionally provide a reason, so targets can respond accordingly
   * @return {!Promise<void>}
   */
  async suspendAllTargets(reason) {
    if (this._isSuspended) {
      return;
    }
    this._isSuspended = true;
    this.dispatchEventToListeners(Events.SuspendStateChanged);
    const suspendPromises = Array.from(this._targets.values(), target => target.suspend(reason));
    await Promise.all(suspendPromises);
  }

  /**
   * @return {!Promise<void>}
   */
  async resumeAllTargets() {
    if (!this._isSuspended) {
      return;
    }
    this._isSuspended = false;
    this.dispatchEventToListeners(Events.SuspendStateChanged);
    const resumePromises = Array.from(this._targets.values(), target => target.resume());
    await Promise.all(resumePromises);
  }

  /**
   * @return {boolean}
   */
  allTargetsSuspended() {
    return this._isSuspended;
  }

  /**
   * @param {function(new:SDKModel,!Target)} modelClass
   * @return {!Array<!T>}
   * @template T
   */
  models(modelClass) {
    const result = [];
    for (const target of this._targets) {
      const model = target.model(modelClass);
      if (model) {
        result.push(model);
      }
    }
    return result;
  }

  /**
   * @return {string}
   */
  inspectedURL() {
    const mainTarget = this.mainTarget();
    return mainTarget ? mainTarget.inspectedURL() : '';
  }

  /**
   * @param {function(new:SDKModel,!Target)} modelClass
   * @param {!SDKModelObserver<T>} observer
   * @template T
   */
  observeModels(modelClass, observer) {
    const models = this.models(modelClass);
    this._modelObservers.set(modelClass, observer);
    for (const model of models) {
      observer.modelAdded(model);
    }
  }

  /**
   * @param {function(new:SDKModel,!Target)} modelClass
   * @param {!SDKModelObserver<T>} observer
   * @template T
   */
  unobserveModels(modelClass, observer) {
    this._modelObservers.delete(modelClass, observer);
  }

  /**
   * @param {!Target} target
   * @param {function(new:SDKModel,!Target)} modelClass
   * @param {!SDKModel} model
   */
  modelAdded(target, modelClass, model) {
    for (const observer of this._modelObservers.get(modelClass).values()) {
      observer.modelAdded(model);
    }
  }

  /**
   * @param {!Target} target
   * @param {function(new:SDKModel,!Target)} modelClass
   * @param {!SDKModel} model
   */
  _modelRemoved(target, modelClass, model) {
    for (const observer of this._modelObservers.get(modelClass).values()) {
      observer.modelRemoved(model);
    }
  }

  /**
   * @param {function(new:SDKModel,!Target)} modelClass
   * @param {symbol} eventType
   * @param {function(!Common.EventTarget.EventTargetEvent):void} listener
   * @param {!Object=} thisObject
   */
  addModelListener(modelClass, eventType, listener, thisObject) {
    for (const model of this.models(modelClass)) {
      model.addEventListener(eventType, listener, thisObject);
    }
    this._modelListeners.set(eventType, {modelClass: modelClass, thisObject: thisObject, listener: listener});
  }

  /**
   * @param {function(new:SDKModel,!Target)} modelClass
   * @param {symbol} eventType
   * @param {function(!Common.EventTarget.EventTargetEvent):void} listener
   * @param {!Object=} thisObject
   */
  removeModelListener(modelClass, eventType, listener, thisObject) {
    if (!this._modelListeners.has(eventType)) {
      return;
    }

    for (const model of this.models(modelClass)) {
      model.removeEventListener(eventType, listener, thisObject);
    }

    for (const info of this._modelListeners.get(eventType)) {
      if (info.modelClass === modelClass && info.listener === listener && info.thisObject === thisObject) {
        this._modelListeners.delete(eventType, info);
      }
    }
  }

  /**
   * @param {!Observer} targetObserver
   */
  observeTargets(targetObserver) {
    if (this._observers.has(targetObserver)) {
      throw new Error('Observer can only be registered once');
    }
    for (const target of this._targets) {
      targetObserver.targetAdded(target);
    }
    this._observers.add(targetObserver);
  }

  /**
   * @param {!Observer} targetObserver
   */
  unobserveTargets(targetObserver) {
    this._observers.delete(targetObserver);
  }

  /**
   * @param {string} id
   * @param {string} name
   * @param {!Type} type
   * @param {?Target} parentTarget
   * @param {string=} sessionId
   * @param {boolean=} waitForDebuggerInPage
   * @param {!ProtocolClient.InspectorBackend.Connection=} connection
   * @return {!Target}
   */
  createTarget(id, name, type, parentTarget, sessionId, waitForDebuggerInPage, connection) {
    const target =
        new Target(this, id, name, type, parentTarget, sessionId || '', this._isSuspended, connection || null);
    if (waitForDebuggerInPage) {
      // @ts-ignore TODO(1063322): Find out where pageAgent() is set on Target/TargetBase.
      target.pageAgent().waitForDebugger();
    }
    target.createModels(new Set(this._modelObservers.keysArray()));
    this._targets.add(target);

    // Iterate over a copy. _observers might be modified during iteration.
    for (const observer of [...this._observers]) {
      observer.targetAdded(target);
    }

    for (const modelClass of target.models().keys()) {
      const model = /** @type {!SDKModel} */ (target.models().get(modelClass));
      this.modelAdded(target, modelClass, model);
    }

    for (const key of this._modelListeners.keysArray()) {
      for (const info of this._modelListeners.get(key)) {
        const model = target.model(info.modelClass);
        if (model) {
          model.addEventListener(key, info.listener, info.thisObject);
        }
      }
    }

    return target;
  }

  /**
   * @param {!Target} target
   */
  removeTarget(target) {
    if (!this._targets.has(target)) {
      return;
    }

    this._targets.delete(target);
    for (const modelClass of target.models().keys()) {
      const model = /** @type {!SDKModel} */ (target.models().get(modelClass));
      this._modelRemoved(target, modelClass, model);
    }

    // Iterate over a copy. _observers might be modified during iteration.
    for (const observer of [...this._observers]) {
      observer.targetRemoved(target);
    }

    for (const key of this._modelListeners.keysArray()) {
      for (const info of this._modelListeners.get(key)) {
        const model = target.model(info.modelClass);
        if (model) {
          model.removeEventListener(key, info.listener, info.thisObject);
        }
      }
    }
  }

  /**
   * @return {!Array.<!Target>}
   */
  targets() {
    return [...this._targets];
  }

  /**
   * @param {string} id
   * @return {?Target}
   */
  targetById(id) {
    // TODO(dgozman): add a map id -> target.
    return this.targets().find(target => target.id() === id) || null;
  }

  /**
   * @return {?Target}
   */
  mainTarget() {
    return this._targets.size ? this._targets.values().next().value : null;
  }
}

/** @enum {symbol} */
export const Events = {
  AvailableTargetsChanged: Symbol('AvailableTargetsChanged'),
  InspectedURLChanged: Symbol('InspectedURLChanged'),
  NameChanged: Symbol('NameChanged'),
  SuspendStateChanged: Symbol('SuspendStateChanged')
};

/**
 * @interface
 */
export class Observer {
  /**
   * @param {!Target} target
   */
  targetAdded(target) {
  }

  /**
   * @param {!Target} target
   */
  targetRemoved(target) {
  }
}

/**
 * @interface
 * @template T
 */
export class SDKModelObserver {
  /**
   * @param {!T} model
   */
  modelAdded(model) {
  }

  /**
   * @param {!T} model
   */
  modelRemoved(model) {
  }
}
