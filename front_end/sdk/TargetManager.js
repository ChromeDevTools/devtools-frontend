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
    /** @type {!Map<function(new:SDK.SDKModel,!SDK.Target), !Array<!SDK.SDKModelObserver>>} */
    this._modelObservers = new Map();
    /** @type {!Set<!SDK.Target>} */
    this._pendingTargets = new Set();
    this._isSuspended = false;
    this._lastAnonymousTargetId = 0;
    /** @type {!Map<!SDK.Target, !SDK.ChildTargetManager>} */
    this._childTargetManagers = new Map();
    /** @type {!Set<string>} */
    this._nodeTargetIds = new Set();
    /** @type {!Protocol.InspectorBackend.Connection} */
    this._mainConnection;
    /** @type {function()} */
    this._webSocketConnectionLostCallback;
  }

  suspendAllTargets() {
    if (this._isSuspended)
      return;
    this._isSuspended = true;
    this.dispatchEventToListeners(SDK.TargetManager.Events.SuspendStateChanged);

    for (var target of this._targets) {
      var childTargetManager = this._childTargetManagers.get(target);
      if (childTargetManager)
        childTargetManager.suspend();
      for (var model of target.models().values())
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
    for (var target of this._targets) {
      var childTargetManager = this._childTargetManagers.get(target);
      if (childTargetManager)
        promises.push(childTargetManager.resume());
      for (var model of target.models().values())
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
    target.model(SDK.CPUProfilerModel);
    target.model(SDK.ServiceWorkerManager);

    if (target.hasTargetCapability())
      this._childTargetManagers.set(target, new SDK.ChildTargetManager(this, target, resourceTreeModel));

    // Force creation of models which have observers.
    for (var modelClass of this._modelObservers.keys())
      target.model(modelClass);
    this._pendingTargets.delete(target);

    this._targets.push(target);

    if (resourceTreeModel && !target.parentTarget()) {
      resourceTreeModel[SDK.TargetManager._listenersSymbol] = [
        resourceTreeModel.addEventListener(
            SDK.ResourceTreeModel.Events.MainFrameNavigated,
            event => this.dispatchEventToListeners(SDK.TargetManager.Events.MainFrameNavigated, event.data)),
        resourceTreeModel.addEventListener(
            SDK.ResourceTreeModel.Events.Load,
            event => this.dispatchEventToListeners(SDK.TargetManager.Events.Load, event.data)),
        resourceTreeModel.addEventListener(
            SDK.ResourceTreeModel.Events.PageReloadRequested,
            event => this.dispatchEventToListeners(SDK.TargetManager.Events.PageReloadRequested, event.data)),
        resourceTreeModel.addEventListener(
            SDK.ResourceTreeModel.Events.WillReloadPage,
            event => this.dispatchEventToListeners(SDK.TargetManager.Events.WillReloadPage, event.data)),
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

    var childTargetManager = this._childTargetManagers.get(target);
    this._childTargetManagers.delete(target);
    if (childTargetManager)
      childTargetManager.dispose();

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
    // TODO(dgozman): add a map id -> target.
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
      target.setInspectedURL('Node');
      this._childTargetManagers.set(target, new SDK.ChildTargetManager(this, target, null));
      Host.userMetrics.actionTaken(Host.UserMetrics.Action.ConnectToNodeJSFromFrontend);
      return;
    }

    var capabilities = SDK.Target.Capability.Browser | SDK.Target.Capability.DOM | SDK.Target.Capability.JS |
        SDK.Target.Capability.Log | SDK.Target.Capability.Network | SDK.Target.Capability.Target |
        SDK.Target.Capability.ScreenCapture | SDK.Target.Capability.Tracing;
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
   * @return {number}
   */
  availableNodeTargetsCount() {
    return this._nodeTargetIds.size;
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

/**
 * @implements {Protocol.TargetDispatcher}
 */
SDK.ChildTargetManager = class {
  /**
   * @param {!SDK.TargetManager} targetManager
   * @param {!SDK.Target} parentTarget
   * @param {?SDK.ResourceTreeModel} resourceTreeModel
   */
  constructor(targetManager, parentTarget, resourceTreeModel) {
    this._targetManager = targetManager;
    this._parentTarget = parentTarget;
    this._targetAgent = parentTarget.targetAgent();

    /** @type {!Map<string, !SDK.ChildConnection>} */
    this._childConnections = new Map();

    parentTarget.registerTargetDispatcher(this);
    this._targetAgent.invoke_setAutoAttach({autoAttach: true, waitForDebuggerOnStart: true});
    if (Runtime.experiments.isEnabled('autoAttachToCrossProcessSubframes'))
      this._targetAgent.setAttachToFrames(true);

    if (!parentTarget.parentTarget()) {
      this._targetAgent.setRemoteLocations([{host: 'localhost', port: 9229}]);
      this._targetAgent.setDiscoverTargets(true);
    }

    this._eventListeners = [];
    if (resourceTreeModel) {
      this._eventListeners.push(resourceTreeModel.addEventListener(
          SDK.ResourceTreeModel.Events.MainFrameNavigated, this._detachWorkersOnMainFrameNavigated, this));
    }
  }

  suspend() {
    this._targetAgent.invoke_setAutoAttach({autoAttach: true, waitForDebuggerOnStart: false});
  }

  /**
   * @return {!Promise}
   */
  resume() {
    var fulfill;
    var promise = new Promise(callback => fulfill = callback);
    this._targetAgent.invoke_setAutoAttach({autoAttach: true, waitForDebuggerOnStart: true}, fulfill);
    return promise;
  }

  dispose() {
    Common.EventTarget.removeEventListeners(this._eventListeners);
    // TODO(dgozman): this is O(n^2) when removing main target.
    var childTargets = this._targetManager._targets.filter(child => child.parentTarget() === this._parentTarget);
    for (var child of childTargets)
      this.detachedFromTarget(child.id());
  }

  /**
   * @param {string} type
   * @return {number}
   */
  _capabilitiesForType(type) {
    if (type === 'worker')
      return SDK.Target.Capability.JS | SDK.Target.Capability.Log;
    if (type === 'service_worker')
      return SDK.Target.Capability.Log | SDK.Target.Capability.Network | SDK.Target.Capability.Target;
    if (type === 'iframe') {
      return SDK.Target.Capability.Browser | SDK.Target.Capability.DOM | SDK.Target.Capability.JS |
          SDK.Target.Capability.Log | SDK.Target.Capability.Network | SDK.Target.Capability.Target |
          SDK.Target.Capability.Tracing;
    }
    if (type === 'node')
      return SDK.Target.Capability.JS;
    return 0;
  }

  _detachWorkersOnMainFrameNavigated() {
    // TODO(dgozman): send these from backend.
    var idsToDetach = [];
    for (var target of this._targetManager._targets) {
      if (target.parentTarget() === this._parentTarget && target[SDK.TargetManager._isWorkerSymbol])
        idsToDetach.push(target.id());
    }
    idsToDetach.forEach(id => this.detachedFromTarget(id));
  }

  /**
   * @override
   * @param {!Protocol.Target.TargetInfo} targetInfo
   */
  targetCreated(targetInfo) {
    if (targetInfo.type !== 'node')
      return;
    if (Runtime.queryParam('nodeFrontend')) {
      this._targetAgent.attachToTarget(targetInfo.targetId);
    } else {
      this._targetManager._nodeTargetIds.add(targetInfo.targetId);
      this._targetManager.dispatchEventToListeners(SDK.TargetManager.Events.AvailableNodeTargetsChanged);
    }
  }

  /**
   * @override
   * @param {string} targetId
   */
  targetDestroyed(targetId) {
    if (Runtime.queryParam('nodeFrontend') || !this._targetManager._nodeTargetIds.has(targetId))
      return;
    this._targetManager._nodeTargetIds.delete(targetId);
    this._targetManager.dispatchEventToListeners(SDK.TargetManager.Events.AvailableNodeTargetsChanged);
  }

  /**
   * @override
   * @param {!Protocol.Target.TargetInfo} targetInfo
   * @param {boolean} waitingForDebugger
   */
  attachedToTarget(targetInfo, waitingForDebugger) {
    var targetName = '';
    if (targetInfo.type === 'node') {
      targetName = Common.UIString('Node: %s', targetInfo.url);
    } else if (targetInfo.type !== 'iframe') {
      var parsedURL = targetInfo.url.asParsedURL();
      targetName =
          parsedURL ? parsedURL.lastPathComponentWithFragment() : '#' + (++this._targetManager._lastAnonymousTargetId);
    }
    var target = this._targetManager.createTarget(
        targetInfo.targetId, targetName, this._capabilitiesForType(targetInfo.type),
        this._createChildConnection.bind(this, this._targetAgent, targetInfo.targetId), this._parentTarget);
    target[SDK.TargetManager._isWorkerSymbol] = targetInfo.type === 'worker';

    // Only pause the new worker if debugging SW - we are going through the pause on start checkbox.
    if (!this._parentTarget.parentTarget() && Runtime.queryParam('isSharedWorker') && waitingForDebugger)
      target.debuggerAgent().pause();
    target.runtimeAgent().runIfWaitingForDebugger();
  }

  /**
   * @override
   * @param {string} childTargetId
   */
  detachedFromTarget(childTargetId) {
    this._childConnections.get(childTargetId)._onDisconnect.call(null, 'target terminated');
    this._childConnections.delete(childTargetId);
  }

  /**
   * @override
   * @param {string} childTargetId
   * @param {string} message
   */
  receivedMessageFromTarget(childTargetId, message) {
    var connection = this._childConnections.get(childTargetId);
    if (connection)
      connection._onMessage.call(null, message);
  }

  /**
   * @param {!Protocol.TargetAgent} agent
   * @param {string} childTargetId
   * @param {!Protocol.InspectorBackend.Connection.Params} params
   * @return {!Protocol.InspectorBackend.Connection}
   */
  _createChildConnection(agent, childTargetId, params) {
    var connection = new SDK.ChildConnection(agent, childTargetId, params);
    this._childConnections.set(childTargetId, connection);
    return connection;
  }
};

/**
 * @implements {Protocol.InspectorBackend.Connection}
 */
SDK.ChildConnection = class {
  /**
   * @param {!Protocol.TargetAgent} agent
   * @param {string} targetId
   * @param {!Protocol.InspectorBackend.Connection.Params} params
   */
  constructor(agent, targetId, params) {
    this._agent = agent;
    this._targetId = targetId;
    this._onMessage = params.onMessage;
    this._onDisconnect = params.onDisconnect;
  }

  /**
   * @override
   * @param {string} message
   */
  sendMessage(message) {
    this._agent.sendMessageToTarget(this._targetId, message);
  }

  /**
   * @override
   * @return {!Promise}
   */
  disconnect() {
    throw 'Not implemented';
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
  SuspendStateChanged: Symbol('SuspendStateChanged'),
  AvailableNodeTargetsChanged: Symbol('AvailableNodeTargetsChanged')
};

SDK.TargetManager._listenersSymbol = Symbol('SDK.TargetManager.Listeners');
SDK.TargetManager._isWorkerSymbol = Symbol('SDK.TargetManager.IsWorker');

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
