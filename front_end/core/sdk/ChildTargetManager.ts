// Copyright 2018 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as i18n from '../../core/i18n/i18n.js';
import type * as ProtocolProxyApi from '../../generated/protocol-proxy-api.js';
import type * as Protocol from '../../generated/protocol.js';
import * as Common from '../common/common.js';
import * as Host from '../host/host.js';
import type * as ProtocolClient from '../protocol_client/protocol_client.js';

import {ParallelConnection} from './Connections.js';
import {PrimaryPageChangeType, ResourceTreeModel} from './ResourceTreeModel.js';
import {SDKModel} from './SDKModel.js';
import {Capability, type Target, Type} from './Target.js';
import {Events as TargetManagerEvents, TargetManager} from './TargetManager.js';

const UIStrings = {
  /**
   * @description Text that refers to the main target. The main target is the primary webpage that
   * DevTools is connected to. This text is used in various places in the UI as a label/name to inform
   * the user which target/webpage they are currently connected to, as DevTools may connect to multiple
   * targets at the same time in some scenarios.
   */
  main: 'Main',
};
const str_ = i18n.i18n.registerUIStrings('core/sdk/ChildTargetManager.ts', UIStrings);
const i18nString = i18n.i18n.getLocalizedString.bind(undefined, str_);

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

    if (parentTarget.parentTarget()?.type() !== Type.FRAME && !Host.InspectorFrontendHost.isUnderTest()) {
      void this.#targetAgent.invoke_setDiscoverTargets({discover: true});
      void this.#targetAgent.invoke_setRemoteLocations({locations: [{host: 'localhost', port: 9229}]});
    }
  }

  static install(attachCallback?: ((arg0: {
                                     target: Target,
                                     waitingForDebugger: boolean,
                                   }) => Promise<void>)): void {
    ChildTargetManager.attachCallback = attachCallback;
    SDKModel.register(ChildTargetManager, {capabilities: Capability.TARGET, autostart: true});
  }

  childTargets(): Target[] {
    return Array.from(this.#childTargetsBySessionId.values());
  }

  override async suspendModel(): Promise<void> {
    await this.#targetAgent.invoke_setAutoAttach({autoAttach: true, waitForDebuggerOnStart: false, flatten: true});
  }

  override async resumeModel(): Promise<void> {
    await this.#targetAgent.invoke_setAutoAttach({autoAttach: true, waitForDebuggerOnStart: true, flatten: true});
  }

  override dispose(): void {
    for (const sessionId of this.#childTargetsBySessionId.keys()) {
      this.detachedFromTarget({sessionId, targetId: undefined});
    }
  }

  targetCreated({targetInfo}: Protocol.Target.TargetCreatedEvent): void {
    this.#targetInfosInternal.set(targetInfo.targetId, targetInfo);
    this.fireAvailableTargetsChanged();
    this.dispatchEventToListeners(Events.TARGET_CREATED, targetInfo);
  }

  targetInfoChanged({targetInfo}: Protocol.Target.TargetInfoChangedEvent): void {
    this.#targetInfosInternal.set(targetInfo.targetId, targetInfo);
    const target = this.#childTargetsById.get(targetInfo.targetId);
    if (target) {
      if (target.targetInfo()?.subtype === 'prerender' && !targetInfo.subtype) {
        const resourceTreeModel = target.model(ResourceTreeModel);
        target.updateTargetInfo(targetInfo);
        if (resourceTreeModel && resourceTreeModel.mainFrame) {
          resourceTreeModel.primaryPageChanged(resourceTreeModel.mainFrame, PrimaryPageChangeType.ACTIVATION);
        }
        target.setName(i18nString(UIStrings.main));
      } else {
        target.updateTargetInfo(targetInfo);
      }
    }
    this.fireAvailableTargetsChanged();
    this.dispatchEventToListeners(Events.TARGET_INFO_CHANGED, targetInfo);
  }

  targetDestroyed({targetId}: Protocol.Target.TargetDestroyedEvent): void {
    this.#targetInfosInternal.delete(targetId);
    this.fireAvailableTargetsChanged();
    this.dispatchEventToListeners(Events.TARGET_DESTROYED, targetId);
  }

  targetCrashed({targetId}: Protocol.Target.TargetCrashedEvent): void {
    this.#targetInfosInternal.delete(targetId);
    const target = this.#childTargetsById.get(targetId);
    if (target) {
      target.dispose('targetCrashed event from CDP');
    }
    this.fireAvailableTargetsChanged();
    this.dispatchEventToListeners(Events.TARGET_DESTROYED, targetId);
  }

  private fireAvailableTargetsChanged(): void {
    TargetManager.instance().dispatchEventToListeners(
        TargetManagerEvents.AVAILABLE_TARGETS_CHANGED, [...this.#targetInfosInternal.values()]);
  }

  async getParentTargetId(): Promise<Protocol.Target.TargetID> {
    if (!this.#parentTargetId) {
      this.#parentTargetId = (await this.#parentTarget.targetAgent().invoke_getTargetInfo({})).targetInfo.targetId;
    }
    return this.#parentTargetId;
  }

  async getTargetInfo(): Promise<Protocol.Target.TargetInfo> {
    return (await this.#parentTarget.targetAgent().invoke_getTargetInfo({})).targetInfo;
  }

  async attachedToTarget({sessionId, targetInfo, waitingForDebugger}: Protocol.Target.AttachedToTargetEvent):
      Promise<void> {
    if (this.#parentTargetId === targetInfo.targetId) {
      return;
    }
    let type = Type.BROWSER;
    let targetName = '';
    if (targetInfo.type === 'worker' && targetInfo.title && targetInfo.title !== targetInfo.url) {
      targetName = targetInfo.title;
    } else if (!['page', 'iframe', 'webview'].includes(targetInfo.type)) {
      const KNOWN_FRAME_PATTERNS = [
        '^chrome://print/$',
        '^chrome://file-manager/',
        '^chrome://feedback/',
        '^chrome://.*\\.top-chrome/$',
        '^chrome://view-cert/$',
        '^devtools://',
      ];
      if (KNOWN_FRAME_PATTERNS.some(p => targetInfo.url.match(p))) {
        type = Type.FRAME;
      } else {
        const parsedURL = Common.ParsedURL.ParsedURL.fromString(targetInfo.url);
        targetName =
            parsedURL ? parsedURL.lastPathComponentWithFragment() : '#' + (++ChildTargetManager.lastAnonymousTargetId);
      }
    }

    if (targetInfo.type === 'iframe' || targetInfo.type === 'webview') {
      type = Type.FRAME;
    } else if (targetInfo.type === 'background_page' || targetInfo.type === 'app' || targetInfo.type === 'popup_page') {
      type = Type.FRAME;
    }
    else if (targetInfo.type === 'page') {
      type = Type.FRAME;
    } else if (targetInfo.type === 'worker') {
      type = Type.Worker;
    } else if (targetInfo.type === 'worklet') {
      type = Type.WORKLET;
    } else if (targetInfo.type === 'shared_worker') {
      type = Type.SHARED_WORKER;
    } else if (targetInfo.type === 'shared_storage_worklet') {
      type = Type.SHARED_STORAGE_WORKLET;
    } else if (targetInfo.type === 'service_worker') {
      type = Type.ServiceWorker;
    } else if (targetInfo.type === 'auction_worklet') {
      type = Type.AUCTION_WORKLET;
    }
    const target = this.#targetManager.createTarget(
        targetInfo.targetId, targetName, type, this.#parentTarget, sessionId, undefined, undefined, targetInfo);
    this.#childTargetsBySessionId.set(sessionId, target);
    this.#childTargetsById.set(target.id(), target);

    if (ChildTargetManager.attachCallback) {
      await ChildTargetManager.attachCallback({target, waitingForDebugger});
    }

    // [crbug/1423096] Invoking this on a worker session that is not waiting for the debugger can force the worker
    // to resume even if there is another session waiting for the debugger.
    if (waitingForDebugger) {
      void target.runtimeAgent().invoke_runIfWaitingForDebugger();
    }
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

export const enum Events {
  TARGET_CREATED = 'TargetCreated',
  TARGET_DESTROYED = 'TargetDestroyed',
  TARGET_INFO_CHANGED = 'TargetInfoChanged',
}

export type EventTypes = {
  [Events.TARGET_CREATED]: Protocol.Target.TargetInfo,
  [Events.TARGET_DESTROYED]: Protocol.Target.TargetID,
  [Events.TARGET_INFO_CHANGED]: Protocol.Target.TargetInfo,
};
