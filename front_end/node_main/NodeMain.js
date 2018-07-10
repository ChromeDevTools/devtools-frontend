// Copyright 2018 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

/**
 * @implements {Common.Runnable}
 */
NodeMain.NodeMain = class extends Common.Object {
  /**
   * @override
   */
  run() {
    Host.userMetrics.actionTaken(Host.UserMetrics.Action.ConnectToNodeJSFromFrontend);
    const target = SDK.targetManager.createTarget(
        'main', Common.UIString('Main'), SDK.Target.Capability.Target, params => new SDK.MainConnection(params), null,
        false /* isNodeJS */);
    target.setInspectedURL('Node.js');
    InspectorFrontendHost.connectionReady();
  }
};

/**
 * @implements {Protocol.TargetDispatcher}
 */
NodeMain.NodeChildTargetManager = class extends SDK.SDKModel {
  /**
   * @param {!SDK.Target} parentTarget
   */
  constructor(parentTarget) {
    super(parentTarget);
    this._targetManager = parentTarget.targetManager();
    this._parentTarget = parentTarget;
    this._targetAgent = parentTarget.targetAgent();
    /** @type {!Map<string, !SDK.ChildConnection>} */
    this._childConnections = new Map();

    parentTarget.registerTargetDispatcher(this);
    this._targetAgent.setDiscoverTargets(true);

    InspectorFrontendHost.setDevicesUpdatesEnabled(true);
    InspectorFrontendHost.events.addEventListener(
        InspectorFrontendHostAPI.Events.DevicesDiscoveryConfigChanged, this._devicesDiscoveryConfigChanged, this);
  }

  /**
   * @param {!Common.Event} event
   */
  _devicesDiscoveryConfigChanged(event) {
    const config = /** @type {!Adb.Config} */ (event.data);
    const locations = [];
    for (const address of config.networkDiscoveryConfig) {
      const parts = address.split(':');
      const port = parseInt(parts[1], 10);
      if (parts[0] && port)
        locations.push({host: parts[0], port: port});
    }
    this._targetAgent.setRemoteLocations(locations);
  }

  /**
   * @override
   */
  dispose() {
    InspectorFrontendHost.events.removeEventListener(
        InspectorFrontendHostAPI.Events.DevicesDiscoveryConfigChanged, this._devicesDiscoveryConfigChanged, this);

    for (const sessionId of this._childConnections.keys())
      this.detachedFromTarget(sessionId, undefined);
  }

  /**
   * @override
   * @param {!Protocol.Target.TargetInfo} targetInfo
   */
  targetCreated(targetInfo) {
    if (targetInfo.type === 'node' && !targetInfo.attached)
      this._targetAgent.attachToTarget(targetInfo.targetId);
  }

  /**
   * @override
   * @param {!Protocol.Target.TargetInfo} targetInfo
   */
  targetInfoChanged(targetInfo) {
  }

  /**
   * @override
   * @param {string} targetId
   */
  targetDestroyed(targetId) {
  }

  /**
   * @override
   * @param {string} sessionId
   * @param {!Protocol.Target.TargetInfo} targetInfo
   * @param {boolean} waitingForDebugger
   */
  attachedToTarget(sessionId, targetInfo, waitingForDebugger) {
    const target = this._targetManager.createTarget(
        targetInfo.targetId, Common.UIString('Node.js: %s', targetInfo.url), SDK.Target.Capability.JS,
        this._createChildConnection.bind(this, this._targetAgent, sessionId), this._parentTarget, true /* isNodeJS */);
    target.runtimeAgent().runIfWaitingForDebugger();
  }

  /**
   * @override
   * @param {string} sessionId
   * @param {string=} childTargetId
   */
  detachedFromTarget(sessionId, childTargetId) {
    this._childConnections.get(sessionId).onDisconnect.call(null, 'target terminated');
    this._childConnections.delete(sessionId);
  }

  /**
   * @override
   * @param {string} sessionId
   * @param {string} message
   * @param {string=} childTargetId
   */
  receivedMessageFromTarget(sessionId, message, childTargetId) {
    const connection = this._childConnections.get(sessionId);
    if (connection)
      connection.onMessage.call(null, message);
  }

  /**
   * @param {!Protocol.TargetAgent} agent
   * @param {string} sessionId
   * @param {!Protocol.InspectorBackend.Connection.Params} params
   * @return {!Protocol.InspectorBackend.Connection}
   */
  _createChildConnection(agent, sessionId, params) {
    const connection = new SDK.ChildConnection(agent, sessionId, params);
    this._childConnections.set(sessionId, connection);
    return connection;
  }
};

SDK.SDKModel.register(NodeMain.NodeChildTargetManager, SDK.Target.Capability.Target, true);
