// Copyright 2021 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as i18n from '../../core/i18n/i18n.js';
import * as Protocol from '../../generated/protocol.js';
import type * as DataGrid from '../../ui/components/data_grid/data_grid.js';
import * as SourceFrame from '../../ui/legacy/components/source_frame/source_frame.js';
import * as UI from '../../ui/legacy/legacy.js';
import * as VisualLogging from '../../ui/visual_logging/visual_logging.js';

import * as ApplicationComponents from './components/components.js';
import interestGroupStorageViewStyles from './interestGroupStorageView.css.js';

const UIStrings = {
  /**
   *@description Placeholder text instructing the user how to display interest group
   *details.
   */
  clickToDisplayBody: 'Click on any interest group event to display the group\'s current state',
  /**
   *@description Placeholder text telling the user no details are available for
   *the selected interest group.
   */
  noDataAvailable: 'No details available for the selected interest group. The browser may have left the group.',
};
const str_ = i18n.i18n.registerUIStrings('panels/application/InterestGroupStorageView.ts', UIStrings);
const i18nString = i18n.i18n.getLocalizedString.bind(undefined, str_);

interface InterestGroupDetailsGetter {
  getInterestGroupDetails: (owner: string, name: string) => Promise<object|null>;
}

function eventEquals(
    a: Protocol.Storage.InterestGroupAccessedEvent, b: Protocol.Storage.InterestGroupAccessedEvent): boolean {
  return (a.accessTime === b.accessTime && a.type === b.type && a.ownerOrigin === b.ownerOrigin && a.name === b.name);
}

export class InterestGroupStorageView extends UI.SplitWidget.SplitWidget {
  private readonly interestGroupGrid = new ApplicationComponents.InterestGroupAccessGrid.InterestGroupAccessGrid();
  private events: Protocol.Storage.InterestGroupAccessedEvent[] = [];
  private detailsGetter: InterestGroupDetailsGetter;
  private noDataView: UI.Widget.VBox;
  private noDisplayView: UI.Widget.VBox;

  constructor(detailsGetter: InterestGroupDetailsGetter) {
    super(/* isVertical */ false, /* secondIsSidebar: */ true);
    this.element.setAttribute('jslog', `${VisualLogging.pane('interest-groups')}`);
    this.detailsGetter = detailsGetter;

    const topPanel = new UI.Widget.VBox();
    this.noDisplayView = new UI.Widget.VBox();
    this.noDataView = new UI.Widget.VBox();

    topPanel.setMinimumSize(0, 80);
    this.setMainWidget(topPanel);
    this.noDisplayView.setMinimumSize(0, 40);
    this.setSidebarWidget(this.noDisplayView);
    this.noDataView.setMinimumSize(0, 40);

    topPanel.contentElement.appendChild(this.interestGroupGrid);
    this.interestGroupGrid.addEventListener('cellfocused', this.onFocus.bind(this));

    this.noDisplayView.contentElement.classList.add('placeholder');
    this.noDisplayView.contentElement.setAttribute('jslog', `${VisualLogging.pane('details').track({resize: true})}`);
    const noDisplayDiv = this.noDisplayView.contentElement.createChild('div');
    noDisplayDiv.textContent = i18nString(UIStrings.clickToDisplayBody);

    this.noDataView.contentElement.classList.add('placeholder');
    this.noDataView.contentElement.setAttribute('jslog', `${VisualLogging.pane('details').track({resize: true})}`);
    const noDataDiv = this.noDataView.contentElement.createChild('div');
    noDataDiv.textContent = i18nString(UIStrings.noDataAvailable);
  }

  override wasShown(): void {
    super.wasShown();
    const sbw = this.sidebarWidget();
    if (sbw) {
      sbw.registerCSSFiles([interestGroupStorageViewStyles]);
    }
  }

  addEvent(event: Protocol.Storage.InterestGroupAccessedEvent): void {
    // Only add if not already present.
    const foundEvent = this.events.find(t => eventEquals(t, event));
    if (!foundEvent) {
      this.events.push(event);
      this.interestGroupGrid.data = this.events;
    }
  }

  clearEvents(): void {
    this.events = [];
    this.interestGroupGrid.data = this.events;
    this.setSidebarWidget(this.noDisplayView);
    this.sidebarUpdatedForTesting();
  }

  private async onFocus(event: Event): Promise<void> {
    const focusedEvent = event as DataGrid.DataGridEvents.BodyCellFocusedEvent;
    const row = focusedEvent.data.row;
    if (!row) {
      return;
    }

    const ownerOrigin = row.cells.find(cell => cell.columnId === 'event-group-owner')?.value as string;
    const name = row.cells.find(cell => cell.columnId === 'event-group-name')?.value as string;
    const eventType =
        row.cells.find(cell => cell.columnId === 'event-type')?.value as Protocol.Storage.InterestGroupAccessType;
    if (!ownerOrigin || !name) {
      return;
    }

    let details = null;
    // Details of additional bids can't be looked up like regular bids,
    // they are ephemeral to the auction.
    if (eventType !== Protocol.Storage.InterestGroupAccessType.AdditionalBid &&
        eventType !== Protocol.Storage.InterestGroupAccessType.AdditionalBidWin &&
        eventType !== Protocol.Storage.InterestGroupAccessType.TopLevelAdditionalBid) {
      details = await this.detailsGetter.getInterestGroupDetails(ownerOrigin, name);
    }
    if (details) {
      const jsonView = await SourceFrame.JSONView.JSONView.createView(JSON.stringify(details));
      jsonView?.setMinimumSize(0, 40);
      if (jsonView) {
        jsonView.contentElement.setAttribute('jslog', `${VisualLogging.pane('details').track({resize: true})}`);
        this.setSidebarWidget(jsonView);
      }
    } else {
      this.setSidebarWidget(this.noDataView);
    }
    this.sidebarUpdatedForTesting();
  }

  getEventsForTesting(): Array<Protocol.Storage.InterestGroupAccessedEvent> {
    return this.events;
  }

  getInterestGroupGridForTesting(): ApplicationComponents.InterestGroupAccessGrid.InterestGroupAccessGrid {
    return this.interestGroupGrid;
  }

  sidebarUpdatedForTesting(): void {
  }
}
