// Copyright 2014 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

/**
 * @constructor
 * @implements {WebInspector.TabbedEditorContainerDelegate}
 * @implements {WebInspector.Searchable}
 * @implements {WebInspector.Replaceable}
 * @extends {WebInspector.VBox}
 * @suppressGlobalPropertiesCheck
 */
WebInspector.SourcesView = function()
{
    WebInspector.VBox.call(this);
    this.registerRequiredCSS("sources/sourcesView.css");
    this.element.id = "sources-panel-sources-view";
    this.setMinimumAndPreferredSizes(50, 52, 150, 100);

    var workspace = WebInspector.workspace;

    this._searchableView = new WebInspector.SearchableView(this, "sourcesViewSearchConfig");
    this._searchableView.setMinimalSearchQuerySize(0);
    this._searchableView.show(this.element);

    /** @type {!Map.<!WebInspector.UISourceCode, !WebInspector.Widget>} */
    this._sourceViewByUISourceCode = new Map();

    var tabbedEditorPlaceholderText = WebInspector.isMac() ? WebInspector.UIString("Hit Cmd+P to open a file") : WebInspector.UIString("Hit Ctrl+P to open a file");
    this._editorContainer = new WebInspector.TabbedEditorContainer(this, WebInspector.settings.createLocalSetting("previouslyViewedFiles", []), tabbedEditorPlaceholderText);
    this._editorContainer.show(this._searchableView.element);
    this._editorContainer.addEventListener(WebInspector.TabbedEditorContainer.Events.EditorSelected, this._editorSelected, this);
    this._editorContainer.addEventListener(WebInspector.TabbedEditorContainer.Events.EditorClosed, this._editorClosed, this);

    this._historyManager = new WebInspector.EditingLocationHistoryManager(this, this.currentSourceFrame.bind(this));

    this._toolbarContainerElement = this.element.createChild("div", "sources-toolbar");
    this._toolbarEditorActions = new WebInspector.Toolbar("", this._toolbarContainerElement);

    self.runtime.allInstances(WebInspector.SourcesView.EditorAction).then(appendButtonsForExtensions.bind(this));
    /**
     * @param {!Array.<!WebInspector.SourcesView.EditorAction>} actions
     * @this {WebInspector.SourcesView}
     */
    function appendButtonsForExtensions(actions)
    {
        for (var i = 0; i < actions.length; ++i)
            this._toolbarEditorActions.appendToolbarItem(actions[i].button(this));
    }
    this._scriptViewToolbar = new WebInspector.Toolbar("", this._toolbarContainerElement);

    WebInspector.startBatchUpdate();
    workspace.uiSourceCodes().forEach(this._addUISourceCode.bind(this));
    WebInspector.endBatchUpdate();

    workspace.addEventListener(WebInspector.Workspace.Events.UISourceCodeAdded, this._uiSourceCodeAdded, this);
    workspace.addEventListener(WebInspector.Workspace.Events.UISourceCodeRemoved, this._uiSourceCodeRemoved, this);
    workspace.addEventListener(WebInspector.Workspace.Events.ProjectRemoved, this._projectRemoved.bind(this), this);

    /**
     * @param {!Event} event
     */
    function handleBeforeUnload(event)
    {
        if (event.returnValue)
            return;

        var unsavedSourceCodes = [];
        var projects = WebInspector.workspace.projectsForType(WebInspector.projectTypes.FileSystem);
        for (var i = 0; i < projects.length; ++i)
            unsavedSourceCodes = unsavedSourceCodes.concat(projects[i].uiSourceCodes().filter(isUnsaved));

        if (!unsavedSourceCodes.length)
            return;

        event.returnValue = WebInspector.UIString("DevTools have unsaved changes that will be permanently lost.");
        WebInspector.inspectorView.setCurrentPanel(WebInspector.SourcesPanel.instance());
        for (var i = 0; i < unsavedSourceCodes.length; ++i)
            WebInspector.Revealer.reveal(unsavedSourceCodes[i]);

        /**
         * @param {!WebInspector.UISourceCode} sourceCode
         * @return {boolean}
         */
        function isUnsaved(sourceCode)
        {
            var binding = WebInspector.persistence.binding(sourceCode);
            if (binding)
                return binding.network.isDirty();
            return sourceCode.isDirty();
        }
    }

    if (!window.opener)
        window.addEventListener("beforeunload", handleBeforeUnload, true);

    this._shortcuts = {};
    this.element.addEventListener("keydown", this._handleKeyDown.bind(this), false);
}

/** @enum {symbol} */
WebInspector.SourcesView.Events = {
    EditorClosed: Symbol("EditorClosed"),
    EditorSelected: Symbol("EditorSelected"),
}

WebInspector.SourcesView.prototype = {
    /**
     * @param {function(!Array.<!WebInspector.KeyboardShortcut.Descriptor>, function(!Event=):boolean)} registerShortcutDelegate
     */
    registerShortcuts: function(registerShortcutDelegate)
    {
        /**
         * @this {WebInspector.SourcesView}
         * @param {!Array.<!WebInspector.KeyboardShortcut.Descriptor>} shortcuts
         * @param {function(!Event=):boolean} handler
         */
        function registerShortcut(shortcuts, handler)
        {
            registerShortcutDelegate(shortcuts, handler);
            this._registerShortcuts(shortcuts, handler);
        }

        registerShortcut.call(this, WebInspector.ShortcutsScreen.SourcesPanelShortcuts.JumpToPreviousLocation, this._onJumpToPreviousLocation.bind(this));
        registerShortcut.call(this, WebInspector.ShortcutsScreen.SourcesPanelShortcuts.JumpToNextLocation, this._onJumpToNextLocation.bind(this));
        registerShortcut.call(this, WebInspector.ShortcutsScreen.SourcesPanelShortcuts.CloseEditorTab, this._onCloseEditorTab.bind(this));
        registerShortcut.call(this, WebInspector.ShortcutsScreen.SourcesPanelShortcuts.GoToLine, this._showGoToLineDialog.bind(this));
        registerShortcut.call(this, WebInspector.ShortcutsScreen.SourcesPanelShortcuts.GoToMember, this._showOutlineDialog.bind(this));
        registerShortcut.call(this, WebInspector.ShortcutsScreen.SourcesPanelShortcuts.ToggleBreakpoint, this._toggleBreakpoint.bind(this));
        registerShortcut.call(this, WebInspector.ShortcutsScreen.SourcesPanelShortcuts.Save, this._save.bind(this));
        registerShortcut.call(this, WebInspector.ShortcutsScreen.SourcesPanelShortcuts.SaveAll, this._saveAll.bind(this));
    },

    /**
     * @return {!WebInspector.Toolbar}
     */
    leftToolbar: function()
    {
        return this._editorContainer.leftToolbar();
    },

    /**
     * @return {!WebInspector.Toolbar}
     */
    rightToolbar: function()
    {
        return this._editorContainer.rightToolbar();
    },

    /**
     * @param {!Array.<!WebInspector.KeyboardShortcut.Descriptor>} keys
     * @param {function(!Event=):boolean} handler
     */
    _registerShortcuts: function(keys, handler)
    {
        for (var i = 0; i < keys.length; ++i)
            this._shortcuts[keys[i].key] = handler;
    },

    _handleKeyDown: function(event)
    {
        var shortcutKey = WebInspector.KeyboardShortcut.makeKeyFromEvent(event);
        var handler = this._shortcuts[shortcutKey];
        if (handler && handler())
            event.consume(true);
    },

    wasShown: function()
    {
        WebInspector.VBox.prototype.wasShown.call(this);
        WebInspector.context.setFlavor(WebInspector.SourcesView, this);
    },

    willHide: function()
    {
        WebInspector.context.setFlavor(WebInspector.SourcesView, null);
        WebInspector.VBox.prototype.willHide.call(this);
    },

    /**
     * @return {!Element}
     */
    toolbarContainerElement: function()
    {
        return this._toolbarContainerElement;
    },

    /**
     * @return {!WebInspector.SearchableView}
     */
    searchableView: function()
    {
        return this._searchableView;
    },

    /**
     * @return {!WebInspector.Widget}
     */
    visibleView: function()
    {
        return this._editorContainer.visibleView;
    },

    /**
     * @return {?WebInspector.UISourceCodeFrame}
     */
    currentSourceFrame: function()
    {
        var view = this.visibleView();
        if (!(view instanceof WebInspector.UISourceCodeFrame))
            return null;
        return /** @type {!WebInspector.UISourceCodeFrame} */ (view);
    },

    /**
     * @return {?WebInspector.UISourceCode}
     */
    currentUISourceCode: function()
    {
        return this._editorContainer.currentFile();
    },

    /**
     * @param {!Event=} event
     */
    _onCloseEditorTab: function(event)
    {
        var uiSourceCode = this._editorContainer.currentFile();
        if (!uiSourceCode)
            return false;
        this._editorContainer.closeFile(uiSourceCode);
        return true;
    },

    /**
     * @param {!Event=} event
     */
    _onJumpToPreviousLocation: function(event)
    {
        this._historyManager.rollback();
        return true;
    },

    /**
     * @param {!Event=} event
     */
    _onJumpToNextLocation: function(event)
    {
        this._historyManager.rollover();
        return true;
    },

    /**
     * @param {!WebInspector.Event} event
     */
    _uiSourceCodeAdded: function(event)
    {
        var uiSourceCode = /** @type {!WebInspector.UISourceCode} */ (event.data);
        this._addUISourceCode(uiSourceCode);
    },

    /**
     * @param {!WebInspector.UISourceCode} uiSourceCode
     */
    _addUISourceCode: function(uiSourceCode)
    {
        if (uiSourceCode.isFromServiceProject())
            return;
        this._editorContainer.addUISourceCode(uiSourceCode);
    },

    _uiSourceCodeRemoved: function(event)
    {
        var uiSourceCode = /** @type {!WebInspector.UISourceCode} */ (event.data);
        this._removeUISourceCodes([uiSourceCode]);
    },

    /**
     * @param {!Array.<!WebInspector.UISourceCode>} uiSourceCodes
     */
    _removeUISourceCodes: function(uiSourceCodes)
    {
        this._editorContainer.removeUISourceCodes(uiSourceCodes);
        for (var i = 0; i < uiSourceCodes.length; ++i) {
            this._removeSourceFrame(uiSourceCodes[i]);
            this._historyManager.removeHistoryForSourceCode(uiSourceCodes[i]);
        }
    },

    _projectRemoved: function(event)
    {
        var project = event.data;
        var uiSourceCodes = project.uiSourceCodes();
        this._removeUISourceCodes(uiSourceCodes);
    },

    _updateScriptViewToolbarItems: function()
    {
        this._scriptViewToolbar.removeToolbarItems();
        var view = this.visibleView()
        if (view instanceof WebInspector.SimpleView) {
            for (var item of (/** @type {?WebInspector.SimpleView} */(view)).syncToolbarItems())
                this._scriptViewToolbar.appendToolbarItem(item);
        }
    },

    /**
     * @param {!WebInspector.UISourceCode} uiSourceCode
     * @param {number=} lineNumber 0-based
     * @param {number=} columnNumber
     * @param {boolean=} omitFocus
     * @param {boolean=} omitHighlight
     */
    showSourceLocation: function(uiSourceCode, lineNumber, columnNumber, omitFocus, omitHighlight)
    {
        this._historyManager.updateCurrentState();
        this._editorContainer.showFile(uiSourceCode)
        var currentSourceFrame = this.currentSourceFrame();
        if (currentSourceFrame && typeof lineNumber === "number")
            currentSourceFrame.revealPosition(lineNumber, columnNumber, !omitHighlight);
        this._historyManager.pushNewState();
        if (!omitFocus)
            this.visibleView().focus();
    },

    /**
     * @param {!WebInspector.UISourceCode} uiSourceCode
     * @return {!WebInspector.Widget}
     */
    _createSourceView: function(uiSourceCode)
    {
        var sourceFrame;
        var sourceView;
        var contentType = uiSourceCode.contentType();

        if (contentType.hasScripts())
            sourceFrame = new WebInspector.JavaScriptSourceFrame(uiSourceCode);
        else if (contentType.isStyleSheet())
            sourceFrame = new WebInspector.CSSSourceFrame(uiSourceCode);
        else if (contentType === WebInspector.resourceTypes.Image)
            sourceView = new WebInspector.ImageView(WebInspector.NetworkProject.uiSourceCodeMimeType(uiSourceCode), uiSourceCode);
        else if (contentType === WebInspector.resourceTypes.Font)
            sourceView = new WebInspector.FontView(WebInspector.NetworkProject.uiSourceCodeMimeType(uiSourceCode), uiSourceCode);
        else
            sourceFrame = new WebInspector.UISourceCodeFrame(uiSourceCode);

        if (sourceFrame) {
            sourceFrame.setHighlighterType(WebInspector.NetworkProject.uiSourceCodeMimeType(uiSourceCode));
            this._historyManager.trackSourceFrameCursorJumps(sourceFrame);
        }
        var widget = /** @type {!WebInspector.Widget} */(sourceFrame || sourceView);
        this._sourceViewByUISourceCode.set(uiSourceCode, widget);
        uiSourceCode.addEventListener(WebInspector.UISourceCode.Events.TitleChanged, this._uiSourceCodeTitleChanged, this);
        return widget;
    },

    /**
     * @param {!WebInspector.UISourceCode} uiSourceCode
     * @return {!WebInspector.Widget}
     */
    _getOrCreateSourceView: function(uiSourceCode)
    {
        return this._sourceViewByUISourceCode.get(uiSourceCode) || this._createSourceView(uiSourceCode);
    },

    /**
     * @param {!WebInspector.UISourceCodeFrame} sourceFrame
     * @param {!WebInspector.UISourceCode} uiSourceCode
     * @return {boolean}
     */
    _sourceFrameMatchesUISourceCode: function(sourceFrame, uiSourceCode)
    {
        if (uiSourceCode.contentType().hasScripts())
            return sourceFrame instanceof WebInspector.JavaScriptSourceFrame;
        if (uiSourceCode.contentType().isStyleSheet())
            return sourceFrame instanceof WebInspector.CSSSourceFrame;
        return !(sourceFrame instanceof WebInspector.JavaScriptSourceFrame);
    },

    /**
     * @param {!WebInspector.UISourceCode} uiSourceCode
     */
    _recreateSourceFrameIfNeeded: function(uiSourceCode)
    {
        var oldSourceView = this._sourceViewByUISourceCode.get(uiSourceCode);
        if (!oldSourceView || !(oldSourceView instanceof WebInspector.UISourceCodeFrame))
            return;
        var oldSourceFrame = /** @type {!WebInspector.UISourceCodeFrame} */(oldSourceView);
        if (this._sourceFrameMatchesUISourceCode(oldSourceFrame, uiSourceCode)) {
            oldSourceFrame.setHighlighterType(WebInspector.NetworkProject.uiSourceCodeMimeType(uiSourceCode));
        } else {
            this._editorContainer.removeUISourceCode(uiSourceCode);
            this._removeSourceFrame(uiSourceCode);
        }
    },

    /**
     * @override
     * @param {!WebInspector.UISourceCode} uiSourceCode
     * @return {!WebInspector.Widget}
     */
    viewForFile: function(uiSourceCode)
    {
        return this._getOrCreateSourceView(uiSourceCode);
    },

    /**
     * @param {!WebInspector.UISourceCode} uiSourceCode
     */
    _removeSourceFrame: function(uiSourceCode)
    {
        var sourceView = this._sourceViewByUISourceCode.get(uiSourceCode);
        this._sourceViewByUISourceCode.remove(uiSourceCode);
        uiSourceCode.removeEventListener(WebInspector.UISourceCode.Events.TitleChanged, this._uiSourceCodeTitleChanged, this);
        if (sourceView && sourceView instanceof WebInspector.UISourceCodeFrame)
            /** @type {!WebInspector.UISourceCodeFrame} */ (sourceView).dispose();
    },

    clearCurrentExecutionLine: function()
    {
        if (this._executionSourceFrame)
            this._executionSourceFrame.clearExecutionLine();
        delete this._executionSourceFrame;
    },

    /**
     * @param {!WebInspector.UILocation} uiLocation
     */
    setExecutionLocation: function(uiLocation)
    {
        var sourceView = this._getOrCreateSourceView(uiLocation.uiSourceCode);
        if (sourceView instanceof WebInspector.UISourceCodeFrame) {
            var sourceFrame = /** @type {!WebInspector.UISourceCodeFrame} */(sourceView);
            sourceFrame.setExecutionLocation(uiLocation);
            this._executionSourceFrame = sourceFrame;
        }
    },

    /**
     * @param {!WebInspector.Event} event
     */
    _editorClosed: function(event)
    {
        var uiSourceCode = /** @type {!WebInspector.UISourceCode} */ (event.data);
        this._historyManager.removeHistoryForSourceCode(uiSourceCode);

        var wasSelected = false;
        if (!this._editorContainer.currentFile())
            wasSelected = true;

        // SourcesNavigator does not need to update on EditorClosed.
        this._updateScriptViewToolbarItems();
        this._searchableView.resetSearch();

        var data = {};
        data.uiSourceCode = uiSourceCode;
        data.wasSelected = wasSelected;
        this.dispatchEventToListeners(WebInspector.SourcesView.Events.EditorClosed, data);
    },

    /**
     * @param {!WebInspector.Event} event
     */
    _editorSelected: function(event)
    {
        var previousSourceFrame = event.data.previousView instanceof WebInspector.UISourceCodeFrame ? event.data.previousView : null;
        if (previousSourceFrame)
            previousSourceFrame.setSearchableView(null);
        var currentSourceFrame = event.data.currentView instanceof WebInspector.UISourceCodeFrame ? event.data.currentView : null;
        if (currentSourceFrame)
            currentSourceFrame.setSearchableView(this._searchableView);

        this._searchableView.setReplaceable(!!currentSourceFrame && currentSourceFrame.canEditSource());
        this._searchableView.refreshSearch();
        this._updateScriptViewToolbarItems();

        this.dispatchEventToListeners(WebInspector.SourcesView.Events.EditorSelected, this._editorContainer.currentFile());
    },

    /**
     * @param {!WebInspector.Event} event
     */
    _uiSourceCodeTitleChanged: function(event)
    {
        this._recreateSourceFrameIfNeeded(/** @type {!WebInspector.UISourceCode} */ (event.target));
    },

    /**
     * @override
     */
    searchCanceled: function()
    {
        if (this._searchView)
            this._searchView.searchCanceled();

        delete this._searchView;
        delete this._searchConfig;
    },

    /**
     * @override
     * @param {!WebInspector.SearchableView.SearchConfig} searchConfig
     * @param {boolean} shouldJump
     * @param {boolean=} jumpBackwards
     */
    performSearch: function(searchConfig, shouldJump, jumpBackwards)
    {
        var sourceFrame = this.currentSourceFrame();
        if (!sourceFrame)
            return;

        this._searchView = sourceFrame;
        this._searchConfig = searchConfig;

        this._searchView.performSearch(this._searchConfig, shouldJump, jumpBackwards);
    },

    /**
     * @override
     */
    jumpToNextSearchResult: function()
    {
        if (!this._searchView)
            return;

        if (this._searchView !== this.currentSourceFrame()) {
            this.performSearch(this._searchConfig, true);
            return;
        }

        this._searchView.jumpToNextSearchResult();
    },

    /**
     * @override
     */
    jumpToPreviousSearchResult: function()
    {
        if (!this._searchView)
            return;

        if (this._searchView !== this.currentSourceFrame()) {
            this.performSearch(this._searchConfig, true);
            if (this._searchView)
                this._searchView.jumpToLastSearchResult();
            return;
        }

        this._searchView.jumpToPreviousSearchResult();
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
        return true;
    },

    /**
     * @override
     * @param {!WebInspector.SearchableView.SearchConfig} searchConfig
     * @param {string} replacement
     */
    replaceSelectionWith: function(searchConfig, replacement)
    {
        var sourceFrame = this.currentSourceFrame();
        if (!sourceFrame) {
            console.assert(sourceFrame);
            return;
        }
        sourceFrame.replaceSelectionWith(searchConfig, replacement);
    },

    /**
     * @override
     * @param {!WebInspector.SearchableView.SearchConfig} searchConfig
     * @param {string} replacement
     */
    replaceAllWith: function(searchConfig, replacement)
    {
        var sourceFrame = this.currentSourceFrame();
        if (!sourceFrame) {
            console.assert(sourceFrame);
            return;
        }
        sourceFrame.replaceAllWith(searchConfig, replacement);
    },

    /**
     * @param {!Event=} event
     * @return {boolean}
     */
    _showOutlineDialog: function(event)
    {
        var uiSourceCode = this._editorContainer.currentFile();
        if (!uiSourceCode)
            return false;

        if (uiSourceCode.contentType().hasScripts()) {
            WebInspector.JavaScriptOutlineDialog.show(uiSourceCode, this.showSourceLocation.bind(this, uiSourceCode));
            return true;
        }

        if (uiSourceCode.contentType().isStyleSheet()) {
            WebInspector.StyleSheetOutlineDialog.show(uiSourceCode, this.showSourceLocation.bind(this, uiSourceCode));
            return true;
        }

        // We don't want default browser shortcut to be executed, so pretend to handle this event.
        return true;
    },

    /**
     * @param {string=} query
     */
    showOpenResourceDialog: function(query)
    {
        var uiSourceCodes = this._editorContainer.historyUISourceCodes();
        /** @type {!Map.<!WebInspector.UISourceCode, number>} */
        var defaultScores = new Map();
        for (var i = 1; i < uiSourceCodes.length; ++i) // Skip current element
            defaultScores.set(uiSourceCodes[i], uiSourceCodes.length - i);
        if (!this._openResourceDialogHistory)
            this._openResourceDialogHistory = [];
        WebInspector.OpenResourceDialog.show(this, query || "", defaultScores, this._openResourceDialogHistory);
    },

    /**
     * @param {!Event=} event
     * @return {boolean}
     */
    _showGoToLineDialog: function(event)
    {
        if (this._editorContainer.currentFile())
            this.showOpenResourceDialog(":");
        return true;
    },

    /**
     * @return {boolean}
     */
    _save: function()
    {
        this._saveSourceFrame(this.currentSourceFrame());
        return true;
    },

    /**
     * @return {boolean}
     */
    _saveAll: function()
    {
        var sourceFrames = this._editorContainer.fileViews();
        sourceFrames.forEach(this._saveSourceFrame.bind(this));
        return true;
    },

    /**
     * @param {?WebInspector.Widget} sourceFrame
     */
    _saveSourceFrame: function(sourceFrame)
    {
        if (!(sourceFrame instanceof WebInspector.UISourceCodeFrame))
            return;
        var uiSourceCodeFrame = /** @type {!WebInspector.UISourceCodeFrame} */ (sourceFrame);
        uiSourceCodeFrame.commitEditing();
    },

    /**
     * @return {boolean}
     */
    _toggleBreakpoint: function()
    {
        var sourceFrame = this.currentSourceFrame();
        if (!sourceFrame)
            return false;

        if (sourceFrame instanceof WebInspector.JavaScriptSourceFrame) {
            var javaScriptSourceFrame = /** @type {!WebInspector.JavaScriptSourceFrame} */ (sourceFrame);
            javaScriptSourceFrame.toggleBreakpointOnCurrentLine();
            return true;
        }
        return false;
    },

    /**
     * @param {boolean} active
     */
    toggleBreakpointsActiveState: function(active)
    {
        this._editorContainer.view.element.classList.toggle("breakpoints-deactivated", !active);
    },

    __proto__: WebInspector.VBox.prototype
}

/**
 * @interface
 */
WebInspector.SourcesView.EditorAction = function()
{
}

WebInspector.SourcesView.EditorAction.prototype = {
    /**
     * @param {!WebInspector.SourcesView} sourcesView
     * @return {!WebInspector.ToolbarButton}
     */
    button: function(sourcesView) { }
}

/**
 * @constructor
 * @implements {WebInspector.ActionDelegate}
 */
WebInspector.SourcesView.SwitchFileActionDelegate = function()
{
}

/**
 * @param {!WebInspector.UISourceCode} currentUISourceCode
 * @return {?WebInspector.UISourceCode}
 */
WebInspector.SourcesView.SwitchFileActionDelegate._nextFile = function(currentUISourceCode)
{
    /**
     * @param {string} name
     * @return {string}
     */
    function fileNamePrefix(name)
    {
        var lastDotIndex = name.lastIndexOf(".");
        var namePrefix = name.substr(0, lastDotIndex !== -1 ? lastDotIndex : name.length);
        return namePrefix.toLowerCase();
    }

    var uiSourceCodes = currentUISourceCode.project().uiSourceCodes();
    var candidates = [];
    var url = currentUISourceCode.parentURL();
    var name = currentUISourceCode.name();
    var namePrefix = fileNamePrefix(name);
    for (var i = 0; i < uiSourceCodes.length; ++i) {
        var uiSourceCode = uiSourceCodes[i];
        if (url !== uiSourceCode.parentURL())
            continue;
        if (fileNamePrefix(uiSourceCode.name()) === namePrefix)
            candidates.push(uiSourceCode.name());
    }
    candidates.sort(String.naturalOrderComparator);
    var index = mod(candidates.indexOf(name) + 1, candidates.length);
    var fullURL = (url ? url + "/" : "") + candidates[index];
    var nextUISourceCode = currentUISourceCode.project().uiSourceCodeForURL(fullURL);
    return nextUISourceCode !== currentUISourceCode ? nextUISourceCode : null;
}


WebInspector.SourcesView.SwitchFileActionDelegate.prototype = {
    /**
     * @override
     * @param {!WebInspector.Context} context
     * @param {string} actionId
     * @return {boolean}
     */
    handleAction: function(context, actionId)
    {
        var sourcesView = WebInspector.context.flavor(WebInspector.SourcesView);
        var currentUISourceCode = sourcesView.currentUISourceCode();
        if (!currentUISourceCode)
            return false;
        var nextUISourceCode = WebInspector.SourcesView.SwitchFileActionDelegate._nextFile(currentUISourceCode);
        if (!nextUISourceCode)
            return false;
        sourcesView.showSourceLocation(nextUISourceCode);
        return true;
    }
}

/**
 * @constructor
 * @implements {WebInspector.ActionDelegate}
 */
WebInspector.SourcesView.CloseAllActionDelegate = function()
{
}

WebInspector.SourcesView.CloseAllActionDelegate.prototype = {
    /**
     * @override
     * @param {!WebInspector.Context} context
     * @param {string} actionId
     * @return {boolean}
     */
    handleAction: function(context, actionId)
    {
        var sourcesView = WebInspector.context.flavor(WebInspector.SourcesView);
        if (!sourcesView)
            return false;
        sourcesView._editorContainer.closeAllFiles();
        return true;
    }
}
