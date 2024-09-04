// Copyright 2019 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import type * as Common from '../../core/common/common.js';
import * as SDK from '../../core/sdk/sdk.js';
import type * as Protocol from '../../generated/protocol.js';
import * as UI from '../../ui/legacy/legacy.js';

import {Events, MediaModel, type PlayerEvent} from './MediaModel.js';
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
  private readonly properties: Map<string, string>;
  private readonly messages: Protocol.Media.PlayerMessage[];
  private readonly events: PlayerEvent[];
  private readonly errors: Protocol.Media.PlayerError[];

  constructor() {
    this.properties = new Map();
    this.messages = [];
    this.events = [];
    this.errors = [];
  }

  onProperty(property: Protocol.Media.PlayerProperty): void {
    this.properties.set(property.name, property.value);
  }

  onError(error: Protocol.Media.PlayerError): void {
    this.errors.push(error);
  }

  onMessage(message: Protocol.Media.PlayerMessage): void {
    this.messages.push(message);
  }

  onEvent(event: PlayerEvent): void {
    this.events.push(event);
  }

  export(): {
    properties: Map<string, string>,
    messages: Protocol.Media.PlayerMessage[],
    events: PlayerEvent[],
    errors: Protocol.Media.PlayerError[],
  } {
    return {properties: this.properties, messages: this.messages, events: this.events, errors: this.errors};
  }
}

export class PlayerDataDownloadManager implements TriggerDispatcher {
  private readonly playerDataCollection: Map<string, PlayerDataCollection>;
  constructor() {
    this.playerDataCollection = new Map();
  }

  addPlayer(playerID: string): void {
    this.playerDataCollection.set(playerID, new PlayerDataCollection());
  }

  onProperty(playerID: string, property: Protocol.Media.PlayerProperty): void {
    const playerProperty = this.playerDataCollection.get(playerID);
    if (!playerProperty) {
      return;
    }

    playerProperty.onProperty(property);
  }

  onError(playerID: string, error: Protocol.Media.PlayerError): void {
    const playerProperty = this.playerDataCollection.get(playerID);
    if (!playerProperty) {
      return;
    }

    playerProperty.onError(error);
  }

  onMessage(playerID: string, message: Protocol.Media.PlayerMessage): void {
    const playerProperty = this.playerDataCollection.get(playerID);
    if (!playerProperty) {
      return;
    }

    playerProperty.onMessage(message);
  }

  onEvent(playerID: string, event: PlayerEvent): void {
    const playerProperty = this.playerDataCollection.get(playerID);
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
    const playerProperty = this.playerDataCollection.get(playerID);
    if (!playerProperty) {
      throw new Error('Unable to find player');
    }

    return playerProperty.export();
  }

  deletePlayer(playerID: string): void {
    this.playerDataCollection.delete(playerID);
  }
}

export class MainView extends UI.Panel.PanelWithSidebar implements SDK.TargetManager.SDKModelObserver<MediaModel> {
  private detailPanels: Map<string, PlayerDetailView>;
  private deletedPlayers: Set<string>;
  private readonly downloadStore: PlayerDataDownloadManager;
  private readonly sidebar: PlayerListView;

  constructor(downloadStore: PlayerDataDownloadManager = new PlayerDataDownloadManager()) {
    super('media');
    this.detailPanels = new Map();

    this.deletedPlayers = new Set();

    this.downloadStore = downloadStore;

    this.sidebar = new PlayerListView(this);
    this.sidebar.show(this.panelSidebarElement());

    SDK.TargetManager.TargetManager.instance().observeModels(MediaModel, this, {scoped: true});
  }

  renderMainPanel(playerID: string): void {
    if (!this.detailPanels.has(playerID)) {
      return;
    }
    const mainWidget = this.splitWidget().mainWidget();
    if (mainWidget) {
      mainWidget.detachChildWidgets();
    }
    this.detailPanels.get(playerID)?.show(this.mainElement());
  }

  override wasShown(): void {
    super.wasShown();
    for (const model of SDK.TargetManager.TargetManager.instance().models(MediaModel, {scoped: true})) {
      this.addEventListeners(model);
    }
  }

  override willHide(): void {
    for (const model of SDK.TargetManager.TargetManager.instance().models(MediaModel, {scoped: true})) {
      this.removeEventListeners(model);
    }
  }

  modelAdded(model: MediaModel): void {
    if (this.isShowing()) {
      this.addEventListeners(model);
    }
  }

  modelRemoved(model: MediaModel): void {
    this.removeEventListeners(model);
  }

  private addEventListeners(mediaModel: MediaModel): void {
    mediaModel.ensureEnabled();
    mediaModel.addEventListener(Events.PLAYER_PROPERTIES_CHANGED, this.propertiesChanged, this);
    mediaModel.addEventListener(Events.PLAYER_EVENTS_ADDED, this.eventsAdded, this);
    mediaModel.addEventListener(Events.PLAYER_MESSAGES_LOGGED, this.messagesLogged, this);
    mediaModel.addEventListener(Events.PLAYER_ERRORS_RAISED, this.errorsRaised, this);
    mediaModel.addEventListener(Events.PLAYERS_CREATED, this.playersCreated, this);
  }

  private removeEventListeners(mediaModel: MediaModel): void {
    mediaModel.removeEventListener(Events.PLAYER_PROPERTIES_CHANGED, this.propertiesChanged, this);
    mediaModel.removeEventListener(Events.PLAYER_EVENTS_ADDED, this.eventsAdded, this);
    mediaModel.removeEventListener(Events.PLAYER_MESSAGES_LOGGED, this.messagesLogged, this);
    mediaModel.removeEventListener(Events.PLAYER_ERRORS_RAISED, this.errorsRaised, this);
    mediaModel.removeEventListener(Events.PLAYERS_CREATED, this.playersCreated, this);
  }

  private onPlayerCreated(playerID: string): void {
    this.sidebar.addMediaElementItem(playerID);
    this.detailPanels.set(playerID, new PlayerDetailView());
    this.downloadStore.addPlayer(playerID);
  }

  private propertiesChanged(event: Common.EventTarget.EventTargetEvent<Protocol.Media.PlayerPropertiesChangedEvent>):
      void {
    for (const property of event.data.properties) {
      this.onProperty(event.data.playerId, property);
    }
  }

  private eventsAdded(event: Common.EventTarget.EventTargetEvent<Protocol.Media.PlayerEventsAddedEvent>): void {
    for (const ev of event.data.events) {
      // TODO(crbug.com/1228674): The conversion from Protocol.Media.PlayerEvent to PlayerEvent happens implicitly
      // by augmenting the protocol type with some additional property in various places. This needs to be cleaned up
      // in a conversion function that takes the protocol type and produces the PlayerEvent type.
      this.onEvent(event.data.playerId, ev as PlayerEvent);
    }
  }

  private messagesLogged(event: Common.EventTarget.EventTargetEvent<Protocol.Media.PlayerMessagesLoggedEvent>): void {
    for (const message of event.data.messages) {
      this.onMessage(event.data.playerId, message);
    }
  }

  private errorsRaised(event: Common.EventTarget.EventTargetEvent<Protocol.Media.PlayerErrorsRaisedEvent>): void {
    for (const error of event.data.errors) {
      this.onError(event.data.playerId, error);
    }
  }

  private shouldPropagate(playerID: string): boolean {
    return !this.deletedPlayers.has(playerID) && this.detailPanels.has(playerID);
  }

  onProperty(playerID: string, property: Protocol.Media.PlayerProperty): void {
    if (!this.shouldPropagate(playerID)) {
      return;
    }
    this.sidebar.onProperty(playerID, property);
    this.downloadStore.onProperty(playerID, property);
    this.detailPanels.get(playerID)?.onProperty(property);
  }

  onError(playerID: string, error: Protocol.Media.PlayerError): void {
    if (!this.shouldPropagate(playerID)) {
      return;
    }
    this.sidebar.onError(playerID, error);
    this.downloadStore.onError(playerID, error);
    this.detailPanels.get(playerID)?.onError(error);
  }

  onMessage(playerID: string, message: Protocol.Media.PlayerMessage): void {
    if (!this.shouldPropagate(playerID)) {
      return;
    }
    this.sidebar.onMessage(playerID, message);
    this.downloadStore.onMessage(playerID, message);
    this.detailPanels.get(playerID)?.onMessage(message);
  }

  onEvent(playerID: string, event: PlayerEvent): void {
    if (!this.shouldPropagate(playerID)) {
      return;
    }
    this.sidebar.onEvent(playerID, event);
    this.downloadStore.onEvent(playerID, event);
    this.detailPanels.get(playerID)?.onEvent(event);
  }

  private playersCreated(event: Common.EventTarget.EventTargetEvent<Protocol.Media.PlayerId[]>): void {
    for (const playerID of event.data) {
      this.onPlayerCreated(playerID);
    }
  }

  markPlayerForDeletion(playerID: string): void {
    // TODO(tmathmeyer): send this to chromium to save the storage space there too.
    this.deletedPlayers.add(playerID);
    this.detailPanels.delete(playerID);
    this.sidebar.deletePlayer(playerID);
    this.downloadStore.deletePlayer(playerID);
  }

  markOtherPlayersForDeletion(playerID: string): void {
    for (const keyID of this.detailPanels.keys()) {
      if (keyID !== playerID) {
        this.markPlayerForDeletion(keyID);
      }
    }
  }

  exportPlayerData(playerID: string): void {
    const dump = this.downloadStore.exportPlayerData(playerID);
    const uriContent = 'data:application/octet-stream,' + encodeURIComponent(JSON.stringify(dump, null, 2));
    const anchor = document.createElement('a');
    anchor.href = uriContent;
    anchor.download = playerID + '.json';
    anchor.click();
  }
}
