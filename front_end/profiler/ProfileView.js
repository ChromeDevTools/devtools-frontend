// Copyright 2016 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.
/**
 * @implements {UI.Searchable}
 * @unrestricted
 */
Profiler.ProfileView = class extends UI.SimpleView {
  constructor() {
    super(Common.UIString('Profile'));

    this._searchableView = new UI.SearchableView(this);
    this._searchableView.setPlaceholder(Common.UIString('Find by cost (>50ms), name or file'));
    this._searchableView.show(this.element);

    var columns = /** @type {!Array<!DataGrid.DataGrid.ColumnDescriptor>} */ ([]);
    columns.push({
      id: 'self',
      title: this.columnHeader('self'),
      width: '120px',
      fixedWidth: true,
      sortable: true,
      sort: DataGrid.DataGrid.Order.Descending
    });
    columns.push({id: 'total', title: this.columnHeader('total'), width: '120px', fixedWidth: true, sortable: true});
    columns.push({id: 'function', title: Common.UIString('Function'), disclosure: true, sortable: true});

    this.dataGrid = new DataGrid.DataGrid(columns);
    this.dataGrid.addEventListener(DataGrid.DataGrid.Events.SortingChanged, this._sortProfile, this);
    this.dataGrid.addEventListener(DataGrid.DataGrid.Events.SelectedNode, this._nodeSelected.bind(this, true));
    this.dataGrid.addEventListener(DataGrid.DataGrid.Events.DeselectedNode, this._nodeSelected.bind(this, false));

    this.viewSelectComboBox = new UI.ToolbarComboBox(this._changeView.bind(this));

    this.focusButton = new UI.ToolbarButton(Common.UIString('Focus selected function'), 'largeicon-visibility');
    this.focusButton.setEnabled(false);
    this.focusButton.addEventListener(UI.ToolbarButton.Events.Click, this._focusClicked, this);

    this.excludeButton = new UI.ToolbarButton(Common.UIString('Exclude selected function'), 'largeicon-delete');
    this.excludeButton.setEnabled(false);
    this.excludeButton.addEventListener(UI.ToolbarButton.Events.Click, this._excludeClicked, this);

    this.resetButton = new UI.ToolbarButton(Common.UIString('Restore all functions'), 'largeicon-refresh');
    this.resetButton.setEnabled(false);
    this.resetButton.addEventListener(UI.ToolbarButton.Events.Click, this._resetClicked, this);

    this._linkifier = new Components.Linkifier(Profiler.ProfileView._maxLinkLength);
  }

  /**
   * @param {!Array<!{title: string, value: string}>} entryInfo
   * @return {!Element}
   */
  static buildPopoverTable(entryInfo) {
    var table = createElement('table');
    for (var entry of entryInfo) {
      var row = table.createChild('tr');
      row.createChild('td').textContent = entry.title;
      row.createChild('td').textContent = entry.value;
    }
    return table;
  }

  /**
   * @param {!Profiler.ProfileDataGridNode.Formatter} nodeFormatter
   * @param {!Array<string>=} viewTypes
   * @protected
   */
  initialize(nodeFormatter, viewTypes) {
    this._nodeFormatter = nodeFormatter;

    this._viewType = Common.settings.createSetting('profileView', Profiler.ProfileView.ViewTypes.Heavy);
    viewTypes = viewTypes || [
      Profiler.ProfileView.ViewTypes.Flame, Profiler.ProfileView.ViewTypes.Heavy, Profiler.ProfileView.ViewTypes.Tree
    ];

    var optionNames = new Map([
      [Profiler.ProfileView.ViewTypes.Flame, Common.UIString('Chart')],
      [Profiler.ProfileView.ViewTypes.Heavy, Common.UIString('Heavy (Bottom Up)')],
      [Profiler.ProfileView.ViewTypes.Tree, Common.UIString('Tree (Top Down)')],
    ]);

    var options =
        new Map(viewTypes.map(type => [type, this.viewSelectComboBox.createOption(optionNames.get(type), '', type)]));
    var optionName = this._viewType.get() || viewTypes[0];
    var option = options.get(optionName) || options.get(viewTypes[0]);
    this.viewSelectComboBox.select(option);

    this._changeView();
    if (this._flameChart)
      this._flameChart.update();
  }

  /**
   * @override
   */
  focus() {
    if (this._flameChart)
      this._flameChart.focus();
    else
      super.focus();
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
    if (!this._flameChart)
      return;
    this._flameChart.selectRange(timeLeft, timeRight);
  }

  /**
   * @override
   * @return {!Array.<!UI.ToolbarItem>}
   */
  syncToolbarItems() {
    return [this.viewSelectComboBox, this.focusButton, this.excludeButton, this.resetButton];
  }

  /**
   * @return {!Profiler.ProfileDataGridTree}
   */
  _getBottomUpProfileDataGridTree() {
    if (!this._bottomUpProfileDataGridTree) {
      this._bottomUpProfileDataGridTree = new Profiler.BottomUpProfileDataGridTree(
          this._nodeFormatter, this._searchableView, this.profile.root, this.adjustedTotal);
    }
    return this._bottomUpProfileDataGridTree;
  }

  /**
   * @return {!Profiler.ProfileDataGridTree}
   */
  _getTopDownProfileDataGridTree() {
    if (!this._topDownProfileDataGridTree) {
      this._topDownProfileDataGridTree = new Profiler.TopDownProfileDataGridTree(
          this._nodeFormatter, this._searchableView, this.profile.root, this.adjustedTotal);
    }
    return this._topDownProfileDataGridTree;
  }

  /**
   * @override
   */
  willHide() {
    this._currentSearchResultIndex = -1;
  }

  refresh() {
    var selectedProfileNode = this.dataGrid.selectedNode ? this.dataGrid.selectedNode.profileNode : null;

    this.dataGrid.rootNode().removeChildren();

    var children = this.profileDataGridTree.children;
    var count = children.length;

    for (var index = 0; index < count; ++index)
      this.dataGrid.rootNode().appendChild(children[index]);

    if (selectedProfileNode)
      selectedProfileNode.selected = true;
  }

  refreshVisibleData() {
    var child = this.dataGrid.rootNode().children[0];
    while (child) {
      child.refresh();
      child = child.traverseNextNode(false, null, true);
    }
  }

  /**
   * @return {!UI.SearchableView}
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
   * @return {!Components.Linkifier}
   */
  linkifier() {
    return this._linkifier;
  }

  /**
   * @return {!PerfUI.FlameChartDataProvider}
   */
  createFlameChartDataProvider() {
    throw 'Not implemented';
  }

  _ensureFlameChartCreated() {
    if (this._flameChart)
      return;
    this._dataProvider = this.createFlameChartDataProvider();
    this._flameChart = new Profiler.CPUProfileFlameChart(this._searchableView, this._dataProvider);
    this._flameChart.addEventListener(PerfUI.FlameChart.Events.EntrySelected, this._onEntrySelected.bind(this));
  }

  /**
   * @param {!Common.Event} event
   */
  _onEntrySelected(event) {
    var entryIndex = event.data;
    var node = this._dataProvider._entryNodes[entryIndex];
    var debuggerModel = this._profileHeader._debuggerModel;
    if (!node || !node.scriptId || !debuggerModel)
      return;
    var script = debuggerModel.scriptForId(node.scriptId);
    if (!script)
      return;
    var location = /** @type {!SDK.DebuggerModel.Location} */ (
        debuggerModel.createRawLocation(script, node.lineNumber, node.columnNumber));
    Common.Revealer.reveal(Bindings.debuggerWorkspaceBinding.rawLocationToUILocation(location));
  }

  _changeView() {
    if (!this.profile)
      return;

    this._searchableView.closeSearch();

    if (this._visibleView)
      this._visibleView.detach();

    this._viewType.set(this.viewSelectComboBox.selectedOption().value);
    switch (this._viewType.get()) {
      case Profiler.ProfileView.ViewTypes.Flame:
        this._ensureFlameChartCreated();
        this._visibleView = this._flameChart;
        this._searchableElement = this._flameChart;
        break;
      case Profiler.ProfileView.ViewTypes.Tree:
        this.profileDataGridTree = this._getTopDownProfileDataGridTree();
        this._sortProfile();
        this._visibleView = this.dataGrid.asWidget();
        this._searchableElement = this.profileDataGridTree;
        break;
      case Profiler.ProfileView.ViewTypes.Heavy:
        this.profileDataGridTree = this._getBottomUpProfileDataGridTree();
        this._sortProfile();
        this._visibleView = this.dataGrid.asWidget();
        this._searchableElement = this.profileDataGridTree;
        break;
    }

    var isFlame = this._viewType.get() === Profiler.ProfileView.ViewTypes.Flame;
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
   * @param {!Common.Event} event
   */
  _focusClicked(event) {
    if (!this.dataGrid.selectedNode)
      return;

    this.resetButton.setEnabled(true);
    this.profileDataGridTree.focus(this.dataGrid.selectedNode);
    this.refresh();
    this.refreshVisibleData();
    Host.userMetrics.actionTaken(Host.UserMetrics.Action.CpuProfileNodeFocused);
  }

  /**
   * @param {!Common.Event} event
   */
  _excludeClicked(event) {
    var selectedNode = this.dataGrid.selectedNode;

    if (!selectedNode)
      return;

    selectedNode.deselect();

    this.resetButton.setEnabled(true);
    this.profileDataGridTree.exclude(selectedNode);
    this.refresh();
    this.refreshVisibleData();
    Host.userMetrics.actionTaken(Host.UserMetrics.Action.CpuProfileNodeExcluded);
  }

  /**
   * @param {!Common.Event} event
   */
  _resetClicked(event) {
    this.resetButton.setEnabled(false);
    this.profileDataGridTree.restore();
    this._linkifier.reset();
    this.refresh();
    this.refreshVisibleData();
  }

  _sortProfile() {
    var sortAscending = this.dataGrid.isSortOrderAscending();
    var sortColumnId = this.dataGrid.sortColumnId();
    var sortProperty = sortColumnId === 'function' ? 'functionName' : sortColumnId || '';
    this.profileDataGridTree.sort(Profiler.ProfileDataGridTree.propertyComparator(sortProperty, sortAscending));

    this.refresh();
  }
};

Profiler.ProfileView._maxLinkLength = 30;

/** @enum {string} */
Profiler.ProfileView.ViewTypes = {
  Flame: 'Flame',
  Tree: 'Tree',
  Heavy: 'Heavy'
};


/**
 * @implements {Common.OutputStream}
 * @unrestricted
 */
Profiler.WritableProfileHeader = class extends Profiler.ProfileHeader {
  /**
   * @param {?SDK.DebuggerModel} debuggerModel
   * @param {!Profiler.ProfileType} type
   * @param {string=} title
   */
  constructor(debuggerModel, type, title) {
    super(type, title || Common.UIString('Profile %d', type.nextProfileUid()));
    this._debuggerModel = debuggerModel;
    this._tempFile = null;
  }

  /**
   * @param {!Bindings.ChunkedReader} reader
   */
  _onChunkTransferred(reader) {
    this.updateStatus(Common.UIString('Loading\u2026 %d%%', Number.bytesToString(this._jsonifiedProfile.length)));
  }

  /**
   * @param {!Bindings.ChunkedReader} reader
   */
  _onError(reader) {
    this.updateStatus(Common.UIString(`File '%s' read error: %s`, reader.fileName(), reader.error().message));
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
   * @param {!Profiler.ProfileType.DataDisplayDelegate} panel
   * @return {!Profiler.ProfileSidebarTreeElement}
   */
  createSidebarTreeElement(panel) {
    return new Profiler.ProfileSidebarTreeElement(panel, this, 'profile-sidebar-tree-item');
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
  saveToFile() {
    var fileOutputStream = new Bindings.FileOutputStream();
    this._fileName = this._fileName ||
        `${this.profileType().typeName()}-${new Date().toISO8601Compact()}${this.profileType().fileExtension()}`;
    fileOutputStream.open(this._fileName).then(onOpenForSave.bind(this));

    /**
     * @param {boolean} accepted
     * @this {Profiler.WritableProfileHeader}
     */
    async function onOpenForSave(accepted) {
      if (!accepted)
        return;
      if (this._failedToCreateTempFile) {
        Common.console.error('Failed to open temp file with heap snapshot');
        fileOutputStream.close();
      } else if (this._tempFile) {
        var data = await this._tempFile.read();
        if (data)
          await fileOutputStream.write(data);
        fileOutputStream.close();
      } else {
        this._onTempFileReady = onOpenForSave.bind(this, accepted);
      }
    }
  }

  /**
   * @override
   * @param {!File} file
   */
  async loadFromFile(file) {
    this.updateStatus(Common.UIString('Loading\u2026'), true);
    var fileReader = new Bindings.ChunkedFileReader(file, 10000000, this._onChunkTransferred.bind(this));
    this._jsonifiedProfile = '';

    var success = await fileReader.read(this);
    if (!success) {
      this._onError(fileReader);
      return;
    }

    this.updateStatus(Common.UIString('Parsing\u2026'), true);
    this._profile = JSON.parse(this._jsonifiedProfile);
    this._jsonifiedProfile = null;
    this.updateStatus(Common.UIString('Loaded'), false);

    if (this.profileType().profileBeingRecorded() === this)
      this.profileType().setProfileBeingRecorded(null);
  }

  /**
   * @param {*} profile
   */
  setProtocolProfile(profile) {
    this._protocolProfile = profile;
    this._saveProfileDataToTempFile(profile);
    if (this.canSaveToFile())
      this.dispatchEventToListeners(Profiler.ProfileHeader.Events.ProfileReceived);
  }

  /**
   * @param {*} data
   */
  _saveProfileDataToTempFile(data) {
    var serializedData = JSON.stringify(data);

    /**
     * @this {Profiler.WritableProfileHeader}
     */
    function didCreateTempFile(tempFile) {
      this._writeToTempFile(tempFile, serializedData);
    }
    Bindings.TempFile.create('cpu-profiler', String(this.uid)).then(didCreateTempFile.bind(this));
  }

  /**
   * @param {?Bindings.TempFile} tempFile
   * @param {string} serializedData
   */
  async _writeToTempFile(tempFile, serializedData) {
    this._tempFile = tempFile;
    if (!tempFile) {
      this._failedToCreateTempFile = true;
      this._notifyTempFileReady();
      return;
    }

    var fileSize = await tempFile.write([serializedData]);

    if (!fileSize)
      this._failedToCreateTempFile = true;
    tempFile.finishWriting();
    this._notifyTempFileReady();
  }

  _notifyTempFileReady() {
    if (this._onTempFileReady) {
      this._onTempFileReady();
      this._onTempFileReady = null;
    }
  }
};
