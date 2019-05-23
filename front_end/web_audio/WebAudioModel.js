// Copyright 2019 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

/**
 * @implements {Protocol.WebAudioDispatcher}
 */
WebAudio.WebAudioModel = class extends SDK.SDKModel {
  /**
   * @param {!SDK.Target} target
   */
  constructor(target) {
    super(target);

    this._enabled = false;

    /** @type {!Map<!Protocol.WebAudio.ContextId, !Protocol.WebAudio.BaseAudioContext>} */
    this._contextMapById = new Map();

    this._agent = target.webAudioAgent();
    target.registerWebAudioDispatcher(this);

    // TODO(crbug.com/963510): Some OfflineAudioContexts are not uninitialized
    // properly because LifeCycleObserver::ContextDestroyed() is not fired for
    // unknown reasons. This creates inconsistency in BaseAudioContextTracker
    // and AudioContextSelector in DevTools.
    //
    // To resolve this inconsistency, we flush the leftover from the previous
    // frame when the current page is loaded. This call can be omitted when the
    // bug is fixed.
    SDK.targetManager.addModelListener(
        SDK.ResourceTreeModel, SDK.ResourceTreeModel.Events.FrameNavigated, this._flushContexts, this);
  }

  _flushContexts() {
    this._contextMapById.clear();
    this.dispatchEventToListeners(WebAudio.WebAudioModel.Events.ModelReset);
  }

  /**
   * @override
   * @return {!Promise}
   */
  suspendModel() {
    this._contextMapById.clear();
    return this._agent.disable();
  }

  /**
   * @override
   * @return {!Promise}
   */
  resumeModel() {
    if (!this._enabled)
      return Promise.resolve();
    return this._agent.enable();
  }

  ensureEnabled() {
    if (this._enabled)
      return;
    this._agent.enable();
    this._enabled = true;
  }

  /**
   * @param {!Protocol.WebAudio.BaseAudioContext} context
   * @override
   */
  contextCreated(context) {
    this._contextMapById.set(context.contextId, context);
    this.dispatchEventToListeners(WebAudio.WebAudioModel.Events.ContextCreated, context);
  }

  /**
   * @param {!Protocol.WebAudio.ContextId} contextId
   * @override
   */
  contextDestroyed(contextId) {
    this._contextMapById.delete(contextId);
    this.dispatchEventToListeners(WebAudio.WebAudioModel.Events.ContextDestroyed, contextId);
  }

  /**
   * @param {!Protocol.WebAudio.BaseAudioContext} context
   * @override
   */
  contextChanged(context) {
    if (!this._contextMapById.has(context.contextId))
      return;

    this._contextMapById.set(context.contextId, context);
    this.dispatchEventToListeners(WebAudio.WebAudioModel.Events.ContextChanged, context);
  }

  /**
   * @param {!Protocol.WebAudio.ContextId} contextId
   * @return {!Promise<?Protocol.WebAudio.ContextRealtimeData>}
   */
  async requestRealtimeData(contextId) {
    if (!this._contextMapById.has(contextId))
      return Promise.resolve();
    return await this._agent.getRealtimeData(contextId);
  }
};

SDK.SDKModel.register(WebAudio.WebAudioModel, SDK.Target.Capability.DOM, false);

/** @enum {symbol} */
WebAudio.WebAudioModel.Events = {
  ContextCreated: Symbol('ContextCreated'),
  ContextDestroyed: Symbol('ContextDestroyed'),
  ContextChanged: Symbol('ContextChanged'),
  ModelReset: Symbol('ModelReset'),
};
