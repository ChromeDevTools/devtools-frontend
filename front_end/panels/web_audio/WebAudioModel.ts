// Copyright 2019 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as SDK from '../../core/sdk/sdk.js';
import type * as ProtocolProxyApi from '../../generated/protocol-proxy-api.js';
import type * as Protocol from '../../generated/protocol.js';

export class WebAudioModel extends SDK.SDKModel.SDKModel<EventTypes> implements ProtocolProxyApi.WebAudioDispatcher {
  private enabled: boolean;
  private readonly agent: ProtocolProxyApi.WebAudioApi;
  constructor(target: SDK.Target.Target) {
    super(target);

    this.enabled = false;

    this.agent = target.webAudioAgent();
    target.registerWebAudioDispatcher(this);

    // TODO(crbug.com/963510): Some OfflineAudioContexts are not uninitialized
    // properly because LifeCycleObserver::ContextDestroyed() is not fired for
    // unknown reasons. This creates inconsistency in AudioGraphTracer
    // and AudioContextSelector in DevTools.
    //
    // To resolve this inconsistency, we flush the leftover from the previous
    // frame when the current page is loaded. This call can be omitted when the
    // bug is fixed.
    SDK.TargetManager.TargetManager.instance().addModelListener(
        SDK.ResourceTreeModel.ResourceTreeModel, SDK.ResourceTreeModel.Events.FrameNavigated, this.flushContexts, this);
  }

  private flushContexts(): void {
    this.dispatchEventToListeners(Events.ModelReset);
  }

  async suspendModel(): Promise<void> {
    this.dispatchEventToListeners(Events.ModelSuspend);
    await this.agent.invoke_disable();
  }

  async resumeModel(): Promise<void> {
    if (!this.enabled) {
      return Promise.resolve();
    }
    await this.agent.invoke_enable();
  }

  ensureEnabled(): void {
    if (this.enabled) {
      return;
    }
    void this.agent.invoke_enable();
    this.enabled = true;
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

  async requestRealtimeData(contextId: Protocol.WebAudio.GraphObjectId):
      Promise<Protocol.WebAudio.ContextRealtimeData|null> {
    const realtimeResponse = await this.agent.invoke_getRealtimeData({contextId});
    return realtimeResponse.realtimeData;
  }
}

SDK.SDKModel.SDKModel.register(WebAudioModel, {capabilities: SDK.Target.Capability.DOM, autostart: false});

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

export type EventTypes = {
  [Events.ContextCreated]: Protocol.WebAudio.BaseAudioContext,
  [Events.ContextDestroyed]: Protocol.WebAudio.GraphObjectId,
  [Events.ContextChanged]: Protocol.WebAudio.BaseAudioContext,
  [Events.ModelReset]: void,
  [Events.ModelSuspend]: void,
  [Events.AudioListenerCreated]: Protocol.WebAudio.AudioListener,
  [Events.AudioListenerWillBeDestroyed]: Protocol.WebAudio.AudioListenerWillBeDestroyedEvent,
  [Events.AudioNodeCreated]: Protocol.WebAudio.AudioNode,
  [Events.AudioNodeWillBeDestroyed]: Protocol.WebAudio.AudioNodeWillBeDestroyedEvent,
  [Events.AudioParamCreated]: Protocol.WebAudio.AudioParam,
  [Events.AudioParamWillBeDestroyed]: Protocol.WebAudio.AudioParamWillBeDestroyedEvent,
  [Events.NodesConnected]: Protocol.WebAudio.NodesConnectedEvent,
  [Events.NodesDisconnected]: Protocol.WebAudio.NodesDisconnectedEvent,
  [Events.NodeParamConnected]: Protocol.WebAudio.NodeParamConnectedEvent,
  [Events.NodeParamDisconnected]: Protocol.WebAudio.NodeParamDisconnectedEvent,
};
