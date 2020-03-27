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
import * as Host from '../host/host.js';
import * as MobileThrottling from '../mobile_throttling/mobile_throttling.js';
import * as PerfUI from '../perf_ui/perf_ui.js';
import * as SDK from '../sdk/sdk.js';
import * as Search from '../search/search.js';
import * as UI from '../ui/ui.js';
import * as Workspace from '../workspace/workspace.js';

import {BlockedURLsPane} from './BlockedURLsPane.js';
import {Events} from './NetworkDataGridNode.js';
import {NetworkItemView, Tabs as NetworkItemViewTabs} from './NetworkItemView.js';  // eslint-disable-line no-unused-vars
import {FilterType, NetworkLogView} from './NetworkLogView.js';  // eslint-disable-line no-unused-vars
import {NetworkOverview} from './NetworkOverview.js';
import {NetworkSearchScope, UIRequestLocation} from './NetworkSearchScope.js';  // eslint-disable-line no-unused-vars
import {NetworkTimeCalculator, NetworkTransferTimeCalculator} from './NetworkTimeCalculator.js';  // eslint-disable-line no-unused-vars

/**
 * @implements {UI.ContextMenu.Provider}
 * @implements {UI.View.ViewLocationResolver}
 */
export class NetworkPanel extends UI.Panel.Panel {
  constructor() {
    super('network');
    this.registerRequiredCSS('network/networkPanel.css');

    this._networkLogShowOverviewSetting =
        Common.Settings.Settings.instance().createSetting('networkLogShowOverview', true);
    this._networkLogLargeRowsSetting = Common.Settings.Settings.instance().createSetting('networkLogLargeRows', false);
    this._networkRecordFilmStripSetting =
        Common.Settings.Settings.instance().createSetting('networkRecordFilmStripSetting', false);
    this._toggleRecordAction =
        /** @type {!UI.Action.Action }*/ (self.UI.actionRegistry.action('network.toggle-recording'));

    /** @type {number|undefined} */
    this._pendingStopTimer;
    /** @type {?NetworkItemView} */
    this._networkItemView = null;
    /** @type {?PerfUI.FilmStripView.FilmStripView} */
    this._filmStripView = null;
    /** @type {?FilmStripRecorder} */
    this._filmStripRecorder = null;
    /** @type {?SDK.NetworkRequest.NetworkRequest} */
    this._currentRequest = null;

    const panel = new UI.Widget.VBox();

    const networkToolbarContainer = panel.contentElement.createChild('div', 'network-toolbar-container');
    this._panelToolbar = new UI.Toolbar.Toolbar('', networkToolbarContainer);
    this._rightToolbar = new UI.Toolbar.Toolbar('', networkToolbarContainer);

    this._filterBar = new UI.FilterBar.FilterBar('networkPanel', true);
    this._filterBar.show(panel.contentElement);
    this._filterBar.addEventListener(UI.FilterBar.FilterBar.Events.Changed, this._handleFilterChanged.bind(this));

    this._settingsPane = new UI.Widget.HBox();
    this._settingsPane.element.classList.add('network-settings-pane');
    this._settingsPane.show(panel.contentElement);
    this._showSettingsPaneSetting =
        Common.Settings.Settings.instance().createSetting('networkShowSettingsToolbar', false);
    this._showSettingsPaneSetting.addChangeListener(this._updateSettingsPaneVisibility.bind(this));
    this._updateSettingsPaneVisibility();

    this._filmStripPlaceholderElement = panel.contentElement.createChild('div', 'network-film-strip-placeholder');

    // Create top overview component.
    this._overviewPane = new PerfUI.TimelineOverviewPane.TimelineOverviewPane('network');
    this._overviewPane.addEventListener(
        PerfUI.TimelineOverviewPane.Events.WindowChanged, this._onWindowChanged.bind(this));
    this._overviewPane.element.id = 'network-overview-panel';
    this._networkOverview = new NetworkOverview();
    this._overviewPane.setOverviewControls([this._networkOverview]);
    this._overviewPlaceholderElement = panel.contentElement.createChild('div');

    this._calculator = new NetworkTransferTimeCalculator();

    this._splitWidget = new UI.SplitWidget.SplitWidget(true, false, 'networkPanelSplitViewState');
    this._splitWidget.hideMain();
    this._splitWidget.show(panel.contentElement);

    panel.setDefaultFocusedChild(this._filterBar);

    const initialSidebarWidth = 225;
    const splitWidget = new UI.SplitWidget.SplitWidget(true, false, 'networkPanelSidebarState', initialSidebarWidth);
    splitWidget.hideSidebar();
    splitWidget.enableShowModeSaving();
    splitWidget.show(this.element);
    this._sidebarLocation = UI.ViewManager.ViewManager.instance().createTabbedLocation(async () => {
      UI.ViewManager.ViewManager.instance().showView('network');
      splitWidget.showBoth();
    }, 'network-sidebar', true);
    const tabbedPane = this._sidebarLocation.tabbedPane();
    tabbedPane.setMinimumSize(100, 25);
    tabbedPane.element.classList.add('network-tabbed-pane');
    tabbedPane.element.addEventListener('keydown', event => {
      if (event.key !== 'Escape') {
        return;
      }
      splitWidget.hideSidebar();
      event.consume();
    });
    const closeSidebar = new UI.Toolbar.ToolbarButton(Common.UIString.UIString('Close'), 'largeicon-delete');
    closeSidebar.addEventListener(UI.Toolbar.ToolbarButton.Events.Click, () => splitWidget.hideSidebar());
    tabbedPane.rightToolbar().appendToolbarItem(closeSidebar);
    splitWidget.setSidebarWidget(tabbedPane);
    splitWidget.setMainWidget(panel);
    splitWidget.setDefaultFocusedChild(panel);
    this.setDefaultFocusedChild(splitWidget);

    this._progressBarContainer = createElement('div');

    /** @type {!NetworkLogView} */
    this._networkLogView =
        new NetworkLogView(this._filterBar, this._progressBarContainer, this._networkLogLargeRowsSetting);
    this._splitWidget.setSidebarWidget(this._networkLogView);

    this._fileSelectorElement =
        UI.UIUtils.createFileSelectorElement(this._networkLogView.onLoadFromFile.bind(this._networkLogView));
    panel.element.appendChild(this._fileSelectorElement);

    this._detailsWidget = new UI.Widget.VBox();
    this._detailsWidget.element.classList.add('network-details-view');
    this._splitWidget.setMainWidget(this._detailsWidget);

    this._closeButtonElement = createElement('div', 'dt-close-button');
    this._closeButtonElement.addEventListener(
        'click', async () => await self.UI.actionRegistry.action('network.hide-request-details').execute(), false);
    this._closeButtonElement.style.margin = '0 5px';

    this._networkLogShowOverviewSetting.addChangeListener(this._toggleShowOverview, this);
    this._networkLogLargeRowsSetting.addChangeListener(this._toggleLargerRequests, this);
    this._networkRecordFilmStripSetting.addChangeListener(this._toggleRecordFilmStrip, this);

    this._preserveLogSetting = Common.Settings.Settings.instance().moduleSetting('network_log.preserve-log');

    this._throttlingSelect = this._createThrottlingConditionsSelect();
    this._setupToolbarButtons(splitWidget);

    this._toggleRecord(true);
    this._toggleShowOverview();
    this._toggleLargerRequests();
    this._toggleRecordFilmStrip();
    this._updateUI();

    SDK.SDKModel.TargetManager.instance().addModelListener(
        SDK.ResourceTreeModel.ResourceTreeModel, SDK.ResourceTreeModel.Events.WillReloadPage, this._willReloadPage,
        this);
    SDK.SDKModel.TargetManager.instance().addModelListener(
        SDK.ResourceTreeModel.ResourceTreeModel, SDK.ResourceTreeModel.Events.Load, this._load, this);
    this._networkLogView.addEventListener(Events.RequestSelected, this._onRequestSelected, this);
    this._networkLogView.addEventListener(Events.RequestActivated, this._onRequestActivated, this);
    self.SDK.networkLog.addEventListener(SDK.NetworkLog.Events.RequestAdded, this._onUpdateRequest, this);
    self.SDK.networkLog.addEventListener(SDK.NetworkLog.Events.RequestUpdated, this._onUpdateRequest, this);
    self.SDK.networkLog.addEventListener(SDK.NetworkLog.Events.Reset, this._onNetworkLogReset, this);
  }

  /**
   * @param {!Array<{filterType: !FilterType, filterValue: string}>} filters
   */
  static revealAndFilter(filters) {
    const panel = NetworkPanel._instance();
    let filterString = '';
    for (const filter of filters) {
      filterString += `${filter.filterType}:${filter.filterValue} `;
    }
    panel._networkLogView.setTextFilterValue(filterString);
    UI.ViewManager.ViewManager.instance().showView('network');
  }

  /**
   * @param {!SDK.NetworkRequest.NetworkRequest} request
   * @param {!NetworkItemViewTabs} tab
   */
  static async selectAndShowRequest(request, tab) {
    const panel = NetworkPanel._instance();
    const itemView = await panel.selectRequest(request);
    if (!itemView) {
      panel._networkLogView.dispatchEventToListeners(Events.RequestActivated, {showPanel: true, tab: tab});
    }
  }

  /**
   * @return {!NetworkPanel}
   */
  static _instance() {
    return /** @type {!NetworkPanel} */ (self.runtime.sharedInstance(NetworkPanel));
  }

  /**
   * @return {!UI.Toolbar.ToolbarComboBox}
   */
  throttlingSelectForTest() {
    return this._throttlingSelect;
  }

  /**
   * @param {!Common.EventTarget.EventTargetEvent} event
   */
  _onWindowChanged(event) {
    const startTime = Math.max(this._calculator.minimumBoundary(), event.data.startTime / 1000);
    const endTime = Math.min(this._calculator.maximumBoundary(), event.data.endTime / 1000);
    this._networkLogView.setWindow(startTime, endTime);
  }

  /**
   * @param {!Common.EventTarget.EventTargetEvent} event
   */
  async _searchToggleClick(event) {
    await self.UI.actionRegistry.action('network.search').execute();
  }

  _setupToolbarButtons(splitWidget) {
    const searchToggle = new UI.Toolbar.ToolbarToggle(ls`Search`, 'largeicon-search');
    function updateSidebarToggle() {
      const isSidebarShowing = splitWidget.showMode() !== UI.SplitWidget.ShowMode.OnlyMain;
      searchToggle.setToggled(isSidebarShowing);
      if (!isSidebarShowing) {
        searchToggle.element.focus();
      }
    }
    this._panelToolbar.appendToolbarItem(UI.Toolbar.Toolbar.createActionButton(this._toggleRecordAction));
    const clearButton = new UI.Toolbar.ToolbarButton(Common.UIString.UIString('Clear'), 'largeicon-clear');
    clearButton.addEventListener(UI.Toolbar.ToolbarButton.Events.Click, () => self.SDK.networkLog.reset(), this);
    this._panelToolbar.appendToolbarItem(clearButton);
    this._panelToolbar.appendSeparator();

    this._panelToolbar.appendToolbarItem(this._filterBar.filterButton());
    updateSidebarToggle();
    splitWidget.addEventListener(UI.SplitWidget.Events.ShowModeChanged, updateSidebarToggle);
    searchToggle.addEventListener(UI.Toolbar.ToolbarButton.Events.Click, event => {
      this._searchToggleClick(event);
    });
    this._panelToolbar.appendToolbarItem(searchToggle);
    this._panelToolbar.appendSeparator();

    this._panelToolbar.appendToolbarItem(new UI.Toolbar.ToolbarSettingCheckbox(
        this._preserveLogSetting, Common.UIString.UIString('Do not clear log on page reload / navigation'),
        Common.UIString.UIString('Preserve log')));

    const disableCacheCheckbox = new UI.Toolbar.ToolbarSettingCheckbox(
        Common.Settings.Settings.instance().moduleSetting('cacheDisabled'),
        Common.UIString.UIString('Disable cache (while DevTools is open)'), Common.UIString.UIString('Disable cache'));
    this._panelToolbar.appendToolbarItem(disableCacheCheckbox);

    this._panelToolbar.appendSeparator();
    this._panelToolbar.appendToolbarItem(this._throttlingSelect);

    this._rightToolbar.appendToolbarItem(new UI.Toolbar.ToolbarItem(this._progressBarContainer));
    this._rightToolbar.appendSeparator();
    this._rightToolbar.appendToolbarItem(new UI.Toolbar.ToolbarSettingToggle(
        this._showSettingsPaneSetting, 'largeicon-settings-gear', ls`Network settings`));

    const settingsToolbarLeft = new UI.Toolbar.Toolbar('', this._settingsPane.element);
    settingsToolbarLeft.makeVertical();
    settingsToolbarLeft.appendToolbarItem(new UI.Toolbar.ToolbarSettingCheckbox(
        this._networkLogLargeRowsSetting, ls`Show more information in request rows`, ls`Use large request rows`));
    settingsToolbarLeft.appendToolbarItem(new UI.Toolbar.ToolbarSettingCheckbox(
        this._networkLogShowOverviewSetting, ls`Show overview of network requests`, ls`Show overview`));

    const settingsToolbarRight = new UI.Toolbar.Toolbar('', this._settingsPane.element);
    settingsToolbarRight.makeVertical();
    settingsToolbarRight.appendToolbarItem(new UI.Toolbar.ToolbarSettingCheckbox(
        Common.Settings.Settings.instance().moduleSetting('network.group-by-frame'),
        ls`Group requests by top level request frame`, ls`Group by frame`));
    settingsToolbarRight.appendToolbarItem(new UI.Toolbar.ToolbarSettingCheckbox(
        this._networkRecordFilmStripSetting, ls`Capture screenshots when loading a page`, ls`Capture screenshots`));

    this._panelToolbar.appendSeparator();
    const importHarButton = new UI.Toolbar.ToolbarButton(ls`Import HAR file...`, 'largeicon-load');
    importHarButton.addEventListener(
        UI.Toolbar.ToolbarButton.Events.Click, () => this._fileSelectorElement.click(), this);
    this._panelToolbar.appendToolbarItem(importHarButton);
    const exportHarButton = new UI.Toolbar.ToolbarButton(ls`Export HAR...`, 'largeicon-download');
    exportHarButton.addEventListener(UI.Toolbar.ToolbarButton.Events.Click, event => {
      this._networkLogView.exportAll();
    }, this);
    this._panelToolbar.appendToolbarItem(exportHarButton);
  }

  _updateSettingsPaneVisibility() {
    this._settingsPane.element.classList.toggle('hidden', !this._showSettingsPaneSetting.get());
  }

  /**
   * @return {!UI.Toolbar.ToolbarComboBox}
   */
  _createThrottlingConditionsSelect() {
    const toolbarItem = new UI.Toolbar.ToolbarComboBox(null, ls`Throttling`);
    toolbarItem.setMaxWidth(160);
    MobileThrottling.ThrottlingManager.throttlingManager().decorateSelectWithNetworkThrottling(
        toolbarItem.selectElement());
    return toolbarItem;
  }

  _toggleRecording() {
    if (!this._preserveLogSetting.get() && !this._toggleRecordAction.toggled()) {
      self.SDK.networkLog.reset();
    }
    this._toggleRecord(!this._toggleRecordAction.toggled());
  }

  /**
   * @param {boolean} toggled
   */
  _toggleRecord(toggled) {
    this._toggleRecordAction.setToggled(toggled);
    this._networkLogView.setRecording(toggled);
    if (!toggled && this._filmStripRecorder) {
      this._filmStripRecorder.stopRecording(this._filmStripAvailable.bind(this));
    }
    // TODO(einbinder) This should be moved to a setting/action that NetworkLog owns but NetworkPanel controls, but
    // always be present in the command menu.
    self.SDK.networkLog.setIsRecording(toggled);
  }

  /**
   * @param {?SDK.FilmStripModel.FilmStripModel} filmStripModel
   */
  _filmStripAvailable(filmStripModel) {
    if (!filmStripModel) {
      return;
    }
    const calculator = this._networkLogView.timeCalculator();
    this._filmStripView.setModel(filmStripModel, calculator.minimumBoundary() * 1000, calculator.boundarySpan() * 1000);
    this._networkOverview.setFilmStripModel(filmStripModel);
    const timestamps = filmStripModel.frames().map(mapTimestamp);

    /**
     * @param {!SDK.FilmStripModel.Frame} frame
     * @return {number}
     */
    function mapTimestamp(frame) {
      return frame.timestamp / 1000;
    }

    this._networkLogView.addFilmStripFrames(timestamps);
  }

  _onNetworkLogReset() {
    BlockedURLsPane.reset();
    if (!this._preserveLogSetting.get()) {
      this._calculator.reset();
      this._overviewPane.reset();
    }
    if (this._filmStripView) {
      this._resetFilmStripView();
    }
  }

  /**
   * @param {!Common.EventTarget.EventTargetEvent} event
   */
  _willReloadPage(event) {
    this._toggleRecord(true);
    if (this._pendingStopTimer) {
      clearTimeout(this._pendingStopTimer);
      delete this._pendingStopTimer;
    }
    if (this.isShowing() && this._filmStripRecorder) {
      this._filmStripRecorder.startRecording();
    }
  }

  /**
   * @param {!Common.EventTarget.EventTargetEvent} event
   */
  _load(event) {
    if (this._filmStripRecorder && this._filmStripRecorder.isRecording()) {
      this._pendingStopTimer = setTimeout(this._stopFilmStripRecording.bind(this), displayScreenshotDelay);
    }
  }

  _stopFilmStripRecording() {
    this._filmStripRecorder.stopRecording(this._filmStripAvailable.bind(this));
    delete this._pendingStopTimer;
  }

  _toggleLargerRequests() {
    this._updateUI();
  }

  _toggleShowOverview() {
    const toggled = this._networkLogShowOverviewSetting.get();
    if (toggled) {
      this._overviewPane.show(this._overviewPlaceholderElement);
    } else {
      this._overviewPane.detach();
    }
    this.doResize();
  }

  _toggleRecordFilmStrip() {
    const toggled = this._networkRecordFilmStripSetting.get();
    if (toggled && !this._filmStripRecorder) {
      this._filmStripView = new PerfUI.FilmStripView.FilmStripView();
      this._filmStripView.setMode(PerfUI.FilmStripView.Modes.FrameBased);
      this._filmStripView.element.classList.add('network-film-strip');
      this._filmStripRecorder = new FilmStripRecorder(this._networkLogView.timeCalculator(), this._filmStripView);
      this._filmStripView.show(this._filmStripPlaceholderElement);
      this._filmStripView.addEventListener(PerfUI.FilmStripView.Events.FrameSelected, this._onFilmFrameSelected, this);
      this._filmStripView.addEventListener(PerfUI.FilmStripView.Events.FrameEnter, this._onFilmFrameEnter, this);
      this._filmStripView.addEventListener(PerfUI.FilmStripView.Events.FrameExit, this._onFilmFrameExit, this);
      this._resetFilmStripView();
    }

    if (!toggled && this._filmStripRecorder) {
      this._filmStripView.detach();
      this._filmStripView = null;
      this._filmStripRecorder = null;
    }
  }

  _resetFilmStripView() {
    const reloadShortcutDescriptor = self.UI.shortcutRegistry.shortcutDescriptorsForAction('inspector_main.reload')[0];

    this._filmStripView.reset();
    if (reloadShortcutDescriptor) {
      this._filmStripView.setStatusText(
          Common.UIString.UIString('Hit %s to reload and capture filmstrip.', reloadShortcutDescriptor.name));
    }
  }

  /**
   * @override
   * @return {!Array.<!Element>}
   */
  elementsToRestoreScrollPositionsFor() {
    return this._networkLogView.elementsToRestoreScrollPositionsFor();
  }

  /**
   * @override
   */
  wasShown() {
    self.UI.context.setFlavor(NetworkPanel, this);

    // Record the network tool load time after the panel has loaded.
    Host.userMetrics.panelLoaded('network', 'DevTools.Launch.Network');
  }

  /**
   * @override
   */
  willHide() {
    self.UI.context.setFlavor(NetworkPanel, null);
  }

  /**
   * @param {!SDK.NetworkRequest.NetworkRequest} request
   */
  revealAndHighlightRequest(request) {
    this._hideRequestPanel();
    if (request) {
      this._networkLogView.revealAndHighlightRequest(request);
    }
  }

  /**
   * @param {!SDK.NetworkRequest.NetworkRequest} request
   * @return {!Promise<?NetworkItemView>}
   */
  async selectRequest(request) {
    await UI.ViewManager.ViewManager.instance().showView('network');
    this._networkLogView.selectRequest(request);
    return this._networkItemView;
  }

  /**
   * @param {!Common.EventTarget.EventTargetEvent} event
   */
  _handleFilterChanged(event) {
    this._hideRequestPanel();
  }

  /**
   * @param {!Common.EventTarget.EventTargetEvent} event
   */
  _onRowSizeChanged(event) {
    this._updateUI();
  }

  /**
   * @param {!Common.EventTarget.EventTargetEvent} event
   */
  _onRequestSelected(event) {
    const request = /** @type {?SDK.NetworkRequest.NetworkRequest} */ (event.data);
    this._currentRequest = request;
    this._networkOverview.setHighlightedRequest(request);
    this._updateNetworkItemView();
  }

  /**
   * @param {!{data: *}} event
   */
  _onRequestActivated(event) {
    const eventData = /** @type {!{showPanel: boolean, tab: !NetworkItemViewTabs}} */ (event.data);
    if (eventData.showPanel) {
      this._showRequestPanel(eventData.tab);
    } else {
      this._hideRequestPanel();
    }
  }

  /**
   * @param {!NetworkItemViewTabs=} shownTab
   */
  _showRequestPanel(shownTab) {
    this._clearNetworkItemView();
    if (this._currentRequest) {
      this._createNetworkItemView(shownTab);
    }
    this._updateUI();
  }

  _hideRequestPanel() {
    this._clearNetworkItemView();
    this._splitWidget.hideMain();
    this._updateUI();
  }

  _updateNetworkItemView() {
    if (this._splitWidget.showMode() === UI.SplitWidget.ShowMode.Both) {
      this._clearNetworkItemView();
      this._createNetworkItemView();
      this._updateUI();
    }
  }

  _clearNetworkItemView() {
    if (this._networkItemView) {
      this._networkItemView.detach();
      this._networkItemView = null;
    }
  }
  /**
   * @param {!NetworkItemViewTabs=} initialTab
   */
  _createNetworkItemView(initialTab) {
    if (!this._currentRequest) {
      return;
    }
    this._networkItemView =
        new NetworkItemView(this._currentRequest, this._networkLogView.timeCalculator(), initialTab);
    this._networkItemView.leftToolbar().appendToolbarItem(new UI.Toolbar.ToolbarItem(this._closeButtonElement));
    this._networkItemView.show(this._detailsWidget.element);
    this._splitWidget.showBoth();
  }

  _updateUI() {
    this._detailsWidget.element.classList.toggle(
        'network-details-view-tall-header', this._networkLogLargeRowsSetting.get());
    this._networkLogView.switchViewMode(!this._splitWidget.isResizable());
  }

  /**
   * @override
   * @param {!Event} event
   * @param {!UI.ContextMenu.ContextMenu} contextMenu
   * @param {!Object} target
   * @this {NetworkPanel}
   */
  appendApplicableItems(event, contextMenu, target) {
    /**
     * @this {NetworkPanel}
     */
    function reveal(request) {
      UI.ViewManager.ViewManager.instance()
          .showView('network')
          .then(this._networkLogView.resetFilter.bind(this._networkLogView))
          .then(this.revealAndHighlightRequest.bind(this, request));
    }

    /**
     * @this {NetworkPanel}
     */
    function appendRevealItem(request) {
      contextMenu.revealSection().appendItem(
          Common.UIString.UIString('Reveal in Network panel'), reveal.bind(this, request));
    }

    if (event.target.isSelfOrDescendant(this.element)) {
      return;
    }

    if (target instanceof SDK.Resource.Resource) {
      const resource = /** @type {!SDK.Resource.Resource} */ (target);
      if (resource.request) {
        appendRevealItem.call(this, resource.request);
      }
      return;
    }
    if (target instanceof Workspace.UISourceCode.UISourceCode) {
      const uiSourceCode = /** @type {!Workspace.UISourceCode.UISourceCode} */ (target);
      const resource = Bindings.ResourceUtils.resourceForURL(uiSourceCode.url());
      if (resource && resource.request) {
        appendRevealItem.call(this, resource.request);
      }
      return;
    }

    if (!(target instanceof SDK.NetworkRequest.NetworkRequest)) {
      return;
    }
    const request = /** @type {!SDK.NetworkRequest.NetworkRequest} */ (target);
    if (this._networkItemView && this._networkItemView.isShowing() && this._networkItemView.request() === request) {
      return;
    }

    appendRevealItem.call(this, request);
  }

  /**
   * @param {!Common.EventTarget.EventTargetEvent} event
   */
  _onFilmFrameSelected(event) {
    const timestamp = /** @type {number} */ (event.data);
    this._overviewPane.setWindowTimes(0, timestamp);
  }

  /**
   * @param {!Common.EventTarget.EventTargetEvent} event
   */
  _onFilmFrameEnter(event) {
    const timestamp = /** @type {number} */ (event.data);
    this._networkOverview.selectFilmStripFrame(timestamp);
    this._networkLogView.selectFilmStripFrame(timestamp / 1000);
  }

  /**
   * @param {!Common.EventTarget.EventTargetEvent} event
   */
  _onFilmFrameExit(event) {
    this._networkOverview.clearFilmStripFrame();
    this._networkLogView.clearFilmStripFrame();
  }

  /**
   * @param {!Common.EventTarget.EventTargetEvent} event
   */
  _onUpdateRequest(event) {
    const request = /** @type {!SDK.NetworkRequest.NetworkRequest} */ (event.data);
    this._calculator.updateBoundaries(request);
    // FIXME: Unify all time units across the frontend!
    this._overviewPane.setBounds(this._calculator.minimumBoundary() * 1000, this._calculator.maximumBoundary() * 1000);
    this._networkOverview.updateRequest(request);
    this._overviewPane.scheduleUpdate();
  }

  /**
   * @override
   * @param {string} locationName
   * @return {?UI.View.ViewLocation}
   */
  resolveLocation(locationName) {
    if (locationName === 'network-sidebar') {
      return this._sidebarLocation;
    }
    return null;
  }
}

export const displayScreenshotDelay = 1000;

/**
 * @implements {UI.ContextMenu.Provider}
 * @unrestricted
 */
export class ContextMenuProvider {
  /**
   * @override
   * @param {!Event} event
   * @param {!UI.ContextMenu.ContextMenu} contextMenu
   * @param {!Object} target
   */
  appendApplicableItems(event, contextMenu, target) {
    NetworkPanel._instance().appendApplicableItems(event, contextMenu, target);
  }
}

/**
 * @implements {Common.Revealer.Revealer}
 * @unrestricted
 */
export class RequestRevealer {
  /**
   * @override
   * @param {!Object} request
   * @return {!Promise}
   */
  reveal(request) {
    if (!(request instanceof SDK.NetworkRequest.NetworkRequest)) {
      return Promise.reject(new Error('Internal error: not a network request'));
    }
    const panel = NetworkPanel._instance();
    return UI.ViewManager.ViewManager.instance().showView('network').then(
        panel.revealAndHighlightRequest.bind(panel, request));
  }
}

/**
 * @implements {SDK.TracingManager.TracingManagerClient}
 */
export class FilmStripRecorder {
  /**
   * @param {!NetworkTimeCalculator} timeCalculator
   * @param {!PerfUI.FilmStripView.FilmStripView} filmStripView
   */
  constructor(timeCalculator, filmStripView) {
    /** @type {?SDK.TracingManager.TracingManager} */
    this._tracingManager = null;
    /** @type {?SDK.ResourceTreeModel.ResourceTreeModel} */
    this._resourceTreeModel = null;
    this._timeCalculator = timeCalculator;
    this._filmStripView = filmStripView;
    /** @type {?SDK.TracingModel.TracingModel} */
    this._tracingModel = null;
    /** @type {?function(?SDK.FilmStripModel.FilmStripModel)} */
    this._callback = null;
  }

  /**
   * @override
   * @param {!Array.<!SDK.TracingManager.EventPayload>} events
   */
  traceEventsCollected(events) {
    if (this._tracingModel) {
      this._tracingModel.addEvents(events);
    }
  }

  /**
   * @override
   */
  tracingComplete() {
    if (!this._tracingModel || !this._tracingManager) {
      return;
    }
    this._tracingModel.tracingComplete();
    this._tracingManager = null;
    this._callback(
        new SDK.FilmStripModel.FilmStripModel(this._tracingModel, this._timeCalculator.minimumBoundary() * 1000));
    this._callback = null;
    if (this._resourceTreeModel) {
      this._resourceTreeModel.resumeReload();
    }
    this._resourceTreeModel = null;
  }

  /**
   * @override
   */
  tracingBufferUsage() {
  }

  /**
   * @override
   * @param {number} progress
   */
  eventsRetrievalProgress(progress) {
  }

  startRecording() {
    this._filmStripView.reset();
    this._filmStripView.setStatusText(Common.UIString.UIString('Recording frames...'));
    const tracingManagers = SDK.SDKModel.TargetManager.instance().models(SDK.TracingManager.TracingManager);
    if (this._tracingManager || !tracingManagers.length) {
      return;
    }

    this._tracingManager = tracingManagers[0];
    this._resourceTreeModel = this._tracingManager.target().model(SDK.ResourceTreeModel.ResourceTreeModel);
    if (this._tracingModel) {
      this._tracingModel.dispose();
    }
    this._tracingModel = new SDK.TracingModel.TracingModel(new Bindings.TempFile.TempFileBackingStorage());
    this._tracingManager.start(this, '-*,disabled-by-default-devtools.screenshot', '');

    Host.userMetrics.actionTaken(Host.UserMetrics.Action.FilmStripStartedRecording);
  }

  /**
   * @return {boolean}
   */
  isRecording() {
    return !!this._tracingManager;
  }

  /**
   * @param {function(?SDK.FilmStripModel.FilmStripModel)} callback
   */
  stopRecording(callback) {
    if (!this._tracingManager) {
      return;
    }

    this._tracingManager.stop();
    if (this._resourceTreeModel) {
      this._resourceTreeModel.suspendReload();
    }
    this._callback = callback;
    this._filmStripView.setStatusText(Common.UIString.UIString('Fetching frames...'));
  }
}

/**
 * @implements {UI.ActionDelegate.ActionDelegate}
 */
export class ActionDelegate {
  /**
   * @override
   * @param {!UI.Context.Context} context
   * @param {string} actionId
   * @return {boolean}
   */
  handleAction(context, actionId) {
    const panel = self.UI.context.flavor(NetworkPanel);
    console.assert(panel && panel instanceof NetworkPanel);
    switch (actionId) {
      case 'network.toggle-recording': {
        panel._toggleRecording();
        return true;
      }
      case 'network.hide-request-details': {
        if (!panel._networkItemView) {
          return false;
        }
        panel._hideRequestPanel();
        panel._networkLogView.resetFocus();
        return true;
      }
      case 'network.search': {
        const selection = self.UI.inspectorView.element.window().getSelection();
        let queryCandidate = '';
        if (selection.rangeCount) {
          queryCandidate = selection.toString().replace(/\r?\n.*/, '');
        }
        SearchNetworkView.openSearch(queryCandidate);
        return true;
      }
    }
    return false;
  }
}

/**
 * @implements {Common.Revealer.Revealer}
 */
export class RequestLocationRevealer {
  /**
   * @override
   * @param {!Object} match
   * @return {!Promise}
   */
  async reveal(match) {
    const location = /** @type {!UIRequestLocation} */ (match);
    const view = await NetworkPanel._instance().selectRequest(location.request);
    if (!view) {
      return;
    }
    if (location.searchMatch) {
      await view.revealResponseBody(location.searchMatch.lineNumber);
    }
    if (location.requestHeader) {
      view.revealRequestHeader(location.requestHeader.name);
    }
    if (location.responseHeader) {
      view.revealResponseHeader(location.responseHeader.name);
    }
  }
}

export class SearchNetworkView extends Search.SearchView.SearchView {
  constructor() {
    super('network');
  }

  /**
   * @param {string} query
   * @param {boolean=} searchImmediately
   * @return {!Promise<!Search.SearchView.SearchView>}
   */
  static async openSearch(query, searchImmediately) {
    await UI.ViewManager.ViewManager.instance().showView('network.search-network-tab');
    const searchView =
        /** @type {!SearchNetworkView} */ (self.runtime.sharedInstance(SearchNetworkView));
    searchView.toggle(query, !!searchImmediately);
    return searchView;
  }

  /**
   * @override
   * @return {!Search.SearchConfig.SearchScope}
   */
  createScope() {
    return new NetworkSearchScope();
  }
}
