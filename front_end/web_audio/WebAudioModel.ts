// Copyright 2019 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

/* eslint-disable rulesdir/no_underscored_properties */
import * as SDK from '../sdk/sdk.js';

export class WebAudioModel extends SDK.SDKModel.SDKModel implements ProtocolProxyApi.WebAudioDispatcher {
  _enabled: boolean;
  _agent: ProtocolProxyApi.WebAudioApi;
  constructor(target: SDK.SDKModel.Target) {
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

  _flushContexts(): void {
    this.dispatchEventToListeners(Events.ModelReset);
  }

  async suspendModel(): Promise<void> {
    this.dispatchEventToListeners(Events.ModelSuspend);
    await this._agent.invoke_disable();
  }

  async resumeModel(): Promise<void> {
    if (!this._enabled) {
      return Promise.resolve();
    }
    await this._agent.invoke_enable();
  }

  ensureEnabled(): void {
    if (this._enabled) {
      return;
    }
    this._agent.invoke_enable();
    this._enabled = true;
  }

  contextCreated({context}: Protocol.WebAudio.ContextCreatedEvent): void {
    this.dispatchEventToListeners(Events.ContextCreated, context);
  }

  contextWillBeDestroyed({contextId}: Protocol.WebAudio.ContextWillBeDestroyedEvent): void {
    this.dispatchEventToListeners(Events.ContextDestroyed, contextId);
  }

  contextChanged({context}: Protocol.WebAudio.ContextChangedEvent): void {
    this.dispatchEventToListeners(Events.ContextChanged, context);
  }

  audioListenerCreated({listener}: Protocol.WebAudio.AudioListenerCreatedEvent): void {
    this.dispatchEventToListeners(Events.AudioListenerCreated, listener);
  }

  audioListenerWillBeDestroyed({listenerId, contextId}: Protocol.WebAudio.AudioListenerWillBeDestroyedEvent): void {
    this.dispatchEventToListeners(Events.AudioListenerWillBeDestroyed, {listenerId, contextId});
  }

  audioNodeCreated({node}: Protocol.WebAudio.AudioNodeCreatedEvent): void {
    this.dispatchEventToListeners(Events.AudioNodeCreated, node);
  }

  audioNodeWillBeDestroyed({contextId, nodeId}: Protocol.WebAudio.AudioNodeWillBeDestroyedEvent): void {
    this.dispatchEventToListeners(Events.AudioNodeWillBeDestroyed, {contextId, nodeId});
  }

  audioParamCreated({param}: Protocol.WebAudio.AudioParamCreatedEvent): void {
    this.dispatchEventToListeners(Events.AudioParamCreated, param);
  }

  audioParamWillBeDestroyed({contextId, nodeId, paramId}: Protocol.WebAudio.AudioParamWillBeDestroyedEvent): void {
    this.dispatchEventToListeners(Events.AudioParamWillBeDestroyed, {contextId, nodeId, paramId});
  }

  nodesConnected({contextId, sourceId, destinationId, sourceOutputIndex, destinationInputIndex}:
                     Protocol.WebAudio.NodesConnectedEvent): void {
    this.dispatchEventToListeners(
        Events.NodesConnected, {contextId, sourceId, destinationId, sourceOutputIndex, destinationInputIndex});
  }

  nodesDisconnected({contextId, sourceId, destinationId, sourceOutputIndex, destinationInputIndex}:
                        Protocol.WebAudio.NodesDisconnectedEvent): void {
    this.dispatchEventToListeners(
        Events.NodesDisconnected, {contextId, sourceId, destinationId, sourceOutputIndex, destinationInputIndex});
  }

  nodeParamConnected({contextId, sourceId, destinationId, sourceOutputIndex}:
                         Protocol.WebAudio.NodeParamConnectedEvent): void {
    this.dispatchEventToListeners(Events.NodeParamConnected, {contextId, sourceId, destinationId, sourceOutputIndex});
  }

  nodeParamDisconnected({contextId, sourceId, destinationId, sourceOutputIndex}:
                            Protocol.WebAudio.NodeParamDisconnectedEvent): void {
    this.dispatchEventToListeners(
        Events.NodeParamDisconnected, {contextId, sourceId, destinationId, sourceOutputIndex});
  }

  async requestRealtimeData(contextId: string): Promise<Protocol.WebAudio.ContextRealtimeData|null> {
    const realtimeResponse = await this._agent.invoke_getRealtimeData({contextId});
    return realtimeResponse.realtimeData;
  }
}

SDK.SDKModel.SDKModel.register(WebAudioModel, SDK.SDKModel.Capability.DOM, false);

export const enum Events {
  ContextCreated = 'ContextCreated',
  ContextDestroyed = 'ContextDestroyed',
  ContextChanged = 'ContextChanged',
  ModelReset = 'ModelReset',
  ModelSuspend = 'ModelSuspend',
  AudioListenerCreated = 'AudioListenerCreated',
  AudioListenerWillBeDestroyed = 'AudioListenerWillBeDestroyed',
  AudioNodeCreated = 'AudioNodeCreated',
  AudioNodeWillBeDestroyed = 'AudioNodeWillBeDestroyed',
  AudioParamCreated = 'AudioParamCreated',
  AudioParamWillBeDestroyed = 'AudioParamWillBeDestroyed',
  NodesConnected = 'NodesConnected',
  NodesDisconnected = 'NodesDisconnected',
  NodeParamConnected = 'NodeParamConnected',
  NodeParamDisconnected = 'NodeParamDisconnected',
}
