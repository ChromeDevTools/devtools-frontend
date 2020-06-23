// Copyright 2019 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as Common from '../common/common.js';
import * as UI from '../ui/ui.js';

import {PlayerEventsView} from './EventDisplayTable.js';
import {PlayerEventsTimeline} from './EventTimelineView.js';
import {TriggerHandler} from './MainView.js';  // eslint-disable-line no-unused-vars
import {PlayerEvent} from './MediaModel.js';   // eslint-disable-line no-unused-vars
import {PlayerMessagesView} from './PlayerMessagesView.js';
import {PlayerPropertiesView} from './PlayerPropertiesView.js';

/**
 * @enum {string}
 */
export const PlayerDetailViewTabs = {
  Events: 'events',
  Properties: 'properties',
  Messages: 'messages',
  Timeline: 'timeline'
};

/**
 * @unrestricted
 * @implements TriggerHandler
 */
export class PlayerDetailView extends UI.TabbedPane.TabbedPane {
  constructor() {
    super();

    this._eventView = new PlayerEventsView();
    this._propertyView = new PlayerPropertiesView();
    this._messageView = new PlayerMessagesView();
    this._timelineView = new PlayerEventsTimeline();

    this.appendTab(
        PlayerDetailViewTabs.Properties, Common.UIString.UIString('Properties'), this._propertyView,
        Common.UIString.UIString('Player properties'));

    this.appendTab(
        PlayerDetailViewTabs.Events, Common.UIString.UIString('Events'), this._eventView,
        Common.UIString.UIString('Player events'));

    this.appendTab(
        PlayerDetailViewTabs.Messages, Common.UIString.UIString('Messages'), this._messageView,
        Common.UIString.UIString('Player messages'));

    this.appendTab(
        PlayerDetailViewTabs.Timeline, Common.UIString.UIString('Timeline'), this._timelineView,
        Common.UIString.UIString('Player timeline'));
  }

  /**
   * @override
   * @param {!Protocol.Media.PlayerProperty} property
   */
  onProperty(property) {
    this._propertyView.onProperty(property);
  }

  /**
   * @override
   * @param {!Protocol.Media.PlayerError} error
   */
  onError(error) {
  }

  /**
   * @override
   * @param {!Protocol.Media.PlayerMessage} message
   */
  onMessage(message) {
    this._messageView.addMessage(message);
  }

  /**
   * @override
   * @param {!PlayerEvent} event
   */
  onEvent(event) {
    this._eventView.onEvent(event);
    this._timelineView.onEvent(event);
  }
}
