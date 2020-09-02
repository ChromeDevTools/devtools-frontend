// Copyright 2019 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

// @ts-nocheck
// TODO(crbug.com/1011811): Enable TypeScript compiler checks

import * as Common from '../common/common.js';  // eslint-disable-line no-unused-vars
import * as SDK from '../sdk/sdk.js';
import * as UI from '../ui/ui.js';

import {MediaModel, PlayerEvent, ProtocolTriggers} from './MediaModel.js';  // eslint-disable-line no-unused-vars
import {PlayerDetailView} from './PlayerDetailView.js';
import {PlayerListView} from './PlayerListView.js';

/** @interface */
export class TriggerHandler {
  /** @param {!Protocol.Media.PlayerProperty} property */
  onProperty(property) {
  }

  /** @param {!Protocol.Media.PlayerError} error */
  onError(error) {
  }

  /** @param {!Protocol.Media.PlayerMessage} message */
  onMessage(message) {
  }

  /** @param {!PlayerEvent} event */
  onEvent(event) {
  }
}

/** @interface */
export class TriggerDispatcher {
  /**
   * @param {string} playerID
   * @param {!Protocol.Media.PlayerProperty} property
   */
  onProperty(playerID, property) {
  }

  /**
   * @param {string} playerID
   * @param {!Protocol.Media.PlayerError} error
   */
  onError(playerID, error) {
  }

  /**
   * @param {string} playerID
   * @param {!Protocol.Media.PlayerMessage} message
   */
  onMessage(playerID, message) {
  }

  /**
   * @param {string} playerID
   * @param {!PlayerEvent} event
   */
  onEvent(playerID, event) {
  }
}

/**
 * @implements TriggerHandler
 */
class PlayerDataCollection {
  constructor() {
    // Map<Protocol.Media.PlayerProperty>
    this._properties = {};

    this._messages = [];
    this._events = [];
    this._errors = [];
  }

  /**
   * @override
   * @param {!Protocol.Media.PlayerProperty} property
   */
  onProperty(property) {
    this._properties[property.name] = property.value;
  }

  /**
   * @override
   * @param {!Protocol.Media.PlayerError} error */
  onError(error) {
    this._errors.push(error);
  }

  /**
   * @override
   * @param {!Protocol.Media.PlayerMessage} message
   */
  onMessage(message) {
    this._messages.push(message);
  }

  /**
   * @override
   * @param {!PlayerEvent} event
   */
  onEvent(event) {
    this._events.push(event);
  }

  export() {
    return {'properties': this._properties, 'messages': this._messages, 'events': this._events, 'errors': this._errors};
  }
}

/**
 * @implements TriggerDispatcher
 */
class PlayerDataDownloadManager {
  constructor() {
    // Map<string, PlayerDataCollection>
    this._playerDataCollection = new Map();
  }

  addPlayer(playerID) {
    this._playerDataCollection.set(playerID, new PlayerDataCollection());
  }

  /**
   * @override
   * @param {string} playerID
   * @param {!Protocol.Media.PlayerProperty} property
   */
  onProperty(playerID, property) {
    this._playerDataCollection.get(playerID).onProperty(property);
  }

  /**
   * @override
   * @param {string} playerID
   * @param {!Protocol.Media.PlayerError} error
   */
  onError(playerID, error) {
    this._playerDataCollection.get(playerID).onError(error);
  }

  /**
   * @override
   * @param {string} playerID
   * @param {!Protocol.Media.PlayerMessage} message
   */
  onMessage(playerID, message) {
    this._playerDataCollection.get(playerID).onMessage(message);
  }

  /**
   * @override
   * @param {string} playerID
   * @param {!PlayerEvent} event
   */
  onEvent(playerID, event) {
    this._playerDataCollection.get(playerID).onEvent(event);
  }

  exportPlayerData(playerID) {
    return this._playerDataCollection.get(playerID).export();
  }

  deletePlayer(playerID) {
    this._playerDataCollection.delete(playerID);
  }
}

/**
 * @implements {SDK.SDKModel.SDKModelObserver<!Media.MediaModel>}
 * @implements TriggerDispatcher
 */
export class MainView extends UI.Panel.PanelWithSidebar {
  constructor() {
    super('Media');
    this.registerRequiredCSS('media/mediaView.css');

    // Map<PlayerDetailView>
    this._detailPanels = new Map();

    // Map<string>
    this._deletedPlayers = new Set();

    this._downloadStore = new PlayerDataDownloadManager();

    this._sidebar = new PlayerListView(this);
    this._sidebar.show(this.panelSidebarElement());

    SDK.SDKModel.TargetManager.instance().observeModels(MediaModel, this);
  }

  /**
   * @param {string} playerID
   */
  renderMainPanel(playerID) {
    if (!this._detailPanels.has(playerID)) {
      return;
    }
    this.splitWidget().mainWidget().detachChildWidgets();
    this._detailPanels.get(playerID).show(this.mainElement());
  }

  /**
   * @override
   */
  wasShown() {
    super.wasShown();
    for (const model of SDK.SDKModel.TargetManager.instance().models(MediaModel)) {
      this._addEventListeners(model);
    }
  }

  /**
   * @override
   */
  willHide() {
    for (const model of SDK.SDKModel.TargetManager.instance().models(MediaModel)) {
      this._removeEventListeners(model);
    }
  }

  /**
   * @override
   * @param {!Media.MediaModel} mediaModel
   */
  modelAdded(mediaModel) {
    if (this.isShowing()) {
      this._addEventListeners(mediaModel);
    }
  }

  /**
   * @override
   * @param {!Media.MediaModel} mediaModel
   */
  modelRemoved(mediaModel) {
    this._removeEventListeners(mediaModel);
  }

  /**
   * @param {!Media.MediaModel} mediaModel
   */
  _addEventListeners(mediaModel) {
    mediaModel.ensureEnabled();
    mediaModel.addEventListener(ProtocolTriggers.PlayerPropertiesChanged, this._propertiesChanged, this);
    mediaModel.addEventListener(ProtocolTriggers.PlayerEventsAdded, this._eventsAdded, this);
    mediaModel.addEventListener(ProtocolTriggers.PlayerMessagesLogged, this._messagesLogged, this);
    mediaModel.addEventListener(ProtocolTriggers.PlayerErrorsRaised, this._errorsRaised, this);
    mediaModel.addEventListener(ProtocolTriggers.PlayersCreated, this._playersCreated, this);
  }

  /**
   * @param {!Media.MediaModel} mediaModel
   */
  _removeEventListeners(mediaModel) {
    mediaModel.removeEventListener(ProtocolTriggers.PlayerPropertiesChanged, this._propertiesChanged, this);
    mediaModel.removeEventListener(ProtocolTriggers.PlayerEventsAdded, this._eventsAdded, this);
    mediaModel.removeEventListener(ProtocolTriggers.PlayerMessagesLogged, this._messagesLogged, this);
    mediaModel.removeEventListener(ProtocolTriggers.PlayerErrorsRaised, this._errorsRaised, this);
    mediaModel.removeEventListener(ProtocolTriggers.PlayersCreated, this._playersCreated, this);
  }

  /**
   * @param {string} playerID
   */
  _onPlayerCreated(playerID) {
    this._sidebar.addMediaElementItem(playerID);
    this._detailPanels.set(playerID, new PlayerDetailView());
    this._downloadStore.addPlayer(playerID);
  }

  /**
   * @param {!Common.EventTarget.EventTargetEvent} event
   */
  _propertiesChanged(event) {
    for (const property of event.data.properties) {
      this.onProperty(event.data.playerId, property);
    }
  }

  /**
   * @param {!Common.EventTarget.EventTargetEvent} event
   */
  _eventsAdded(event) {
    for (const ev of event.data.events) {
      this.onEvent(event.data.playerId, ev);
    }
  }

  /**
   * @param {!Common.EventTarget.EventTargetEvent} event
   */
  _messagesLogged(event) {
    for (const message of event.data.messages) {
      this.onMessage(event.data.playerId, message);
    }
  }

  /**
   * @param {!Common.EventTarget.EventTargetEvent} event
   */
  _errorsRaised(event) {
    for (const error of event.data.errors) {
      this.onError(event.data.playerId, error);
    }
  }

  /**
   * @param {string} playerID
   * @return {boolean}
   */
  _shouldPropagate(playerID) {
    return !this._deletedPlayers.has(playerID) && this._detailPanels.has(playerID);
  }

  /**
   * @override
   * @param {string} playerID
   * @param {!Protocol.Media.PlayerProperty} property
   */
  onProperty(playerID, property) {
    if (!this._shouldPropagate(playerID)) {
      return;
    }
    this._sidebar.onProperty(playerID, property);
    this._downloadStore.onProperty(playerID, property);
    this._detailPanels.get(playerID).onProperty(property);
  }

  /**
   * @override
   * @param {string} playerID
   * @param {!Protocol.Media.PlayerError} error
   */
  onError(playerID, error) {
    if (!this._shouldPropagate(playerID)) {
      return;
    }
    this._sidebar.onError(playerID, error);
    this._downloadStore.onError(playerID, error);
    this._detailPanels.get(playerID).onError(error);
  }

  /**
   * @override
   * @param {string} playerID
   * @param {!Protocol.Media.PlayerMessage} message
   */
  onMessage(playerID, message) {
    if (!this._shouldPropagate(playerID)) {
      return;
    }
    this._sidebar.onMessage(playerID, message);
    this._downloadStore.onMessage(playerID, message);
    this._detailPanels.get(playerID).onMessage(message);
  }

  /**
   * @override
   * @param {string} playerID
   * @param {!PlayerEvent} event
   */
  onEvent(playerID, event) {
    if (!this._shouldPropagate(playerID)) {
      return;
    }
    this._sidebar.onEvent(playerID, event);
    this._downloadStore.onEvent(playerID, event);
    this._detailPanels.get(playerID).onEvent(event);
  }

  /**
   * @param {!Common.EventTarget.EventTargetEvent} event
   */
  _playersCreated(event) {
    const playerlist = /** @type {!Iterable.<string>} */ (event.data);
    for (const playerID of playerlist) {
      this._onPlayerCreated(playerID);
    }
  }

  /**
   * @param {string} playerID
   */
  markPlayerForDeletion(playerID) {
    // TODO(tmathmeyer): send this to chromium to save the storage space there too.
    this._deletedPlayers.add(playerID);
    this._detailPanels.delete(playerID);
    this._sidebar.deletePlayer(playerID);
    this._downloadStore.deletePlayer(playerID);
  }

  markOtherPlayersForDeletion(playerID) {
    for (const keyID of this._detailPanels.keys()) {
      if (keyID !== playerID) {
        this.markPlayerForDeletion(keyID);
      }
    }
  }

  exportPlayerData(playerID) {
    const dump = this._downloadStore.exportPlayerData(playerID);
    const uriContent = 'data:application/octet-stream,' + encodeURIComponent(JSON.stringify(dump, null, 2));
    const anchor = document.createElement('a');
    anchor.href = uriContent;
    anchor.download = playerID + '.json';
    anchor.click();
  }
}
