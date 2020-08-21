// Copyright 2018 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as Common from '../common/common.js';
import * as Host from '../host/host.js';
import * as ProtocolClient from '../protocol_client/protocol_client.js';  // eslint-disable-line no-unused-vars

import {ParallelConnection} from './Connections.js';
import {Capability, Events as SDKModelEvents, SDKModel, Target, TargetManager, Type} from './SDKModel.js';  // eslint-disable-line no-unused-vars

let _lastAnonymousTargetId = 0;

/** @type {(function({target: !Target, waitingForDebugger: boolean}):!Promise<?>)|undefined} */
let _attachCallback;

/**
 * @implements {ProtocolProxyApi.TargetDispatcher}
 */
export class ChildTargetManager extends SDKModel {
  /**
   * @param {!Target} parentTarget
   */
  constructor(parentTarget) {
    super(parentTarget);
    this._targetManager = parentTarget.targetManager();
    this._parentTarget = parentTarget;
    this._targetAgent = parentTarget.targetAgent();
    /** @type {!Map<string, !Protocol.Target.TargetInfo>} */
    this._targetInfos = new Map();

    /** @type {!Map<string, !Target>} */
    this._childTargets = new Map();

    /** @type {!Map<string, !ProtocolClient.InspectorBackend.Connection>} */
    this._parallelConnections = new Map();

    /** @type {string | null} */
    this._parentTargetId = null;

    parentTarget.registerTargetDispatcher(this);
    this._targetAgent.invoke_setAutoAttach({autoAttach: true, waitForDebuggerOnStart: true, flatten: true});

    if (!parentTarget.parentTarget() && !Host.InspectorFrontendHost.isUnderTest()) {
      this._targetAgent.invoke_setDiscoverTargets({discover: true});
      this._targetAgent.invoke_setRemoteLocations({locations: [{host: 'localhost', port: 9229}]});
    }
  }

  /**
   * @return {!Protocol.UsesObjectNotation}
   */
  usesObjectNotation() {
    return true;
  }

  /**
   * @param {function({target: !Target, waitingForDebugger: boolean}):!Promise<?>=} attachCallback
   */
  static install(attachCallback) {
    _attachCallback = attachCallback;
    SDKModel.register(ChildTargetManager, Capability.Target, true);
  }

  /**
   * @override
   * @return {!Promise<?>}
   */
  suspendModel() {
    return this._targetAgent.invoke_setAutoAttach({autoAttach: true, waitForDebuggerOnStart: false, flatten: true});
  }

  /**
   * @override
   * @return {!Promise<?>}
   */
  resumeModel() {
    return this._targetAgent.invoke_setAutoAttach({autoAttach: true, waitForDebuggerOnStart: true, flatten: true});
  }

  /**
   * @override
   */
  dispose() {
    for (const sessionId of this._childTargets.keys()) {
      this.detachedFromTarget({sessionId, targetId: undefined});
    }
  }

  /**
   * @override
   * @param {!Protocol.Target.TargetCreatedEvent} event
   */
  targetCreated({targetInfo}) {
    this._targetInfos.set(targetInfo.targetId, targetInfo);
    this._fireAvailableTargetsChanged();
    this.dispatchEventToListeners(Events.TargetCreated, targetInfo);
  }

  /**
   * @override
   * @param {!Protocol.Target.TargetInfoChangedEvent} event
   */
  targetInfoChanged({targetInfo}) {
    this._targetInfos.set(targetInfo.targetId, targetInfo);
    this._fireAvailableTargetsChanged();
    this.dispatchEventToListeners(Events.TargetInfoChanged, targetInfo);
  }

  /**
   * @override
   * @param {!Protocol.Target.TargetDestroyedEvent} event
   */
  targetDestroyed({targetId}) {
    this._targetInfos.delete(targetId);
    this._fireAvailableTargetsChanged();
    this.dispatchEventToListeners(Events.TargetDestroyed, targetId);
  }

  /**
   * @override
   * @param {!Protocol.Target.TargetCrashedEvent} event
   */
  targetCrashed({targetId, status, errorCode}) {
  }

  _fireAvailableTargetsChanged() {
    TargetManager.instance().dispatchEventToListeners(
        SDKModelEvents.AvailableTargetsChanged, [...this._targetInfos.values()]);
  }

  /**
   * @return {!Promise<string>}
   */
  async _getParentTargetId() {
    if (!this._parentTargetId) {
      this._parentTargetId = (await this._parentTarget.targetAgent().invoke_getTargetInfo({})).targetInfo.targetId;
    }
    return this._parentTargetId;
  }

  /**
   * @override
   * @param {!Protocol.Target.AttachedToTargetEvent} event
   */
  attachedToTarget({sessionId, targetInfo, waitingForDebugger}) {
    if (this._parentTargetId === targetInfo.targetId) {
      return;
    }

    let targetName = '';
    if (targetInfo.type === 'worker' && targetInfo.title && targetInfo.title !== targetInfo.url) {
      targetName = targetInfo.title;
    } else if (targetInfo.type !== 'iframe') {
      const parsedURL = Common.ParsedURL.ParsedURL.fromString(targetInfo.url);
      targetName = parsedURL ? parsedURL.lastPathComponentWithFragment() : '#' + (++_lastAnonymousTargetId);
    }

    let type = Type.Browser;
    if (targetInfo.type === 'iframe') {
      type = Type.Frame;
    }
    // TODO(lfg): ensure proper capabilities for child pages (e.g. portals).
    else if (targetInfo.type === 'page') {
      type = Type.Frame;
    } else if (targetInfo.type === 'worker') {
      type = Type.Worker;
    } else if (targetInfo.type === 'service_worker') {
      type = Type.ServiceWorker;
    }

    const target =
        this._targetManager.createTarget(targetInfo.targetId, targetName, type, this._parentTarget, sessionId);
    this._childTargets.set(sessionId, target);

    if (_attachCallback) {
      _attachCallback({target, waitingForDebugger}).then(() => {
        target.runtimeAgent().invoke_runIfWaitingForDebugger();
      });
    } else {
      target.runtimeAgent().invoke_runIfWaitingForDebugger();
    }
  }

  /**
   * @override
   * @param {!Protocol.Target.DetachedFromTargetEvent} event
   */
  detachedFromTarget({sessionId}) {
    if (this._parallelConnections.has(sessionId)) {
      this._parallelConnections.delete(sessionId);
    } else {
      const session = this._childTargets.get(sessionId);
      if (session) {
        session.dispose('target terminated');
        this._childTargets.delete(sessionId);
      }
    }
  }

  /**
   * @override
   * @param {!Protocol.Target.ReceivedMessageFromTargetEvent} event
   */
  receivedMessageFromTarget({}) {
    // We use flatten protocol.
  }

  /**
   * @param {function((!Object|string)):void} onMessage
   * @return {!Promise<!ProtocolClient.InspectorBackend.Connection>}
   */
  async createParallelConnection(onMessage) {
    // The main Target id is actually just `main`, instead of the real targetId.
    // Get the real id (requires an async operation) so that it can be used synchronously later.
    const targetId = await this._getParentTargetId();
    const {connection, sessionId} =
        await this._createParallelConnectionAndSessionForTarget(this._parentTarget, targetId);
    connection.setOnMessage(onMessage);
    this._parallelConnections.set(sessionId, connection);
    return connection;
  }

  /**
   * @param {!Target} target
   * @param {string} targetId
   * @return {!Promise<!{connection: !ProtocolClient.InspectorBackend.Connection, sessionId: string}>}
   */
  async _createParallelConnectionAndSessionForTarget(target, targetId) {
    const targetAgent = target.targetAgent();
    const targetRouter = /** @type {!ProtocolClient.InspectorBackend.SessionRouter} */ (target.router());
    const sessionId = (await targetAgent.invoke_attachToTarget({targetId, flatten: true})).sessionId;
    const connection = new ParallelConnection(targetRouter.connection(), sessionId);
    targetRouter.registerSession(target, sessionId, connection);
    connection.setOnDisconnect(() => {
      targetRouter.unregisterSession(sessionId);
      targetAgent.invoke_detachFromTarget({sessionId});
    });
    return {connection, sessionId};
  }

  /**
   * @return {!Array<!Protocol.Target.TargetInfo>}
   */
  targetInfos() {
    return Array.from(this._targetInfos.values());
  }
}

/** @enum {symbol} */
export const Events = {
  TargetCreated: Symbol('TargetCreated'),
  TargetDestroyed: Symbol('TargetDestroyed'),
  TargetInfoChanged: Symbol('TargetInforChanged'),
};
