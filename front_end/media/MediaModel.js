// Copyright 2019 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

/**
 * @implements {Protocol.MediaDispatcher}
 */
Media.MediaModel = class extends SDK.SDKModel {
  /**
   * @param {!SDK.Target} target
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
        Media.MediaModel.Events.PlayerPropertiesChanged, {playerId: playerId, properties: properties});
  }

  /**
   * @param {!Protocol.Media.PlayerId} playerId
   * @param {!Array.<!Protocol.Media.PlayerEvent>} events
   * @override
   */
  playerEventsAdded(playerId, events) {
    this.dispatchEventToListeners(Media.MediaModel.Events.PlayerEventsAdded, {playerId: playerId, events: events});
  }

  /**
   * @param {!Array.<!Protocol.Media.PlayerId>} playerIds
   * @override
   */
  playersCreated(playerIds) {
    this.dispatchEventToListeners(Media.MediaModel.Events.PlayersCreated, playerIds);
  }
};

SDK.SDKModel.register(Media.MediaModel, SDK.Target.Capability.DOM, false);

/** @enum {symbol} */
Media.MediaModel.Events = {
  PlayerPropertiesChanged: Symbol('PlayerPropertiesChanged'),
  PlayerEventsAdded: Symbol('PlayerEventsAdded'),
  PlayersCreated: Symbol('PlayersCreated')
};

/** @enum {string} */
Media.MediaModel.MediaChangeTypeKeys = {
  Event: 'Events',
  Property: 'Properties'
};
