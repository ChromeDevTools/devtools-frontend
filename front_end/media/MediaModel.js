// Copyright 2019 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as SDK from '../sdk/sdk.js';

// We extend Protocol.Media.PlayerEvent here to allow for displayTimestamp.
/**
 * @typedef {{
 *     value: *,
 *     timestamp: (number|string|undefined),
 *     displayTimestamp: string,
 *     event: string,
 * }}
 */
// @ts-ignore typedef
export let PlayerEvent;

/** @enum {symbol} */
export const ProtocolTriggers = {
  PlayerPropertiesChanged: Symbol('PlayerPropertiesChanged'),
  PlayerEventsAdded: Symbol('PlayerEventsAdded'),
  PlayerMessagesLogged: Symbol('PlayerMessagesLogged'),
  PlayerErrorsRaised: Symbol('PlayerErrorsRaised'),
  PlayersCreated: Symbol('PlayersCreated')
};

/**
 * @implements {ProtocolProxyApi.MediaDispatcher}
 */
export class MediaModel extends SDK.SDKModel.SDKModel {
  /**
   * @param {!SDK.SDKModel.Target} target
   */
  constructor(target) {
    super(target);

    this._enabled = false;
    this._agent = target.mediaAgent();

    target.registerMediaDispatcher(this);
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
    this._agent.invoke_enable();
    this._enabled = true;
  }

  /**
   * @param {!Protocol.Media.PlayerPropertiesChangedEvent} event
   * @override
   */
  playerPropertiesChanged(event) {
    this.dispatchEventToListeners(ProtocolTriggers.PlayerPropertiesChanged, event);
  }

  /**
   * @param {!Protocol.Media.PlayerEventsAddedEvent} event
   * @override
   */
  playerEventsAdded(event) {
    this.dispatchEventToListeners(ProtocolTriggers.PlayerEventsAdded, event);
  }

  /**
   * @param {!Protocol.Media.PlayerMessagesLoggedEvent} event
   * @override
   */
  playerMessagesLogged(event) {
    this.dispatchEventToListeners(ProtocolTriggers.PlayerMessagesLogged, event);
  }

  /**
   * @param {!Protocol.Media.PlayerErrorsRaisedEvent} event
   * @override
   */
  playerErrorsRaised(event) {
    this.dispatchEventToListeners(ProtocolTriggers.PlayerErrorsRaised, event);
  }

  /**
   * @param {!Protocol.Media.PlayersCreatedEvent} event
   * @override
   */
  playersCreated({players}) {
    this.dispatchEventToListeners(ProtocolTriggers.PlayersCreated, players);
  }

  /**
   * @return {!Protocol.UsesObjectNotation}
   */
  usesObjectNotation() {
    return true;
  }
}

SDK.SDKModel.SDKModel.register(MediaModel, SDK.SDKModel.Capability.DOM, false);
