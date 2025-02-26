// Copyright 2019 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as i18n from '../../core/i18n/i18n.js';
import type * as Protocol from '../../generated/protocol.js';
import * as UI from '../../ui/legacy/legacy.js';

import {PlayerEventsView} from './EventDisplayTable.js';
import {PlayerEventsTimeline} from './EventTimelineView.js';
import type {TriggerHandler} from './MainView.js';
import type {PlayerEvent} from './MediaModel.js';
import {PlayerMessagesView} from './PlayerMessagesView.js';
import {PlayerPropertiesView} from './PlayerPropertiesView.js';

const UIStrings = {
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
} as const;
const str_ = i18n.i18n.registerUIStrings('panels/media/PlayerDetailView.ts', UIStrings);
const i18nString = i18n.i18n.getLocalizedString.bind(undefined, str_);

export const enum PlayerDetailViewTabs {
  EVENTS = 'events',
  PROPERTIES = 'properties',
  MESSAGES = 'messages',
  TIMELINE = 'timeline',
}

export class PlayerDetailView extends UI.TabbedPane.TabbedPane implements TriggerHandler {
  private readonly eventView: PlayerEventsView;
  private readonly propertyView: PlayerPropertiesView;
  private readonly messageView: PlayerMessagesView;
  private readonly timelineView: PlayerEventsTimeline;

  constructor() {
    super();

    this.eventView = new PlayerEventsView();
    this.propertyView = new PlayerPropertiesView();
    this.messageView = new PlayerMessagesView();
    this.timelineView = new PlayerEventsTimeline();

    this.appendTab(
        PlayerDetailViewTabs.PROPERTIES, i18nString(UIStrings.properties), this.propertyView,
        i18nString(UIStrings.playerProperties));
    this.appendTab(
        PlayerDetailViewTabs.EVENTS, i18nString(UIStrings.events), this.eventView, i18nString(UIStrings.playerEvents));
    this.appendTab(
        PlayerDetailViewTabs.MESSAGES, i18nString(UIStrings.messages), this.messageView,
        i18nString(UIStrings.playerMessages));
    this.appendTab(
        PlayerDetailViewTabs.TIMELINE, i18nString(UIStrings.timeline), this.timelineView,
        i18nString(UIStrings.playerTimeline));
  }

  onProperty(property: Protocol.Media.PlayerProperty): void {
    this.propertyView.onProperty(property);
  }

  onError(error: Protocol.Media.PlayerError): void {
    this.messageView.addError(error);
  }

  onMessage(message: Protocol.Media.PlayerMessage): void {
    this.messageView.addMessage(message);
  }

  onEvent(event: PlayerEvent): void {
    this.eventView.onEvent(event);
    this.timelineView.onEvent(event);
  }
}
