// Copyright 2017 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

/**
 * @unrestricted
 */
Timeline.TimelineDetailsView = class extends UI.VBox {
  /**
   * @param {!Array<!TimelineModel.TimelineModelFilter>} filters
   * @param {!Timeline.TimelineModeViewDelegate} delegate
   */
  constructor(filters, delegate) {
    super();
    this.element.classList.add('timeline-details');

    this._detailsLinkifier = new Components.Linkifier();

    this._tabbedPane = new UI.TabbedPane();
    this._tabbedPane.show(this.element);

    const tabIds = Timeline.TimelineDetailsView.Tab;

    this._defaultDetailsWidget = new UI.VBox();
    this._defaultDetailsWidget.element.classList.add('timeline-details-view');
    this._defaultDetailsContentElement =
        this._defaultDetailsWidget.element.createChild('div', 'timeline-details-view-body vbox');
    this._defaultDetailsContentElement.tabIndex = 0;
    this._appendTab(tabIds.Details, Common.UIString('Summary'), this._defaultDetailsWidget);
    this.setPreferredTab(tabIds.Details);

    /** @type Map<string, Timeline.TimelineTreeView> */
    this._rangeDetailViews = new Map();

    if (!Runtime.experiments.isEnabled('timelineMultipleMainViews')) {
      const bottomUpView = new Timeline.BottomUpTimelineTreeView(filters);
      this._appendTab(tabIds.BottomUp, Common.UIString('Bottom-Up'), bottomUpView);
      this._rangeDetailViews.set(tabIds.BottomUp, bottomUpView);

      const callTreeView = new Timeline.CallTreeTimelineTreeView(filters);
      this._appendTab(tabIds.CallTree, Common.UIString('Call Tree'), callTreeView);
      this._rangeDetailViews.set(tabIds.CallTree, callTreeView);

      const eventsView = new Timeline.EventsTimelineTreeView(filters, delegate);
      this._appendTab(tabIds.EventLog, Common.UIString('Event Log'), eventsView);
      this._rangeDetailViews.set(tabIds.EventLog, eventsView);
    }

    this._tabbedPane.addEventListener(UI.TabbedPane.Events.TabSelected, this._tabSelected, this);
  }

  /**
   * @param {?Timeline.PerformanceModel} model
   */
  setModel(model) {
    this._model = model;
    this._tabbedPane.closeTabs(
        [Timeline.TimelineDetailsView.Tab.PaintProfiler, Timeline.TimelineDetailsView.Tab.LayerViewer], false);
    for (var view of this._rangeDetailViews.values())
      view.setModel(model);
    this._lazyPaintProfilerView = null;
    this._lazyLayersView = null;
  }

  /**
   * @param {!Node} node
   */
  _setContent(node) {
    const allTabs = this._tabbedPane.otherTabs(Timeline.TimelineDetailsView.Tab.Details);
    for (var i = 0; i < allTabs.length; ++i) {
      if (!this._rangeDetailViews.has(allTabs[i]))
        this._tabbedPane.closeTab(allTabs[i]);
    }
    this._defaultDetailsContentElement.removeChildren();
    this._defaultDetailsContentElement.appendChild(node);
  }

  _updateContents() {
    const view = this._rangeDetailViews.get(this._tabbedPane.selectedTabId || '');
    if (view)
      view.updateContents(this._selection);
  }

  /**
   * @param {string} id
   * @param {string} tabTitle
   * @param {!UI.Widget} view
   * @param {boolean=} isCloseable
   */
  _appendTab(id, tabTitle, view, isCloseable) {
    this._tabbedPane.appendTab(id, tabTitle, view, undefined, undefined, isCloseable);
    if (this._preferredTabId !== this._tabbedPane.selectedTabId)
      this._tabbedPane.selectTab(id);
  }

  /**
   * @return {!Element}
   */
  headerElement() {
    return this._tabbedPane.headerElement();
  }

  /**
   * @param {string} tabId
   */
  setPreferredTab(tabId) {
    this._preferredTabId = tabId;
  }

  /**
   * @param {!Timeline.TimelineSelection} selection
   */
  setSelection(selection) {
    this._detailsLinkifier.reset();
    this._selection = selection;
    switch (this._selection.type()) {
      case Timeline.TimelineSelection.Type.TraceEvent:
        var event = /** @type {!SDK.TracingModel.Event} */ (this._selection.object());
        Timeline.TimelineUIUtils.buildTraceEventDetails(
            event, this._model.timelineModel(), this._detailsLinkifier, true)
                .then(fragment => this._appendDetailsTabsForTraceEventAndShowDetails(event, fragment));
        break;
      case Timeline.TimelineSelection.Type.Frame:
        var frame = /** @type {!TimelineModel.TimelineFrame} */ (this._selection.object());
        var screenshotTime = frame.idle ?
            frame.startTime :
            frame.endTime;  // For idle frames, look at the state at the beginning of the frame.
        var filmStripFrame = this._model.filmStripModel().frameByTimestamp(screenshotTime);
        if (filmStripFrame && filmStripFrame.timestamp - frame.endTime > 10)
          filmStripFrame = null;
        this._setContent(Timeline.TimelineUIUtils.generateDetailsContentForFrame(frame, filmStripFrame));
        if (frame.layerTree) {
          var layersView = this._layersView();
          layersView.showLayerTree(frame.layerTree);
          if (!this._tabbedPane.hasTab(Timeline.TimelineDetailsView.Tab.LayerViewer))
            this._appendTab(Timeline.TimelineDetailsView.Tab.LayerViewer, Common.UIString('Layers'), layersView);
        }
        break;
      case Timeline.TimelineSelection.Type.NetworkRequest:
        var request = /** @type {!TimelineModel.TimelineModel.NetworkRequest} */ (this._selection.object());
        Timeline.TimelineUIUtils
            .buildNetworkRequestDetails(request, this._model.timelineModel(), this._detailsLinkifier)
            .then(this._setContent.bind(this));
        break;
      case Timeline.TimelineSelection.Type.Range:
        this._updateSelectedRangeStats(this._selection.startTime(), this._selection.endTime());
        break;
    }

    this._updateContents();
  }

  /**
   * @param {!Common.Event} event
   */
  _tabSelected(event) {
    if (!event.data.isUserGesture)
      return;
    this.setPreferredTab(event.data.tabId);
    this._updateContents();
  }

  /**
   * @return {!UI.Widget}
   */
  _layersView() {
    if (this._lazyLayersView)
      return this._lazyLayersView;
    this._lazyLayersView =
        new Timeline.TimelineLayersView(this._model.timelineModel(), this._showSnapshotInPaintProfiler.bind(this));
    return this._lazyLayersView;
  }

  /**
   * @return {!Timeline.TimelinePaintProfilerView}
   */
  _paintProfilerView() {
    if (this._lazyPaintProfilerView)
      return this._lazyPaintProfilerView;
    this._lazyPaintProfilerView = new Timeline.TimelinePaintProfilerView(this._model.frameModel());
    return this._lazyPaintProfilerView;
  }

  /**
   * @param {!SDK.PaintProfilerSnapshot} snapshot
   */
  _showSnapshotInPaintProfiler(snapshot) {
    var paintProfilerView = this._paintProfilerView();
    paintProfilerView.setSnapshot(snapshot);
    if (!this._tabbedPane.hasTab(Timeline.TimelineDetailsView.Tab.PaintProfiler)) {
      this._appendTab(
          Timeline.TimelineDetailsView.Tab.PaintProfiler, Common.UIString('Paint Profiler'), paintProfilerView, true);
    }
    this._tabbedPane.selectTab(Timeline.TimelineDetailsView.Tab.PaintProfiler, true);
  }

  /**
   * @param {!SDK.TracingModel.Event} event
   * @param {!Node} content
   */
  _appendDetailsTabsForTraceEventAndShowDetails(event, content) {
    this._setContent(content);
    if (event.name === TimelineModel.TimelineModel.RecordType.Paint ||
        event.name === TimelineModel.TimelineModel.RecordType.RasterTask)
      this._showEventInPaintProfiler(event);
  }

  /**
   * @param {!SDK.TracingModel.Event} event
   */
  _showEventInPaintProfiler(event) {
    const target = SDK.targetManager.mainTarget();
    if (!target)
      return;
    const paintProfilerView = this._paintProfilerView();
    const hasProfileData = paintProfilerView.setEvent(target, event);
    if (!hasProfileData)
      return;
    if (this._tabbedPane.hasTab(Timeline.TimelineDetailsView.Tab.PaintProfiler))
      return;
    this._appendTab(
        Timeline.TimelineDetailsView.Tab.PaintProfiler, Common.UIString('Paint Profiler'), paintProfilerView);
  }

  /**
   * @param {number} startTime
   * @param {number} endTime
   */
  _updateSelectedRangeStats(startTime, endTime) {
    if (this._model)
      this._setContent(Timeline.TimelineUIUtils.buildRangeStats(this._model.timelineModel(), startTime, endTime));
  }
};

/**
 * @enum {string}
 */
Timeline.TimelineDetailsView.Tab = {
  Details: 'Details',
  EventLog: 'EventLog',
  CallTree: 'CallTree',
  BottomUp: 'BottomUp',
  PaintProfiler: 'PaintProfiler',
  LayerViewer: 'LayerViewer'
};
