// Copyright 2018 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as Common from '../common/common.js';
import * as Components from '../components/components.js';
import * as Host from '../host/host.js';
import * as ProtocolClient from '../protocol_client/protocol_client.js';  // eslint-disable-line no-unused-vars
import * as SDK from '../sdk/sdk.js';

/**
 * @implements {Common.Runnable.Runnable}
 */
export class NodeMainImpl extends Common.ObjectWrapper.ObjectWrapper {
  /**
   * @override
   */
  run() {
    Host.userMetrics.actionTaken(Host.UserMetrics.Action.ConnectToNodeJSFromFrontend);
    SDK.Connections.initMainConnection(() => {
      const target = SDK.SDKModel.TargetManager.instance().createTarget(
          'main', Common.UIString.UIString('Main'), SDK.SDKModel.Type.Browser, null);
      target.setInspectedURL('Node.js');
    }, Components.TargetDetachedDialog.TargetDetachedDialog.webSocketConnectionLost);
  }
}

/**
 * @implements {Protocol.TargetDispatcher}
 */
export class NodeChildTargetManager extends SDK.SDKModel.SDKModel {
  /**
   * @param {!SDK.SDKModel.Target} parentTarget
   */
  constructor(parentTarget) {
    super(parentTarget);
    this._targetManager = parentTarget.targetManager();
    this._parentTarget = parentTarget;
    this._targetAgent = parentTarget.targetAgent();
    /** @type {!Map<string, !SDK.SDKModel.Target>} */
    this._childTargets = new Map();
    /** @type {!Map<string, !NodeConnection>} */
    this._childConnections = new Map();

    parentTarget.registerTargetDispatcher(this);
    this._targetAgent.setDiscoverTargets(true);

    Host.InspectorFrontendHost.InspectorFrontendHostInstance.events.addEventListener(
        Host.InspectorFrontendHostAPI.Events.DevicesDiscoveryConfigChanged, this._devicesDiscoveryConfigChanged, this);
    Host.InspectorFrontendHost.InspectorFrontendHostInstance.setDevicesUpdatesEnabled(false);
    Host.InspectorFrontendHost.InspectorFrontendHostInstance.setDevicesUpdatesEnabled(true);
  }

  /**
   * @param {!Common.EventTarget.EventTargetEvent} event
   */
  _devicesDiscoveryConfigChanged(event) {
    const config = /** @type {!Adb.Config} */ (event.data);
    const locations = [];
    for (const address of config.networkDiscoveryConfig) {
      const parts = address.split(':');
      const port = parseInt(parts[1], 10);
      if (parts[0] && port) {
        locations.push({host: parts[0], port: port});
      }
    }
    this._targetAgent.setRemoteLocations(locations);
  }

  /**
   * @override
   */
  dispose() {
    Host.InspectorFrontendHost.InspectorFrontendHostInstance.events.removeEventListener(
        Host.InspectorFrontendHostAPI.Events.DevicesDiscoveryConfigChanged, this._devicesDiscoveryConfigChanged, this);

    for (const sessionId of this._childTargets.keys()) {
      this.detachedFromTarget(sessionId, undefined);
    }
  }

  /**
   * @override
   * @param {!Protocol.Target.TargetInfo} targetInfo
   */
  targetCreated(targetInfo) {
    if (targetInfo.type === 'node' && !targetInfo.attached) {
      this._targetAgent.attachToTarget(targetInfo.targetId, false /* flatten */);
    }
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
    const name = ls`Node.js: ${targetInfo.url}`;
    const connection = new NodeConnection(this._targetAgent, sessionId);
    this._childConnections.set(sessionId, connection);
    const target = this._targetManager.createTarget(
        targetInfo.targetId, name, SDK.SDKModel.Type.Node, this._parentTarget, undefined, undefined, connection);
    this._childTargets.set(sessionId, target);
    target.runtimeAgent().runIfWaitingForDebugger();
  }

  /**
   * @override
   * @param {string} sessionId
   * @param {string=} childTargetId
   */
  detachedFromTarget(sessionId, childTargetId) {
    this._childTargets.get(sessionId).dispose('target terminated');
    this._childTargets.delete(sessionId);
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
    const onMessage = connection ? connection._onMessage : null;
    if (onMessage) {
      onMessage.call(null, message);
    }
  }
}

/**
 * @implements {ProtocolClient.InspectorBackend.Connection}
 */
export class NodeConnection {
  /**
   * @param {!Protocol.TargetAgent} targetAgent
   * @param {string} sessionId
   */
  constructor(targetAgent, sessionId) {
    this._targetAgent = targetAgent;
    this._sessionId = sessionId;
    this._onMessage = null;
    this._onDisconnect = null;
  }

  /**
   * @override
   * @param {function((!Object|string))} onMessage
   */
  setOnMessage(onMessage) {
    this._onMessage = onMessage;
  }

  /**
   * @override
   * @param {function(string)} onDisconnect
   */
  setOnDisconnect(onDisconnect) {
    this._onDisconnect = onDisconnect;
  }

  /**
   * @override
   * @param {string} message
   */
  sendRawMessage(message) {
    this._targetAgent.sendMessageToTarget(message, this._sessionId);
  }

  /**
   * @override
   * @return {!Promise}
   */
  disconnect() {
    if (this._onDisconnect) {
      this._onDisconnect.call(null, 'force disconnect');
    }
    this._onDisconnect = null;
    this._onMessage = null;
    return this._targetAgent.detachFromTarget(this._sessionId);
  }
}

SDK.SDKModel.SDKModel.register(NodeChildTargetManager, SDK.SDKModel.Capability.Target, true);
