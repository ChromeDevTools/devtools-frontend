// Copyright 2019 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as NetworkModule from './network.js';

self.Network = self.Network || {};
Network = Network || {};

/**
 * @constructor
 */
Network.BinaryResourceView = NetworkModule.BinaryResourceView.BinaryResourceView;

/**
 * @constructor
 */
Network.BinaryResourceView.BinaryViewObject = NetworkModule.BinaryResourceView.BinaryViewObject;

/**
 * @constructor
 */
Network.BlockedURLsPane = NetworkModule.BlockedURLsPane.BlockedURLsPane;

/**
 * @constructor
 */
Network.EventSourceMessagesView = NetworkModule.EventSourceMessagesView.EventSourceMessagesView;

Network.EventSourceMessageNodeComparator = NetworkModule.EventSourceMessagesView.EventSourceMessageNodeComparator;

/**
 * @constructor
 */
Network.EventSourceMessageNode = NetworkModule.EventSourceMessagesView.EventSourceMessageNode;

/** @type {!Object.<string, function(!Network.EventSourceMessageNode, !Network.EventSourceMessageNode):number>} */
Network.EventSourceMessageNode.Comparators = NetworkModule.EventSourceMessagesView.Comparators;

/**
 * @constructor
 */
Network.HARWriter = NetworkModule.HARWriter.HARWriter;

/**
 * @constructor
 */
Network.NetworkConfigView = NetworkModule.NetworkConfigView.NetworkConfigView;

/** @type {!Array.<{title: string, values: !Array.<{title: string, value: string}>}>} */
Network.NetworkConfigView._userAgentGroups = NetworkModule.NetworkConfigView.userAgentGroups;

/**
 * @constructor
 */
Network.NetworkNode = NetworkModule.NetworkDataGridNode.NetworkNode;

/**
 * @constructor
 */
Network.NetworkRequestNode = NetworkModule.NetworkDataGridNode.NetworkRequestNode;

/**
 * @constructor
 */
Network.NetworkGroupNode = NetworkModule.NetworkDataGridNode.NetworkGroupNode;

/**
 * @constructor
 */
Network.NetworkFrameGrouper = NetworkModule.NetworkFrameGrouper.NetworkFrameGrouper;

/**
 * @constructor
 */
Network.FrameGroupNode = NetworkModule.NetworkFrameGrouper.FrameGroupNode;

/**
 * @constructor
 */
Network.NetworkItemView = NetworkModule.NetworkItemView.NetworkItemView;

/**
 * @enum {string}
 */
Network.NetworkItemView.Tabs = NetworkModule.NetworkItemView.Tabs;

/**
 * @constructor
 */
Network.NetworkLogView = NetworkModule.NetworkLogView.NetworkLogView;

Network.NetworkLogView._isFilteredOutSymbol = NetworkModule.NetworkLogView.isFilteredOutSymbol;
Network.NetworkLogView.HTTPSchemas = NetworkModule.NetworkLogView.HTTPSchemas;

/** @enum {symbol} */
Network.NetworkLogView.Events = NetworkModule.NetworkLogView.Events;

/** @enum {string} */
Network.NetworkLogView.FilterType = NetworkModule.NetworkLogView.FilterType;

/** @enum {string} */
Network.NetworkLogView.MixedContentFilterValues = NetworkModule.NetworkLogView.MixedContentFilterValues;

/** @enum {string} */
Network.NetworkLogView.IsFilterType = NetworkModule.NetworkLogView.IsFilterType;

/**
 * @interface
 */
Network.GroupLookupInterface = NetworkModule.NetworkLogView.GroupLookupInterface;

/**
 * @constructor
 */
Network.NetworkLogViewColumns = NetworkModule.NetworkLogViewColumns.NetworkLogViewColumns;

/**
 * @enum {string}
 */
Network.NetworkLogViewColumns.WaterfallSortIds = NetworkModule.NetworkLogViewColumns.WaterfallSortIds;

/**
 * @constructor
 */
Network.NetworkManageCustomHeadersView = NetworkModule.NetworkManageCustomHeadersView.NetworkManageCustomHeadersView;

/**
 * @constructor
 */
Network.NetworkOverview = NetworkModule.NetworkOverview.NetworkOverview;

Network.NetworkOverview.RequestTimeRangeNameToColor = NetworkModule.NetworkOverview.RequestTimeRangeNameToColor;

/**
 * @constructor
 */
Network.NetworkPanel = NetworkModule.NetworkPanel.NetworkPanel;
Network.NetworkPanel.displayScreenshotDelay = NetworkModule.NetworkPanel.displayScreenshotDelay;

/**
 * @constructor
 */
Network.SearchNetworkView = NetworkModule.NetworkPanel.SearchNetworkView;

/**
 * @constructor
 */
Network.NetworkPanel.ContextMenuProvider = NetworkModule.NetworkPanel.ContextMenuProvider;

/**
 * @constructor
 */
Network.NetworkPanel.RequestRevealer = NetworkModule.NetworkPanel.RequestRevealer;

/**
 * @constructor
 */
Network.NetworkPanel.FilmStripRecorder = NetworkModule.NetworkPanel.FilmStripRecorder;

/**
 * @constructor
 */
Network.NetworkPanel.ActionDelegate = NetworkModule.NetworkPanel.ActionDelegate;

/**
 * @constructor
 */
Network.NetworkPanel.RequestLocationRevealer = NetworkModule.NetworkPanel.RequestLocationRevealer;

/**
 * @constructor
 */
Network.NetworkSearchScope = NetworkModule.NetworkSearchScope.NetworkSearchScope;

/**
 * @constructor
 */
Network.UIRequestLocation = NetworkModule.NetworkSearchScope.UIRequestLocation;

/**
 * @constructor
 */
Network.NetworkSearchResult = NetworkModule.NetworkSearchScope.NetworkSearchResult;

/**
 * @constructor
 */
Network.NetworkTimeBoundary = NetworkModule.NetworkTimeCalculator.NetworkTimeBoundary;

/**
 * @constructor
 */
Network.NetworkTimeCalculator = NetworkModule.NetworkTimeCalculator.NetworkTimeCalculator;

/** @enum {symbol} */
Network.NetworkTimeCalculator.Events = NetworkModule.NetworkTimeCalculator.Events;

/**
 * @constructor
 */
Network.NetworkTransferTimeCalculator = NetworkModule.NetworkTimeCalculator.NetworkTransferTimeCalculator;

/**
 * @constructor
 */
Network.NetworkTransferDurationCalculator = NetworkModule.NetworkTimeCalculator.NetworkTransferDurationCalculator;

/**
 * @constructor
 */
Network.NetworkWaterfallColumn = NetworkModule.NetworkWaterfallColumn.NetworkWaterfallColumn;

/**
 * @constructor
 */
Network.RequestCookiesView = NetworkModule.RequestCookiesView.RequestCookiesView;

/**
 * @constructor
 */
Network.RequestHTMLView = NetworkModule.RequestHTMLView.RequestHTMLView;

/**
 * @constructor
 */
Network.RequestHeadersView = NetworkModule.RequestHeadersView.RequestHeadersView;

/**
 * @constructor
 */
Network.RequestHeadersView.Category = NetworkModule.RequestHeadersView.Category;

/**
 * @constructor
 */
Network.RequestInitiatorView = NetworkModule.RequestInitiatorView.RequestInitiatorView;

/**
 * @constructor
 */
Network.RequestPreviewView = NetworkModule.RequestPreviewView.RequestPreviewView;

/**
 * @constructor
 */
Network.RequestResponseView = NetworkModule.RequestResponseView.RequestResponseView;

/**
 * @constructor
 */
Network.RequestTimingView = NetworkModule.RequestTimingView.RequestTimingView;
Network.RequestTimingView.ConnectionSetupRangeNames = NetworkModule.RequestTimingView.ConnectionSetupRangeNames;

/** @enum {string} */
Network.RequestTimeRangeNames = NetworkModule.RequestTimingView.RequestTimeRangeNames;

/**
 * @constructor
 */
Network.ResourceWebSocketFrameView = NetworkModule.ResourceWebSocketFrameView.ResourceWebSocketFrameView;

/** @enum {number} */
Network.ResourceWebSocketFrameView.OpCodes = NetworkModule.ResourceWebSocketFrameView.OpCodes;

/** @type {!Array.<string> } */
Network.ResourceWebSocketFrameView.opCodeDescriptions = NetworkModule.ResourceWebSocketFrameView.opCodeDescriptions;

Network.ResourceWebSocketFrameNode = NetworkModule.ResourceWebSocketFrameView.ResourceWebSocketFrameNode;

/**
 * @constructor
 */
Network.SignedExchangeInfoView = NetworkModule.SignedExchangeInfoView.SignedExchangeInfoView;

/**
 * @constructor
 */
Network.SignedExchangeInfoView.Category = NetworkModule.SignedExchangeInfoView.Category;

/** @typedef {function(!SDK.NetworkRequest): boolean} */
Network.NetworkLogView.Filter;

/**
 * @typedef {{
 *     id: string,
 *     title: string,
 *     titleDOMFragment: (!DocumentFragment|undefined),
 *     subtitle: (string|null),
 *     visible: boolean,
 *     weight: number,
 *     hideable: boolean,
 *     hideableGroup: ?string,
 *     nonSelectable: boolean,
 *     sortable: boolean,
 *     align: (?DataGrid.DataGrid.Align|undefined),
 *     isResponseHeader: boolean,
 *     sortingFunction: (!function(!Network.NetworkNode, !Network.NetworkNode):number|undefined),
 *     isCustomHeader: boolean,
 *     allowInSortByEvenWhenHidden: boolean
 * }}
 */
Network.NetworkLogViewColumns.Descriptor;

/** @typedef {{start: number, end: number}} */
Network.NetworkOverview.Window;

/** @typedef {!{fillStyle: (string|undefined), lineWidth: (number|undefined), borderColor: (string|undefined)}} */
Network.NetworkWaterfallColumn._LayerStyle;

/** @typedef {!{x: number, y: number, text: string}} */
Network.NetworkWaterfallColumn._TextLayer;

/** @typedef {{name: !Network.RequestTimeRangeNames, start: number, end: number}} */
Network.RequestTimeRange;
