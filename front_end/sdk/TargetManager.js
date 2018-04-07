/*
 * Copyright 2014 The Chromium Authors. All rights reserved.
 * Use of this source code is governed by a BSD-style license that can be
 * found in the LICENSE file.
 */

SDK.TargetManager = class extends Common.Object {
  constructor() {
    super();
    /** @type {!Array.<!SDK.Target>} */
    this._targets = [];
    /** @type {!Array.<!SDK.TargetManager.Observer>} */
    this._observers = [];
    this._observerCapabiliesMaskSymbol = Symbol('observerCapabilitiesMask');
    /** @type {!Map<symbol, !Array<{modelClass: !Function, thisObject: (!Object|undefined), listener: function(!Common.Event)}>>} */
    this._modelListeners = new Map();
    /** @type {!Map<function(new:SDK.SDKModel, !SDK.Target), !Array<!SDK.SDKModelObserver>>} */
    this._modelObservers = new Map();
    this._isSuspended = false;
  }

  /**
   * @return {!Promise}
   */
  suspendAllTargets() {
    if (this._isSuspended)
      return Promise.resolve();
    this._isSuspended = true;
    this.dispatchEventToListeners(SDK.TargetManager.Events.SuspendStateChanged);
    return Promise.all(this._targets.map(target => target.suspend()));
  }

  /**
   * @return {!Promise}
   */
  resumeAllTargets() {
    if (!this._isSuspended)
      return Promise.resolve();
    this._isSuspended = false;
    this.dispatchEventToListeners(SDK.TargetManager.Events.SuspendStateChanged);
    return Promise.all(this._targets.map(target => target.resume()));
  }

  /**
   * @return {boolean}
   */
  allTargetsSuspended() {
    return this._isSuspended;
  }

  /**
   * @param {function(new:T,!SDK.Target)} modelClass
   * @return {!Array<!T>}
   * @template T
   */
  models(modelClass) {
    const result = [];
    for (let i = 0; i < this._targets.length; ++i) {
      const model = this._targets[i].model(modelClass);
      if (model)
        result.push(model);
    }
    return result;
  }

  /**
   * @return {string}
   */
  inspectedURL() {
    return this._targets[0] ? this._targets[0].inspectedURL() : '';
  }

  /**
   * @param {function(new:T,!SDK.Target)} modelClass
   * @param {!SDK.SDKModelObserver<T>} observer
   * @template T
   */
  observeModels(modelClass, observer) {
    if (!this._modelObservers.has(modelClass))
      this._modelObservers.set(modelClass, []);
    this._modelObservers.get(modelClass).push(observer);
    for (const model of this.models(modelClass))
      observer.modelAdded(model);
  }

  /**
   * @param {function(new:T,!SDK.Target)} modelClass
   * @param {!SDK.SDKModelObserver<T>} observer
   * @template T
   */
  unobserveModels(modelClass, observer) {
    if (!this._modelObservers.has(modelClass))
      return;
    const observers = this._modelObservers.get(modelClass);
    observers.remove(observer);
    if (!observers.length)
      this._modelObservers.delete(modelClass);
  }

  /**
   * @param {!SDK.Target} target
   * @param {function(new:SDK.SDKModel,!SDK.Target)} modelClass
   * @param {!SDK.SDKModel} model
   */
  modelAdded(target, modelClass, model) {
    if (!this._modelObservers.has(modelClass))
      return;
    for (const observer of this._modelObservers.get(modelClass).slice())
      observer.modelAdded(model);
  }

  /**
   * @param {!SDK.Target} target
   * @param {function(new:SDK.SDKModel,!SDK.Target)} modelClass
   * @param {!SDK.SDKModel} model
   */
  _modelRemoved(target, modelClass, model) {
    if (!this._modelObservers.has(modelClass))
      return;
    for (const observer of this._modelObservers.get(modelClass).slice())
      observer.modelRemoved(model);
  }

  /**
   * @param {!Function} modelClass
   * @param {symbol} eventType
   * @param {function(!Common.Event)} listener
   * @param {!Object=} thisObject
   */
  addModelListener(modelClass, eventType, listener, thisObject) {
    for (let i = 0; i < this._targets.length; ++i) {
      const model = this._targets[i].model(modelClass);
      if (model)
        model.addEventListener(eventType, listener, thisObject);
    }
    if (!this._modelListeners.has(eventType))
      this._modelListeners.set(eventType, []);
    this._modelListeners.get(eventType).push({modelClass: modelClass, thisObject: thisObject, listener: listener});
  }

  /**
   * @param {!Function} modelClass
   * @param {symbol} eventType
   * @param {function(!Common.Event)} listener
   * @param {!Object=} thisObject
   */
  removeModelListener(modelClass, eventType, listener, thisObject) {
    if (!this._modelListeners.has(eventType))
      return;

    for (let i = 0; i < this._targets.length; ++i) {
      const model = this._targets[i].model(modelClass);
      if (model)
        model.removeEventListener(eventType, listener, thisObject);
    }

    const listeners = this._modelListeners.get(eventType);
    for (let i = 0; i < listeners.length; ++i) {
      if (listeners[i].modelClass === modelClass && listeners[i].listener === listener &&
          listeners[i].thisObject === thisObject)
        listeners.splice(i--, 1);
    }
    if (!listeners.length)
      this._modelListeners.delete(eventType);
  }

  /**
   * @param {!SDK.TargetManager.Observer} targetObserver
   * @param {number=} capabilitiesMask
   */
  observeTargets(targetObserver, capabilitiesMask) {
    if (this._observerCapabiliesMaskSymbol in targetObserver)
      throw new Error('Observer can only be registered once');
    targetObserver[this._observerCapabiliesMaskSymbol] = capabilitiesMask || 0;
    this.targets(capabilitiesMask).forEach(targetObserver.targetAdded.bind(targetObserver));
    this._observers.push(targetObserver);
  }

  /**
   * @param {!SDK.TargetManager.Observer} targetObserver
   */
  unobserveTargets(targetObserver) {
    delete targetObserver[this._observerCapabiliesMaskSymbol];
    this._observers.remove(targetObserver);
  }

  /**
   * @param {string} id
   * @param {string} name
   * @param {number} capabilitiesMask
   * @param {!Protocol.InspectorBackend.Connection.Factory} connectionFactory
   * @param {?SDK.Target} parentTarget
   * @return {!SDK.Target}
   */
  createTarget(id, name, capabilitiesMask, connectionFactory, parentTarget) {
    const target = new SDK.Target(this, id, name, capabilitiesMask, connectionFactory, parentTarget, this._isSuspended);
    target.createModels(new Set(this._modelObservers.keys()));
    this._targets.push(target);

    const copy = this._observersForTarget(target);
    for (let i = 0; i < copy.length; ++i)
      copy[i].targetAdded(target);

    for (const modelClass of target.models().keys())
      this.modelAdded(target, modelClass, target.models().get(modelClass));

    for (const pair of this._modelListeners) {
      const listeners = pair[1];
      for (let i = 0; i < listeners.length; ++i) {
        const model = target.model(listeners[i].modelClass);
        if (model)
          model.addEventListener(/** @type {symbol} */ (pair[0]), listeners[i].listener, listeners[i].thisObject);
      }
    }

    return target;
  }

  /**
   * @param {!SDK.Target} target
   * @return {!Array<!SDK.TargetManager.Observer>}
   */
  _observersForTarget(target) {
    return this._observers.filter(
        observer => target.hasAllCapabilities(observer[this._observerCapabiliesMaskSymbol] || 0));
  }

  /**
   * @param {!SDK.Target} target
   */
  removeTarget(target) {
    if (!this._targets.includes(target))
      return;

    this._targets.remove(target);
    for (const modelClass of target.models().keys())
      this._modelRemoved(target, modelClass, target.models().get(modelClass));

    const copy = this._observersForTarget(target);
    for (let i = 0; i < copy.length; ++i)
      copy[i].targetRemoved(target);

    for (const pair of this._modelListeners) {
      const listeners = pair[1];
      for (let i = 0; i < listeners.length; ++i) {
        const model = target.model(listeners[i].modelClass);
        if (model)
          model.removeEventListener(/** @type {symbol} */ (pair[0]), listeners[i].listener, listeners[i].thisObject);
      }
    }
  }

  /**
   * @param {number=} capabilitiesMask
   * @return {!Array.<!SDK.Target>}
   */
  targets(capabilitiesMask) {
    if (!capabilitiesMask)
      return this._targets.slice();
    else
      return this._targets.filter(target => target.hasAllCapabilities(capabilitiesMask || 0));
  }

  /**
   *
   * @param {string} id
   * @return {?SDK.Target}
   */
  targetById(id) {
    // TODO(dgozman): add a map id -> target.
    for (let i = 0; i < this._targets.length; ++i) {
      if (this._targets[i].id() === id)
        return this._targets[i];
    }
    return null;
  }

  /**
   * @return {?SDK.Target}
   */
  mainTarget() {
    return this._targets[0] || null;
  }
};

/** @enum {symbol} */
SDK.TargetManager.Events = {
  AvailableTargetsChanged: Symbol('AvailableTargetsChanged'),
  InspectedURLChanged: Symbol('InspectedURLChanged'),
  NameChanged: Symbol('NameChanged'),
  SuspendStateChanged: Symbol('SuspendStateChanged')
};

/**
 * @interface
 */
SDK.TargetManager.Observer = function() {};

SDK.TargetManager.Observer.prototype = {
  /**
   * @param {!SDK.Target} target
   */
  targetAdded(target) {},

  /**
   * @param {!SDK.Target} target
   */
  targetRemoved(target) {},
};

/**
 * @interface
 * @template T
 */
SDK.SDKModelObserver = function() {};

SDK.SDKModelObserver.prototype = {
  /**
   * @param {!T} model
   */
  modelAdded(model) {},

  /**
   * @param {!T} model
   */
  modelRemoved(model) {},
};

/**
 * @type {!SDK.TargetManager}
 */
SDK.targetManager = new SDK.TargetManager();
