// Copyright 2019 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as CssOverviewModule from './css_overview.js';

self.CssOverview = self.CssOverview || {};
CssOverview = CssOverview || {};

/**
 * @constructor
 */
CssOverview.CSSOverviewCompletedView = CssOverviewModule.CSSOverviewCompletedView.CSSOverviewCompletedView;


/**
 * @constructor
 */
CssOverview.CSSOverviewCompletedView.DetailsView = CssOverviewModule.CSSOverviewCompletedView.DetailsView;

/**
 * @constructor
 */
CssOverview.CSSOverviewCompletedView.ElementDetailsView = CssOverviewModule.CSSOverviewCompletedView.ElementDetailsView;

CssOverview.CSSOverviewCompletedView.ElementNode = CssOverviewModule.CSSOverviewCompletedView.ElementNode;

/**
 * @constructor
 */
CssOverview.OverviewController = CssOverviewModule.CSSOverviewController.OverviewController;

CssOverview.Events = CssOverviewModule.CSSOverviewController.Events;

/**
 * @constructor
 */
CssOverview.CSSOverviewModel = CssOverviewModule.CSSOverviewModel.CSSOverviewModel;

/**
 * @constructor
 */
CssOverview.CSSOverviewPanel = CssOverviewModule.CSSOverviewPanel.CSSOverviewPanel;

/**
 * @constructor
 */
CssOverview.CSSOverviewProcessingView = CssOverviewModule.CSSOverviewProcessingView.CSSOverviewProcessingView;

/**
 * @constructor
 */
CssOverview.CSSOverviewSidebarPanel = CssOverviewModule.CSSOverviewSidebarPanel.CSSOverviewSidebarPanel;

CssOverview.SidebarEvents = CssOverviewModule.CSSOverviewSidebarPanel.SidebarEvents;

/**
 * @constructor
 */
CssOverview.CSSOverviewStartView = CssOverviewModule.CSSOverviewStartView.CSSOverviewStartView;

CssOverview.CSSOverviewUnusedDeclarations =
    CssOverviewModule.CSSOverviewUnusedDeclarations.CSSOverviewUnusedDeclarations;
