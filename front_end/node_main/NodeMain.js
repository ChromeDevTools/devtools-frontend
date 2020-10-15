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
  async run() {
    Host.userMetrics.actionTaken(Host.UserMetrics.Action.ConnectToNodeJSFromFrontend);
    SDK.Connections.initMainConnection(async () => {
      const target = SDK.SDKModel.TargetManager.instance().createTarget(
          'main', Common.UIString.UIString('Main'), SDK.SDKModel.Type.Browser, null);
      target.setInspectedURL('Node.js');
    }, Components.TargetDetachedDialog.TargetDetachedDialog.webSocketConnectionLost);
  }
}

/**
 * @implements {ProtocolProxyApi.TargetDispatcher}
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
    this._targetAgent.invoke_setDiscoverTargets({discover: true});

    Host.InspectorFrontendHost.InspectorFrontendHostInstance.events.addEventListener(
        Host.InspectorFrontendHostAPI.Events.DevicesDiscoveryConfigChanged, this._devicesDiscoveryConfigChanged, this);
    Host.InspectorFrontendHost.InspectorFrontendHostInstance.setDevicesUpdatesEnabled(false);
    Host.InspectorFrontendHost.InspectorFrontendHostInstance.setDevicesUpdatesEnabled(true);
  }

  /**
   * @override
   * @return {!Protocol.UsesObjectNotation}
   */
  usesObjectNotation() {
    return true;
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
    this._targetAgent.invoke_setRemoteLocations({locations});
  }

  /**
   * @override
   */
  dispose() {
    Host.InspectorFrontendHost.InspectorFrontendHostInstance.events.removeEventListener(
        Host.InspectorFrontendHostAPI.Events.DevicesDiscoveryConfigChanged, this._devicesDiscoveryConfigChanged, this);

    for (const sessionId of this._childTargets.keys()) {
      this.detachedFromTarget({sessionId});
    }
  }

  /**
   * @override
   * @param {!Protocol.Target.TargetCreatedEvent} event
   */
  targetCreated({targetInfo}) {
    if (targetInfo.type === 'node' && !targetInfo.attached) {
      this._targetAgent.invoke_attachToTarget({targetId: targetInfo.targetId, flatten: false});
    }
  }

  /**
   * @override
   * @param {!Protocol.Target.TargetInfoChangedEvent} event
   */
  targetInfoChanged(event) {
  }

  /**
   * @override
   * @param {!Protocol.Target.TargetDestroyedEvent} event
   */
  targetDestroyed(event) {
  }

  /**
   * @override
   * @param {!Protocol.Target.AttachedToTargetEvent} event
   */
  attachedToTarget({sessionId, targetInfo}) {
    const name = ls`Node.js: ${targetInfo.url}`;
    const connection = new NodeConnection(this._targetAgent, sessionId);
    this._childConnections.set(sessionId, connection);
    const target = this._targetManager.createTarget(
        targetInfo.targetId, name, SDK.SDKModel.Type.Node, this._parentTarget, undefined, undefined, connection);
    this._childTargets.set(sessionId, target);
    target.runtimeAgent().invoke_runIfWaitingForDebugger();
  }

  /**
   * @override
   * @param {!Protocol.Target.DetachedFromTargetEvent} event
   */
  detachedFromTarget({sessionId}) {
    const childTarget = this._childTargets.get(sessionId);
    if (childTarget) {
      childTarget.dispose('target terminated');
    }
    this._childTargets.delete(sessionId);
    this._childConnections.delete(sessionId);
  }

  /**
   * @override
   * @param {!Protocol.Target.ReceivedMessageFromTargetEvent} event
   */
  receivedMessageFromTarget({sessionId, message}) {
    const connection = this._childConnections.get(sessionId);
    const onMessage = connection ? connection._onMessage : null;
    if (onMessage) {
      onMessage.call(null, message);
    }
  }

  /**
   * @param {!Protocol.Target.TargetCrashedEvent} event
   */
  targetCrashed(event) {
  }
}

/**
 * @implements {ProtocolClient.InspectorBackend.Connection}
 */
export class NodeConnection {
  /**
   * @param {!ProtocolProxyApi.TargetApi} targetAgent
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
   * @param {function((!Object|string)):void} onMessage
   */
  setOnMessage(onMessage) {
    this._onMessage = onMessage;
  }

  /**
   * @override
   * @param {function(string):void} onDisconnect
   */
  setOnDisconnect(onDisconnect) {
    this._onDisconnect = onDisconnect;
  }

  /**
   * @override
   * @param {string} message
   */
  sendRawMessage(message) {
    this._targetAgent.invoke_sendMessageToTarget({message, sessionId: this._sessionId});
  }

  /**
   * @override
   * @return {!Promise<void>}
   */
  async disconnect() {
    if (this._onDisconnect) {
      this._onDisconnect.call(null, 'force disconnect');
    }
    this._onDisconnect = null;
    this._onMessage = null;
    await this._targetAgent.invoke_detachFromTarget({sessionId: this._sessionId});
  }
}

SDK.SDKModel.SDKModel.register(NodeChildTargetManager, SDK.SDKModel.Capability.Target, true);
