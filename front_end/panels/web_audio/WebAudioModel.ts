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
    this.dispatchEventToListeners(Events.MODEL_RESET);
  }

  override async suspendModel(): Promise<void> {
    this.dispatchEventToListeners(Events.MODEL_SUSPEND);
    await this.agent.invoke_disable();
  }

  override async resumeModel(): Promise<void> {
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
    this.dispatchEventToListeners(Events.CONTEXT_CREATED, context);
  }

  contextWillBeDestroyed({contextId}: Protocol.WebAudio.ContextWillBeDestroyedEvent): void {
    this.dispatchEventToListeners(Events.CONTEXT_DESTROYED, contextId);
  }

  contextChanged({context}: Protocol.WebAudio.ContextChangedEvent): void {
    this.dispatchEventToListeners(Events.CONTEXT_CHANGED, context);
  }

  audioListenerCreated({listener}: Protocol.WebAudio.AudioListenerCreatedEvent): void {
    this.dispatchEventToListeners(Events.AUDIO_LISTENER_CREATED, listener);
  }

  audioListenerWillBeDestroyed({listenerId, contextId}: Protocol.WebAudio.AudioListenerWillBeDestroyedEvent): void {
    this.dispatchEventToListeners(Events.AUDIO_LISTENER_WILL_BE_DESTROYED, {listenerId, contextId});
  }

  audioNodeCreated({node}: Protocol.WebAudio.AudioNodeCreatedEvent): void {
    this.dispatchEventToListeners(Events.AUDIO_NODE_CREATED, node);
  }

  audioNodeWillBeDestroyed({contextId, nodeId}: Protocol.WebAudio.AudioNodeWillBeDestroyedEvent): void {
    this.dispatchEventToListeners(Events.AUDIO_NODE_WILL_BE_DESTROYED, {contextId, nodeId});
  }

  audioParamCreated({param}: Protocol.WebAudio.AudioParamCreatedEvent): void {
    this.dispatchEventToListeners(Events.AUDIO_PARAM_CREATED, param);
  }

  audioParamWillBeDestroyed({contextId, nodeId, paramId}: Protocol.WebAudio.AudioParamWillBeDestroyedEvent): void {
    this.dispatchEventToListeners(Events.AUDIO_PARAM_WILL_BE_DESTROYED, {contextId, nodeId, paramId});
  }

  nodesConnected({contextId, sourceId, destinationId, sourceOutputIndex, destinationInputIndex}:
                     Protocol.WebAudio.NodesConnectedEvent): void {
    this.dispatchEventToListeners(
        Events.NODES_CONNECTED, {contextId, sourceId, destinationId, sourceOutputIndex, destinationInputIndex});
  }

  nodesDisconnected({contextId, sourceId, destinationId, sourceOutputIndex, destinationInputIndex}:
                        Protocol.WebAudio.NodesDisconnectedEvent): void {
    this.dispatchEventToListeners(
        Events.NODES_DISCONNECTED, {contextId, sourceId, destinationId, sourceOutputIndex, destinationInputIndex});
  }

  nodeParamConnected({contextId, sourceId, destinationId, sourceOutputIndex}:
                         Protocol.WebAudio.NodeParamConnectedEvent): void {
    this.dispatchEventToListeners(Events.NODE_PARAM_CONNECTED, {contextId, sourceId, destinationId, sourceOutputIndex});
  }

  nodeParamDisconnected({contextId, sourceId, destinationId, sourceOutputIndex}:
                            Protocol.WebAudio.NodeParamDisconnectedEvent): void {
    this.dispatchEventToListeners(
        Events.NODE_PARAM_DISCONNECTED, {contextId, sourceId, destinationId, sourceOutputIndex});
  }

  async requestRealtimeData(contextId: Protocol.WebAudio.GraphObjectId):
      Promise<Protocol.WebAudio.ContextRealtimeData|null> {
    const realtimeResponse = await this.agent.invoke_getRealtimeData({contextId});
    return realtimeResponse.realtimeData;
  }
}

SDK.SDKModel.SDKModel.register(WebAudioModel, {capabilities: SDK.Target.Capability.DOM, autostart: false});

export const enum Events {
  CONTEXT_CREATED = 'ContextCreated',
  CONTEXT_DESTROYED = 'ContextDestroyed',
  CONTEXT_CHANGED = 'ContextChanged',
  MODEL_RESET = 'ModelReset',
  MODEL_SUSPEND = 'ModelSuspend',
  AUDIO_LISTENER_CREATED = 'AudioListenerCreated',
  AUDIO_LISTENER_WILL_BE_DESTROYED = 'AudioListenerWillBeDestroyed',
  AUDIO_NODE_CREATED = 'AudioNodeCreated',
  AUDIO_NODE_WILL_BE_DESTROYED = 'AudioNodeWillBeDestroyed',
  AUDIO_PARAM_CREATED = 'AudioParamCreated',
  AUDIO_PARAM_WILL_BE_DESTROYED = 'AudioParamWillBeDestroyed',
  NODES_CONNECTED = 'NodesConnected',
  NODES_DISCONNECTED = 'NodesDisconnected',
  NODE_PARAM_CONNECTED = 'NodeParamConnected',
  NODE_PARAM_DISCONNECTED = 'NodeParamDisconnected',
}

export type EventTypes = {
  [Events.CONTEXT_CREATED]: Protocol.WebAudio.BaseAudioContext,
  [Events.CONTEXT_DESTROYED]: Protocol.WebAudio.GraphObjectId,
  [Events.CONTEXT_CHANGED]: Protocol.WebAudio.BaseAudioContext,
  [Events.MODEL_RESET]: void,
  [Events.MODEL_SUSPEND]: void,
  [Events.AUDIO_LISTENER_CREATED]: Protocol.WebAudio.AudioListener,
  [Events.AUDIO_LISTENER_WILL_BE_DESTROYED]: Protocol.WebAudio.AudioListenerWillBeDestroyedEvent,
  [Events.AUDIO_NODE_CREATED]: Protocol.WebAudio.AudioNode,
  [Events.AUDIO_NODE_WILL_BE_DESTROYED]: Protocol.WebAudio.AudioNodeWillBeDestroyedEvent,
  [Events.AUDIO_PARAM_CREATED]: Protocol.WebAudio.AudioParam,
  [Events.AUDIO_PARAM_WILL_BE_DESTROYED]: Protocol.WebAudio.AudioParamWillBeDestroyedEvent,
  [Events.NODES_CONNECTED]: Protocol.WebAudio.NodesConnectedEvent,
  [Events.NODES_DISCONNECTED]: Protocol.WebAudio.NodesDisconnectedEvent,
  [Events.NODE_PARAM_CONNECTED]: Protocol.WebAudio.NodeParamConnectedEvent,
  [Events.NODE_PARAM_DISCONNECTED]: Protocol.WebAudio.NodeParamDisconnectedEvent,
};
