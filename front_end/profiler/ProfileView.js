// Copyright 2016 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as Bindings from '../bindings/bindings.js';
import * as Common from '../common/common.js';
import * as Components from '../components/components.js';
import * as DataGrid from '../data_grid/data_grid.js';  // eslint-disable-line no-unused-vars
import * as Host from '../host/host.js';
import * as PerfUI from '../perf_ui/perf_ui.js';
import * as SDK from '../sdk/sdk.js';  // eslint-disable-line no-unused-vars
import * as UI from '../ui/ui.js';

import {BottomUpProfileDataGridTree} from './BottomUpProfileDataGrid.js';
import {CPUProfileFlameChart, ProfileFlameChartDataProvider} from './CPUProfileFlameChart.js';  // eslint-disable-line no-unused-vars
import {Formatter, ProfileDataGridNode, ProfileDataGridTree} from './ProfileDataGrid.js';  // eslint-disable-line no-unused-vars
import {DataDisplayDelegate, Events, ProfileHeader, ProfileType} from './ProfileHeader.js';  // eslint-disable-line no-unused-vars
import {ProfileSidebarTreeElement} from './ProfileSidebarTreeElement.js';
import {TopDownProfileDataGridTree} from './TopDownProfileDataGrid.js';

/**
 * @implements {UI.SearchableView.Searchable}
 * @unrestricted
 */
export class ProfileView extends UI.View.SimpleView {
  constructor() {
    super(Common.UIString.UIString('Profile'));

    this._profile = null;

    this._searchableView = new UI.SearchableView.SearchableView(this);
    this._searchableView.setPlaceholder(Common.UIString.UIString('Find by cost (>50ms), name or file'));
    this._searchableView.show(this.element);

    const columns = /** @type {!Array<!DataGrid.DataGrid.ColumnDescriptor>} */ ([]);
    columns.push({
      id: 'self',
      title: this.columnHeader('self'),
      width: '120px',
      fixedWidth: true,
      sortable: true,
      sort: DataGrid.DataGrid.Order.Descending
    });
    columns.push({id: 'total', title: this.columnHeader('total'), width: '120px', fixedWidth: true, sortable: true});
    columns.push({id: 'function', title: Common.UIString.UIString('Function'), disclosure: true, sortable: true});

    this.dataGrid = new DataGrid.DataGrid.DataGridImpl({displayName: ls`Profiler`, columns});
    this.dataGrid.addEventListener(DataGrid.DataGrid.Events.SortingChanged, this._sortProfile, this);
    this.dataGrid.addEventListener(DataGrid.DataGrid.Events.SelectedNode, this._nodeSelected.bind(this, true));
    this.dataGrid.addEventListener(DataGrid.DataGrid.Events.DeselectedNode, this._nodeSelected.bind(this, false));
    this.dataGrid.setRowContextMenuCallback(this._populateContextMenu.bind(this));

    this.viewSelectComboBox = new UI.Toolbar.ToolbarComboBox(this._changeView.bind(this), ls`Profile view mode`);

    this.focusButton =
        new UI.Toolbar.ToolbarButton(Common.UIString.UIString('Focus selected function'), 'largeicon-visibility');
    this.focusButton.setEnabled(false);
    this.focusButton.addEventListener(UI.Toolbar.ToolbarButton.Events.Click, this._focusClicked, this);

    this.excludeButton =
        new UI.Toolbar.ToolbarButton(Common.UIString.UIString('Exclude selected function'), 'largeicon-delete');
    this.excludeButton.setEnabled(false);
    this.excludeButton.addEventListener(UI.Toolbar.ToolbarButton.Events.Click, this._excludeClicked, this);

    this.resetButton =
        new UI.Toolbar.ToolbarButton(Common.UIString.UIString('Restore all functions'), 'largeicon-refresh');
    this.resetButton.setEnabled(false);
    this.resetButton.addEventListener(UI.Toolbar.ToolbarButton.Events.Click, this._resetClicked, this);

    this._linkifier = new Components.Linkifier.Linkifier(maxLinkLength);
  }

  /**
   * @param {!Array<!{title: string, value: string}>} entryInfo
   * @return {!Element}
   */
  static buildPopoverTable(entryInfo) {
    const table = createElement('table');
    for (const entry of entryInfo) {
      const row = table.createChild('tr');
      row.createChild('td').textContent = entry.title;
      row.createChild('td').textContent = entry.value;
    }
    return table;
  }

  /**
   * @param {!SDK.ProfileTreeModel.ProfileTreeModel} profile
   */
  setProfile(profile) {
    this._profile = profile;
    this._bottomUpProfileDataGridTree = null;
    this._topDownProfileDataGridTree = null;
    this._changeView();
    this.refresh();
  }

  /**
   * @return {?SDK.ProfileTreeModel.ProfileTreeModel}
   */
  profile() {
    return this._profile;
  }

  /**
   * @param {!Formatter} nodeFormatter
   * @param {!Array<string>=} viewTypes
   * @protected
   */
  initialize(nodeFormatter, viewTypes) {
    this._nodeFormatter = nodeFormatter;

    this._viewType = Common.Settings.Settings.instance().createSetting('profileView', ViewTypes.Heavy);
    viewTypes = viewTypes || [ViewTypes.Flame, ViewTypes.Heavy, ViewTypes.Tree];

    const optionNames = new Map([
      [ViewTypes.Flame, ls`Chart`],
      [ViewTypes.Heavy, ls`Heavy (Bottom Up)`],
      [ViewTypes.Tree, ls`Tree (Top Down)`],
      [ViewTypes.Text, ls`Text (Top Down)`],
    ]);

    const options =
        new Map(viewTypes.map(type => [type, this.viewSelectComboBox.createOption(optionNames.get(type), type)]));
    const optionName = this._viewType.get() || viewTypes[0];
    const option = options.get(optionName) || options.get(viewTypes[0]);
    this.viewSelectComboBox.select(option);

    this._changeView();
    if (this._flameChart) {
      this._flameChart.update();
    }
  }

  /**
   * @override
   */
  focus() {
    if (this._flameChart) {
      this._flameChart.focus();
    } else {
      super.focus();
    }
  }

  /**
   * @param {string} columnId
   * @return {string}
   */
  columnHeader(columnId) {
    throw 'Not implemented';
  }

  /**
   * @param {number} timeLeft
   * @param {number} timeRight
   */
  selectRange(timeLeft, timeRight) {
    if (!this._flameChart) {
      return;
    }
    this._flameChart.selectRange(timeLeft, timeRight);
  }

  /**
   * @override
   * @return {!Promise<!Array<!UI.Toolbar.ToolbarItem>>}
   */
  async toolbarItems() {
    return [this.viewSelectComboBox, this.focusButton, this.excludeButton, this.resetButton];
  }

  /**
   * @return {!ProfileDataGridTree}
   */
  _getBottomUpProfileDataGridTree() {
    if (!this._bottomUpProfileDataGridTree) {
      this._bottomUpProfileDataGridTree = new BottomUpProfileDataGridTree(
          this._nodeFormatter, this._searchableView, this._profile.root, this.adjustedTotal);
    }
    return this._bottomUpProfileDataGridTree;
  }

  /**
   * @return {!ProfileDataGridTree}
   */
  _getTopDownProfileDataGridTree() {
    if (!this._topDownProfileDataGridTree) {
      this._topDownProfileDataGridTree = new TopDownProfileDataGridTree(
          this._nodeFormatter, this._searchableView, this._profile.root, this.adjustedTotal);
    }
    return this._topDownProfileDataGridTree;
  }

  /**
   * @param {!UI.ContextMenu.ContextMenu} contextMenu
   * @param {!DataGrid.DataGrid.DataGridNode} gridNode
   */
  _populateContextMenu(contextMenu, gridNode) {
    const node = /** @type {!ProfileDataGridNode} */ (gridNode);
    if (node.linkElement && !contextMenu.containsTarget(node.linkElement)) {
      contextMenu.appendApplicableItems(node.linkElement);
    }
  }

  /**
   * @override
   */
  willHide() {
    this._currentSearchResultIndex = -1;
  }

  refresh() {
    if (!this.profileDataGridTree) {
      return;
    }
    const selectedProfileNode = this.dataGrid.selectedNode ? this.dataGrid.selectedNode.profileNode : null;

    this.dataGrid.rootNode().removeChildren();

    const children = this.profileDataGridTree.children;
    const count = children.length;

    for (let index = 0; index < count; ++index) {
      this.dataGrid.rootNode().appendChild(children[index]);
    }

    if (selectedProfileNode) {
      selectedProfileNode.selected = true;
    }
  }

  refreshVisibleData() {
    let child = this.dataGrid.rootNode().children[0];
    while (child) {
      child.refresh();
      child = child.traverseNextNode(false, null, true);
    }
  }

  /**
   * @return {!UI.SearchableView.SearchableView}
   */
  searchableView() {
    return this._searchableView;
  }

  /**
   * @override
   * @return {boolean}
   */
  supportsCaseSensitiveSearch() {
    return true;
  }

  /**
   * @override
   * @return {boolean}
   */
  supportsRegexSearch() {
    return false;
  }

  /**
   * @override
   */
  searchCanceled() {
    this._searchableElement.searchCanceled();
  }

  /**
   * @override
   * @param {!UI.SearchableView.SearchConfig} searchConfig
   * @param {boolean} shouldJump
   * @param {boolean=} jumpBackwards
   */
  performSearch(searchConfig, shouldJump, jumpBackwards) {
    this._searchableElement.performSearch(searchConfig, shouldJump, jumpBackwards);
  }

  /**
   * @override
   */
  jumpToNextSearchResult() {
    this._searchableElement.jumpToNextSearchResult();
  }

  /**
   * @override
   */
  jumpToPreviousSearchResult() {
    this._searchableElement.jumpToPreviousSearchResult();
  }

  /**
   * @return {!Components.Linkifier.Linkifier}
   */
  linkifier() {
    return this._linkifier;
  }

  _ensureTextViewCreated() {
    if (this._textView) {
      return;
    }
    this._textView = new UI.View.SimpleView(ls`Call tree`);
    this._textView.registerRequiredCSS('profiler/profilesPanel.css');
    this.populateTextView(this._textView);
  }

  /**
   * @param {!UI.View.SimpleView} view
   */
  populateTextView(view) {
  }

  /**
   * @return {!ProfileFlameChartDataProvider}
   */
  createFlameChartDataProvider() {
    throw 'Not implemented';
  }

  _ensureFlameChartCreated() {
    if (this._flameChart) {
      return;
    }
    this._dataProvider = this.createFlameChartDataProvider();
    this._flameChart = new CPUProfileFlameChart(this._searchableView, this._dataProvider);
    this._flameChart.addEventListener(PerfUI.FlameChart.Events.EntryInvoked, event => {
      this._onEntryInvoked(event);
    });
  }

  /**
   * @param {!Common.EventTarget.EventTargetEvent} event
   */
  async _onEntryInvoked(event) {
    const entryIndex = event.data;
    const node = this._dataProvider._entryNodes[entryIndex];
    const debuggerModel = this._profileHeader._debuggerModel;
    if (!node || !node.scriptId || !debuggerModel) {
      return;
    }
    const script = debuggerModel.scriptForId(node.scriptId);
    if (!script) {
      return;
    }
    const location = /** @type {!SDK.DebuggerModel.Location} */ (
        debuggerModel.createRawLocation(script, node.lineNumber, node.columnNumber));
    const uiLocation =
        await Bindings.DebuggerWorkspaceBinding.DebuggerWorkspaceBinding.instance().rawLocationToUILocation(location);
    Common.Revealer.reveal(uiLocation);
  }

  _changeView() {
    if (!this._profile) {
      return;
    }

    this._searchableView.closeSearch();

    if (this._visibleView) {
      this._visibleView.detach();
    }

    this._viewType.set(this.viewSelectComboBox.selectedOption().value);
    switch (this._viewType.get()) {
      case ViewTypes.Flame:
        this._ensureFlameChartCreated();
        this._visibleView = this._flameChart;
        this._searchableElement = this._flameChart;
        break;
      case ViewTypes.Tree:
        this.profileDataGridTree = this._getTopDownProfileDataGridTree();
        this._sortProfile();
        this._visibleView = this.dataGrid.asWidget();
        this._searchableElement = this.profileDataGridTree;
        break;
      case ViewTypes.Heavy:
        this.profileDataGridTree = this._getBottomUpProfileDataGridTree();
        this._sortProfile();
        this._visibleView = this.dataGrid.asWidget();
        this._searchableElement = this.profileDataGridTree;
        break;
      case ViewTypes.Text:
        this._ensureTextViewCreated();
        this._visibleView = this._textView;
        this._searchableElement = this._textView;
        break;
    }

    const isFlame = this._viewType.get() === ViewTypes.Flame;
    this.focusButton.setVisible(!isFlame);
    this.excludeButton.setVisible(!isFlame);
    this.resetButton.setVisible(!isFlame);

    this._visibleView.show(this._searchableView.element);
  }

  /**
   * @param {boolean} selected
   */
  _nodeSelected(selected) {
    this.focusButton.setEnabled(selected);
    this.excludeButton.setEnabled(selected);
  }

  /**
   * @param {!Common.EventTarget.EventTargetEvent} event
   */
  _focusClicked(event) {
    if (!this.dataGrid.selectedNode) {
      return;
    }

    this.resetButton.setEnabled(true);
    this.resetButton.element.focus();
    this.profileDataGridTree.focus(this.dataGrid.selectedNode);
    this.refresh();
    this.refreshVisibleData();
    Host.userMetrics.actionTaken(Host.UserMetrics.Action.CpuProfileNodeFocused);
  }

  /**
   * @param {!Common.EventTarget.EventTargetEvent} event
   */
  _excludeClicked(event) {
    const selectedNode = this.dataGrid.selectedNode;

    if (!selectedNode) {
      return;
    }

    this.resetButton.setEnabled(true);
    this.resetButton.element.focus();

    selectedNode.deselect();

    this.profileDataGridTree.exclude(selectedNode);
    this.refresh();
    this.refreshVisibleData();
    Host.userMetrics.actionTaken(Host.UserMetrics.Action.CpuProfileNodeExcluded);
  }

  /**
   * @param {!Common.EventTarget.EventTargetEvent} event
   */
  _resetClicked(event) {
    this.viewSelectComboBox.selectElement().focus();
    this.resetButton.setEnabled(false);
    this.profileDataGridTree.restore();
    this._linkifier.reset();
    this.refresh();
    this.refreshVisibleData();
  }

  _sortProfile() {
    const sortAscending = this.dataGrid.isSortOrderAscending();
    const sortColumnId = this.dataGrid.sortColumnId();
    const sortProperty = sortColumnId === 'function' ? 'functionName' : sortColumnId || '';
    this.profileDataGridTree.sort(ProfileDataGridTree.propertyComparator(sortProperty, sortAscending));

    this.refresh();
  }
}

export const maxLinkLength = 30;

/** @enum {string} */
export const ViewTypes = {
  Flame: 'Flame',
  Tree: 'Tree',
  Heavy: 'Heavy',
  Text: 'Text'
};

/**
 * @implements {Common.StringOutputStream.OutputStream}
 * @unrestricted
 */
export class WritableProfileHeader extends ProfileHeader {
  /**
   * @param {?SDK.DebuggerModel.DebuggerModel} debuggerModel
   * @param {!ProfileType} type
   * @param {string=} title
   */
  constructor(debuggerModel, type, title) {
    super(type, title || Common.UIString.UIString('Profile %d', type.nextProfileUid()));
    this._debuggerModel = debuggerModel;
    this._tempFile = null;
  }

  /**
   * @param {!Bindings.FileUtils.ChunkedReader} reader
   */
  _onChunkTransferred(reader) {
    this.updateStatus(
        Common.UIString.UIString('Loading… %d%%', Number.bytesToString(this._jsonifiedProfile.length)));
  }

  /**
   * @param {!Bindings.FileUtils.ChunkedReader} reader
   */
  _onError(reader) {
    this.updateStatus(Common.UIString.UIString('File \'%s\' read error: %s', reader.fileName(), reader.error().message));
  }

  /**
   * @override
   * @param {string} text
   * @return {!Promise}
   */
  async write(text) {
    this._jsonifiedProfile += text;
  }

  /**
   * @override
   */
  close() {
  }

  /**
   * @override
   */
  dispose() {
    this.removeTempFile();
  }

  /**
   * @override
   * @param {!DataDisplayDelegate} panel
   * @return {!ProfileSidebarTreeElement}
   */
  createSidebarTreeElement(panel) {
    return new ProfileSidebarTreeElement(panel, this, 'profile-sidebar-tree-item');
  }

  /**
   * @override
   * @return {boolean}
   */
  canSaveToFile() {
    return !this.fromFile() && this._protocolProfile;
  }

  /**
   * @override
   */
  async saveToFile() {
    const fileOutputStream = new Bindings.FileUtils.FileOutputStream();
    this._fileName = this._fileName ||
        `${this.profileType().typeName()}-${new Date().toISO8601Compact()}${this.profileType().fileExtension()}`;
    const accepted = await fileOutputStream.open(this._fileName);
    if (!accepted || !this._tempFile) {
      return;
    }
    const data = await this._tempFile.read();
    if (data) {
      await fileOutputStream.write(data);
    }
    fileOutputStream.close();
  }

  /**
   * @override
   * @param {!File} file
   * @return {!Promise<?Error>}
   */
  async loadFromFile(file) {
    this.updateStatus(Common.UIString.UIString('Loading…'), true);
    const fileReader = new Bindings.FileUtils.ChunkedFileReader(file, 10000000, this._onChunkTransferred.bind(this));
    this._jsonifiedProfile = '';

    const success = await fileReader.read(this);
    if (!success) {
      this._onError(fileReader);
      return new Error(Common.UIString.UIString('Failed to read file'));
    }

    this.updateStatus(Common.UIString.UIString('Parsing…'), true);
    let error = null;
    try {
      this._profile = /** @type {!Protocol.Profiler.Profile} */ (JSON.parse(this._jsonifiedProfile));
      this.setProfile(this._profile);
      this.updateStatus(Common.UIString.UIString('Loaded'), false);
    } catch (e) {
      error = e;
      this.profileType().removeProfile(this);
    }
    this._jsonifiedProfile = null;

    if (this.profileType().profileBeingRecorded() === this) {
      this.profileType().setProfileBeingRecorded(null);
    }
    return error;
  }

  /**
   * @param {!Protocol.Profiler.Profile} profile
   */
  setProtocolProfile(profile) {
    this.setProfile(profile);
    this._protocolProfile = profile;
    this._tempFile = new Bindings.TempFile.TempFile();
    this._tempFile.write([JSON.stringify(profile)]);
    if (this.canSaveToFile()) {
      this.dispatchEventToListeners(Events.ProfileReceived);
    }
  }
}
