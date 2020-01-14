// Copyright 2019 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as ProfilerModule from './profiler.js';

self.Profiler = self.Profiler || {};
Profiler = Profiler || {};

/** @constructor */
Profiler.BottomUpProfileDataGridNode = ProfilerModule.BottomUpProfileDataGrid.BottomUpProfileDataGridNode;

/** @constructor */
Profiler.BottomUpProfileDataGridTree = ProfilerModule.BottomUpProfileDataGrid.BottomUpProfileDataGridTree;

/** @constructor */
Profiler.CPUProfileFlameChart = ProfilerModule.CPUProfileFlameChart.CPUProfileFlameChart;

/** @constructor */
Profiler.CPUProfileFlameChart.OverviewCalculator = ProfilerModule.CPUProfileFlameChart.OverviewCalculator;

/** @constructor */
Profiler.CPUProfileFlameChart.OverviewPane = ProfilerModule.CPUProfileFlameChart.OverviewPane;

/** @constructor */
Profiler.ProfileFlameChartDataProvider = ProfilerModule.CPUProfileFlameChart.ProfileFlameChartDataProvider;

/** @constructor */
Profiler.CPUProfileView = ProfilerModule.CPUProfileView.CPUProfileView;

/** @constructor */
Profiler.CPUProfileView.NodeFormatter = ProfilerModule.CPUProfileView.NodeFormatter;

/** @constructor */
Profiler.CPUProfileType = ProfilerModule.CPUProfileView.CPUProfileType;

/** @constructor */
Profiler.CPUProfileHeader = ProfilerModule.CPUProfileView.CPUProfileHeader;

/** @constructor */
Profiler.CPUFlameChartDataProvider = ProfilerModule.CPUProfileView.CPUFlameChartDataProvider;

/** @constructor */
Profiler.HeapProfileView = ProfilerModule.HeapProfileView.HeapProfileView;

/** @constructor */
Profiler.HeapProfileView.NodeFormatter = ProfilerModule.HeapProfileView.NodeFormatter;

/** @constructor */
Profiler.SamplingHeapProfileTypeBase = ProfilerModule.HeapProfileView.SamplingHeapProfileTypeBase;

/** @constructor */
Profiler.SamplingHeapProfileType = ProfilerModule.HeapProfileView.SamplingHeapProfileType;

/** @constructor */
Profiler.SamplingNativeHeapProfileType = ProfilerModule.HeapProfileView.SamplingNativeHeapProfileType;

/** @constructor */
Profiler.SamplingNativeHeapSnapshotType = ProfilerModule.HeapProfileView.SamplingNativeHeapSnapshotType;

/** @constructor */
Profiler.SamplingNativeHeapSnapshotBrowserType = ProfilerModule.HeapProfileView.SamplingNativeHeapSnapshotBrowserType;

/** @constructor */
Profiler.SamplingNativeHeapSnapshotRendererType = ProfilerModule.HeapProfileView.SamplingNativeHeapSnapshotRendererType;

/** @constructor */
Profiler.SamplingHeapProfileHeader = ProfilerModule.HeapProfileView.SamplingHeapProfileHeader;

/** @constructor */
Profiler.SamplingHeapProfileNode = ProfilerModule.HeapProfileView.SamplingHeapProfileNode;

/** @constructor */
Profiler.SamplingHeapProfileModel = ProfilerModule.HeapProfileView.SamplingHeapProfileModel;

/** @constructor */
Profiler.HeapFlameChartDataProvider = ProfilerModule.HeapProfileView.HeapFlameChartDataProvider;

/** @constructor */
Profiler.HeapProfilerPanel = ProfilerModule.HeapProfilerPanel.HeapProfilerPanel;

/** @constructor */
Profiler.HeapSnapshotSortableDataGrid = ProfilerModule.HeapSnapshotDataGrids.HeapSnapshotSortableDataGrid;

/** @constructor */
Profiler.HeapSnapshotViewportDataGrid = ProfilerModule.HeapSnapshotDataGrids.HeapSnapshotViewportDataGrid;

/** @constructor */
Profiler.HeapSnapshotContainmentDataGrid = ProfilerModule.HeapSnapshotDataGrids.HeapSnapshotContainmentDataGrid;

/** @constructor */
Profiler.HeapSnapshotRetainmentDataGrid = ProfilerModule.HeapSnapshotDataGrids.HeapSnapshotRetainmentDataGrid;

/** @constructor */
Profiler.HeapSnapshotConstructorsDataGrid = ProfilerModule.HeapSnapshotDataGrids.HeapSnapshotConstructorsDataGrid;

/** @constructor */
Profiler.HeapSnapshotDiffDataGrid = ProfilerModule.HeapSnapshotDataGrids.HeapSnapshotDiffDataGrid;

/** @constructor */
Profiler.AllocationDataGrid = ProfilerModule.HeapSnapshotDataGrids.AllocationDataGrid;

/** @constructor */
Profiler.HeapSnapshotGridNode = ProfilerModule.HeapSnapshotGridNodes.HeapSnapshotGridNode;

/** @interface */
Profiler.HeapSnapshotGridNode.ChildrenProvider = ProfilerModule.ChildrenProvider.ChildrenProvider;

/** @constructor */
Profiler.HeapSnapshotGenericObjectNode = ProfilerModule.HeapSnapshotGridNodes.HeapSnapshotGenericObjectNode;

/** @constructor */
Profiler.HeapSnapshotObjectNode = ProfilerModule.HeapSnapshotGridNodes.HeapSnapshotObjectNode;

/** @constructor */
Profiler.HeapSnapshotRetainingObjectNode = ProfilerModule.HeapSnapshotGridNodes.HeapSnapshotRetainingObjectNode;

/** @constructor */
Profiler.HeapSnapshotInstanceNode = ProfilerModule.HeapSnapshotGridNodes.HeapSnapshotInstanceNode;

/** @constructor */
Profiler.HeapSnapshotConstructorNode = ProfilerModule.HeapSnapshotGridNodes.HeapSnapshotConstructorNode;

/** @constructor */
Profiler.HeapSnapshotDiffNodesProvider = ProfilerModule.HeapSnapshotGridNodes.HeapSnapshotDiffNodesProvider;

/** @constructor */
Profiler.HeapSnapshotDiffNode = ProfilerModule.HeapSnapshotGridNodes.HeapSnapshotDiffNode;

/** @constructor */
Profiler.AllocationGridNode = ProfilerModule.HeapSnapshotGridNodes.AllocationGridNode;

/** @constructor */
Profiler.HeapSnapshotProxy = ProfilerModule.HeapSnapshotProxy.HeapSnapshotProxy;

/** @constructor */
Profiler.HeapSnapshotWorkerProxy = ProfilerModule.HeapSnapshotProxy.HeapSnapshotWorkerProxy;

/** @constructor */
Profiler.HeapSnapshotProxyObject = ProfilerModule.HeapSnapshotProxy.HeapSnapshotProxyObject;

/** @constructor */
Profiler.HeapSnapshotLoaderProxy = ProfilerModule.HeapSnapshotProxy.HeapSnapshotLoaderProxy;

/** @constructor */
Profiler.HeapSnapshotProviderProxy = ProfilerModule.HeapSnapshotProxy.HeapSnapshotProviderProxy;

/** @constructor */
Profiler.HeapSnapshotView = ProfilerModule.HeapSnapshotView.HeapSnapshotView;

/** @constructor */
Profiler.HeapSnapshotView.Perspective = ProfilerModule.HeapSnapshotView.Perspective;

/** @constructor */
Profiler.HeapSnapshotView.SummaryPerspective = ProfilerModule.HeapSnapshotView.SummaryPerspective;

/** @constructor */
Profiler.HeapSnapshotView.ComparisonPerspective = ProfilerModule.HeapSnapshotView.ComparisonPerspective;

/** @constructor */
Profiler.HeapSnapshotView.ContainmentPerspective = ProfilerModule.HeapSnapshotView.ContainmentPerspective;

/** @constructor */
Profiler.HeapSnapshotView.AllocationPerspective = ProfilerModule.HeapSnapshotView.AllocationPerspective;

/** @constructor */
Profiler.HeapSnapshotView.StatisticsPerspective = ProfilerModule.HeapSnapshotView.StatisticsPerspective;

/** @constructor */
Profiler.HeapSnapshotProfileType = ProfilerModule.HeapSnapshotView.HeapSnapshotProfileType;

/** @constructor */
Profiler.TrackingHeapSnapshotProfileType = ProfilerModule.HeapSnapshotView.TrackingHeapSnapshotProfileType;

/** @constructor */
Profiler.HeapProfileHeader = ProfilerModule.HeapSnapshotView.HeapProfileHeader;

/** @constructor */
Profiler.HeapSnapshotStatisticsView = ProfilerModule.HeapSnapshotView.HeapSnapshotStatisticsView;

/** @constructor */
Profiler.HeapAllocationStackView = ProfilerModule.HeapSnapshotView.HeapAllocationStackView;

/** @constructor */
Profiler.HeapTimelineOverview = ProfilerModule.HeapTimelineOverview.HeapTimelineOverview;

Profiler.HeapTimelineOverview.IdsRangeChanged = ProfilerModule.HeapTimelineOverview.IdsRangeChanged;

/** @constructor */
Profiler.HeapTimelineOverview.SmoothScale = ProfilerModule.HeapTimelineOverview.SmoothScale;

/** @constructor */
Profiler.HeapTimelineOverview.Samples = ProfilerModule.HeapTimelineOverview.Samples;

/** @constructor */
Profiler.HeapTimelineOverview.OverviewCalculator = ProfilerModule.HeapTimelineOverview.OverviewCalculator;

/** @constructor */
Profiler.IsolateSelector = ProfilerModule.IsolateSelector.IsolateSelector;

/** @constructor */
Profiler.IsolateSelector.ListItem = ProfilerModule.IsolateSelector.ListItem;

/** @constructor */
Profiler.LiveHeapProfileView = ProfilerModule.LiveHeapProfileView.LiveHeapProfileView;

/** @constructor */
Profiler.LiveHeapProfileView.GridNode = ProfilerModule.LiveHeapProfileView.GridNode;

/** @constructor */
Profiler.LiveHeapProfileView.ActionDelegate = ProfilerModule.LiveHeapProfileView.ActionDelegate;

/** @constructor */
Profiler.ProfileDataGridNode = ProfilerModule.ProfileDataGrid.ProfileDataGridNode;

/** @constructor */
Profiler.ProfileDataGridTree = ProfilerModule.ProfileDataGrid.ProfileDataGridTree;

/** @interface */
Profiler.ProfileDataGridNode.Formatter = ProfilerModule.ProfileDataGrid.Formatter;

/** @constructor */
Profiler.ProfileHeader = ProfilerModule.ProfileHeader.ProfileHeader;

/** @constructor */
Profiler.ProfileHeader.StatusUpdate = ProfilerModule.ProfileHeader.StatusUpdate;

/** @enum {symbol} */
Profiler.ProfileHeader.Events = ProfilerModule.ProfileHeader.Events;

/** @constructor */
Profiler.ProfileLauncherView = ProfilerModule.ProfileLauncherView.ProfileLauncherView;

/** @enum {symbol} */
Profiler.ProfileLauncherView.Events = ProfilerModule.ProfileLauncherView.Events;

/** @constructor */
Profiler.ProfileType = ProfilerModule.ProfileHeader.ProfileType;

/** @enum {symbol} */
Profiler.ProfileType.Events = ProfilerModule.ProfileHeader.Events;

/** @interface */
Profiler.ProfileType.DataDisplayDelegate = ProfilerModule.ProfileHeader.DataDisplayDelegate;

/** @constructor */
Profiler.ProfileTypeRegistry = ProfilerModule.ProfileTypeRegistry.ProfileTypeRegistry;

Profiler.ProfileTypeRegistry.instance = ProfilerModule.ProfileTypeRegistry.instance;

/** @constructor */
Profiler.ProfileView = ProfilerModule.ProfileView.ProfileView;

Profiler.ProfileView._maxLinkLength = ProfilerModule.ProfileView.maxLinkLength;

/** @enum {string} */
Profiler.ProfileView.ViewTypes = ProfilerModule.ProfileView.ViewTypes;

/** @constructor */
Profiler.WritableProfileHeader = ProfilerModule.ProfileView.WritableProfileHeader;

/** @constructor */
Profiler.ProfilesPanel = ProfilerModule.ProfilesPanel.ProfilesPanel;

/** @constructor */
Profiler.ProfileTypeSidebarSection = ProfilerModule.ProfilesPanel.ProfileTypeSidebarSection;

/** @constructor */
Profiler.ProfileTypeSidebarSection.ProfileGroup = ProfilerModule.ProfilesPanel.ProfileGroup;

/** @constructor */
Profiler.ProfileSidebarTreeElement = ProfilerModule.ProfileSidebarTreeElement.ProfileSidebarTreeElement;

/** @constructor */
Profiler.ProfileGroupSidebarTreeElement = ProfilerModule.ProfilesPanel.ProfileGroupSidebarTreeElement;

/** @constructor */
Profiler.ProfilesSidebarTreeElement = ProfilerModule.ProfilesPanel.ProfilesSidebarTreeElement;

/** @constructor */
Profiler.JSProfilerPanel = ProfilerModule.ProfilesPanel.JSProfilerPanel;

/** @constructor */
Profiler.TopDownProfileDataGridNode = ProfilerModule.TopDownProfileDataGrid.TopDownProfileDataGridNode;

/** @constructor */
Profiler.TopDownProfileDataGridTree = ProfilerModule.TopDownProfileDataGrid.TopDownProfileDataGridTree;
