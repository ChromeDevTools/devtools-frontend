/*
 * Copyright (C) 2007, 2008 Apple Inc.  All rights reserved.
 * Copyright (C) 2008, 2009 Anthony Ricaud <rik@webkit.org>
 * Copyright (C) 2011 Google Inc. All rights reserved.
 *
 * Redistribution and use in source and binary forms, with or without
 * modification, are permitted provided that the following conditions
 * are met:
 *
 * 1.  Redistributions of source code must retain the above copyright
 *     notice, this list of conditions and the following disclaimer.
 * 2.  Redistributions in binary form must reproduce the above copyright
 *     notice, this list of conditions and the following disclaimer in the
 *     documentation and/or other materials provided with the distribution.
 * 3.  Neither the name of Apple Computer, Inc. ("Apple") nor the names of
 *     its contributors may be used to endorse or promote products derived
 *     from this software without specific prior written permission.
 *
 * THIS SOFTWARE IS PROVIDED BY APPLE AND ITS CONTRIBUTORS "AS IS" AND ANY
 * EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED TO, THE IMPLIED
 * WARRANTIES OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR PURPOSE ARE
 * DISCLAIMED. IN NO EVENT SHALL APPLE OR ITS CONTRIBUTORS BE LIABLE FOR ANY
 * DIRECT, INDIRECT, INCIDENTAL, SPECIAL, EXEMPLARY, OR CONSEQUENTIAL DAMAGES
 * (INCLUDING, BUT NOT LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR SERVICES;
 * LOSS OF USE, DATA, OR PROFITS; OR BUSINESS INTERRUPTION) HOWEVER CAUSED AND
 * ON ANY THEORY OF LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY, OR TORT
 * (INCLUDING NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE OF
 * THIS SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.
 */

import * as Bindings from '../bindings/bindings.js';
import * as Common from '../common/common.js';
import * as Components from '../components/components.js';
import * as DataGrid from '../data_grid/data_grid.js';
import * as HARImporter from '../har_importer/har_importer.js';
import * as Host from '../host/host.js';
import * as PerfUI from '../perf_ui/perf_ui.js';
import * as SDK from '../sdk/sdk.js';
import * as TextUtils from '../text_utils/text_utils.js';
import * as UI from '../ui/ui.js';

import {HARWriter} from './HARWriter.js';
import {Events, NetworkGroupNode, NetworkLogViewInterface, NetworkNode, NetworkRequestNode} from './NetworkDataGridNode.js';  // eslint-disable-line no-unused-vars
import {NetworkFrameGrouper} from './NetworkFrameGrouper.js';
import {NetworkLogViewColumns} from './NetworkLogViewColumns.js';
import {NetworkTimeBoundary, NetworkTimeCalculator, NetworkTransferDurationCalculator, NetworkTransferTimeCalculator,} from './NetworkTimeCalculator.js';  // eslint-disable-line no-unused-vars

/**
 * @implements {SDK.SDKModel.SDKModelObserver<!SDK.NetworkManager.NetworkManager>}
 * @implements {NetworkLogViewInterface}
 */
export class NetworkLogView extends UI.Widget.VBox {
  /**
   * @param {!UI.FilterBar.FilterBar} filterBar
   * @param {!Element} progressBarContainer
   * @param {!Common.Settings.Setting} networkLogLargeRowsSetting
   */
  constructor(filterBar, progressBarContainer, networkLogLargeRowsSetting) {
    super();
    this.setMinimumSize(50, 64);
    this.registerRequiredCSS('network/networkLogView.css');

    this.element.id = 'network-container';
    this.element.classList.add('no-node-selected');

    this._networkHideDataURLSetting = Common.Settings.Settings.instance().createSetting('networkHideDataURL', false);
    this._networkShowIssuesOnlySetting =
        Common.Settings.Settings.instance().createSetting('networkShowIssuesOnly', false);
    this._networkOnlyBlockedRequestsSetting =
        Common.Settings.Settings.instance().createSetting('networkOnlyBlockedRequests', false);
    this._networkResourceTypeFiltersSetting =
        Common.Settings.Settings.instance().createSetting('networkResourceTypeFilters', {});

    this._rawRowHeight = 0;
    this._progressBarContainer = progressBarContainer;
    this._networkLogLargeRowsSetting = networkLogLargeRowsSetting;
    this._networkLogLargeRowsSetting.addChangeListener(updateRowHeight.bind(this), this);

    /**
     * @this {NetworkLogView}
     */
    function updateRowHeight() {
      this._rawRowHeight = !!this._networkLogLargeRowsSetting.get() ? 41 : 21;
      this._rowHeight = this._computeRowHeight();
    }
    this._rawRowHeight = 0;
    this._rowHeight = 0;
    updateRowHeight.call(this);

    /** @type {!NetworkTransferTimeCalculator} */
    this._timeCalculator = new NetworkTransferTimeCalculator();
    /** @type {!NetworkTransferDurationCalculator} */
    this._durationCalculator = new NetworkTransferDurationCalculator();
    this._calculator = this._timeCalculator;

    this._columns =
        new NetworkLogViewColumns(this, this._timeCalculator, this._durationCalculator, networkLogLargeRowsSetting);
    this._columns.show(this.element);

    /** @type {!Set<!SDK.NetworkRequest.NetworkRequest>} */
    this._staleRequests = new Set();
    /** @type {number} */
    this._mainRequestLoadTime = -1;
    /** @type {number} */
    this._mainRequestDOMContentLoadedTime = -1;
    this._highlightedSubstringChanges = [];

    /** @type {!Array.<!Filter>} */
    this._filters = [];
    /** @type {?Filter} */
    this._timeFilter = null;
    /** @type {?NetworkNode} */
    this._hoveredNode = null;
    /** @type {?Element} */
    this._recordingHint = null;
    /** @type {?number} */
    this._refreshRequestId = null;
    /** @type {?NetworkRequestNode} */
    this._highlightedNode = null;

    this.linkifier = new Components.Linkifier.Linkifier();

    this._recording = false;
    this._needsRefresh = false;

    this._headerHeight = 0;

    /** @type {!Map<string, !GroupLookupInterface>} */
    this._groupLookups = new Map();
    this._groupLookups.set('Frame', new NetworkFrameGrouper(this));

    /** @type {?GroupLookupInterface} */
    this._activeGroupLookup = null;

    this._textFilterUI = new UI.FilterBar.TextFilterUI();
    this._textFilterUI.addEventListener(UI.FilterBar.FilterUI.Events.FilterChanged, this._filterChanged, this);
    filterBar.addFilter(this._textFilterUI);

    this._dataURLFilterUI = new UI.FilterBar.CheckboxFilterUI(
        'hide-data-url', Common.UIString.UIString('Hide data URLs'), true, this._networkHideDataURLSetting);
    this._dataURLFilterUI.addEventListener(
        UI.FilterBar.FilterUI.Events.FilterChanged, this._filterChanged.bind(this), this);
    this._dataURLFilterUI.element().title = ls`Hides data: and blob: URLs`;
    filterBar.addFilter(this._dataURLFilterUI);

    const filterItems =
        Object.values(Common.ResourceType.resourceCategories)
            .map(category => ({name: category.title, label: category.shortTitle, title: category.title}));
    this._resourceCategoryFilterUI =
        new UI.FilterBar.NamedBitSetFilterUI(filterItems, this._networkResourceTypeFiltersSetting);
    UI.ARIAUtils.setAccessibleName(this._resourceCategoryFilterUI.element(), ls`Resource types to include`);
    this._resourceCategoryFilterUI.addEventListener(
        UI.FilterBar.FilterUI.Events.FilterChanged, this._filterChanged.bind(this), this);
    filterBar.addFilter(this._resourceCategoryFilterUI);

    this._onlyIssuesFilterUI = new UI.FilterBar.CheckboxFilterUI(
        'only-show-issues', ls`Has blocked cookies`, true, this._networkShowIssuesOnlySetting);
    this._onlyIssuesFilterUI.addEventListener(
        UI.FilterBar.FilterUI.Events.FilterChanged, this._filterChanged.bind(this), this);
    this._onlyIssuesFilterUI.element().title = ls`Only show requests with blocked response cookies`;
    filterBar.addFilter(this._onlyIssuesFilterUI);

    this._onlyBlockedRequestsUI = new UI.FilterBar.CheckboxFilterUI(
        'only-show-blocked-requests', ls`Blocked Requests`, true, this._networkOnlyBlockedRequestsSetting);
    this._onlyBlockedRequestsUI.addEventListener(
        UI.FilterBar.FilterUI.Events.FilterChanged, this._filterChanged.bind(this), this);
    this._onlyBlockedRequestsUI.element().title = ls`Only show blocked requests`;
    filterBar.addFilter(this._onlyBlockedRequestsUI);


    this._filterParser = new TextUtils.TextUtils.FilterParser(_searchKeys);
    this._suggestionBuilder =
        new UI.FilterSuggestionBuilder.FilterSuggestionBuilder(_searchKeys, NetworkLogView._sortSearchValues);
    this._resetSuggestionBuilder();

    this._dataGrid = this._columns.dataGrid();
    this._setupDataGrid();
    this._columns.sortByCurrentColumn();
    filterBar.filterButton().addEventListener(
        UI.Toolbar.ToolbarButton.Events.Click,
        this._dataGrid.scheduleUpdate.bind(this._dataGrid, true /* isFromUser */));

    this._summaryToolbar = new UI.Toolbar.Toolbar('network-summary-bar', this.element);

    new UI.DropTarget.DropTarget(
        this.element, [UI.DropTarget.Type.File], Common.UIString.UIString('Drop HAR files here'),
        this._handleDrop.bind(this));

    Common.Settings.Settings.instance()
        .moduleSetting('networkColorCodeResourceTypes')
        .addChangeListener(this._invalidateAllItems.bind(this, false), this);

    SDK.SDKModel.TargetManager.instance().observeModels(SDK.NetworkManager.NetworkManager, this);
    self.SDK.networkLog.addEventListener(SDK.NetworkLog.Events.RequestAdded, this._onRequestUpdated, this);
    self.SDK.networkLog.addEventListener(SDK.NetworkLog.Events.RequestUpdated, this._onRequestUpdated, this);
    self.SDK.networkLog.addEventListener(SDK.NetworkLog.Events.Reset, this._reset, this);

    this._updateGroupByFrame();
    Common.Settings.Settings.instance()
        .moduleSetting('network.group-by-frame')
        .addChangeListener(() => this._updateGroupByFrame());

    this._filterBar = filterBar;
  }

  _updateGroupByFrame() {
    const value = Common.Settings.Settings.instance().moduleSetting('network.group-by-frame').get();
    this._setGrouping(value ? 'Frame' : null);
  }

  /**
   * @param {string} key
   * @param {!Array<string>} values
   */
  static _sortSearchValues(key, values) {
    if (key === FilterType.Priority) {
      values.sort((a, b) => {
        const aPriority =
            /** @type {!Protocol.Network.ResourcePriority} */ (PerfUI.NetworkPriorities.uiLabelToNetworkPriority(a));
        const bPriority =
            /** @type {!Protocol.Network.ResourcePriority} */ (PerfUI.NetworkPriorities.uiLabelToNetworkPriority(b));
        return PerfUI.NetworkPriorities.networkPriorityWeight(aPriority) -
            PerfUI.NetworkPriorities.networkPriorityWeight(bPriority);
      });
    } else {
      values.sort();
    }
  }

  /**
   * @param {!Filter} filter
   * @param {!SDK.NetworkRequest.NetworkRequest} request
   * @return {boolean}
   */
  static _negativeFilter(filter, request) {
    return !filter(request);
  }

  /**
   * @param {?RegExp} regex
   * @param {!SDK.NetworkRequest.NetworkRequest} request
   * @return {boolean}
   */
  static _requestPathFilter(regex, request) {
    if (!regex) {
      return false;
    }

    return regex.test(request.path() + '/' + request.name());
  }

  /**
   * @param {string} domain
   * @return {!Array.<string>}
   */
  static _subdomains(domain) {
    const result = [domain];
    let indexOfPeriod = domain.indexOf('.');
    while (indexOfPeriod !== -1) {
      result.push('*' + domain.substring(indexOfPeriod));
      indexOfPeriod = domain.indexOf('.', indexOfPeriod + 1);
    }
    return result;
  }

  /**
   * @param {string} value
   * @return {!Filter}
   */
  static _createRequestDomainFilter(value) {
    /**
     * @param {string} string
     * @return {string}
     */
    function escapeForRegExp(string) {
      return string.escapeForRegExp();
    }
    const escapedPattern = value.split('*').map(escapeForRegExp).join('.*');
    return NetworkLogView._requestDomainFilter.bind(null, new RegExp('^' + escapedPattern + '$', 'i'));
  }

  /**
   * @param {!RegExp} regex
   * @param {!SDK.NetworkRequest.NetworkRequest} request
   * @return {boolean}
   */
  static _requestDomainFilter(regex, request) {
    return regex.test(request.domain);
  }

  /**
   * @param {!SDK.NetworkRequest.NetworkRequest} request
   * @return {boolean}
   */
  static _runningRequestFilter(request) {
    return !request.finished;
  }

  /**
   * @param {!SDK.NetworkRequest.NetworkRequest} request
   * @return {boolean}
   */
  static _fromCacheRequestFilter(request) {
    return request.cached();
  }

  /**
   * @param {!SDK.NetworkRequest.NetworkRequest} request
   * @return {boolean}
   */
  static _interceptedByServiceWorkerFilter(request) {
    return request.fetchedViaServiceWorker;
  }

  /**
   * @param {!SDK.NetworkRequest.NetworkRequest} request
   * @return {boolean}
   */
  static _initiatedByServiceWorkerFilter(request) {
    return request.initiatedByServiceWorker();
  }

  /**
   * @param {string} value
   * @param {!SDK.NetworkRequest.NetworkRequest} request
   * @return {boolean}
   */
  static _requestResponseHeaderFilter(value, request) {
    return request.responseHeaderValue(value) !== undefined;
  }

  /**
   * @param {string} value
   * @param {!SDK.NetworkRequest.NetworkRequest} request
   * @return {boolean}
   */
  static _requestMethodFilter(value, request) {
    return request.requestMethod === value;
  }

  /**
   * @param {string} value
   * @param {!SDK.NetworkRequest.NetworkRequest} request
   * @return {boolean}
   */
  static _requestPriorityFilter(value, request) {
    return request.priority() === value;
  }

  /**
   * @param {string} value
   * @param {!SDK.NetworkRequest.NetworkRequest} request
   * @return {boolean}
   */
  static _requestMimeTypeFilter(value, request) {
    return request.mimeType === value;
  }

  /**
   * @param {!MixedContentFilterValues} value
   * @param {!SDK.NetworkRequest.NetworkRequest} request
   * @return {boolean}
   */
  static _requestMixedContentFilter(value, request) {
    if (value === MixedContentFilterValues.Displayed) {
      return request.mixedContentType === Protocol.Security.MixedContentType.OptionallyBlockable;
    }
    if (value === MixedContentFilterValues.Blocked) {
      return request.mixedContentType === Protocol.Security.MixedContentType.Blockable && request.wasBlocked();
    }
    if (value === MixedContentFilterValues.BlockOverridden) {
      return request.mixedContentType === Protocol.Security.MixedContentType.Blockable && !request.wasBlocked();
    }
    if (value === MixedContentFilterValues.All) {
      return request.mixedContentType !== Protocol.Security.MixedContentType.None;
    }

    return false;
  }

  /**
   * @param {string} value
   * @param {!SDK.NetworkRequest.NetworkRequest} request
   * @return {boolean}
   */
  static _requestSchemeFilter(value, request) {
    return request.scheme === value;
  }

  /**
   * @param {string} value
   * @param {!SDK.NetworkRequest.NetworkRequest} request
   * @return {boolean}
   */
  static _requestCookieDomainFilter(value, request) {
    return request.allCookiesIncludingBlockedOnes().some(cookie => cookie.domain() === value);
  }

  /**
   * @param {string} value
   * @param {!SDK.NetworkRequest.NetworkRequest} request
   * @return {boolean}
   */
  static _requestCookieNameFilter(value, request) {
    return request.allCookiesIncludingBlockedOnes().some(cookie => cookie.name() === value);
  }

  /**
   * @param {string} value
   * @param {!SDK.NetworkRequest.NetworkRequest} request
   * @return {boolean}
   */
  static _requestCookiePathFilter(value, request) {
    return request.allCookiesIncludingBlockedOnes().some(cookie => cookie.path() === value);
  }

  /**
   * @param {string} value
   * @param {!SDK.NetworkRequest.NetworkRequest} request
   * @return {boolean}
   */
  static _requestCookieValueFilter(value, request) {
    return request.allCookiesIncludingBlockedOnes().some(cookie => cookie.value() === value);
  }

  /**
   * @param {string} value
   * @param {!SDK.NetworkRequest.NetworkRequest} request
   * @return {boolean}
   */
  static _requestSetCookieDomainFilter(value, request) {
    return request.responseCookies.some(cookie => cookie.domain() === value);
  }

  /**
   * @param {string} value
   * @param {!SDK.NetworkRequest.NetworkRequest} request
   * @return {boolean}
   */
  static _requestSetCookieNameFilter(value, request) {
    return request.responseCookies.some(cookie => cookie.name() === value);
  }

  /**
   * @param {string} value
   * @param {!SDK.NetworkRequest.NetworkRequest} request
   * @return {boolean}
   */
  static _requestSetCookieValueFilter(value, request) {
    return request.responseCookies.some(cookie => cookie.value() === value);
  }

  /**
   * @param {number} value
   * @param {!SDK.NetworkRequest.NetworkRequest} request
   * @return {boolean}
   */
  static _requestSizeLargerThanFilter(value, request) {
    return request.transferSize >= value;
  }

  /**
   * @param {string} value
   * @param {!SDK.NetworkRequest.NetworkRequest} request
   * @return {boolean}
   */
  static _statusCodeFilter(value, request) {
    return ('' + request.statusCode) === value;
  }

  /**
   * @param {!SDK.NetworkRequest.NetworkRequest} request
   * @return {boolean}
   */
  static HTTPRequestsFilter(request) {
    return request.parsedURL.isValid && (request.scheme in HTTPSchemas);
  }

  /**
   * @param {number} windowStart
   * @param {number} windowEnd
   * @param {!SDK.NetworkRequest.NetworkRequest} request
   * @return {boolean}
   */
  static _requestTimeFilter(windowStart, windowEnd, request) {
    if (request.issueTime() > windowEnd) {
      return false;
    }
    if (request.endTime !== -1 && request.endTime < windowStart) {
      return false;
    }
    return true;
  }

  /**
   * @param {!SDK.NetworkRequest.NetworkRequest} request
   */
  static _copyRequestHeaders(request) {
    Host.InspectorFrontendHost.InspectorFrontendHostInstance.copyText(request.requestHeadersText());
  }

  /**
   * @param {!SDK.NetworkRequest.NetworkRequest} request
   */
  static _copyResponseHeaders(request) {
    Host.InspectorFrontendHost.InspectorFrontendHostInstance.copyText(request.responseHeadersText);
  }

  /**
   * @param {!SDK.NetworkRequest.NetworkRequest} request
   */
  static async _copyResponse(request) {
    const contentData = await request.contentData();
    let content = contentData.content || '';
    if (!request.contentType().isTextType()) {
      content = TextUtils.ContentProvider.contentAsDataURL(content, request.mimeType, contentData.encoded);
    } else if (contentData.encoded) {
      content = window.atob(content);
    }
    Host.InspectorFrontendHost.InspectorFrontendHostInstance.copyText(content);
  }

  /**
   * @param {!DataTransfer} dataTransfer
   */
  _handleDrop(dataTransfer) {
    const items = dataTransfer.items;
    if (!items.length) {
      return;
    }
    const entry = items[0].webkitGetAsEntry();
    if (entry.isDirectory) {
      return;
    }

    entry.file(this.onLoadFromFile.bind(this));
  }

  /**
   * @override
   * @param {!File} file
   */
  async onLoadFromFile(file) {
    const outputStream = new Common.StringOutputStream.StringOutputStream();
    const reader = new Bindings.FileUtils.ChunkedFileReader(file, /* chunkSize */ 10000000);
    const success = await reader.read(outputStream);
    if (!success) {
      this._harLoadFailed(reader.error().message);
      return;
    }
    let harRoot;
    try {
      // HARRoot and JSON.parse might throw.
      harRoot = new HARImporter.HARFormat.HARRoot(JSON.parse(outputStream.data()));
    } catch (e) {
      this._harLoadFailed(e);
      return;
    }
    self.SDK.networkLog.importRequests(HARImporter.HARImporter.Importer.requestsFromHARLog(harRoot.log));
  }

  /**
   * @param {string} message
   */
  _harLoadFailed(message) {
    Common.Console.Console.instance().error('Failed to load HAR file with following error: ' + message);
  }

  /**
   * @param {?string} groupKey
   */
  _setGrouping(groupKey) {
    if (this._activeGroupLookup) {
      this._activeGroupLookup.reset();
    }
    const groupLookup = groupKey ? this._groupLookups.get(groupKey) || null : null;
    this._activeGroupLookup = groupLookup;
    this._invalidateAllItems();
  }

  /**
   * @return {number}
   */
  _computeRowHeight() {
    return Math.round(this._rawRowHeight * window.devicePixelRatio) / window.devicePixelRatio;
  }

  /**
   * @override
   * @param {!SDK.NetworkRequest.NetworkRequest} request
   * @return {?NetworkRequestNode}
   */
  nodeForRequest(request) {
    return request[_networkNodeSymbol] || null;
  }

  /**
   * @override
   * @return {number}
   */
  headerHeight() {
    return this._headerHeight;
  }

  /**
   * @override
   * @param {boolean} recording
   */
  setRecording(recording) {
    this._recording = recording;
    this._updateSummaryBar();
  }

  /**
   * @override
   * @param {!SDK.NetworkManager.NetworkManager} networkManager
   */
  modelAdded(networkManager) {
    // TODO(allada) Remove dependency on networkManager and instead use NetworkLog and PageLoad for needed data.
    if (networkManager.target().parentTarget()) {
      return;
    }
    const resourceTreeModel = networkManager.target().model(SDK.ResourceTreeModel.ResourceTreeModel);
    if (resourceTreeModel) {
      resourceTreeModel.addEventListener(SDK.ResourceTreeModel.Events.Load, this._loadEventFired, this);
      resourceTreeModel.addEventListener(
          SDK.ResourceTreeModel.Events.DOMContentLoaded, this._domContentLoadedEventFired, this);
    }
  }

  /**
   * @override
   * @param {!SDK.NetworkManager.NetworkManager} networkManager
   */
  modelRemoved(networkManager) {
    if (!networkManager.target().parentTarget()) {
      const resourceTreeModel = networkManager.target().model(SDK.ResourceTreeModel.ResourceTreeModel);
      if (resourceTreeModel) {
        resourceTreeModel.removeEventListener(SDK.ResourceTreeModel.Events.Load, this._loadEventFired, this);
        resourceTreeModel.removeEventListener(
            SDK.ResourceTreeModel.Events.DOMContentLoaded, this._domContentLoadedEventFired, this);
      }
    }
  }

  /**
   * @override
   * @param {number} start
   * @param {number} end
   */
  setWindow(start, end) {
    if (!start && !end) {
      this._timeFilter = null;
      this._timeCalculator.setWindow(null);
    } else {
      this._timeFilter = NetworkLogView._requestTimeFilter.bind(null, start, end);
      this._timeCalculator.setWindow(new NetworkTimeBoundary(start, end));
    }
    this._filterRequests();
  }

  /** @override */
  resetFocus() {
    this._dataGrid.element.focus();
  }

  _resetSuggestionBuilder() {
    this._suggestionBuilder.clear();
    this._suggestionBuilder.addItem(FilterType.Is, IsFilterType.Running);
    this._suggestionBuilder.addItem(FilterType.Is, IsFilterType.FromCache);
    this._suggestionBuilder.addItem(FilterType.Is, IsFilterType.ServiceWorkerIntercepted);
    this._suggestionBuilder.addItem(FilterType.Is, IsFilterType.ServiceWorkerInitiated);
    this._suggestionBuilder.addItem(FilterType.LargerThan, '100');
    this._suggestionBuilder.addItem(FilterType.LargerThan, '10k');
    this._suggestionBuilder.addItem(FilterType.LargerThan, '1M');
    this._textFilterUI.setSuggestionProvider(this._suggestionBuilder.completions.bind(this._suggestionBuilder));
  }

  /**
   * @param {!Common.EventTarget.EventTargetEvent} event
   */
  _filterChanged(event) {
    this.removeAllNodeHighlights();
    this._parseFilterQuery(this._textFilterUI.value());
    this._filterRequests();
  }

  async resetFilter() {
    this._textFilterUI.clear();
  }

  _showRecordingHint() {
    this._hideRecordingHint();
    this._recordingHint = this.element.createChild('div', 'network-status-pane fill');
    const hintText = this._recordingHint.createChild('div', 'recording-hint');

    let reloadShortcutNode = null;
    const reloadShortcutDescriptor = self.UI.shortcutRegistry.shortcutDescriptorsForAction('inspector_main.reload')[0];
    if (reloadShortcutDescriptor) {
      reloadShortcutNode = this._recordingHint.createChild('b');
      reloadShortcutNode.textContent = reloadShortcutDescriptor.name;
    }

    if (this._recording) {
      const recordingText = hintText.createChild('span');
      recordingText.textContent = Common.UIString.UIString('Recording network activity…');
      if (reloadShortcutNode) {
        hintText.createChild('br');
        hintText.appendChild(
            UI.UIUtils.formatLocalized('Perform a request or hit %s to record the reload.', [reloadShortcutNode]));
      }
    } else {
      const recordNode = hintText.createChild('b');
      recordNode.textContent = self.UI.shortcutRegistry.shortcutTitleForAction('network.toggle-recording');
      if (reloadShortcutNode) {
        hintText.appendChild(UI.UIUtils.formatLocalized(
            'Record (%s) or reload (%s) to display network activity.', [recordNode, reloadShortcutNode]));
      } else {
        hintText.appendChild(UI.UIUtils.formatLocalized('Record (%s) to display network activity.', [recordNode]));
      }
    }
    hintText.createChild('br');
    hintText.appendChild(UI.XLink.XLink.create(
        'https://developers.google.com/web/tools/chrome-devtools/network/?utm_source=devtools&utm_campaign=2019Q1',
        'Learn more'));

    this._setHidden(true);
    this._dataGrid.updateGridAccessibleName('');
  }

  _hideRecordingHint() {
    this._setHidden(false);
    if (this._recordingHint) {
      this._recordingHint.remove();
    }
    this._dataGrid.updateGridAccessibleName(ls`Network Data Available`);
    this._recordingHint = null;
  }

  /**
   * @param {boolean} value
   */
  _setHidden(value) {
    this._columns.setHidden(value);
    UI.ARIAUtils.setHidden(this._summaryToolbar.element, value);
  }

  /**
   * @override
   * @return {!Array.<!Element>}
   */
  elementsToRestoreScrollPositionsFor() {
    if (!this._dataGrid)  // Not initialized yet.
    {
      return [];
    }
    return [this._dataGrid.scrollContainer];
  }

  /** @override */
  columnExtensionResolved() {
    this._invalidateAllItems(true);
  }

  _setupDataGrid() {
    this._dataGrid.setRowContextMenuCallback((contextMenu, node) => {
      const request = node.request();
      if (request) {
        this.handleContextMenuForRequest(contextMenu, request);
      }
    });
    this._dataGrid.setStickToBottom(true);
    this._dataGrid.setName('networkLog');
    this._dataGrid.setResizeMethod(DataGrid.DataGrid.ResizeMethod.Last);
    this._dataGrid.element.classList.add('network-log-grid');
    this._dataGrid.element.addEventListener('mousedown', this._dataGridMouseDown.bind(this), true);
    this._dataGrid.element.addEventListener('mousemove', this._dataGridMouseMove.bind(this), true);
    this._dataGrid.element.addEventListener('mouseleave', () => this._setHoveredNode(null), true);
    this._dataGrid.element.addEventListener('keydown', event => {
      if (isEnterOrSpaceKey(event)) {
        this.dispatchEventToListeners(Events.RequestActivated, {showPanel: true});
        event.consume(true);
      }
    });
    this._dataGrid.element.addEventListener('focus', this._onDataGridFocus.bind(this), true);
    this._dataGrid.element.addEventListener('blur', this._onDataGridBlur.bind(this), true);
    return this._dataGrid;
  }

  /**
   * @param {!Event} event
   */
  _dataGridMouseMove(event) {
    const node = (this._dataGrid.dataGridNodeFromNode(/** @type {!Node} */ (event.target)));
    const highlightInitiatorChain = event.shiftKey;
    this._setHoveredNode(node, highlightInitiatorChain);
  }

  /**
   * @override
   * @return {?NetworkNode}
   */
  hoveredNode() {
    return this._hoveredNode;
  }

  /**
   * @param {?NetworkNode} node
   * @param {boolean=} highlightInitiatorChain
   */
  _setHoveredNode(node, highlightInitiatorChain) {
    if (this._hoveredNode) {
      this._hoveredNode.setHovered(false, false);
    }
    this._hoveredNode = node;
    if (this._hoveredNode) {
      this._hoveredNode.setHovered(true, !!highlightInitiatorChain);
    }
  }

  /**
   * @param {!Event} event
   */
  _dataGridMouseDown(event) {
    if (!this._dataGrid.selectedNode && event.button) {
      event.consume();
    }
  }

  _updateSummaryBar() {
    this._hideRecordingHint();

    let transferSize = 0;
    let resourceSize = 0;
    let selectedNodeNumber = 0;
    let selectedTransferSize = 0;
    let selectedResourceSize = 0;
    let baseTime = -1;
    let maxTime = -1;

    let nodeCount = 0;
    for (const request of self.SDK.networkLog.requests()) {
      const node = request[_networkNodeSymbol];
      if (!node) {
        continue;
      }
      nodeCount++;
      const requestTransferSize = request.transferSize;
      transferSize += requestTransferSize;
      const requestResourceSize = request.resourceSize;
      resourceSize += requestResourceSize;
      if (!node[isFilteredOutSymbol]) {
        selectedNodeNumber++;
        selectedTransferSize += requestTransferSize;
        selectedResourceSize += requestResourceSize;
      }
      const networkManager = SDK.NetworkManager.NetworkManager.forRequest(request);
      // TODO(allada) inspectedURL should be stored in PageLoad used instead of target so HAR requests can have an
      // inspected url.
      if (networkManager && request.url() === networkManager.target().inspectedURL() &&
          request.resourceType() === Common.ResourceType.resourceTypes.Document &&
          !networkManager.target().parentTarget()) {
        baseTime = request.startTime;
      }
      if (request.endTime > maxTime) {
        maxTime = request.endTime;
      }
    }

    if (!nodeCount) {
      this._showRecordingHint();
      return;
    }

    this._summaryToolbar.removeToolbarItems();
    /**
     * @param {string} chunk
     * @param {string=} title
     * @return {!Element}
     */
    const appendChunk = (chunk, title) => {
      const toolbarText = new UI.Toolbar.ToolbarText(chunk);
      toolbarText.setTitle(title ? title : chunk);
      this._summaryToolbar.appendToolbarItem(toolbarText);
      return toolbarText.element;
    };

    if (selectedNodeNumber !== nodeCount) {
      appendChunk(ls`${selectedNodeNumber} / ${nodeCount} requests`);
      this._summaryToolbar.appendSeparator();
      appendChunk(
          ls`${Number.bytesToString(selectedTransferSize)} / ${Number.bytesToString(transferSize)} transferred`,
          ls`${selectedTransferSize} B / ${transferSize} B transferred over network`);
      this._summaryToolbar.appendSeparator();
      appendChunk(
          ls`${Number.bytesToString(selectedResourceSize)} / ${Number.bytesToString(resourceSize)} resources`,
          ls`${selectedResourceSize} B / ${resourceSize} B resources loaded by the page`);
    } else {
      appendChunk(ls`${nodeCount} requests`);
      this._summaryToolbar.appendSeparator();
      appendChunk(
          ls`${Number.bytesToString(transferSize)} transferred`, ls`${transferSize} B transferred over network`);
      this._summaryToolbar.appendSeparator();
      appendChunk(
          ls`${Number.bytesToString(resourceSize)} resources`, ls`${resourceSize} B resources loaded by the page`);
    }

    if (baseTime !== -1 && maxTime !== -1) {
      this._summaryToolbar.appendSeparator();
      appendChunk(ls`Finish: ${Number.secondsToString(maxTime - baseTime)}`);
      if (this._mainRequestDOMContentLoadedTime !== -1 && this._mainRequestDOMContentLoadedTime > baseTime) {
        this._summaryToolbar.appendSeparator();
        const domContentLoadedText =
            ls`DOMContentLoaded: ${Number.secondsToString(this._mainRequestDOMContentLoadedTime - baseTime)}`;
        appendChunk(domContentLoadedText).style.color = NetworkLogView.getDCLEventColor();
      }
      if (this._mainRequestLoadTime !== -1) {
        this._summaryToolbar.appendSeparator();
        const loadText = ls`Load: ${Number.secondsToString(this._mainRequestLoadTime - baseTime)}`;
        appendChunk(loadText).style.color = NetworkLogView.getLoadEventColor();
      }
    }
  }

  /** @override */
  scheduleRefresh() {
    if (this._needsRefresh) {
      return;
    }

    this._needsRefresh = true;

    if (this.isShowing() && !this._refreshRequestId) {
      this._refreshRequestId = this.element.window().requestAnimationFrame(this._refresh.bind(this));
    }
  }

  /**
   * @override
   * @param {!Array<number>} times
   */
  addFilmStripFrames(times) {
    this._columns.addEventDividers(times, 'network-frame-divider');
  }

  /**
   * @override
   * @param {number} time
   */
  selectFilmStripFrame(time) {
    this._columns.selectFilmStripFrame(time);
  }

  /** @override */
  clearFilmStripFrame() {
    this._columns.clearFilmStripFrame();
  }

  _refreshIfNeeded() {
    if (this._needsRefresh) {
      this._refresh();
    }
  }

  /**
   * @param {boolean=} deferUpdate
   */
  _invalidateAllItems(deferUpdate) {
    this._staleRequests = new Set(self.SDK.networkLog.requests());
    if (deferUpdate) {
      this.scheduleRefresh();
    } else {
      this._refresh();
    }
  }

  /**
   * @override
   * @return {!NetworkTimeCalculator}
   */
  timeCalculator() {
    return this._timeCalculator;
  }

  /**
   * @override
   * @return {!NetworkTimeCalculator}
   */
  calculator() {
    return this._calculator;
  }

  /**
   * @override
   * @param {!NetworkTimeCalculator} x
   */
  setCalculator(x) {
    if (!x || this._calculator === x) {
      return;
    }

    if (this._calculator !== x) {
      this._calculator = x;
      this._columns.setCalculator(this._calculator);
    }
    this._calculator.reset();

    if (this._calculator.startAtZero) {
      this._columns.hideEventDividers();
    } else {
      this._columns.showEventDividers();
    }

    this._invalidateAllItems();
  }

  /**
   * @param {!Common.EventTarget.EventTargetEvent} event
   */
  _loadEventFired(event) {
    if (!this._recording) {
      return;
    }

    const time = /** @type {number} */ (event.data.loadTime);
    if (time) {
      this._mainRequestLoadTime = time;
      this._columns.addEventDividers([time], 'network-load-divider');
    }
  }

  /**
   * @param {!Common.EventTarget.EventTargetEvent} event
   */
  _domContentLoadedEventFired(event) {
    if (!this._recording) {
      return;
    }
    const data = /** @type {number} */ (event.data);
    if (data) {
      this._mainRequestDOMContentLoadedTime = data;
      this._columns.addEventDividers([data], 'network-dcl-divider');
    }
  }

  /**
   * @override
   */
  wasShown() {
    this._refreshIfNeeded();
    this._columns.wasShown();
  }

  /**
   * @override
   */
  willHide() {
    this._columns.willHide();
  }

  /**
   * @override
   */
  onResize() {
    this._rowHeight = this._computeRowHeight();
  }

  /**
   * @override
   * @return {!Array<!NetworkNode>}
   */
  flatNodesList() {
    return this._dataGrid.rootNode().flatChildren();
  }

  _onDataGridFocus() {
    this.element.classList.add('grid-focused');
    this.updateNodeBackground();
  }

  _onDataGridBlur() {
    this.element.classList.remove('grid-focused');
    this.updateNodeBackground();
  }

  /** @override */
  updateNodeBackground() {
    if (this._dataGrid.selectedNode) {
      this._dataGrid.selectedNode.updateBackgroundColor();
    }
  }

  /**
   * @override
   * @param {boolean} isSelected
   */
  updateNodeSelectedClass(isSelected) {
    if (isSelected) {
      this.element.classList.remove('no-node-selected');
    } else {
      this.element.classList.add('no-node-selected');
    }
  }

  /** @override */
  stylesChanged() {
    this._columns.scheduleRefresh();
  }

  _refresh() {
    this._needsRefresh = false;

    if (this._refreshRequestId) {
      this.element.window().cancelAnimationFrame(this._refreshRequestId);
      this._refreshRequestId = null;
    }

    this.removeAllNodeHighlights();

    this._timeCalculator.updateBoundariesForEventTime(this._mainRequestLoadTime);
    this._durationCalculator.updateBoundariesForEventTime(this._mainRequestLoadTime);
    this._timeCalculator.updateBoundariesForEventTime(this._mainRequestDOMContentLoadedTime);
    this._durationCalculator.updateBoundariesForEventTime(this._mainRequestDOMContentLoadedTime);

    /** @type {!Map<!NetworkNode, !Network.NetworkNode>} */
    const nodesToInsert = new Map();
    /** @type {!Array<!NetworkNode>} */
    const nodesToRefresh = [];

    /** @type {!Set<!NetworkRequestNode>} */
    const staleNodes = new Set();

    // While creating nodes it may add more entries into _staleRequests because redirect request nodes update the parent
    // node so we loop until we have no more stale requests.
    while (this._staleRequests.size) {
      const request = this._staleRequests.firstValue();
      this._staleRequests.delete(request);
      let node = request[_networkNodeSymbol];
      if (!node) {
        node = this._createNodeForRequest(request);
      }
      staleNodes.add(node);
    }

    for (const node of staleNodes) {
      const isFilteredOut = !this._applyFilter(node);
      if (isFilteredOut && node === this._hoveredNode) {
        this._setHoveredNode(null);
      }

      if (!isFilteredOut) {
        nodesToRefresh.push(node);
      }
      const request = node.request();
      this._timeCalculator.updateBoundaries(request);
      this._durationCalculator.updateBoundaries(request);
      const newParent = this._parentNodeForInsert(node);
      if (node[isFilteredOutSymbol] === isFilteredOut && node.parent === newParent) {
        continue;
      }
      node[isFilteredOutSymbol] = isFilteredOut;
      const removeFromParent = node.parent && (isFilteredOut || node.parent !== newParent);
      if (removeFromParent) {
        let parent = node.parent;
        parent.removeChild(node);
        while (parent && !parent.hasChildren() && parent.dataGrid && parent.dataGrid.rootNode() !== parent) {
          const grandparent = parent.parent;
          grandparent.removeChild(parent);
          parent = grandparent;
        }
      }

      if (!newParent || isFilteredOut) {
        continue;
      }

      if (!newParent.dataGrid && !nodesToInsert.has(newParent)) {
        nodesToInsert.set(newParent, this._dataGrid.rootNode());
        nodesToRefresh.push(newParent);
      }
      nodesToInsert.set(node, newParent);
    }

    for (const node of nodesToInsert.keys()) {
      nodesToInsert.get(node).appendChild(node);
    }

    for (const node of nodesToRefresh) {
      node.refresh();
    }

    this._updateSummaryBar();

    if (nodesToInsert.size) {
      this._columns.sortByCurrentColumn();
    }

    this._dataGrid.updateInstantly();
    this._didRefreshForTest();
  }

  _didRefreshForTest() {
  }

  /**
   * @param {!NetworkRequestNode} node
   * @return {?NetworkNode}
   */
  _parentNodeForInsert(node) {
    if (!this._activeGroupLookup) {
      return this._dataGrid.rootNode();
    }

    const groupNode = this._activeGroupLookup.groupNodeForRequest(node.request());
    if (!groupNode) {
      return this._dataGrid.rootNode();
    }
    return groupNode;
  }

  _reset() {
    this.dispatchEventToListeners(Events.RequestActivated, {showPanel: false});

    this._setHoveredNode(null);
    this._columns.reset();

    this._timeFilter = null;
    this._calculator.reset();

    this._timeCalculator.setWindow(null);
    this.linkifier.reset();

    if (this._activeGroupLookup) {
      this._activeGroupLookup.reset();
    }
    this._staleRequests.clear();
    this._resetSuggestionBuilder();

    this._mainRequestLoadTime = -1;
    this._mainRequestDOMContentLoadedTime = -1;

    this._dataGrid.rootNode().removeChildren();
    this._updateSummaryBar();
    this._dataGrid.setStickToBottom(true);
    this.scheduleRefresh();
  }

  /**
   * @override
   * @param {string} filterString
   */
  setTextFilterValue(filterString) {
    this._textFilterUI.setValue(filterString);
    this._dataURLFilterUI.setChecked(false);
    this._onlyIssuesFilterUI.setChecked(false);
    this._onlyBlockedRequestsUI.setChecked(false);
    this._resourceCategoryFilterUI.reset();
  }

  /**
   * @param {!SDK.NetworkRequest.NetworkRequest} request
   */
  _createNodeForRequest(request) {
    const node = new NetworkRequestNode(this, request);
    request[_networkNodeSymbol] = node;
    node[isFilteredOutSymbol] = true;

    for (let redirect = request.redirectSource(); redirect; redirect = redirect.redirectSource()) {
      this._refreshRequest(redirect);
    }
    return node;
  }

  /**
   * @param {!Common.EventTarget.EventTargetEvent} event
   */
  _onRequestUpdated(event) {
    const request = /** @type {!SDK.NetworkRequest.NetworkRequest} */ (event.data);
    this._refreshRequest(request);
  }

  /**
   * @param {!SDK.NetworkRequest.NetworkRequest} request
   */
  _refreshRequest(request) {
    NetworkLogView._subdomains(request.domain)
        .forEach(this._suggestionBuilder.addItem.bind(this._suggestionBuilder, FilterType.Domain));
    this._suggestionBuilder.addItem(FilterType.Method, request.requestMethod);
    this._suggestionBuilder.addItem(FilterType.MimeType, request.mimeType);
    this._suggestionBuilder.addItem(FilterType.Scheme, '' + request.scheme);
    this._suggestionBuilder.addItem(FilterType.StatusCode, '' + request.statusCode);

    const priority = request.priority();
    if (priority) {
      this._suggestionBuilder.addItem(
          FilterType.Priority, PerfUI.NetworkPriorities.uiLabelForNetworkPriority(priority));
    }

    if (request.mixedContentType !== Protocol.Security.MixedContentType.None) {
      this._suggestionBuilder.addItem(FilterType.MixedContent, MixedContentFilterValues.All);
    }

    if (request.mixedContentType === Protocol.Security.MixedContentType.OptionallyBlockable) {
      this._suggestionBuilder.addItem(FilterType.MixedContent, MixedContentFilterValues.Displayed);
    }

    if (request.mixedContentType === Protocol.Security.MixedContentType.Blockable) {
      const suggestion =
          request.wasBlocked() ? MixedContentFilterValues.Blocked : MixedContentFilterValues.BlockOverridden;
      this._suggestionBuilder.addItem(FilterType.MixedContent, suggestion);
    }

    const responseHeaders = request.responseHeaders;
    for (let i = 0, l = responseHeaders.length; i < l; ++i) {
      this._suggestionBuilder.addItem(FilterType.HasResponseHeader, responseHeaders[i].name);
    }

    for (const cookie of request.responseCookies) {
      this._suggestionBuilder.addItem(FilterType.SetCookieDomain, cookie.domain());
      this._suggestionBuilder.addItem(FilterType.SetCookieName, cookie.name());
      this._suggestionBuilder.addItem(FilterType.SetCookieValue, cookie.value());
    }

    for (const cookie of request.allCookiesIncludingBlockedOnes()) {
      this._suggestionBuilder.addItem(FilterType.CookieDomain, cookie.domain());
      this._suggestionBuilder.addItem(FilterType.CookieName, cookie.name());
      this._suggestionBuilder.addItem(FilterType.CookiePath, cookie.path());
      this._suggestionBuilder.addItem(FilterType.CookieValue, cookie.value());
    }

    this._staleRequests.add(request);
    this.scheduleRefresh();
  }

  /**
   * @override
   * @return {number}
   */
  rowHeight() {
    return this._rowHeight;
  }

  /**
   * @override
   * @param {boolean} gridMode
   */
  switchViewMode(gridMode) {
    this._columns.switchViewMode(gridMode);
  }

  /**
   * @override
   * @param {!UI.ContextMenu.ContextMenu} contextMenu
   * @param {!SDK.NetworkRequest.NetworkRequest} request
   */
  handleContextMenuForRequest(contextMenu, request) {
    contextMenu.appendApplicableItems(request);
    let copyMenu = contextMenu.clipboardSection().appendSubMenuItem(Common.UIString.UIString('Copy'));
    const footerSection = copyMenu.footerSection();
    if (request) {
      copyMenu.defaultSection().appendItem(
          UI.UIUtils.copyLinkAddressLabel(),
          Host.InspectorFrontendHost.InspectorFrontendHostInstance.copyText.bind(
              Host.InspectorFrontendHost.InspectorFrontendHostInstance, request.contentURL()));
      if (request.requestHeadersText()) {
        copyMenu.defaultSection().appendItem(
            Common.UIString.UIString('Copy request headers'), NetworkLogView._copyRequestHeaders.bind(null, request));
      }

      if (request.responseHeadersText) {
        copyMenu.defaultSection().appendItem(
            Common.UIString.UIString('Copy response headers'), NetworkLogView._copyResponseHeaders.bind(null, request));
      }

      if (request.finished) {
        copyMenu.defaultSection().appendItem(
            Common.UIString.UIString('Copy response'), NetworkLogView._copyResponse.bind(null, request));
      }

      const disableIfBlob = request.isBlobRequest();
      if (Host.Platform.isWin()) {
        footerSection.appendItem(
            Common.UIString.UIString('Copy as PowerShell'), this._copyPowerShellCommand.bind(this, request),
            disableIfBlob);
        footerSection.appendItem(
            Common.UIString.UIString('Copy as fetch'), this._copyFetchCall.bind(this, request, false), disableIfBlob);
        footerSection.appendItem(
            Common.UIString.UIString('Copy as Node.js fetch'), this._copyFetchCall.bind(this, request, true),
            disableIfBlob);
        footerSection.appendItem(
            Common.UIString.UIString('Copy as cURL (cmd)'), this._copyCurlCommand.bind(this, request, 'win'),
            disableIfBlob);
        footerSection.appendItem(
            Common.UIString.UIString('Copy as cURL (bash)'), this._copyCurlCommand.bind(this, request, 'unix'),
            disableIfBlob);
        footerSection.appendItem(
            Common.UIString.UIString('Copy all as PowerShell'), this._copyAllPowerShellCommand.bind(this));
        footerSection.appendItem(
            Common.UIString.UIString('Copy all as fetch'), this._copyAllFetchCall.bind(this, false));
        footerSection.appendItem(
            Common.UIString.UIString('Copy all as Node.js fetch'), this._copyAllFetchCall.bind(this, true));
        footerSection.appendItem(
            Common.UIString.UIString('Copy all as cURL (cmd)'), this._copyAllCurlCommand.bind(this, 'win'));
        footerSection.appendItem(
            Common.UIString.UIString('Copy all as cURL (bash)'), this._copyAllCurlCommand.bind(this, 'unix'));
      } else {
        footerSection.appendItem(
            Common.UIString.UIString('Copy as fetch'), this._copyFetchCall.bind(this, request, false), disableIfBlob);
        footerSection.appendItem(
            Common.UIString.UIString('Copy as Node.js fetch'), this._copyFetchCall.bind(this, request, true),
            disableIfBlob);
        footerSection.appendItem(
            Common.UIString.UIString('Copy as cURL'), this._copyCurlCommand.bind(this, request, 'unix'), disableIfBlob);
        footerSection.appendItem(
            Common.UIString.UIString('Copy all as fetch'), this._copyAllFetchCall.bind(this, false));
        footerSection.appendItem(
            Common.UIString.UIString('Copy all as Node.js fetch'), this._copyAllFetchCall.bind(this, true));
        footerSection.appendItem(
            Common.UIString.UIString('Copy all as cURL'), this._copyAllCurlCommand.bind(this, 'unix'));
      }
    } else {
      copyMenu = contextMenu.clipboardSection().appendSubMenuItem(Common.UIString.UIString('Copy'));
    }
    footerSection.appendItem(Common.UIString.UIString('Copy all as HAR'), this._copyAll.bind(this));

    contextMenu.saveSection().appendItem(ls`Save all as HAR with content`, this.exportAll.bind(this));

    contextMenu.editSection().appendItem(
        Common.UIString.UIString('Clear browser cache'), this._clearBrowserCache.bind(this));
    contextMenu.editSection().appendItem(
        Common.UIString.UIString('Clear browser cookies'), this._clearBrowserCookies.bind(this));

    if (request) {
      const maxBlockedURLLength = 20;
      const manager = self.SDK.multitargetNetworkManager;
      let patterns = manager.blockedPatterns();

      /**
       * @param {string} url
       */
      function addBlockedURL(url) {
        patterns.push({enabled: true, url: url});
        manager.setBlockedPatterns(patterns);
        manager.setBlockingEnabled(true);
        UI.ViewManager.ViewManager.instance().showView('network.blocked-urls');
      }

      /**
       * @param {string} url
       */
      function removeBlockedURL(url) {
        patterns = patterns.filter(pattern => pattern.url !== url);
        manager.setBlockedPatterns(patterns);
        UI.ViewManager.ViewManager.instance().showView('network.blocked-urls');
      }

      const urlWithoutScheme = request.parsedURL.urlWithoutScheme();
      if (urlWithoutScheme && !patterns.find(pattern => pattern.url === urlWithoutScheme)) {
        contextMenu.debugSection().appendItem(
            Common.UIString.UIString('Block request URL'), addBlockedURL.bind(null, urlWithoutScheme));
      } else if (urlWithoutScheme) {
        const croppedURL = urlWithoutScheme.trimMiddle(maxBlockedURLLength);
        contextMenu.debugSection().appendItem(
            Common.UIString.UIString('Unblock %s', croppedURL), removeBlockedURL.bind(null, urlWithoutScheme));
      }

      const domain = request.parsedURL.domain();
      if (domain && !patterns.find(pattern => pattern.url === domain)) {
        contextMenu.debugSection().appendItem(
            Common.UIString.UIString('Block request domain'), addBlockedURL.bind(null, domain));
      } else if (domain) {
        const croppedDomain = domain.trimMiddle(maxBlockedURLLength);
        contextMenu.debugSection().appendItem(
            Common.UIString.UIString('Unblock %s', croppedDomain), removeBlockedURL.bind(null, domain));
      }

      if (SDK.NetworkManager.NetworkManager.canReplayRequest(request)) {
        contextMenu.debugSection().appendItem(
            Common.UIString.UIString('Replay XHR'),
            SDK.NetworkManager.NetworkManager.replayRequest.bind(null, request));
      }
    }
  }

  _harRequests() {
    return self.SDK.networkLog.requests().filter(NetworkLogView.HTTPRequestsFilter).filter(request => {
      return request.finished ||
          (request.resourceType() === Common.ResourceType.resourceTypes.WebSocket && request.responseReceivedTime);
    });
  }

  async _copyAll() {
    const harArchive = {log: await SDK.HARLog.HARLog.build(this._harRequests())};
    Host.InspectorFrontendHost.InspectorFrontendHostInstance.copyText(JSON.stringify(harArchive, null, 2));
  }

  /**
   * @param {!SDK.NetworkRequest.NetworkRequest} request
   * @param {string} platform
   */
  async _copyCurlCommand(request, platform) {
    const command = await this._generateCurlCommand(request, platform);
    Host.InspectorFrontendHost.InspectorFrontendHostInstance.copyText(command);
  }

  /**
   * @param {string} platform
   */
  async _copyAllCurlCommand(platform) {
    const commands = await this._generateAllCurlCommand(self.SDK.networkLog.requests(), platform);
    Host.InspectorFrontendHost.InspectorFrontendHostInstance.copyText(commands);
  }

  /**
   * @param {!SDK.NetworkRequest.NetworkRequest} request
   * @param {boolean} includeCookies
   */
  async _copyFetchCall(request, includeCookies) {
    const command = await this._generateFetchCall(request, includeCookies);
    Host.InspectorFrontendHost.InspectorFrontendHostInstance.copyText(command);
  }

  /**
   * @param {boolean} includeCookies
   */
  async _copyAllFetchCall(includeCookies) {
    const commands = await this._generateAllFetchCall(self.SDK.networkLog.requests(), includeCookies);
    Host.InspectorFrontendHost.InspectorFrontendHostInstance.copyText(commands);
  }

  /**
   * @param {!SDK.NetworkRequest.NetworkRequest} request
   */
  async _copyPowerShellCommand(request) {
    const command = await this._generatePowerShellCommand(request);
    Host.InspectorFrontendHost.InspectorFrontendHostInstance.copyText(command);
  }

  async _copyAllPowerShellCommand() {
    const commands = await this._generateAllPowerShellCommand(self.SDK.networkLog.requests());
    Host.InspectorFrontendHost.InspectorFrontendHostInstance.copyText(commands);
  }

  /**
   * @override
   * @return {!Promise}
   */
  async exportAll() {
    const url = SDK.SDKModel.TargetManager.instance().mainTarget().inspectedURL();
    const parsedURL = Common.ParsedURL.ParsedURL.fromString(url);
    const filename = parsedURL ? parsedURL.host : 'network-log';
    const stream = new Bindings.FileUtils.FileOutputStream();

    if (!await stream.open(filename + '.har')) {
      return;
    }

    const progressIndicator = new UI.ProgressIndicator.ProgressIndicator();
    this._progressBarContainer.appendChild(progressIndicator.element);
    await HARWriter.write(stream, this._harRequests(), progressIndicator);
    progressIndicator.done();
    stream.close();
  }

  _clearBrowserCache() {
    if (confirm(Common.UIString.UIString('Are you sure you want to clear browser cache?'))) {
      self.SDK.multitargetNetworkManager.clearBrowserCache();
    }
  }

  _clearBrowserCookies() {
    if (confirm(Common.UIString.UIString('Are you sure you want to clear browser cookies?'))) {
      self.SDK.multitargetNetworkManager.clearBrowserCookies();
    }
  }

  _removeAllHighlights() {
    this.removeAllNodeHighlights();
    for (let i = 0; i < this._highlightedSubstringChanges.length; ++i) {
      UI.UIUtils.revertDomChanges(this._highlightedSubstringChanges[i]);
    }
    this._highlightedSubstringChanges = [];
  }

  /**
   * @param {!NetworkRequestNode} node
   * @return {boolean}
   */
  _applyFilter(node) {
    const request = node.request();
    if (this._timeFilter && !this._timeFilter(request)) {
      return false;
    }
    const categoryName = request.resourceType().category().title;
    if (!this._resourceCategoryFilterUI.accept(categoryName)) {
      return false;
    }
    if (this._dataURLFilterUI.checked() && (request.parsedURL.isDataURL() || request.parsedURL.isBlobURL())) {
      return false;
    }
    if (this._onlyIssuesFilterUI.checked() && !SDK.RelatedIssue.hasIssues(request)) {
      return false;
    }
    if (this._onlyBlockedRequestsUI.checked() && !request.wasBlocked()) {
      return false;
    }
    if (request.statusText === 'Service Worker Fallback Required') {
      return false;
    }
    for (let i = 0; i < this._filters.length; ++i) {
      if (!this._filters[i](request)) {
        return false;
      }
    }
    return true;
  }

  /**
   * @param {string} query
   */
  _parseFilterQuery(query) {
    const descriptors = this._filterParser.parse(query);
    this._filters = descriptors.map(descriptor => {
      const key = descriptor.key;
      const text = descriptor.text || '';
      const regex = descriptor.regex;
      let filter;
      if (key) {
        const defaultText = (key + ':' + text).escapeForRegExp();
        filter = this._createSpecialFilter(/** @type {!FilterType} */ (key), text) ||
            NetworkLogView._requestPathFilter.bind(null, new RegExp(defaultText, 'i'));
      } else if (descriptor.regex) {
        filter = NetworkLogView._requestPathFilter.bind(null, /** @type {!RegExp} */ (regex));
      } else {
        filter = NetworkLogView._requestPathFilter.bind(null, new RegExp(text.escapeForRegExp(), 'i'));
      }
      return descriptor.negative ? NetworkLogView._negativeFilter.bind(null, filter) : filter;
    });
  }

  /**
   * @param {!FilterType} type
   * @param {string} value
   * @return {?Filter}
   */
  _createSpecialFilter(type, value) {
    switch (type) {
      case FilterType.Domain:
        return NetworkLogView._createRequestDomainFilter(value);

      case FilterType.HasResponseHeader:
        return NetworkLogView._requestResponseHeaderFilter.bind(null, value);

      case FilterType.Is:
        if (value.toLowerCase() === IsFilterType.Running) {
          return NetworkLogView._runningRequestFilter;
        }
        if (value.toLowerCase() === IsFilterType.FromCache) {
          return NetworkLogView._fromCacheRequestFilter;
        }
        if (value.toLowerCase() === IsFilterType.ServiceWorkerIntercepted) {
          return NetworkLogView._interceptedByServiceWorkerFilter;
        }
        if (value.toLowerCase() === IsFilterType.ServiceWorkerInitiated) {
          return NetworkLogView._initiatedByServiceWorkerFilter;
        }
        break;

      case FilterType.LargerThan:
        return this._createSizeFilter(value.toLowerCase());

      case FilterType.Method:
        return NetworkLogView._requestMethodFilter.bind(null, value);

      case FilterType.MimeType:
        return NetworkLogView._requestMimeTypeFilter.bind(null, value);

      case FilterType.MixedContent:
        return NetworkLogView._requestMixedContentFilter.bind(null, /** @type {!MixedContentFilterValues} */ (value));

      case FilterType.Scheme:
        return NetworkLogView._requestSchemeFilter.bind(null, value);

      case FilterType.SetCookieDomain:
        return NetworkLogView._requestSetCookieDomainFilter.bind(null, value);

      case FilterType.SetCookieName:
        return NetworkLogView._requestSetCookieNameFilter.bind(null, value);

      case FilterType.SetCookieValue:
        return NetworkLogView._requestSetCookieValueFilter.bind(null, value);

      case FilterType.CookieDomain:
        return NetworkLogView._requestCookieDomainFilter.bind(null, value);

      case FilterType.CookieName:
        return NetworkLogView._requestCookieNameFilter.bind(null, value);

      case FilterType.CookiePath:
        return NetworkLogView._requestCookiePathFilter.bind(null, value);

      case FilterType.CookieValue:
        return NetworkLogView._requestCookieValueFilter.bind(null, value);

      case FilterType.Priority:
        return NetworkLogView._requestPriorityFilter.bind(
            null, PerfUI.NetworkPriorities.uiLabelToNetworkPriority(value));

      case FilterType.StatusCode:
        return NetworkLogView._statusCodeFilter.bind(null, value);
    }
    return null;
  }

  /**
   * @param {string} value
   * @return {?Filter}
   */
  _createSizeFilter(value) {
    let multiplier = 1;
    if (value.endsWith('k')) {
      multiplier = 1024;
      value = value.substring(0, value.length - 1);
    } else if (value.endsWith('m')) {
      multiplier = 1024 * 1024;
      value = value.substring(0, value.length - 1);
    }
    const quantity = Number(value);
    if (isNaN(quantity)) {
      return null;
    }
    return NetworkLogView._requestSizeLargerThanFilter.bind(null, quantity * multiplier);
  }

  _filterRequests() {
    this._removeAllHighlights();
    this._invalidateAllItems();
  }

  /**
   * @param {!SDK.NetworkRequest.NetworkRequest} request
   * @return {?NetworkRequestNode}
   */
  _reveal(request) {
    this.removeAllNodeHighlights();
    const node = request[_networkNodeSymbol];
    if (!node || !node.dataGrid) {
      return null;
    }
    node.reveal();
    return node;
  }

  /**
   * @override
   * @param {!SDK.NetworkRequest.NetworkRequest} request
   */
  revealAndHighlightRequest(request) {
    const node = this._reveal(request);
    if (node) {
      this._highlightNode(node);
    }
  }

  /**
   * @override
   * @param {!SDK.NetworkRequest.NetworkRequest} request
   */
  selectRequest(request) {
    this.setTextFilterValue('');
    const node = this._reveal(request);
    if (node) {
      node.select();
    }
  }

  /** @override */
  removeAllNodeHighlights() {
    if (this._highlightedNode) {
      this._highlightedNode.element().classList.remove('highlighted-row');
      this._highlightedNode = null;
    }
  }

  /**
   * @param {!NetworkRequestNode} node
   */
  _highlightNode(node) {
    UI.UIUtils.runCSSAnimationOnce(node.element(), 'highlighted-row');
    this._highlightedNode = node;
  }

  /**
   * @param {!Array<!SDK.NetworkRequest.NetworkRequest>} requests
   * @return {!Array<!SDK.NetworkRequest.NetworkRequest>}
   */
  _filterOutBlobRequests(requests) {
    return requests.filter(request => !request.isBlobRequest());
  }

  /**
   * @param {!SDK.NetworkRequest.NetworkRequest} request
   * @param {boolean} includeCookies
   * @return {!Promise<string>}
   */
  async _generateFetchCall(request, includeCookies) {
    const ignoredHeaders = {
      // Internal headers
      'method': 1,
      'path': 1,
      'scheme': 1,
      'version': 1,

      // Unsafe headers
      // Keep this list synchronized with src/net/http/http_util.cc
      'accept-charset': 1,
      'accept-encoding': 1,
      'access-control-request-headers': 1,
      'access-control-request-method': 1,
      'connection': 1,
      'content-length': 1,
      'cookie': 1,
      'cookie2': 1,
      'date': 1,
      'dnt': 1,
      'expect': 1,
      'host': 1,
      'keep-alive': 1,
      'origin': 1,
      'referer': 1,
      'te': 1,
      'trailer': 1,
      'transfer-encoding': 1,
      'upgrade': 1,
      'via': 1,
      // TODO(phistuck) - remove this once crbug.com/571722 is fixed.
      'user-agent': 1
    };

    const credentialHeaders = {'cookie': 1, 'authorization': 1};

    const url = JSON.stringify(request.url());

    const requestHeaders = request.requestHeaders();
    const headerData = requestHeaders.reduce((result, header) => {
      const name = header.name;

      if (!ignoredHeaders[name.toLowerCase()] && !name.includes(':')) {
        result.append(name, header.value);
      }

      return result;
    }, new Headers());

    const headers = {};
    for (const headerArray of headerData) {
      headers[headerArray[0]] = headerArray[1];
    }

    const credentials =
        request.requestCookies.length || requestHeaders.some(({name}) => credentialHeaders[name.toLowerCase()]) ?
        'include' :
        'omit';

    const referrerHeader = requestHeaders.find(({name}) => name.toLowerCase() === 'referer');

    const referrer = referrerHeader ? referrerHeader.value : void 0;

    const referrerPolicy = request.referrerPolicy() || void 0;

    const requestBody = await request.requestFormData();

    const fetchOptions = {
      headers: Object.keys(headers).length ? headers : void 0,
      referrer,
      referrerPolicy,
      body: requestBody,
      method: request.requestMethod,
      mode: 'cors'
    };

    if (includeCookies) {
      const cookieHeader = requestHeaders.find(header => header.name.toLowerCase() === 'cookie');
      if (cookieHeader) {
        fetchOptions.headers = {
          ...headers,
          'cookie': cookieHeader.value,
        };
      }
    } else {
      fetchOptions.credentials = credentials;
    }

    const options = JSON.stringify(fetchOptions, null, 2);
    return `fetch(${url}, ${options});`;
  }

  /**
   * @param {!Array<!SDK.NetworkRequest.NetworkRequest>} requests
   * @param {boolean} includeCookies
   * @return {!Promise<string>}
   */
  async _generateAllFetchCall(requests, includeCookies) {
    const nonBlobRequests = this._filterOutBlobRequests(requests);
    const commands =
        await Promise.all(nonBlobRequests.map(request => this._generateFetchCall(request, includeCookies)));
    return commands.join(' ;\n');
  }

  /**
   * @param {!SDK.NetworkRequest.NetworkRequest} request
   * @param {string} platform
   * @return {!Promise<string>}
   */
  async _generateCurlCommand(request, platform) {
    let command = [];
    // Most of these headers are derived from the URL and are automatically added by cURL.
    // The |Accept-Encoding| header is ignored to prevent decompression errors. crbug.com/1015321
    const ignoredHeaders = {'accept-encoding': 1, 'host': 1, 'method': 1, 'path': 1, 'scheme': 1, 'version': 1};

    function escapeStringWin(str) {
      /* If there are no new line characters do not escape the " characters
               since it only uglifies the command.

               Because cmd.exe parser and MS Crt arguments parsers use some of the
               same escape characters, they can interact with each other in
               horrible ways, the order of operations is critical.

               Replace \ with \\ first because it is an escape character for certain
               conditions in both parsers.

               Replace all " with \" to ensure the first parser does not remove it.

               Then escape all characters we are not sure about with ^ to ensure it
               gets to MS Crt parser safely.

               The % character is special because MS Crt parser will try and look for
               ENV variables and fill them in it's place. We cannot escape them with %
               and cannot escape them with ^ (because it's cmd.exe's escape not MS Crt
               parser); So we can get cmd.exe parser to escape the character after it,
               if it is followed by a valid beginning character of an ENV variable.
               This ensures we do not try and double escape another ^ if it was placed
               by the previous replace.

               Lastly we replace new lines with ^ and TWO new lines because the first
               new line is there to enact the escape command the second is the character
               to escape (in this case new line).
            */
      const encapsChars = /[\r\n]/.test(str) ? '^"' : '"';
      return encapsChars +
          str.replace(/\\/g, '\\\\')
              .replace(/"/g, '\\"')
              .replace(/[^a-zA-Z0-9\s_\-:=+~'\/.',?;()*`]/g, '^$&')
              .replace(/%(?=[a-zA-Z0-9_])/g, '%^')
              .replace(/\r\n|[\n\r]/g, '^\n\n') +
          encapsChars;
    }

    /**
     * @param {string} str
     * @return {string}
     */
    function escapeStringPosix(str) {
      /**
       * @param {string} x
       * @return {string}
       */
      function escapeCharacter(x) {
        const code = x.charCodeAt(0);
        let hexString = code.toString(16);
        // Zero pad to four digits to comply with ANSI-C Quoting:
        // http://www.gnu.org/software/bash/manual/html_node/ANSI_002dC-Quoting.html
        while (hexString.length < 4) {
          hexString = '0' + hexString;
        }

        return '\\u' + hexString;
      }

      if (/[\0-\x1F\x7F-\x9F!]|\'/.test(str)) {
        // Use ANSI-C quoting syntax.
        return '$\'' +
            str.replace(/\\/g, '\\\\')
                .replace(/\'/g, '\\\'')
                .replace(/\n/g, '\\n')
                .replace(/\r/g, '\\r')
                .replace(/[\0-\x1F\x7F-\x9F!]/g, escapeCharacter) +
            '\'';
      }
      // Use single quote syntax.
      return '\'' + str + '\'';
    }

    // cURL command expected to run on the same platform that DevTools run
    // (it may be different from the inspected page platform).
    const escapeString = platform === 'win' ? escapeStringWin : escapeStringPosix;

    command.push(escapeString(request.url()).replace(/[[{}\]]/g, '\\$&'));

    let inferredMethod = 'GET';
    const data = [];
    const requestContentType = request.requestContentType();
    const formData = await request.requestFormData();
    if (requestContentType && requestContentType.startsWith('application/x-www-form-urlencoded') && formData) {
      // Note that formData is not necessarily urlencoded because it might for example
      // come from a fetch request made with an explicitly unencoded body.
      data.push('--data-raw ' + escapeString(formData));
      ignoredHeaders['content-length'] = true;
      inferredMethod = 'POST';
    } else if (formData) {
      data.push('--data-binary ' + escapeString(formData));
      ignoredHeaders['content-length'] = true;
      inferredMethod = 'POST';
    }

    if (request.requestMethod !== inferredMethod) {
      command.push('-X ' + escapeString(request.requestMethod));
    }

    const requestHeaders = request.requestHeaders();
    for (let i = 0; i < requestHeaders.length; i++) {
      const header = requestHeaders[i];
      const name = header.name.replace(/^:/, '');  // Translate SPDY v3 headers to HTTP headers.
      if (name.toLowerCase() in ignoredHeaders) {
        continue;
      }
      command.push('-H ' + escapeString(name + ': ' + header.value));
    }
    command = command.concat(data);
    command.push('--compressed');

    if (request.securityState() === Protocol.Security.SecurityState.Insecure) {
      command.push('--insecure');
    }
    return 'curl ' + command.join(command.length >= 3 ? (platform === 'win' ? ' ^\n  ' : ' \\\n  ') : ' ');
  }

  /**
   * @param {!Array<!SDK.NetworkRequest.NetworkRequest>} requests
   * @param {string} platform
   * @return {!Promise<string>}
   */
  async _generateAllCurlCommand(requests, platform) {
    const nonBlobRequests = this._filterOutBlobRequests(requests);
    const commands = await Promise.all(nonBlobRequests.map(request => this._generateCurlCommand(request, platform)));
    if (platform === 'win') {
      return commands.join(' &\r\n');
    }
    return commands.join(' ;\n');
  }

  /**
   * @param {!SDK.NetworkRequest.NetworkRequest} request
   * @return {!Promise<string>}
   */
  async _generatePowerShellCommand(request) {
    const command = [];
    const ignoredHeaders =
        new Set(['host', 'connection', 'proxy-connection', 'content-length', 'expect', 'range', 'content-type']);

    /**
     * @param {string} str
     * @return {string}
     */
    function escapeString(str) {
      return '"' +
          str.replace(/[`\$"]/g, '`$&').replace(/[^\x20-\x7E]/g, char => '$([char]' + char.charCodeAt(0) + ')') + '"';
    }

    command.push('-Uri ' + escapeString(request.url()));

    if (request.requestMethod !== 'GET') {
      command.push('-Method ' + escapeString(request.requestMethod));
    }

    const requestHeaders = request.requestHeaders();
    const headerNameValuePairs = [];
    for (const header of requestHeaders) {
      const name = header.name.replace(/^:/, '');  // Translate h2 headers to HTTP headers.
      if (ignoredHeaders.has(name.toLowerCase())) {
        continue;
      }
      headerNameValuePairs.push(escapeString(name) + '=' + escapeString(header.value));
    }
    if (headerNameValuePairs.length) {
      command.push('-Headers @{\n' + headerNameValuePairs.join('\n  ') + '\n}');
    }

    const contentTypeHeader = requestHeaders.find(({name}) => name.toLowerCase() === 'content-type');
    if (contentTypeHeader) {
      command.push('-ContentType ' + escapeString(contentTypeHeader.value));
    }

    const formData = await request.requestFormData();
    if (formData) {
      const body = escapeString(formData);
      if (/[^\x20-\x7E]/.test(formData)) {
        command.push('-Body ([System.Text.Encoding]::UTF8.GetBytes(' + body + '))');
      } else {
        command.push('-Body ' + body);
      }
    }

    return 'Invoke-WebRequest ' + command.join(command.length >= 3 ? ' `\n' : ' ');
  }

  /**
   * @param {!Array<!SDK.NetworkRequest.NetworkRequest>} requests
   * @return {!Promise<string>}
   */
  async _generateAllPowerShellCommand(requests) {
    const nonBlobRequests = this._filterOutBlobRequests(requests);
    const commands = await Promise.all(nonBlobRequests.map(request => this._generatePowerShellCommand(request)));
    return commands.join(';\r\n');
  }

  /**
   * @return {string}
   */
  static getDCLEventColor() {
    if (self.UI.themeSupport.themeName() === 'dark') {
      return '#03A9F4';
    }
    return '#0867CB';
  }

  /**
   * @return {string}
   */
  static getLoadEventColor() {
    return self.UI.themeSupport.patchColorText('#B31412', UI.UIUtils.ThemeSupport.ColorUsage.Foreground);
  }
}

export const isFilteredOutSymbol = Symbol('isFilteredOut');
export const _networkNodeSymbol = Symbol('NetworkNode');

export const HTTPSchemas = {
  'http': true,
  'https': true,
  'ws': true,
  'wss': true
};

/** @enum {string} */
export const FilterType = {
  Domain: 'domain',
  HasResponseHeader: 'has-response-header',
  Is: 'is',
  LargerThan: 'larger-than',
  Method: 'method',
  MimeType: 'mime-type',
  MixedContent: 'mixed-content',
  Priority: 'priority',
  Scheme: 'scheme',
  SetCookieDomain: 'set-cookie-domain',
  SetCookieName: 'set-cookie-name',
  SetCookieValue: 'set-cookie-value',
  CookieDomain: 'cookie-domain',
  CookieName: 'cookie-name',
  CookiePath: 'cookie-path',
  CookieValue: 'cookie-value',
  StatusCode: 'status-code'
};

/** @enum {string} */
export const MixedContentFilterValues = {
  All: 'all',
  Displayed: 'displayed',
  Blocked: 'blocked',
  BlockOverridden: 'block-overridden'
};

/** @enum {string} */
export const IsFilterType = {
  Running: 'running',
  FromCache: 'from-cache',
  ServiceWorkerIntercepted: 'service-worker-intercepted',
  ServiceWorkerInitiated: 'service-worker-initiated'
};

/** @type {!Array<string>} */
export const _searchKeys = Object.keys(FilterType).map(key => FilterType[key]);

/**
 * @interface
 */
export class GroupLookupInterface {
  /**
   * @param {!SDK.NetworkRequest.NetworkRequest} request
   * @return {?NetworkGroupNode}
   */
  groupNodeForRequest(request) {
  }

  reset() {
  }
}

/** @typedef {function(!SDK.NetworkRequest.NetworkRequest): boolean} */
export let Filter;
