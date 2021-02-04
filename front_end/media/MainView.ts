// Copyright 2019 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

/* eslint-disable rulesdir/no_underscored_properties */

import * as Common from '../common/common.js';  // eslint-disable-line no-unused-vars
import * as SDK from '../sdk/sdk.js';
import * as UI from '../ui/ui.js';

import {MediaModel, PlayerEvent, ProtocolTriggers} from './MediaModel.js';  // eslint-disable-line no-unused-vars
import {PlayerDetailView} from './PlayerDetailView.js';
import {PlayerListView} from './PlayerListView.js';

export interface TriggerHandler {
  onProperty(property: Protocol.Media.PlayerProperty): void;
  onError(error: Protocol.Media.PlayerError): void;
  onMessage(message: Protocol.Media.PlayerMessage): void;
  onEvent(event: PlayerEvent): void;
}

export interface TriggerDispatcher {
  onProperty(playerID: string, property: Protocol.Media.PlayerProperty): void;
  onError(playerID: string, error: Protocol.Media.PlayerError): void;
  onMessage(playerID: string, message: Protocol.Media.PlayerMessage): void;
  onEvent(playerID: string, event: PlayerEvent): void;
}

class PlayerDataCollection implements TriggerHandler {
  _properties: Map<string, string>;
  _messages: Protocol.Media.PlayerMessage[];
  _events: PlayerEvent[];
  _errors: Protocol.Media.PlayerError[];

  constructor() {
    this._properties = new Map();
    this._messages = [];
    this._events = [];
    this._errors = [];
  }

  onProperty(property: Protocol.Media.PlayerProperty): void {
    this._properties.set(property.name, property.value);
  }

  onError(error: Protocol.Media.PlayerError): void {
    this._errors.push(error);
  }

  onMessage(message: Protocol.Media.PlayerMessage): void {
    this._messages.push(message);
  }

  onEvent(event: PlayerEvent): void {
    this._events.push(event);
  }

  export(): {
    properties: Map<string, string>,
    messages: Protocol.Media.PlayerMessage[],
    events: PlayerEvent[],
    errors: Protocol.Media.PlayerError[],
  } {
    return {'properties': this._properties, 'messages': this._messages, 'events': this._events, 'errors': this._errors};
  }
}

class PlayerDataDownloadManager implements TriggerDispatcher {
  _playerDataCollection: Map<string, PlayerDataCollection>;
  constructor() {
    this._playerDataCollection = new Map();
  }

  addPlayer(playerID: string): void {
    this._playerDataCollection.set(playerID, new PlayerDataCollection());
  }

  onProperty(playerID: string, property: Protocol.Media.PlayerProperty): void {
    const playerProperty = this._playerDataCollection.get(playerID);
    if (!playerProperty) {
      return;
    }

    playerProperty.onProperty(property);
  }

  onError(playerID: string, error: Protocol.Media.PlayerError): void {
    const playerProperty = this._playerDataCollection.get(playerID);
    if (!playerProperty) {
      return;
    }

    playerProperty.onError(error);
  }

  onMessage(playerID: string, message: Protocol.Media.PlayerMessage): void {
    const playerProperty = this._playerDataCollection.get(playerID);
    if (!playerProperty) {
      return;
    }

    playerProperty.onMessage(message);
  }

  onEvent(playerID: string, event: PlayerEvent): void {
    const playerProperty = this._playerDataCollection.get(playerID);
    if (!playerProperty) {
      return;
    }

    playerProperty.onEvent(event);
  }

  exportPlayerData(playerID: string): {
    properties: Map<string, string>,
    messages: Protocol.Media.PlayerMessage[],
    events: PlayerEvent[],
    errors: Protocol.Media.PlayerError[],
  } {
    const playerProperty = this._playerDataCollection.get(playerID);
    if (!playerProperty) {
      throw new Error('Unable to find player');
    }

    return playerProperty.export();
  }

  deletePlayer(playerID: string): void {
    this._playerDataCollection.delete(playerID);
  }
}

let mainViewInstance: MainView;
export class MainView extends UI.Panel.PanelWithSidebar implements SDK.SDKModel.SDKModelObserver<MediaModel> {
  _detailPanels: Map<string, PlayerDetailView>;
  _deletedPlayers: Set<string>;
  _downloadStore: PlayerDataDownloadManager;
  _sidebar: PlayerListView;

  constructor() {
    super('Media');
    this.registerRequiredCSS('media/mediaView.css', {enableLegacyPatching: true});

    this._detailPanels = new Map();

    this._deletedPlayers = new Set();

    this._downloadStore = new PlayerDataDownloadManager();

    this._sidebar = new PlayerListView(this);
    this._sidebar.show(this.panelSidebarElement());

    SDK.SDKModel.TargetManager.instance().observeModels(MediaModel, this);
  }

  static instance(opts = {forceNew: null}): MainView {
    const {forceNew} = opts;
    if (!mainViewInstance || forceNew) {
      mainViewInstance = new MainView();
    }

    return mainViewInstance;
  }

  renderMainPanel(playerID: string): void {
    if (!this._detailPanels.has(playerID)) {
      return;
    }
    const mainWidget = this.splitWidget().mainWidget();
    if (mainWidget) {
      mainWidget.detachChildWidgets();
    }
    this._detailPanels.get(playerID)?.show(this.mainElement());
  }

  wasShown(): void {
    super.wasShown();
    for (const model of SDK.SDKModel.TargetManager.instance().models(MediaModel)) {
      this._addEventListeners(model);
    }
  }

  willHide(): void {
    for (const model of SDK.SDKModel.TargetManager.instance().models(MediaModel)) {
      this._removeEventListeners(model);
    }
  }

  modelAdded(model: MediaModel): void {
    if (this.isShowing()) {
      this._addEventListeners(model);
    }
  }

  modelRemoved(model: MediaModel): void {
    this._removeEventListeners(model);
  }

  _addEventListeners(mediaModel: MediaModel): void {
    mediaModel.ensureEnabled();
    mediaModel.addEventListener(ProtocolTriggers.PlayerPropertiesChanged, this._propertiesChanged, this);
    mediaModel.addEventListener(ProtocolTriggers.PlayerEventsAdded, this._eventsAdded, this);
    mediaModel.addEventListener(ProtocolTriggers.PlayerMessagesLogged, this._messagesLogged, this);
    mediaModel.addEventListener(ProtocolTriggers.PlayerErrorsRaised, this._errorsRaised, this);
    mediaModel.addEventListener(ProtocolTriggers.PlayersCreated, this._playersCreated, this);
  }

  _removeEventListeners(mediaModel: MediaModel): void {
    mediaModel.removeEventListener(ProtocolTriggers.PlayerPropertiesChanged, this._propertiesChanged, this);
    mediaModel.removeEventListener(ProtocolTriggers.PlayerEventsAdded, this._eventsAdded, this);
    mediaModel.removeEventListener(ProtocolTriggers.PlayerMessagesLogged, this._messagesLogged, this);
    mediaModel.removeEventListener(ProtocolTriggers.PlayerErrorsRaised, this._errorsRaised, this);
    mediaModel.removeEventListener(ProtocolTriggers.PlayersCreated, this._playersCreated, this);
  }

  _onPlayerCreated(playerID: string): void {
    this._sidebar.addMediaElementItem(playerID);
    this._detailPanels.set(playerID, new PlayerDetailView());
    this._downloadStore.addPlayer(playerID);
  }

  _propertiesChanged(event: Common.EventTarget.EventTargetEvent): void {
    for (const property of event.data.properties) {
      this.onProperty(event.data.playerId, property);
    }
  }

  _eventsAdded(event: Common.EventTarget.EventTargetEvent): void {
    for (const ev of event.data.events) {
      this.onEvent(event.data.playerId, ev);
    }
  }

  _messagesLogged(event: Common.EventTarget.EventTargetEvent): void {
    for (const message of event.data.messages) {
      this.onMessage(event.data.playerId, message);
    }
  }

  _errorsRaised(event: Common.EventTarget.EventTargetEvent): void {
    for (const error of event.data.errors) {
      this.onError(event.data.playerId, error);
    }
  }

  _shouldPropagate(playerID: string): boolean {
    return !this._deletedPlayers.has(playerID) && this._detailPanels.has(playerID);
  }

  onProperty(playerID: string, property: Protocol.Media.PlayerProperty): void {
    if (!this._shouldPropagate(playerID)) {
      return;
    }
    this._sidebar.onProperty(playerID, property);
    this._downloadStore.onProperty(playerID, property);
    this._detailPanels.get(playerID)?.onProperty(property);
  }

  onError(playerID: string, error: Protocol.Media.PlayerError): void {
    if (!this._shouldPropagate(playerID)) {
      return;
    }
    this._sidebar.onError(playerID, error);
    this._downloadStore.onError(playerID, error);
    this._detailPanels.get(playerID)?.onError(error);
  }

  onMessage(playerID: string, message: Protocol.Media.PlayerMessage): void {
    if (!this._shouldPropagate(playerID)) {
      return;
    }
    this._sidebar.onMessage(playerID, message);
    this._downloadStore.onMessage(playerID, message);
    this._detailPanels.get(playerID)?.onMessage(message);
  }

  onEvent(playerID: string, event: PlayerEvent): void {
    if (!this._shouldPropagate(playerID)) {
      return;
    }
    this._sidebar.onEvent(playerID, event);
    this._downloadStore.onEvent(playerID, event);
    this._detailPanels.get(playerID)?.onEvent(event);
  }

  _playersCreated(event: Common.EventTarget.EventTargetEvent): void {
    const playerlist = event.data as Iterable<string>;
    for (const playerID of playerlist) {
      this._onPlayerCreated(playerID);
    }
  }

  markPlayerForDeletion(playerID: string): void {
    // TODO(tmathmeyer): send this to chromium to save the storage space there too.
    this._deletedPlayers.add(playerID);
    this._detailPanels.delete(playerID);
    this._sidebar.deletePlayer(playerID);
    this._downloadStore.deletePlayer(playerID);
  }

  markOtherPlayersForDeletion(playerID: string): void {
    for (const keyID of this._detailPanels.keys()) {
      if (keyID !== playerID) {
        this.markPlayerForDeletion(keyID);
      }
    }
  }

  exportPlayerData(playerID: string): void {
    const dump = this._downloadStore.exportPlayerData(playerID);
    const uriContent = 'data:application/octet-stream,' + encodeURIComponent(JSON.stringify(dump, null, 2));
    const anchor = document.createElement('a');
    anchor.href = uriContent;
    anchor.download = playerID + '.json';
    anchor.click();
  }
}
