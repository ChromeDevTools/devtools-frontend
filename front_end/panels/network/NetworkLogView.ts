// Copyright 2021 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

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

import * as Common from '../../core/common/common.js';
import * as Host from '../../core/host/host.js';
import * as i18n from '../../core/i18n/i18n.js';
import * as Platform from '../../core/platform/platform.js';
import * as Root from '../../core/root/root.js';
import * as SDK from '../../core/sdk/sdk.js';
import * as Protocol from '../../generated/protocol.js';
import * as Bindings from '../../models/bindings/bindings.js';
import * as HAR from '../../models/har/har.js';
import * as IssuesManager from '../../models/issues_manager/issues_manager.js';
import * as Logs from '../../models/logs/logs.js';
import * as Persistence from '../../models/persistence/persistence.js';
import * as TextUtils from '../../models/text_utils/text_utils.js';
import * as NetworkForward from '../../panels/network/forward/forward.js';
import * as Sources from '../../panels/sources/sources.js';
import * as DataGrid from '../../ui/legacy/components/data_grid/data_grid.js';
import * as PerfUI from '../../ui/legacy/components/perf_ui/perf_ui.js';
import * as Components from '../../ui/legacy/components/utils/utils.js';
import * as UI from '../../ui/legacy/legacy.js';
import * as ThemeSupport from '../../ui/legacy/theme_support/theme_support.js';

import networkLogViewStyles from './networkLogView.css.js';

import {
  Events,
  NetworkGroupNode,
  NetworkRequestNode,
  type NetworkLogViewInterface,
  type NetworkNode,
  type EventTypes,
} from './NetworkDataGridNode.js';
import {NetworkFrameGrouper} from './NetworkFrameGrouper.js';
import {NetworkLogViewColumns} from './NetworkLogViewColumns.js';

import {
  NetworkTimeBoundary,
  NetworkTransferDurationCalculator,
  NetworkTransferTimeCalculator,
  type NetworkTimeCalculator,
} from './NetworkTimeCalculator.js';

const UIStrings = {
  /**
   *@description Text in Network Log View of the Network panel
   */
  invertFilter: 'Invert',
  /**
   *@description Tooltip for the 'invert' checkbox in the Network panel.
   */
  invertsFilter: 'Inverts the search filter',
  /**
   *@description Text in Network Log View of the Network panel
   */
  hideDataUrls: 'Hide data URLs',
  /**
   *@description Data urlfilter ui element title in Network Log View of the Network panel
   */
  hidesDataAndBlobUrls: 'Hides data: and blob: URLs',
  /**
   *@description Aria accessible name in Network Log View of the Network panel
   */
  resourceTypesToInclude: 'Resource types to include',
  /**
   *@description Label for a filter in the Network panel
   */
  hasBlockedCookies: 'Has blocked cookies',
  /**
   *@description Tooltip for a checkbox in the Network panel. The response to a network request may include a
   *             cookie (https://developer.mozilla.org/en-US/docs/Web/HTTP/Cookies). Such response cookies can
   *             be malformed or otherwise invalid and the browser may choose to ignore or not accept invalid cookies.
   */
  onlyShowRequestsWithBlocked: 'Only show requests with blocked response cookies',
  /**
   *@description Label for a filter in the Network panel
   */
  blockedRequests: 'Blocked Requests',
  /**
   *@description Tooltip for a filter in the Network panel
   */
  onlyShowBlockedRequests: 'Only show blocked requests',
  /**
   *@description Label for a filter in the Network panel
   */
  thirdParty: '3rd-party requests',
  /**
   *@description Tooltip for a filter in the Network panel
   */
  onlyShowThirdPartyRequests: 'Shows only requests with origin different from page origin',
  /**
   *@description Text that appears when user drag and drop something (for example, a file) in Network Log View of the Network panel
   */
  dropHarFilesHere: 'Drop HAR files here',
  /**
   *@description Recording text text content in Network Log View of the Network panel
   */
  recordingNetworkActivity: 'Recording network activity…',
  /**
   *@description Text in Network Log View of the Network panel
   *@example {Ctrl + R} PH1
   */
  performARequestOrHitSToRecordThe: 'Perform a request or hit {PH1} to record the reload.',
  /**
   *@description Shown in the Network Log View of the Network panel when the user has not yet
   * recorded any network activity. This is an instruction to the user to start recording in order to
   * show network activity in the current UI.
   *@example {Ctrl + E} PH1
   */
  recordToDisplayNetworkActivity: 'Record network log ({PH1}) to display network activity.',
  /**
   *@description Text that is usually a hyperlink to more documentation
   */
  learnMore: 'Learn more',
  /**
   *@description Text to announce to screen readers that network data is available.
   */
  networkDataAvailable: 'Network Data Available',
  /**
   *@description Text in Network Log View of the Network panel
   *@example {3} PH1
   *@example {5} PH2
   */
  sSRequests: '{PH1} / {PH2} requests',
  /**
   *@description Message in the summary toolbar at the bottom of the Network log that shows the compressed size of the
   * resources transferred during a selected time frame over the compressed size of all resources transferred during
   * the whole network log.
   *@example {5 B} PH1
   *@example {10 B} PH2
   */
  sSTransferred: '{PH1} / {PH2} transferred',
  /**
   *@description Message in a tooltip that shows the compressed size of the resources transferred during a selected
   * time frame over the compressed size of all resources transferred during the whole network log.
   *@example {10} PH1
   *@example {15} PH2
   */
  sBSBTransferredOverNetwork: '{PH1} B / {PH2} B transferred over network',
  /**
   * @description Text in Network Log View of the Network panel. Appears when a particular network
   * resource is selected by the user. Shows how large the selected resource was (PH1) out of the
   * total size (PH2).
   * @example {40MB} PH1
   * @example {50MB} PH2
   */
  sSResources: '{PH1} / {PH2} resources',
  /**
   *@description Text in Network Log View of the Network panel
   *@example {40} PH1
   *@example {50} PH2
   */
  sBSBResourcesLoadedByThePage: '{PH1} B / {PH2} B resources loaded by the page',
  /**
   *@description Text in Network Log View of the Network panel
   *@example {6} PH1
   */
  sRequests: '{PH1} requests',
  /**
   *@description Message in the summary toolbar at the bottom of the Network log that shows the compressed size of
   * all resources transferred over network during a network activity log.
   *@example {4 B} PH1
   */
  sTransferred: '{PH1} transferred',
  /**
   *@description Message in a tooltip that shows the compressed size of all resources transferred over network during
   * a network activity log.
   *@example {4} PH1
   */
  sBTransferredOverNetwork: '{PH1} B transferred over network',
  /**
   *@description Text in Network Log View of the Network panel
   *@example {4} PH1
   */
  sResources: '{PH1} resources',
  /**
   *@description Text in Network Log View of the Network panel
   *@example {10} PH1
   */
  sBResourcesLoadedByThePage: '{PH1} B resources loaded by the page',
  /**
   *@description Text in Network Log View of the Network panel
   *@example {120ms} PH1
   */
  finishS: 'Finish: {PH1}',
  /**
   *@description Text in Network Log View of the Network panel
   *@example {3000ms} PH1
   */
  domcontentloadedS: 'DOMContentLoaded: {PH1}',
  /**
   *@description Text in Network Log View of the Network panel
   *@example {40ms} PH1
   */
  loadS: 'Load: {PH1}',
  /**
   *@description Text for copying
   */
  copy: 'Copy',
  /**
   *@description Text in Network Log View of the Network panel
   */
  copyRequestHeaders: 'Copy request headers',
  /**
   *@description Text in Network Log View of the Network panel
   */
  copyResponseHeaders: 'Copy response headers',
  /**
   *@description Text in Network Log View of the Network panel
   */
  copyResponse: 'Copy response',
  /**
   *@description Text in Network Log View of the Network panel
   */
  copyStacktrace: 'Copy stack trace',
  /**
   * @description A context menu command in the Network panel, for copying to the clipboard.
   * PowerShell refers to the format the data will be copied as.
   */
  copyAsPowershell: 'Copy as `PowerShell`',
  /**
   *@description A context menu command in the Network panel, for copying to the clipboard. 'fetch'
   * refers to the format the data will be copied as, which is compatible with the fetch web API.
   */
  copyAsFetch: 'Copy as `fetch`',
  /**
   * @description Text in Network Log View of the Network panel. An action that copies a command to
   * the developer's clipboard. The command allows the developer to replay this specific network
   * request in Node.js, a desktop application/framework. 'Node.js fetch' is a noun phrase for the
   * type of request that will be copied.
   */
  copyAsNodejsFetch: 'Copy as `Node.js` `fetch`',
  /**
   *@description Text in Network Log View of the Network panel. An action that copies a command to
   *the clipboard. It will copy the command in the format compatible with cURL (a program, not
   *translatable).
   */
  copyAsCurlCmd: 'Copy as `cURL` (`cmd`)',
  /**
   *@description Text in Network Log View of the Network panel. An action that copies a command to
   *the clipboard. It will copy the command in the format compatible with a Bash script.
   */
  copyAsCurlBash: 'Copy as `cURL` (`bash`)',
  /**
   *@description Text in Network Log View of the Network panel. An action that copies a command to
   *the clipboard. It will copy the command in the format compatible with a PowerShell script.
   */
  copyAllAsPowershell: 'Copy all as `PowerShell`',
  /**
   *@description Text in Network Log View of the Network panel. An action that copies a command to
   *the clipboard. It will copy the command in the format compatible with a 'fetch' command (fetch
   *should not be translated).
   */
  copyAllAsFetch: 'Copy all as `fetch`',
  /**
   *@description Text in Network Log View of the Network panel. An action that copies a command to
   *the clipboard. It will copy the command in the format compatible with a Node.js 'fetch' command
   *(fetch and Node.js should not be translated).
   */
  copyAllAsNodejsFetch: 'Copy all as `Node.js` `fetch`',
  /**
   *@description Text in Network Log View of the Network panel. An action that copies a command to
   *the clipboard. It will copy the command in the format compatible with cURL (a program, not
   *translatable).
   */
  copyAllAsCurlCmd: 'Copy all as `cURL` (`cmd`)',
  /**
   *@description Text in Network Log View of the Network panel. An action that copies a command to
   *the clipboard. It will copy the command in the format compatible with a Bash script.
   */
  copyAllAsCurlBash: 'Copy all as `cURL` (`bash`)',
  /**
   *@description Text in Network Log View of the Network panel. An action that copies a command to
   *the clipboard. It will copy the command in the format compatible with cURL (a program, not
   *translatable).
   */
  copyAsCurl: 'Copy as `cURL`',
  /**
   *@description Text in Network Log View of the Network panel. An action that copies a command to
   *the clipboard. It will copy the command in the format compatible with cURL (a program, not
   *translatable).
   */
  copyAllAsCurl: 'Copy all as `cURL`',
  /**
   * @description Text in Network Log View of the Network panel. An action that copies data to the
   * clipboard. It will copy the data in the HAR (not translatable) format. 'all' refers to every
   * network request that is currently shown.
   */
  copyAllAsHar: 'Copy all as `HAR`',
  /**
   *@description A context menu item in the Network Log View of the Network panel
   */
  saveAllAsHarWithContent: 'Save all as `HAR` with content',
  /**
   *@description A context menu item in the Network Log View of the Network panel
   */
  clearBrowserCache: 'Clear browser cache',
  /**
   *@description A context menu item in the Network Log View of the Network panel
   */
  clearBrowserCookies: 'Clear browser cookies',
  /**
   *@description A context menu item in the Network Log View of the Network panel
   */
  blockRequestUrl: 'Block request URL',
  /**
   *@description A context menu item in the Network Log View of the Network panel
   *@example {example.com} PH1
   */
  unblockS: 'Unblock {PH1}',
  /**
   *@description A context menu item in the Network Log View of the Network panel
   */
  blockRequestDomain: 'Block request domain',
  /**
   *@description Text to replay an XHR request
   */
  replayXhr: 'Replay XHR',
  /**
   *@description Text in Network Log View of the Network panel
   */
  areYouSureYouWantToClearBrowser: 'Are you sure you want to clear browser cache?',
  /**
   *@description Text in Network Log View of the Network panel
   */
  areYouSureYouWantToClearBrowserCookies: 'Are you sure you want to clear browser cookies?',
  /**
   *@description A context menu item in the Network Log View of the Network panel
   * for creating a header override
   */
  overrideHeaders: 'Override headers',
};
const str_ = i18n.i18n.registerUIStrings('panels/network/NetworkLogView.ts', UIStrings);
const i18nString = i18n.i18n.getLocalizedString.bind(undefined, str_);

const enum FetchStyle {
  Browser = 0,
  NodeJs = 1,
}

export class NetworkLogView extends Common.ObjectWrapper.eventMixin<EventTypes, typeof UI.Widget.VBox>(UI.Widget.VBox)
    implements SDK.TargetManager.SDKModelObserver<SDK.NetworkManager.NetworkManager>, NetworkLogViewInterface {
  private readonly networkInvertFilterSetting: Common.Settings.Setting<boolean>;
  private readonly networkHideDataURLSetting: Common.Settings.Setting<boolean>;
  private readonly networkShowIssuesOnlySetting: Common.Settings.Setting<boolean>;
  private readonly networkOnlyBlockedRequestsSetting: Common.Settings.Setting<boolean>;
  private readonly networkOnlyThirdPartySetting: Common.Settings.Setting<boolean>;
  private readonly networkResourceTypeFiltersSetting: Common.Settings.Setting<{[key: string]: boolean}>;
  private rawRowHeight: number;
  private readonly progressBarContainer: Element;
  private readonly networkLogLargeRowsSetting: Common.Settings.Setting<boolean>;
  private rowHeightInternal: number;
  private readonly timeCalculatorInternal: NetworkTransferTimeCalculator;
  private readonly durationCalculator: NetworkTransferDurationCalculator;
  private calculatorInternal: NetworkTransferTimeCalculator;
  private readonly columnsInternal: NetworkLogViewColumns;
  private staleRequests: Set<SDK.NetworkRequest.NetworkRequest>;
  private mainRequestLoadTime: number;
  private mainRequestDOMContentLoadedTime: number;
  private filters: Filter[];
  private timeFilter: Filter|null;
  private hoveredNodeInternal: NetworkNode|null;
  private recordingHint: Element|null;
  private refreshRequestId: number|null;
  private highlightedNode: NetworkRequestNode|null;
  private readonly linkifierInternal: Components.Linkifier.Linkifier;
  private recording: boolean;
  private needsRefresh: boolean;
  private readonly headerHeightInternal: number;
  private readonly groupLookups: Map<string, GroupLookupInterface>;
  private activeGroupLookup: GroupLookupInterface|null;
  private readonly textFilterUI: UI.FilterBar.TextFilterUI;
  private readonly invertFilterUI: UI.FilterBar.CheckboxFilterUI;
  private readonly dataURLFilterUI: UI.FilterBar.CheckboxFilterUI;
  private resourceCategoryFilterUI: UI.FilterBar.NamedBitSetFilterUI;
  private readonly onlyIssuesFilterUI: UI.FilterBar.CheckboxFilterUI;
  private readonly onlyBlockedRequestsUI: UI.FilterBar.CheckboxFilterUI;
  private readonly onlyThirdPartyFilterUI: UI.FilterBar.CheckboxFilterUI;
  private readonly filterParser: TextUtils.TextUtils.FilterParser;
  private readonly suggestionBuilder: UI.FilterSuggestionBuilder.FilterSuggestionBuilder;
  private dataGrid: DataGrid.SortableDataGrid.SortableDataGrid<NetworkNode>;
  private readonly summaryToolbar: UI.Toolbar.Toolbar;
  private readonly filterBar: UI.FilterBar.FilterBar;
  private readonly textFilterSetting: Common.Settings.Setting<string>;

  constructor(
      filterBar: UI.FilterBar.FilterBar, progressBarContainer: Element,
      networkLogLargeRowsSetting: Common.Settings.Setting<boolean>) {
    super();
    this.setMinimumSize(50, 64);

    this.element.id = 'network-container';
    this.element.classList.add('no-node-selected');

    this.networkInvertFilterSetting = Common.Settings.Settings.instance().createSetting('networkInvertFilter', false);
    this.networkHideDataURLSetting = Common.Settings.Settings.instance().createSetting('networkHideDataURL', false);
    this.networkShowIssuesOnlySetting =
        Common.Settings.Settings.instance().createSetting('networkShowIssuesOnly', false);
    this.networkOnlyBlockedRequestsSetting =
        Common.Settings.Settings.instance().createSetting('networkOnlyBlockedRequests', false);
    this.networkOnlyThirdPartySetting =
        Common.Settings.Settings.instance().createSetting('networkOnlyThirdPartySetting', false);
    this.networkResourceTypeFiltersSetting =
        Common.Settings.Settings.instance().createSetting('networkResourceTypeFilters', {});

    this.rawRowHeight = 0;
    this.progressBarContainer = progressBarContainer;
    this.networkLogLargeRowsSetting = networkLogLargeRowsSetting;
    this.networkLogLargeRowsSetting.addChangeListener(updateRowHeight.bind(this), this);

    function updateRowHeight(this: NetworkLogView): void {
      this.rawRowHeight = Boolean(this.networkLogLargeRowsSetting.get()) ? 41 : 21;
      this.rowHeightInternal = this.computeRowHeight();
    }
    this.rawRowHeight = 0;
    this.rowHeightInternal = 0;
    updateRowHeight.call(this);

    this.timeCalculatorInternal = new NetworkTransferTimeCalculator();
    this.durationCalculator = new NetworkTransferDurationCalculator();
    this.calculatorInternal = this.timeCalculatorInternal;

    this.columnsInternal = new NetworkLogViewColumns(
        this, this.timeCalculatorInternal, this.durationCalculator, networkLogLargeRowsSetting);
    this.columnsInternal.show(this.element);

    this.staleRequests = new Set();
    this.mainRequestLoadTime = -1;
    this.mainRequestDOMContentLoadedTime = -1;

    this.filters = [];
    this.timeFilter = null;
    this.hoveredNodeInternal = null;
    this.recordingHint = null;
    this.refreshRequestId = null;
    this.highlightedNode = null;

    this.linkifierInternal = new Components.Linkifier.Linkifier();

    this.recording = false;
    this.needsRefresh = false;

    this.headerHeightInternal = 0;

    this.groupLookups = new Map();
    this.groupLookups.set('Frame', new NetworkFrameGrouper(this));

    this.activeGroupLookup = null;

    this.textFilterUI = new UI.FilterBar.TextFilterUI();
    this.textFilterUI.addEventListener(UI.FilterBar.FilterUIEvents.FilterChanged, this.filterChanged, this);
    filterBar.addFilter(this.textFilterUI);

    this.invertFilterUI = new UI.FilterBar.CheckboxFilterUI(
        'invert-filter', i18nString(UIStrings.invertFilter), true, this.networkInvertFilterSetting);
    this.invertFilterUI.addEventListener(
        UI.FilterBar.FilterUIEvents.FilterChanged, this.filterChanged.bind(this), this);
    UI.Tooltip.Tooltip.install(this.invertFilterUI.element(), i18nString(UIStrings.invertsFilter));
    filterBar.addFilter(this.invertFilterUI);

    this.dataURLFilterUI = new UI.FilterBar.CheckboxFilterUI(
        'hide-data-url', i18nString(UIStrings.hideDataUrls), true, this.networkHideDataURLSetting);
    this.dataURLFilterUI.addEventListener(
        UI.FilterBar.FilterUIEvents.FilterChanged, this.filterChanged.bind(this), this);
    UI.Tooltip.Tooltip.install(this.dataURLFilterUI.element(), i18nString(UIStrings.hidesDataAndBlobUrls));
    filterBar.addFilter(this.dataURLFilterUI);

    const filterItems =
        Object.values(Common.ResourceType.resourceCategories)
            .map(
                category =>
                    ({name: category.title(), label: (): string => category.shortTitle(), title: category.title()}));
    this.resourceCategoryFilterUI =
        new UI.FilterBar.NamedBitSetFilterUI(filterItems, this.networkResourceTypeFiltersSetting);
    UI.ARIAUtils.setAccessibleName(
        this.resourceCategoryFilterUI.element(), i18nString(UIStrings.resourceTypesToInclude));
    this.resourceCategoryFilterUI.addEventListener(
        UI.FilterBar.FilterUIEvents.FilterChanged, this.filterChanged.bind(this), this);
    filterBar.addFilter(this.resourceCategoryFilterUI);

    this.onlyIssuesFilterUI = new UI.FilterBar.CheckboxFilterUI(
        'only-show-issues', i18nString(UIStrings.hasBlockedCookies), true, this.networkShowIssuesOnlySetting);
    this.onlyIssuesFilterUI.addEventListener(
        UI.FilterBar.FilterUIEvents.FilterChanged, this.filterChanged.bind(this), this);
    UI.Tooltip.Tooltip.install(this.onlyIssuesFilterUI.element(), i18nString(UIStrings.onlyShowRequestsWithBlocked));
    filterBar.addFilter(this.onlyIssuesFilterUI);

    this.onlyBlockedRequestsUI = new UI.FilterBar.CheckboxFilterUI(
        'only-show-blocked-requests', i18nString(UIStrings.blockedRequests), true,
        this.networkOnlyBlockedRequestsSetting);
    this.onlyBlockedRequestsUI.addEventListener(
        UI.FilterBar.FilterUIEvents.FilterChanged, this.filterChanged.bind(this), this);
    UI.Tooltip.Tooltip.install(this.onlyBlockedRequestsUI.element(), i18nString(UIStrings.onlyShowBlockedRequests));
    filterBar.addFilter(this.onlyBlockedRequestsUI);

    this.onlyThirdPartyFilterUI = new UI.FilterBar.CheckboxFilterUI(
        'only-show-third-party', i18nString(UIStrings.thirdParty), true, this.networkOnlyThirdPartySetting);
    this.onlyThirdPartyFilterUI.addEventListener(
        UI.FilterBar.FilterUIEvents.FilterChanged, this.filterChanged.bind(this), this);
    UI.Tooltip.Tooltip.install(this.onlyThirdPartyFilterUI.element(), i18nString(UIStrings.onlyShowThirdPartyRequests));
    filterBar.addFilter(this.onlyThirdPartyFilterUI);

    this.filterParser = new TextUtils.TextUtils.FilterParser(searchKeys);
    this.suggestionBuilder =
        new UI.FilterSuggestionBuilder.FilterSuggestionBuilder(searchKeys, NetworkLogView.sortSearchValues);
    this.resetSuggestionBuilder();

    this.dataGrid = this.columnsInternal.dataGrid();
    this.setupDataGrid();
    this.columnsInternal.sortByCurrentColumn();
    filterBar.filterButton().addEventListener(
        UI.Toolbar.ToolbarButton.Events.Click, this.dataGrid.scheduleUpdate.bind(this.dataGrid, true /* isFromUser */));

    this.summaryToolbar = new UI.Toolbar.Toolbar('network-summary-bar', this.element);
    this.summaryToolbar.element.setAttribute('role', 'status');

    new UI.DropTarget.DropTarget(
        this.element, [UI.DropTarget.Type.File], i18nString(UIStrings.dropHarFilesHere), this.handleDrop.bind(this));

    Common.Settings.Settings.instance()
        .moduleSetting('networkColorCodeResourceTypes')
        .addChangeListener(this.invalidateAllItems.bind(this, false), this);

    SDK.TargetManager.TargetManager.instance().observeModels(SDK.NetworkManager.NetworkManager, this);
    Logs.NetworkLog.NetworkLog.instance().addEventListener(
        Logs.NetworkLog.Events.RequestAdded, this.onRequestUpdated, this);
    Logs.NetworkLog.NetworkLog.instance().addEventListener(
        Logs.NetworkLog.Events.RequestUpdated, this.onRequestUpdated, this);
    Logs.NetworkLog.NetworkLog.instance().addEventListener(Logs.NetworkLog.Events.Reset, this.reset, this);

    this.updateGroupByFrame();
    Common.Settings.Settings.instance()
        .moduleSetting('network.group-by-frame')
        .addChangeListener(() => this.updateGroupByFrame());

    this.filterBar = filterBar;

    this.textFilterSetting = Common.Settings.Settings.instance().createSetting('networkTextFilter', '');
    if (this.textFilterSetting.get()) {
      this.textFilterUI.setValue(this.textFilterSetting.get());
    }
  }

  private updateGroupByFrame(): void {
    const value = Common.Settings.Settings.instance().moduleSetting('network.group-by-frame').get();
    this.setGrouping(value ? 'Frame' : null);
  }

  private static sortSearchValues(key: string, values: string[]): void {
    if (key === NetworkForward.UIFilter.FilterType.Priority) {
      values.sort((a, b) => {
        const aPriority = (PerfUI.NetworkPriorities.uiLabelToNetworkPriority(a) as Protocol.Network.ResourcePriority);
        const bPriority = (PerfUI.NetworkPriorities.uiLabelToNetworkPriority(b) as Protocol.Network.ResourcePriority);
        return PerfUI.NetworkPriorities.networkPriorityWeight(aPriority) -
            PerfUI.NetworkPriorities.networkPriorityWeight(bPriority);
      });
    } else {
      values.sort();
    }
  }

  private static negativeFilter(filter: Filter, request: SDK.NetworkRequest.NetworkRequest): boolean {
    return !filter(request);
  }

  private static requestPathFilter(regex: RegExp|null, request: SDK.NetworkRequest.NetworkRequest): boolean {
    if (!regex) {
      return false;
    }

    return regex.test(request.path() + '/' + request.name());
  }

  private static subdomains(domain: string): string[] {
    const result = [domain];
    let indexOfPeriod = domain.indexOf('.');
    while (indexOfPeriod !== -1) {
      result.push('*' + domain.substring(indexOfPeriod));
      indexOfPeriod = domain.indexOf('.', indexOfPeriod + 1);
    }
    return result;
  }

  private static createRequestDomainFilter(value: string): Filter {
    const escapedPattern = value.split('*').map(Platform.StringUtilities.escapeForRegExp).join('.*');
    return NetworkLogView.requestDomainFilter.bind(null, new RegExp('^' + escapedPattern + '$', 'i'));
  }

  private static requestDomainFilter(regex: RegExp, request: SDK.NetworkRequest.NetworkRequest): boolean {
    return regex.test(request.domain);
  }

  private static runningRequestFilter(request: SDK.NetworkRequest.NetworkRequest): boolean {
    return !request.finished;
  }

  private static fromCacheRequestFilter(request: SDK.NetworkRequest.NetworkRequest): boolean {
    return request.cached();
  }

  private static interceptedByServiceWorkerFilter(request: SDK.NetworkRequest.NetworkRequest): boolean {
    return request.fetchedViaServiceWorker;
  }

  private static initiatedByServiceWorkerFilter(request: SDK.NetworkRequest.NetworkRequest): boolean {
    return request.initiatedByServiceWorker();
  }

  private static requestResponseHeaderFilter(value: string, request: SDK.NetworkRequest.NetworkRequest): boolean {
    return request.responseHeaderValue(value) !== undefined;
  }

  private static requestResponseHeaderSetCookieFilter(value: string, request: SDK.NetworkRequest.NetworkRequest):
      boolean {
    // Multiple Set-Cookie headers in the request are concatenated via space. Only
    // filter via `includes` instead of strict equality.
    return Boolean(request.responseHeaderValue('Set-Cookie')?.includes(value));
  }

  private static requestMethodFilter(value: string, request: SDK.NetworkRequest.NetworkRequest): boolean {
    return request.requestMethod === value;
  }

  private static requestPriorityFilter(value: string, request: SDK.NetworkRequest.NetworkRequest): boolean {
    return request.priority() === value;
  }

  private static requestMimeTypeFilter(value: string, request: SDK.NetworkRequest.NetworkRequest): boolean {
    return request.mimeType === value;
  }

  private static requestMixedContentFilter(
      value: NetworkForward.UIFilter.MixedContentFilterValues, request: SDK.NetworkRequest.NetworkRequest): boolean {
    if (value === NetworkForward.UIFilter.MixedContentFilterValues.Displayed) {
      return request.mixedContentType === Protocol.Security.MixedContentType.OptionallyBlockable;
    }
    if (value === NetworkForward.UIFilter.MixedContentFilterValues.Blocked) {
      return request.mixedContentType === Protocol.Security.MixedContentType.Blockable && request.wasBlocked();
    }
    if (value === NetworkForward.UIFilter.MixedContentFilterValues.BlockOverridden) {
      return request.mixedContentType === Protocol.Security.MixedContentType.Blockable && !request.wasBlocked();
    }
    if (value === NetworkForward.UIFilter.MixedContentFilterValues.All) {
      return request.mixedContentType !== Protocol.Security.MixedContentType.None;
    }

    return false;
  }

  private static requestSchemeFilter(value: string, request: SDK.NetworkRequest.NetworkRequest): boolean {
    return request.scheme === value;
  }

  private static requestCookieDomainFilter(value: string, request: SDK.NetworkRequest.NetworkRequest): boolean {
    return request.allCookiesIncludingBlockedOnes().some(cookie => cookie.domain() === value);
  }

  private static requestCookieNameFilter(value: string, request: SDK.NetworkRequest.NetworkRequest): boolean {
    return request.allCookiesIncludingBlockedOnes().some(cookie => cookie.name() === value);
  }

  private static requestCookiePathFilter(value: string, request: SDK.NetworkRequest.NetworkRequest): boolean {
    return request.allCookiesIncludingBlockedOnes().some(cookie => cookie.path() === value);
  }

  private static requestCookieValueFilter(value: string, request: SDK.NetworkRequest.NetworkRequest): boolean {
    return request.allCookiesIncludingBlockedOnes().some(cookie => cookie.value() === value);
  }

  private static requestSetCookieDomainFilter(value: string, request: SDK.NetworkRequest.NetworkRequest): boolean {
    return request.responseCookies.some(cookie => cookie.domain() === value);
  }

  private static requestSetCookieNameFilter(value: string, request: SDK.NetworkRequest.NetworkRequest): boolean {
    return request.responseCookies.some(cookie => cookie.name() === value);
  }

  private static requestSetCookieValueFilter(value: string, request: SDK.NetworkRequest.NetworkRequest): boolean {
    return request.responseCookies.some(cookie => cookie.value() === value);
  }

  private static requestSizeLargerThanFilter(value: number, request: SDK.NetworkRequest.NetworkRequest): boolean {
    return request.transferSize >= value;
  }

  private static statusCodeFilter(value: string, request: SDK.NetworkRequest.NetworkRequest): boolean {
    return (String(request.statusCode)) === value;
  }

  static getHTTPRequestsFilter(request: SDK.NetworkRequest.NetworkRequest): boolean {
    return request.parsedURL.isValid && (request.scheme in HTTPSchemas);
  }

  private static resourceTypeFilter(value: string, request: SDK.NetworkRequest.NetworkRequest): boolean {
    return request.resourceType().name() === value;
  }

  private static requestUrlFilter(value: string, request: SDK.NetworkRequest.NetworkRequest): boolean {
    const regex = new RegExp(Platform.StringUtilities.escapeForRegExp(value), 'i');
    return regex.test(request.url());
  }

  private static requestTimeFilter(windowStart: number, windowEnd: number, request: SDK.NetworkRequest.NetworkRequest):
      boolean {
    if (request.issueTime() > windowEnd) {
      return false;
    }
    if (request.endTime !== -1 && request.endTime < windowStart) {
      return false;
    }
    return true;
  }

  private static copyRequestHeaders(request: SDK.NetworkRequest.NetworkRequest): void {
    Host.InspectorFrontendHost.InspectorFrontendHostInstance.copyText(request.requestHeadersText());
  }

  private static copyResponseHeaders(request: SDK.NetworkRequest.NetworkRequest): void {
    Host.InspectorFrontendHost.InspectorFrontendHostInstance.copyText(request.responseHeadersText);
  }

  private static async copyResponse(request: SDK.NetworkRequest.NetworkRequest): Promise<void> {
    const contentData = await request.contentData();
    let content: (string|null)|string = contentData.content || '';
    if (!request.contentType().isTextType()) {
      content = TextUtils.ContentProvider.contentAsDataURL(content, request.mimeType, contentData.encoded);
    } else if (contentData.encoded && content) {
      content = window.atob(content);
    }
    Host.InspectorFrontendHost.InspectorFrontendHostInstance.copyText(content);
  }

  private handleDrop(dataTransfer: DataTransfer): void {
    const items = dataTransfer.items;
    if (!items.length) {
      return;
    }
    const file = items[0].getAsFile();
    if (file) {
      void this.onLoadFromFile(file);
    }
  }

  async onLoadFromFile(file: File): Promise<void> {
    const outputStream = new Common.StringOutputStream.StringOutputStream();
    const reader = new Bindings.FileUtils.ChunkedFileReader(file, /* chunkSize */ 10000000);
    const success = await reader.read(outputStream);
    if (!success) {
      const error = reader.error();
      if (error) {
        this.harLoadFailed(error.message);
      }
      return;
    }
    let harRoot;
    try {
      // HARRoot and JSON.parse might throw.
      harRoot = new HAR.HARFormat.HARRoot(JSON.parse(outputStream.data()));
    } catch (e) {
      this.harLoadFailed(e);
      return;
    }
    Logs.NetworkLog.NetworkLog.instance().importRequests(HAR.Importer.Importer.requestsFromHARLog(harRoot.log));
  }

  private harLoadFailed(message: string): void {
    Common.Console.Console.instance().error('Failed to load HAR file with following error: ' + message);
  }

  private setGrouping(groupKey: string|null): void {
    if (this.activeGroupLookup) {
      this.activeGroupLookup.reset();
    }
    const groupLookup = groupKey ? this.groupLookups.get(groupKey) || null : null;
    this.activeGroupLookup = groupLookup;
    this.invalidateAllItems();
  }

  private computeRowHeight(): number {
    return Math.round(this.rawRowHeight * window.devicePixelRatio) / window.devicePixelRatio;
  }

  nodeForRequest(request: SDK.NetworkRequest.NetworkRequest): NetworkRequestNode|null {
    return networkRequestToNode.get(request) || null;
  }

  headerHeight(): number {
    return this.headerHeightInternal;
  }

  setRecording(recording: boolean): void {
    this.recording = recording;
    this.updateSummaryBar();
  }

  columns(): NetworkLogViewColumns {
    return this.columnsInternal;
  }

  modelAdded(networkManager: SDK.NetworkManager.NetworkManager): void {
    // TODO(allada) Remove dependency on networkManager and instead use NetworkLog and PageLoad for needed data.
    if (networkManager.target().parentTarget()?.type() === SDK.Target.Type.Frame) {
      return;
    }
    const resourceTreeModel = networkManager.target().model(SDK.ResourceTreeModel.ResourceTreeModel);
    if (resourceTreeModel) {
      resourceTreeModel.addEventListener(SDK.ResourceTreeModel.Events.Load, this.loadEventFired, this);
      resourceTreeModel.addEventListener(
          SDK.ResourceTreeModel.Events.DOMContentLoaded, this.domContentLoadedEventFired, this);
    }
  }

  modelRemoved(networkManager: SDK.NetworkManager.NetworkManager): void {
    if (networkManager.target().parentTarget()?.type() !== SDK.Target.Type.Frame) {
      const resourceTreeModel = networkManager.target().model(SDK.ResourceTreeModel.ResourceTreeModel);
      if (resourceTreeModel) {
        resourceTreeModel.removeEventListener(SDK.ResourceTreeModel.Events.Load, this.loadEventFired, this);
        resourceTreeModel.removeEventListener(
            SDK.ResourceTreeModel.Events.DOMContentLoaded, this.domContentLoadedEventFired, this);
      }
    }
  }

  linkifier(): Components.Linkifier.Linkifier {
    return this.linkifierInternal;
  }

  setWindow(start: number, end: number): void {
    if (!start && !end) {
      this.timeFilter = null;
      this.timeCalculatorInternal.setWindow(null);
    } else {
      this.timeFilter = NetworkLogView.requestTimeFilter.bind(null, start, end);
      this.timeCalculatorInternal.setWindow(new NetworkTimeBoundary(start, end));
    }
    this.filterRequests();
  }

  resetFocus(): void {
    this.dataGrid.element.focus();
  }

  private resetSuggestionBuilder(): void {
    this.suggestionBuilder.clear();
    this.suggestionBuilder.addItem(NetworkForward.UIFilter.FilterType.Is, NetworkForward.UIFilter.IsFilterType.Running);
    this.suggestionBuilder.addItem(
        NetworkForward.UIFilter.FilterType.Is, NetworkForward.UIFilter.IsFilterType.FromCache);
    this.suggestionBuilder.addItem(
        NetworkForward.UIFilter.FilterType.Is, NetworkForward.UIFilter.IsFilterType.ServiceWorkerIntercepted);
    this.suggestionBuilder.addItem(
        NetworkForward.UIFilter.FilterType.Is, NetworkForward.UIFilter.IsFilterType.ServiceWorkerInitiated);
    this.suggestionBuilder.addItem(NetworkForward.UIFilter.FilterType.LargerThan, '100');
    this.suggestionBuilder.addItem(NetworkForward.UIFilter.FilterType.LargerThan, '10k');
    this.suggestionBuilder.addItem(NetworkForward.UIFilter.FilterType.LargerThan, '1M');
    this.textFilterUI.setSuggestionProvider(this.suggestionBuilder.completions.bind(this.suggestionBuilder));
  }

  private filterChanged(): void {
    this.removeAllNodeHighlights();
    this.parseFilterQuery(this.textFilterUI.value(), this.invertFilterUI.checked());
    this.filterRequests();
    this.textFilterSetting.set(this.textFilterUI.value());
  }

  async resetFilter(): Promise<void> {
    this.textFilterUI.clear();
  }

  private showRecordingHint(): void {
    this.hideRecordingHint();
    this.recordingHint = this.element.createChild('div', 'network-status-pane fill');
    const hintText = this.recordingHint.createChild('div', 'recording-hint');

    if (this.recording) {
      let reloadShortcutNode: Element|null = null;
      const reloadShortcut =
          UI.ShortcutRegistry.ShortcutRegistry.instance().shortcutsForAction('inspector_main.reload')[0];
      if (reloadShortcut) {
        reloadShortcutNode = this.recordingHint.createChild('b');
        reloadShortcutNode.textContent = reloadShortcut.title();
      }

      const recordingText = hintText.createChild('span');
      recordingText.textContent = i18nString(UIStrings.recordingNetworkActivity);
      if (reloadShortcutNode) {
        hintText.createChild('br');
        hintText.appendChild(i18n.i18n.getFormatLocalizedString(
            str_, UIStrings.performARequestOrHitSToRecordThe, {PH1: reloadShortcutNode}));
      }
    } else {
      const recordNode = hintText.createChild('b');
      recordNode.textContent =
          UI.ShortcutRegistry.ShortcutRegistry.instance().shortcutTitleForAction('network.toggle-recording') || '';
      hintText.appendChild(
          i18n.i18n.getFormatLocalizedString(str_, UIStrings.recordToDisplayNetworkActivity, {PH1: recordNode}));
    }
    hintText.createChild('br');
    hintText.appendChild(UI.XLink.XLink.create(
        'https://developer.chrome.com/docs/devtools/network/?utm_source=devtools&utm_campaign=2019Q1',
        i18nString(UIStrings.learnMore)));

    this.setHidden(true);
  }

  private hideRecordingHint(): void {
    this.setHidden(false);
    if (this.recordingHint) {
      this.recordingHint.remove();
    }
    UI.ARIAUtils.alert(i18nString(UIStrings.networkDataAvailable));
    this.recordingHint = null;
  }

  private setHidden(value: boolean): void {
    this.columnsInternal.setHidden(value);
    UI.ARIAUtils.setHidden(this.summaryToolbar.element, value);
  }

  elementsToRestoreScrollPositionsFor(): Element[] {
    if (!this.dataGrid)  // Not initialized yet.
    {
      return [];
    }
    return [this.dataGrid.scrollContainer];
  }

  columnExtensionResolved(): void {
    this.invalidateAllItems(true);
  }

  private setupDataGrid(): DataGrid.SortableDataGrid.SortableDataGrid<NetworkNode> {
    this.dataGrid.setRowContextMenuCallback((contextMenu, node) => {
      const request = (node as NetworkNode).request();
      if (request) {
        this.handleContextMenuForRequest(contextMenu, request);
      }
    });
    this.dataGrid.setStickToBottom(true);
    this.dataGrid.setName('networkLog');
    this.dataGrid.setResizeMethod(DataGrid.DataGrid.ResizeMethod.Last);
    this.dataGrid.element.classList.add('network-log-grid');
    this.dataGrid.element.addEventListener('mousedown', this.dataGridMouseDown.bind(this), true);
    this.dataGrid.element.addEventListener('mousemove', this.dataGridMouseMove.bind(this), true);
    this.dataGrid.element.addEventListener('mouseleave', () => this.setHoveredNode(null), true);
    this.dataGrid.element.addEventListener('keydown', event => {
      if (event.key === 'ArrowRight' && this.dataGrid.selectedNode) {
        const initiatorLink = this.dataGrid.selectedNode.element().querySelector('span.devtools-link');
        if (initiatorLink) {
          (initiatorLink as HTMLElement).focus();
        }
      }

      if (Platform.KeyboardUtilities.isEnterOrSpaceKey(event)) {
        this.dispatchEventToListeners(Events.RequestActivated, {showPanel: true, takeFocus: true});
        event.consume(true);
      }
    });
    this.dataGrid.element.addEventListener('keyup', event => {
      if ((event.key === 'r' || event.key === 'R') && this.dataGrid.selectedNode) {
        const request = (this.dataGrid.selectedNode as NetworkNode).request();
        if (!request) {
          return;
        }

        if (SDK.NetworkManager.NetworkManager.canReplayRequest(request)) {
          SDK.NetworkManager.NetworkManager.replayRequest(request);
        }
      }
    });
    this.dataGrid.element.addEventListener('focus', this.onDataGridFocus.bind(this), true);
    this.dataGrid.element.addEventListener('blur', this.onDataGridBlur.bind(this), true);
    return this.dataGrid;
  }

  private dataGridMouseMove(event: Event): void {
    const mouseEvent = (event as MouseEvent);
    const node = (this.dataGrid.dataGridNodeFromNode((mouseEvent.target as Node)));
    const highlightInitiatorChain = mouseEvent.shiftKey;
    this.setHoveredNode(node as NetworkNode, highlightInitiatorChain);
  }

  hoveredNode(): NetworkNode|null {
    return this.hoveredNodeInternal;
  }

  private setHoveredNode(node: NetworkNode|null, highlightInitiatorChain?: boolean): void {
    if (this.hoveredNodeInternal) {
      this.hoveredNodeInternal.setHovered(false, false);
    }
    this.hoveredNodeInternal = node;
    if (this.hoveredNodeInternal) {
      this.hoveredNodeInternal.setHovered(true, Boolean(highlightInitiatorChain));
    }
  }

  private dataGridMouseDown(event: Event): void {
    const mouseEvent = (event as MouseEvent);
    if (!this.dataGrid.selectedNode && mouseEvent.button) {
      mouseEvent.consume();
    }
  }

  private updateSummaryBar(): void {
    this.hideRecordingHint();

    let transferSize = 0;
    let resourceSize = 0;
    let selectedNodeNumber = 0;
    let selectedTransferSize = 0;
    let selectedResourceSize = 0;
    let baseTime = -1;
    let maxTime = -1;

    let nodeCount = 0;
    for (const request of Logs.NetworkLog.NetworkLog.instance().requests()) {
      const node = networkRequestToNode.get(request);
      if (!node) {
        continue;
      }
      nodeCount++;
      const requestTransferSize = request.transferSize;
      transferSize += requestTransferSize;
      const requestResourceSize = request.resourceSize;
      resourceSize += requestResourceSize;
      if (!filteredNetworkRequests.has(node)) {
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
      this.showRecordingHint();
      return;
    }

    this.summaryToolbar.removeToolbarItems();
    const appendChunk = (chunk: string, title?: string): HTMLDivElement => {
      const toolbarText = new UI.Toolbar.ToolbarText(chunk);
      toolbarText.setTitle(title ? title : chunk);
      this.summaryToolbar.appendToolbarItem(toolbarText);
      return toolbarText.element as HTMLDivElement;
    };

    if (selectedNodeNumber !== nodeCount) {
      appendChunk(i18nString(UIStrings.sSRequests, {PH1: selectedNodeNumber, PH2: nodeCount}));
      this.summaryToolbar.appendSeparator();
      appendChunk(
          i18nString(UIStrings.sSTransferred, {
            PH1: Platform.NumberUtilities.bytesToString(selectedTransferSize),
            PH2: Platform.NumberUtilities.bytesToString(transferSize),
          }),
          i18nString(UIStrings.sBSBTransferredOverNetwork, {PH1: selectedTransferSize, PH2: transferSize}));
      this.summaryToolbar.appendSeparator();
      appendChunk(
          i18nString(UIStrings.sSResources, {
            PH1: Platform.NumberUtilities.bytesToString(selectedResourceSize),
            PH2: Platform.NumberUtilities.bytesToString(resourceSize),
          }),
          i18nString(UIStrings.sBSBResourcesLoadedByThePage, {PH1: selectedResourceSize, PH2: resourceSize}));
    } else {
      appendChunk(i18nString(UIStrings.sRequests, {PH1: nodeCount}));
      this.summaryToolbar.appendSeparator();
      appendChunk(
          i18nString(UIStrings.sTransferred, {PH1: Platform.NumberUtilities.bytesToString(transferSize)}),
          i18nString(UIStrings.sBTransferredOverNetwork, {PH1: transferSize}));
      this.summaryToolbar.appendSeparator();
      appendChunk(
          i18nString(UIStrings.sResources, {PH1: Platform.NumberUtilities.bytesToString(resourceSize)}),
          i18nString(UIStrings.sBResourcesLoadedByThePage, {PH1: resourceSize}));
    }

    if (baseTime !== -1 && maxTime !== -1) {
      this.summaryToolbar.appendSeparator();
      appendChunk(i18nString(UIStrings.finishS, {PH1: i18n.TimeUtilities.secondsToString(maxTime - baseTime)}));
      if (this.mainRequestDOMContentLoadedTime !== -1 && this.mainRequestDOMContentLoadedTime > baseTime) {
        this.summaryToolbar.appendSeparator();
        const domContentLoadedText = i18nString(
            UIStrings.domcontentloadedS,
            {PH1: i18n.TimeUtilities.secondsToString(this.mainRequestDOMContentLoadedTime - baseTime)});
        appendChunk(domContentLoadedText).style.color = NetworkLogView.getDCLEventColor();
      }
      if (this.mainRequestLoadTime !== -1) {
        this.summaryToolbar.appendSeparator();
        const loadText =
            i18nString(UIStrings.loadS, {PH1: i18n.TimeUtilities.secondsToString(this.mainRequestLoadTime - baseTime)});
        appendChunk(loadText).style.color = NetworkLogView.getLoadEventColor();
      }
    }
  }

  scheduleRefresh(): void {
    if (this.needsRefresh) {
      return;
    }

    this.needsRefresh = true;

    if (this.isShowing() && !this.refreshRequestId) {
      this.refreshRequestId = this.element.window().requestAnimationFrame(this.refresh.bind(this));
    }
  }

  addFilmStripFrames(times: number[]): void {
    this.columnsInternal.addEventDividers(times, 'network-frame-divider');
  }

  selectFilmStripFrame(time: number): void {
    this.columnsInternal.selectFilmStripFrame(time);
  }

  clearFilmStripFrame(): void {
    this.columnsInternal.clearFilmStripFrame();
  }

  private refreshIfNeeded(): void {
    if (this.needsRefresh) {
      this.refresh();
    }
  }

  private invalidateAllItems(deferUpdate?: boolean): void {
    this.staleRequests = new Set(Logs.NetworkLog.NetworkLog.instance().requests());
    if (deferUpdate) {
      this.scheduleRefresh();
    } else {
      this.refresh();
    }
  }

  timeCalculator(): NetworkTimeCalculator {
    return this.timeCalculatorInternal;
  }

  calculator(): NetworkTimeCalculator {
    return this.calculatorInternal;
  }

  setCalculator(x: NetworkTimeCalculator): void {
    if (!x || this.calculatorInternal === x) {
      return;
    }

    if (this.calculatorInternal !== x) {
      this.calculatorInternal = x;
      this.columnsInternal.setCalculator(this.calculatorInternal);
    }
    this.calculatorInternal.reset();

    if (this.calculatorInternal.startAtZero) {
      this.columnsInternal.hideEventDividers();
    } else {
      this.columnsInternal.showEventDividers();
    }

    this.invalidateAllItems();
  }

  private loadEventFired(
      event: Common.EventTarget
          .EventTargetEvent<{resourceTreeModel: SDK.ResourceTreeModel.ResourceTreeModel, loadTime: number}>): void {
    if (!this.recording) {
      return;
    }

    const time = event.data.loadTime;
    if (time) {
      this.mainRequestLoadTime = time;
      this.columnsInternal.addEventDividers([time], 'network-load-divider');
    }
  }

  private domContentLoadedEventFired(event: Common.EventTarget.EventTargetEvent<number>): void {
    if (!this.recording) {
      return;
    }
    const {data} = event;
    if (data) {
      this.mainRequestDOMContentLoadedTime = data;
      this.columnsInternal.addEventDividers([data], 'network-dcl-divider');
    }
  }

  wasShown(): void {
    this.refreshIfNeeded();
    this.registerCSSFiles([networkLogViewStyles]);
    this.columnsInternal.wasShown();
  }

  willHide(): void {
    this.columnsInternal.willHide();
  }

  onResize(): void {
    this.rowHeightInternal = this.computeRowHeight();
  }

  flatNodesList(): NetworkNode[] {
    const rootNode =
        (this.dataGrid.rootNode() as
         DataGrid.ViewportDataGrid.ViewportDataGridNode<DataGrid.SortableDataGrid.SortableDataGridNode<NetworkNode>>);
    return rootNode.flatChildren() as NetworkNode[];
  }

  private onDataGridFocus(): void {
    if (this.dataGrid.element.matches(':focus-visible')) {
      this.element.classList.add('grid-focused');
    }
    this.updateNodeBackground();
  }

  private onDataGridBlur(): void {
    this.element.classList.remove('grid-focused');
    this.updateNodeBackground();
  }

  updateNodeBackground(): void {
    if (this.dataGrid.selectedNode) {
      (this.dataGrid.selectedNode as NetworkNode).updateBackgroundColor();
    }
  }

  updateNodeSelectedClass(isSelected: boolean): void {
    if (isSelected) {
      this.element.classList.remove('no-node-selected');
    } else {
      this.element.classList.add('no-node-selected');
    }
  }

  stylesChanged(): void {
    this.columnsInternal.scheduleRefresh();
  }

  private refresh(): void {
    this.needsRefresh = false;

    if (this.refreshRequestId) {
      this.element.window().cancelAnimationFrame(this.refreshRequestId);
      this.refreshRequestId = null;
    }

    this.removeAllNodeHighlights();

    this.timeCalculatorInternal.updateBoundariesForEventTime(this.mainRequestLoadTime);
    this.durationCalculator.updateBoundariesForEventTime(this.mainRequestLoadTime);
    this.timeCalculatorInternal.updateBoundariesForEventTime(this.mainRequestDOMContentLoadedTime);
    this.durationCalculator.updateBoundariesForEventTime(this.mainRequestDOMContentLoadedTime);

    const nodesToInsert = new Map<NetworkNode, NetworkNode>();
    const nodesToRefresh: NetworkNode[] = [];

    const staleNodes = new Set<NetworkRequestNode>();

    // While creating nodes it may add more entries into staleRequests because redirect request nodes update the parent
    // node so we loop until we have no more stale requests.
    while (this.staleRequests.size) {
      const request = this.staleRequests.values().next().value;
      this.staleRequests.delete(request);
      let node = networkRequestToNode.get(request);
      if (!node) {
        node = this.createNodeForRequest(request);
      }
      staleNodes.add(node);
    }

    for (const node of staleNodes) {
      const isFilteredOut = !this.applyFilter(node);
      if (isFilteredOut && node === this.hoveredNodeInternal) {
        this.setHoveredNode(null);
      }

      if (!isFilteredOut) {
        nodesToRefresh.push(node);
      }
      const request = node.request();
      this.timeCalculatorInternal.updateBoundaries(request);
      this.durationCalculator.updateBoundaries(request);
      const newParent = this.parentNodeForInsert(node);
      const wasAlreadyFiltered = filteredNetworkRequests.has(node);
      if (wasAlreadyFiltered === isFilteredOut && node.parent === newParent) {
        continue;
      }
      if (isFilteredOut) {
        filteredNetworkRequests.add(node);
      } else {
        filteredNetworkRequests.delete(node);
      }
      const removeFromParent = node.parent && (isFilteredOut || node.parent !== newParent);
      if (removeFromParent) {
        let parent: NetworkNode|
            (DataGrid.DataGrid.DataGridNode<DataGrid.ViewportDataGrid.ViewportDataGridNode<
                 DataGrid.SortableDataGrid.SortableDataGridNode<NetworkNode>>>|
             null) = node.parent;
        if (!parent) {
          continue;
        }
        parent.removeChild(node);
        while (parent && !parent.hasChildren() && parent.dataGrid && parent.dataGrid.rootNode() !== parent) {
          const grandparent = (parent.parent as NetworkNode);
          grandparent.removeChild(parent);
          parent = grandparent;
        }
      }

      if (!newParent || isFilteredOut) {
        continue;
      }

      if (!newParent.dataGrid && !nodesToInsert.has(newParent)) {
        nodesToInsert.set(newParent, (this.dataGrid.rootNode() as NetworkNode));
        nodesToRefresh.push(newParent);
      }
      nodesToInsert.set(node, newParent);
    }

    for (const node of nodesToInsert.keys()) {
      (nodesToInsert.get(node) as NetworkNode).appendChild(node);
    }

    for (const node of nodesToRefresh) {
      node.refresh();
    }

    this.updateSummaryBar();

    if (nodesToInsert.size) {
      this.columnsInternal.sortByCurrentColumn();
    }

    this.dataGrid.updateInstantly();
    this.didRefreshForTest();
  }

  private didRefreshForTest(): void {
  }

  private parentNodeForInsert(node: NetworkRequestNode): NetworkNode|null {
    if (!this.activeGroupLookup) {
      return this.dataGrid.rootNode() as NetworkNode;
    }

    const groupNode = this.activeGroupLookup.groupNodeForRequest(node.request());
    if (!groupNode) {
      return this.dataGrid.rootNode() as NetworkNode;
    }
    return groupNode;
  }

  private reset(): void {
    this.dispatchEventToListeners(Events.RequestActivated, {showPanel: false});

    this.setHoveredNode(null);
    this.columnsInternal.reset();

    this.timeFilter = null;
    this.calculatorInternal.reset();

    this.timeCalculatorInternal.setWindow(null);
    this.linkifierInternal.reset();

    if (this.activeGroupLookup) {
      this.activeGroupLookup.reset();
    }
    this.staleRequests.clear();
    this.resetSuggestionBuilder();

    this.mainRequestLoadTime = -1;
    this.mainRequestDOMContentLoadedTime = -1;

    this.dataGrid.rootNode().removeChildren();
    this.updateSummaryBar();
    this.dataGrid.setStickToBottom(true);
    this.scheduleRefresh();
  }

  setTextFilterValue(filterString: string): void {
    this.textFilterUI.setValue(filterString);
    this.dataURLFilterUI.setChecked(false);
    this.onlyIssuesFilterUI.setChecked(false);
    this.onlyBlockedRequestsUI.setChecked(false);
    this.resourceCategoryFilterUI.reset();
  }

  private createNodeForRequest(request: SDK.NetworkRequest.NetworkRequest): NetworkRequestNode {
    const node = new NetworkRequestNode(this, request);
    networkRequestToNode.set(request, node);
    filteredNetworkRequests.add(node);

    for (let redirect = request.redirectSource(); redirect; redirect = redirect.redirectSource()) {
      this.refreshRequest(redirect);
    }
    return node;
  }

  private onRequestUpdated(event: Common.EventTarget.EventTargetEvent<SDK.NetworkRequest.NetworkRequest>): void {
    const request = event.data;
    this.refreshRequest(request);
  }

  private refreshRequest(request: SDK.NetworkRequest.NetworkRequest): void {
    NetworkLogView.subdomains(request.domain)
        .forEach(
            this.suggestionBuilder.addItem.bind(this.suggestionBuilder, NetworkForward.UIFilter.FilterType.Domain));
    this.suggestionBuilder.addItem(NetworkForward.UIFilter.FilterType.Method, request.requestMethod);
    this.suggestionBuilder.addItem(NetworkForward.UIFilter.FilterType.MimeType, request.mimeType);
    this.suggestionBuilder.addItem(NetworkForward.UIFilter.FilterType.Scheme, String(request.scheme));
    this.suggestionBuilder.addItem(NetworkForward.UIFilter.FilterType.StatusCode, String(request.statusCode));
    this.suggestionBuilder.addItem(NetworkForward.UIFilter.FilterType.ResourceType, request.resourceType().name());
    this.suggestionBuilder.addItem(NetworkForward.UIFilter.FilterType.Url, request.securityOrigin());

    const priority = request.priority();
    if (priority) {
      this.suggestionBuilder.addItem(
          NetworkForward.UIFilter.FilterType.Priority, PerfUI.NetworkPriorities.uiLabelForNetworkPriority(priority));
    }

    if (request.mixedContentType !== Protocol.Security.MixedContentType.None) {
      this.suggestionBuilder.addItem(
          NetworkForward.UIFilter.FilterType.MixedContent, NetworkForward.UIFilter.MixedContentFilterValues.All);
    }

    if (request.mixedContentType === Protocol.Security.MixedContentType.OptionallyBlockable) {
      this.suggestionBuilder.addItem(
          NetworkForward.UIFilter.FilterType.MixedContent, NetworkForward.UIFilter.MixedContentFilterValues.Displayed);
    }

    if (request.mixedContentType === Protocol.Security.MixedContentType.Blockable) {
      const suggestion = request.wasBlocked() ? NetworkForward.UIFilter.MixedContentFilterValues.Blocked :
                                                NetworkForward.UIFilter.MixedContentFilterValues.BlockOverridden;
      this.suggestionBuilder.addItem(NetworkForward.UIFilter.FilterType.MixedContent, suggestion);
    }

    const responseHeaders = request.responseHeaders;
    for (const responseHeader of responseHeaders) {
      this.suggestionBuilder.addItem(NetworkForward.UIFilter.FilterType.HasResponseHeader, responseHeader.name);
      if (responseHeader.name === 'Set-Cookie') {
        this.suggestionBuilder.addItem(NetworkForward.UIFilter.FilterType.ResponseHeaderValueSetCookie);
      }
    }

    for (const cookie of request.responseCookies) {
      this.suggestionBuilder.addItem(NetworkForward.UIFilter.FilterType.SetCookieDomain, cookie.domain());
      this.suggestionBuilder.addItem(NetworkForward.UIFilter.FilterType.SetCookieName, cookie.name());
      this.suggestionBuilder.addItem(NetworkForward.UIFilter.FilterType.SetCookieValue, cookie.value());
    }

    for (const cookie of request.allCookiesIncludingBlockedOnes()) {
      this.suggestionBuilder.addItem(NetworkForward.UIFilter.FilterType.CookieDomain, cookie.domain());
      this.suggestionBuilder.addItem(NetworkForward.UIFilter.FilterType.CookieName, cookie.name());
      this.suggestionBuilder.addItem(NetworkForward.UIFilter.FilterType.CookiePath, cookie.path());
      this.suggestionBuilder.addItem(NetworkForward.UIFilter.FilterType.CookieValue, cookie.value());
    }

    this.staleRequests.add(request);
    this.scheduleRefresh();
  }

  rowHeight(): number {
    return this.rowHeightInternal;
  }

  switchViewMode(gridMode: boolean): void {
    this.columnsInternal.switchViewMode(gridMode);
  }

  handleContextMenuForRequest(contextMenu: UI.ContextMenu.ContextMenu, request: SDK.NetworkRequest.NetworkRequest):
      void {
    contextMenu.appendApplicableItems(request);
    let copyMenu = contextMenu.clipboardSection().appendSubMenuItem(i18nString(UIStrings.copy));
    const footerSection = copyMenu.footerSection();
    if (request) {
      copyMenu.defaultSection().appendItem(
          UI.UIUtils.copyLinkAddressLabel(),
          Host.InspectorFrontendHost.InspectorFrontendHostInstance.copyText.bind(
              Host.InspectorFrontendHost.InspectorFrontendHostInstance, request.contentURL()));
      if (request.requestHeadersText()) {
        copyMenu.defaultSection().appendItem(
            i18nString(UIStrings.copyRequestHeaders), NetworkLogView.copyRequestHeaders.bind(null, request));
      }

      if (request.responseHeadersText) {
        copyMenu.defaultSection().appendItem(
            i18nString(UIStrings.copyResponseHeaders), NetworkLogView.copyResponseHeaders.bind(null, request));
      }

      if (request.finished) {
        copyMenu.defaultSection().appendItem(
            i18nString(UIStrings.copyResponse), NetworkLogView.copyResponse.bind(null, request));
      }

      const initiator = request.initiator();

      if (initiator) {
        const stack = initiator.stack;
        if (stack) {
          // We proactively compute the stacktrace text, as we can't determine whether the stacktrace
          // has any context solely based on the top frame. Sometimes, the top frame does not have
          // any callFrames, but its parent frames do.
          const stackTraceText = computeStackTraceText(stack);
          if (stackTraceText !== '') {
            copyMenu.defaultSection().appendItem(i18nString(UIStrings.copyStacktrace), () => {
              Host.InspectorFrontendHost.InspectorFrontendHostInstance.copyText(stackTraceText);
            });
          }
        }
      }

      const disableIfBlob = request.isBlobRequest();
      if (Host.Platform.isWin()) {
        footerSection.appendItem(
            i18nString(UIStrings.copyAsPowershell), this.copyPowerShellCommand.bind(this, request), disableIfBlob);
        footerSection.appendItem(
            i18nString(UIStrings.copyAsFetch), this.copyFetchCall.bind(this, request, FetchStyle.Browser),
            disableIfBlob);
        footerSection.appendItem(
            i18nString(UIStrings.copyAsNodejsFetch), this.copyFetchCall.bind(this, request, FetchStyle.NodeJs),
            disableIfBlob);
        footerSection.appendItem(
            i18nString(UIStrings.copyAsCurlCmd), this.copyCurlCommand.bind(this, request, 'win'), disableIfBlob);
        footerSection.appendItem(
            i18nString(UIStrings.copyAsCurlBash), this.copyCurlCommand.bind(this, request, 'unix'), disableIfBlob);
        footerSection.appendItem(i18nString(UIStrings.copyAllAsPowershell), this.copyAllPowerShellCommand.bind(this));
        footerSection.appendItem(
            i18nString(UIStrings.copyAllAsFetch), this.copyAllFetchCall.bind(this, FetchStyle.Browser));
        footerSection.appendItem(
            i18nString(UIStrings.copyAllAsNodejsFetch), this.copyAllFetchCall.bind(this, FetchStyle.NodeJs));
        footerSection.appendItem(i18nString(UIStrings.copyAllAsCurlCmd), this.copyAllCurlCommand.bind(this, 'win'));
        footerSection.appendItem(i18nString(UIStrings.copyAllAsCurlBash), this.copyAllCurlCommand.bind(this, 'unix'));
      } else {
        footerSection.appendItem(
            i18nString(UIStrings.copyAsPowershell), this.copyPowerShellCommand.bind(this, request), disableIfBlob);
        footerSection.appendItem(
            i18nString(UIStrings.copyAsFetch), this.copyFetchCall.bind(this, request, FetchStyle.Browser),
            disableIfBlob);
        footerSection.appendItem(
            i18nString(UIStrings.copyAsNodejsFetch), this.copyFetchCall.bind(this, request, FetchStyle.NodeJs),
            disableIfBlob);
        footerSection.appendItem(
            i18nString(UIStrings.copyAsCurl), this.copyCurlCommand.bind(this, request, 'unix'), disableIfBlob);
        footerSection.appendItem(i18nString(UIStrings.copyAllAsPowershell), this.copyAllPowerShellCommand.bind(this));
        footerSection.appendItem(
            i18nString(UIStrings.copyAllAsFetch), this.copyAllFetchCall.bind(this, FetchStyle.Browser));
        footerSection.appendItem(
            i18nString(UIStrings.copyAllAsNodejsFetch), this.copyAllFetchCall.bind(this, FetchStyle.NodeJs));
        footerSection.appendItem(i18nString(UIStrings.copyAllAsCurl), this.copyAllCurlCommand.bind(this, 'unix'));
      }
    } else {
      copyMenu = contextMenu.clipboardSection().appendSubMenuItem(i18nString(UIStrings.copy));
    }
    footerSection.appendItem(i18nString(UIStrings.copyAllAsHar), this.copyAll.bind(this));

    contextMenu.saveSection().appendItem(i18nString(UIStrings.saveAllAsHarWithContent), this.exportAll.bind(this));
    if (Root.Runtime.experiments.isEnabled(Root.Runtime.ExperimentName.HEADER_OVERRIDES)) {
      contextMenu.saveSection().appendItem(
          i18nString(UIStrings.overrideHeaders), this.#handleCreateResponseHeaderOverrideClick.bind(this, request));
    }

    contextMenu.editSection().appendItem(i18nString(UIStrings.clearBrowserCache), this.clearBrowserCache.bind(this));
    contextMenu.editSection().appendItem(
        i18nString(UIStrings.clearBrowserCookies), this.clearBrowserCookies.bind(this));

    if (request) {
      const maxBlockedURLLength = 20;
      const manager = SDK.NetworkManager.MultitargetNetworkManager.instance();
      let patterns = manager.blockedPatterns();

      function addBlockedURL(url: string): void {
        patterns.push({enabled: true, url: url as Platform.DevToolsPath.UrlString});
        manager.setBlockedPatterns(patterns);
        manager.setBlockingEnabled(true);
        void UI.ViewManager.ViewManager.instance().showView('network.blocked-urls');
      }

      function removeBlockedURL(url: string): void {
        patterns = patterns.filter(pattern => pattern.url !== url);
        manager.setBlockedPatterns(patterns);
        void UI.ViewManager.ViewManager.instance().showView('network.blocked-urls');
      }

      const urlWithoutScheme = request.parsedURL.urlWithoutScheme();
      if (urlWithoutScheme && !patterns.find(pattern => pattern.url === urlWithoutScheme)) {
        contextMenu.debugSection().appendItem(
            i18nString(UIStrings.blockRequestUrl), addBlockedURL.bind(null, urlWithoutScheme));
      } else if (urlWithoutScheme) {
        const croppedURL = Platform.StringUtilities.trimMiddle(urlWithoutScheme, maxBlockedURLLength);
        contextMenu.debugSection().appendItem(
            i18nString(UIStrings.unblockS, {PH1: croppedURL}), removeBlockedURL.bind(null, urlWithoutScheme));
      }

      const domain = request.parsedURL.domain();
      if (domain && !patterns.find(pattern => pattern.url === domain)) {
        contextMenu.debugSection().appendItem(
            i18nString(UIStrings.blockRequestDomain), addBlockedURL.bind(null, domain));
      } else if (domain) {
        const croppedDomain = Platform.StringUtilities.trimMiddle(domain, maxBlockedURLLength);
        contextMenu.debugSection().appendItem(
            i18nString(UIStrings.unblockS, {PH1: croppedDomain}), removeBlockedURL.bind(null, domain));
      }

      if (SDK.NetworkManager.NetworkManager.canReplayRequest(request)) {
        contextMenu.debugSection().appendItem(
            i18nString(UIStrings.replayXhr), SDK.NetworkManager.NetworkManager.replayRequest.bind(null, request));
      }
    }
  }

  private harRequests(): SDK.NetworkRequest.NetworkRequest[] {
    return Logs.NetworkLog.NetworkLog.instance()
        .requests()
        .filter(NetworkLogView.getHTTPRequestsFilter)
        .filter(request => {
          return request.finished ||
              (request.resourceType() === Common.ResourceType.resourceTypes.WebSocket && request.responseReceivedTime);
        });
  }

  private async copyAll(): Promise<void> {
    const harArchive = {log: await HAR.Log.Log.build(this.harRequests())};
    Host.InspectorFrontendHost.InspectorFrontendHostInstance.copyText(JSON.stringify(harArchive, null, 2));
  }

  private async copyCurlCommand(request: SDK.NetworkRequest.NetworkRequest, platform: string): Promise<void> {
    const command = await NetworkLogView.generateCurlCommand(request, platform);
    Host.InspectorFrontendHost.InspectorFrontendHostInstance.copyText(command);
  }

  private async copyAllCurlCommand(platform: string): Promise<void> {
    const commands = await this.generateAllCurlCommand(Logs.NetworkLog.NetworkLog.instance().requests(), platform);
    Host.InspectorFrontendHost.InspectorFrontendHostInstance.copyText(commands);
  }

  private async copyFetchCall(request: SDK.NetworkRequest.NetworkRequest, style: FetchStyle): Promise<void> {
    const command = await this.generateFetchCall(request, style);
    Host.InspectorFrontendHost.InspectorFrontendHostInstance.copyText(command);
  }

  private async copyAllFetchCall(style: FetchStyle): Promise<void> {
    const commands = await this.generateAllFetchCall(Logs.NetworkLog.NetworkLog.instance().requests(), style);
    Host.InspectorFrontendHost.InspectorFrontendHostInstance.copyText(commands);
  }

  private async copyPowerShellCommand(request: SDK.NetworkRequest.NetworkRequest): Promise<void> {
    const command = await this.generatePowerShellCommand(request);
    Host.InspectorFrontendHost.InspectorFrontendHostInstance.copyText(command);
  }

  private async copyAllPowerShellCommand(): Promise<void> {
    const commands = await this.generateAllPowerShellCommand(Logs.NetworkLog.NetworkLog.instance().requests());
    Host.InspectorFrontendHost.InspectorFrontendHostInstance.copyText(commands);
  }

  async exportAll(): Promise<void> {
    const mainTarget = SDK.TargetManager.TargetManager.instance().mainFrameTarget();
    if (!mainTarget) {
      return;
    }
    const url = mainTarget.inspectedURL();
    const parsedURL = Common.ParsedURL.ParsedURL.fromString(url);
    const filename = (parsedURL ? parsedURL.host : 'network-log') as Platform.DevToolsPath.RawPathString;
    const stream = new Bindings.FileUtils.FileOutputStream();

    if (!await stream.open(Common.ParsedURL.ParsedURL.concatenate(filename, '.har'))) {
      return;
    }

    const progressIndicator = new UI.ProgressIndicator.ProgressIndicator();
    this.progressBarContainer.appendChild(progressIndicator.element);
    await HAR.Writer.Writer.write(stream, this.harRequests(), progressIndicator);
    progressIndicator.done();
    void stream.close();
  }

  async #handleCreateResponseHeaderOverrideClick(request: SDK.NetworkRequest.NetworkRequest): Promise<void> {
    const requestLocation =
        NetworkForward.UIRequestLocation.UIRequestLocation.responseHeaderMatch(request, {name: '', value: ''});
    const networkPersistanceManager = Persistence.NetworkPersistenceManager.NetworkPersistenceManager.instance();
    if (networkPersistanceManager.project()) {
      Common.Settings.Settings.instance().moduleSetting('persistenceNetworkOverridesEnabled').set(true);
      await networkPersistanceManager.getOrCreateHeadersUISourceCodeFromUrl(request.url());
      await Common.Revealer.reveal(requestLocation);
    } else {  // If folder for local overrides has not been provided yet
      UI.InspectorView.InspectorView.instance().displaySelectOverrideFolderInfobar(async(): Promise<void> => {
        await Sources.SourcesNavigator.OverridesNavigatorView.instance().setupNewWorkspace();
        await networkPersistanceManager.getOrCreateHeadersUISourceCodeFromUrl(request.url());
        await Common.Revealer.reveal(requestLocation);
      });
    }
  }

  private clearBrowserCache(): void {
    if (confirm(i18nString(UIStrings.areYouSureYouWantToClearBrowser))) {
      SDK.NetworkManager.MultitargetNetworkManager.instance().clearBrowserCache();
    }
  }

  private clearBrowserCookies(): void {
    if (confirm(i18nString(UIStrings.areYouSureYouWantToClearBrowserCookies))) {
      SDK.NetworkManager.MultitargetNetworkManager.instance().clearBrowserCookies();
    }
  }

  private removeAllHighlights(): void {
    this.removeAllNodeHighlights();
  }

  private applyFilter(node: NetworkRequestNode): boolean {
    const request = node.request();
    if (this.timeFilter && !this.timeFilter(request)) {
      return false;
    }
    const categoryName = request.resourceType().category().title();
    if (!this.resourceCategoryFilterUI.accept(categoryName)) {
      return false;
    }
    if (this.dataURLFilterUI.checked() && (request.parsedURL.isDataURL() || request.parsedURL.isBlobURL())) {
      return false;
    }
    if (this.onlyIssuesFilterUI.checked() &&
        !IssuesManager.RelatedIssue.hasIssueOfCategory(request, IssuesManager.Issue.IssueCategory.Cookie)) {
      return false;
    }
    if (this.onlyBlockedRequestsUI.checked() && !request.wasBlocked() && !request.corsErrorStatus()) {
      return false;
    }
    if (this.onlyThirdPartyFilterUI.checked() && request.isSameSite()) {
      return false;
    }
    for (let i = 0; i < this.filters.length; ++i) {
      if (!this.filters[i](request)) {
        return false;
      }
    }
    return true;
  }

  private isValidUrl(url: string): boolean {
    try {
      new URL(url);
      return true;
    } catch (e) {
      return false;
    }
  }

  private parseFilterQuery(query: string, invert: boolean): void {
    // A query string can have multiple filters, some of them regular
    // expressions, some not. Each one of those filters can be negated with a
    // "-" prefix, including the regular expressions. The top-level `invert`
    // checkbox therefore inverts each one of those individual filters.
    const descriptors = this.filterParser.parse(query);
    this.filters = descriptors.map(descriptor => {
      const key = descriptor.key;
      const text = descriptor.text || '';
      const regex = descriptor.regex;
      let filter;
      if (key) {
        const defaultText = Platform.StringUtilities.escapeForRegExp(key + ':' + text);
        filter = this.createSpecialFilter((key as NetworkForward.UIFilter.FilterType), text) ||
            NetworkLogView.requestPathFilter.bind(null, new RegExp(defaultText, 'i'));
      } else if (descriptor.regex) {
        filter = NetworkLogView.requestPathFilter.bind(null, (regex as RegExp));
      } else if (this.isValidUrl(text)) {
        filter = NetworkLogView.requestUrlFilter.bind(null, text);
      } else {
        filter = NetworkLogView.requestPathFilter.bind(
            null, new RegExp(Platform.StringUtilities.escapeForRegExp(text), 'i'));
      }
      if ((descriptor.negative && !invert) || (!descriptor.negative && invert)) {
        return NetworkLogView.negativeFilter.bind(null, filter);
      }
      return filter;
    });
  }

  private createSpecialFilter(type: NetworkForward.UIFilter.FilterType, value: string): Filter|null {
    switch (type) {
      case NetworkForward.UIFilter.FilterType.Domain:
        return NetworkLogView.createRequestDomainFilter(value);

      case NetworkForward.UIFilter.FilterType.HasResponseHeader:
        return NetworkLogView.requestResponseHeaderFilter.bind(null, value);

      case NetworkForward.UIFilter.FilterType.ResponseHeaderValueSetCookie:
        return NetworkLogView.requestResponseHeaderSetCookieFilter.bind(null, value);

      case NetworkForward.UIFilter.FilterType.Is:
        if (value.toLowerCase() === NetworkForward.UIFilter.IsFilterType.Running) {
          return NetworkLogView.runningRequestFilter;
        }
        if (value.toLowerCase() === NetworkForward.UIFilter.IsFilterType.FromCache) {
          return NetworkLogView.fromCacheRequestFilter;
        }
        if (value.toLowerCase() === NetworkForward.UIFilter.IsFilterType.ServiceWorkerIntercepted) {
          return NetworkLogView.interceptedByServiceWorkerFilter;
        }
        if (value.toLowerCase() === NetworkForward.UIFilter.IsFilterType.ServiceWorkerInitiated) {
          return NetworkLogView.initiatedByServiceWorkerFilter;
        }
        break;

      case NetworkForward.UIFilter.FilterType.LargerThan:
        return this.createSizeFilter(value.toLowerCase());

      case NetworkForward.UIFilter.FilterType.Method:
        return NetworkLogView.requestMethodFilter.bind(null, value);

      case NetworkForward.UIFilter.FilterType.MimeType:
        return NetworkLogView.requestMimeTypeFilter.bind(null, value);

      case NetworkForward.UIFilter.FilterType.MixedContent:
        return NetworkLogView.requestMixedContentFilter.bind(
            null, (value as NetworkForward.UIFilter.MixedContentFilterValues));

      case NetworkForward.UIFilter.FilterType.Scheme:
        return NetworkLogView.requestSchemeFilter.bind(null, value);

      case NetworkForward.UIFilter.FilterType.SetCookieDomain:
        return NetworkLogView.requestSetCookieDomainFilter.bind(null, value);

      case NetworkForward.UIFilter.FilterType.SetCookieName:
        return NetworkLogView.requestSetCookieNameFilter.bind(null, value);

      case NetworkForward.UIFilter.FilterType.SetCookieValue:
        return NetworkLogView.requestSetCookieValueFilter.bind(null, value);

      case NetworkForward.UIFilter.FilterType.CookieDomain:
        return NetworkLogView.requestCookieDomainFilter.bind(null, value);

      case NetworkForward.UIFilter.FilterType.CookieName:
        return NetworkLogView.requestCookieNameFilter.bind(null, value);

      case NetworkForward.UIFilter.FilterType.CookiePath:
        return NetworkLogView.requestCookiePathFilter.bind(null, value);

      case NetworkForward.UIFilter.FilterType.CookieValue:
        return NetworkLogView.requestCookieValueFilter.bind(null, value);

      case NetworkForward.UIFilter.FilterType.Priority:
        return NetworkLogView.requestPriorityFilter.bind(
            null, PerfUI.NetworkPriorities.uiLabelToNetworkPriority(value));

      case NetworkForward.UIFilter.FilterType.StatusCode:
        return NetworkLogView.statusCodeFilter.bind(null, value);

      case NetworkForward.UIFilter.FilterType.ResourceType:
        return NetworkLogView.resourceTypeFilter.bind(null, value);

      case NetworkForward.UIFilter.FilterType.Url:
        return NetworkLogView.requestUrlFilter.bind(null, value);
    }
    return null;
  }

  private createSizeFilter(value: string): Filter|null {
    let multiplier = 1;
    if (value.endsWith('k')) {
      multiplier = 1000;
      value = value.substring(0, value.length - 1);
    } else if (value.endsWith('m')) {
      multiplier = 1000 * 1000;
      value = value.substring(0, value.length - 1);
    }
    const quantity = Number(value);
    if (isNaN(quantity)) {
      return null;
    }
    return NetworkLogView.requestSizeLargerThanFilter.bind(null, quantity * multiplier);
  }

  private filterRequests(): void {
    this.removeAllHighlights();
    this.invalidateAllItems();
  }

  private reveal(request: SDK.NetworkRequest.NetworkRequest): NetworkRequestNode|null {
    this.removeAllNodeHighlights();
    const node = networkRequestToNode.get(request);
    if (!node || !node.dataGrid) {
      return null;
    }
    // Viewport datagrid nodes do not reveal if not in the root node
    // list of flatChildren. For children of grouped frame nodes:
    // reveal and expand parent to ensure child is revealable.
    if (node.parent && node.parent instanceof NetworkGroupNode) {
      node.parent.reveal();
      node.parent.expand();
    }
    node.reveal();
    return node;
  }

  revealAndHighlightRequest(request: SDK.NetworkRequest.NetworkRequest): void {
    const node = this.reveal(request);
    if (node) {
      this.highlightNode(node);
    }
  }

  revealAndHighlightRequestWithId(requestId: NetworkForward.NetworkRequestId.NetworkRequestId): void {
    const request = Logs.NetworkLog.NetworkLog.instance().requestByManagerAndId(requestId.manager, requestId.requestId);
    if (request) {
      this.revealAndHighlightRequest(request);
    }
  }

  selectRequest(request: SDK.NetworkRequest.NetworkRequest, options?: NetworkForward.UIRequestLocation.FilterOptions):
      void {
    const defaultOptions = {clearFilter: true};
    const {clearFilter} = options || defaultOptions;
    if (clearFilter) {
      this.setTextFilterValue('');
    }
    const node = this.reveal(request);
    if (node) {
      node.select();
    }
  }

  removeAllNodeHighlights(): void {
    if (this.highlightedNode) {
      this.highlightedNode.element().classList.remove('highlighted-row');
      this.highlightedNode = null;
    }
  }

  private highlightNode(node: NetworkRequestNode): void {
    UI.UIUtils.runCSSAnimationOnce(node.element(), 'highlighted-row');
    this.highlightedNode = node;
  }

  private filterOutBlobRequests(requests: SDK.NetworkRequest.NetworkRequest[]): SDK.NetworkRequest.NetworkRequest[] {
    return requests.filter(request => !request.isBlobRequest());
  }

  private async generateFetchCall(request: SDK.NetworkRequest.NetworkRequest, style: FetchStyle): Promise<string> {
    const ignoredHeaders = new Set<string>([
      // Internal headers
      'method',
      'path',
      'scheme',
      'version',

      // Unsafe headers
      // Keep this list synchronized with src/net/http/http_util.cc
      'accept-charset',
      'accept-encoding',
      'access-control-request-headers',
      'access-control-request-method',
      'connection',
      'content-length',
      'cookie',
      'cookie2',
      'date',
      'dnt',
      'expect',
      'host',
      'keep-alive',
      'origin',
      'referer',
      'te',
      'trailer',
      'transfer-encoding',
      'upgrade',
      'via',
      // TODO(phistuck) - remove this once crbug.com/571722 is fixed.
      'user-agent',
    ]);

    const credentialHeaders = new Set<string>(['cookie', 'authorization']);

    const url = JSON.stringify(request.url());

    const requestHeaders = request.requestHeaders();
    const headerData: Headers = requestHeaders.reduce((result, header) => {
      const name = header.name;

      if (!ignoredHeaders.has(name.toLowerCase()) && !name.includes(':')) {
        result.append(name, header.value);
      }

      return result;
    }, new Headers());

    const headers: HeadersInit = {};
    for (const headerArray of headerData) {
      headers[headerArray[0]] = headerArray[1];
    }

    const credentials = request.includedRequestCookies().length ||
            requestHeaders.some(({name}) => credentialHeaders.has(name.toLowerCase())) ?
        'include' :
        'omit';

    const referrerHeader = requestHeaders.find(({name}) => name.toLowerCase() === 'referer');

    const referrer = referrerHeader ? referrerHeader.value : void 0;

    const referrerPolicy = request.referrerPolicy() || void 0;

    const requestBody = await request.requestFormData();

    const fetchOptions: RequestInit = {
      headers: Object.keys(headers).length ? headers : void 0,
      referrer,
      referrerPolicy,
      body: requestBody,
      method: request.requestMethod,
      mode: 'cors',
    };

    if (style === FetchStyle.NodeJs) {
      const cookieHeader = requestHeaders.find(header => header.name.toLowerCase() === 'cookie');
      const extraHeaders: HeadersInit = {};
      // According to https://www.npmjs.com/package/node-fetch#class-request the
      // following properties are not implemented in Node.js.
      delete fetchOptions.mode;
      if (cookieHeader) {
        extraHeaders['cookie'] = cookieHeader.value;
      }
      if (referrer) {
        delete fetchOptions.referrer;
        extraHeaders['Referer'] = referrer;
      }
      if (referrer) {
        delete fetchOptions.referrerPolicy;
        extraHeaders['Referrer-Policy'] = referrerPolicy as string;
      }
      if (Object.keys(extraHeaders).length) {
        fetchOptions.headers = {
          ...headers,
          ...extraHeaders,
        };
      }
    } else {
      fetchOptions.credentials = credentials;
    }

    const options = JSON.stringify(fetchOptions, null, 2);
    return `fetch(${url}, ${options});`;
  }

  private async generateAllFetchCall(requests: SDK.NetworkRequest.NetworkRequest[], style: FetchStyle):
      Promise<string> {
    const nonBlobRequests = this.filterOutBlobRequests(requests);
    const commands = await Promise.all(nonBlobRequests.map(request => this.generateFetchCall(request, style)));
    return commands.join(' ;\n');
  }

  static async generateCurlCommand(request: SDK.NetworkRequest.NetworkRequest, platform: string): Promise<string> {
    let command: string[] = [];
    // Most of these headers are derived from the URL and are automatically added by cURL.
    // The |Accept-Encoding| header is ignored to prevent decompression errors. crbug.com/1015321
    const ignoredHeaders = new Set<string>(['accept-encoding', 'host', 'method', 'path', 'scheme', 'version']);

    function escapeStringWin(str: string): string {
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
         ENV variables and fill them in its place. We cannot escape them with %
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
              .replace(/[^a-zA-Z0-9\s_\-:=+~'\/.',?;()*`&]/g, '^$&')
              .replace(/%(?=[a-zA-Z0-9_])/g, '%^')
              .replace(/\r?\n/g, '^\n\n') +
          encapsChars;
    }

    function escapeStringPosix(str: string): string {
      function escapeCharacter(x: string): string {
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
    const formData = await request.requestFormData();
    if (formData) {
      // Note that formData is not necessarily urlencoded because it might for example
      // come from a fetch request made with an explicitly unencoded body.
      data.push('--data-raw ' + escapeString(formData));
      ignoredHeaders.add('content-length');
      inferredMethod = 'POST';
    }

    if (request.requestMethod !== inferredMethod) {
      command.push('-X ' + escapeString(request.requestMethod));
    }

    const requestHeaders = request.requestHeaders();
    for (let i = 0; i < requestHeaders.length; i++) {
      const header = requestHeaders[i];
      const name = header.name.replace(/^:/, '');  // Translate SPDY v3 headers to HTTP headers.
      if (ignoredHeaders.has(name.toLowerCase())) {
        continue;
      }
      if (header.value.trim()) {
        command.push('-H ' + escapeString(name + ': ' + header.value));
      } else {
        // A header passed with -H with no value or only whitespace as its
        // value tells curl to not set the header at all. To post an empty
        // header, you have to terminate it with a semicolon.
        command.push('-H ' + escapeString(name + ';'));
      }
    }
    command = command.concat(data);
    command.push('--compressed');

    if (request.securityState() === Protocol.Security.SecurityState.Insecure) {
      command.push('--insecure');
    }
    return 'curl ' + command.join(command.length >= 3 ? (platform === 'win' ? ' ^\n  ' : ' \\\n  ') : ' ');
  }

  private async generateAllCurlCommand(requests: SDK.NetworkRequest.NetworkRequest[], platform: string):
      Promise<string> {
    const nonBlobRequests = this.filterOutBlobRequests(requests);
    const commands =
        await Promise.all(nonBlobRequests.map(request => NetworkLogView.generateCurlCommand(request, platform)));
    if (platform === 'win') {
      return commands.join(' &\r\n');
    }
    return commands.join(' ;\n');
  }

  private async generatePowerShellCommand(request: SDK.NetworkRequest.NetworkRequest): Promise<string> {
    const command = [];
    const ignoredHeaders = new Set<string>([
      'host',
      'connection',
      'proxy-connection',
      'content-length',
      'expect',
      'range',
      'content-type',
      'user-agent',
      'cookie',
    ]);

    function escapeString(str: string): string {
      return '"' +
          str.replace(/[`\$"]/g, '`$&').replace(/[^\x20-\x7E]/g, char => '$([char]' + char.charCodeAt(0) + ')') + '"';
    }

    // Generate a WebRequestSession object with the UserAgent and Cookie header values.
    // This is used to pass the user-agent and cookie headers to Invoke-WebRequest because the Invoke-WebRequest
    // command does not allow setting these headers through the -Headers parameter. See docs at:
    // https://docs.microsoft.com/en-us/powershell/module/microsoft.powershell.utility/invoke-webrequest?view=powershell-7.1#parameters
    function generatePowerShellSession(request: SDK.NetworkRequest.NetworkRequest): string|null {
      const requestHeaders = request.requestHeaders();
      const props = [];

      const userAgentHeader = requestHeaders.find(({name}) => name.toLowerCase() === 'user-agent');
      if (userAgentHeader) {
        props.push(`$session.UserAgent = ${escapeString(userAgentHeader.value)}`);
      }

      for (const cookie of request.includedRequestCookies()) {
        const name = escapeString(cookie.name());
        const value = escapeString(cookie.value());
        const domain = escapeString(cookie.domain());
        props.push(`$session.Cookies.Add((New-Object System.Net.Cookie(${name}, ${value}, "/", ${domain})))`);
      }

      if (props.length) {
        return '$session = New-Object Microsoft.PowerShell.Commands.WebRequestSession\n' + props.join('\n') + '\n';
      }

      return null;
    }

    command.push('-Uri ' + escapeString(request.url()));

    if (request.requestMethod !== 'GET') {
      command.push('-Method ' + escapeString(request.requestMethod));
    }

    const session = generatePowerShellSession(request);
    if (session) {
      command.push('-WebSession $session');
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

    // The -UseBasicParsing parameter prevents Invoke-WebRequest from using the IE engine for parsing. Basic
    // parsing is the default behavior in PowerShell 6.0.0+ and the parameter is included here for backwards
    // compatibility only.
    const prelude = session || '';
    return prelude + 'Invoke-WebRequest -UseBasicParsing ' + command.join(command.length >= 3 ? ' `\n' : ' ');
  }

  private async generateAllPowerShellCommand(requests: SDK.NetworkRequest.NetworkRequest[]): Promise<string> {
    const nonBlobRequests = this.filterOutBlobRequests(requests);
    const commands = await Promise.all(nonBlobRequests.map(request => this.generatePowerShellCommand(request)));
    return commands.join(';\r\n');
  }

  static getDCLEventColor(): string {
    return ThemeSupport.ThemeSupport.instance().getComputedValue('--color-syntax-3');
  }

  static getLoadEventColor(): string {
    return ThemeSupport.ThemeSupport.instance().getComputedValue('--color-syntax-1');
  }
}

export function computeStackTraceText(stackTrace: Protocol.Runtime.StackTrace): string {
  let stackTraceText = '';
  for (const frame of stackTrace.callFrames) {
    const functionName = UI.UIUtils.beautifyFunctionName(frame.functionName);
    stackTraceText += `${functionName} @ ${frame.url}:${frame.lineNumber + 1}\n`;
  }
  if (stackTrace.parent) {
    stackTraceText += computeStackTraceText(stackTrace.parent);
  }
  return stackTraceText;
}

const filteredNetworkRequests = new WeakSet<NetworkRequestNode>();
const networkRequestToNode = new WeakMap<SDK.NetworkRequest.NetworkRequest, NetworkRequestNode>();

export function isRequestFilteredOut(request: NetworkRequestNode): boolean {
  return filteredNetworkRequests.has(request);
}

export const HTTPSchemas = {
  'http': true,
  'https': true,
  'ws': true,
  'wss': true,
};

const searchKeys: string[] = Object.values(NetworkForward.UIFilter.FilterType);

export interface GroupLookupInterface {
  groupNodeForRequest(request: SDK.NetworkRequest.NetworkRequest): NetworkGroupNode|null;
  reset(): void;
}

export type Filter = (request: SDK.NetworkRequest.NetworkRequest) => boolean;
