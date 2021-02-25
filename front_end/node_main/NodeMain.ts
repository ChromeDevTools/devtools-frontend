// Copyright 2018 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

/* eslint-disable rulesdir/no_underscored_properties */

import * as Common from '../common/common.js';
import * as Components from '../components/components.js';
import * as Host from '../host/host.js';
import * as i18n from '../i18n/i18n.js';
import type * as ProtocolClient from '../protocol_client/protocol_client.js';
import * as SDK from '../sdk/sdk.js';

export const UIStrings = {
  /**
  *@description Text that refers to the main target
  */
  main: 'Main',
  /**
  *@description Text in Node Main of the Sources panel when debugging a Node.js app
  *@example {example.com} PH1
  */
  nodejsS: 'Node.js: {PH1}',
};
const str_ = i18n.i18n.registerUIStrings('node_main/NodeMain.ts', UIStrings);
const i18nString = i18n.i18n.getLocalizedString.bind(undefined, str_);
export class NodeMainImpl extends Common.ObjectWrapper.ObjectWrapper implements Common.Runnable.Runnable {
  async run(): Promise<void> {
    Host.userMetrics.actionTaken(Host.UserMetrics.Action.ConnectToNodeJSFromFrontend);
    SDK.Connections.initMainConnection(async () => {
      const target = SDK.SDKModel.TargetManager.instance().createTarget(
          'main', i18nString(UIStrings.main), SDK.SDKModel.Type.Browser, null);
      target.setInspectedURL('Node.js');
    }, Components.TargetDetachedDialog.TargetDetachedDialog.webSocketConnectionLost);
  }
}

export class NodeChildTargetManager extends SDK.SDKModel.SDKModel implements ProtocolProxyApi.TargetDispatcher {
  _targetManager: SDK.SDKModel.TargetManager;
  _parentTarget: SDK.SDKModel.Target;
  _targetAgent: ProtocolProxyApi.TargetApi;
  _childTargets: Map<string, SDK.SDKModel.Target>;
  _childConnections: Map<string, NodeConnection>;
  constructor(parentTarget: SDK.SDKModel.Target) {
    super(parentTarget);
    this._targetManager = parentTarget.targetManager();
    this._parentTarget = parentTarget;
    this._targetAgent = parentTarget.targetAgent();
    this._childTargets = new Map();
    this._childConnections = new Map();

    parentTarget.registerTargetDispatcher(this);
    this._targetAgent.invoke_setDiscoverTargets({discover: true});

    Host.InspectorFrontendHost.InspectorFrontendHostInstance.events.addEventListener(
        Host.InspectorFrontendHostAPI.Events.DevicesDiscoveryConfigChanged, this._devicesDiscoveryConfigChanged, this);
    Host.InspectorFrontendHost.InspectorFrontendHostInstance.setDevicesUpdatesEnabled(false);
    Host.InspectorFrontendHost.InspectorFrontendHostInstance.setDevicesUpdatesEnabled(true);
  }

  _devicesDiscoveryConfigChanged(event: Common.EventTarget.EventTargetEvent): void {
    const config = (event.data as Adb.Config);
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

  dispose(): void {
    Host.InspectorFrontendHost.InspectorFrontendHostInstance.events.removeEventListener(
        Host.InspectorFrontendHostAPI.Events.DevicesDiscoveryConfigChanged, this._devicesDiscoveryConfigChanged, this);

    for (const sessionId of this._childTargets.keys()) {
      this.detachedFromTarget({sessionId});
    }
  }

  targetCreated({targetInfo}: Protocol.Target.TargetCreatedEvent): void {
    if (targetInfo.type === 'node' && !targetInfo.attached) {
      this._targetAgent.invoke_attachToTarget({targetId: targetInfo.targetId, flatten: false});
    }
  }

  targetInfoChanged(_event: Protocol.Target.TargetInfoChangedEvent): void {
  }

  targetDestroyed(_event: Protocol.Target.TargetDestroyedEvent): void {
  }

  attachedToTarget({sessionId, targetInfo}: Protocol.Target.AttachedToTargetEvent): void {
    const name = i18nString(UIStrings.nodejsS, {PH1: targetInfo.url});
    const connection = new NodeConnection(this._targetAgent, sessionId);
    this._childConnections.set(sessionId, connection);
    const target = this._targetManager.createTarget(
        targetInfo.targetId, name, SDK.SDKModel.Type.Node, this._parentTarget, undefined, undefined, connection);
    this._childTargets.set(sessionId, target);
    target.runtimeAgent().invoke_runIfWaitingForDebugger();
  }

  detachedFromTarget({sessionId}: Protocol.Target.DetachedFromTargetEvent): void {
    const childTarget = this._childTargets.get(sessionId);
    if (childTarget) {
      childTarget.dispose('target terminated');
    }
    this._childTargets.delete(sessionId);
    this._childConnections.delete(sessionId);
  }

  receivedMessageFromTarget({sessionId, message}: Protocol.Target.ReceivedMessageFromTargetEvent): void {
    const connection = this._childConnections.get(sessionId);
    const onMessage = connection ? connection._onMessage : null;
    if (onMessage) {
      onMessage.call(null, message);
    }
  }

  targetCrashed(_event: Protocol.Target.TargetCrashedEvent): void {
  }
}

export class NodeConnection implements ProtocolClient.InspectorBackend.Connection {
  _targetAgent: ProtocolProxyApi.TargetApi;
  _sessionId: string;
  _onMessage: ((arg0: (Object|string)) => void)|null;
  _onDisconnect: ((arg0: string) => void)|null;
  constructor(targetAgent: ProtocolProxyApi.TargetApi, sessionId: string) {
    this._targetAgent = targetAgent;
    this._sessionId = sessionId;
    this._onMessage = null;
    this._onDisconnect = null;
  }

  setOnMessage(onMessage: (arg0: (Object|string)) => void): void {
    this._onMessage = onMessage;
  }

  setOnDisconnect(onDisconnect: (arg0: string) => void): void {
    this._onDisconnect = onDisconnect;
  }

  sendRawMessage(message: string): void {
    this._targetAgent.invoke_sendMessageToTarget({message, sessionId: this._sessionId});
  }

  async disconnect(): Promise<void> {
    if (this._onDisconnect) {
      this._onDisconnect.call(null, 'force disconnect');
    }
    this._onDisconnect = null;
    this._onMessage = null;
    await this._targetAgent.invoke_detachFromTarget({sessionId: this._sessionId});
  }
}

SDK.SDKModel.SDKModel.register(NodeChildTargetManager, SDK.SDKModel.Capability.Target, true);
