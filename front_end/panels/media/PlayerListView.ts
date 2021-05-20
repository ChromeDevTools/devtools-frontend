// Copyright 2019 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

/* eslint-disable rulesdir/no_underscored_properties */

import * as i18n from '../../core/i18n/i18n.js';
import * as UI from '../../ui/legacy/legacy.js';
import type * as Protocol from '../../generated/protocol.js';

import type {MainView, TriggerDispatcher} from './MainView.js';
import type {PlayerEvent} from './MediaModel.js';
import {PlayerPropertyKeys} from './PlayerPropertiesView.js';

const UIStrings = {
  /**
  *@description A right-click context menu entry which when clicked causes the menu entry for that player to be removed.
  */
  hidePlayer: 'Hide player',
  /**
  *@description A right-click context menu entry which should keep the element selected, while hiding all other entries.
  */
  hideAllOthers: 'Hide all others',
  /**
  *@description Context menu entry which downloads the json dump when clicked
  */
  savePlayerInfo: 'Save player info',
  /**
  *@description Side-panel entry title text for the players section.
  */
  players: 'Players',
};
const str_ = i18n.i18n.registerUIStrings('panels/media/PlayerListView.ts', UIStrings);
const i18nString = i18n.i18n.getLocalizedString.bind(undefined, str_);
export interface PlayerStatus {
  playerTitle: string;
  playerID: string;
  exists: boolean;
  playing: boolean;
  titleEdited: boolean;
}
export interface PlayerStatusMapElement {
  playerStatus: PlayerStatus;
  playerTitleElement: HTMLElement|null;
}

export class PlayerEntryTreeElement extends UI.TreeOutline.TreeElement {
  titleFromUrl: boolean;
  _playerStatus: PlayerStatus;
  _displayContainer: MainView;

  constructor(playerStatus: PlayerStatus, displayContainer: MainView, playerID: string) {
    super(playerStatus.playerTitle, false);
    this.titleFromUrl = true;
    this._playerStatus = playerStatus;
    this._displayContainer = displayContainer;
    this.setLeadingIcons([UI.Icon.Icon.create('largeicon-play-animation', 'media-player')]);
    this.listItemElement.classList.add('player-entry-tree-element');
    this.listItemElement.addEventListener('contextmenu', this._rightClickContextMenu.bind(this, playerID), false);
  }

  onselect(_selectedByUser?: boolean): boolean {
    this._displayContainer.renderMainPanel(this._playerStatus.playerID);
    return true;
  }

  _rightClickContextMenu(playerID: string, event: Event): boolean {
    const contextMenu = new UI.ContextMenu.ContextMenu(event);
    contextMenu.headerSection().appendItem(i18nString(UIStrings.hidePlayer), this._hidePlayer.bind(this, playerID));
    contextMenu.headerSection().appendItem(i18nString(UIStrings.hideAllOthers), this._hideOthers.bind(this, playerID));
    contextMenu.headerSection().appendItem(i18nString(UIStrings.savePlayerInfo), this._savePlayer.bind(this, playerID));
    contextMenu.show();
    return true;
  }

  _hidePlayer(playerID: string): void {
    this._displayContainer.markPlayerForDeletion(playerID);
  }

  _savePlayer(playerID: string): void {
    this._displayContainer.exportPlayerData(playerID);
  }

  _hideOthers(playerID: string): void {
    this._displayContainer.markOtherPlayersForDeletion(playerID);
  }
}

export class PlayerListView extends UI.Widget.VBox implements TriggerDispatcher {
  _playerStatuses: Map<string, PlayerEntryTreeElement>;
  _mainContainer: MainView;
  _sidebarTree: UI.TreeOutline.TreeOutlineInShadow;
  _playerList: UI.TreeOutline.TreeElement;

  constructor(mainContainer: MainView) {
    super(true);

    this._playerStatuses = new Map();

    // Container where new panels can be added based on clicks.
    this._mainContainer = mainContainer;

    // The parent tree for storing sections
    this._sidebarTree = new UI.TreeOutline.TreeOutlineInShadow();
    this.contentElement.appendChild(this._sidebarTree.element);
    this._sidebarTree.registerRequiredCSS('panels/media/playerListView.css', {enableLegacyPatching: false});

    // Players active in this tab.
    this._playerList = this._addListSection(i18nString(UIStrings.players));
    this._playerList.listItemElement.classList.add('player-entry-header');
  }

  deletePlayer(playerID: string): void {
    this._playerList.removeChild(this._playerStatuses.get(playerID) as UI.TreeOutline.TreeElement);
    this._playerStatuses.delete(playerID);
  }

  _addListSection(title: string): UI.TreeOutline.TreeElement {
    const treeElement = new UI.TreeOutline.TreeElement(title, true);
    treeElement.listItemElement.classList.add('storage-group-list-item');
    treeElement.setCollapsible(false);
    treeElement.selectable = false;
    this._sidebarTree.appendChild(treeElement);
    return treeElement;
  }

  addMediaElementItem(playerID: string): void {
    const playerStatus = {playerTitle: playerID, playerID: playerID, exists: true, playing: false, titleEdited: false};
    const playerElement = new PlayerEntryTreeElement(playerStatus, this._mainContainer, playerID);
    this._playerStatuses.set(playerID, playerElement);
    this._playerList.appendChild(playerElement);
  }

  setMediaElementPlayerTitle(playerID: string, newTitle: string, isTitleExtractedFromUrl: boolean): void {
    if (this._playerStatuses.has(playerID)) {
      const sidebarEntry = this._playerStatuses.get(playerID);
      if (sidebarEntry && (!isTitleExtractedFromUrl || sidebarEntry.titleFromUrl)) {
        sidebarEntry.title = newTitle;
        sidebarEntry.titleFromUrl = isTitleExtractedFromUrl;
      }
    }
  }

  setMediaElementPlayerIcon(playerID: string, iconName: string): void {
    if (this._playerStatuses.has(playerID)) {
      const sidebarEntry = this._playerStatuses.get(playerID);
      if (!sidebarEntry) {
        throw new Error('sidebarEntry is expected to not be null');
      }
      sidebarEntry.setLeadingIcons([UI.Icon.Icon.create(iconName, 'media-player')]);
    }
  }

  onProperty(playerID: string, property: Protocol.Media.PlayerProperty): void {
    // Sometimes the title will be an empty string, since this is provided
    // by the website. We don't want to swap title to an empty string.
    if (property.name === PlayerPropertyKeys.FrameTitle && property.value) {
      this.setMediaElementPlayerTitle(playerID, property.value as string, false);
    }

    // Url always has a value.
    if (property.name === PlayerPropertyKeys.FrameUrl) {
      const urlPathComponent = property.value.substring(property.value.lastIndexOf('/') + 1);
      this.setMediaElementPlayerTitle(playerID, urlPathComponent, true);
    }
  }

  onError(_playerID: string, _error: Protocol.Media.PlayerError): void {
    // TODO(tmathmeyer) show an error icon next to the player name
  }

  onMessage(_playerID: string, _message: Protocol.Media.PlayerMessage): void {
    // TODO(tmathmeyer) show a message count number next to the player name.
  }

  onEvent(playerID: string, event: PlayerEvent): void {
    const eventType = JSON.parse(event.value).event;
    if (eventType === 'kPlay') {
      this.setMediaElementPlayerIcon(playerID, 'largeicon-play-animation');
    } else if (eventType === 'kPause') {
      this.setMediaElementPlayerIcon(playerID, 'largeicon-pause-animation');
    } else if (eventType === 'kWebMediaPlayerDestroyed') {
      this.setMediaElementPlayerIcon(playerID, 'smallicon-videoplayer-destroyed');
    }
  }
}
