/*
 * Copyright 2014 The Chromium Authors. All rights reserved.
 * Use of this source code is governed by a BSD-style license that can be
 * found in the LICENSE file.
 */

/**
 * @unrestricted
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
    /** @type {!Map<function(new:SDK.SDKModel,!SDK.Target), !Array<!SDK.SDKModelObserver>>} */
    this._modelObservers = new Map();
    /** @type {!Set<!SDK.Target>} */
    this._pendingTargets = new Set();
    this._isSuspended = false;
  }

  suspendAllTargets() {
    if (this._isSuspended)
      return;
    this._isSuspended = true;
    this.dispatchEventToListeners(SDK.TargetManager.Events.SuspendStateChanged);

    for (var i = 0; i < this._targets.length; ++i) {
      for (var model of this._targets[i].models().values())
        model.suspendModel();
    }
  }

  /**
   * @return {!Promise}
   */
  resumeAllTargets() {
    if (!this._isSuspended)
      throw new Error('Not suspended');
    this._isSuspended = false;
    this.dispatchEventToListeners(SDK.TargetManager.Events.SuspendStateChanged);

    var promises = [];
    for (var i = 0; i < this._targets.length; ++i) {
      for (var model of this._targets[i].models().values())
        promises.push(model.resumeModel());
    }
    return Promise.all(promises);
  }

  suspendAndResumeAllTargets() {
    this.suspendAllTargets();
    this.resumeAllTargets();
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
    var result = [];
    for (var i = 0; i < this._targets.length; ++i) {
      var model = this._targets[i].model(modelClass);
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
   * @param {!SDK.TargetManager.Events} eventName
   * @param {!Common.Event} event
   */
  _redispatchEvent(eventName, event) {
    this.dispatchEventToListeners(eventName, event.data);
  }

  /**
   * @param {boolean=} bypassCache
   * @param {string=} injectedScript
   */
  reloadPage(bypassCache, injectedScript) {
    if (!this._targets.length)
      return;

    var resourceTreeModel = SDK.ResourceTreeModel.fromTarget(this._targets[0]);
    if (!resourceTreeModel)
      return;

    resourceTreeModel.reloadPage(bypassCache, injectedScript);
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
    for (var model of this.models(modelClass))
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
    var observers = this._modelObservers.get(modelClass);
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
    if (this._pendingTargets.has(target))
      return;
    if (!this._modelObservers.has(modelClass))
      return;
    for (var observer of this._modelObservers.get(modelClass).slice())
      observer.modelAdded(model);
  }

  /**
   * @param {!SDK.Target} target
   * @param {function(new:SDK.SDKModel,!SDK.Target)} modelClass
   * @param {!SDK.SDKModel} model
   */
  _modelRemoved(target, modelClass, model) {
    if (this._pendingTargets.has(target))
      return;
    if (!this._modelObservers.has(modelClass))
      return;
    for (var observer of this._modelObservers.get(modelClass).slice())
      observer.modelRemoved(model);
  }

  /**
   * @param {!Function} modelClass
   * @param {symbol} eventType
   * @param {function(!Common.Event)} listener
   * @param {!Object=} thisObject
   */
  addModelListener(modelClass, eventType, listener, thisObject) {
    for (var i = 0; i < this._targets.length; ++i) {
      var model = this._targets[i].model(modelClass);
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

    for (var i = 0; i < this._targets.length; ++i) {
      var model = this._targets[i].model(modelClass);
      if (model)
        model.removeEventListener(eventType, listener, thisObject);
    }

    var listeners = this._modelListeners.get(eventType);
    for (var i = 0; i < listeners.length; ++i) {
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
    var target = new SDK.Target(this, id, name, capabilitiesMask, connectionFactory, parentTarget);
    this._pendingTargets.add(target);

    /** @type {!SDK.ConsoleModel} */
    target.consoleModel = /** @type {!SDK.ConsoleModel} */ (target.model(SDK.ConsoleModel));

    var networkManager = target.model(SDK.NetworkManager);
    var resourceTreeModel = target.model(SDK.ResourceTreeModel);
    if (networkManager && resourceTreeModel)
      new SDK.NetworkLog(target, resourceTreeModel, networkManager);

    /** @type {!SDK.RuntimeModel} */
    target.runtimeModel = /** @type {!SDK.RuntimeModel} */ (target.model(SDK.RuntimeModel));
    target.model(SDK.DebuggerModel);
    target.model(SDK.DOMModel);
    target.model(SDK.CSSModel);

    /** @type {?SDK.SubTargetsManager} */
    target.subTargetsManager = target.model(SDK.SubTargetsManager);
    /** @type {!SDK.CPUProfilerModel} */
    target.cpuProfilerModel = /** @type {!SDK.CPUProfilerModel} */ (target.model(SDK.CPUProfilerModel));

    target.tracingManager = new SDK.TracingManager(target);

    target.model(SDK.ServiceWorkerManager);

    // Force creation of models which have observers.
    for (var modelClass of this._modelObservers.keys())
      target.model(modelClass);
    this._pendingTargets.delete(target);

    this._targets.push(target);

    /**
     * @param {!SDK.ResourceTreeModel.Events} sourceEvent
     * @param {!SDK.TargetManager.Events} targetEvent
     * @return {!Common.EventTarget.EventDescriptor}
     * @this {SDK.TargetManager}
     */
    function setupRedispatch(sourceEvent, targetEvent) {
      return resourceTreeModel.addEventListener(sourceEvent, this._redispatchEvent.bind(this, targetEvent));
    }

    if (this._targets.length === 1 && resourceTreeModel) {
      resourceTreeModel[SDK.TargetManager._listenersSymbol] = [
        setupRedispatch.call(
            this, SDK.ResourceTreeModel.Events.MainFrameNavigated, SDK.TargetManager.Events.MainFrameNavigated),
        setupRedispatch.call(this, SDK.ResourceTreeModel.Events.Load, SDK.TargetManager.Events.Load),
        setupRedispatch.call(
            this, SDK.ResourceTreeModel.Events.PageReloadRequested, SDK.TargetManager.Events.PageReloadRequested),
        setupRedispatch.call(this, SDK.ResourceTreeModel.Events.WillReloadPage, SDK.TargetManager.Events.WillReloadPage)
      ];
    }
    var copy = this._observersForTarget(target);
    for (var i = 0; i < copy.length; ++i)
      copy[i].targetAdded(target);

    for (var modelClass of target.models().keys())
      this.modelAdded(target, modelClass, target.models().get(modelClass));

    for (var pair of this._modelListeners) {
      var listeners = pair[1];
      for (var i = 0; i < listeners.length; ++i) {
        var model = target.model(listeners[i].modelClass);
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
    var resourceTreeModel = SDK.ResourceTreeModel.fromTarget(target);
    var treeModelListeners = resourceTreeModel && resourceTreeModel[SDK.TargetManager._listenersSymbol];
    if (treeModelListeners)
      Common.EventTarget.removeEventListeners(treeModelListeners);

    for (var modelClass of target.models().keys())
      this._modelRemoved(target, modelClass, target.models().get(modelClass));

    var copy = this._observersForTarget(target);
    for (var i = 0; i < copy.length; ++i)
      copy[i].targetRemoved(target);

    for (var pair of this._modelListeners) {
      var listeners = pair[1];
      for (var i = 0; i < listeners.length; ++i) {
        var model = target.model(listeners[i].modelClass);
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
    for (var i = 0; i < this._targets.length; ++i) {
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

  /**
   * @param {!SDK.Target} target
   */
  suspendReload(target) {
    var resourceTreeModel = SDK.ResourceTreeModel.fromTarget(target);
    if (resourceTreeModel)
      resourceTreeModel.suspendReload();
  }

  /**
   * @param {!SDK.Target} target
   */
  resumeReload(target) {
    var resourceTreeModel = SDK.ResourceTreeModel.fromTarget(target);
    if (resourceTreeModel)
      setImmediate(resourceTreeModel.resumeReload.bind(resourceTreeModel));
  }

  /**
   * @param {function()} webSocketConnectionLostCallback
   */
  connectToMainTarget(webSocketConnectionLostCallback) {
    this._webSocketConnectionLostCallback = webSocketConnectionLostCallback;
    this._connectAndCreateMainTarget();
  }

  _connectAndCreateMainTarget() {
    if (Runtime.queryParam('nodeFrontend')) {
      var target = new SDK.Target(
          this, 'main', Common.UIString('Node'), SDK.Target.Capability.Target, this._createMainConnection.bind(this),
          null);
      target.subTargetsManager = new SDK.SubTargetsManager(target);
      target.setInspectedURL('Node');
      Host.userMetrics.actionTaken(Host.UserMetrics.Action.ConnectToNodeJSFromFrontend);
      return;
    }

    var capabilities = SDK.Target.Capability.Browser | SDK.Target.Capability.DOM | SDK.Target.Capability.JS |
        SDK.Target.Capability.Log | SDK.Target.Capability.Network | SDK.Target.Capability.Target |
        SDK.Target.Capability.ScreenCapture;
    if (Runtime.queryParam('isSharedWorker')) {
      capabilities = SDK.Target.Capability.Browser | SDK.Target.Capability.Log | SDK.Target.Capability.Network |
          SDK.Target.Capability.Target;
    } else if (Runtime.queryParam('v8only')) {
      capabilities = SDK.Target.Capability.JS;
      Host.userMetrics.actionTaken(Host.UserMetrics.Action.ConnectToNodeJSDirectly);
    }

    var target =
        this.createTarget('main', Common.UIString('Main'), capabilities, this._createMainConnection.bind(this), null);
    target.runtimeAgent().runIfWaitingForDebugger();
  }

  /**
   * @param {!Protocol.InspectorBackend.Connection.Params} params
   * @return {!Protocol.InspectorBackend.Connection}
   */
  _createMainConnection(params) {
    if (Runtime.queryParam('ws')) {
      var ws = 'ws://' + Runtime.queryParam('ws');
      this._mainConnection = new SDK.WebSocketConnection(ws, this._webSocketConnectionLostCallback, params);
    } else if (InspectorFrontendHost.isHostedMode()) {
      this._mainConnection = new SDK.StubConnection(params);
    } else {
      this._mainConnection = new SDK.MainConnection(params);
    }
    return this._mainConnection;
  }

  /**
   * @param {function(string)} onMessage
   * @return {!Promise<!Protocol.InspectorBackend.Connection>}
   */
  interceptMainConnection(onMessage) {
    var params = {onMessage: onMessage, onDisconnect: this._connectAndCreateMainTarget.bind(this)};
    return this._mainConnection.disconnect().then(this._createMainConnection.bind(this, params));
  }
};

/** @enum {symbol} */
SDK.TargetManager.Events = {
  InspectedURLChanged: Symbol('InspectedURLChanged'),
  Load: Symbol('Load'),
  MainFrameNavigated: Symbol('MainFrameNavigated'),
  NameChanged: Symbol('NameChanged'),
  PageReloadRequested: Symbol('PageReloadRequested'),
  WillReloadPage: Symbol('WillReloadPage'),
  TargetDisposed: Symbol('TargetDisposed'),
  SuspendStateChanged: Symbol('SuspendStateChanged')
};

SDK.TargetManager._listenersSymbol = Symbol('SDK.TargetManager.Listeners');

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
