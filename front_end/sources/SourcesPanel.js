/*
 * Copyright (C) 2008 Apple Inc. All Rights Reserved.
 * Copyright (C) 2011 Google Inc. All rights reserved.
 *
 * Redistribution and use in source and binary forms, with or without
 * modification, are permitted provided that the following conditions
 * are met:
 * 1. Redistributions of source code must retain the above copyright
 *    notice, this list of conditions and the following disclaimer.
 * 2. Redistributions in binary form must reproduce the above copyright
 *    notice, this list of conditions and the following disclaimer in the
 *    documentation and/or other materials provided with the distribution.
 *
 * THIS SOFTWARE IS PROVIDED BY APPLE INC. ``AS IS'' AND ANY
 * EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED TO, THE
 * IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR
 * PURPOSE ARE DISCLAIMED.  IN NO EVENT SHALL APPLE INC. OR
 * CONTRIBUTORS BE LIABLE FOR ANY DIRECT, INDIRECT, INCIDENTAL, SPECIAL,
 * EXEMPLARY, OR CONSEQUENTIAL DAMAGES (INCLUDING, BUT NOT LIMITED TO,
 * PROCUREMENT OF SUBSTITUTE GOODS OR SERVICES; LOSS OF USE, DATA, OR
 * PROFITS; OR BUSINESS INTERRUPTION) HOWEVER CAUSED AND ON ANY THEORY
 * OF LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY, OR TORT
 * (INCLUDING NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE
 * OF THIS SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.
 */

/**
 * @constructor
 * @extends {WebInspector.Panel}
 * @implements {WebInspector.ContextMenu.Provider}
 * @implements {WebInspector.TargetManager.Observer}
 * @implements {WebInspector.ViewLocationResolver}
 */
WebInspector.SourcesPanel = function()
{
    WebInspector.Panel.call(this, "sources");
    WebInspector.SourcesPanel._instance = this;
    this.registerRequiredCSS("sources/sourcesPanel.css");
    new WebInspector.DropTarget(this.element, [WebInspector.DropTarget.Types.Files], WebInspector.UIString("Drop workspace folder here"), this._handleDrop.bind(this));

    this._workspace = WebInspector.workspace;
    this._networkMapping = WebInspector.networkMapping;

    this._runSnippetAction = /** @type {!WebInspector.Action }*/ (WebInspector.actionRegistry.action("debugger.run-snippet"));
    this._togglePauseAction = /** @type {!WebInspector.Action }*/ (WebInspector.actionRegistry.action("debugger.toggle-pause"));
    this._stepOverAction = /** @type {!WebInspector.Action }*/ (WebInspector.actionRegistry.action("debugger.step-over"));
    this._stepIntoAction = /** @type {!WebInspector.Action }*/ (WebInspector.actionRegistry.action("debugger.step-into"));
    this._stepOutAction = /** @type {!WebInspector.Action }*/ (WebInspector.actionRegistry.action("debugger.step-out"));
    this._toggleBreakpointsActiveAction = /** @type {!WebInspector.Action }*/ (WebInspector.actionRegistry.action("debugger.toggle-breakpoints-active"));

    this._debugToolbar = this._createDebugToolbar();
    this._debugToolbarDrawer = this._createDebugToolbarDrawer();

    const initialDebugSidebarWidth = 225;
    this._splitWidget = new WebInspector.SplitWidget(true, true, "sourcesPanelSplitViewState", initialDebugSidebarWidth);
    this._splitWidget.enableShowModeSaving();
    this._splitWidget.show(this.element);

    // Create scripts navigator
    const initialNavigatorWidth = 225;
    this.editorView = new WebInspector.SplitWidget(true, false, "sourcesPanelNavigatorSplitViewState", initialNavigatorWidth);
    this.editorView.enableShowModeSaving();
    this.editorView.element.tabIndex = 0;
    this._splitWidget.setMainWidget(this.editorView);

    // Create navigator tabbed pane with toolbar.
    this._navigatorTabbedLocation = WebInspector.viewManager.createTabbedLocation(this._revealNavigatorSidebar.bind(this), "navigator-view", true);
    var tabbedPane = this._navigatorTabbedLocation.tabbedPane();
    tabbedPane.setMinimumSize(100, 25);
    tabbedPane.setShrinkableTabs(true);
    tabbedPane.element.classList.add("navigator-tabbed-pane");
    var navigatorMenuButton = new WebInspector.ToolbarMenuButton(this._populateNavigatorMenu.bind(this), true);
    navigatorMenuButton.setTitle(WebInspector.UIString("More options"));
    tabbedPane.rightToolbar().appendToolbarItem(navigatorMenuButton);
    this.editorView.setSidebarWidget(tabbedPane);

    this._sourcesView = new WebInspector.SourcesView();
    this._sourcesView.addEventListener(WebInspector.SourcesView.Events.EditorSelected, this._editorSelected.bind(this));
    this._sourcesView.addEventListener(WebInspector.SourcesView.Events.EditorClosed, this._editorClosed.bind(this));
    this._sourcesView.registerShortcuts(this.registerShortcuts.bind(this));

    this._toggleNavigatorSidebarButton = this.editorView.createShowHideSidebarButton("navigator");
    this._toggleDebuggerSidebarButton = this._splitWidget.createShowHideSidebarButton("debugger");
    this._showSourcesViewInPanel();
    this._editorChanged(this._sourcesView.currentUISourceCode());

    this._threadsSidebarPane = null;
    this._watchSidebarPane = /** @type {!WebInspector.View} */ (WebInspector.viewManager.view("sources.watch"));
    // TODO: Force installing listeners from the model, not the UI.
    self.runtime.sharedInstance(WebInspector.XHRBreakpointsSidebarPane);
    this._callstackPane = self.runtime.sharedInstance(WebInspector.CallStackSidebarPane);
    this._callstackPane.registerShortcuts(this.registerShortcuts.bind(this));

    WebInspector.moduleSetting("sidebarPosition").addChangeListener(this._updateSidebarPosition.bind(this));
    this._updateSidebarPosition();

    this._updateDebuggerButtons();
    this._pauseOnExceptionEnabledChanged();
    WebInspector.moduleSetting("pauseOnExceptionEnabled").addChangeListener(this._pauseOnExceptionEnabledChanged, this);

    this._liveLocationPool = new WebInspector.LiveLocationPool();

    this._setTarget(WebInspector.context.flavor(WebInspector.Target));
    WebInspector.breakpointManager.addEventListener(WebInspector.BreakpointManager.Events.BreakpointsActiveStateChanged, this._breakpointsActiveStateChanged, this);
    WebInspector.context.addFlavorChangeListener(WebInspector.Target, this._onCurrentTargetChanged, this);
    WebInspector.context.addFlavorChangeListener(WebInspector.DebuggerModel.CallFrame, this._callFrameChanged, this);
    WebInspector.targetManager.addModelListener(WebInspector.DebuggerModel, WebInspector.DebuggerModel.Events.DebuggerWasEnabled, this._debuggerWasEnabled, this);
    WebInspector.targetManager.addModelListener(WebInspector.DebuggerModel, WebInspector.DebuggerModel.Events.DebuggerPaused, this._debuggerPaused, this);
    WebInspector.targetManager.addModelListener(WebInspector.DebuggerModel, WebInspector.DebuggerModel.Events.DebuggerResumed, this._debuggerResumed, this);
    WebInspector.targetManager.addModelListener(WebInspector.DebuggerModel, WebInspector.DebuggerModel.Events.GlobalObjectCleared, this._debuggerReset, this);
    new WebInspector.WorkspaceMappingTip(this, this._workspace);
    WebInspector.extensionServer.addEventListener(WebInspector.ExtensionServer.Events.SidebarPaneAdded, this._extensionSidebarPaneAdded, this);
    WebInspector.DataSaverInfobar.maybeShowInPanel(this);
    WebInspector.targetManager.observeTargets(this);
}

WebInspector.SourcesPanel._lastModificationTimeout = 200;

WebInspector.SourcesPanel.minToolbarWidth = 215;

WebInspector.SourcesPanel.prototype = {
    /**
     * @override
     * @param {!WebInspector.Target} target
     */
    targetAdded: function(target)
    {
        var hasThreads = WebInspector.targetManager.targets(WebInspector.Target.Capability.JS).length > 1;
        if (hasThreads && !this._threadsSidebarPane) {
            this._threadsSidebarPane = /** @type {!WebInspector.View} */ (WebInspector.viewManager.view("sources.threads"));
            if (this._sidebarPaneStack) {
                this._sidebarPaneStack.showView(this._threadsSidebarPane, this._splitWidget.isVertical() ? this._watchSidebarPane : this._callstackPane);
            }
        }
    },

    /**
     * @override
     * @param {!WebInspector.Target} target
     */
    targetRemoved: function(target)
    {
    },

    /**
     * @param {?WebInspector.Target} target
     */
    _setTarget: function(target)
    {
        if (!target)
            return;
        var debuggerModel = WebInspector.DebuggerModel.fromTarget(target);
        if (!debuggerModel)
            return;

        if (debuggerModel.isPaused()) {
            this._showDebuggerPausedDetails(/** @type {!WebInspector.DebuggerPausedDetails} */ (debuggerModel.debuggerPausedDetails()));
        } else {
            this._paused = false;
            this._clearInterface();
            this._toggleDebuggerSidebarButton.setEnabled(true);
        }
    },

    /**
     * @param {!WebInspector.Event} event
     */
    _onCurrentTargetChanged: function(event)
    {
        var target = /** @type {?WebInspector.Target} */ (event.data);
        this._setTarget(target);
    },
    /**
     * @return {boolean}
     */
    paused: function()
    {
        return this._paused;
    },

    wasShown: function()
    {
        WebInspector.context.setFlavor(WebInspector.SourcesPanel, this);
        WebInspector.Panel.prototype.wasShown.call(this);
        var wrapper = WebInspector.SourcesPanel.WrapperView._instance;
        if (wrapper && wrapper.isShowing()) {
            WebInspector.inspectorView.setDrawerMinimized(true);
            WebInspector.SourcesPanel.updateResizer(this);
        }
        this._showSourcesViewInPanel();
    },

    willHide: function()
    {
        WebInspector.Panel.prototype.willHide.call(this);
        WebInspector.context.setFlavor(WebInspector.SourcesPanel, null);
        if (WebInspector.SourcesPanel.WrapperView.isShowing()) {
            WebInspector.SourcesPanel.WrapperView._instance._showViewInWrapper();
            WebInspector.inspectorView.setDrawerMinimized(false);
            WebInspector.SourcesPanel.updateResizer(this);
        }
    },

    _showSourcesViewInPanel: function()
    {
        this._sourcesView.leftToolbar().removeToolbarItems();
        this._sourcesView.leftToolbar().appendToolbarItem(this._toggleNavigatorSidebarButton);
        this._sourcesView.rightToolbar().removeToolbarItems();
        this._sourcesView.rightToolbar().appendToolbarItem(this._toggleDebuggerSidebarButton);
        this.editorView.setMainWidget(this._sourcesView);
    },

    /**
     * @override
     * @param {string} locationName
     * @return {?WebInspector.ViewLocation}
     */
    resolveLocation: function(locationName)
    {
        if (locationName === "sources-sidebar")
            return this._sidebarPaneStack;
        else
            return this._navigatorTabbedLocation;
    },

    /**
     * @return {boolean}
     */
    _ensureSourcesViewVisible: function()
    {
        if (WebInspector.SourcesPanel.WrapperView.isShowing())
            return true;
        return this === WebInspector.inspectorView.setCurrentPanel(this);
    },

    onResize: function()
    {
        if (WebInspector.moduleSetting("sidebarPosition").get() === "auto")
            this.element.window().requestAnimationFrame(this._updateSidebarPosition.bind(this));  // Do not force layout.
    },

    /**
     * @override
     * @return {!WebInspector.SearchableView}
     */
    searchableView: function()
    {
        return this._sourcesView.searchableView();
    },

    /**
     * @param {!WebInspector.Event} event
     */
    _debuggerPaused: function(event)
    {
        var details = /** @type {!WebInspector.DebuggerPausedDetails} */ (event.data);
        if (!this._paused)
            WebInspector.inspectorView.setCurrentPanel(this);

        if (WebInspector.context.flavor(WebInspector.Target) === details.target())
            this._showDebuggerPausedDetails(details);
        else if (!this._paused)
            WebInspector.context.setFlavor(WebInspector.Target, details.target());
    },

    /**
     * @param {!WebInspector.DebuggerPausedDetails} details
     */
    _showDebuggerPausedDetails: function(details)
    {
        this._paused = true;
        this._updateDebuggerButtons();
        WebInspector.context.setFlavor(WebInspector.DebuggerPausedDetails, details);
        this._toggleDebuggerSidebarButton.setEnabled(false);
        window.focus();
        InspectorFrontendHost.bringToFront();
    },

    /**
     * @param {!WebInspector.Event} event
     */
    _debuggerResumed: function(event)
    {
        var debuggerModel = /** @type {!WebInspector.DebuggerModel} */  (event.target);
        var target = debuggerModel.target();
        if (WebInspector.context.flavor(WebInspector.Target) !== target)
            return;
        this._paused = false;
        this._clearInterface();
        this._toggleDebuggerSidebarButton.setEnabled(true);
        this._switchToPausedTargetTimeout = setTimeout(this._switchToPausedTarget.bind(this, debuggerModel), 500);
    },

    /**
     * @param {!WebInspector.Event} event
     */
    _debuggerWasEnabled: function(event)
    {
        var target = /** @type {!WebInspector.Target} */  (event.target.target());
        if (WebInspector.context.flavor(WebInspector.Target) !== target)
            return;

        this._updateDebuggerButtons();
    },

    /**
     * @param {!WebInspector.Event} event
     */
    _debuggerReset: function(event)
    {
        this._debuggerResumed(event);
    },

    /**
     * @return {!WebInspector.Widget}
     */
    get visibleView()
    {
        return this._sourcesView.visibleView();
    },

    /**
     * @param {!WebInspector.UISourceCode} uiSourceCode
     * @param {number=} lineNumber 0-based
     * @param {number=} columnNumber
     * @param {boolean=} omitFocus
     */
    showUISourceCode: function(uiSourceCode, lineNumber, columnNumber, omitFocus)
    {
        if (omitFocus) {
            var wrapperShowing = WebInspector.SourcesPanel.WrapperView._instance && WebInspector.SourcesPanel.WrapperView._instance.isShowing();
            if (!this.isShowing() && !wrapperShowing)
                return;
        } else {
            this._showEditor();
        }
        this._sourcesView.showSourceLocation(uiSourceCode, lineNumber, columnNumber, omitFocus);
    },

    _showEditor: function()
    {
        if (WebInspector.SourcesPanel.WrapperView._instance && WebInspector.SourcesPanel.WrapperView._instance.isShowing())
            return;
        WebInspector.inspectorView.setCurrentPanel(this);
    },

    /**
     * @param {!WebInspector.UILocation} uiLocation
     * @param {boolean=} omitFocus
     */
    showUILocation: function(uiLocation, omitFocus)
    {
        this.showUISourceCode(uiLocation.uiSourceCode, uiLocation.lineNumber, uiLocation.columnNumber, omitFocus);
    },

    /**
     * @param {!WebInspector.UISourceCode} uiSourceCode
     * @param {boolean=} skipReveal
     */
    _revealInNavigator: function(uiSourceCode, skipReveal)
    {
        var extensions = self.runtime.extensions(WebInspector.NavigatorView);
        Promise.all(extensions.map(extension => extension.instance())).then(filterNavigators.bind(this));

        /**
         * @this {WebInspector.SourcesPanel}
         * @param {!Array.<!Object>} objects
         */
        function filterNavigators(objects)
        {
            for (var i = 0; i < objects.length; ++i) {
                var navigatorView = /** @type {!WebInspector.NavigatorView} */ (objects[i]);
                var viewId = extensions[i].descriptor()["viewId"];
                if (navigatorView.accept(uiSourceCode)) {
                    navigatorView.revealUISourceCode(uiSourceCode, true);
                    if (skipReveal)
                        this._navigatorTabbedLocation.tabbedPane().selectTab(viewId);
                    else
                        WebInspector.viewManager.showView(viewId);
                }
            }
        }
    },

    /**
     * @param {!WebInspector.ContextMenu} contextMenu
     */
    _populateNavigatorMenu: function(contextMenu)
    {
        var groupByFolderSetting = WebInspector.moduleSetting("navigatorGroupByFolder");
        contextMenu.appendItemsAtLocation("navigatorMenu");
        contextMenu.appendSeparator();
        contextMenu.appendCheckboxItem(WebInspector.UIString("Group by folder"), () => groupByFolderSetting.set(!groupByFolderSetting.get()), groupByFolderSetting.get());
    },

    /**
     * @param {boolean} ignoreExecutionLineEvents
     */
    setIgnoreExecutionLineEvents: function(ignoreExecutionLineEvents)
    {
        this._ignoreExecutionLineEvents = ignoreExecutionLineEvents;
    },

    updateLastModificationTime: function()
    {
        this._lastModificationTime = window.performance.now();
    },

    /**
     * @param {!WebInspector.LiveLocation} liveLocation
     */
    _executionLineChanged: function(liveLocation)
    {
        var uiLocation = liveLocation.uiLocation();
        if (!uiLocation)
            return;
        this._sourcesView.clearCurrentExecutionLine();
        this._sourcesView.setExecutionLocation(uiLocation);
        if (window.performance.now() - this._lastModificationTime < WebInspector.SourcesPanel._lastModificationTimeout)
            return;
        this._sourcesView.showSourceLocation(uiLocation.uiSourceCode, uiLocation.lineNumber, uiLocation.columnNumber, undefined, true);
    },

    _lastModificationTimeoutPassedForTest: function()
    {
        WebInspector.SourcesPanel._lastModificationTimeout = Number.MIN_VALUE;
    },

    _updateLastModificationTimeForTest: function()
    {
        WebInspector.SourcesPanel._lastModificationTimeout = Number.MAX_VALUE;
    },

    _callFrameChanged: function()
    {
        var callFrame = WebInspector.context.flavor(WebInspector.DebuggerModel.CallFrame);
        if (!callFrame)
            return;
        if (this._executionLineLocation)
            this._executionLineLocation.dispose();
        this._executionLineLocation = WebInspector.debuggerWorkspaceBinding.createCallFrameLiveLocation(callFrame.location(), this._executionLineChanged.bind(this), this._liveLocationPool);
    },

    _pauseOnExceptionEnabledChanged: function()
    {
        var enabled = WebInspector.moduleSetting("pauseOnExceptionEnabled").get();
        this._pauseOnExceptionButton.setToggled(enabled);
        this._pauseOnExceptionButton.setTitle(WebInspector.UIString(enabled ? "Don't pause on exceptions" : "Pause on exceptions"));
        this._debugToolbarDrawer.classList.toggle("expanded", enabled);
    },

    _updateDebuggerButtons: function()
    {
        var currentTarget = WebInspector.context.flavor(WebInspector.Target);
        var currentDebuggerModel = WebInspector.DebuggerModel.fromTarget(currentTarget);
        if (!currentDebuggerModel) {
            this._togglePauseAction.setEnabled(false);
            this._stepOverAction.setEnabled(false);
            this._stepIntoAction.setEnabled(false);
            this._stepOutAction.setEnabled(false);
        } else if (this._paused) {
            this._togglePauseAction.setToggled(true);
            this._togglePauseAction.setEnabled(true);
            this._stepOverAction.setEnabled(true);
            this._stepIntoAction.setEnabled(true);
            this._stepOutAction.setEnabled(true);
        } else {
            this._togglePauseAction.setToggled(false);
            this._togglePauseAction.setEnabled(!currentDebuggerModel.isPausing());
            this._stepOverAction.setEnabled(false);
            this._stepIntoAction.setEnabled(false);
            this._stepOutAction.setEnabled(false);
        }
    },

    _clearInterface: function()
    {
        this._sourcesView.clearCurrentExecutionLine();
        this._updateDebuggerButtons();
        WebInspector.context.setFlavor(WebInspector.DebuggerPausedDetails, null);

        if (this._switchToPausedTargetTimeout)
            clearTimeout(this._switchToPausedTargetTimeout);
        this._liveLocationPool.disposeAll();
    },

    /**
     * @param {!WebInspector.DebuggerModel} debuggerModel
     */
    _switchToPausedTarget: function(debuggerModel)
    {
        delete this._switchToPausedTargetTimeout;
        if (this._paused)
            return;
        var target = WebInspector.context.flavor(WebInspector.Target);
        if (debuggerModel.isPaused())
            return;
        var debuggerModels = WebInspector.DebuggerModel.instances();
        for (var i = 0; i < debuggerModels.length; ++i) {
            if (debuggerModels[i].isPaused()) {
                WebInspector.context.setFlavor(WebInspector.Target, debuggerModels[i].target());
                break;
            }
        }
    },

    _togglePauseOnExceptions: function()
    {
        WebInspector.moduleSetting("pauseOnExceptionEnabled").set(!this._pauseOnExceptionButton.toggled());
    },

    /**
     * @return {boolean}
     */
    _runSnippet: function()
    {
        var uiSourceCode = this._sourcesView.currentUISourceCode();
        if (uiSourceCode.project().type() !== WebInspector.projectTypes.Snippets)
            return false;

        var currentExecutionContext = WebInspector.context.flavor(WebInspector.ExecutionContext);
        if (!currentExecutionContext)
            return false;

        WebInspector.scriptSnippetModel.evaluateScriptSnippet(currentExecutionContext, uiSourceCode);
        return true;
    },

    /**
     * @param {!WebInspector.Event} event
     */
    _editorSelected: function(event)
    {
        var uiSourceCode = /** @type {!WebInspector.UISourceCode} */ (event.data);
        this._editorChanged(uiSourceCode);
        if (this.editorView.mainWidget() && WebInspector.moduleSetting("autoRevealInNavigator").get())
            this._revealInNavigator(uiSourceCode, true);
    },

    /**
     * @param {!WebInspector.Event} event
     */
    _editorClosed: function(event)
    {
        var wasSelected = /** @type {boolean} */ (event.data.wasSelected);
        if (wasSelected)
            this._editorChanged(null);
    },

    /**
     * @param {?WebInspector.UISourceCode} uiSourceCode
     */
    _editorChanged: function(uiSourceCode)
    {
        var isSnippet = uiSourceCode && uiSourceCode.project().type() === WebInspector.projectTypes.Snippets;
        this._runSnippetButton.setVisible(isSnippet);
    },

    /**
     * @return {boolean}
     */
    _togglePause: function()
    {
        var target = WebInspector.context.flavor(WebInspector.Target);
        if (!target)
            return true;
        var debuggerModel = WebInspector.DebuggerModel.fromTarget(target);
        if (!debuggerModel)
            return true;

        if (this._paused) {
            this._paused = false;
            debuggerModel.resume();
        } else {
            // Make sure pauses didn't stick skipped.
            debuggerModel.pause();
        }

        this._clearInterface();
        return true;
    },

    /**
     * @return {?WebInspector.DebuggerModel}
     */
    _prepareToResume: function()
    {
        if (!this._paused)
            return null;

        this._paused = false;

        this._clearInterface();
        var target = WebInspector.context.flavor(WebInspector.Target);
        return target ? WebInspector.DebuggerModel.fromTarget(target) : null;
    },

    /**
     * @return {boolean}
     */
    _longResume: function()
    {
        var debuggerModel = this._prepareToResume();
        if (!debuggerModel)
            return true;

        debuggerModel.skipAllPausesUntilReloadOrTimeout(500);
        debuggerModel.resume();
        return true;
    },

    /**
     * @return {boolean}
     */
    _stepOver: function()
    {
        var debuggerModel = this._prepareToResume();
        if (!debuggerModel)
            return true;

        debuggerModel.stepOver();
        return true;
    },

    /**
     * @return {boolean}
     */
    _stepInto: function()
    {
        var debuggerModel = this._prepareToResume();
        if (!debuggerModel)
            return true;

        debuggerModel.stepInto();
        return true;
    },

    /**
     * @return {boolean}
     */
    _stepOut: function()
    {
        var debuggerModel = this._prepareToResume();
        if (!debuggerModel)
            return true;

        debuggerModel.stepOut();
        return true;
    },

    /**
     * @param {!WebInspector.UILocation} uiLocation
     */
    _continueToLocation: function(uiLocation)
    {
        var executionContext = WebInspector.context.flavor(WebInspector.ExecutionContext);
        if (!executionContext)
            return;

        // Always use 0 column.
        var rawLocation = WebInspector.debuggerWorkspaceBinding.uiLocationToRawLocation(executionContext.target(), uiLocation.uiSourceCode, uiLocation.lineNumber, 0);
        if (!rawLocation)
            return;

        if (!this._prepareToResume())
            return;

        rawLocation.continueToLocation();
    },

    _toggleBreakpointsActive: function()
    {
        WebInspector.breakpointManager.setBreakpointsActive(!WebInspector.breakpointManager.breakpointsActive());
    },

    _breakpointsActiveStateChanged: function(event)
    {
        var active = event.data;
        this._toggleBreakpointsActiveAction.setToggled(!active);
        this._sourcesView.toggleBreakpointsActiveState(active);
    },

    /**
     * @return {!WebInspector.Toolbar}
     */
    _createDebugToolbar: function()
    {
        var debugToolbar = new WebInspector.Toolbar("scripts-debug-toolbar");

        this._runSnippetButton = WebInspector.Toolbar.createActionButton(this._runSnippetAction);
        debugToolbar.appendToolbarItem(this._runSnippetButton);
        this._runSnippetButton.setVisible(false);

        var longResumeButton = new WebInspector.ToolbarButton(WebInspector.UIString("Resume with all pauses blocked for 500 ms"), "play-toolbar-item");
        longResumeButton.addEventListener("click", this._longResume.bind(this), this);
        debugToolbar.appendToolbarItem(WebInspector.Toolbar.createActionButton(this._togglePauseAction, [longResumeButton], []));

        debugToolbar.appendToolbarItem(WebInspector.Toolbar.createActionButton(this._stepOverAction));
        debugToolbar.appendToolbarItem(WebInspector.Toolbar.createActionButton(this._stepIntoAction));
        debugToolbar.appendToolbarItem(WebInspector.Toolbar.createActionButton(this._stepOutAction));
        debugToolbar.appendSeparator();
        debugToolbar.appendToolbarItem(WebInspector.Toolbar.createActionButton(this._toggleBreakpointsActiveAction));

        this._pauseOnExceptionButton = new WebInspector.ToolbarToggle("", "pause-on-exceptions-toolbar-item");
        this._pauseOnExceptionButton.addEventListener("click", this._togglePauseOnExceptions, this);
        debugToolbar.appendToolbarItem(this._pauseOnExceptionButton);

        debugToolbar.appendSeparator();
        debugToolbar.appendToolbarItem(new WebInspector.ToolbarCheckbox(WebInspector.UIString("Async"), WebInspector.UIString("Capture async stack traces"), WebInspector.moduleSetting("enableAsyncStackTraces")));

        return debugToolbar;
    },

    _createDebugToolbarDrawer: function()
    {
        var debugToolbarDrawer = createElementWithClass("div", "scripts-debug-toolbar-drawer");

        var label = WebInspector.UIString("Pause On Caught Exceptions");
        var setting = WebInspector.moduleSetting("pauseOnCaughtException");
        debugToolbarDrawer.appendChild(WebInspector.SettingsUI.createSettingCheckbox(label, setting, true));

        return debugToolbarDrawer;
    },

    /**
     * @param {!WebInspector.UISourceCode} uiSourceCode
     */
    _showLocalHistory: function(uiSourceCode)
    {
        WebInspector.RevisionHistoryView.showHistory(uiSourceCode);
    },

    /**
     * @override
     * @param {!Event} event
     * @param {!WebInspector.ContextMenu} contextMenu
     * @param {!Object} target
     */
    appendApplicableItems: function(event, contextMenu, target)
    {
        this._appendUISourceCodeItems(event, contextMenu, target);
        this.appendUILocationItems(contextMenu, target);
        this._appendRemoteObjectItems(contextMenu, target);
        this._appendNetworkRequestItems(contextMenu, target);
        contextMenu.appendAction("debugger.evaluate-selection");
    },

    /**
     * @param {!WebInspector.UISourceCode} uiSourceCode
     */
    mapFileSystemToNetwork: function(uiSourceCode)
    {
        WebInspector.SelectUISourceCodeForProjectTypesDialog.show(uiSourceCode.name(), [WebInspector.projectTypes.Network, WebInspector.projectTypes.ContentScripts], mapFileSystemToNetwork.bind(this));

        /**
         * @param {?WebInspector.UISourceCode} networkUISourceCode
         * @this {WebInspector.SourcesPanel}
         */
        function mapFileSystemToNetwork(networkUISourceCode)
        {
            if (!networkUISourceCode)
                return;
            this._networkMapping.addMapping(networkUISourceCode, uiSourceCode);
        }
    },

    /**
     * @param {!WebInspector.UISourceCode} networkUISourceCode
     */
    mapNetworkToFileSystem: function(networkUISourceCode)
    {
        WebInspector.SelectUISourceCodeForProjectTypesDialog.show(networkUISourceCode.name(), [WebInspector.projectTypes.FileSystem], mapNetworkToFileSystem.bind(this));

        /**
         * @param {?WebInspector.UISourceCode} uiSourceCode
         * @this {WebInspector.SourcesPanel}
         */
        function mapNetworkToFileSystem(uiSourceCode)
        {
            if (!uiSourceCode)
                return;
            this._networkMapping.addMapping(networkUISourceCode, uiSourceCode);
        }
    },

    /**
     * @param {!WebInspector.UISourceCode} uiSourceCode
     */
    _removeNetworkMapping: function(uiSourceCode)
    {
        this._networkMapping.removeMapping(uiSourceCode);
    },

    /**
     * @param {!WebInspector.ContextMenu} contextMenu
     * @param {!WebInspector.UISourceCode} uiSourceCode
     */
    _appendUISourceCodeMappingItems: function(contextMenu, uiSourceCode)
    {
        WebInspector.NavigatorView.appendAddFolderItem(contextMenu);
        if (uiSourceCode.project().type() === WebInspector.projectTypes.FileSystem) {
            var binding = WebInspector.persistence.binding(uiSourceCode);
            if (!binding)
                contextMenu.appendItem(WebInspector.UIString.capitalize("Map to ^network ^resource\u2026"), this.mapFileSystemToNetwork.bind(this, uiSourceCode));
            else
                contextMenu.appendItem(WebInspector.UIString.capitalize("Remove ^network ^mapping"), this._removeNetworkMapping.bind(this, binding.network));
        }

        /**
         * @param {!WebInspector.Project} project
         */
        function filterProject(project)
        {
            return project.type() === WebInspector.projectTypes.FileSystem;
        }

        if (uiSourceCode.project().type() === WebInspector.projectTypes.Network || uiSourceCode.project().type() === WebInspector.projectTypes.ContentScripts) {
            if (!this._workspace.projects().filter(filterProject).length)
                return;
            if (this._networkMapping.uiSourceCodeForURLForAnyTarget(uiSourceCode.url()) === uiSourceCode)
                contextMenu.appendItem(WebInspector.UIString.capitalize("Map to ^file ^system ^resource\u2026"), this.mapNetworkToFileSystem.bind(this, uiSourceCode));
        }
    },

    /**
     * @param {!Event} event
     * @param {!WebInspector.ContextMenu} contextMenu
     * @param {!Object} target
     */
    _appendUISourceCodeItems: function(event, contextMenu, target)
    {
        if (!(target instanceof WebInspector.UISourceCode))
            return;

        var uiSourceCode = /** @type {!WebInspector.UISourceCode} */ (target);
        var projectType = uiSourceCode.project().type();

        if (projectType !== WebInspector.projectTypes.Debugger && !event.target.isSelfOrDescendant(this._navigatorTabbedLocation.widget().element)) {
            contextMenu.appendItem(WebInspector.UIString.capitalize("Reveal in ^navigator"), this._handleContextMenuReveal.bind(this, uiSourceCode));
            contextMenu.appendSeparator();
        }
        this._appendUISourceCodeMappingItems(contextMenu, uiSourceCode);
        if (projectType !== WebInspector.projectTypes.FileSystem)
            contextMenu.appendItem(WebInspector.UIString.capitalize("Local ^modifications\u2026"), this._showLocalHistory.bind(this, uiSourceCode));
    },

    /**
     * @param {!WebInspector.ContextMenu} contextMenu
     * @param {!Object} object
     */
    appendUILocationItems: function(contextMenu, object)
    {
        if (!(object instanceof WebInspector.UILocation))
            return;
        var uiLocation = /** @type {!WebInspector.UILocation} */ (object);
        var uiSourceCode = uiLocation.uiSourceCode;
        var projectType = uiSourceCode.project().type();

        var contentType = uiSourceCode.contentType();
        if (contentType.hasScripts()) {
            var target = WebInspector.context.flavor(WebInspector.Target);
            var debuggerModel = WebInspector.DebuggerModel.fromTarget(target);
            if (debuggerModel && debuggerModel.isPaused())
                contextMenu.appendItem(WebInspector.UIString.capitalize("Continue to ^here"), this._continueToLocation.bind(this, uiLocation));
        }

        if (contentType.hasScripts() && projectType !== WebInspector.projectTypes.Snippets)
            this._callstackPane.appendBlackboxURLContextMenuItems(contextMenu, uiSourceCode);
    },

    /**
     * @param {!WebInspector.UISourceCode} uiSourceCode
     */
    _handleContextMenuReveal: function(uiSourceCode)
    {
        this.editorView.showBoth();
        this._revealInNavigator(uiSourceCode);
    },

    /**
     * @param {!WebInspector.ContextMenu} contextMenu
     * @param {!Object} target
     */
    _appendRemoteObjectItems: function(contextMenu, target)
    {
        if (!(target instanceof WebInspector.RemoteObject))
            return;
        var remoteObject = /** @type {!WebInspector.RemoteObject} */ (target);
        contextMenu.appendItem(WebInspector.UIString.capitalize("Store as ^global ^variable"), this._saveToTempVariable.bind(this, remoteObject));
        if (remoteObject.type === "function")
            contextMenu.appendItem(WebInspector.UIString.capitalize("Show ^function ^definition"), this._showFunctionDefinition.bind(this, remoteObject));
    },

    /**
     * @param {!WebInspector.ContextMenu} contextMenu
     * @param {!Object} target
     */
    _appendNetworkRequestItems: function(contextMenu, target)
    {
        if (!(target instanceof WebInspector.NetworkRequest))
            return;
        var request = /** @type {!WebInspector.NetworkRequest} */ (target);
        var uiSourceCode = this._networkMapping.uiSourceCodeForURLForAnyTarget(request.url);
        if (!uiSourceCode)
            return;
        var openText = WebInspector.UIString.capitalize("Open in Sources ^panel");
        contextMenu.appendItem(openText, this.showUILocation.bind(this, uiSourceCode.uiLocation(0, 0)));
    },

    /**
     * @param {!WebInspector.RemoteObject} remoteObject
     */
    _saveToTempVariable: function(remoteObject)
    {
        var currentExecutionContext = WebInspector.context.flavor(WebInspector.ExecutionContext);
        if (!currentExecutionContext)
            return;

        currentExecutionContext.globalObject("", false, didGetGlobalObject);
        /**
         * @param {?WebInspector.RemoteObject} global
         * @param {!RuntimeAgent.ExceptionDetails=} exceptionDetails
         */
        function didGetGlobalObject(global, exceptionDetails)
        {
            /**
             * @suppressReceiverCheck
             * @this {Window}
             */
            function remoteFunction(value)
            {
                var prefix = "temp";
                var index = 1;
                while ((prefix + index) in this)
                    ++index;
                var name = prefix + index;
                this[name] = value;
                return name;
            }

            if (!!exceptionDetails || !global)
                failedToSave(global);
            else
                global.callFunction(remoteFunction, [WebInspector.RemoteObject.toCallArgument(remoteObject)], didSave.bind(null, global));
        }

        /**
         * @param {!WebInspector.RemoteObject} global
         * @param {?WebInspector.RemoteObject} result
         * @param {boolean=} wasThrown
         */
        function didSave(global, result, wasThrown)
        {
            global.release();
            if (wasThrown || !result || result.type !== "string")
                failedToSave(result);
            else
                WebInspector.ConsoleModel.evaluateCommandInConsole(/** @type {!WebInspector.ExecutionContext} */ (currentExecutionContext), result.value);
        }

        /**
         * @param {?WebInspector.RemoteObject} result
         */
        function failedToSave(result)
        {
            var message = WebInspector.UIString("Failed to save to temp variable.");
            if (result) {
                message += " " + result.description;
                result.release();
            }
            WebInspector.console.error(message);
        }
    },

    /**
     * @param {!WebInspector.RemoteObject} remoteObject
     */
    _showFunctionDefinition: function(remoteObject)
    {
        remoteObject.debuggerModel().functionDetailsPromise(remoteObject).then(this._didGetFunctionDetails.bind(this));
    },

    /**
     * @param {?{location: ?WebInspector.DebuggerModel.Location}} response
     */
    _didGetFunctionDetails: function(response)
    {
        if (!response || !response.location)
            return;

        var location = response.location;
        if (!location)
            return;

        var uiLocation = WebInspector.debuggerWorkspaceBinding.rawLocationToUILocation(location);
        if (uiLocation)
            this.showUILocation(uiLocation);
    },

    showGoToSourceDialog: function()
    {
        this._sourcesView.showOpenResourceDialog();
    },

    _revealNavigatorSidebar: function()
    {
        this._setAsCurrentPanel();
        this.editorView.showBoth(true);
    },

    _revealDebuggerSidebar: function()
    {
        this._setAsCurrentPanel();
        this._splitWidget.showBoth(true);
    },

    _updateSidebarPosition: function()
    {
        var vertically;
        var position = WebInspector.moduleSetting("sidebarPosition").get();
        if (position === "right")
            vertically = false;
        else if (position === "bottom")
            vertically = true;
        else
            vertically = WebInspector.inspectorView.element.offsetWidth < 680;

        if (this.sidebarPaneView && vertically === !this._splitWidget.isVertical())
            return;

        if (this.sidebarPaneView && this.sidebarPaneView.shouldHideOnDetach())
            return; // We can't reparent extension iframes.

        if (this.sidebarPaneView)
            this.sidebarPaneView.detach();

        this._splitWidget.setVertical(!vertically);
        this._splitWidget.element.classList.toggle("sources-split-view-vertical", vertically);

        WebInspector.SourcesPanel.updateResizer(this);

        // Create vertical box with stack.
        var vbox = new WebInspector.VBox();
        vbox.element.appendChild(this._debugToolbarDrawer);
        vbox.setMinimumAndPreferredSizes(25, 25, WebInspector.SourcesPanel.minToolbarWidth, 100);
        this._sidebarPaneStack = WebInspector.viewManager.createStackLocation(this._revealDebuggerSidebar.bind(this));
        this._sidebarPaneStack.widget().element.classList.add("overflow-auto");
        this._sidebarPaneStack.widget().show(vbox.element);
        vbox.element.appendChild(this._debugToolbar.element);

        if (this._threadsSidebarPane)
            this._sidebarPaneStack.showView(this._threadsSidebarPane);

        if (!vertically)
            this._sidebarPaneStack.appendView(this._watchSidebarPane);

        this._sidebarPaneStack.showView(this._callstackPane);
        var jsBreakpoints = /** @type {!WebInspector.View} */ (WebInspector.viewManager.view("sources.jsBreakpoints"));
        var scopeChainView = /** @type {!WebInspector.View} */ (WebInspector.viewManager.view("sources.scopeChain"));

        if (!vertically) {
            // Populate the rest of the stack.
            this._sidebarPaneStack.showView(scopeChainView);
            this._sidebarPaneStack.showView(jsBreakpoints);
            this._extensionSidebarPanesContainer = this._sidebarPaneStack;
            this.sidebarPaneView = vbox;
        } else {
            var splitWidget = new WebInspector.SplitWidget(true, true, "sourcesPanelDebuggerSidebarSplitViewState", 0.5);
            splitWidget.setMainWidget(vbox);

            // Populate the left stack.
            this._sidebarPaneStack.showView(jsBreakpoints);

            var tabbedLocation = WebInspector.viewManager.createTabbedLocation(this._revealDebuggerSidebar.bind(this));
            splitWidget.setSidebarWidget(tabbedLocation.tabbedPane());
            tabbedLocation.appendView(scopeChainView);
            tabbedLocation.appendView(this._watchSidebarPane);
            this._extensionSidebarPanesContainer = tabbedLocation;
            this.sidebarPaneView = splitWidget;
        }

        this._sidebarPaneStack.appendApplicableItems("sources-sidebar");
        var extensionSidebarPanes = WebInspector.extensionServer.sidebarPanes();
        for (var i = 0; i < extensionSidebarPanes.length; ++i)
            this._addExtensionSidebarPane(extensionSidebarPanes[i]);

        this._splitWidget.setSidebarWidget(this.sidebarPaneView);
    },

    _setAsCurrentPanel: function()
    {
        WebInspector.inspectorView.setCurrentPanel(this);
    },

    /**
     * @param {!WebInspector.Event} event
     */
    _extensionSidebarPaneAdded: function(event)
    {
        var pane = /** @type {!WebInspector.ExtensionSidebarPane} */ (event.data);
        this._addExtensionSidebarPane(pane);
    },

    /**
     * @param {!WebInspector.ExtensionSidebarPane} pane
     */
    _addExtensionSidebarPane: function(pane)
    {
        if (pane.panelName() === this.name)
            this._extensionSidebarPanesContainer.appendView(pane);
    },

    /**
     * @return {!WebInspector.SourcesView}
     */
    sourcesView: function()
    {
        return this._sourcesView;
    },

    /**
     * @param {!DataTransfer} dataTransfer
     */
    _handleDrop: function(dataTransfer)
    {
        var items = dataTransfer.items;
        if (!items.length)
            return;
        var entry = items[0].webkitGetAsEntry();
        if (!entry.isDirectory)
            return;
        InspectorFrontendHost.upgradeDraggedFileSystemPermissions(entry.filesystem);
    },

    __proto__: WebInspector.Panel.prototype
}

/**
 * @constructor
 * @implements {WebInspector.Revealer}
 */
WebInspector.SourcesPanel.UILocationRevealer = function()
{
}

WebInspector.SourcesPanel.UILocationRevealer.prototype = {
    /**
     * @override
     * @param {!Object} uiLocation
     * @param {boolean=} omitFocus
     * @return {!Promise}
     */
    reveal: function(uiLocation, omitFocus)
    {
        if (!(uiLocation instanceof WebInspector.UILocation))
            return Promise.reject(new Error("Internal error: not a ui location"));
        WebInspector.SourcesPanel.instance().showUILocation(uiLocation, omitFocus);
        return Promise.resolve();
    }
}

/**
 * @constructor
 * @implements {WebInspector.Revealer}
 */
WebInspector.SourcesPanel.DebuggerLocationRevealer = function()
{
}

WebInspector.SourcesPanel.DebuggerLocationRevealer.prototype = {
    /**
     * @override
     * @param {!Object} rawLocation
     * @param {boolean=} omitFocus
     * @return {!Promise}
     */
    reveal: function(rawLocation, omitFocus)
    {
        if (!(rawLocation instanceof WebInspector.DebuggerModel.Location))
            return Promise.reject(new Error("Internal error: not a debugger location"));
        WebInspector.SourcesPanel.instance().showUILocation(WebInspector.debuggerWorkspaceBinding.rawLocationToUILocation(rawLocation), omitFocus);
        return Promise.resolve();
    }
}

/**
 * @constructor
 * @implements {WebInspector.Revealer}
 */
WebInspector.SourcesPanel.UISourceCodeRevealer = function()
{
}

WebInspector.SourcesPanel.UISourceCodeRevealer.prototype = {
    /**
     * @override
     * @param {!Object} uiSourceCode
     * @param {boolean=} omitFocus
     * @return {!Promise}
     */
    reveal: function(uiSourceCode, omitFocus)
    {
        if (!(uiSourceCode instanceof WebInspector.UISourceCode))
            return Promise.reject(new Error("Internal error: not a ui source code"));
        WebInspector.SourcesPanel.instance().showUISourceCode(uiSourceCode, undefined, undefined, omitFocus);
        return Promise.resolve();
    }
}

/**
 * @constructor
 * @implements {WebInspector.Revealer}
 */
WebInspector.SourcesPanel.DebuggerPausedDetailsRevealer = function()
{
}

WebInspector.SourcesPanel.DebuggerPausedDetailsRevealer.prototype = {
    /**
     * @override
     * @param {!Object} object
     * @return {!Promise}
     */
    reveal: function(object)
    {
        WebInspector.inspectorView.setCurrentPanel(WebInspector.SourcesPanel.instance());
        return Promise.resolve();
    }
}

/**
 * @constructor
 * @implements {WebInspector.ActionDelegate}
 */
WebInspector.SourcesPanel.RevealingActionDelegate = function() {}

WebInspector.SourcesPanel.RevealingActionDelegate.prototype = {
    /**
     * @override
     * @param {!WebInspector.Context} context
     * @param {string} actionId
     * @return {boolean}
     */
    handleAction: function(context, actionId)
    {
        var panel = WebInspector.SourcesPanel.instance();
        if (!panel._ensureSourcesViewVisible())
            return false;
        switch (actionId) {
        case "debugger.toggle-pause":
            panel._togglePause();
            return true;
        case "sources.go-to-source":
            panel.showGoToSourceDialog();
            return true;
        }
        return false;
    }
}

/**
 * @constructor
 * @implements {WebInspector.ActionDelegate}
 */
WebInspector.SourcesPanel.DebuggingActionDelegate = function()
{
}

WebInspector.SourcesPanel.DebuggingActionDelegate.prototype = {
    /**
     * @override
     * @param {!WebInspector.Context} context
     * @param {string} actionId
     * @return {boolean}
     */
    handleAction: function(context, actionId)
    {
        var panel = WebInspector.SourcesPanel.instance();
        switch (actionId) {
        case "debugger.step-over":
            panel._stepOver();
            return true;
        case "debugger.step-into":
            panel._stepInto();
            return true;
        case "debugger.step-out":
            panel._stepOut();
            return true;
        case "debugger.run-snippet":
            panel._runSnippet();
            return true;
        case "debugger.toggle-breakpoints-active":
            panel._toggleBreakpointsActive();
            return true;
        case "debugger.evaluate-selection":
            var frame = WebInspector.context.flavor(WebInspector.UISourceCodeFrame);
            if (frame) {
                var text = frame.textEditor.text(frame.textEditor.selection());
                var executionContext = WebInspector.context.flavor(WebInspector.ExecutionContext);
                if (executionContext)
                    WebInspector.ConsoleModel.evaluateCommandInConsole(executionContext, text);
            }
            return true;
        }
        return false;
    }
}

WebInspector.SourcesPanel.show = function()
{
    WebInspector.inspectorView.setCurrentPanel(WebInspector.SourcesPanel.instance());
}

/**
 * @return {!WebInspector.SourcesPanel}
 */
WebInspector.SourcesPanel.instance = function()
{
    if (WebInspector.SourcesPanel._instance)
        return WebInspector.SourcesPanel._instance;
    return /** @type {!WebInspector.SourcesPanel} */ (self.runtime.sharedInstance(WebInspector.SourcesPanel));
}

/**
 * @param {!WebInspector.SourcesPanel} panel
 */
WebInspector.SourcesPanel.updateResizer = function(panel)
{
    if (panel._splitWidget.isVertical() || (WebInspector.SourcesPanel.WrapperView.isShowing() && !WebInspector.inspectorView.isDrawerMinimized()))
        panel._splitWidget.uninstallResizer(panel._sourcesView.toolbarContainerElement());
    else
        panel._splitWidget.installResizer(panel._sourcesView.toolbarContainerElement());
}

/**
 * @constructor
 * @extends {WebInspector.VBox}
 */
WebInspector.SourcesPanel.WrapperView = function()
{
    WebInspector.VBox.call(this);
    this.element.classList.add("sources-view-wrapper");
    WebInspector.SourcesPanel.WrapperView._instance = this;
    this._view = WebInspector.SourcesPanel.instance()._sourcesView;
}

WebInspector.SourcesPanel.WrapperView.prototype = {
    wasShown: function()
    {
        if (WebInspector.inspectorView.currentPanel() && WebInspector.inspectorView.currentPanel().name !== "sources")
            this._showViewInWrapper();
        else
            WebInspector.inspectorView.setDrawerMinimized(true);
        WebInspector.SourcesPanel.updateResizer(WebInspector.SourcesPanel.instance());
    },

    willHide: function()
    {
        WebInspector.inspectorView.setDrawerMinimized(false);
        setImmediate(() => WebInspector.SourcesPanel.updateResizer(WebInspector.SourcesPanel.instance()));
    },

    _showViewInWrapper: function()
    {
        this._view.leftToolbar().removeToolbarItems();
        this._view.rightToolbar().removeToolbarItems();
        this._view.show(this.element);
    },

    __proto__: WebInspector.VBox.prototype
}

/**
 * @return {boolean}
 */
WebInspector.SourcesPanel.WrapperView.isShowing = function()
{
    return !!WebInspector.SourcesPanel.WrapperView._instance && WebInspector.SourcesPanel.WrapperView._instance.isShowing();
}
