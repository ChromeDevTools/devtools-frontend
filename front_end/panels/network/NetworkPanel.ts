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
import * as SDK from '../../core/sdk/sdk.js';
import * as Bindings from '../../models/bindings/bindings.js';
import type * as Extensions from '../../models/extensions/extensions.js';
import * as Logs from '../../models/logs/logs.js';
import * as Trace from '../../models/trace/trace.js';
import * as Workspace from '../../models/workspace/workspace.js';
import * as NetworkForward from '../../panels/network/forward/forward.js';
import * as PerfUI from '../../ui/legacy/components/perf_ui/perf_ui.js';
import * as UI from '../../ui/legacy/legacy.js';
import * as VisualLogging from '../../ui/visual_logging/visual_logging.js';
import * as MobileThrottling from '../mobile_throttling/mobile_throttling.js';
import * as Search from '../search/search.js';
import * as TimelineUtils from '../timeline/utils/utils.js';

import {Events, type RequestActivatedEvent} from './NetworkDataGridNode.js';
import {NetworkItemView} from './NetworkItemView.js';
import {NetworkLogView} from './NetworkLogView.js';
import {NetworkOverview} from './NetworkOverview.js';
import networkPanelStyles from './networkPanel.css.js';
import {NetworkSearchScope} from './NetworkSearchScope.js';
import {type NetworkTimeCalculator, NetworkTransferTimeCalculator} from './NetworkTimeCalculator.js';

const UIStrings = {
  /**
   *@description Text to close something
   */
  close: 'Close',
  /**
   *@description Title of a search bar or tool
   */
  search: 'Search',
  /**
   *@description Tooltip text that appears on the setting to preserve log when hovering over the item
   */
  doNotClearLogOnPageReload: 'Do not clear log on page reload / navigation',
  /**
   *@description Text to preserve the log after refreshing
   */
  preserveLog: 'Preserve log',
  /**
   *@description Text to disable cache while DevTools is open
   */
  disableCacheWhileDevtoolsIsOpen: 'Disable cache while DevTools is open',
  /**
   *@description Text in Network Config View of the Network panel
   */
  disableCache: 'Disable cache',
  /**
   *@description Tooltip text that appears when hovering over the largeicon settings gear in show settings pane setting in network panel of the network panel
   */
  networkSettings: 'Network settings',
  /**
   *@description Tooltip for expanding network request row setting
   */
  showMoreInformationInRequestRows: 'Show more information in request rows',
  /**
   *@description Text in Network Panel used to toggle the "big request rows" setting.
   */
  useLargeRequestRows: 'Big request rows',
  /**
   *@description Tooltip text for network request overview setting
   */
  showOverviewOfNetworkRequests: 'Show overview of network requests',
  /**
   *@description Text in Network Panel used to show the overview for a given network request.
   */
  showOverview: 'Overview',
  /**
   *@description Tooltip for group by frame network setting
   */
  groupRequestsByTopLevelRequest: 'Group requests by top level request frame',
  /**
   *@description Text for group by frame network setting
   */
  groupByFrame: 'Group by frame',
  /**
   *@description Tooltip for capture screenshot network setting
   */
  captureScreenshotsWhenLoadingA: 'Capture screenshots when loading a page',
  /**
   *@description Text to take screenshots
   */
  captureScreenshots: 'Screenshots',
  /**
   * @description Tooltip text that appears when hovering over the largeicon load button in the
   * Network Panel. This action prompts the user to select a HAR file to upload to DevTools.
   */
  importHarFile: 'Import `HAR` file...',
  /**
   * @description Tooltip text that appears when hovering over the largeicon download button in the
   * Network Panel. HAR is a file format (HTTP Archive) and should not be translated. This action
   * triggers the download of a HAR file.
   */
  exportHarSanitized: 'Export `HAR` (sanitized)...',
  /**
   * @description Context menu item in the export long click button of the Network panel, which is
   * only available when the Network setting to allow generating HAR with sensitive data is active.
   * HAR is a file format (HTTP Archive) and should not be translated. This action triggers the
   * download of a HAR file with sensitive data included.
   */
  exportHarWithSensitiveData: 'Export `HAR` (with sensitive data)...',
  /**
   *@description Text for throttling the network
   */
  throttling: 'Throttling',
  /**
   *@description Text in Network Panel to tell the user to reload the page to capture screenshots.
   *@example {Ctrl + R} PH1
   */
  hitSToReloadAndCaptureFilmstrip: 'Hit {PH1} to reload and capture filmstrip.',
  /**
   * @description A context menu item that is shown for resources in other panels
   * to open them in the Network panel.
   */
  openInNetworkPanel: 'Open in Network panel',
  /**
   * @description A context menu item that is shown for resources in other panels
   * to open them in the Network panel, but when there's no associated network
   * request. This context menu item is always disabled and only provided to give
   * the developer an idea of why they cannot open the resource in the Network
   * panel.
   */
  openInNetworkPanelMissingRequest: 'Open in Network panel (missing request)',
  /**
   *@description Text in Network Panel that is displayed whilst the recording is in progress.
   */
  recordingFrames: 'Recording frames...',
  /**
   *@description Text in Network Panel that is displayed when frames are being fetched.
   */
  fetchingFrames: 'Fetching frames...',
  /**
   * @description Text of a button in the Network panel's toolbar that open Network Conditions panel in the drawer.
   */
  moreNetworkConditions: 'More network conditions…',
};
const str_ = i18n.i18n.registerUIStrings('panels/network/NetworkPanel.ts', UIStrings);
const i18nString = i18n.i18n.getLocalizedString.bind(undefined, str_);
let networkPanelInstance: NetworkPanel;

export class NetworkPanel extends UI.Panel.Panel implements
    UI.ContextMenu
        .Provider<SDK.NetworkRequest.NetworkRequest|SDK.Resource.Resource|Workspace.UISourceCode.UISourceCode>,
    UI.View.ViewLocationResolver {
  private readonly networkLogShowOverviewSetting: Common.Settings.Setting<boolean>;
  private readonly networkLogLargeRowsSetting: Common.Settings.Setting<boolean>;
  private readonly networkRecordFilmStripSetting: Common.Settings.Setting<boolean>;
  private readonly toggleRecordAction: UI.ActionRegistration.Action;
  private pendingStopTimer!: number|undefined;
  networkItemView: NetworkItemView|null;
  private filmStripView: PerfUI.FilmStripView.FilmStripView|null;
  private filmStripRecorder: FilmStripRecorder|null;
  private currentRequest: SDK.NetworkRequest.NetworkRequest|null;
  private readonly panelToolbar: UI.Toolbar.Toolbar;
  private readonly rightToolbar: UI.Toolbar.Toolbar;
  private readonly filterBar: UI.FilterBar.FilterBar;
  private readonly settingsPane: UI.Widget.HBox;
  private showSettingsPaneSetting: Common.Settings.Setting<boolean>;
  private readonly filmStripPlaceholderElement: HTMLElement;
  private readonly overviewPane: PerfUI.TimelineOverviewPane.TimelineOverviewPane;
  private readonly networkOverview: NetworkOverview;
  private readonly overviewPlaceholderElement: HTMLElement;
  private readonly calculator: NetworkTransferTimeCalculator;
  private splitWidget: UI.SplitWidget.SplitWidget;
  private readonly sidebarLocation: UI.View.TabbedViewLocation;
  private readonly progressBarContainer: HTMLDivElement;
  networkLogView: NetworkLogView;
  private readonly fileSelectorElement: HTMLElement;
  private readonly detailsWidget: UI.Widget.VBox;
  private readonly closeButtonElement: HTMLDivElement;
  private preserveLogSetting: Common.Settings.Setting<boolean>;
  recordLogSetting: Common.Settings.Setting<boolean>;
  private readonly throttlingSelect: UI.Toolbar.ToolbarComboBox;
  private readonly displayScreenshotDelay: number;

  constructor(displayScreenshotDelay: number) {
    super('network');

    this.displayScreenshotDelay = displayScreenshotDelay;
    this.networkLogShowOverviewSetting =
        Common.Settings.Settings.instance().createSetting('network-log-show-overview', true);
    this.networkLogLargeRowsSetting =
        Common.Settings.Settings.instance().createSetting('network-log-large-rows', false);
    this.networkRecordFilmStripSetting =
        Common.Settings.Settings.instance().createSetting('network-record-film-strip-setting', false);
    this.toggleRecordAction = UI.ActionRegistry.ActionRegistry.instance().getAction('network.toggle-recording');
    this.networkItemView = null;
    this.filmStripView = null;
    this.filmStripRecorder = null;
    this.currentRequest = null;

    const panel = new UI.Widget.VBox();

    const networkToolbarContainer = panel.contentElement.createChild('div', 'network-toolbar-container');
    this.panelToolbar = new UI.Toolbar.Toolbar('', networkToolbarContainer);
    this.panelToolbar.makeWrappable(true);
    this.panelToolbar.element.setAttribute('jslog', `${VisualLogging.toolbar('network-main')}`);
    this.rightToolbar = new UI.Toolbar.Toolbar('', networkToolbarContainer);

    this.filterBar = new UI.FilterBar.FilterBar('network-panel', true);
    this.filterBar.show(panel.contentElement);
    this.filterBar.addEventListener(UI.FilterBar.FilterBarEvents.CHANGED, this.handleFilterChanged.bind(this));

    this.settingsPane = new UI.Widget.HBox();
    this.settingsPane.element.classList.add('network-settings-pane');
    this.settingsPane.show(panel.contentElement);
    this.showSettingsPaneSetting =
        Common.Settings.Settings.instance().createSetting('network-show-settings-toolbar', false);
    this.showSettingsPaneSetting.addChangeListener(this.updateSettingsPaneVisibility.bind(this));
    this.updateSettingsPaneVisibility();

    this.filmStripPlaceholderElement = panel.contentElement.createChild('div', 'network-film-strip-placeholder');

    // Create top overview component.
    this.overviewPane = new PerfUI.TimelineOverviewPane.TimelineOverviewPane('network');
    this.overviewPane.addEventListener(
        PerfUI.TimelineOverviewPane.Events.OVERVIEW_PANE_WINDOW_CHANGED, this.onWindowChanged.bind(this));
    this.overviewPane.element.id = 'network-overview-panel';
    this.networkOverview = new NetworkOverview();
    this.overviewPane.setOverviewControls([this.networkOverview]);
    this.overviewPlaceholderElement = panel.contentElement.createChild('div');

    this.calculator = new NetworkTransferTimeCalculator();

    this.splitWidget = new UI.SplitWidget.SplitWidget(true, false, 'network-panel-split-view-state');
    this.splitWidget.hideMain();
    this.splitWidget.show(panel.contentElement);

    panel.setDefaultFocusedChild(this.filterBar);

    const initialSidebarWidth = 225;
    const splitWidget = new UI.SplitWidget.SplitWidget(true, false, 'network-panel-sidebar-state', initialSidebarWidth);
    splitWidget.hideSidebar();
    splitWidget.enableShowModeSaving();
    splitWidget.show(this.element);
    this.sidebarLocation = UI.ViewManager.ViewManager.instance().createTabbedLocation(async () => {
      void UI.ViewManager.ViewManager.instance().showView('network');
      splitWidget.showBoth();
    }, 'network-sidebar', true);
    const tabbedPane = this.sidebarLocation.tabbedPane();
    tabbedPane.setMinimumSize(100, 25);
    tabbedPane.element.classList.add('network-tabbed-pane');
    tabbedPane.element.addEventListener('keydown', event => {
      if (event.key !== Platform.KeyboardUtilities.ESCAPE_KEY) {
        return;
      }
      splitWidget.hideSidebar();
      event.consume();
      void VisualLogging.logKeyDown(event.currentTarget, event, 'hide-sidebar');
    });
    const closeSidebar = new UI.Toolbar.ToolbarButton(i18nString(UIStrings.close), 'cross');
    closeSidebar.addEventListener(UI.Toolbar.ToolbarButton.Events.CLICK, () => splitWidget.hideSidebar());
    closeSidebar.element.setAttribute('jslog', `${VisualLogging.close().track({click: true})}`);
    tabbedPane.rightToolbar().appendToolbarItem(closeSidebar);
    splitWidget.setSidebarWidget(tabbedPane);
    splitWidget.setMainWidget(panel);
    splitWidget.setDefaultFocusedChild(panel);
    this.setDefaultFocusedChild(splitWidget);

    this.progressBarContainer = document.createElement('div');

    this.networkLogView =
        new NetworkLogView(this.filterBar, this.progressBarContainer, this.networkLogLargeRowsSetting);
    this.splitWidget.setSidebarWidget(this.networkLogView);
    this.fileSelectorElement =
        (UI.UIUtils.createFileSelectorElement(this.networkLogView.onLoadFromFile.bind(this.networkLogView)) as
         HTMLElement);
    panel.element.appendChild(this.fileSelectorElement);

    this.detailsWidget = new UI.Widget.VBox();
    this.detailsWidget.element.classList.add('network-details-view');
    this.splitWidget.setMainWidget(this.detailsWidget);

    this.closeButtonElement = document.createElement('div', {is: 'dt-close-button'});
    this.closeButtonElement.addEventListener('click', async () => {
      const action = UI.ActionRegistry.ActionRegistry.instance().getAction('network.hide-request-details');
      await action.execute();
    }, false);
    this.closeButtonElement.style.margin = '0 5px';

    this.networkLogShowOverviewSetting.addChangeListener(this.toggleShowOverview, this);
    this.networkLogLargeRowsSetting.addChangeListener(this.toggleLargerRequests, this);
    this.networkRecordFilmStripSetting.addChangeListener(this.toggleRecordFilmStrip, this);

    this.preserveLogSetting = Common.Settings.Settings.instance().moduleSetting('network-log.preserve-log');
    this.recordLogSetting = Common.Settings.Settings.instance().moduleSetting('network-log.record-log');
    this.recordLogSetting.addChangeListener(({data}) => this.toggleRecord(data));

    this.throttlingSelect = this.createThrottlingConditionsSelect();
    this.setupToolbarButtons(splitWidget);

    this.toggleRecord(this.recordLogSetting.get());
    this.toggleShowOverview();
    this.toggleLargerRequests();
    this.toggleRecordFilmStrip();
    this.updateUI();

    SDK.TargetManager.TargetManager.instance().addModelListener(
        SDK.ResourceTreeModel.ResourceTreeModel, SDK.ResourceTreeModel.Events.WillReloadPage, this.willReloadPage, this,
        {scoped: true});
    SDK.TargetManager.TargetManager.instance().addModelListener(
        SDK.ResourceTreeModel.ResourceTreeModel, SDK.ResourceTreeModel.Events.Load, this.load, this, {scoped: true});
    this.networkLogView.addEventListener(Events.RequestSelected, this.onRequestSelected, this);
    this.networkLogView.addEventListener(Events.RequestActivated, this.onRequestActivated, this);
    Logs.NetworkLog.NetworkLog.instance().addEventListener(
        Logs.NetworkLog.Events.RequestAdded, this.onUpdateRequest, this);
    Logs.NetworkLog.NetworkLog.instance().addEventListener(
        Logs.NetworkLog.Events.RequestUpdated, this.onUpdateRequest, this);
    Logs.NetworkLog.NetworkLog.instance().addEventListener(Logs.NetworkLog.Events.Reset, this.onNetworkLogReset, this);
  }

  static instance(opts?: {
    forceNew: boolean,
    displayScreenshotDelay?: number,
  }): NetworkPanel {
    if (!networkPanelInstance || opts?.forceNew) {
      networkPanelInstance = new NetworkPanel(opts?.displayScreenshotDelay ?? 1000);
    }

    return networkPanelInstance;
  }

  static revealAndFilter(filters: {
    filterType: NetworkForward.UIFilter.FilterType|null,
    filterValue: string,
  }[]): Promise<void> {
    const panel = NetworkPanel.instance();
    let filterString = '';
    for (const filter of filters) {
      if (filter.filterType) {
        filterString += `${filter.filterType}:${filter.filterValue} `;
      } else {
        filterString += `${filter.filterValue} `;
      }
    }
    panel.networkLogView.setTextFilterValue(filterString);
    return UI.ViewManager.ViewManager.instance().showView('network');
  }

  static async selectAndShowRequest(
      request: SDK.NetworkRequest.NetworkRequest, tab: NetworkForward.UIRequestLocation.UIRequestTabs,
      options?: NetworkForward.UIRequestLocation.FilterOptions): Promise<void> {
    const panel = NetworkPanel.instance();
    await panel.selectAndActivateRequest(request, tab, options);
  }

  throttlingSelectForTest(): UI.Toolbar.ToolbarComboBox {
    return this.throttlingSelect;
  }

  private onWindowChanged(
      event: Common.EventTarget.EventTargetEvent<PerfUI.TimelineOverviewPane.OverviewPaneWindowChangedEvent>): void {
    const startTime = Math.max(this.calculator.minimumBoundary(), event.data.startTime / 1000);
    const endTime = Math.min(this.calculator.maximumBoundary(), event.data.endTime / 1000);
    if (startTime === this.calculator.minimumBoundary() && endTime === this.calculator.maximumBoundary()) {
      // Reset the filters for NetworkLogView when the window is reset
      // to its boundaries. This clears the filters and allows the users
      // to see the incoming requests after they have updated the curtains
      // to be in the edges. (ex: by double clicking on the overview grid)
      this.networkLogView.setWindow(0, 0);
    } else {
      this.networkLogView.setWindow(startTime, endTime);
    }
  }

  private async searchToggleClick(): Promise<void> {
    const action = UI.ActionRegistry.ActionRegistry.instance().getAction('network.search');
    await action.execute();
  }

  private setupToolbarButtons(splitWidget: UI.SplitWidget.SplitWidget): void {
    const searchToggle = new UI.Toolbar.ToolbarToggle(i18nString(UIStrings.search), 'search', undefined, 'search');
    function updateSidebarToggle(): void {
      const isSidebarShowing = splitWidget.showMode() !== UI.SplitWidget.ShowMode.ONLY_MAIN;
      searchToggle.setToggled(isSidebarShowing);
      if (!isSidebarShowing) {
        (searchToggle.element as HTMLElement).focus();
      }
    }
    this.panelToolbar.appendToolbarItem(UI.Toolbar.Toolbar.createActionButton(this.toggleRecordAction));
    this.panelToolbar.appendToolbarItem(UI.Toolbar.Toolbar.createActionButtonForId('network.clear'));
    this.panelToolbar.appendSeparator();

    this.panelToolbar.appendToolbarItem(this.filterBar.filterButton());
    updateSidebarToggle();
    splitWidget.addEventListener(UI.SplitWidget.Events.SHOW_MODE_CHANGED, updateSidebarToggle);
    searchToggle.addEventListener(UI.Toolbar.ToolbarButton.Events.CLICK, () => {
      void this.searchToggleClick();
    });
    this.panelToolbar.appendToolbarItem(searchToggle);
    this.panelToolbar.appendSeparator();

    this.panelToolbar.appendToolbarItem(new UI.Toolbar.ToolbarSettingCheckbox(
        this.preserveLogSetting, i18nString(UIStrings.doNotClearLogOnPageReload), i18nString(UIStrings.preserveLog)));

    this.panelToolbar.appendSeparator();
    const disableCacheCheckbox = new UI.Toolbar.ToolbarSettingCheckbox(
        Common.Settings.Settings.instance().moduleSetting('cache-disabled'),
        i18nString(UIStrings.disableCacheWhileDevtoolsIsOpen), i18nString(UIStrings.disableCache));
    this.panelToolbar.appendToolbarItem(disableCacheCheckbox);

    this.panelToolbar.appendToolbarItem(this.throttlingSelect);

    const networkConditionsButton = new UI.Toolbar.ToolbarButton(
        i18nString(UIStrings.moreNetworkConditions), 'network-settings', undefined, 'network-conditions');
    networkConditionsButton.addEventListener(UI.Toolbar.ToolbarButton.Events.CLICK, () => {
      void UI.ViewManager.ViewManager.instance().showView('network.config');
    }, this);
    this.panelToolbar.appendToolbarItem(networkConditionsButton);

    this.rightToolbar.appendToolbarItem(new UI.Toolbar.ToolbarItem(this.progressBarContainer));
    this.rightToolbar.appendSeparator();
    this.rightToolbar.appendToolbarItem(new UI.Toolbar.ToolbarSettingToggle(
        this.showSettingsPaneSetting, 'gear', i18nString(UIStrings.networkSettings), 'gear-filled',
        'network-settings'));

    const settingsToolbarLeft = new UI.Toolbar.Toolbar('', this.settingsPane.element);
    settingsToolbarLeft.makeVertical();
    settingsToolbarLeft.appendToolbarItem(new UI.Toolbar.ToolbarSettingCheckbox(
        this.networkLogLargeRowsSetting, i18nString(UIStrings.showMoreInformationInRequestRows),
        i18nString(UIStrings.useLargeRequestRows)));
    settingsToolbarLeft.appendToolbarItem(new UI.Toolbar.ToolbarSettingCheckbox(
        this.networkLogShowOverviewSetting, i18nString(UIStrings.showOverviewOfNetworkRequests),
        i18nString(UIStrings.showOverview)));

    const settingsToolbarRight = new UI.Toolbar.Toolbar('', this.settingsPane.element);
    settingsToolbarRight.makeVertical();
    settingsToolbarRight.appendToolbarItem(new UI.Toolbar.ToolbarSettingCheckbox(
        Common.Settings.Settings.instance().moduleSetting('network.group-by-frame'),
        i18nString(UIStrings.groupRequestsByTopLevelRequest), i18nString(UIStrings.groupByFrame)));
    settingsToolbarRight.appendToolbarItem(new UI.Toolbar.ToolbarSettingCheckbox(
        this.networkRecordFilmStripSetting, i18nString(UIStrings.captureScreenshotsWhenLoadingA),
        i18nString(UIStrings.captureScreenshots)));

    this.panelToolbar.appendSeparator();
    const importHarButton =
        new UI.Toolbar.ToolbarButton(i18nString(UIStrings.importHarFile), 'import', undefined, 'import-har');
    importHarButton.addEventListener(
        UI.Toolbar.ToolbarButton.Events.CLICK, () => this.fileSelectorElement.click(), this);
    this.panelToolbar.appendToolbarItem(importHarButton);
    const exportHarButton =
        new UI.Toolbar.ToolbarButton(i18nString(UIStrings.exportHarSanitized), 'download', undefined, 'export-har');
    exportHarButton.addEventListener(
        UI.Toolbar.ToolbarButton.Events.CLICK,
        this.networkLogView.exportAll.bind(this.networkLogView, {sanitize: true}), this);
    this.panelToolbar.appendToolbarItem(exportHarButton);

    // Support for exporting HAR (with sensitive data), which is added via a long-click
    // context menu on the Export button in the Network panel.
    // Checkout https://goo.gle/devtools-har-exclude-cookies-design for more details.
    const networkShowOptionsToGenerateHarWithSensitiveData = Common.Settings.Settings.instance().createSetting(
        'network.show-options-to-generate-har-with-sensitive-data', false);
    let controller: UI.UIUtils.LongClickController|null = null;
    const updateShowOptionsToGenerateHarWithSensitiveData = (): void => {
      exportHarButton.setLongClickable(networkShowOptionsToGenerateHarWithSensitiveData.get());
      if (controller !== null) {
        controller.dispose();
        controller = null;
      }
      if (networkShowOptionsToGenerateHarWithSensitiveData.get()) {
        controller = new UI.UIUtils.LongClickController(exportHarButton.element, event => {
          const contextMenu = new UI.ContextMenu.ContextMenu(event);
          contextMenu.defaultSection().appendItem(
              i18nString(UIStrings.exportHarSanitized),
              this.networkLogView.exportAll.bind(this.networkLogView, {sanitize: true}),
              {jslogContext: 'export-har'},
          );
          contextMenu.defaultSection().appendItem(
              i18nString(UIStrings.exportHarWithSensitiveData),
              this.networkLogView.exportAll.bind(this.networkLogView, {sanitize: false}),
              {jslogContext: 'export-har-with-sensitive-data'},
          );
          void contextMenu.show();
        });
      }
    };
    networkShowOptionsToGenerateHarWithSensitiveData.addChangeListener(updateShowOptionsToGenerateHarWithSensitiveData);
    updateShowOptionsToGenerateHarWithSensitiveData();
  }

  private updateSettingsPaneVisibility(): void {
    this.settingsPane.element.classList.toggle('hidden', !this.showSettingsPaneSetting.get());
  }

  private createThrottlingConditionsSelect(): UI.Toolbar.ToolbarComboBox {
    const toolbarItem = new UI.Toolbar.ToolbarComboBox(null, i18nString(UIStrings.throttling));
    toolbarItem.setMaxWidth(160);
    MobileThrottling.ThrottlingManager.throttlingManager().decorateSelectWithNetworkThrottling(
        toolbarItem.selectElement());
    return toolbarItem;
  }

  toggleRecord(toggled: boolean): void {
    this.toggleRecordAction.setToggled(toggled);
    if (this.recordLogSetting.get() !== toggled) {
      this.recordLogSetting.set(toggled);
    }

    this.networkLogView.setRecording(toggled);
    if (!toggled && this.filmStripRecorder) {
      this.filmStripRecorder.stopRecording(this.filmStripAvailable.bind(this));
    }
  }

  private filmStripAvailable(filmStrip: Trace.Extras.FilmStrip.Data): void {
    if (this.filmStripView) {
      this.filmStripView.setModel(filmStrip);
    }
    const timestamps = filmStrip.frames.map(frame => {
      // The network view works in seconds.
      return Trace.Helpers.Timing.microSecondsToSeconds(frame.screenshotEvent.ts);
    });

    this.networkLogView.addFilmStripFrames(timestamps);
  }

  private onNetworkLogReset(event: Common.EventTarget.EventTargetEvent<Logs.NetworkLog.ResetEvent>): void {
    const {clearIfPreserved} = event.data;
    if (!this.preserveLogSetting.get() || clearIfPreserved) {
      this.calculator.reset();
      this.overviewPane.reset();
    }
    if (this.filmStripView) {
      this.resetFilmStripView();
    }
  }

  private willReloadPage(): void {
    if (this.pendingStopTimer) {
      clearTimeout(this.pendingStopTimer);
      delete this.pendingStopTimer;
    }
    if (this.isShowing() && this.filmStripRecorder) {
      this.filmStripRecorder.startRecording();
    }
  }

  private load(): void {
    if (this.filmStripRecorder && this.filmStripRecorder.isRecording()) {
      if (this.pendingStopTimer) {
        window.clearTimeout(this.pendingStopTimer);
      }
      this.pendingStopTimer = window.setTimeout(this.stopFilmStripRecording.bind(this), this.displayScreenshotDelay);
    }
  }

  private stopFilmStripRecording(): void {
    if (this.filmStripRecorder) {
      this.filmStripRecorder.stopRecording(this.filmStripAvailable.bind(this));
    }
    delete this.pendingStopTimer;
  }

  private toggleLargerRequests(): void {
    this.updateUI();
  }

  private toggleShowOverview(): void {
    const toggled = this.networkLogShowOverviewSetting.get();
    if (toggled) {
      this.overviewPane.show(this.overviewPlaceholderElement);
    } else {
      this.overviewPane.detach();
    }
    this.doResize();
  }

  private toggleRecordFilmStrip(): void {
    const toggled = this.networkRecordFilmStripSetting.get();
    if (toggled && !this.filmStripRecorder) {
      this.filmStripView = new PerfUI.FilmStripView.FilmStripView();
      this.filmStripView.element.classList.add('network-film-strip');
      this.filmStripView.element.setAttribute('jslog', `${VisualLogging.section('film-strip')}`);
      this.filmStripRecorder = new FilmStripRecorder(this.networkLogView.timeCalculator(), this.filmStripView);
      this.filmStripView.show(this.filmStripPlaceholderElement);
      this.filmStripView.addEventListener(PerfUI.FilmStripView.Events.FRAME_SELECTED, this.onFilmFrameSelected, this);
      this.filmStripView.addEventListener(PerfUI.FilmStripView.Events.FRAME_ENTER, this.onFilmFrameEnter, this);
      this.filmStripView.addEventListener(PerfUI.FilmStripView.Events.FRAME_EXIT, this.onFilmFrameExit, this);
      this.resetFilmStripView();
    }

    if (!toggled && this.filmStripRecorder) {
      if (this.filmStripView) {
        this.filmStripView.detach();
      }
      this.filmStripView = null;
      this.filmStripRecorder = null;
    }
  }

  private resetFilmStripView(): void {
    const reloadShortcut =
        UI.ShortcutRegistry.ShortcutRegistry.instance().shortcutsForAction('inspector-main.reload')[0];

    if (this.filmStripView) {
      this.filmStripView.reset();
      if (reloadShortcut) {
        this.filmStripView.setStatusText(
            i18nString(UIStrings.hitSToReloadAndCaptureFilmstrip, {PH1: reloadShortcut.title()}));
      }
    }
  }

  override elementsToRestoreScrollPositionsFor(): Element[] {
    return this.networkLogView.elementsToRestoreScrollPositionsFor();
  }

  override wasShown(): void {
    UI.Context.Context.instance().setFlavor(NetworkPanel, this);
    this.registerCSSFiles([networkPanelStyles]);

    // Record the network tool load time after the panel has loaded.
    Host.userMetrics.panelLoaded('network', 'DevTools.Launch.Network');
  }

  override willHide(): void {
    UI.Context.Context.instance().setFlavor(NetworkPanel, null);
  }

  revealAndHighlightRequest(request: SDK.NetworkRequest.NetworkRequest): void {
    this.hideRequestPanel();
    if (request) {
      this.networkLogView.revealAndHighlightRequest(request);
    }
  }

  revealAndHighlightRequestWithId(request: NetworkForward.NetworkRequestId.NetworkRequestId): void {
    this.hideRequestPanel();
    if (request) {
      this.networkLogView.revealAndHighlightRequestWithId(request);
    }
  }

  async selectAndActivateRequest(
      request: SDK.NetworkRequest.NetworkRequest, shownTab?: NetworkForward.UIRequestLocation.UIRequestTabs,
      options?: NetworkForward.UIRequestLocation.FilterOptions): Promise<NetworkItemView|null> {
    await UI.ViewManager.ViewManager.instance().showView('network');
    this.networkLogView.selectRequest(request, options);
    this.showRequestPanel(shownTab);
    this.networkLogView.revealAndHighlightRequest(request);
    return this.networkItemView;
  }

  private handleFilterChanged(): void {
    this.hideRequestPanel();
  }

  private onRowSizeChanged(): void {
    this.updateUI();
  }
  private onRequestSelected(event: Common.EventTarget.EventTargetEvent<SDK.NetworkRequest.NetworkRequest|null>): void {
    const request = event.data;
    this.currentRequest = request;
    this.networkOverview.setHighlightedRequest(request);
    this.updateNetworkItemView();
    UI.Context.Context.instance().setFlavor(SDK.NetworkRequest.NetworkRequest, request);
  }

  private onRequestActivated(event: Common.EventTarget.EventTargetEvent<RequestActivatedEvent>): void {
    const {showPanel, tab, takeFocus} = event.data;
    if (showPanel) {
      this.showRequestPanel(tab, takeFocus);
    } else {
      this.hideRequestPanel();
    }
  }

  private showRequestPanel(shownTab?: NetworkForward.UIRequestLocation.UIRequestTabs, takeFocus?: boolean): void {
    if (this.splitWidget.showMode() === UI.SplitWidget.ShowMode.BOTH && !shownTab && !takeFocus) {
      // If panel is already shown, and we are not forcing a specific tab, return.
      return;
    }
    this.clearNetworkItemView();
    if (this.currentRequest) {
      const networkItemView = this.createNetworkItemView(shownTab);
      if (networkItemView && takeFocus) {
        networkItemView.focus();
      }
    }
    this.updateUI();
  }

  hideRequestPanel(): void {
    this.clearNetworkItemView();
    this.splitWidget.hideMain();
    this.updateUI();
  }

  private updateNetworkItemView(): void {
    if (this.splitWidget.showMode() === UI.SplitWidget.ShowMode.BOTH) {
      this.clearNetworkItemView();
      this.createNetworkItemView();
      this.updateUI();
    }
  }

  private clearNetworkItemView(): void {
    if (this.networkItemView) {
      this.networkItemView.detach();
      this.networkItemView = null;
    }
  }
  private createNetworkItemView(initialTab?: NetworkForward.UIRequestLocation.UIRequestTabs): NetworkItemView
      |undefined {
    if (!this.currentRequest) {
      return;
    }
    this.networkItemView = new NetworkItemView(this.currentRequest, this.networkLogView.timeCalculator(), initialTab);
    this.networkItemView.leftToolbar().appendToolbarItem(new UI.Toolbar.ToolbarItem(this.closeButtonElement));
    this.networkItemView.show(this.detailsWidget.element);
    this.splitWidget.showBoth();
    return this.networkItemView;
  }

  private updateUI(): void {
    if (this.detailsWidget) {
      this.detailsWidget.element.classList.toggle(
          'network-details-view-tall-header', this.networkLogLargeRowsSetting.get());
    }
    if (this.networkLogView) {
      this.networkLogView.switchViewMode(!this.splitWidget.isResizable());
    }
  }

  appendApplicableItems(
      this: NetworkPanel, event: Event, contextMenu: UI.ContextMenu.ContextMenu,
      target: SDK.NetworkRequest.NetworkRequest|SDK.Resource.Resource|Workspace.UISourceCode.UISourceCode|
      TimelineUtils.NetworkRequest.TimelineNetworkRequest): void {
    const appendRevealItem = (request: SDK.NetworkRequest.NetworkRequest): void => {
      contextMenu.revealSection().appendItem(
          i18nString(UIStrings.openInNetworkPanel),
          () => UI.ViewManager.ViewManager.instance()
                    .showView('network')
                    .then(this.networkLogView.resetFilter.bind(this.networkLogView))
                    .then(this.revealAndHighlightRequest.bind(this, request)),
          {jslogContext: 'reveal-in-network'});
    };
    const appendRevealItemMissingData = (): void => {
      contextMenu.revealSection().appendItem(i18nString(UIStrings.openInNetworkPanelMissingRequest), () => {}, {
        disabled: true,
        jslogContext: 'reveal-in-network',
      });
    };
    const appendRevealItemAndSelect = (request: TimelineUtils.NetworkRequest.TimelineNetworkRequest): void => {
      contextMenu.revealSection().appendItem(
          i18nString(UIStrings.openInNetworkPanel),
          () => UI.ViewManager.ViewManager.instance()
                    .showView('network')
                    .then(this.networkLogView.resetFilter.bind(this.networkLogView))
                    .then(this.selectAndActivateRequest.bind(
                        this, request.request, NetworkForward.UIRequestLocation.UIRequestTabs.HEADERS_COMPONENT,
                        /* FilterOptions= */ undefined)),
          {jslogContext: 'timeline.reveal-in-network'});
    };

    if ((event.target as Node).isSelfOrDescendant(this.element)) {
      return;
    }

    if (target instanceof SDK.Resource.Resource) {
      if (target.request) {
        appendRevealItem(target.request);
      } else {
        appendRevealItemMissingData();
      }
      return;
    }
    if (target instanceof Workspace.UISourceCode.UISourceCode) {
      const resource = Bindings.ResourceUtils.resourceForURL(target.url());
      if (resource && resource.request) {
        appendRevealItem(resource.request);
      } else {
        appendRevealItemMissingData();
      }
      return;
    }
    if (target instanceof TimelineUtils.NetworkRequest.TimelineNetworkRequest) {
      appendRevealItemAndSelect(target);
      return;
    }

    if (this.networkItemView && this.networkItemView.isShowing() && this.networkItemView.request() === target) {
      return;
    }

    appendRevealItem(target);
  }

  private onFilmFrameSelected(event: Common.EventTarget.EventTargetEvent<number>): void {
    const timestamp = event.data;
    this.overviewPane.setWindowTimes(0, timestamp);
  }

  private onFilmFrameEnter(event: Common.EventTarget.EventTargetEvent<number>): void {
    const timestamp = event.data;
    this.networkOverview.selectFilmStripFrame(timestamp);
    this.networkLogView.selectFilmStripFrame(timestamp / 1000);
  }

  private onFilmFrameExit(): void {
    this.networkOverview.clearFilmStripFrame();
    this.networkLogView.clearFilmStripFrame();
  }

  private onUpdateRequest(event: Common.EventTarget.EventTargetEvent<{request: SDK.NetworkRequest.NetworkRequest}>):
      void {
    const {request} = event.data;
    this.calculator.updateBoundaries(request);
    // FIXME: Unify all time units across the frontend!
    this.overviewPane.setBounds(
        Trace.Types.Timing.MilliSeconds(this.calculator.minimumBoundary() * 1000),
        Trace.Types.Timing.MilliSeconds(this.calculator.maximumBoundary() * 1000));
    this.networkOverview.updateRequest(request);
  }

  resolveLocation(locationName: string): UI.View.ViewLocation|null {
    if (locationName === 'network-sidebar') {
      return this.sidebarLocation;
    }
    return null;
  }
}

export class RequestRevealer implements Common.Revealer.Revealer<SDK.NetworkRequest.NetworkRequest> {
  reveal(request: SDK.NetworkRequest.NetworkRequest): Promise<void> {
    const panel = NetworkPanel.instance();
    return UI.ViewManager.ViewManager.instance().showView('network').then(
        panel.revealAndHighlightRequest.bind(panel, request));
  }
}

export class RequestIdRevealer implements Common.Revealer.Revealer<NetworkForward.NetworkRequestId.NetworkRequestId> {
  reveal(requestId: NetworkForward.NetworkRequestId.NetworkRequestId): Promise<void> {
    const panel = NetworkPanel.instance();
    return UI.ViewManager.ViewManager.instance().showView('network').then(
        panel.revealAndHighlightRequestWithId.bind(panel, requestId));
  }
}

export class NetworkLogWithFilterRevealer implements
    Common.Revealer
        .Revealer<Extensions.ExtensionServer.RevealableNetworkRequestFilter|NetworkForward.UIFilter.UIRequestFilter> {
  reveal(request: Extensions.ExtensionServer.RevealableNetworkRequestFilter|
         NetworkForward.UIFilter.UIRequestFilter): Promise<void> {
    if ('filters' in request) {
      return NetworkPanel.revealAndFilter(request.filters);
    }
    return NetworkPanel.revealAndFilter(request.filter ? [{filterType: null, filterValue: request.filter}] : []);
  }
}

export class FilmStripRecorder implements Trace.TracingManager.TracingManagerClient {
  private tracingManager: Trace.TracingManager.TracingManager|null;
  private resourceTreeModel: SDK.ResourceTreeModel.ResourceTreeModel|null;
  private readonly timeCalculator: NetworkTimeCalculator;
  private readonly filmStripView: PerfUI.FilmStripView.FilmStripView;
  private callback: ((filmStrip: Trace.Extras.FilmStrip.Data) => void)|null;
  // Used to fetch screenshots of the page load and show them in the panel.
  #traceEngine: Trace.TraceModel.Model;
  #collectedTraceEvents: Trace.Types.Events.Event[] = [];

  constructor(timeCalculator: NetworkTimeCalculator, filmStripView: PerfUI.FilmStripView.FilmStripView) {
    this.#traceEngine = Trace.TraceModel.Model.createWithSubsetOfHandlers({
      Screenshots: Trace.Handlers.ModelHandlers.Screenshots,
    });

    this.tracingManager = null;
    this.resourceTreeModel = null;
    this.timeCalculator = timeCalculator;
    this.filmStripView = filmStripView;
    this.callback = null;
  }

  traceEventsCollected(events: Trace.Types.Events.Event[]): void {
    this.#collectedTraceEvents.push(...events);
  }

  async tracingComplete(): Promise<void> {
    if (!this.tracingManager) {
      return;
    }
    this.tracingManager = null;
    await this.#traceEngine.parse(this.#collectedTraceEvents);

    const data = this.#traceEngine.parsedTrace(this.#traceEngine.size() - 1) as
        Trace.Extras.FilmStrip.HandlerDataWithScreenshots;
    if (!data) {
      return;
    }
    const zeroTimeInSeconds = Trace.Types.Timing.Seconds(this.timeCalculator.minimumBoundary());
    const filmStrip =
        Trace.Extras.FilmStrip.fromParsedTrace(data, Trace.Helpers.Timing.secondsToMicroseconds(zeroTimeInSeconds));

    if (this.callback) {
      this.callback(filmStrip);
    }
    this.callback = null;
    // Now we have created the film strip and stored the data, we need to reset
    // the trace processor so that it is ready to record again if the user
    // refreshes the page.
    this.#traceEngine.resetProcessor();

    if (this.resourceTreeModel) {
      this.resourceTreeModel.resumeReload();
    }
    this.resourceTreeModel = null;
  }

  tracingBufferUsage(): void {
  }

  eventsRetrievalProgress(_progress: number): void {
  }

  startRecording(): void {
    this.#collectedTraceEvents = [];
    this.filmStripView.reset();
    this.filmStripView.setStatusText(i18nString(UIStrings.recordingFrames));
    const tracingManager =
        SDK.TargetManager.TargetManager.instance().scopeTarget()?.model(Trace.TracingManager.TracingManager);
    if (this.tracingManager || !tracingManager) {
      return;
    }

    this.tracingManager = tracingManager;
    this.resourceTreeModel = this.tracingManager.target().model(SDK.ResourceTreeModel.ResourceTreeModel);
    void this.tracingManager.start(this, '-*,disabled-by-default-devtools.screenshot', '');

    Host.userMetrics.actionTaken(Host.UserMetrics.Action.FilmStripStartedRecording);
  }

  isRecording(): boolean {
    return Boolean(this.tracingManager);
  }

  stopRecording(callback: (filmStrip: Trace.Extras.FilmStrip.Data) => void): void {
    if (!this.tracingManager) {
      return;
    }

    this.tracingManager.stop();
    if (this.resourceTreeModel) {
      this.resourceTreeModel.suspendReload();
    }
    this.callback = callback;
    this.filmStripView.setStatusText(i18nString(UIStrings.fetchingFrames));
  }
}

export class ActionDelegate implements UI.ActionRegistration.ActionDelegate {
  handleAction(context: UI.Context.Context, actionId: string): boolean {
    const panel = context.flavor(NetworkPanel);
    if (panel === null) {
      return false;
    }
    switch (actionId) {
      case 'network.toggle-recording': {
        panel.toggleRecord(!panel.recordLogSetting.get());
        return true;
      }
      case 'network.hide-request-details': {
        if (!panel.networkItemView) {
          return false;
        }
        panel.hideRequestPanel();
        panel.networkLogView.resetFocus();
        return true;
      }
      case 'network.search': {
        const selection = UI.InspectorView.InspectorView.instance().element.window().getSelection();
        if (!selection) {
          return false;
        }
        let queryCandidate = '';
        if (selection.rangeCount) {
          queryCandidate = selection.toString().replace(/\r?\n.*/, '');
        }
        void SearchNetworkView.openSearch(queryCandidate);
        return true;
      }
      case 'network.clear': {
        Logs.NetworkLog.NetworkLog.instance().reset(true);
        return true;
      }
    }
    return false;
  }
}

export class RequestLocationRevealer implements
    Common.Revealer.Revealer<NetworkForward.UIRequestLocation.UIRequestLocation> {
  async reveal(location: NetworkForward.UIRequestLocation.UIRequestLocation): Promise<void> {
    const view =
        await NetworkPanel.instance().selectAndActivateRequest(location.request, location.tab, location.filterOptions);
    if (!view) {
      return;
    }
    if (location.searchMatch) {
      const {lineNumber, columnNumber, matchLength} = location.searchMatch;
      const revealPosition = {
        from: {lineNumber, columnNumber},
        to: {lineNumber, columnNumber: columnNumber + matchLength},
      };
      await view.revealResponseBody(revealPosition);
    }
    if (location.header) {
      view.revealHeader(location.header.section, location.header.header?.name);
    }
  }
}

let searchNetworkViewInstance: SearchNetworkView;

export class SearchNetworkView extends Search.SearchView.SearchView {
  private constructor() {
    super('network', new Common.Throttler.Throttler(/* timeoutMs */ 200));
  }

  static instance(opts: {
    forceNew: boolean|null,
  } = {forceNew: null}): SearchNetworkView {
    const {forceNew} = opts;
    if (!searchNetworkViewInstance || forceNew) {
      searchNetworkViewInstance = new SearchNetworkView();
    }

    return searchNetworkViewInstance;
  }

  static async openSearch(query: string, searchImmediately?: boolean): Promise<Search.SearchView.SearchView> {
    await UI.ViewManager.ViewManager.instance().showView('network.search-network-tab');
    const searchView = SearchNetworkView.instance();
    searchView.toggle(query, Boolean(searchImmediately));
    return searchView;
  }

  override createScope(): Search.SearchScope.SearchScope {
    return new NetworkSearchScope(Logs.NetworkLog.NetworkLog.instance());
  }
}
