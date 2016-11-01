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
    for (var connection of this._connections.values()) {
      this._agent.detachFromTarget(connection._targetId);
      connection._onDisconnect.call(null, 'disposed');
    }
    this._connections.clear();
    this._attachedTargets.clear();
  }

  /**
   * @param {!TargetAgent.TargetID} targetId
   */
  activateTarget(targetId) {
    this._agent.activateTarget(targetId);
  }

  /**
   * @param {!TargetAgent.TargetID} targetId
   * @param {function(?WebInspector.TargetInfo)=} callback
   */
  getTargetInfo(targetId, callback) {
    /**
     * @param {?Protocol.Error} error
     * @param {?TargetAgent.TargetInfo} targetInfo
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

    this.dispatchEventToListeners(WebInspector.SubTargetsManager.Events.SubTargetAdded, target);
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
    this.dispatchEventToListeners(WebInspector.SubTargetsManager.Events.SubTargetRemoved, target);
    var connection = this._connections.get(targetId);
    if (connection)
      connection._onDisconnect.call(null, 'target terminated');
    this._connections.delete(targetId);
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
    if (targetInfo.type !== 'node')
      return;
    this._agent.attachToTarget(targetInfo.id);
  }

  /**
   * @param {string} targetId
   */
  _targetDestroyed(targetId) {
    // All the work is done in _detachedFromTarget.
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
  SubTargetAdded: Symbol('SubTargetAdded'),
  SubTargetRemoved: Symbol('SubTargetRemoved'),
};

WebInspector.SubTargetsManager._InfoSymbol = Symbol('SubTargetInfo');

/**
 * @implements {TargetAgent.Dispatcher}
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
   * @param {!TargetAgent.TargetInfo} targetInfo
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
   * @param {!TargetAgent.TargetInfo} targetInfo
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
   * @param {!TargetAgent.TargetInfo} payload
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
