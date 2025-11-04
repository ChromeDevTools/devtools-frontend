// Copyright 2019 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.
import * as i18n from '../../core/i18n/i18n.js';
import * as UI from '../../ui/legacy/legacy.js';
import { PlayerEventsView } from './EventDisplayTable.js';
import { PlayerEventsTimeline } from './EventTimelineView.js';
import { PlayerMessagesView } from './PlayerMessagesView.js';
import { PlayerPropertiesView } from './PlayerPropertiesView.js';
const UIStrings = {
    /**
     * @description Title of the 'Properties' tool in the sidebar of the elements tool
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
     * @description Text in Network Item View of the Network panel
     */
    messages: 'Messages',
    /**
     * @description Column header for messages view.
     */
    playerMessages: 'Player messages',
    /**
     * @description Title for the timeline tab.
     */
    timeline: 'Timeline',
    /**
     * @description Hovertext for Timeline tab.
     */
    playerTimeline: 'Player timeline',
};
const str_ = i18n.i18n.registerUIStrings('panels/media/PlayerDetailView.ts', UIStrings);
const i18nString = i18n.i18n.getLocalizedString.bind(undefined, str_);
export class PlayerDetailView extends UI.TabbedPane.TabbedPane {
    eventView;
    propertyView;
    messageView;
    timelineView;
    constructor() {
        super();
        this.eventView = new PlayerEventsView();
        this.propertyView = new PlayerPropertiesView();
        this.messageView = new PlayerMessagesView();
        this.timelineView = new PlayerEventsTimeline();
        this.appendTab("properties" /* PlayerDetailViewTabs.PROPERTIES */, i18nString(UIStrings.properties), this.propertyView, i18nString(UIStrings.playerProperties));
        this.appendTab("events" /* PlayerDetailViewTabs.EVENTS */, i18nString(UIStrings.events), this.eventView, i18nString(UIStrings.playerEvents));
        this.appendTab("messages" /* PlayerDetailViewTabs.MESSAGES */, i18nString(UIStrings.messages), this.messageView, i18nString(UIStrings.playerMessages));
        this.appendTab("timeline" /* PlayerDetailViewTabs.TIMELINE */, i18nString(UIStrings.timeline), this.timelineView, i18nString(UIStrings.playerTimeline));
    }
    onProperty(property) {
        this.propertyView.onProperty(property);
    }
    onError(error) {
        this.messageView.addError(error);
    }
    onMessage(message) {
        this.messageView.addMessage(message);
    }
    onEvent(event) {
        this.eventView.onEvent(event);
        this.timelineView.onEvent(event);
    }
}
//# sourceMappingURL=PlayerDetailView.js.map