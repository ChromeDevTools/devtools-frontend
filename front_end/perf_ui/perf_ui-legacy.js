// Copyright 2019 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as PerfUIModule from './perf_ui.js';

self.PerfUI = self.PerfUI || {};
PerfUI = PerfUI || {};

/** @constructor */
PerfUI.ChartViewport = PerfUIModule.ChartViewport.ChartViewport;

/** @interface */
PerfUI.ChartViewportDelegate = PerfUIModule.ChartViewport.ChartViewportDelegate;

/** @constructor */
PerfUI.FilmStripView = PerfUIModule.FilmStripView.FilmStripView;

/** @enum {symbol} */
PerfUI.FilmStripView.Events = PerfUIModule.FilmStripView.Events;

PerfUI.FilmStripView.Modes = PerfUIModule.FilmStripView.Modes;
PerfUI.FilmStripView.Dialog = PerfUIModule.FilmStripView.Dialog;

/** @constructor */
PerfUI.FlameChart = PerfUIModule.FlameChart.FlameChart;

PerfUI.FlameChart.HeaderHeight = PerfUIModule.FlameChart.HeaderHeight;
PerfUI.FlameChart.MinimalTimeWindowMs = PerfUIModule.FlameChart.MinimalTimeWindowMs;

/** @constructor */
PerfUI.FlameChart.TimelineData = PerfUIModule.FlameChart.TimelineData;

/** @enum {symbol} */
PerfUI.FlameChart.Events = PerfUIModule.FlameChart.Events;

PerfUI.FlameChart.Colors = PerfUIModule.FlameChart.Colors;

/** @interface */
PerfUI.FlameChartDelegate = PerfUIModule.FlameChart.FlameChartDelegate;

/** @interface */
PerfUI.FlameChartDataProvider = PerfUIModule.FlameChart.FlameChartDataProvider;

/** @interface */
PerfUI.FlameChartMarker = PerfUIModule.FlameChart.FlameChartMarker;

/** @constructor */
PerfUI.GCActionDelegate = PerfUIModule.GCActionDelegate.GCActionDelegate;

PerfUI.LineLevelProfile = {};

/** @constructor */
PerfUI.LineLevelProfile.Performance = PerfUIModule.LineLevelProfile.Performance;

/** @constructor */
PerfUI.LineLevelProfile.Memory = PerfUIModule.LineLevelProfile.Memory;

/** @constructor */
PerfUI.LineLevelProfile._Helper = PerfUIModule.LineLevelProfile.Helper;

/** @constructor */
PerfUI.LineLevelProfile.Presentation = PerfUIModule.LineLevelProfile.Presentation;

/** @constructor */
PerfUI.LineLevelProfile.LineDecorator = PerfUIModule.LineLevelProfile.LineDecorator;

/** @constructor */
PerfUI.LiveHeapProfile = PerfUIModule.LiveHeapProfile.LiveHeapProfile;

PerfUI.uiLabelForNetworkPriority = PerfUIModule.NetworkPriorities.uiLabelForNetworkPriority;
PerfUI.uiLabelToNetworkPriority = PerfUIModule.NetworkPriorities.uiLabelToNetworkPriority;
PerfUI._priorityUILabelMap = PerfUIModule.NetworkPriorities.priorityUILabelMap;
PerfUI.networkPriorityWeight = PerfUIModule.NetworkPriorities.networkPriorityWeight;

/** @constructor */
PerfUI.OverviewGrid = PerfUIModule.OverviewGrid.OverviewGrid;

PerfUI.OverviewGrid.MinSelectableSize = PerfUIModule.OverviewGrid.MinSelectableSize;
PerfUI.OverviewGrid.WindowScrollSpeedFactor = PerfUIModule.OverviewGrid.WindowScrollSpeedFactor;
PerfUI.OverviewGrid.ResizerOffset = PerfUIModule.OverviewGrid.ResizerOffset;
PerfUI.OverviewGrid.OffsetFromWindowEnds = PerfUIModule.OverviewGrid.OffsetFromWindowEnds;

/** @constructor */
PerfUI.OverviewGrid.Window = PerfUIModule.OverviewGrid.Window;

/** @enum {symbol} */
PerfUI.OverviewGrid.Events = PerfUIModule.OverviewGrid.Events;

/** @constructor */
PerfUI.OverviewGrid.WindowSelector = PerfUIModule.OverviewGrid.WindowSelector;

/** @constructor */
PerfUI.PieChart = PerfUIModule.PieChart.PieChart;

/** @constructor */
PerfUI.TimelineGrid = PerfUIModule.TimelineGrid.TimelineGrid;

/** @interface */
PerfUI.TimelineGrid.Calculator = PerfUIModule.TimelineGrid.Calculator;

/** @constructor */
PerfUI.TimelineOverviewPane = PerfUIModule.TimelineOverviewPane.TimelineOverviewPane;

/** @enum {symbol} */
PerfUI.TimelineOverviewPane.Events = PerfUIModule.TimelineOverviewPane.Events;

/** @constructor */
PerfUI.TimelineOverviewPane.OverviewInfo = PerfUIModule.TimelineOverviewPane.OverviewInfo;

/** @constructor */
PerfUI.TimelineOverviewCalculator = PerfUIModule.TimelineOverviewPane.TimelineOverviewCalculator;

/** @constructor */
PerfUI.TimelineOverviewBase = PerfUIModule.TimelineOverviewPane.TimelineOverviewBase;

/** @interface */
PerfUI.TimelineOverview = PerfUIModule.TimelineOverviewPane.TimelineOverview;

/**
 * @typedef {!{
  *     name: string,
  *     startLevel: number,
  *     expanded: (boolean|undefined),
  *     selectable: (boolean|undefined),
  *     style: !PerfUI.FlameChart.GroupStyle
  * }}
  */
PerfUI.FlameChart.Group;

/**
  * @typedef {!{
  *     height: number,
  *     padding: number,
  *     collapsible: boolean,
  *     font: string,
  *     color: string,
  *     backgroundColor: string,
  *     nestingLevel: number,
  *     itemsHeight: (number|undefined),
  *     shareHeaderLine: (boolean|undefined),
  *     useFirstLineForOverview: (boolean|undefined),
  *     useDecoratorsForOverview: (boolean|undefined)
  * }}
  */
PerfUI.FlameChart.GroupStyle;

/** @typedef {{size: number, formatter: function(number):string, showLegend: (boolean|undefined), chartName: string}} */
PerfUI.PieChartOptions;

/** @typedef {!{offsets: !Array<!{position: number, time: number}>, precision: number}} */
PerfUI.TimelineGrid.DividersData;
