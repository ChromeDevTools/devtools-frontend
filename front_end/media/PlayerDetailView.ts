// Copyright 2019 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

/* eslint-disable rulesdir/no_underscored_properties */

import * as i18n from '../i18n/i18n.js';
import * as UI from '../ui/ui.js';

import {PlayerEventsView} from './EventDisplayTable.js';
import {PlayerEventsTimeline} from './EventTimelineView.js';
import {TriggerHandler} from './MainView.js';  // eslint-disable-line no-unused-vars
import {PlayerEvent} from './MediaModel.js';   // eslint-disable-line no-unused-vars
import {PlayerMessagesView} from './PlayerMessagesView.js';
import {PlayerPropertiesView} from './PlayerPropertiesView.js';

export const UIStrings = {
  /**
  *@description Title of the 'Properties' tool in the sidebar of the elements tool
  */
  properties: 'Properties',
  /**
  *@description Button text for viewing properties.
  */
  playerProperties: 'Player properties',
  /**
  *@description Button text for viewing events.
  */
  events: 'Events',
  /**
  *@description Hover text for the Events button.
  */
  playerEvents: 'Player events',
  /**
  *@description Text in Network Item View of the Network panel
  */
  messages: 'Messages',
  /**
  *@description Column header for messages view.
  */
  playerMessages: 'Player messages',
  /**
  *@description Title for the timeline tab.
  */
  timeline: 'Timeline',
  /**
  *@description Hovertext for Timeline tab.
  */
  playerTimeline: 'Player timeline',
};
const str_ = i18n.i18n.registerUIStrings('media/PlayerDetailView.ts', UIStrings);
const i18nString = i18n.i18n.getLocalizedString.bind(undefined, str_);

export const enum PlayerDetailViewTabs {
  Events = 'events',
  Properties = 'properties',
  Messages = 'messages',
  Timeline = 'timeline',
}

export class PlayerDetailView extends UI.TabbedPane.TabbedPane implements TriggerHandler {
  _eventView: PlayerEventsView;
  _propertyView: PlayerPropertiesView;
  _messageView: PlayerMessagesView;
  _timelineView: PlayerEventsTimeline;

  constructor() {
    super();

    this._eventView = new PlayerEventsView();
    this._propertyView = new PlayerPropertiesView();
    this._messageView = new PlayerMessagesView();
    this._timelineView = new PlayerEventsTimeline();

    this.appendTab(
        PlayerDetailViewTabs.Properties, i18nString(UIStrings.properties), this._propertyView,
        i18nString(UIStrings.playerProperties));
    this.appendTab(
        PlayerDetailViewTabs.Events, i18nString(UIStrings.events), this._eventView, i18nString(UIStrings.playerEvents));
    this.appendTab(
        PlayerDetailViewTabs.Messages, i18nString(UIStrings.messages), this._messageView,
        i18nString(UIStrings.playerMessages));
    this.appendTab(
        PlayerDetailViewTabs.Timeline, i18nString(UIStrings.timeline), this._timelineView,
        i18nString(UIStrings.playerTimeline));
  }

  onProperty(property: Protocol.Media.PlayerProperty): void {
    this._propertyView.onProperty(property);
  }

  onError(_error: Protocol.Media.PlayerError): void {
  }

  onMessage(message: Protocol.Media.PlayerMessage): void {
    this._messageView.addMessage(message);
  }

  onEvent(event: PlayerEvent): void {
    this._eventView.onEvent(event);
    this._timelineView.onEvent(event);
  }
}
