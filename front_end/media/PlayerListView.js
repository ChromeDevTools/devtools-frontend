// Copyright 2019 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as UI from '../ui/ui.js';

import {Event, MediaChangeTypeKeys} from './MediaModel.js';  // eslint-disable-line no-unused-vars

/**
 * @typedef {{playerTitle: string, playerID: string, exists: boolean, playing: boolean, titleEdited: boolean}}
 */
export let PlayerStatus;

/**
 * @typedef {{playerStatus: !PlayerStatus, playerTitleElement: ?HTMLElement}}
 */
export let PlayerStatusMapElement;


export class PlayerEntryTreeElement extends UI.TreeOutline.TreeElement {
  /**
   * @param {!PlayerStatus} playerStatus
   * @param {!Media.MainView} displayContainer
   */
  constructor(playerStatus, displayContainer) {
    super(playerStatus.playerTitle, false);
    this.titleFromUrl = true;
    this._playerStatus = playerStatus;
    this._displayContainer = displayContainer;
    this.setLeadingIcons([UI.Icon.Icon.create('smallicon-videoplayer-playing', 'media-player')]);
    this.listItemElement.classList.add('player-entry-tree-element');
  }

  /**
   * @override
   * @return {boolean}
   */
  onselect(selectedByUser) {
    this._displayContainer.renderMainPanel(this._playerStatus.playerID);
    return true;
  }
}


export class PlayerListView extends UI.Widget.VBox {
  /**
   * @param {!Media.MainView} mainContainer
   */
  constructor(mainContainer) {
    super(true);

    this._playerStatuses = new Map();

    // Container where new panels can be added based on clicks.
    this._mainContainer = mainContainer;

    // The parent tree for storing sections
    this._sidebarTree = new UI.TreeOutline.TreeOutlineInShadow();
    this.contentElement.appendChild(this._sidebarTree.element);
    this._sidebarTree.registerRequiredCSS('media/playerListView.css');

    // Audio capture / output devices.
    this._audioDevices = this._addListSection(Common.UIString('Audio I/O'));

    // Video capture devices.
    this._videoDevices = this._addListSection(Common.UIString('Video Capture Devices'));

    // Players active in this tab.
    this._playerList = this._addListSection(Common.UIString('Players'));
    this._playerList.listItemElement.classList.add('player-entry-header');
  }

  /**
   * @param {string} title
   * @return {!UI.TreeOutline.TreeElement}
   */
  _addListSection(title) {
    const treeElement = new UI.TreeOutline.TreeElement(title, true);
    treeElement.listItemElement.classList.add('storage-group-list-item');
    treeElement.setCollapsible(false);
    treeElement.selectable = false;
    this._sidebarTree.appendChild(treeElement);
    return treeElement;
  }

  /**
   * @param {string} playerID
   */
  addMediaElementItem(playerID) {
    const playerStatus = {playerTitle: playerID, playerID: playerID, exists: true, playing: false, titleEdited: false};
    const playerElement = new PlayerEntryTreeElement(playerStatus, this._mainContainer);
    this._playerStatuses.set(playerID, playerElement);
    this._playerList.appendChild(playerElement);
  }

  /**
   * @param {string} playerID
   * @param {string} newTitle
   * @param {boolean} isTitleExtractedFromUrl
   */
  setMediaElementPlayerTitle(playerID, newTitle, isTitleExtractedFromUrl) {
    if (this._playerStatuses.has(playerID)) {
      const sidebarEntry = this._playerStatuses.get(playerID);
      if (!isTitleExtractedFromUrl || sidebarEntry.titleFromUrl) {
        sidebarEntry.title = newTitle;
        sidebarEntry.titleFromUrl = isTitleExtractedFromUrl;
      }
    }
  }

  /**
   * @param {string} playerID
   * @param {string} iconName
   */
  setMediaElementPlayerIcon(playerID, iconName) {
    if (this._playerStatuses.has(playerID)) {
      const sidebarEntry = this._playerStatuses.get(playerID);
      sidebarEntry.setLeadingIcons([UI.Icon.Icon.create('smallicon-videoplayer-' + iconName, 'media-player')]);
    }
  }

  /**
   * @param {string} playerID
   * @param {!Array.<!Event>} changes
   * @param {string} changeType
   */
  renderChanges(playerID, changes, changeType) {
    // We only want to try setting the title from the 'frame_title' and 'frame_url' properties.
    if (changeType === MediaChangeTypeKeys.Property) {
      for (const change of changes) {
        // Sometimes frame_title can be an empty string.
        if (change.name === 'frame_title' && change.value) {
          this.setMediaElementPlayerTitle(playerID, /** @type {string} */ (change.value), false);
        }

        if (change.name === 'frame_url') {
          const url_path_component = change.value.substring(change.value.lastIndexOf('/') + 1);
          this.setMediaElementPlayerTitle(playerID, url_path_component, true);
        }
      }
    }

    if (changeType === MediaChangeTypeKeys.Event) {
      let change_to = null;
      for (const change of changes) {
        if (change.name === 'Event') {
          if (change.value === 'PLAY') {
            change_to = 'playing';
          } else if (change.value === 'PAUSE') {
            change_to = 'paused';
          } else if (change.value === 'WEBMEDIAPLAYER_DESTROYED') {
            change_to = 'destroyed';
          }
        }
      }
      if (change_to) {
        this.setMediaElementPlayerIcon(playerID, change_to);
      }
    }
  }
}
