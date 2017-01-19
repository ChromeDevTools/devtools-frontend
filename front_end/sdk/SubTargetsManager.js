// Copyright 2016 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.
/**
 * @unrestricted
 */
SDK.SubTargetsManager = class extends SDK.SDKModel {
  /**
   * @param {!SDK.Target} target
   */
  constructor(target) {
    super(SDK.SubTargetsManager, target);
    target.registerTargetDispatcher(new SDK.SubTargetsDispatcher(this));
    this._lastAnonymousTargetId = 0;
    this._agent = target.targetAgent();

    /** @type {!Map<string, !SDK.Target>} */
    this._attachedTargets = new Map();
    /** @type {!Map<string, !SDK.SubTargetConnection>} */
    this._connections = new Map();

    /** @type {!Set<string>} */
    this._nodeTargetIds = new Set();

    this._agent.setAutoAttach(true /* autoAttach */, true /* waitForDebuggerOnStart */);
    if (Runtime.experiments.isEnabled('autoAttachToCrossProcessSubframes'))
      this._agent.setAttachToFrames(true);

    if (!target.parentTarget()) {
      var defaultLocations = [{host: 'localhost', port: 9229}];
      this._agent.setRemoteLocations(defaultLocations);
      this._agent.setDiscoverTargets(true);
    }
    SDK.targetManager.addEventListener(SDK.TargetManager.Events.MainFrameNavigated, this._mainFrameNavigated, this);
  }

  /**
   * @param {!SDK.Target} target
   * @return {?SDK.SubTargetsManager}
   */
  static fromTarget(target) {
    return target.model(SDK.SubTargetsManager);
  }

  /**
   * @return {number}
   */
  availableNodeTargetsCount() {
    return this._nodeTargetIds.size;
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
  }

  /**
   * @param {!Protocol.Target.TargetID} targetId
   */
  activateTarget(targetId) {
    this._agent.activateTarget(targetId);
  }

  /**
   * @param {!Protocol.Target.TargetID} targetId
   * @param {function(?SDK.TargetInfo)=} callback
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
        callback(new SDK.TargetInfo(targetInfo));
      else
        callback(null);
    }
    this._agent.getTargetInfo(targetId, innerCallback);
  }

  /**
   * @param {string} targetId
   * @return {?SDK.Target}
   */
  targetForId(targetId) {
    return this._attachedTargets.get(targetId) || null;
  }

  /**
   * @param {!SDK.Target} target
   * @return {?SDK.TargetInfo}
   */
  targetInfo(target) {
    return target[SDK.SubTargetsManager._InfoSymbol] || null;
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
          SDK.Target.Capability.Log | SDK.Target.Capability.Network | SDK.Target.Capability.Target;
    }
    if (type === 'node')
      return SDK.Target.Capability.JS;
    return 0;
  }

  /**
   * @param {!SDK.TargetInfo} targetInfo
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
    var target = SDK.targetManager.createTarget(
        targetName, this._capabilitiesForType(targetInfo.type), this._createConnection.bind(this, targetInfo.id),
        this.target());
    target[SDK.SubTargetsManager._InfoSymbol] = targetInfo;
    this._attachedTargets.set(targetInfo.id, target);

    // Only pause new worker if debugging SW - we are going through the pause on start checkbox.
    var mainIsServiceWorker =
        !this.target().parentTarget() && this.target().hasTargetCapability() && !this.target().hasBrowserCapability();
    if (mainIsServiceWorker && waitingForDebugger)
      target.debuggerAgent().pause();
    target.runtimeAgent().runIfWaitingForDebugger();
  }

  /**
   * @param {string} targetId
   * @param {!Protocol.InspectorBackend.Connection.Params} params
   * @return {!Protocol.InspectorBackend.Connection}
   */
  _createConnection(targetId, params) {
    var connection = new SDK.SubTargetConnection(this._agent, targetId, params);
    this._connections.set(targetId, connection);
    return connection;
  }

  /**
   * @param {string} targetId
   */
  _detachedFromTarget(targetId) {
    this._attachedTargets.delete(targetId);
    var connection = this._connections.get(targetId);
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
   * @param {!SDK.TargetInfo} targetInfo
   */
  _targetCreated(targetInfo) {
    if (targetInfo.type !== 'node')
      return;
    if (Runtime.queryParam('nodeFrontend')) {
      this._agent.attachToTarget(targetInfo.id);
    } else {
      this._nodeTargetIds.add(targetInfo.id);
      this.dispatchEventToListeners(SDK.SubTargetsManager.Events.AvailableNodeTargetsChanged);
    }
  }

  /**
   * @param {string} targetId
   */
  _targetDestroyed(targetId) {
    if (Runtime.queryParam('nodeFrontend') || !this._nodeTargetIds.has(targetId))
      return;
    this._nodeTargetIds.delete(targetId);
    this.dispatchEventToListeners(SDK.SubTargetsManager.Events.AvailableNodeTargetsChanged);
  }

  /**
   * @param {!Common.Event} event
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
SDK.SubTargetsManager.Events = {
  AvailableNodeTargetsChanged: Symbol('AvailableNodeTargetsChanged'),
};

SDK.SubTargetsManager._InfoSymbol = Symbol('SubTargetInfo');

/**
 * @implements {Protocol.TargetDispatcher}
 * @unrestricted
 */
SDK.SubTargetsDispatcher = class {
  /**
   * @param {!SDK.SubTargetsManager} manager
   */
  constructor(manager) {
    this._manager = manager;
  }

  /**
   * @override
   * @param {!Protocol.Target.TargetInfo} targetInfo
   */
  targetCreated(targetInfo) {
    this._manager._targetCreated(new SDK.TargetInfo(targetInfo));
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
    this._manager._attachedToTarget(new SDK.TargetInfo(targetInfo), waitingForDebugger);
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
 * @implements {Protocol.InspectorBackend.Connection}
 * @unrestricted
 */
SDK.SubTargetConnection = class {
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
    throw new Error('Not implemented');
  }
};

/**
 * @unrestricted
 */
SDK.TargetInfo = class {
  /**
   * @param {!Protocol.Target.TargetInfo} payload
   */
  constructor(payload) {
    this.id = payload.targetId;
    this.url = payload.url;
    this.type = payload.type;
    this.canActivate = this.type === 'page' || this.type === 'iframe';
    if (this.type === 'node')
      this.title = Common.UIString('Node: %s', this.url);
    else if (this.type === 'page' || this.type === 'iframe')
      this.title = payload.title;
    else
      this.title = Common.UIString('Worker: %s', this.url);
  }
};
