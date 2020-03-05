// Copyright 2019 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as SDK from '../sdk/sdk.js';

/**
 * @implements {Protocol.WebAudioDispatcher}
 */
export class WebAudioModel extends SDK.SDKModel.SDKModel {
  /**
   * @param {!SDK.SDKModel.Target} target
   */
  constructor(target) {
    super(target);

    this._enabled = false;

    this._agent = target.webAudioAgent();
    target.registerWebAudioDispatcher(this);

    // TODO(crbug.com/963510): Some OfflineAudioContexts are not uninitialized
    // properly because LifeCycleObserver::ContextDestroyed() is not fired for
    // unknown reasons. This creates inconsistency in AudioGraphTracer
    // and AudioContextSelector in DevTools.
    //
    // To resolve this inconsistency, we flush the leftover from the previous
    // frame when the current page is loaded. This call can be omitted when the
    // bug is fixed.
    SDK.SDKModel.TargetManager.instance().addModelListener(
        SDK.ResourceTreeModel.ResourceTreeModel, SDK.ResourceTreeModel.Events.FrameNavigated, this._flushContexts,
        this);
  }

  _flushContexts() {
    this.dispatchEventToListeners(Events.ModelReset);
  }

  /**
   * @override
   * @return {!Promise}
   */
  suspendModel() {
    this.dispatchEventToListeners(Events.ModelSuspend);
    return this._agent.disable();
  }

  /**
   * @override
   * @return {!Promise}
   */
  resumeModel() {
    if (!this._enabled) {
      return Promise.resolve();
    }
    return this._agent.enable();
  }

  ensureEnabled() {
    if (this._enabled) {
      return;
    }
    this._agent.enable();
    this._enabled = true;
  }

  /**
   * @param {!Protocol.WebAudio.BaseAudioContext} context
   * @override
   */
  contextCreated(context) {
    this.dispatchEventToListeners(Events.ContextCreated, context);
  }

  /**
   * @param {!Protocol.WebAudio.GraphObjectId} contextId
   * @override
   */
  contextWillBeDestroyed(contextId) {
    this.dispatchEventToListeners(Events.ContextDestroyed, contextId);
  }

  /**
   * @param {!Protocol.WebAudio.BaseAudioContext} context
   * @override
   */
  contextChanged(context) {
    this.dispatchEventToListeners(Events.ContextChanged, context);
  }

  /**
   * @param {!Protocol.WebAudio.AudioListener} listener
   * @override
   */
  audioListenerCreated(listener) {
    this.dispatchEventToListeners(Events.AudioListenerCreated, listener);
  }

  /**
   * @param {!Protocol.WebAudio.GraphObjectId} contextId
   * @param {!Protocol.WebAudio.GraphObjectId} listenerId
   * @override
   */
  audioListenerWillBeDestroyed(contextId, listenerId) {
    this.dispatchEventToListeners(Events.AudioListenerWillBeDestroyed, {contextId, listenerId});
  }

  /**
   * @param {!Protocol.WebAudio.AudioNode} node
   * @override
   */
  audioNodeCreated(node) {
    this.dispatchEventToListeners(Events.AudioNodeCreated, node);
  }

  /**
   * @param {!Protocol.WebAudio.GraphObjectId} contextId
   * @param {!Protocol.WebAudio.GraphObjectId} nodeId
   * @override
   */
  audioNodeWillBeDestroyed(contextId, nodeId) {
    this.dispatchEventToListeners(Events.AudioNodeWillBeDestroyed, {contextId, nodeId});
  }

  /**
   * @param {!Protocol.WebAudio.AudioParam} param
   * @override
   */
  audioParamCreated(param) {
    this.dispatchEventToListeners(Events.AudioParamCreated, param);
  }

  /**
   * @param {!Protocol.WebAudio.GraphObjectId} contextId
   * @param {!Protocol.WebAudio.GraphObjectId} nodeId
   * @param {!Protocol.WebAudio.GraphObjectId} paramId
   * @override
   */
  audioParamWillBeDestroyed(contextId, nodeId, paramId) {
    this.dispatchEventToListeners(Events.AudioParamWillBeDestroyed, {contextId, paramId});
  }

  /**
   * @param {!Protocol.WebAudio.GraphObjectId} contextId
   * @param {!Protocol.WebAudio.GraphObjectId} sourceId
   * @param {!Protocol.WebAudio.GraphObjectId} destinationId
   * @param {number=} sourceOutputIndex
   * @param {number=} destinationInputIndex
   * @override
   */
  nodesConnected(contextId, sourceId, destinationId, sourceOutputIndex, destinationInputIndex) {
    this.dispatchEventToListeners(
        Events.NodesConnected, {contextId, sourceId, destinationId, sourceOutputIndex, destinationInputIndex});
  }

  /**
   * @param {!Protocol.WebAudio.GraphObjectId} contextId
   * @param {!Protocol.WebAudio.GraphObjectId} sourceId
   * @param {?Protocol.WebAudio.GraphObjectId=} destinationId
   * @param {number=} sourceOutputIndex
   * @param {number=} destinationInputIndex
   * @override
   */
  nodesDisconnected(contextId, sourceId, destinationId, sourceOutputIndex, destinationInputIndex) {
    this.dispatchEventToListeners(
        Events.NodesDisconnected, {contextId, sourceId, destinationId, sourceOutputIndex, destinationInputIndex});
  }

  /**
   * @param {!Protocol.WebAudio.GraphObjectId} contextId
   * @param {!Protocol.WebAudio.GraphObjectId} sourceId
   * @param {!Protocol.WebAudio.GraphObjectId} destinationId
   * @param {number=} sourceOutputIndex
   * @override
   */
  nodeParamConnected(contextId, sourceId, destinationId, sourceOutputIndex) {
    this.dispatchEventToListeners(Events.NodeParamConnected, {
      contextId,
      sourceId,
      destinationId,
      sourceOutputIndex,
    });
  }

  /**
   * @param {!Protocol.WebAudio.GraphObjectId} contextId
   * @param {!Protocol.WebAudio.GraphObjectId} sourceId
   * @param {!Protocol.WebAudio.GraphObjectId} destinationId
   * @param {number=} sourceOutputIndex
   * @override
   */
  nodeParamDisconnected(contextId, sourceId, destinationId, sourceOutputIndex) {
    this.dispatchEventToListeners(Events.NodeParamDisconnected, {
      contextId,
      sourceId,
      destinationId,
      sourceOutputIndex,
    });
  }

  /**
   * @param {!Protocol.WebAudio.GraphObjectId} contextId
   * @return {!Promise<?Protocol.WebAudio.ContextRealtimeData>}
   */
  async requestRealtimeData(contextId) {
    return await this._agent.getRealtimeData(contextId);
  }
}

SDK.SDKModel.SDKModel.register(WebAudioModel, SDK.SDKModel.Capability.DOM, false);

/** @enum {symbol} */
export const Events = {
  ContextCreated: Symbol('ContextCreated'),
  ContextDestroyed: Symbol('ContextDestroyed'),
  ContextChanged: Symbol('ContextChanged'),
  ModelReset: Symbol('ModelReset'),
  ModelSuspend: Symbol('ModelSuspend'),
  AudioListenerCreated: Symbol('AudioListenerCreated'),
  AudioListenerWillBeDestroyed: Symbol('AudioListenerWillBeDestroyed'),
  AudioNodeCreated: Symbol('AudioNodeCreated'),
  AudioNodeWillBeDestroyed: Symbol('AudioNodeWillBeDestroyed'),
  AudioParamCreated: Symbol('AudioParamCreated'),
  AudioParamWillBeDestroyed: Symbol('AudioParamWillBeDestroyed'),
  NodesConnected: Symbol('NodesConnected'),
  NodesDisconnected: Symbol('NodesDisconnected'),
  NodeParamConnected: Symbol('NodeParamConnected'),
  NodeParamDisconnected: Symbol('NodeParamDisconnected'),
};
