// Copyright 2017 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as Common from '../common/common.js';
import * as Components from '../components/components.js';
import * as SDK from '../sdk/sdk.js';
import * as TimelineModel from '../timeline_model/timeline_model.js';
import * as UI from '../ui/ui.js';

import {EventsTimelineTreeView} from './EventsTimelineTreeView.js';
import {Events, PerformanceModel} from './PerformanceModel.js';  // eslint-disable-line no-unused-vars
import {TimelineLayersView} from './TimelineLayersView.js';
import {TimelinePaintProfilerView} from './TimelinePaintProfilerView.js';
import {TimelineModeViewDelegate, TimelineSelection} from './TimelinePanel.js';  // eslint-disable-line no-unused-vars
import {BottomUpTimelineTreeView, CallTreeTimelineTreeView, TimelineTreeView} from './TimelineTreeView.js';  // eslint-disable-line no-unused-vars
import {TimelineDetailsContentHelper, TimelineUIUtils} from './TimelineUIUtils.js';

/**
 * @unrestricted
 */
export class TimelineDetailsView extends UI.Widget.VBox {
  /**
   * @param {!TimelineModeViewDelegate} delegate
   */
  constructor(delegate) {
    super();
    this.element.classList.add('timeline-details');

    this._detailsLinkifier = new Components.Linkifier.Linkifier();

    this._tabbedPane = new UI.TabbedPane.TabbedPane();
    this._tabbedPane.show(this.element);

    const tabIds = Tab;

    this._defaultDetailsWidget = new UI.Widget.VBox();
    this._defaultDetailsWidget.element.classList.add('timeline-details-view');
    this._defaultDetailsContentElement =
        this._defaultDetailsWidget.element.createChild('div', 'timeline-details-view-body vbox');
    this._appendTab(tabIds.Details, Common.UIString.UIString('Summary'), this._defaultDetailsWidget);
    this.setPreferredTab(tabIds.Details);

    /** @type Map<string, TimelineTreeView> */
    this._rangeDetailViews = new Map();

    const bottomUpView = new BottomUpTimelineTreeView();
    this._appendTab(tabIds.BottomUp, Common.UIString.UIString('Bottom-Up'), bottomUpView);
    this._rangeDetailViews.set(tabIds.BottomUp, bottomUpView);

    const callTreeView = new CallTreeTimelineTreeView();
    this._appendTab(tabIds.CallTree, Common.UIString.UIString('Call Tree'), callTreeView);
    this._rangeDetailViews.set(tabIds.CallTree, callTreeView);

    const eventsView = new EventsTimelineTreeView(delegate);
    this._appendTab(tabIds.EventLog, Common.UIString.UIString('Event Log'), eventsView);
    this._rangeDetailViews.set(tabIds.EventLog, eventsView);

    this._tabbedPane.addEventListener(UI.TabbedPane.Events.TabSelected, this._tabSelected, this);
  }

  /**
   * @param {?PerformanceModel} model
   * @param {?TimelineModel.TimelineModel.Track} track
   */
  setModel(model, track) {
    if (this._model !== model) {
      if (this._model) {
        this._model.removeEventListener(Events.WindowChanged, this._onWindowChanged, this);
      }
      this._model = model;
      if (this._model) {
        this._model.addEventListener(Events.WindowChanged, this._onWindowChanged, this);
      }
    }
    this._track = track;
    this._tabbedPane.closeTabs([Tab.PaintProfiler, Tab.LayerViewer], false);
    for (const view of this._rangeDetailViews.values()) {
      view.setModel(model, track);
    }
    this._lazyPaintProfilerView = null;
    this._lazyLayersView = null;
    this.setSelection(null);
  }

  /**
   * @param {!Node} node
   */
  _setContent(node) {
    const allTabs = this._tabbedPane.otherTabs(Tab.Details);
    for (let i = 0; i < allTabs.length; ++i) {
      if (!this._rangeDetailViews.has(allTabs[i])) {
        this._tabbedPane.closeTab(allTabs[i]);
      }
    }
    this._defaultDetailsContentElement.removeChildren();
    this._defaultDetailsContentElement.appendChild(node);
  }

  _updateContents() {
    const view = this._rangeDetailViews.get(this._tabbedPane.selectedTabId || '');
    if (view) {
      const window = this._model.window();
      view.updateContents(this._selection || TimelineSelection.fromRange(window.left, window.right));
    }
  }

  /**
   * @param {string} id
   * @param {string} tabTitle
   * @param {!UI.Widget.Widget} view
   * @param {boolean=} isCloseable
   */
  _appendTab(id, tabTitle, view, isCloseable) {
    this._tabbedPane.appendTab(id, tabTitle, view, undefined, undefined, isCloseable);
    if (this._preferredTabId !== this._tabbedPane.selectedTabId) {
      this._tabbedPane.selectTab(id);
    }
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
   * @param {!Common.EventTarget.EventTargetEvent} event
   */
  _onWindowChanged(event) {
    if (!this._selection) {
      this._updateContentsFromWindow();
    }
  }

  _updateContentsFromWindow() {
    if (!this._model) {
      this._setContent(UI.Fragment.html`<div/>`);
      return;
    }
    const window = this._model.window();
    this._updateSelectedRangeStats(window.left, window.right);
    this._updateContents();
  }

  /**
   * @param {?TimelineSelection} selection
   */
  setSelection(selection) {
    this._detailsLinkifier.reset();
    this._selection = selection;
    if (!this._selection) {
      this._updateContentsFromWindow();
      return;
    }
    switch (this._selection.type()) {
      case TimelineSelection.Type.TraceEvent: {
        const event = /** @type {!SDK.TracingModel.Event} */ (this._selection.object());
        TimelineUIUtils.buildTraceEventDetails(event, this._model.timelineModel(), this._detailsLinkifier, true)
            .then(fragment => this._appendDetailsTabsForTraceEventAndShowDetails(event, fragment));
        break;
      }
      case TimelineSelection.Type.Frame: {
        const frame = /** @type {!TimelineModel.TimelineFrameModel.TimelineFrame} */ (this._selection.object());
        const filmStripFrame = this._model.filmStripModelFrame(frame);
        this._setContent(TimelineUIUtils.generateDetailsContentForFrame(frame, filmStripFrame));
        if (frame.layerTree) {
          const layersView = this._layersView();
          layersView.showLayerTree(frame.layerTree);
          if (!this._tabbedPane.hasTab(Tab.LayerViewer)) {
            this._appendTab(Tab.LayerViewer, Common.UIString.UIString('Layers'), layersView);
          }
        }
        break;
      }
      case TimelineSelection.Type.NetworkRequest: {
        const request = /** @type {!TimelineModel.TimelineModel.NetworkRequest} */ (this._selection.object());
        TimelineUIUtils.buildNetworkRequestDetails(request, this._model.timelineModel(), this._detailsLinkifier)
            .then(this._setContent.bind(this));
        break;
      }
      case TimelineSelection.Type.Range: {
        this._updateSelectedRangeStats(this._selection.startTime(), this._selection.endTime());
        break;
      }
    }

    this._updateContents();
  }

  /**
   * @param {!Common.EventTarget.EventTargetEvent} event
   */
  _tabSelected(event) {
    if (!event.data.isUserGesture) {
      return;
    }
    this.setPreferredTab(event.data.tabId);
    this._updateContents();
  }

  /**
   * @return {!UI.Widget.Widget}
   */
  _layersView() {
    if (this._lazyLayersView) {
      return this._lazyLayersView;
    }
    this._lazyLayersView =
        new TimelineLayersView(this._model.timelineModel(), this._showSnapshotInPaintProfiler.bind(this));
    return this._lazyLayersView;
  }

  /**
   * @return {!TimelinePaintProfilerView}
   */
  _paintProfilerView() {
    if (this._lazyPaintProfilerView) {
      return this._lazyPaintProfilerView;
    }
    this._lazyPaintProfilerView = new TimelinePaintProfilerView(this._model.frameModel());
    return this._lazyPaintProfilerView;
  }

  /**
   * @param {!SDK.PaintProfiler.PaintProfilerSnapshot} snapshot
   */
  _showSnapshotInPaintProfiler(snapshot) {
    const paintProfilerView = this._paintProfilerView();
    paintProfilerView.setSnapshot(snapshot);
    if (!this._tabbedPane.hasTab(Tab.PaintProfiler)) {
      this._appendTab(Tab.PaintProfiler, Common.UIString.UIString('Paint Profiler'), paintProfilerView, true);
    }
    this._tabbedPane.selectTab(Tab.PaintProfiler, true);
  }

  /**
   * @param {!SDK.TracingModel.Event} event
   * @param {!Node} content
   */
  _appendDetailsTabsForTraceEventAndShowDetails(event, content) {
    this._setContent(content);
    if (event.name === TimelineModel.TimelineModel.RecordType.Paint ||
        event.name === TimelineModel.TimelineModel.RecordType.RasterTask) {
      this._showEventInPaintProfiler(event);
    }
  }

  /**
   * @param {!SDK.TracingModel.Event} event
   */
  _showEventInPaintProfiler(event) {
    const paintProfilerModel = SDK.SDKModel.TargetManager.instance().models(SDK.PaintProfiler.PaintProfilerModel)[0];
    if (!paintProfilerModel) {
      return;
    }
    const paintProfilerView = this._paintProfilerView();
    const hasProfileData = paintProfilerView.setEvent(paintProfilerModel, event);
    if (!hasProfileData) {
      return;
    }
    if (this._tabbedPane.hasTab(Tab.PaintProfiler)) {
      return;
    }
    this._appendTab(Tab.PaintProfiler, Common.UIString.UIString('Paint Profiler'), paintProfilerView);
  }

  /**
   * @param {number} startTime
   * @param {number} endTime
   */
  _updateSelectedRangeStats(startTime, endTime) {
    if (!this._model || !this._track) {
      return;
    }
    const aggregatedStats = TimelineUIUtils.statsForTimeRange(this._track.syncEvents(), startTime, endTime);
    const startOffset = startTime - this._model.timelineModel().minimumRecordTime();
    const endOffset = endTime - this._model.timelineModel().minimumRecordTime();

    const contentHelper = new TimelineDetailsContentHelper(null, null);
    contentHelper.addSection(
        ls`Range:  ${Number.millisToString(startOffset)} \u2013 ${Number.millisToString(endOffset)}`);
    const pieChart = TimelineUIUtils.generatePieChart(aggregatedStats);
    contentHelper.appendElementRow('', pieChart);
    this._setContent(contentHelper.fragment);
  }
}

/**
 * @enum {string}
 */
export const Tab = {
  Details: 'Details',
  EventLog: 'EventLog',
  CallTree: 'CallTree',
  BottomUp: 'BottomUp',
  PaintProfiler: 'PaintProfiler',
  LayerViewer: 'LayerViewer'
};
