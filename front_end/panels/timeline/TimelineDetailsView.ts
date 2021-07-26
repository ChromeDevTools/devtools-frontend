// Copyright 2017 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

/* eslint-disable rulesdir/no_underscored_properties */

import type * as Common from '../../core/common/common.js';
import * as i18n from '../../core/i18n/i18n.js';
import * as SDK from '../../core/sdk/sdk.js';
import * as TimelineModel from '../../models/timeline_model/timeline_model.js';
import * as Components from '../../ui/legacy/components/utils/utils.js';
import * as UI from '../../ui/legacy/legacy.js';

import {EventsTimelineTreeView} from './EventsTimelineTreeView.js';
import type {PerformanceModel} from './PerformanceModel.js';
import {Events} from './PerformanceModel.js';
import {TimelineLayersView} from './TimelineLayersView.js';
import {TimelinePaintProfilerView} from './TimelinePaintProfilerView.js';
import type {TimelineModeViewDelegate} from './TimelinePanel.js';
import {TimelineSelection} from './TimelinePanel.js';
import type {TimelineTreeView} from './TimelineTreeView.js';
import {BottomUpTimelineTreeView, CallTreeTimelineTreeView} from './TimelineTreeView.js';
import {TimelineDetailsContentHelper, TimelineUIUtils} from './TimelineUIUtils.js';

const UIStrings = {
  /**
  *@description Text for the summary view
  */
  summary: 'Summary',
  /**
  *@description Text in Timeline Details View of the Performance panel
  */
  bottomup: 'Bottom-Up',
  /**
  *@description Text in Timeline Details View of the Performance panel
  */
  callTree: 'Call Tree',
  /**
  *@description Text in Timeline Details View of the Performance panel
  */
  eventLog: 'Event Log',
  /**
  *@description The label for estimated total blocking time in the performance panel
  */
  estimated: 'estimated',
  /**
  *@description Label for the total blocking time in the Performance Panel
  *@example {320.23} PH1
  *@example {(estimated)} PH2
  */
  totalBlockingTimeSmss: 'Total blocking time: {PH1}ms{PH2}',
  /**
  *@description Text that is usually a hyperlink to more documentation
  */
  learnMore: 'Learn more',
  /**
  *@description Title of the Layers tool
  */
  layers: 'Layers',
  /**
  *@description Title of the paint profiler, old name of the performance pane
  */
  paintProfiler: 'Paint Profiler',
  /**
  *@description Text in Timeline Details View of the Performance panel
  *@example {1ms} PH1
  *@example {10ms} PH2
  */
  rangeSS: 'Range:  {PH1} – {PH2}',
};
const str_ = i18n.i18n.registerUIStrings('panels/timeline/TimelineDetailsView.ts', UIStrings);
const i18nString = i18n.i18n.getLocalizedString.bind(undefined, str_);
export class TimelineDetailsView extends UI.Widget.VBox {
  _detailsLinkifier: Components.Linkifier.Linkifier;
  _tabbedPane: UI.TabbedPane.TabbedPane;
  _defaultDetailsWidget: UI.Widget.VBox;
  _defaultDetailsContentElement: HTMLElement;
  _rangeDetailViews: Map<string, TimelineTreeView>;
  _additionalMetricsToolbar: UI.Toolbar.Toolbar;
  _model!: PerformanceModel;
  _track?: TimelineModel.TimelineModel.Track|null;
  _lazyPaintProfilerView?: TimelinePaintProfilerView|null;
  _lazyLayersView?: TimelineLayersView|null;
  _preferredTabId?: string;
  _selection?: TimelineSelection|null;

  constructor(delegate: TimelineModeViewDelegate) {
    super();
    this.element.classList.add('timeline-details');

    this._detailsLinkifier = new Components.Linkifier.Linkifier();

    this._tabbedPane = new UI.TabbedPane.TabbedPane();
    this._tabbedPane.show(this.element);

    this._defaultDetailsWidget = new UI.Widget.VBox();
    this._defaultDetailsWidget.element.classList.add('timeline-details-view');
    this._defaultDetailsContentElement =
        this._defaultDetailsWidget.element.createChild('div', 'timeline-details-view-body vbox');
    this._appendTab(Tab.Details, i18nString(UIStrings.summary), this._defaultDetailsWidget);
    this.setPreferredTab(Tab.Details);

    this._rangeDetailViews = new Map();

    const bottomUpView = new BottomUpTimelineTreeView();
    this._appendTab(Tab.BottomUp, i18nString(UIStrings.bottomup), bottomUpView);
    this._rangeDetailViews.set(Tab.BottomUp, bottomUpView);

    const callTreeView = new CallTreeTimelineTreeView();
    this._appendTab(Tab.CallTree, i18nString(UIStrings.callTree), callTreeView);
    this._rangeDetailViews.set(Tab.CallTree, callTreeView);

    const eventsView = new EventsTimelineTreeView(delegate);
    this._appendTab(Tab.EventLog, i18nString(UIStrings.eventLog), eventsView);
    this._rangeDetailViews.set(Tab.EventLog, eventsView);

    this._additionalMetricsToolbar = new UI.Toolbar.Toolbar('timeline-additional-metrics');
    this.element.appendChild(this._additionalMetricsToolbar.element);

    this._tabbedPane.addEventListener(UI.TabbedPane.Events.TabSelected, this._tabSelected, this);
  }

  setModel(model: PerformanceModel|null, track: TimelineModel.TimelineModel.Track|null): void {
    if (this._model !== model) {
      if (this._model) {
        this._model.removeEventListener(Events.WindowChanged, this._onWindowChanged, this);
      }
      this._model = (model as PerformanceModel);
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

    // Add TBT info to the footer.
    this._additionalMetricsToolbar.removeToolbarItems();
    if (model && model.timelineModel()) {
      const {estimated, time} = model.timelineModel().totalBlockingTime();
      const isEstimate = estimated ? ` (${i18nString(UIStrings.estimated)})` : '';
      const message = i18nString(UIStrings.totalBlockingTimeSmss, {PH1: time.toFixed(2), PH2: isEstimate});

      const warning = document.createElement('span');
      const clsLink = UI.XLink.XLink.create('https://web.dev/tbt/', i18nString(UIStrings.learnMore));
      // crbug.com/1103188: In dark mode the focus ring is hidden by the surrounding
      // container of this link. For some additional spacing on the right to make
      // sure the ring is fully visible.
      clsLink.style.marginRight = '2px';
      warning.appendChild(clsLink);

      this._additionalMetricsToolbar.appendText(message);
      this._additionalMetricsToolbar.appendToolbarItem(new UI.Toolbar.ToolbarItem(warning));
    }
  }

  _setContent(node: Node): void {
    const allTabs = this._tabbedPane.otherTabs(Tab.Details);
    for (let i = 0; i < allTabs.length; ++i) {
      if (!this._rangeDetailViews.has(allTabs[i])) {
        this._tabbedPane.closeTab(allTabs[i]);
      }
    }
    this._defaultDetailsContentElement.removeChildren();
    this._defaultDetailsContentElement.appendChild(node);
  }

  _updateContents(): void {
    const view = this._rangeDetailViews.get(this._tabbedPane.selectedTabId || '');
    if (view) {
      const window = this._model.window();
      view.updateContents(this._selection || TimelineSelection.fromRange(window.left, window.right));
    }
  }

  _appendTab(id: string, tabTitle: string, view: UI.Widget.Widget, isCloseable?: boolean): void {
    this._tabbedPane.appendTab(id, tabTitle, view, undefined, undefined, isCloseable);
    if (this._preferredTabId !== this._tabbedPane.selectedTabId) {
      this._tabbedPane.selectTab(id);
    }
  }

  headerElement(): Element {
    return this._tabbedPane.headerElement();
  }

  setPreferredTab(tabId: string): void {
    this._preferredTabId = tabId;
  }

  _onWindowChanged(_event: Common.EventTarget.EventTargetEvent): void {
    if (!this._selection) {
      this._updateContentsFromWindow();
    }
  }

  _updateContentsFromWindow(): void {
    if (!this._model) {
      this._setContent(UI.Fragment.html`<div/>`);
      return;
    }
    const window = this._model.window();
    this._updateSelectedRangeStats(window.left, window.right);
    this._updateContents();
  }

  setSelection(selection: TimelineSelection|null): void {
    this._detailsLinkifier.reset();
    this._selection = selection;
    if (!this._selection) {
      this._updateContentsFromWindow();
      return;
    }
    switch (this._selection.type()) {
      case TimelineSelection.Type.TraceEvent: {
        const event = (this._selection.object() as SDK.TracingModel.Event);
        TimelineUIUtils.buildTraceEventDetails(event, this._model.timelineModel(), this._detailsLinkifier, true)
            .then(fragment => this._appendDetailsTabsForTraceEventAndShowDetails(event, fragment));
        break;
      }
      case TimelineSelection.Type.Frame: {
        const frame = (this._selection.object() as TimelineModel.TimelineFrameModel.TimelineFrame);
        const filmStripFrame = this._model.filmStripModelFrame(frame);
        this._setContent(TimelineUIUtils.generateDetailsContentForFrame(frame, filmStripFrame));
        if (frame.layerTree) {
          const layersView = this._layersView();
          layersView.showLayerTree(frame.layerTree);
          if (!this._tabbedPane.hasTab(Tab.LayerViewer)) {
            this._appendTab(Tab.LayerViewer, i18nString(UIStrings.layers), layersView);
          }
        }
        break;
      }
      case TimelineSelection.Type.NetworkRequest: {
        const request = (this._selection.object() as TimelineModel.TimelineModel.NetworkRequest);
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

  _tabSelected(event: Common.EventTarget.EventTargetEvent): void {
    if (!event.data.isUserGesture) {
      return;
    }
    this.setPreferredTab(event.data.tabId);
    this._updateContents();
  }

  _layersView(): TimelineLayersView {
    if (this._lazyLayersView) {
      return this._lazyLayersView;
    }
    this._lazyLayersView =
        new TimelineLayersView(this._model.timelineModel(), this._showSnapshotInPaintProfiler.bind(this));
    return this._lazyLayersView;
  }

  _paintProfilerView(): TimelinePaintProfilerView {
    if (this._lazyPaintProfilerView) {
      return this._lazyPaintProfilerView;
    }
    this._lazyPaintProfilerView = new TimelinePaintProfilerView(this._model.frameModel());
    return this._lazyPaintProfilerView;
  }

  _showSnapshotInPaintProfiler(snapshot: SDK.PaintProfiler.PaintProfilerSnapshot): void {
    const paintProfilerView = this._paintProfilerView();
    paintProfilerView.setSnapshot(snapshot);
    if (!this._tabbedPane.hasTab(Tab.PaintProfiler)) {
      this._appendTab(Tab.PaintProfiler, i18nString(UIStrings.paintProfiler), paintProfilerView, true);
    }
    this._tabbedPane.selectTab(Tab.PaintProfiler, true);
  }

  _appendDetailsTabsForTraceEventAndShowDetails(event: SDK.TracingModel.Event, content: Node): void {
    this._setContent(content);
    if (event.name === TimelineModel.TimelineModel.RecordType.Paint ||
        event.name === TimelineModel.TimelineModel.RecordType.RasterTask) {
      this._showEventInPaintProfiler(event);
    }
  }

  _showEventInPaintProfiler(event: SDK.TracingModel.Event): void {
    const paintProfilerModel =
        SDK.TargetManager.TargetManager.instance().models(SDK.PaintProfiler.PaintProfilerModel)[0];
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
    this._appendTab(Tab.PaintProfiler, i18nString(UIStrings.paintProfiler), paintProfilerView);
  }

  _updateSelectedRangeStats(startTime: number, endTime: number): void {
    if (!this._model || !this._track) {
      return;
    }
    const aggregatedStats = TimelineUIUtils.statsForTimeRange(this._track.syncEvents(), startTime, endTime);
    const startOffset = startTime - this._model.timelineModel().minimumRecordTime();
    const endOffset = endTime - this._model.timelineModel().minimumRecordTime();

    const contentHelper = new TimelineDetailsContentHelper(null, null);
    contentHelper.addSection(i18nString(
        UIStrings.rangeSS,
        {PH1: i18n.TimeUtilities.millisToString(startOffset), PH2: i18n.TimeUtilities.millisToString(endOffset)}));
    const pieChart = TimelineUIUtils.generatePieChart(aggregatedStats);
    contentHelper.appendElementRow('', pieChart);
    this._setContent(contentHelper.fragment);
  }
}

// TODO(crbug.com/1167717): Make this a const enum again
// eslint-disable-next-line rulesdir/const_enum
export enum Tab {
  Details = 'Details',
  EventLog = 'EventLog',
  CallTree = 'CallTree',
  BottomUp = 'BottomUp',
  PaintProfiler = 'PaintProfiler',
  LayerViewer = 'LayerViewer',
}
