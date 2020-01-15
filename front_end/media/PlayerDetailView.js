// Copyright 2019 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

/**
 * @unrestricted
 */
Media.PlayerDetailView = class extends UI.TabbedPane {
  constructor() {
    super();

    const eventView = new Media.PlayerEventsView();
    const propertyView = new Media.PlayerPropertiesView();

    // maps handler type to a list of panels that support rendering changes.
    this._panels = new Map([
      [Media.MediaModel.MediaChangeTypeKeys.Property, [propertyView]],
      [Media.MediaModel.MediaChangeTypeKeys.Event, [eventView]]
    ]);

    this.appendTab(
        Media.PlayerDetailView.Tabs.Properties, Common.UIString('Properties'), propertyView,
        Common.UIString('Player properties'));

    this.appendTab(
        Media.PlayerDetailView.Tabs.Events, Common.UIString('Events'), eventView, Common.UIString('Player events'));
  }

  /**
   * @param {string} playerID
   * @param {!Array.<!Media.Event>} changes
   * @param {!Media.MediaModel.MediaChangeTypeKeys} changeType
   */
  renderChanges(playerID, changes, changeType) {
    for (const panel of this._panels.get(changeType)) {
      panel.renderChanges(playerID, changes, changeType);
    }
  }
};

/**
 * @enum {string}
 */
Media.PlayerDetailView.Tabs = {
  Events: 'events',
  Properties: 'properties',
};
