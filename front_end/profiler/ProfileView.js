// Copyright 2016 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

/**
 * @constructor
 * @implements {WebInspector.Searchable}
 * @extends {WebInspector.VBox}
 * @param {!WebInspector.ProfileDataGridNode.Formatter} nodeFormatter
 * @param {!Array<string>=} viewTypes
 */
WebInspector.ProfileView = function(nodeFormatter, viewTypes)
{
    WebInspector.VBox.call(this);

    this._searchableView = new WebInspector.SearchableView(this);
    this._searchableView.setPlaceholder(WebInspector.UIString("Find by cost (>50ms), name or file"));
    this._searchableView.show(this.element);

    viewTypes = viewTypes || [
        WebInspector.ProfileView.ViewTypes.Flame,
        WebInspector.ProfileView.ViewTypes.Heavy,
        WebInspector.ProfileView.ViewTypes.Tree
    ];
    this._viewType = WebInspector.settings.createSetting("profileView", WebInspector.ProfileView.ViewTypes.Heavy);
    this._nodeFormatter = nodeFormatter;

    var columns = [];
    columns.push({id: "self", title: WebInspector.UIString("Self"), width: "120px", sort: WebInspector.DataGrid.Order.Descending, sortable: true});
    columns.push({id: "total", title: WebInspector.UIString("Total"), width: "120px", sortable: true});
    columns.push({id: "function", title: WebInspector.UIString("Function"), disclosure: true, sortable: true});

    this.dataGrid = new WebInspector.DataGrid(columns);
    this.dataGrid.addEventListener(WebInspector.DataGrid.Events.SortingChanged, this._sortProfile, this);
    this.dataGrid.addEventListener(WebInspector.DataGrid.Events.SelectedNode, this._nodeSelected.bind(this, true));
    this.dataGrid.addEventListener(WebInspector.DataGrid.Events.DeselectedNode, this._nodeSelected.bind(this, false));

    this.viewSelectComboBox = new WebInspector.ToolbarComboBox(this._changeView.bind(this));
    var optionNames = new Map([
        [WebInspector.ProfileView.ViewTypes.Flame, WebInspector.UIString("Chart")],
        [WebInspector.ProfileView.ViewTypes.Heavy, WebInspector.UIString("Heavy (Bottom Up)")],
        [WebInspector.ProfileView.ViewTypes.Tree, WebInspector.UIString("Tree (Top Down)")],
    ]);
    var options = new Map(viewTypes.map(type => [type, this.viewSelectComboBox.createOption(optionNames.get(type), "", type)]));
    var optionName = this._viewType.get() || viewTypes[0];
    var option = options.get(optionName) || options.get(viewTypes[0]);
    this.viewSelectComboBox.select(option);

    this.focusButton = new WebInspector.ToolbarButton(WebInspector.UIString("Focus selected function"), "visibility-toolbar-item");
    this.focusButton.setEnabled(false);
    this.focusButton.addEventListener("click", this._focusClicked, this);

    this.excludeButton = new WebInspector.ToolbarButton(WebInspector.UIString("Exclude selected function"), "delete-toolbar-item");
    this.excludeButton.setEnabled(false);
    this.excludeButton.addEventListener("click", this._excludeClicked, this);

    this.resetButton = new WebInspector.ToolbarButton(WebInspector.UIString("Restore all functions"), "refresh-toolbar-item");
    this.resetButton.setEnabled(false);
    this.resetButton.addEventListener("click", this._resetClicked, this);

    this._linkifier = new WebInspector.Linkifier(new WebInspector.Linkifier.DefaultFormatter(30));

    this._changeView();
    if (this._flameChart)
        this._flameChart.update();
}

/** @enum {string} */
WebInspector.ProfileView.ViewTypes = {
    Flame: "Flame",
    Tree: "Tree",
    Heavy: "Heavy"
}

WebInspector.ProfileView.prototype = {
    focus: function()
    {
        if (this._flameChart)
            this._flameChart.focus();
        else
            WebInspector.Widget.prototype.focus.call(this);
    },

    /**
     * @return {?WebInspector.Target}
     */
    target: function()
    {
        return this._profileHeader.target();
    },

    /**
     * @param {number} timeLeft
     * @param {number} timeRight
     */
    selectRange: function(timeLeft, timeRight)
    {
        if (!this._flameChart)
            return;
        this._flameChart.selectRange(timeLeft, timeRight);
    },

    /**
     * @return {!Array.<!WebInspector.ToolbarItem>}
     */
    toolbarItems: function()
    {
        return [this.viewSelectComboBox, this.focusButton, this.excludeButton, this.resetButton];
    },

    /**
     * @return {!WebInspector.ProfileDataGridTree}
     */
    _getBottomUpProfileDataGridTree: function()
    {
        if (!this._bottomUpProfileDataGridTree)
            this._bottomUpProfileDataGridTree = new WebInspector.BottomUpProfileDataGridTree(this._nodeFormatter, this._searchableView, this.profile.root, this.adjustedTotal);
        return this._bottomUpProfileDataGridTree;
    },

    /**
     * @return {!WebInspector.ProfileDataGridTree}
     */
    _getTopDownProfileDataGridTree: function()
    {
        if (!this._topDownProfileDataGridTree)
            this._topDownProfileDataGridTree = new WebInspector.TopDownProfileDataGridTree(this._nodeFormatter, this._searchableView, this.profile.root, this.adjustedTotal);
        return this._topDownProfileDataGridTree;
    },

    willHide: function()
    {
        this._currentSearchResultIndex = -1;
    },

    refresh: function()
    {
        var selectedProfileNode = this.dataGrid.selectedNode ? this.dataGrid.selectedNode.profileNode : null;

        this.dataGrid.rootNode().removeChildren();

        var children = this.profileDataGridTree.children;
        var count = children.length;

        for (var index = 0; index < count; ++index)
            this.dataGrid.rootNode().appendChild(children[index]);

        if (selectedProfileNode)
            selectedProfileNode.selected = true;
    },

    refreshVisibleData: function()
    {
        var child = this.dataGrid.rootNode().children[0];
        while (child) {
            child.refresh();
            child = child.traverseNextNode(false, null, true);
        }
    },

    /**
     * @return {!WebInspector.SearchableView}
     */
    searchableView: function()
    {
        return this._searchableView;
    },

    /**
     * @override
     * @return {boolean}
     */
    supportsCaseSensitiveSearch: function()
    {
        return true;
    },

    /**
     * @override
     * @return {boolean}
     */
    supportsRegexSearch: function()
    {
        return false;
    },

    /**
     * @override
     */
    searchCanceled: function()
    {
        this._searchableElement.searchCanceled();
    },

    /**
     * @override
     * @param {!WebInspector.SearchableView.SearchConfig} searchConfig
     * @param {boolean} shouldJump
     * @param {boolean=} jumpBackwards
     */
    performSearch: function(searchConfig, shouldJump, jumpBackwards)
    {
        this._searchableElement.performSearch(searchConfig, shouldJump, jumpBackwards);
    },

    /**
     * @override
     */
    jumpToNextSearchResult: function()
    {
        this._searchableElement.jumpToNextSearchResult();
    },

    /**
     * @override
     */
    jumpToPreviousSearchResult: function()
    {
        this._searchableElement.jumpToPreviousSearchResult();
    },

    /**
     * @return {!WebInspector.Linkifier}
     */
    linkifier: function()
    {
        return this._linkifier;
    },

    _ensureFlameChartCreated: function()
    {
        if (this._flameChart)
            return;
        this._dataProvider = new WebInspector.CPUFlameChartDataProvider(this.profile, this._profileHeader.target());
        this._flameChart = new WebInspector.CPUProfileFlameChart(this._searchableView, this._dataProvider);
        this._flameChart.addEventListener(WebInspector.FlameChart.Events.EntrySelected, this._onEntrySelected.bind(this));
    },

    /**
     * @param {!WebInspector.Event} event
     */
    _onEntrySelected: function(event)
    {
        var entryIndex = event.data;
        var node = this._dataProvider._entryNodes[entryIndex];
        var debuggerModel = this._profileHeader._debuggerModel;
        if (!node || !node.scriptId || !debuggerModel)
            return;
        var script = debuggerModel.scriptForId(node.scriptId);
        if (!script)
            return;
        var location = /** @type {!WebInspector.DebuggerModel.Location} */ (debuggerModel.createRawLocation(script, node.lineNumber - 1, node.columnNumber ? node.columnNumber - 1 : node.columnNumber));
        WebInspector.Revealer.reveal(WebInspector.debuggerWorkspaceBinding.rawLocationToUILocation(location));
    },

    _changeView: function()
    {
        if (!this.profile)
            return;

        this._searchableView.closeSearch();

        if (this._visibleView)
            this._visibleView.detach();

        this._viewType.set(this.viewSelectComboBox.selectedOption().value);
        switch (this._viewType.get()) {
        case WebInspector.ProfileView.ViewTypes.Flame:
            this._ensureFlameChartCreated();
            this._visibleView = this._flameChart;
            this._searchableElement = this._flameChart;
            break;
        case WebInspector.ProfileView.ViewTypes.Tree:
            this.profileDataGridTree = this._getTopDownProfileDataGridTree();
            this._sortProfile();
            this._visibleView = this.dataGrid.asWidget();
            this._searchableElement = this.profileDataGridTree;
            break;
        case WebInspector.ProfileView.ViewTypes.Heavy:
            this.profileDataGridTree = this._getBottomUpProfileDataGridTree();
            this._sortProfile();
            this._visibleView = this.dataGrid.asWidget();
            this._searchableElement = this.profileDataGridTree;
            break;
        }

        var isFlame = this._viewType.get() === WebInspector.ProfileView.ViewTypes.Flame;
        this.focusButton.setVisible(!isFlame);
        this.excludeButton.setVisible(!isFlame);
        this.resetButton.setVisible(!isFlame);

        this._visibleView.show(this._searchableView.element);
    },

    /**
     * @param {boolean} selected
     */
    _nodeSelected: function(selected)
    {
        this.focusButton.setEnabled(selected);
        this.excludeButton.setEnabled(selected);
    },

    _focusClicked: function(event)
    {
        if (!this.dataGrid.selectedNode)
            return;

        this.resetButton.setEnabled(true);
        this.profileDataGridTree.focus(this.dataGrid.selectedNode);
        this.refresh();
        this.refreshVisibleData();
    },

    _excludeClicked: function(event)
    {
        var selectedNode = this.dataGrid.selectedNode;

        if (!selectedNode)
            return;

        selectedNode.deselect();

        this.resetButton.setEnabled(true);
        this.profileDataGridTree.exclude(selectedNode);
        this.refresh();
        this.refreshVisibleData();
    },

    _resetClicked: function(event)
    {
        this.resetButton.setEnabled(false);
        this.profileDataGridTree.restore();
        this._linkifier.reset();
        this.refresh();
        this.refreshVisibleData();
    },

    _sortProfile: function()
    {
        var sortAscending = this.dataGrid.isSortOrderAscending();
        var sortColumnIdentifier = this.dataGrid.sortColumnIdentifier();
        var sortProperty = sortColumnIdentifier === "function" ? "functionName" : sortColumnIdentifier || "";
        this.profileDataGridTree.sort(WebInspector.ProfileDataGridTree.propertyComparator(sortProperty, sortAscending));

        this.refresh();
    },

    __proto__: WebInspector.VBox.prototype
}

/**
 * @constructor
 * @extends {WebInspector.ProfileHeader}
 * @implements {WebInspector.OutputStream}
 * @implements {WebInspector.OutputStreamDelegate}
 * @param {?WebInspector.Target} target
 * @param {!WebInspector.ProfileType} type
 * @param {string=} title
 */
WebInspector.WritableProfileHeader = function(target, type, title)
{
    WebInspector.ProfileHeader.call(this, target, type, title || WebInspector.UIString("Profile %d", type.nextProfileUid()));
    this._debuggerModel = WebInspector.DebuggerModel.fromTarget(target);
    this._tempFile = null;
}

WebInspector.WritableProfileHeader.prototype = {
    /**
     * @override
     */
    onTransferStarted: function()
    {
        this._jsonifiedProfile = "";
        this.updateStatus(WebInspector.UIString("Loading\u2026 %s", Number.bytesToString(this._jsonifiedProfile.length)), true);
    },

    /**
     * @override
     * @param {!WebInspector.ChunkedReader} reader
     */
    onChunkTransferred: function(reader)
    {
        this.updateStatus(WebInspector.UIString("Loading\u2026 %d%%", Number.bytesToString(this._jsonifiedProfile.length)));
    },

    /**
     * @override
     */
    onTransferFinished: function()
    {
        this.updateStatus(WebInspector.UIString("Parsing\u2026"), true);
        this._profile = JSON.parse(this._jsonifiedProfile);
        this._jsonifiedProfile = null;
        this.updateStatus(WebInspector.UIString("Loaded"), false);

        if (this._profileType.profileBeingRecorded() === this)
            this._profileType.setProfileBeingRecorded(null);
    },

    /**
     * @override
     * @param {!WebInspector.ChunkedReader} reader
     * @param {!Event} e
     */
    onError: function(reader, e)
    {
        var subtitle;
        switch(e.target.error.code) {
        case e.target.error.NOT_FOUND_ERR:
            subtitle = WebInspector.UIString("'%s' not found.", reader.fileName());
            break;
        case e.target.error.NOT_READABLE_ERR:
            subtitle = WebInspector.UIString("'%s' is not readable", reader.fileName());
            break;
        case e.target.error.ABORT_ERR:
            return;
        default:
            subtitle = WebInspector.UIString("'%s' error %d", reader.fileName(), e.target.error.code);
        }
        this.updateStatus(subtitle);
    },

    /**
     * @override
     * @param {string} text
     */
    write: function(text)
    {
        this._jsonifiedProfile += text;
    },

    /**
     * @override
     */
    close: function() { },

    /**
     * @override
     */
    dispose: function()
    {
        this.removeTempFile();
    },

    /**
     * @override
     * @param {!WebInspector.ProfileType.DataDisplayDelegate} panel
     * @return {!WebInspector.ProfileSidebarTreeElement}
     */
    createSidebarTreeElement: function(panel)
    {
        return new WebInspector.ProfileSidebarTreeElement(panel, this, "profile-sidebar-tree-item");
    },

    /**
     * @override
     * @return {boolean}
     */
    canSaveToFile: function()
    {
        return !this.fromFile() && this._protocolProfile;
    },

    saveToFile: function()
    {
        var fileOutputStream = new WebInspector.FileOutputStream();

        /**
         * @param {boolean} accepted
         * @this {WebInspector.WritableProfileHeader}
         */
        function onOpenForSave(accepted)
        {
            if (!accepted)
                return;
            function didRead(data)
            {
                if (data)
                    fileOutputStream.write(data, fileOutputStream.close.bind(fileOutputStream));
                else
                    fileOutputStream.close();
            }
            if (this._failedToCreateTempFile) {
                WebInspector.console.error("Failed to open temp file with heap snapshot");
                fileOutputStream.close();
            } else if (this._tempFile) {
                this._tempFile.read(didRead);
            } else {
                this._onTempFileReady = onOpenForSave.bind(this, accepted);
            }
        }
        this._fileName = this._fileName || `${this._profileType.typeName()}-${new Date().toISO8601Compact()}${this._profileType.fileExtension()}`;
        fileOutputStream.open(this._fileName, onOpenForSave.bind(this));
    },

    /**
     * @override
     * @param {!File} file
     */
    loadFromFile: function(file)
    {
        this.updateStatus(WebInspector.UIString("Loading\u2026"), true);
        var fileReader = new WebInspector.ChunkedFileReader(file, 10000000, this);
        fileReader.start(this);
    },

    /**
     * @param {*} profile
     */
    setProtocolProfile: function(profile)
    {
        this._protocolProfile = profile;
        this._saveProfileDataToTempFile(profile);
        if (this.canSaveToFile())
            this.dispatchEventToListeners(WebInspector.ProfileHeader.Events.ProfileReceived);
    },

    /**
     * @param {*} data
     */
    _saveProfileDataToTempFile: function(data)
    {
        var serializedData = JSON.stringify(data);

        /**
         * @this {WebInspector.WritableProfileHeader}
         */
        function didCreateTempFile(tempFile)
        {
            this._writeToTempFile(tempFile, serializedData);
        }
        WebInspector.TempFile.create("cpu-profiler", String(this.uid))
            .then(didCreateTempFile.bind(this));
    },

    /**
     * @param {?WebInspector.TempFile} tempFile
     * @param {string} serializedData
     */
    _writeToTempFile: function(tempFile, serializedData)
    {
        this._tempFile = tempFile;
        if (!tempFile) {
            this._failedToCreateTempFile = true;
            this._notifyTempFileReady();
            return;
        }
        /**
         * @param {number} fileSize
         * @this {WebInspector.WritableProfileHeader}
         */
        function didWriteToTempFile(fileSize)
        {
            if (!fileSize)
                this._failedToCreateTempFile = true;
            tempFile.finishWriting();
            this._notifyTempFileReady();
        }
        tempFile.write([serializedData], didWriteToTempFile.bind(this));
    },

    _notifyTempFileReady: function()
    {
        if (this._onTempFileReady) {
            this._onTempFileReady();
            this._onTempFileReady = null;
        }
    },

    __proto__: WebInspector.ProfileHeader.prototype
}
