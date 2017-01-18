// Copyright 2017 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

/**
 * @unrestricted
 */
Timeline.TimelineDetailsView = class extends UI.TabbedPane {
  /**
   * @param {!TimelineModel.TimelineModel} timelineModel
   * @param {!Array<!TimelineModel.TimelineModel.Filter>} filters
   * @param {!Timeline.TimelineModeViewDelegate} delegate
   */
  constructor(timelineModel, filters, delegate) {
    super();
    this.element.classList.add('timeline-details');

    var tabIds = Timeline.TimelinePanel.DetailsTab;
    this._defaultDetailsWidget = new UI.VBox();
    this._defaultDetailsWidget.element.classList.add('timeline-details-view');
    this._defaultDetailsContentElement =
        this._defaultDetailsWidget.element.createChild('div', 'timeline-details-view-body vbox');
    this._defaultDetailsContentElement.tabIndex = 0;
    this.appendTab(tabIds.Details, Common.UIString('Summary'), this._defaultDetailsWidget);
    this.setPreferredTab(tabIds.Details);

    /** @type Map<string, Timeline.TimelineTreeView> */
    this._rangeDetailViews = new Map();

    var bottomUpView = new Timeline.BottomUpTimelineTreeView(timelineModel, filters);
    this.appendTab(tabIds.BottomUp, Common.UIString('Bottom-Up'), bottomUpView);
    this._rangeDetailViews.set(tabIds.BottomUp, bottomUpView);

    var callTreeView = new Timeline.CallTreeTimelineTreeView(timelineModel, filters);
    this.appendTab(tabIds.CallTree, Common.UIString('Call Tree'), callTreeView);
    this._rangeDetailViews.set(tabIds.CallTree, callTreeView);

    var eventsView = new Timeline.EventsTimelineTreeView(timelineModel, filters, delegate);
    this.appendTab(tabIds.Events, Common.UIString('Event Log'), eventsView);
    this._rangeDetailViews.set(tabIds.Events, eventsView);

    this.addEventListener(UI.TabbedPane.Events.TabSelected, this._tabSelected, this);
  }

  /**
   * @param {!Node} node
   */
  setContent(node) {
    var allTabs = this.otherTabs(Timeline.TimelinePanel.DetailsTab.Details);
    for (var i = 0; i < allTabs.length; ++i) {
      if (!this._rangeDetailViews.has(allTabs[i]))
        this.closeTab(allTabs[i]);
    }
    this._defaultDetailsContentElement.removeChildren();
    this._defaultDetailsContentElement.appendChild(node);
  }

  /**
   * @param {!Timeline.TimelineSelection} selection
   */
  updateContents(selection) {
    this._selection = selection;
    var view = this.selectedTabId ? this._rangeDetailViews.get(this.selectedTabId) : null;
    if (view)
      view.updateContents(selection);
  }

  /**
   * @override
   * @param {string} id
   * @param {string} tabTitle
   * @param {!UI.Widget} view
   * @param {string=} tabTooltip
   * @param {boolean=} userGesture
   * @param {boolean=} isCloseable
   */
  appendTab(id, tabTitle, view, tabTooltip, userGesture, isCloseable) {
    super.appendTab(id, tabTitle, view, tabTooltip, userGesture, isCloseable);
    if (this._preferredTabId !== this.selectedTabId)
      this.selectTab(id);
  }

  /**
   * @param {string} tabId
   */
  setPreferredTab(tabId) {
    this._preferredTabId = tabId;
  }

  /**
   * @param {!Common.Event} event
   */
  _tabSelected(event) {
    if (!event.data.isUserGesture)
      return;
    this.setPreferredTab(event.data.tabId);
    this.updateContents(this._selection);
  }
};
