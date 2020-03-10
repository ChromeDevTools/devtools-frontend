// Copyright 2019 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as Common from '../common/common.js';
import * as UI from '../ui/ui.js';

import {PlayerEventsView} from './EventDisplayTable.js';
import {Event, MediaChangeTypeKeys} from './MediaModel.js';  // eslint-disable-line no-unused-vars
import {PlayerPropertiesView} from './PlayerPropertiesView.js';

/**
 * @enum {string}
 */
export const PlayerDetailViewTabs = {
  Events: 'events',
  Properties: 'properties',
};

/**
 * @unrestricted
 */
export class PlayerDetailView extends UI.TabbedPane.TabbedPane {
  constructor() {
    super();

    const eventView = new PlayerEventsView();
    const propertyView = new PlayerPropertiesView();

    // maps handler type to a list of panels that support rendering changes.
    this._panels = new Map([[MediaChangeTypeKeys.Property, [propertyView]], [MediaChangeTypeKeys.Event, [eventView]]]);

    this.appendTab(
        PlayerDetailViewTabs.Properties, Common.UIString.UIString('Properties'), propertyView,
        Common.UIString.UIString('Player properties'));

    this.appendTab(
        PlayerDetailViewTabs.Events, Common.UIString.UIString('Events'), eventView, Common.UIString.UIString('Player events'));
  }

  /**
   * @param {string} playerID
   * @param {!Array.<!Event>} changes
   * @param {!MediaChangeTypeKeys} changeType
   */
  renderChanges(playerID, changes, changeType) {
    for (const panel of this._panels.get(changeType)) {
      panel.renderChanges(playerID, changes, changeType);
    }
  }
}
