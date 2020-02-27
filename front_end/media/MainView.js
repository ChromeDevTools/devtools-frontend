// Copyright 2019 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as Common from '../common/common.js';  // eslint-disable-line no-unused-vars
import * as UI from '../ui/ui.js';
import * as MediaModel from './MediaModel.js';
import * as PlayerListView from './PlayerListView.js';
import * as PlayerDetailView from './PlayerDetailView.js';

/**
 * @implements {SDK.SDKModelObserver<!Media.MediaModel>}
 */
export class MainView extends UI.Panel.PanelWithSidebar {
  constructor() {
    super('Media');
    this.registerRequiredCSS('media/mediaView.css');

    // Map<PlayerDetailView.PlayerDetailView>
    this._detailPanels = new Map();

    // Map<string>
    this._deletedPlayers = new Set();

    this._sidebar = new PlayerListView.PlayerListView(this);
    this._sidebar.show(this.panelSidebarElement());

    self.SDK.targetManager.observeModels(MediaModel.MediaModel, this);
  }

  /**
   * @param {string} playerID
   * @param {!Array.<!MediaModel.Event>} changes
   * @param {!MediaModel.MediaChangeTypeKeys} changeType
   */
  renderChanges(playerID, changes, changeType) {
    if (this._deletedPlayers.has(playerID)) {
      return;
    }

    if (!this._detailPanels.has(playerID)) {
      return;
    }

    this._sidebar.renderChanges(playerID, changes, changeType);
    this._detailPanels.get(playerID).renderChanges(playerID, changes, changeType);
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
   * @param {string} playerID
   */
  _onPlayerCreated(playerID) {
    this._sidebar.addMediaElementItem(playerID);
    this._detailPanels.set(playerID, new PlayerDetailView.PlayerDetailView());
  }

  /**
   * @override
   */
  wasShown() {
    super.wasShown();
    for (const model of self.SDK.targetManager.models(MediaModel.MediaModel)) {
      this._addEventListeners(model);
    }
  }

  /**
   * @override
   */
  willHide() {
    for (const model of self.SDK.targetManager.models(MediaModel.MediaModel)) {
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
    mediaModel.addEventListener(MediaModel.Events.PlayerPropertiesChanged, this._propertiesChanged, this);
    mediaModel.addEventListener(MediaModel.Events.PlayerEventsAdded, this._eventsAdded, this);
    mediaModel.addEventListener(MediaModel.Events.PlayersCreated, this._playersCreated, this);
  }

  /**
   * @param {!Media.MediaModel} mediaModel
   */
  _removeEventListeners(mediaModel) {
    mediaModel.removeEventListener(MediaModel.Events.PlayerPropertiesChanged, this._propertiesChanged, this);
    mediaModel.removeEventListener(MediaModel.Events.PlayerEventsAdded, this._eventsAdded, this);
    mediaModel.removeEventListener(MediaModel.Events.PlayersCreated, this._playersCreated, this);
  }

  /**
   * @param {!Common.EventTarget.EventTargetEvent} event
   */
  _propertiesChanged(event) {
    this.renderChanges(event.data.playerId, event.data.properties, MediaModel.MediaChangeTypeKeys.Property);
  }

  /**
   * @param {!Common.EventTarget.EventTargetEvent} event
   */
  _eventsAdded(event) {
    this.renderChanges(event.data.playerId, event.data.events, MediaModel.MediaChangeTypeKeys.Event);
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
}
