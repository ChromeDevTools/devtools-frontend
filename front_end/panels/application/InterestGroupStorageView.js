// Copyright 2021 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.
/* eslint-disable @devtools/no-imperative-dom-api */
import * as i18n from '../../core/i18n/i18n.js';
import * as SourceFrame from '../../ui/legacy/components/source_frame/source_frame.js';
import * as UI from '../../ui/legacy/legacy.js';
import * as VisualLogging from '../../ui/visual_logging/visual_logging.js';
import * as ApplicationComponents from './components/components.js';
import interestGroupStorageViewStyles from './interestGroupStorageView.css.js';
const UIStrings = {
    /**
     * @description Placeholder text shown when nothing has been selected for display
     *details.
     * An interest group is an ad targeting group stored on the browser that can
     * be used to show a certain set of advertisements in the future as the
     * outcome of a FLEDGE auction.
     */
    noValueSelected: 'No interest group selected',
    /**
     * @description Placeholder text instructing the user how to display interest group
     *details.
     * An interest group is an ad targeting group stored on the browser that can
     * be used to show a certain set of advertisements in the future as the
     * outcome of a FLEDGE auction.
     */
    clickToDisplayBody: 'Select any interest group event to display the group\'s current state',
    /**
     * @description Placeholder text telling the user no details are available for
     *the selected interest group.
     */
    noDataAvailable: 'No details available',
    /**
     * @description Placeholder text explaining to the user a potential reason for not having details on
     * the interest groups.
     * An interest group is an ad targeting group stored on the browser that can
     * be used to show a certain set of advertisements in the future as the
     * outcome of a FLEDGE auction.
     */
    noDataDescription: 'The browser may have left the group.',
};
const str_ = i18n.i18n.registerUIStrings('panels/application/InterestGroupStorageView.ts', UIStrings);
const i18nString = i18n.i18n.getLocalizedString.bind(undefined, str_);
function eventEquals(a, b) {
    return (a.accessTime === b.accessTime && a.type === b.type && a.ownerOrigin === b.ownerOrigin && a.name === b.name);
}
export class InterestGroupStorageView extends UI.SplitWidget.SplitWidget {
    interestGroupGrid = new ApplicationComponents.InterestGroupAccessGrid.InterestGroupAccessGrid();
    events = [];
    detailsGetter;
    noDataView;
    noDisplayView;
    constructor(detailsGetter) {
        super(/* isVertical */ false, /* secondIsSidebar: */ true);
        this.element.setAttribute('jslog', `${VisualLogging.pane('interest-groups')}`);
        this.detailsGetter = detailsGetter;
        const topPanel = new UI.Widget.VBox();
        this.noDisplayView =
            new UI.EmptyWidget.EmptyWidget(i18nString(UIStrings.noValueSelected), i18nString(UIStrings.clickToDisplayBody));
        this.noDataView =
            new UI.EmptyWidget.EmptyWidget(i18nString(UIStrings.noDataAvailable), i18nString(UIStrings.noDataDescription));
        topPanel.setMinimumSize(0, 120);
        this.setMainWidget(topPanel);
        this.noDisplayView.setMinimumSize(0, 80);
        this.setSidebarWidget(this.noDisplayView);
        this.noDataView.setMinimumSize(0, 80);
        this.noDisplayView.contentElement.setAttribute('jslog', `${VisualLogging.pane('details').track({ resize: true })}`);
        this.noDataView.contentElement.setAttribute('jslog', `${VisualLogging.pane('details').track({ resize: true })}`);
        this.hideSidebar();
        topPanel.contentElement.appendChild(this.interestGroupGrid);
        this.interestGroupGrid.addEventListener('select', this.onFocus.bind(this));
    }
    wasShown() {
        super.wasShown();
        const mainWidget = this.mainWidget();
        if (mainWidget) {
            mainWidget.registerRequiredCSS(interestGroupStorageViewStyles);
        }
    }
    addEvent(event) {
        if (this.showMode() !== "Both" /* UI.SplitWidget.ShowMode.BOTH */) {
            this.showBoth();
        }
        // Only add if not already present.
        const foundEvent = this.events.find(t => eventEquals(t, event));
        if (!foundEvent) {
            this.events.push(event);
            this.interestGroupGrid.data = this.events;
        }
    }
    clearEvents() {
        this.events = [];
        this.interestGroupGrid.data = this.events;
        this.setSidebarWidget(this.noDisplayView);
        this.sidebarUpdatedForTesting();
    }
    async onFocus(event) {
        const focusedEvent = event;
        const { ownerOrigin, name, type: eventType } = focusedEvent.detail;
        let details = null;
        // Details of additional bids can't be looked up like regular bids,
        // they are ephemeral to the auction.
        if (eventType !== "additionalBid" /* Protocol.Storage.InterestGroupAccessType.AdditionalBid */ &&
            eventType !== "additionalBidWin" /* Protocol.Storage.InterestGroupAccessType.AdditionalBidWin */ &&
            eventType !== "topLevelAdditionalBid" /* Protocol.Storage.InterestGroupAccessType.TopLevelAdditionalBid */) {
            details = await this.detailsGetter.getInterestGroupDetails(ownerOrigin, name);
        }
        if (details) {
            const jsonView = await SourceFrame.JSONView.JSONView.createView(JSON.stringify(details));
            jsonView?.setMinimumSize(0, 40);
            if (jsonView) {
                jsonView.contentElement.setAttribute('jslog', `${VisualLogging.pane('details').track({ resize: true })}`);
                this.setSidebarWidget(jsonView);
            }
        }
        else {
            this.setSidebarWidget(this.noDataView);
        }
        this.sidebarUpdatedForTesting();
    }
    getEventsForTesting() {
        return this.events;
    }
    getInterestGroupGridForTesting() {
        return this.interestGroupGrid;
    }
    sidebarUpdatedForTesting() {
    }
}
//# sourceMappingURL=InterestGroupStorageView.js.map