// Copyright 2018 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

/**
 * @implements {Protocol.TargetDispatcher}
 */
SDK.ChildTargetManager = class extends SDK.SDKModel {
  /**
   * @param {!SDK.Target} parentTarget
   */
  constructor(parentTarget) {
    super(parentTarget);
    this._targetManager = parentTarget.targetManager();
    this._parentTarget = parentTarget;
    this._targetAgent = parentTarget.targetAgent();
    /** @type {!Map<string, !Protocol.Target.TargetInfo>} */
    this._targetInfos = new Map();

    /** @type {!Map<string, !SDK.Target>} */
    this._childTargets = new Map();

    /** @type {!Map<string, !Protocol.Connection>} */
    this._parallelConnections = new Map();

    /** @type {string | null} */
    this._parentTargetId = null;

    parentTarget.registerTargetDispatcher(this);
    this._targetAgent.invoke_setAutoAttach({autoAttach: true, waitForDebuggerOnStart: true, flatten: true});

    if (!parentTarget.parentTarget() && !Host.isUnderTest()) {
      this._targetAgent.setDiscoverTargets(true);
      this._targetAgent.setRemoteLocations([{host: 'localhost', port: 9229}]);
    }
  }

  /**
   * @param {function({target: !SDK.Target, waitingForDebugger: boolean}):!Promise=} attachCallback
   */
  static install(attachCallback) {
    SDK.ChildTargetManager._attachCallback = attachCallback;
    SDK.SDKModel.register(SDK.ChildTargetManager, SDK.Target.Capability.Target, true);
  }

  /**
   * @override
   * @return {!Promise}
   */
  suspendModel() {
    return this._targetAgent.invoke_setAutoAttach({autoAttach: true, waitForDebuggerOnStart: false, flatten: true});
  }

  /**
   * @override
   * @return {!Promise}
   */
  resumeModel() {
    return this._targetAgent.invoke_setAutoAttach({autoAttach: true, waitForDebuggerOnStart: true, flatten: true});
  }

  /**
   * @override
   */
  dispose() {
    for (const sessionId of this._childTargets.keys())
      this.detachedFromTarget(sessionId, undefined);
  }

  /**
   * @override
   * @param {!Protocol.Target.TargetInfo} targetInfo
   */
  targetCreated(targetInfo) {
    this._targetInfos.set(targetInfo.targetId, targetInfo);
    this._fireAvailableTargetsChanged();
  }

  /**
   * @override
   * @param {!Protocol.Target.TargetInfo} targetInfo
   */
  targetInfoChanged(targetInfo) {
    this._targetInfos.set(targetInfo.targetId, targetInfo);
    this._fireAvailableTargetsChanged();
  }

  /**
   * @override
   * @param {string} targetId
   */
  targetDestroyed(targetId) {
    this._targetInfos.delete(targetId);
    this._fireAvailableTargetsChanged();
  }

  /**
   * @override
   * @param {string} targetId
   * @param {string} status
   * @param {number} errorCode
   */
  targetCrashed(targetId, status, errorCode) {
  }

  _fireAvailableTargetsChanged() {
    SDK.targetManager.dispatchEventToListeners(
        SDK.TargetManager.Events.AvailableTargetsChanged, this._targetInfos.valuesArray());
  }

  /**
   * @return {!Promise<string>}
   */
  async _getParentTargetId() {
    if (!this._parentTargetId)
      this._parentTargetId = (await this._parentTarget.targetAgent().getTargetInfo()).targetId;
    return this._parentTargetId;
  }

  /**
   * @override
   * @param {string} sessionId
   * @param {!Protocol.Target.TargetInfo} targetInfo
   * @param {boolean} waitingForDebugger
   */
  attachedToTarget(sessionId, targetInfo, waitingForDebugger) {
    if (this._parentTargetId === targetInfo.targetId)
      return;

    let targetName = '';
    if (targetInfo.type === 'worker' && targetInfo.title && targetInfo.title !== targetInfo.url) {
      targetName = targetInfo.title;
    } else if (targetInfo.type !== 'iframe') {
      const parsedURL = targetInfo.url.asParsedURL();
      targetName = parsedURL ? parsedURL.lastPathComponentWithFragment() :
                               '#' + (++SDK.ChildTargetManager._lastAnonymousTargetId);
    }

    let type = SDK.Target.Type.Browser;
    if (targetInfo.type === 'iframe')
      type = SDK.Target.Type.Frame;
    // TODO(lfg): ensure proper capabilities for child pages (e.g. portals).
    else if (targetInfo.type === 'page')
      type = SDK.Target.Type.Frame;
    else if (targetInfo.type === 'worker')
      type = SDK.Target.Type.Worker;
    else if (targetInfo.type === 'service_worker')
      type = SDK.Target.Type.ServiceWorker;

    const target =
        this._targetManager.createTarget(targetInfo.targetId, targetName, type, this._parentTarget, sessionId);
    this._childTargets.set(sessionId, target);

    if (SDK.ChildTargetManager._attachCallback) {
      SDK.ChildTargetManager._attachCallback({target, waitingForDebugger}).then(() => {
        target.runtimeAgent().runIfWaitingForDebugger();
      });
    } else {
      target.runtimeAgent().runIfWaitingForDebugger();
    }
  }

  /**
   * @override
   * @param {string} sessionId
   * @param {string=} childTargetId
   */
  detachedFromTarget(sessionId, childTargetId) {
    if (this._parallelConnections.has(sessionId)) {
      this._parallelConnections.delete(sessionId);
    } else {
      this._childTargets.get(sessionId).dispose('target terminated');
      this._childTargets.delete(sessionId);
    }
  }

  /**
   * @override
   * @param {string} sessionId
   * @param {string} message
   * @param {string=} childTargetId
   */
  receivedMessageFromTarget(sessionId, message, childTargetId) {
    // We use flatten protocol.
  }

  /**
   * @param {function((!Object|string))} onMessage
   * @return {!Promise<!Protocol.Connection>}
   */
  async createParallelConnection(onMessage) {
    // The main SDK.Target id is actually just `main`, instead of the real targetId.
    // Get the real id (requires an async operation) so that it can be used synchronously later.
    const targetId = await this._getParentTargetId();
    const {connection, sessionId} =
        await this._createParallelConnectionAndSessionForTarget(this._parentTarget, targetId);
    connection.setOnMessage(onMessage);
    this._parallelConnections.set(sessionId, connection);
    return connection;
  }

  /**
   * @param {!SDK.Target} target
   * @param {string} targetId
   * @return {!Promise<!{connection: !Protocol.Connection, sessionId: string}>}
   */
  async _createParallelConnectionAndSessionForTarget(target, targetId) {
    const targetAgent = target.targetAgent();
    const targetRouter = target.router();
    const sessionId = /** @type {string} */ (await targetAgent.attachToTarget(targetId, true /* flatten */));
    const connection = new SDK.ParallelConnection(targetRouter.connection(), sessionId);
    targetRouter.registerSession(target, sessionId, connection);
    connection.setOnDisconnect(async () => {
      await targetAgent.detachFromTarget(sessionId);
      targetRouter.unregisterSession(sessionId);
    });
    return {connection, sessionId};
  }
};

SDK.ChildTargetManager._lastAnonymousTargetId = 0;

/** @type {function({target: !SDK.Target, waitingForDebugger: boolean})|undefined} */
SDK.ChildTargetManager._attachCallback;
