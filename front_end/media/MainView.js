// Copyright 2019 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

/**
 * @implements {SDK.SDKModelObserver<!Media.MediaModel>}
 */
Media.MainView = class extends UI.PanelWithSidebar {
  constructor() {
    super('Media');
    this.registerRequiredCSS('media/mediaView.css');

    // Map<Media.PlayerDetailView>
    this._detailPanels = new Map();

    // Map<string>
    this._deletedPlayers = new Set();

    this._sidebar = new Media.PlayerListView(this);
    this._sidebar.show(this.panelSidebarElement());

    self.SDK.targetManager.observeModels(Media.MediaModel, this);
  }

  /**
   * @param {string} playerID
   * @param {!Array.<!Media.Event>} changes
   * @param {!Media.MediaModel.MediaChangeTypeKeys} changeType
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
    this._detailPanels.set(playerID, new Media.PlayerDetailView());
  }

  /**
   * @override
   */
  wasShown() {
    super.wasShown();
    for (const model of self.SDK.targetManager.models(Media.MediaModel)) {
      this._addEventListeners(model);
    }
  }

  /**
   * @override
   */
  willHide() {
    for (const model of self.SDK.targetManager.models(Media.MediaModel)) {
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
    mediaModel.addEventListener(Media.MediaModel.Events.PlayerPropertiesChanged, this._propertiesChanged, this);
    mediaModel.addEventListener(Media.MediaModel.Events.PlayerEventsAdded, this._eventsAdded, this);
    mediaModel.addEventListener(Media.MediaModel.Events.PlayersCreated, this._playersCreated, this);
  }

  /**
   * @param {!Media.MediaModel} mediaModel
   */
  _removeEventListeners(mediaModel) {
    mediaModel.removeEventListener(Media.MediaModel.Events.PlayerPropertiesChanged, this._propertiesChanged, this);
    mediaModel.removeEventListener(Media.MediaModel.Events.PlayerEventsAdded, this._eventsAdded, this);
    mediaModel.removeEventListener(Media.MediaModel.Events.PlayersCreated, this._playersCreated, this);
  }

  /**
   * @param {!Common.Event} event
   */
  _propertiesChanged(event) {
    this.renderChanges(event.data.playerId, event.data.properties, Media.MediaModel.MediaChangeTypeKeys.Property);
  }

  /**
   * @param {!Common.Event} event
   */
  _eventsAdded(event) {
    this.renderChanges(event.data.playerId, event.data.events, Media.MediaModel.MediaChangeTypeKeys.Event);
  }

  /**
   * @param {!Common.Event} event
   */
  _playersCreated(event) {
    const playerlist = /** @type {!Iterable.<string>} */ (event.data);
    for (const playerID of playerlist) {
      this._onPlayerCreated(playerID);
    }
  }
};
