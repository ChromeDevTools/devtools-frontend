// Copyright 2019 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

/* eslint-disable rulesdir/no_underscored_properties */

import * as SDK from '../sdk/sdk.js';
export interface PlayerEvent extends Protocol.Media.PlayerEvent {
  value: string;
  displayTimestamp: string;
  event: string;
}

export const enum ProtocolTriggers {
  PlayerPropertiesChanged = 'PlayerPropertiesChanged',
  PlayerEventsAdded = 'PlayerEventsAdded',
  PlayerMessagesLogged = 'PlayerMessagesLogged',
  PlayerErrorsRaised = 'PlayerErrorsRaised',
  PlayersCreated = 'PlayersCreated',
}

export class MediaModel extends SDK.SDKModel.SDKModel implements ProtocolProxyApi.MediaDispatcher {
  _enabled: boolean;
  _agent: ProtocolProxyApi.MediaApi;

  constructor(target: SDK.SDKModel.Target) {
    super(target);

    this._enabled = false;
    this._agent = target.mediaAgent();

    target.registerMediaDispatcher(this);
  }

  async resumeModel(): Promise<void> {
    if (!this._enabled) {
      return Promise.resolve();
    }
    await this._agent.invoke_enable();
  }

  ensureEnabled(): void {
    this._agent.invoke_enable();
    this._enabled = true;
  }

  playerPropertiesChanged(event: Protocol.Media.PlayerPropertiesChangedEvent): void {
    this.dispatchEventToListeners(ProtocolTriggers.PlayerPropertiesChanged, event);
  }

  playerEventsAdded(event: Protocol.Media.PlayerEventsAddedEvent): void {
    this.dispatchEventToListeners(ProtocolTriggers.PlayerEventsAdded, event);
  }

  playerMessagesLogged(event: Protocol.Media.PlayerMessagesLoggedEvent): void {
    this.dispatchEventToListeners(ProtocolTriggers.PlayerMessagesLogged, event);
  }

  playerErrorsRaised(event: Protocol.Media.PlayerErrorsRaisedEvent): void {
    this.dispatchEventToListeners(ProtocolTriggers.PlayerErrorsRaised, event);
  }

  playersCreated({players}: Protocol.Media.PlayersCreatedEvent): void {
    this.dispatchEventToListeners(ProtocolTriggers.PlayersCreated, players);
  }
}

SDK.SDKModel.SDKModel.register(MediaModel, SDK.SDKModel.Capability.DOM, false);
