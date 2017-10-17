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
 * @implements {UI.ContextMenu.Provider}
 * @implements {SDK.TargetManager.Observer}
 * @implements {UI.ViewLocationResolver}
 * @unrestricted
 */
Sources.SourcesPanel = class extends UI.Panel {
  constructor() {
    super('sources');
    Sources.SourcesPanel._instance = this;
    this.registerRequiredCSS('sources/sourcesPanel.css');
    new UI.DropTarget(
        this.element, [UI.DropTarget.Types.Files], Common.UIString('Drop workspace folder here'),
        this._handleDrop.bind(this));

    this._workspace = Workspace.workspace;

    this._togglePauseAction =
        /** @type {!UI.Action }*/ (UI.actionRegistry.action('debugger.toggle-pause'));
    this._stepOverAction =
        /** @type {!UI.Action }*/ (UI.actionRegistry.action('debugger.step-over'));
    this._stepIntoAction =
        /** @type {!UI.Action }*/ (UI.actionRegistry.action('debugger.step-into'));
    this._stepOutAction = /** @type {!UI.Action }*/ (UI.actionRegistry.action('debugger.step-out'));
    this._toggleBreakpointsActiveAction =
        /** @type {!UI.Action }*/ (UI.actionRegistry.action('debugger.toggle-breakpoints-active'));

    this._debugToolbar = this._createDebugToolbar();
    this._debugToolbarDrawer = this._createDebugToolbarDrawer();
    this._debuggerPausedMessage = new Sources.DebuggerPausedMessage();

    const initialDebugSidebarWidth = 225;
    this._splitWidget = new UI.SplitWidget(true, true, 'sourcesPanelSplitViewState', initialDebugSidebarWidth);
    this._splitWidget.enableShowModeSaving();
    this._splitWidget.show(this.element);

    // Create scripts navigator
    const initialNavigatorWidth = 225;
    this.editorView = new UI.SplitWidget(true, false, 'sourcesPanelNavigatorSplitViewState', initialNavigatorWidth);
    this.editorView.enableShowModeSaving();
    this.editorView.element.tabIndex = 0;
    this._splitWidget.setMainWidget(this.editorView);

    // Create navigator tabbed pane with toolbar.
    this._navigatorTabbedLocation =
        UI.viewManager.createTabbedLocation(this._revealNavigatorSidebar.bind(this), 'navigator-view', true);
    var tabbedPane = this._navigatorTabbedLocation.tabbedPane();
    tabbedPane.setMinimumSize(100, 25);
    tabbedPane.element.classList.add('navigator-tabbed-pane');
    var navigatorMenuButton = new UI.ToolbarMenuButton(this._populateNavigatorMenu.bind(this), true);
    navigatorMenuButton.setTitle(Common.UIString('More options'));
    tabbedPane.rightToolbar().appendToolbarItem(navigatorMenuButton);
    this.editorView.setSidebarWidget(tabbedPane);

    this._sourcesView = new Sources.SourcesView();
    this._sourcesView.addEventListener(Sources.SourcesView.Events.EditorSelected, this._editorSelected.bind(this));
    this._sourcesView.registerShortcuts(this.registerShortcuts.bind(this));

    this._toggleNavigatorSidebarButton = this.editorView.createShowHideSidebarButton('navigator');
    this._toggleDebuggerSidebarButton = this._splitWidget.createShowHideSidebarButton('debugger');
    this.editorView.setMainWidget(this._sourcesView);

    this._threadsSidebarPane = null;
    this._watchSidebarPane = /** @type {!UI.View} */ (UI.viewManager.view('sources.watch'));
    this._callstackPane = self.runtime.sharedInstance(Sources.CallStackSidebarPane);
    this._callstackPane.registerShortcuts(this.registerShortcuts.bind(this));

    Common.moduleSetting('sidebarPosition').addChangeListener(this._updateSidebarPosition.bind(this));
    this._updateSidebarPosition();

    this._updateDebuggerButtonsAndStatus();
    this._pauseOnExceptionEnabledChanged();
    Common.moduleSetting('pauseOnExceptionEnabled').addChangeListener(this._pauseOnExceptionEnabledChanged, this);

    this._liveLocationPool = new Bindings.LiveLocationPool();

    this._setTarget(UI.context.flavor(SDK.Target));
    Bindings.breakpointManager.addEventListener(
        Bindings.BreakpointManager.Events.BreakpointsActiveStateChanged, this._breakpointsActiveStateChanged, this);
    UI.context.addFlavorChangeListener(SDK.Target, this._onCurrentTargetChanged, this);
    UI.context.addFlavorChangeListener(SDK.DebuggerModel.CallFrame, this._callFrameChanged, this);
    SDK.targetManager.addModelListener(
        SDK.DebuggerModel, SDK.DebuggerModel.Events.DebuggerWasEnabled, this._debuggerWasEnabled, this);
    SDK.targetManager.addModelListener(
        SDK.DebuggerModel, SDK.DebuggerModel.Events.DebuggerPaused, this._debuggerPaused, this);
    SDK.targetManager.addModelListener(
        SDK.DebuggerModel, SDK.DebuggerModel.Events.DebuggerResumed,
        event => this._debuggerResumed(/** @type {!SDK.DebuggerModel} */ (event.data)));
    SDK.targetManager.addModelListener(
        SDK.DebuggerModel, SDK.DebuggerModel.Events.GlobalObjectCleared,
        event => this._debuggerResumed(/** @type {!SDK.DebuggerModel} */ (event.data)));
    SDK.targetManager.addEventListener(
        SDK.TargetManager.Events.AvailableNodeTargetsChanged, this._availableNodeTargetsChanged, this);
    new Sources.WorkspaceMappingTip(this, this._workspace);
    Extensions.extensionServer.addEventListener(
        Extensions.ExtensionServer.Events.SidebarPaneAdded, this._extensionSidebarPaneAdded, this);
    SDK.targetManager.observeTargets(this);
  }

  /**
   * @return {!Sources.SourcesPanel}
   */
  static instance() {
    if (Sources.SourcesPanel._instance)
      return Sources.SourcesPanel._instance;
    return /** @type {!Sources.SourcesPanel} */ (self.runtime.sharedInstance(Sources.SourcesPanel));
  }

  /**
   * @param {!Sources.SourcesPanel} panel
   */
  static updateResizerAndSidebarButtons(panel) {
    panel._sourcesView.leftToolbar().removeToolbarItems();
    panel._sourcesView.rightToolbar().removeToolbarItems();
    panel._sourcesView.bottomToolbar().removeToolbarItems();
    var isInWrapper = Sources.SourcesPanel.WrapperView.isShowing() && !UI.inspectorView.isDrawerMinimized();
    if (panel._splitWidget.isVertical() || isInWrapper)
      panel._splitWidget.uninstallResizer(panel._sourcesView.toolbarContainerElement());
    else
      panel._splitWidget.installResizer(panel._sourcesView.toolbarContainerElement());
    if (!isInWrapper) {
      panel._sourcesView.leftToolbar().appendToolbarItem(panel._toggleNavigatorSidebarButton);
      if (panel._splitWidget.isVertical())
        panel._sourcesView.rightToolbar().appendToolbarItem(panel._toggleDebuggerSidebarButton);
      else
        panel._sourcesView.bottomToolbar().appendToolbarItem(panel._toggleDebuggerSidebarButton);
    }
  }

  /**
   * @override
   * @param {!SDK.Target} target
   */
  targetAdded(target) {
    this._showThreadsIfNeeded();
  }

  /**
   * @override
   * @param {!SDK.Target} target
   */
  targetRemoved(target) {
  }

  _availableNodeTargetsChanged() {
    this._showThreadsIfNeeded();
  }

  _showThreadsIfNeeded() {
    if (Sources.ThreadsSidebarPane.shouldBeShown() && !this._threadsSidebarPane) {
      this._threadsSidebarPane = /** @type {!UI.View} */ (UI.viewManager.view('sources.threads'));
      if (this._sidebarPaneStack) {
        this._sidebarPaneStack.showView(
            this._threadsSidebarPane, this._splitWidget.isVertical() ? this._watchSidebarPane : this._callstackPane);
      }
    }
  }


  /**
   * @param {?SDK.Target} target
   */
  _setTarget(target) {
    if (!target)
      return;
    var debuggerModel = target.model(SDK.DebuggerModel);
    if (!debuggerModel)
      return;

    if (debuggerModel.isPaused()) {
      this._showDebuggerPausedDetails(
          /** @type {!SDK.DebuggerPausedDetails} */ (debuggerModel.debuggerPausedDetails()));
    } else {
      this._paused = false;
      this._clearInterface();
      this._toggleDebuggerSidebarButton.setEnabled(true);
    }
  }

  /**
   * @param {!Common.Event} event
   */
  _onCurrentTargetChanged(event) {
    var target = /** @type {?SDK.Target} */ (event.data);
    this._setTarget(target);
  }
  /**
   * @return {boolean}
   */
  paused() {
    return this._paused;
  }

  /**
   * @override
   */
  wasShown() {
    UI.context.setFlavor(Sources.SourcesPanel, this);
    super.wasShown();
    var wrapper = Sources.SourcesPanel.WrapperView._instance;
    if (wrapper && wrapper.isShowing()) {
      UI.inspectorView.setDrawerMinimized(true);
      Sources.SourcesPanel.updateResizerAndSidebarButtons(this);
    }
    this.editorView.setMainWidget(this._sourcesView);
  }

  /**
   * @override
   */
  willHide() {
    super.willHide();
    UI.context.setFlavor(Sources.SourcesPanel, null);
    if (Sources.SourcesPanel.WrapperView.isShowing()) {
      Sources.SourcesPanel.WrapperView._instance._showViewInWrapper();
      UI.inspectorView.setDrawerMinimized(false);
      Sources.SourcesPanel.updateResizerAndSidebarButtons(this);
    }
  }

  /**
   * @override
   * @param {string} locationName
   * @return {?UI.ViewLocation}
   */
  resolveLocation(locationName) {
    if (locationName === 'sources-sidebar')
      return this._sidebarPaneStack;
    else
      return this._navigatorTabbedLocation;
  }

  /**
   * @return {boolean}
   */
  _ensureSourcesViewVisible() {
    if (Sources.SourcesPanel.WrapperView.isShowing())
      return true;
    if (!UI.inspectorView.canSelectPanel('sources'))
      return false;
    UI.viewManager.showView('sources');
    return true;
  }

  /**
   * @override
   */
  onResize() {
    if (Common.moduleSetting('sidebarPosition').get() === 'auto')
      this.element.window().requestAnimationFrame(this._updateSidebarPosition.bind(this));  // Do not force layout.
  }

  /**
   * @override
   * @return {!UI.SearchableView}
   */
  searchableView() {
    return this._sourcesView.searchableView();
  }

  /**
   * @param {!Common.Event} event
   */
  _debuggerPaused(event) {
    var debuggerModel = /** @type {!SDK.DebuggerModel} */ (event.data);
    var details = debuggerModel.debuggerPausedDetails();
    if (!this._paused)
      this._setAsCurrentPanel();

    if (UI.context.flavor(SDK.Target) === debuggerModel.target())
      this._showDebuggerPausedDetails(/** @type {!SDK.DebuggerPausedDetails} */ (details));
    else if (!this._paused)
      UI.context.setFlavor(SDK.Target, debuggerModel.target());
  }

  /**
   * @param {!SDK.DebuggerPausedDetails} details
   */
  _showDebuggerPausedDetails(details) {
    this._paused = true;
    this._updateDebuggerButtonsAndStatus();
    UI.context.setFlavor(SDK.DebuggerPausedDetails, details);
    this._toggleDebuggerSidebarButton.setEnabled(false);
    this._revealDebuggerSidebar();
    window.focus();
    InspectorFrontendHost.bringToFront();
  }

  /**
   * @param {!SDK.DebuggerModel} debuggerModel
   */
  _debuggerResumed(debuggerModel) {
    var target = debuggerModel.target();
    if (UI.context.flavor(SDK.Target) !== target)
      return;
    this._paused = false;
    this._clearInterface();
    this._toggleDebuggerSidebarButton.setEnabled(true);
    this._switchToPausedTargetTimeout = setTimeout(this._switchToPausedTarget.bind(this, debuggerModel), 500);
  }

  /**
   * @param {!Common.Event} event
   */
  _debuggerWasEnabled(event) {
    var debuggerModel = /** @type {!SDK.DebuggerModel} */ (event.data);
    if (UI.context.flavor(SDK.Target) !== debuggerModel.target())
      return;

    this._updateDebuggerButtonsAndStatus();
  }

  /**
   * @return {?UI.Widget}
   */
  get visibleView() {
    return this._sourcesView.visibleView();
  }

  /**
   * @param {!Workspace.UISourceCode} uiSourceCode
   * @param {number=} lineNumber 0-based
   * @param {number=} columnNumber
   * @param {boolean=} omitFocus
   */
  showUISourceCode(uiSourceCode, lineNumber, columnNumber, omitFocus) {
    if (omitFocus) {
      var wrapperShowing =
          Sources.SourcesPanel.WrapperView._instance && Sources.SourcesPanel.WrapperView._instance.isShowing();
      if (!this.isShowing() && !wrapperShowing)
        return;
    } else {
      this._showEditor();
    }
    this._sourcesView.showSourceLocation(uiSourceCode, lineNumber, columnNumber, omitFocus);
  }

  _showEditor() {
    if (Sources.SourcesPanel.WrapperView._instance && Sources.SourcesPanel.WrapperView._instance.isShowing())
      return;
    this._setAsCurrentPanel();
  }

  /**
   * @param {!Workspace.UILocation} uiLocation
   * @param {boolean=} omitFocus
   */
  showUILocation(uiLocation, omitFocus) {
    this.showUISourceCode(uiLocation.uiSourceCode, uiLocation.lineNumber, uiLocation.columnNumber, omitFocus);
  }

  /**
   * @param {!Workspace.UISourceCode} uiSourceCode
   * @param {boolean=} skipReveal
   */
  _revealInNavigator(uiSourceCode, skipReveal) {
    var extensions = self.runtime.extensions(Sources.NavigatorView);
    Promise.all(extensions.map(extension => extension.instance())).then(filterNavigators.bind(this));

    /**
     * @this {Sources.SourcesPanel}
     * @param {!Array.<!Object>} objects
     */
    function filterNavigators(objects) {
      for (var i = 0; i < objects.length; ++i) {
        var navigatorView = /** @type {!Sources.NavigatorView} */ (objects[i]);
        var viewId = extensions[i].descriptor()['viewId'];
        if (navigatorView.acceptProject(uiSourceCode.project())) {
          navigatorView.revealUISourceCode(uiSourceCode, true);
          if (skipReveal)
            this._navigatorTabbedLocation.tabbedPane().selectTab(viewId);
          else
            UI.viewManager.showView(viewId);
        }
      }
    }
  }

  /**
   * @param {!UI.ContextMenu} contextMenu
   */
  _populateNavigatorMenu(contextMenu) {
    var groupByFolderSetting = Common.moduleSetting('navigatorGroupByFolder');
    contextMenu.appendItemsAtLocation('navigatorMenu');
    contextMenu.appendSeparator();
    contextMenu.appendCheckboxItem(
        Common.UIString('Group by folder'), () => groupByFolderSetting.set(!groupByFolderSetting.get()),
        groupByFolderSetting.get());
  }

  /**
   * @param {boolean} ignoreExecutionLineEvents
   */
  setIgnoreExecutionLineEvents(ignoreExecutionLineEvents) {
    this._ignoreExecutionLineEvents = ignoreExecutionLineEvents;
  }

  updateLastModificationTime() {
    this._lastModificationTime = window.performance.now();
  }

  /**
   * @param {!Bindings.LiveLocation} liveLocation
   */
  _executionLineChanged(liveLocation) {
    var uiLocation = liveLocation.uiLocation();
    if (!uiLocation)
      return;
    this._sourcesView.clearCurrentExecutionLine();
    this._sourcesView.setExecutionLocation(uiLocation);
    if (window.performance.now() - this._lastModificationTime < Sources.SourcesPanel._lastModificationTimeout)
      return;
    this._sourcesView.showSourceLocation(
        uiLocation.uiSourceCode, uiLocation.lineNumber, uiLocation.columnNumber, undefined, true);
  }

  _lastModificationTimeoutPassedForTest() {
    Sources.SourcesPanel._lastModificationTimeout = Number.MIN_VALUE;
  }

  _updateLastModificationTimeForTest() {
    Sources.SourcesPanel._lastModificationTimeout = Number.MAX_VALUE;
  }

  _callFrameChanged() {
    var callFrame = UI.context.flavor(SDK.DebuggerModel.CallFrame);
    if (!callFrame)
      return;
    if (this._executionLineLocation)
      this._executionLineLocation.dispose();
    this._executionLineLocation = Bindings.debuggerWorkspaceBinding.createCallFrameLiveLocation(
        callFrame.location(), this._executionLineChanged.bind(this), this._liveLocationPool);
  }

  _pauseOnExceptionEnabledChanged() {
    var enabled = Common.moduleSetting('pauseOnExceptionEnabled').get();
    this._pauseOnExceptionButton.setToggled(enabled);
    this._pauseOnExceptionButton.setTitle(
        Common.UIString(enabled ? 'Don\'t pause on exceptions' : 'Pause on exceptions'));
    this._debugToolbarDrawer.classList.toggle('expanded', enabled);
  }

  _updateDebuggerButtonsAndStatus() {
    var currentTarget = UI.context.flavor(SDK.Target);
    var currentDebuggerModel = currentTarget ? currentTarget.model(SDK.DebuggerModel) : null;
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

    var details = currentDebuggerModel ? currentDebuggerModel.debuggerPausedDetails() : null;
    this._debuggerPausedMessage.render(details, Bindings.debuggerWorkspaceBinding, Bindings.breakpointManager);
  }

  _clearInterface() {
    this._sourcesView.clearCurrentExecutionLine();
    this._updateDebuggerButtonsAndStatus();
    UI.context.setFlavor(SDK.DebuggerPausedDetails, null);

    if (this._switchToPausedTargetTimeout)
      clearTimeout(this._switchToPausedTargetTimeout);
    this._liveLocationPool.disposeAll();
  }

  /**
   * @param {!SDK.DebuggerModel} debuggerModel
   */
  _switchToPausedTarget(debuggerModel) {
    delete this._switchToPausedTargetTimeout;
    if (this._paused)
      return;
    if (debuggerModel.isPaused())
      return;
    var debuggerModels = SDK.targetManager.models(SDK.DebuggerModel);
    for (var i = 0; i < debuggerModels.length; ++i) {
      if (debuggerModels[i].isPaused()) {
        UI.context.setFlavor(SDK.Target, debuggerModels[i].target());
        break;
      }
    }
  }

  _togglePauseOnExceptions() {
    Common.moduleSetting('pauseOnExceptionEnabled').set(!this._pauseOnExceptionButton.toggled());
  }

  /**
   * @return {boolean}
   */
  _runSnippet() {
    var uiSourceCode = this._sourcesView.currentUISourceCode();
    if (!uiSourceCode)
      return false;

    var currentExecutionContext = UI.context.flavor(SDK.ExecutionContext);
    if (!currentExecutionContext)
      return false;

    if (uiSourceCode.project().type() !== Workspace.projectTypes.Snippets)
      return false;

    Snippets.scriptSnippetModel.evaluateScriptSnippet(currentExecutionContext, uiSourceCode);
    return true;
  }

  /**
   * @param {!Common.Event} event
   */
  _editorSelected(event) {
    var uiSourceCode = /** @type {!Workspace.UISourceCode} */ (event.data);
    if (this.editorView.mainWidget() && Common.moduleSetting('autoRevealInNavigator').get())
      this._revealInNavigator(uiSourceCode, true);
  }

  /**
   * @return {boolean}
   */
  _togglePause() {
    var target = UI.context.flavor(SDK.Target);
    if (!target)
      return true;
    var debuggerModel = target.model(SDK.DebuggerModel);
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
  }

  /**
   * @return {?SDK.DebuggerModel}
   */
  _prepareToResume() {
    if (!this._paused)
      return null;

    this._paused = false;

    this._clearInterface();
    var target = UI.context.flavor(SDK.Target);
    return target ? target.model(SDK.DebuggerModel) : null;
  }

  /**
   * @param {!Common.Event} event
   */
  _longResume(event) {
    var debuggerModel = this._prepareToResume();
    if (!debuggerModel)
      return;

    debuggerModel.skipAllPausesUntilReloadOrTimeout(500);
    debuggerModel.resume();
  }

  /**
   * @return {boolean}
   */
  _stepOver() {
    var debuggerModel = this._prepareToResume();
    if (!debuggerModel)
      return true;

    debuggerModel.stepOver();
    return true;
  }

  /**
   * @return {boolean}
   */
  _stepInto() {
    var debuggerModel = this._prepareToResume();
    if (!debuggerModel)
      return true;

    debuggerModel.stepInto();
    return true;
  }

  /**
   * @return {boolean}
   */
  _stepOut() {
    var debuggerModel = this._prepareToResume();
    if (!debuggerModel)
      return true;

    debuggerModel.stepOut();
    return true;
  }

  /**
   * @param {!Workspace.UILocation} uiLocation
   */
  _continueToLocation(uiLocation) {
    var executionContext = UI.context.flavor(SDK.ExecutionContext);
    if (!executionContext)
      return;
    // Always use 0 column.
    var rawLocation =
        Bindings.debuggerWorkspaceBinding.uiLocationToRawLocation(uiLocation.uiSourceCode, uiLocation.lineNumber, 0);
    if (!rawLocation || rawLocation.debuggerModel !== executionContext.debuggerModel)
      return;
    if (!this._prepareToResume())
      return;

    rawLocation.continueToLocation();
  }

  _toggleBreakpointsActive() {
    Bindings.breakpointManager.setBreakpointsActive(!Bindings.breakpointManager.breakpointsActive());
  }

  _breakpointsActiveStateChanged(event) {
    var active = event.data;
    this._toggleBreakpointsActiveAction.setToggled(!active);
    this._sourcesView.toggleBreakpointsActiveState(active);
  }

  /**
   * @return {!UI.Toolbar}
   */
  _createDebugToolbar() {
    var debugToolbar = new UI.Toolbar('scripts-debug-toolbar');

    var longResumeButton =
        new UI.ToolbarButton(Common.UIString('Resume with all pauses blocked for 500 ms'), 'largeicon-play');
    longResumeButton.addEventListener(UI.ToolbarButton.Events.Click, this._longResume, this);
    debugToolbar.appendToolbarItem(UI.Toolbar.createActionButton(this._togglePauseAction, [longResumeButton], []));

    debugToolbar.appendToolbarItem(UI.Toolbar.createActionButton(this._stepOverAction));
    debugToolbar.appendToolbarItem(UI.Toolbar.createActionButton(this._stepIntoAction));
    debugToolbar.appendToolbarItem(UI.Toolbar.createActionButton(this._stepOutAction));
    debugToolbar.appendSeparator();
    debugToolbar.appendToolbarItem(UI.Toolbar.createActionButton(this._toggleBreakpointsActiveAction));

    this._pauseOnExceptionButton = new UI.ToolbarToggle('', 'largeicon-pause-on-exceptions');
    this._pauseOnExceptionButton.addEventListener(UI.ToolbarButton.Events.Click, this._togglePauseOnExceptions, this);
    debugToolbar.appendToolbarItem(this._pauseOnExceptionButton);

    return debugToolbar;
  }

  _createDebugToolbarDrawer() {
    var debugToolbarDrawer = createElementWithClass('div', 'scripts-debug-toolbar-drawer');

    var label = Common.UIString('Pause on caught exceptions');
    var setting = Common.moduleSetting('pauseOnCaughtException');
    debugToolbarDrawer.appendChild(UI.SettingsUI.createSettingCheckbox(label, setting, true));

    return debugToolbarDrawer;
  }

  /**
   * @param {!Workspace.UISourceCode} uiSourceCode
   */
  _showLocalHistory(uiSourceCode) {
    Sources.RevisionHistoryView.showHistory(uiSourceCode);
  }

  /**
   * @override
   * @param {!Event} event
   * @param {!UI.ContextMenu} contextMenu
   * @param {!Object} target
   */
  appendApplicableItems(event, contextMenu, target) {
    this._appendUISourceCodeItems(event, contextMenu, target);
    this._appendUISourceCodeFrameItems(event, contextMenu, target);
    this.appendUILocationItems(contextMenu, target);
    this._appendRemoteObjectItems(contextMenu, target);
    this._appendNetworkRequestItems(contextMenu, target);
  }

  /**
   * @param {!Workspace.UISourceCode} uiSourceCode
   */
  mapFileSystemToNetwork(uiSourceCode) {
    Sources.SelectUISourceCodeForProjectTypesDialog.show(
        uiSourceCode.name(), [Workspace.projectTypes.Network, Workspace.projectTypes.ContentScripts],
        mapFileSystemToNetwork);

    /**
     * @param {?Workspace.UISourceCode} networkUISourceCode
     */
    function mapFileSystemToNetwork(networkUISourceCode) {
      if (!networkUISourceCode)
        return;
      var fileSystemPath = Persistence.FileSystemWorkspaceBinding.fileSystemPath(uiSourceCode.project().id());
      Persistence.fileSystemMapping.addMappingForResource(
          networkUISourceCode.url(), fileSystemPath, uiSourceCode.url());
    }
  }

  /**
   * @param {!Workspace.UISourceCode} networkUISourceCode
   */
  mapNetworkToFileSystem(networkUISourceCode) {
    Sources.SelectUISourceCodeForProjectTypesDialog.show(
        networkUISourceCode.name(), [Workspace.projectTypes.FileSystem], mapNetworkToFileSystem);

    /**
     * @param {?Workspace.UISourceCode} uiSourceCode
     */
    function mapNetworkToFileSystem(uiSourceCode) {
      if (!uiSourceCode)
        return;
      var fileSystemPath = Persistence.FileSystemWorkspaceBinding.fileSystemPath(uiSourceCode.project().id());
      Persistence.fileSystemMapping.addMappingForResource(
          networkUISourceCode.url(), fileSystemPath, uiSourceCode.url());
    }
  }

  /**
   * @param {!Workspace.UISourceCode} uiSourceCode
   */
  _removeNetworkMapping(uiSourceCode) {
    Persistence.fileSystemMapping.removeMappingForURL(uiSourceCode.url());
  }

  /**
   * @param {!UI.ContextMenu} contextMenu
   * @param {!Workspace.UISourceCode} uiSourceCode
   */
  _appendUISourceCodeMappingItems(contextMenu, uiSourceCode) {
    Sources.NavigatorView.appendAddFolderItem(contextMenu);

    if (Runtime.experiments.isEnabled('persistence2'))
      return;
    if (uiSourceCode.project().type() === Workspace.projectTypes.FileSystem) {
      var binding = Persistence.persistence.binding(uiSourceCode);
      if (!binding) {
        contextMenu.appendItem(
            Common.UIString('Map to network resource\u2026'), this.mapFileSystemToNetwork.bind(this, uiSourceCode));
      } else {
        contextMenu.appendItem(
            Common.UIString('Remove network mapping'), this._removeNetworkMapping.bind(this, binding.network));
      }
    }

    /**
     * @param {!Workspace.Project} project
     */
    function filterProject(project) {
      return project.type() === Workspace.projectTypes.FileSystem;
    }

    if (uiSourceCode.project().type() === Workspace.projectTypes.Network ||
        uiSourceCode.project().type() === Workspace.projectTypes.ContentScripts) {
      if (!this._workspace.projects().filter(filterProject).length)
        return;
      if (this._workspace.uiSourceCodeForURL(uiSourceCode.url()) === uiSourceCode) {
        contextMenu.appendItem(
            Common.UIString('Map to file system resource\u2026'), this.mapNetworkToFileSystem.bind(this, uiSourceCode));
      }
    }
  }

  /**
   * @param {!Event} event
   * @param {!UI.ContextMenu} contextMenu
   * @param {!Object} target
   */
  _appendUISourceCodeItems(event, contextMenu, target) {
    if (!(target instanceof Workspace.UISourceCode))
      return;

    var uiSourceCode = /** @type {!Workspace.UISourceCode} */ (target);
    if (!uiSourceCode.project().isServiceProject() &&
        !event.target.isSelfOrDescendant(this._navigatorTabbedLocation.widget().element)) {
      contextMenu.appendItem(
          Common.UIString('Reveal in navigator'), this._handleContextMenuReveal.bind(this, uiSourceCode));
      contextMenu.appendSeparator();
    }
    this._appendUISourceCodeMappingItems(contextMenu, uiSourceCode);
    if (!uiSourceCode.project().canSetFileContent()) {
      contextMenu.appendItem(
          Common.UIString('Local modifications\u2026'), this._showLocalHistory.bind(this, uiSourceCode));
    }
  }

  /**
   * @param {!Event} event
   * @param {!UI.ContextMenu} contextMenu
   * @param {!Object} target
   */
  _appendUISourceCodeFrameItems(event, contextMenu, target) {
    if (!(target instanceof SourceFrame.UISourceCodeFrame))
      return;
    contextMenu.appendAction('debugger.evaluate-selection');
  }

  /**
   * @param {!UI.ContextMenu} contextMenu
   * @param {!Object} object
   */
  appendUILocationItems(contextMenu, object) {
    if (!(object instanceof Workspace.UILocation))
      return;
    var uiLocation = /** @type {!Workspace.UILocation} */ (object);
    var uiSourceCode = uiLocation.uiSourceCode;

    var contentType = uiSourceCode.contentType();
    if (contentType.hasScripts()) {
      var target = UI.context.flavor(SDK.Target);
      var debuggerModel = target ? target.model(SDK.DebuggerModel) : null;
      if (debuggerModel && debuggerModel.isPaused())
        contextMenu.appendItem(Common.UIString('Continue to here'), this._continueToLocation.bind(this, uiLocation));

      this._callstackPane.appendBlackboxURLContextMenuItems(contextMenu, uiSourceCode);
    }
  }

  /**
   * @param {!Workspace.UISourceCode} uiSourceCode
   */
  _handleContextMenuReveal(uiSourceCode) {
    this.editorView.showBoth();
    this._revealInNavigator(uiSourceCode);
  }

  /**
   * @param {!UI.ContextMenu} contextMenu
   * @param {!Object} target
   */
  _appendRemoteObjectItems(contextMenu, target) {
    if (!(target instanceof SDK.RemoteObject))
      return;
    var remoteObject = /** @type {!SDK.RemoteObject} */ (target);
    contextMenu.appendItem(
        Common.UIString('Store as global variable'), this._saveToTempVariable.bind(this, remoteObject));
    if (remoteObject.type === 'function') {
      contextMenu.appendItem(
          Common.UIString('Show function definition'), this._showFunctionDefinition.bind(this, remoteObject));
    }
  }

  /**
   * @param {!UI.ContextMenu} contextMenu
   * @param {!Object} target
   */
  _appendNetworkRequestItems(contextMenu, target) {
    if (!(target instanceof SDK.NetworkRequest))
      return;
    var request = /** @type {!SDK.NetworkRequest} */ (target);
    var uiSourceCode = this._workspace.uiSourceCodeForURL(request.url());
    if (!uiSourceCode)
      return;
    var openText = Common.UIString('Open in Sources panel');
    contextMenu.appendItem(openText, this.showUILocation.bind(this, uiSourceCode.uiLocation(0, 0)));
  }

  /**
   * @param {!SDK.RemoteObject} remoteObject
   */
  async _saveToTempVariable(remoteObject) {
    var currentExecutionContext = UI.context.flavor(SDK.ExecutionContext);
    if (!currentExecutionContext)
      return;

    var result = await currentExecutionContext.globalObject(/* objectGroup */ '', /* generatePreview */ false);
    if (!!result.exceptionDetails || !result.object) {
      failedToSave(result.object || null);
      return;
    }

    var globalObject = result.object;
    var callFunctionResult =
        await globalObject.callFunctionPromise(saveVariable, [SDK.RemoteObject.toCallArgument(remoteObject)]);
    globalObject.release();
    if (callFunctionResult.wasThrown || !callFunctionResult.object || callFunctionResult.object.type !== 'string') {
      failedToSave(callFunctionResult.object || null);
    } else {
      var executionContext = /** @type {!SDK.ExecutionContext} */ (currentExecutionContext);
      var text = /** @type {string} */ (callFunctionResult.object.value);
      var message = ConsoleModel.consoleModel.addCommandMessage(executionContext, text);
      text = SDK.RuntimeModel.wrapObjectLiteralExpressionIfNeeded(text);
      ConsoleModel.consoleModel.evaluateCommandInConsole(
          executionContext, message, text,
          /* useCommandLineAPI */ false, /* awaitPromise */ false);
    }
    if (callFunctionResult.object)
      callFunctionResult.object.release();

    /**
     * @suppressReceiverCheck
     * @this {Window}
     */
    function saveVariable(value) {
      var prefix = 'temp';
      var index = 1;
      while ((prefix + index) in this)
        ++index;
      var name = prefix + index;
      this[name] = value;
      return name;
    }

    /**
     * @param {?SDK.RemoteObject} result
     */
    function failedToSave(result) {
      var message = Common.UIString('Failed to save to temp variable.');
      if (result)
        message += ' ' + result.description;
      Common.console.error(message);
    }
  }

  /**
   * @param {!SDK.RemoteObject} remoteObject
   */
  _showFunctionDefinition(remoteObject) {
    remoteObject.debuggerModel().functionDetailsPromise(remoteObject).then(this._didGetFunctionDetails.bind(this));
  }

  /**
   * @param {?{location: ?SDK.DebuggerModel.Location}} response
   */
  _didGetFunctionDetails(response) {
    if (!response || !response.location)
      return;

    var location = response.location;
    if (!location)
      return;

    var uiLocation = Bindings.debuggerWorkspaceBinding.rawLocationToUILocation(location);
    if (uiLocation)
      this.showUILocation(uiLocation);
  }

  _revealNavigatorSidebar() {
    this._setAsCurrentPanel();
    this.editorView.showBoth(true);
  }

  _revealDebuggerSidebar() {
    this._setAsCurrentPanel();
    this._splitWidget.showBoth(true);
  }

  _updateSidebarPosition() {
    var vertically;
    var position = Common.moduleSetting('sidebarPosition').get();
    if (position === 'right')
      vertically = false;
    else if (position === 'bottom')
      vertically = true;
    else
      vertically = UI.inspectorView.element.offsetWidth < 680;

    if (this.sidebarPaneView && vertically === !this._splitWidget.isVertical())
      return;

    if (this.sidebarPaneView && this.sidebarPaneView.shouldHideOnDetach())
      return;  // We can't reparent extension iframes.

    if (this.sidebarPaneView)
      this.sidebarPaneView.detach();

    this._splitWidget.setVertical(!vertically);
    this._splitWidget.element.classList.toggle('sources-split-view-vertical', vertically);

    Sources.SourcesPanel.updateResizerAndSidebarButtons(this);

    // Create vertical box with stack.
    var vbox = new UI.VBox();
    vbox.element.appendChild(this._debugToolbarDrawer);
    vbox.setMinimumAndPreferredSizes(25, 25, Sources.SourcesPanel.minToolbarWidth, 100);
    this._sidebarPaneStack = UI.viewManager.createStackLocation(this._revealDebuggerSidebar.bind(this));
    this._sidebarPaneStack.widget().element.classList.add('overflow-auto');
    this._sidebarPaneStack.widget().show(vbox.element);
    this._sidebarPaneStack.widget().element.appendChild(this._debuggerPausedMessage.element());
    vbox.element.appendChild(this._debugToolbar.element);

    if (this._threadsSidebarPane)
      this._sidebarPaneStack.showView(this._threadsSidebarPane);

    if (!vertically)
      this._sidebarPaneStack.appendView(this._watchSidebarPane);

    this._sidebarPaneStack.showView(this._callstackPane);
    var jsBreakpoints = /** @type {!UI.View} */ (UI.viewManager.view('sources.jsBreakpoints'));
    var scopeChainView = /** @type {!UI.View} */ (UI.viewManager.view('sources.scopeChain'));

    if (this._tabbedLocationHeader) {
      this._splitWidget.uninstallResizer(this._tabbedLocationHeader);
      this._tabbedLocationHeader = null;
    }

    if (!vertically) {
      // Populate the rest of the stack.
      this._sidebarPaneStack.showView(scopeChainView);
      this._sidebarPaneStack.showView(jsBreakpoints);
      this._extensionSidebarPanesContainer = this._sidebarPaneStack;
      this.sidebarPaneView = vbox;
      this._splitWidget.uninstallResizer(this._debugToolbar.gripElementForResize());
    } else {
      var splitWidget = new UI.SplitWidget(true, true, 'sourcesPanelDebuggerSidebarSplitViewState', 0.5);
      splitWidget.setMainWidget(vbox);

      // Populate the left stack.
      this._sidebarPaneStack.showView(jsBreakpoints);

      var tabbedLocation = UI.viewManager.createTabbedLocation(this._revealDebuggerSidebar.bind(this));
      splitWidget.setSidebarWidget(tabbedLocation.tabbedPane());
      this._tabbedLocationHeader = tabbedLocation.tabbedPane().headerElement();
      this._splitWidget.installResizer(this._tabbedLocationHeader);
      this._splitWidget.installResizer(this._debugToolbar.gripElementForResize());
      tabbedLocation.appendView(scopeChainView);
      tabbedLocation.appendView(this._watchSidebarPane);
      this._extensionSidebarPanesContainer = tabbedLocation;
      this.sidebarPaneView = splitWidget;
    }

    this._sidebarPaneStack.appendApplicableItems('sources-sidebar');
    var extensionSidebarPanes = Extensions.extensionServer.sidebarPanes();
    for (var i = 0; i < extensionSidebarPanes.length; ++i)
      this._addExtensionSidebarPane(extensionSidebarPanes[i]);

    this._splitWidget.setSidebarWidget(this.sidebarPaneView);
  }

  /**
   * @return {!Promise}
   */
  _setAsCurrentPanel() {
    return UI.viewManager.showView('sources');
  }

  /**
   * @param {!Common.Event} event
   */
  _extensionSidebarPaneAdded(event) {
    var pane = /** @type {!Extensions.ExtensionSidebarPane} */ (event.data);
    this._addExtensionSidebarPane(pane);
  }

  /**
   * @param {!Extensions.ExtensionSidebarPane} pane
   */
  _addExtensionSidebarPane(pane) {
    if (pane.panelName() === this.name)
      this._extensionSidebarPanesContainer.appendView(pane);
  }

  /**
   * @return {!Sources.SourcesView}
   */
  sourcesView() {
    return this._sourcesView;
  }

  /**
   * @param {!DataTransfer} dataTransfer
   */
  _handleDrop(dataTransfer) {
    var items = dataTransfer.items;
    if (!items.length)
      return;
    var entry = items[0].webkitGetAsEntry();
    if (!entry.isDirectory)
      return;
    InspectorFrontendHost.upgradeDraggedFileSystemPermissions(entry.filesystem);
  }
};

Sources.SourcesPanel._lastModificationTimeout = 200;

Sources.SourcesPanel.minToolbarWidth = 215;

/**
 * @implements {Common.Revealer}
 * @unrestricted
 */
Sources.SourcesPanel.UILocationRevealer = class {
  /**
   * @override
   * @param {!Object} uiLocation
   * @param {boolean=} omitFocus
   * @return {!Promise}
   */
  reveal(uiLocation, omitFocus) {
    if (!(uiLocation instanceof Workspace.UILocation))
      return Promise.reject(new Error('Internal error: not a ui location'));
    Sources.SourcesPanel.instance().showUILocation(uiLocation, omitFocus);
    return Promise.resolve();
  }
};

/**
 * @implements {Common.Revealer}
 * @unrestricted
 */
Sources.SourcesPanel.DebuggerLocationRevealer = class {
  /**
   * @override
   * @param {!Object} rawLocation
   * @param {boolean=} omitFocus
   * @return {!Promise}
   */
  reveal(rawLocation, omitFocus) {
    if (!(rawLocation instanceof SDK.DebuggerModel.Location))
      return Promise.reject(new Error('Internal error: not a debugger location'));
    var uiLocation = Bindings.debuggerWorkspaceBinding.rawLocationToUILocation(rawLocation);
    if (!uiLocation)
      return Promise.resolve();
    Sources.SourcesPanel.instance().showUILocation(uiLocation, omitFocus);
    return Promise.resolve();
  }
};

/**
 * @implements {Common.Revealer}
 * @unrestricted
 */
Sources.SourcesPanel.UISourceCodeRevealer = class {
  /**
   * @override
   * @param {!Object} uiSourceCode
   * @param {boolean=} omitFocus
   * @return {!Promise}
   */
  reveal(uiSourceCode, omitFocus) {
    if (!(uiSourceCode instanceof Workspace.UISourceCode))
      return Promise.reject(new Error('Internal error: not a ui source code'));
    Sources.SourcesPanel.instance().showUISourceCode(uiSourceCode, undefined, undefined, omitFocus);
    return Promise.resolve();
  }
};

/**
 * @implements {Common.Revealer}
 * @unrestricted
 */
Sources.SourcesPanel.DebuggerPausedDetailsRevealer = class {
  /**
   * @override
   * @param {!Object} object
   * @return {!Promise}
   */
  reveal(object) {
    return Sources.SourcesPanel.instance()._setAsCurrentPanel();
  }
};

/**
 * @implements {UI.ActionDelegate}
 * @unrestricted
 */
Sources.SourcesPanel.RevealingActionDelegate = class {
  /**
   * @override
   * @param {!UI.Context} context
   * @param {string} actionId
   * @return {boolean}
   */
  handleAction(context, actionId) {
    var panel = Sources.SourcesPanel.instance();
    if (!panel._ensureSourcesViewVisible())
      return false;
    switch (actionId) {
      case 'debugger.toggle-pause':
        panel._togglePause();
        return true;
    }
    return false;
  }
};

/**
 * @implements {UI.ActionDelegate}
 * @unrestricted
 */
Sources.SourcesPanel.DebuggingActionDelegate = class {
  /**
   * @override
   * @param {!UI.Context} context
   * @param {string} actionId
   * @return {boolean}
   */
  handleAction(context, actionId) {
    var panel = Sources.SourcesPanel.instance();
    switch (actionId) {
      case 'debugger.step-over':
        panel._stepOver();
        return true;
      case 'debugger.step-into':
        panel._stepInto();
        return true;
      case 'debugger.step-out':
        panel._stepOut();
        return true;
      case 'debugger.run-snippet':
        panel._runSnippet();
        return true;
      case 'debugger.toggle-breakpoints-active':
        panel._toggleBreakpointsActive();
        return true;
      case 'debugger.evaluate-selection':
        var frame = UI.context.flavor(SourceFrame.UISourceCodeFrame);
        if (frame) {
          var text = frame.textEditor.text(frame.textEditor.selection());
          var executionContext = UI.context.flavor(SDK.ExecutionContext);
          if (executionContext) {
            var message = ConsoleModel.consoleModel.addCommandMessage(executionContext, text);
            text = SDK.RuntimeModel.wrapObjectLiteralExpressionIfNeeded(text);
            ConsoleModel.consoleModel.evaluateCommandInConsole(
                executionContext, message, text, /* useCommandLineAPI */ true, /* awaitPromise */ false);
          }
        }
        return true;
    }
    return false;
  }
};


/**
 * @unrestricted
 */
Sources.SourcesPanel.WrapperView = class extends UI.VBox {
  constructor() {
    super();
    this.element.classList.add('sources-view-wrapper');
    Sources.SourcesPanel.WrapperView._instance = this;
    this._view = Sources.SourcesPanel.instance()._sourcesView;
  }

  /**
   * @return {boolean}
   */
  static isShowing() {
    return !!Sources.SourcesPanel.WrapperView._instance && Sources.SourcesPanel.WrapperView._instance.isShowing();
  }

  /**
   * @override
   */
  wasShown() {
    if (!Sources.SourcesPanel.instance().isShowing())
      this._showViewInWrapper();
    else
      UI.inspectorView.setDrawerMinimized(true);
    Sources.SourcesPanel.updateResizerAndSidebarButtons(Sources.SourcesPanel.instance());
  }

  /**
   * @override
   */
  willHide() {
    UI.inspectorView.setDrawerMinimized(false);
    setImmediate(() => Sources.SourcesPanel.updateResizerAndSidebarButtons(Sources.SourcesPanel.instance()));
  }

  _showViewInWrapper() {
    this._view.show(this.element);
  }
};
