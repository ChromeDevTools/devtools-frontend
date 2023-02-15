// Copyright 2018 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as Common from '../common/common.js';
import * as Host from '../host/host.js';
import type * as ProtocolClient from '../protocol_client/protocol_client.js';
import type * as ProtocolProxyApi from '../../generated/protocol-proxy-api.js';
import type * as Protocol from '../../generated/protocol.js';

import {ParallelConnection} from './Connections.js';

import {Capability, Type, type Target} from './Target.js';
import {SDKModel} from './SDKModel.js';
import {Events as TargetManagerEvents, TargetManager} from './TargetManager.js';

export class ChildTargetManager extends SDKModel<EventTypes> implements ProtocolProxyApi.TargetDispatcher {
  readonly #targetManager: TargetManager;
  #parentTarget: Target;
  readonly #targetAgent: ProtocolProxyApi.TargetApi;
  readonly #targetInfosInternal: Map<Protocol.Target.TargetID, Protocol.Target.TargetInfo> = new Map();
  readonly #childTargetsBySessionId: Map<Protocol.Target.SessionID, Target> = new Map();
  readonly #childTargetsById: Map<Protocol.Target.TargetID|'main', Target> = new Map();
  readonly #parallelConnections: Map<string, ProtocolClient.InspectorBackend.Connection> = new Map();
  #parentTargetId: Protocol.Target.TargetID|null = null;

  constructor(parentTarget: Target) {
    super(parentTarget);
    this.#targetManager = parentTarget.targetManager();
    this.#parentTarget = parentTarget;
    this.#targetAgent = parentTarget.targetAgent();
    parentTarget.registerTargetDispatcher(this);
    const browserTarget = this.#targetManager.browserTarget();
    if (browserTarget) {
      if (browserTarget !== parentTarget) {
        void browserTarget.targetAgent().invoke_autoAttachRelated(
            {targetId: parentTarget.id() as Protocol.Target.TargetID, waitForDebuggerOnStart: true});
      }
    } else {
      void this.#targetAgent.invoke_setAutoAttach({autoAttach: true, waitForDebuggerOnStart: true, flatten: true});
    }

    if (parentTarget.parentTarget()?.type() !== Type.Frame && !Host.InspectorFrontendHost.isUnderTest()) {
      void this.#targetAgent.invoke_setDiscoverTargets({discover: true});
      void this.#targetAgent.invoke_setRemoteLocations({locations: [{host: 'localhost', port: 9229}]});
    }
  }

  static install(attachCallback?: ((arg0: {
                                     target: Target,
                                     waitingForDebugger: boolean,
                                   }) => Promise<void>)): void {
    ChildTargetManager.attachCallback = attachCallback;
    SDKModel.register(ChildTargetManager, {capabilities: Capability.Target, autostart: true});
  }

  childTargets(): Target[] {
    return Array.from(this.#childTargetsBySessionId.values());
  }

  async suspendModel(): Promise<void> {
    await this.#targetAgent.invoke_setAutoAttach({autoAttach: true, waitForDebuggerOnStart: false, flatten: true});
  }

  async resumeModel(): Promise<void> {
    await this.#targetAgent.invoke_setAutoAttach({autoAttach: true, waitForDebuggerOnStart: true, flatten: true});
  }

  dispose(): void {
    for (const sessionId of this.#childTargetsBySessionId.keys()) {
      this.detachedFromTarget({sessionId, targetId: undefined});
    }
  }

  targetCreated({targetInfo}: Protocol.Target.TargetCreatedEvent): void {
    this.#targetInfosInternal.set(targetInfo.targetId, targetInfo);
    this.fireAvailableTargetsChanged();
    this.dispatchEventToListeners(Events.TargetCreated, targetInfo);
  }

  targetInfoChanged({targetInfo}: Protocol.Target.TargetInfoChangedEvent): void {
    this.#targetInfosInternal.set(targetInfo.targetId, targetInfo);
    const target = this.#childTargetsById.get(targetInfo.targetId);
    if (target) {
      target.updateTargetInfo(targetInfo);
    }
    this.fireAvailableTargetsChanged();
    this.dispatchEventToListeners(Events.TargetInfoChanged, targetInfo);
  }

  targetDestroyed({targetId}: Protocol.Target.TargetDestroyedEvent): void {
    this.#targetInfosInternal.delete(targetId);
    this.fireAvailableTargetsChanged();
    this.dispatchEventToListeners(Events.TargetDestroyed, targetId);
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  targetCrashed({targetId, status, errorCode}: Protocol.Target.TargetCrashedEvent): void {
  }

  private fireAvailableTargetsChanged(): void {
    TargetManager.instance().dispatchEventToListeners(
        TargetManagerEvents.AvailableTargetsChanged, [...this.#targetInfosInternal.values()]);
  }

  async getParentTargetId(): Promise<Protocol.Target.TargetID> {
    if (!this.#parentTargetId) {
      this.#parentTargetId = (await this.#parentTarget.targetAgent().invoke_getTargetInfo({})).targetInfo.targetId;
    }
    return this.#parentTargetId;
  }

  async attachedToTarget({sessionId, targetInfo, waitingForDebugger}: Protocol.Target.AttachedToTargetEvent):
      Promise<void> {
    if (this.#parentTargetId === targetInfo.targetId) {
      return;
    }
    let type = Type.Browser;
    let targetName = '';
    if (targetInfo.type === 'worker' && targetInfo.title && targetInfo.title !== targetInfo.url) {
      targetName = targetInfo.title;
    } else if (!['page', 'iframe', 'webview'].includes(targetInfo.type)) {
      const parsedURL = Common.ParsedURL.ParsedURL.fromString(targetInfo.url);
      targetName =
          parsedURL ? parsedURL.lastPathComponentWithFragment() : '#' + (++ChildTargetManager.lastAnonymousTargetId);
      if (parsedURL?.scheme === 'devtools' && targetInfo.type === 'other') {
        type = Type.Frame;
      }
    }

    if (targetInfo.type === 'iframe' || targetInfo.type === 'webview') {
      type = Type.Frame;
    } else if (targetInfo.type === 'background_page' || targetInfo.type === 'app' || targetInfo.type === 'popup_page') {
      type = Type.Frame;
    }
    // TODO(lfg): ensure proper capabilities for child pages (e.g. portals).
    else if (targetInfo.type === 'page') {
      type = Type.Frame;
    } else if (targetInfo.type === 'worker') {
      type = Type.Worker;
    } else if (targetInfo.type === 'shared_worker') {
      type = Type.SharedWorker;
    } else if (targetInfo.type === 'service_worker') {
      type = Type.ServiceWorker;
    } else if (targetInfo.type === 'auction_worklet') {
      type = Type.AuctionWorklet;
    }
    const target = this.#targetManager.createTarget(
        targetInfo.targetId, targetName, type, this.#parentTarget, sessionId, undefined, undefined, targetInfo);
    this.#childTargetsBySessionId.set(sessionId, target);
    this.#childTargetsById.set(target.id(), target);

    if (ChildTargetManager.attachCallback) {
      await ChildTargetManager.attachCallback({target, waitingForDebugger});
    }
    void target.runtimeAgent().invoke_runIfWaitingForDebugger();
  }

  detachedFromTarget({sessionId}: Protocol.Target.DetachedFromTargetEvent): void {
    if (this.#parallelConnections.has(sessionId)) {
      this.#parallelConnections.delete(sessionId);
    } else {
      const target = this.#childTargetsBySessionId.get(sessionId);
      if (target) {
        target.dispose('target terminated');
        this.#childTargetsBySessionId.delete(sessionId);
        this.#childTargetsById.delete(target.id());
      }
    }
  }

  receivedMessageFromTarget({}: Protocol.Target.ReceivedMessageFromTargetEvent): void {
    // We use flatten protocol.
  }

  async createParallelConnection(onMessage: (arg0: (Object|string)) => void):
      Promise<{connection: ProtocolClient.InspectorBackend.Connection, sessionId: string}> {
    // The main Target id is actually just `main`, instead of the real targetId.
    // Get the real id (requires an async operation) so that it can be used synchronously later.
    const targetId = await this.getParentTargetId();
    const {connection, sessionId} =
        await this.createParallelConnectionAndSessionForTarget(this.#parentTarget, targetId);
    connection.setOnMessage(onMessage);
    this.#parallelConnections.set(sessionId, connection);
    return {connection, sessionId};
  }

  private async createParallelConnectionAndSessionForTarget(target: Target, targetId: Protocol.Target.TargetID):
      Promise<{
        connection: ProtocolClient.InspectorBackend.Connection,
        sessionId: string,
      }> {
    const targetAgent = target.targetAgent();
    const targetRouter = (target.router() as ProtocolClient.InspectorBackend.SessionRouter);
    const sessionId = (await targetAgent.invoke_attachToTarget({targetId, flatten: true})).sessionId;
    const connection = new ParallelConnection(targetRouter.connection(), sessionId);
    targetRouter.registerSession(target, sessionId, connection);
    connection.setOnDisconnect(() => {
      targetRouter.unregisterSession(sessionId);
      void targetAgent.invoke_detachFromTarget({sessionId});
    });
    return {connection, sessionId};
  }

  targetInfos(): Protocol.Target.TargetInfo[] {
    return Array.from(this.#targetInfosInternal.values());
  }

  private static lastAnonymousTargetId = 0;

  private static attachCallback?: ((arg0: {
                                     target: Target,
                                     waitingForDebugger: boolean,
                                   }) => Promise<void>);
}

// TODO(crbug.com/1167717): Make this a const enum again
// eslint-disable-next-line rulesdir/const_enum
export enum Events {
  TargetCreated = 'TargetCreated',
  TargetDestroyed = 'TargetDestroyed',
  TargetInfoChanged = 'TargetInfoChanged',
}

export type EventTypes = {
  [Events.TargetCreated]: Protocol.Target.TargetInfo,
  [Events.TargetDestroyed]: Protocol.Target.TargetID,
  [Events.TargetInfoChanged]: Protocol.Target.TargetInfo,
};
