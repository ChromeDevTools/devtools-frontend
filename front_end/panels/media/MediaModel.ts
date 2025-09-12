// Copyright 2019 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as SDK from '../../core/sdk/sdk.js';
import type * as ProtocolProxyApi from '../../generated/protocol-proxy-api.js';
import type * as Protocol from '../../generated/protocol.js';

export interface PlayerEvent extends Protocol.Media.PlayerEvent {
  value: string;
  displayTimestamp: string;
  event: string;
}

export const enum Events {
  PLAYER_PROPERTIES_CHANGED = 'PlayerPropertiesChanged',
  PLAYER_EVENTS_ADDED = 'PlayerEventsAdded',
  PLAYER_MESSAGES_LOGGED = 'PlayerMessagesLogged',
  PLAYER_ERRORS_RAISED = 'PlayerErrorsRaised',
  PLAYER_CREATED = 'PlayerCreated',
}

export interface EventTypes {
  [Events.PLAYER_PROPERTIES_CHANGED]: Protocol.Media.PlayerPropertiesChangedEvent;
  [Events.PLAYER_EVENTS_ADDED]: Protocol.Media.PlayerEventsAddedEvent;
  [Events.PLAYER_MESSAGES_LOGGED]: Protocol.Media.PlayerMessagesLoggedEvent;
  [Events.PLAYER_ERRORS_RAISED]: Protocol.Media.PlayerErrorsRaisedEvent;
  [Events.PLAYER_CREATED]: Protocol.Media.Player;
}

export class MediaModel extends SDK.SDKModel.SDKModel<EventTypes> implements ProtocolProxyApi.MediaDispatcher {
  private enabled: boolean;
  private readonly agent: ProtocolProxyApi.MediaApi;

  constructor(target: SDK.Target.Target) {
    super(target);

    this.enabled = false;
    this.agent = target.mediaAgent();

    target.registerMediaDispatcher(this);
  }

  override async resumeModel(): Promise<void> {
    if (!this.enabled) {
      return await Promise.resolve();
    }
    await this.agent.invoke_enable();
  }

  ensureEnabled(): void {
    void this.agent.invoke_enable();
    this.enabled = true;
  }

  playerPropertiesChanged(event: Protocol.Media.PlayerPropertiesChangedEvent): void {
    this.dispatchEventToListeners(Events.PLAYER_PROPERTIES_CHANGED, event);
  }

  playerEventsAdded(event: Protocol.Media.PlayerEventsAddedEvent): void {
    this.dispatchEventToListeners(Events.PLAYER_EVENTS_ADDED, event);
  }

  playerMessagesLogged(event: Protocol.Media.PlayerMessagesLoggedEvent): void {
    this.dispatchEventToListeners(Events.PLAYER_MESSAGES_LOGGED, event);
  }

  playerErrorsRaised(event: Protocol.Media.PlayerErrorsRaisedEvent): void {
    this.dispatchEventToListeners(Events.PLAYER_ERRORS_RAISED, event);
  }

  playerCreated({player}: Protocol.Media.PlayerCreatedEvent): void {
    this.dispatchEventToListeners(Events.PLAYER_CREATED, player);
  }
}
SDK.SDKModel.SDKModel.register(MediaModel, {capabilities: SDK.Target.Capability.MEDIA, autostart: false});
