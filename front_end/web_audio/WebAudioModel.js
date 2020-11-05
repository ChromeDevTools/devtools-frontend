// Copyright 2019 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as SDK from '../sdk/sdk.js';

/**
 * @implements {ProtocolProxyApi.WebAudioDispatcher}
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
   * @return {!Promise<void>}
   */
  async suspendModel() {
    this.dispatchEventToListeners(Events.ModelSuspend);
    await this._agent.invoke_disable();
  }

  /**
   * @override
   * @return {!Promise<void>}
   */
  async resumeModel() {
    if (!this._enabled) {
      return Promise.resolve();
    }
    await this._agent.invoke_enable();
  }

  ensureEnabled() {
    if (this._enabled) {
      return;
    }
    this._agent.invoke_enable();
    this._enabled = true;
  }

  /**
   * @param {!Protocol.WebAudio.ContextCreatedEvent} event
   * @override
   */
  contextCreated({context}) {
    this.dispatchEventToListeners(Events.ContextCreated, context);
  }

  /**
   * @param {!Protocol.WebAudio.ContextWillBeDestroyedEvent} event
   * @override
   */
  contextWillBeDestroyed({contextId}) {
    this.dispatchEventToListeners(Events.ContextDestroyed, contextId);
  }

  /**
   * @param {!Protocol.WebAudio.ContextChangedEvent} event
   * @override
   */
  contextChanged({context}) {
    this.dispatchEventToListeners(Events.ContextChanged, context);
  }

  /**
   * @param {!Protocol.WebAudio.AudioListenerCreatedEvent} event
   * @override
   */
  audioListenerCreated({listener}) {
    this.dispatchEventToListeners(Events.AudioListenerCreated, listener);
  }

  /**
   * @param {!Protocol.WebAudio.AudioListenerWillBeDestroyedEvent} event
   * @override
   */
  audioListenerWillBeDestroyed({listenerId, contextId}) {
    this.dispatchEventToListeners(Events.AudioListenerWillBeDestroyed, {listenerId, contextId});
  }

  /**
   * @param {!Protocol.WebAudio.AudioNodeCreatedEvent} event
   * @override
   */
  audioNodeCreated({node}) {
    this.dispatchEventToListeners(Events.AudioNodeCreated, node);
  }

  /**
   * @param {!Protocol.WebAudio.AudioNodeWillBeDestroyedEvent} event
   * @override
   */
  audioNodeWillBeDestroyed({contextId, nodeId}) {
    this.dispatchEventToListeners(Events.AudioNodeWillBeDestroyed, {contextId, nodeId});
  }

  /**
   * @param {!Protocol.WebAudio.AudioParamCreatedEvent} event
   * @override
   */
  audioParamCreated({param}) {
    this.dispatchEventToListeners(Events.AudioParamCreated, param);
  }

  /**
   * @param {!Protocol.WebAudio.AudioParamWillBeDestroyedEvent} event
   * @override
   */
  audioParamWillBeDestroyed({contextId, nodeId, paramId}) {
    this.dispatchEventToListeners(Events.AudioParamWillBeDestroyed, {contextId, nodeId, paramId});
  }

  /**
   * @param {!Protocol.WebAudio.NodesConnectedEvent} event
   * @override
   */
  nodesConnected({contextId, sourceId, destinationId, sourceOutputIndex, destinationInputIndex}) {
    this.dispatchEventToListeners(
        Events.NodesConnected, {contextId, sourceId, destinationId, sourceOutputIndex, destinationInputIndex});
  }

  /**
   * @param {!Protocol.WebAudio.NodesDisconnectedEvent} event
   * @override
   */
  nodesDisconnected({contextId, sourceId, destinationId, sourceOutputIndex, destinationInputIndex}) {
    this.dispatchEventToListeners(
        Events.NodesDisconnected, {contextId, sourceId, destinationId, sourceOutputIndex, destinationInputIndex});
  }

  /**
   * @param {!Protocol.WebAudio.NodeParamConnectedEvent} event
   * @override
   */
  nodeParamConnected({contextId, sourceId, destinationId, sourceOutputIndex}) {
    this.dispatchEventToListeners(Events.NodeParamConnected, {contextId, sourceId, destinationId, sourceOutputIndex});
  }

  /**
   * @param {!Protocol.WebAudio.NodeParamDisconnectedEvent} event
   * @override
   */
  nodeParamDisconnected({contextId, sourceId, destinationId, sourceOutputIndex}) {
    this.dispatchEventToListeners(
        Events.NodeParamDisconnected, {contextId, sourceId, destinationId, sourceOutputIndex});
  }

  /**
   * @param {!Protocol.WebAudio.GraphObjectId} contextId
   * @return {!Promise<?Protocol.WebAudio.ContextRealtimeData>}
   */
  async requestRealtimeData(contextId) {
    const realtimeResponse = await this._agent.invoke_getRealtimeData({contextId});
    return realtimeResponse.realtimeData;
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
