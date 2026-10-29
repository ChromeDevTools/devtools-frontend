// Copyright 2019 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as i18n from '../../core/i18n/i18n.js';
import type * as Protocol from '../../generated/protocol.js';
import * as UI from '../../ui/legacy/legacy.js';

import {PlayerEventsView} from './EventDisplayTable.js';
import {PlayerEventsTimeline} from './EventTimelineView.js';
import type {PlayerData, TriggerHandler} from './MainView.js';
import type {PlayerEvent} from './MediaModel.js';
import {PlayerMessagesView} from './PlayerMessagesView.js';
import {PlayerPropertiesView} from './PlayerPropertiesView.js';

const UIStrings = {
  /**
   * @description Title of the 'Properties' tool in the sidebar of the Elements tool.
   */
  properties: 'Properties',
  /**
   * @description Button text for viewing properties.
   */
  playerProperties: 'Player properties',
  /**
   * @description Button text for viewing events.
   */
  events: 'Events',
  /**
   * @description Hover text for the Events button.
   */
  playerEvents: 'Player events',
  /**
   * @description Text in Network item view of the Network panel.
   */
  messages: 'Messages',
  /**
   * @description Column header for Messages view.
   */
  playerMessages: 'Player messages',
  /**
   * @description Title for the Timeline tab.
   */
  timeline: 'Timeline',
  /**
   * @description Hover text for Timeline tab.
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
  #processedEventsCount = 0;
  #processedMessagesCount = 0;
  #processedErrorsCount = 0;

  constructor(element?: HTMLElement) {
    super(element);

    this.eventView = new PlayerEventsView();
    this.propertyView = new PlayerPropertiesView();
    this.messageView = new PlayerMessagesView();
    this.timelineView = new PlayerEventsTimeline();

    this.appendTab(PlayerDetailViewTabs.PROPERTIES, i18nString(UIStrings.properties), this.propertyView,
                   i18nString(UIStrings.playerProperties));
    this.appendTab(PlayerDetailViewTabs.EVENTS, i18nString(UIStrings.events), this.eventView,
                   i18nString(UIStrings.playerEvents));
    this.appendTab(PlayerDetailViewTabs.MESSAGES, i18nString(UIStrings.messages), this.messageView,
                   i18nString(UIStrings.playerMessages));
    this.appendTab(PlayerDetailViewTabs.TIMELINE, i18nString(UIStrings.timeline), this.timelineView,
                   i18nString(UIStrings.playerTimeline));
  }

  set playerData(data: PlayerData) {
    for (const [name, value] of data.properties) {
      this.onProperty({name, value});
    }
    for (let i = this.#processedEventsCount; i < data.events.length; i++) {
      this.onEvent(data.events[i]);
    }
    this.#processedEventsCount = data.events.length;
    for (let i = this.#processedMessagesCount; i < data.messages.length; i++) {
      this.onMessage(data.messages[i]);
    }
    this.#processedMessagesCount = data.messages.length;
    for (let i = this.#processedErrorsCount; i < data.errors.length; i++) {
      this.onError(data.errors[i]);
    }
    this.#processedErrorsCount = data.errors.length;
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
