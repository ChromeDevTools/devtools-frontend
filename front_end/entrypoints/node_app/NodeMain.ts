// Copyright 2018 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import type * as Common from '../../core/common/common.js';
import * as Host from '../../core/host/host.js';
import * as i18n from '../../core/i18n/i18n.js';
import * as Components from '../../ui/legacy/components/utils/utils.js';
import type * as Platform from '../../core/platform/platform.js';
import type * as ProtocolProxyApi from '../../generated/protocol-proxy-api.js';
import type * as Protocol from '../../generated/protocol.js';

import type * as ProtocolClient from '../../core/protocol_client/protocol_client.js';
import * as SDK from '../../core/sdk/sdk.js';

const UIStrings = {
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
const str_ = i18n.i18n.registerUIStrings('entrypoints/node_app/NodeMain.ts', UIStrings);
const i18nString = i18n.i18n.getLocalizedString.bind(undefined, str_);
let nodeMainImplInstance: NodeMainImpl;

export class NodeMainImpl implements Common.Runnable.Runnable {
  static instance(opts: {forceNew: boolean|null} = {forceNew: null}): NodeMainImpl {
    const {forceNew} = opts;
    if (!nodeMainImplInstance || forceNew) {
      nodeMainImplInstance = new NodeMainImpl();
    }
    return nodeMainImplInstance;
  }
  async run(): Promise<void> {
    Host.userMetrics.actionTaken(Host.UserMetrics.Action.ConnectToNodeJSFromFrontend);
    void SDK.Connections.initMainConnection(async () => {
      const target = SDK.TargetManager.TargetManager.instance().createTarget(
          'main', i18nString(UIStrings.main), SDK.Target.Type.Browser, null);
      target.setInspectedURL('Node.js' as Platform.DevToolsPath.UrlString);
    }, Components.TargetDetachedDialog.TargetDetachedDialog.webSocketConnectionLost);
  }
}

export class NodeChildTargetManager extends SDK.SDKModel.SDKModel<void> implements ProtocolProxyApi.TargetDispatcher {
  readonly #targetManager: SDK.TargetManager.TargetManager;
  readonly #parentTarget: SDK.Target.Target;
  readonly #targetAgent: ProtocolProxyApi.TargetApi;
  readonly #childTargets: Map<Protocol.Target.SessionID, SDK.Target.Target>;
  readonly #childConnections: Map<string, NodeConnection>;
  constructor(parentTarget: SDK.Target.Target) {
    super(parentTarget);
    this.#targetManager = parentTarget.targetManager();
    this.#parentTarget = parentTarget;
    this.#targetAgent = parentTarget.targetAgent();
    this.#childTargets = new Map();
    this.#childConnections = new Map();

    parentTarget.registerTargetDispatcher(this);
    void this.#targetAgent.invoke_setDiscoverTargets({discover: true});

    Host.InspectorFrontendHost.InspectorFrontendHostInstance.events.addEventListener(
        Host.InspectorFrontendHostAPI.Events.DevicesDiscoveryConfigChanged, this.#devicesDiscoveryConfigChanged, this);
    Host.InspectorFrontendHost.InspectorFrontendHostInstance.setDevicesUpdatesEnabled(false);
    Host.InspectorFrontendHost.InspectorFrontendHostInstance.setDevicesUpdatesEnabled(true);
  }

  #devicesDiscoveryConfigChanged({data: config}: Common.EventTarget.EventTargetEvent<Adb.Config>): void {
    const locations = [];
    for (const address of config.networkDiscoveryConfig) {
      const parts = address.split(':');
      const port = parseInt(parts[1], 10);
      if (parts[0] && port) {
        locations.push({host: parts[0], port: port});
      }
    }
    void this.#targetAgent.invoke_setRemoteLocations({locations});
  }

  override dispose(): void {
    Host.InspectorFrontendHost.InspectorFrontendHostInstance.events.removeEventListener(
        Host.InspectorFrontendHostAPI.Events.DevicesDiscoveryConfigChanged, this.#devicesDiscoveryConfigChanged, this);

    for (const sessionId of this.#childTargets.keys()) {
      this.detachedFromTarget({sessionId});
    }
  }

  targetCreated({targetInfo}: Protocol.Target.TargetCreatedEvent): void {
    if (targetInfo.type === 'node' && !targetInfo.attached) {
      void this.#targetAgent.invoke_attachToTarget({targetId: targetInfo.targetId, flatten: false});
    }
  }

  targetInfoChanged(_event: Protocol.Target.TargetInfoChangedEvent): void {
  }

  targetDestroyed(_event: Protocol.Target.TargetDestroyedEvent): void {
  }

  attachedToTarget({sessionId, targetInfo}: Protocol.Target.AttachedToTargetEvent): void {
    const name = i18nString(UIStrings.nodejsS, {PH1: targetInfo.url});
    const connection = new NodeConnection(this.#targetAgent, sessionId);
    this.#childConnections.set(sessionId, connection);
    const target = this.#targetManager.createTarget(
        targetInfo.targetId, name, SDK.Target.Type.Node, this.#parentTarget, undefined, undefined, connection);
    this.#childTargets.set(sessionId, target);
    void target.runtimeAgent().invoke_runIfWaitingForDebugger();
  }

  detachedFromTarget({sessionId}: Protocol.Target.DetachedFromTargetEvent): void {
    const childTarget = this.#childTargets.get(sessionId);
    if (childTarget) {
      childTarget.dispose('target terminated');
    }
    this.#childTargets.delete(sessionId);
    this.#childConnections.delete(sessionId);
  }

  receivedMessageFromTarget({sessionId, message}: Protocol.Target.ReceivedMessageFromTargetEvent): void {
    const connection = this.#childConnections.get(sessionId);
    const onMessage = connection ? connection.onMessage : null;
    if (onMessage) {
      onMessage.call(null, message);
    }
  }

  targetCrashed(_event: Protocol.Target.TargetCrashedEvent): void {
  }
}

export class NodeConnection implements ProtocolClient.InspectorBackend.Connection {
  readonly #targetAgent: ProtocolProxyApi.TargetApi;
  readonly #sessionId: Protocol.Target.SessionID;
  onMessage: ((arg0: (Object|string)) => void)|null;
  #onDisconnect: ((arg0: string) => void)|null;
  constructor(targetAgent: ProtocolProxyApi.TargetApi, sessionId: Protocol.Target.SessionID) {
    this.#targetAgent = targetAgent;
    this.#sessionId = sessionId;
    this.onMessage = null;
    this.#onDisconnect = null;
  }

  setOnMessage(onMessage: (arg0: (Object|string)) => void): void {
    this.onMessage = onMessage;
  }

  setOnDisconnect(onDisconnect: (arg0: string) => void): void {
    this.#onDisconnect = onDisconnect;
  }

  sendRawMessage(message: string): void {
    void this.#targetAgent.invoke_sendMessageToTarget({message, sessionId: this.#sessionId});
  }

  async disconnect(): Promise<void> {
    if (this.#onDisconnect) {
      this.#onDisconnect.call(null, 'force disconnect');
    }
    this.#onDisconnect = null;
    this.onMessage = null;
    await this.#targetAgent.invoke_detachFromTarget({sessionId: this.#sessionId});
  }
}

SDK.SDKModel.SDKModel.register(NodeChildTargetManager, {capabilities: SDK.Target.Capability.Target, autostart: true});
