// Copyright 2016 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.
/**
 * @unrestricted
 */
WebInspector.SubTargetsManager = class extends WebInspector.SDKModel {
  /**
   * @param {!WebInspector.Target} target
   */
  constructor(target) {
    super(WebInspector.SubTargetsManager, target);
    target.registerTargetDispatcher(new WebInspector.SubTargetsDispatcher(this));
    this._lastAnonymousTargetId = 0;
    this._agent = target.targetAgent();

    /** @type {!Map<string, !WebInspector.Target>} */
    this._attachedTargets = new Map();
    /** @type {!Map<string, !WebInspector.SubTargetConnection>} */
    this._connections = new Map();
    /** @type {!Map<string, !WebInspector.PendingTarget>} */
    this._pendingTargets = new Map();
    this._agent.setAutoAttach(true /* autoAttach */, true /* waitForDebuggerOnStart */);
    if (Runtime.experiments.isEnabled('autoAttachToCrossProcessSubframes'))
      this._agent.setAttachToFrames(true);

    if (Runtime.experiments.isEnabled('nodeDebugging') && !target.parentTarget()) {
      var defaultLocations = [{host: 'localhost', port: 9229}];
      this._agent.setRemoteLocations(defaultLocations);
      this._agent.setDiscoverTargets(true);
    }
    WebInspector.targetManager.addEventListener(
        WebInspector.TargetManager.Events.MainFrameNavigated, this._mainFrameNavigated, this);
  }

  /**
   * @param {!WebInspector.Target} target
   * @return {?WebInspector.SubTargetsManager}
   */
  static fromTarget(target)
  {
    return /** @type {?WebInspector.SubTargetsManager} */ (target.model(WebInspector.SubTargetsManager));
  }

  /**
   * @override
   * @return {!Promise}
   */
  suspendModel() {
    var fulfill;
    var promise = new Promise(f => fulfill = f);
    this._agent.setAutoAttach(true /* autoAttach */, false /* waitForDebuggerOnStart */, fulfill);
    return promise;
  }

  /**
   * @override
   * @return {!Promise}
   */
  resumeModel() {
    var fulfill;
    var promise = new Promise(f => fulfill = f);
    this._agent.setAutoAttach(true /* autoAttach */, true /* waitForDebuggerOnStart */, fulfill);
    return promise;
  }

  /**
   * @override
   */
  dispose() {
    for (var attachedTargetId of this._attachedTargets.keys())
      this._detachedFromTarget(attachedTargetId);
    for (var pendingConnectionId of this._pendingTargets.keys())
      this._targetDestroyed(pendingConnectionId);
  }

  /**
   * @param {!Protocol.Target.TargetID} targetId
   */
  activateTarget(targetId) {
    this._agent.activateTarget(targetId);
  }

  /**
   * @param {!Protocol.Target.TargetID} targetId
   * @param {function(?WebInspector.TargetInfo)=} callback
   */
  getTargetInfo(targetId, callback) {
    /**
     * @param {?Protocol.Error} error
     * @param {?Protocol.Target.TargetInfo} targetInfo
     */
    function innerCallback(error, targetInfo) {
      if (error) {
        console.error(error);
        callback(null);
        return;
      }
      if (targetInfo)
        callback(new WebInspector.TargetInfo(targetInfo));
      else
        callback(null);
    }
    this._agent.getTargetInfo(targetId, innerCallback);
  }

  /**
   * @param {string} targetId
   * @return {?WebInspector.Target}
   */
  targetForId(targetId) {
    return this._attachedTargets.get(targetId) || null;
  }

  /**
   * @param {!WebInspector.Target} target
   * @return {?WebInspector.TargetInfo}
   */
  targetInfo(target) {
    return target[WebInspector.SubTargetsManager._InfoSymbol] || null;
  }

  /**
   * @param {string} type
   * @return {number}
   */
  _capabilitiesForType(type) {
    if (type === 'worker')
      return WebInspector.Target.Capability.JS | WebInspector.Target.Capability.Log;
    if (type === 'service_worker')
      return WebInspector.Target.Capability.Log | WebInspector.Target.Capability.Network |
          WebInspector.Target.Capability.Target;
    if (type === 'iframe')
      return WebInspector.Target.Capability.Browser | WebInspector.Target.Capability.DOM |
          WebInspector.Target.Capability.JS | WebInspector.Target.Capability.Log |
          WebInspector.Target.Capability.Network | WebInspector.Target.Capability.Target;
    if (type === 'node')
      return WebInspector.Target.Capability.JS;
    return 0;
  }

  /**
   * @param {!WebInspector.TargetInfo} targetInfo
   * @param {boolean} waitingForDebugger
   */
  _attachedToTarget(targetInfo, waitingForDebugger) {
    var targetName = '';
    if (targetInfo.type === 'node') {
      targetName = targetInfo.title;
    } else if (targetInfo.type !== 'iframe') {
      var parsedURL = targetInfo.url.asParsedURL();
      targetName = parsedURL ? parsedURL.lastPathComponentWithFragment() : '#' + (++this._lastAnonymousTargetId);
    }
    var target = WebInspector.targetManager.createTarget(
        targetName, this._capabilitiesForType(targetInfo.type), this._createConnection.bind(this, targetInfo.id),
        this.target());
    target[WebInspector.SubTargetsManager._InfoSymbol] = targetInfo;
    this._attachedTargets.set(targetInfo.id, target);

    // Only pause new worker if debugging SW - we are going through the pause on start checkbox.
    var mainIsServiceWorker =
        !this.target().parentTarget() && this.target().hasTargetCapability() && !this.target().hasBrowserCapability();
    if (mainIsServiceWorker && waitingForDebugger)
      target.debuggerAgent().pause();
    target.runtimeAgent().runIfWaitingForDebugger();

    var pendingTarget = this._pendingTargets.get(targetInfo.id);
    if (!pendingTarget) {
      this._targetCreated(targetInfo);
      pendingTarget = this._pendingTargets.get(targetInfo.id);
    }
    pendingTarget.notifyAttached(target);
    this.dispatchEventToListeners(WebInspector.SubTargetsManager.Events.PendingTargetAttached, pendingTarget);
  }

  /**
   * @param {string} targetId
   * @param {!InspectorBackendClass.Connection.Params} params
   * @return {!InspectorBackendClass.Connection}
   */
  _createConnection(targetId, params) {
    var connection = new WebInspector.SubTargetConnection(this._agent, targetId, params);
    this._connections.set(targetId, connection);
    return connection;
  }

  /**
   * @param {string} targetId
   */
  _detachedFromTarget(targetId) {
    var target = this._attachedTargets.get(targetId);
    this._attachedTargets.delete(targetId);
    var connection = this._connections.get(targetId);
    connection._onDisconnect.call(null, 'target terminated');
    this._connections.delete(targetId);
    this.dispatchEventToListeners(WebInspector.SubTargetsManager.Events.PendingTargetDetached, this._pendingTargets.get(targetId));
  }

  /**
   * @param {string} targetId
   * @param {string} message
   */
  _receivedMessageFromTarget(targetId, message) {
    var connection = this._connections.get(targetId);
    if (connection)
      connection._onMessage.call(null, message);
  }

  /**
   * @param {!WebInspector.TargetInfo} targetInfo
   */
  _targetCreated(targetInfo) {
    var pendingTarget = this._pendingTargets.get(targetInfo.id);
    if (pendingTarget)
      return;
    pendingTarget = new WebInspector.PendingTarget(targetInfo.id, targetInfo.title, targetInfo.type === 'node', this);
    this._pendingTargets.set(targetInfo.id, pendingTarget);
    this.dispatchEventToListeners(WebInspector.SubTargetsManager.Events.PendingTargetAdded, pendingTarget);
  }

  /**
   * @param {string} targetId
   */
  _targetDestroyed(targetId) {
    var pendingTarget = this._pendingTargets.get(targetId);
    if (!pendingTarget)
      return;
    this._pendingTargets.delete(targetId);
    this.dispatchEventToListeners(WebInspector.SubTargetsManager.Events.PendingTargetRemoved, pendingTarget);
  }

  /**
   * @return {!Array<!WebInspector.PendingTarget>}
   */
  pendingTargets() {
    return this._pendingTargets.valuesArray();
  }

  /**
   * @param {!WebInspector.Event} event
   */
  _mainFrameNavigated(event) {
    if (event.data.target() !== this.target())
      return;

    var idsToDetach = [];
    for (var targetId of this._attachedTargets.keys()) {
      var target = this._attachedTargets.get(targetId);
      var targetInfo = this.targetInfo(target);
      if (targetInfo.type === 'worker')
        idsToDetach.push(targetId);
    }
    idsToDetach.forEach(id => this._detachedFromTarget(id));
  }
};

/** @enum {symbol} */
WebInspector.SubTargetsManager.Events = {
  PendingTargetAdded: Symbol('PendingTargetAdded'),
  PendingTargetRemoved: Symbol('PendingTargetRemoved'),
  PendingTargetAttached: Symbol('PendingTargetAttached'),
  PendingTargetDetached: Symbol('PendingTargetDetached'),
};

WebInspector.SubTargetsManager._InfoSymbol = Symbol('SubTargetInfo');

/**
 * @implements {Protocol.TargetDispatcher}
 * @unrestricted
 */
WebInspector.SubTargetsDispatcher = class {
  /**
   * @param {!WebInspector.SubTargetsManager} manager
   */
  constructor(manager) {
    this._manager = manager;
  }

  /**
   * @override
   * @param {!Protocol.Target.TargetInfo} targetInfo
   */
  targetCreated(targetInfo) {
    this._manager._targetCreated(new WebInspector.TargetInfo(targetInfo));
  }

  /**
   * @override
   * @param {string} targetId
   */
  targetDestroyed(targetId) {
    this._manager._targetDestroyed(targetId);
  }

  /**
   * @override
   * @param {!Protocol.Target.TargetInfo} targetInfo
   * @param {boolean} waitingForDebugger
   */
  attachedToTarget(targetInfo, waitingForDebugger) {
    this._manager._attachedToTarget(new WebInspector.TargetInfo(targetInfo), waitingForDebugger);
  }

  /**
   * @override
   * @param {string} targetId
   */
  detachedFromTarget(targetId) {
    this._manager._detachedFromTarget(targetId);
  }

  /**
   * @override
   * @param {string} targetId
   * @param {string} message
   */
  receivedMessageFromTarget(targetId, message) {
    this._manager._receivedMessageFromTarget(targetId, message);
  }
};

/**
 * @implements {InspectorBackendClass.Connection}
 * @unrestricted
 */
WebInspector.SubTargetConnection = class {
  /**
   * @param {!Protocol.TargetAgent} agent
   * @param {string} targetId
   * @param {!InspectorBackendClass.Connection.Params} params
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
    throw new Error('Not implemented');
  }
};

/**
 * @unrestricted
 */
WebInspector.TargetInfo = class {
  /**
   * @param {!Protocol.Target.TargetInfo} payload
   */
  constructor(payload) {
    this.id = payload.targetId;
    this.url = payload.url;
    this.type = payload.type;
    this.canActivate = this.type === 'page' || this.type === 'iframe';
    if (this.type === 'node')
      this.title = WebInspector.UIString('Node: %s', this.url);
    else if (this.type === 'page' || this.type === 'iframe')
      this.title = payload.title;
    else
      this.title = WebInspector.UIString('Worker: %s', this.url);
  }
};

/**
 * @unrestricted
 */
WebInspector.PendingTarget = class {
  /**
   * @param {string} id
   * @param {string} title
   * @param {boolean} canConnect
   * @param {?WebInspector.SubTargetsManager} manager
   */
  constructor(id, title, canConnect, manager) {
    this._id = id;
    this._title = title;
    this._isRemote = canConnect;
    this._manager = manager;
    /** @type {?Promise} */
    this._connectPromise = null;
    /** @type {?Function} */
    this._attachedCallback = null;
  }

  /**
   * @return {string}
   */
  id() {
    return this._id;
  }

  /**
   * @return {?WebInspector.Target}
   */
  target() {
    if (!this._manager)
      return null;
    return this._manager.targetForId(this.id());
  }

  /**
   * @return {string}
   */
  name() {
    return this._title;
  }

  /**
   * @return {!Promise}
   */
  attach() {
    if (!this._manager)
      return Promise.reject();
    if (this._connectPromise)
      return this._connectPromise;
    if (this.target())
      return Promise.resolve(this.target());
    this._connectPromise = new Promise(resolve => {
      this._attachedCallback = resolve;
      this._manager._agent.attachToTarget(this.id());
    });
    return this._connectPromise;
  }

  /**
   * @return {!Promise}
   */
  detach() {
    if (this._manager)
      this._manager._agent.detachFromTarget(this.id());
    return Promise.resolve();
  }

  /**
   * @param {!WebInspector.Target} target
   */
  notifyAttached(target)
  {
    if (this._attachedCallback)
      this._attachedCallback(target);
    this._connectPromise = null;
    this._attachedCallback = null;
  }

  /**
   * @return {boolean}
   */
  canConnect()
  {
    return this._isRemote;
  }
};
