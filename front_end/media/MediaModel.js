// Copyright 2019 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

// @ts-nocheck
// TODO(crbug.com/1011811): Enable TypeScript compiler checks

import * as SDK from '../sdk/sdk.js';

// We extend Protocol.Media.PlayerEvent here to allow for displayTimestamp.
/**
 * @typedef {{
 *     value: *,
 *     timestamp: (number|string|undefined),
 *     displayTimestamp: string
 * }}
 */
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
 * @implements {Protocol.MediaDispatcher}
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
   * @return {!Promise}
   */
  resumeModel() {
    if (!this._enabled) {
      return Promise.resolve();
    }
    return this._agent.enable();
  }

  ensureEnabled() {
    this._agent.enable();
    this._enabled = true;
  }

  /**
   * @param {!Protocol.Media.PlayerId} playerId
   * @param {!Array.<!Protocol.Media.PlayerProperty>} properties
   * @override
   */
  playerPropertiesChanged(playerId, properties) {
    this.dispatchEventToListeners(
        ProtocolTriggers.PlayerPropertiesChanged, {playerId: playerId, properties: properties});
  }

  /**
   * @param {!Protocol.Media.PlayerId} playerId
   * @param {!Array.<!Protocol.Media.PlayerEvent>} events
   * @override
   */
  playerEventsAdded(playerId, events) {
    this.dispatchEventToListeners(ProtocolTriggers.PlayerEventsAdded, {playerId: playerId, events: events});
  }

  /**
   * @param {!Protocol.Media.PlayerId} playerId
   * @param {!Array.<!Protocol.Media.PlayerMessage>} messages
   * @override
   */
  playerMessagesLogged(playerId, messages) {
    this.dispatchEventToListeners(ProtocolTriggers.PlayerMessagesLogged, {playerId: playerId, messages: messages});
  }

  /**
   * @param {!Protocol.Media.PlayerId} playerId
   * @param {!Array.<!Protocol.Media.PlayerError>} errors
   * @override
   */
  playerErrorsRaised(playerId, errors) {
    this.dispatchEventToListeners(ProtocolTriggers.PlayerErrorsRaised, {playerId: playerId, errors: errors});
  }

  /**
   * @param {!Array.<!Protocol.Media.PlayerId>} playerIds
   * @override
   */
  playersCreated(playerIds) {
    this.dispatchEventToListeners(ProtocolTriggers.PlayersCreated, playerIds);
  }
}

SDK.SDKModel.SDKModel.register(MediaModel, SDK.SDKModel.Capability.DOM, false);
