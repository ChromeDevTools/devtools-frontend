/*
 * Copyright (C) 2006, 2007, 2008 Apple Inc.  All rights reserved.
 * Copyright (C) 2007 Matt Lilek (pewtermoose@gmail.com).
 * Copyright (C) 2009 Joseph Pecoraro
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

/**
 * @unrestricted
 */
Main.Main = class {
  /**
   * @suppressGlobalPropertiesCheck
   */
  constructor() {
    Main.Main._instanceForTest = this;
    runOnWindowLoad(this._loaded.bind(this));
  }

  /**
   * @param {boolean} hard
   */
  static _reloadPage(hard) {
    SDK.ResourceTreeModel.reloadAllPages(hard);
  }

  /**
   * @param {string} label
   */
  static time(label) {
    if (Host.isUnderTest())
      return;
    console.time(label);
  }

  /**
   * @param {string} label
   */
  static timeEnd(label) {
    if (Host.isUnderTest())
      return;
    console.timeEnd(label);
  }

  _loaded() {
    console.timeStamp('Main._loaded');
    Runtime.setPlatform(Host.platform());
    InspectorFrontendHost.getPreferences(this._gotPreferences.bind(this));
  }

  /**
   * @param {!Object<string, string>} prefs
   */
  _gotPreferences(prefs) {
    console.timeStamp('Main._gotPreferences');
    if (Host.isUnderTest(prefs))
      self.runtime.useTestBase();
    this._createSettings(prefs);
    this._createAppUI();
  }

  /**
   * @param {!Object<string, string>} prefs
   * Note: this function is called from testSettings in Tests.js.
   */
  _createSettings(prefs) {
    this._initializeExperiments(prefs);
    var storagePrefix = '';
    if (Host.isCustomDevtoolsFrontend())
      storagePrefix = '__custom__';
    else if (!Runtime.queryParam('can_dock') && !!Runtime.queryParam('debugFrontend') && !Host.isUnderTest(prefs))
      storagePrefix = '__bundled__';
    var clearLocalStorage = window.localStorage ? window.localStorage.clear.bind(window.localStorage) : undefined;
    var localStorage =
        new Common.SettingsStorage(window.localStorage || {}, undefined, undefined, clearLocalStorage, storagePrefix);
    var globalStorage = new Common.SettingsStorage(
        prefs, InspectorFrontendHost.setPreference, InspectorFrontendHost.removePreference,
        InspectorFrontendHost.clearPreferences, storagePrefix);
    Common.settings = new Common.Settings(globalStorage, localStorage);
    if (!Host.isUnderTest(prefs))
      new Common.VersionController().updateVersion();
  }

  /**
   * @param {!Object<string, string>} prefs
   */
  _initializeExperiments(prefs) {
    // Keep this sorted alphabetically: both keys and values.
    Runtime.experiments.register('accessibilityInspection', 'Accessibility Inspection');
    Runtime.experiments.register('applyCustomStylesheet', 'Allow custom UI themes');
    Runtime.experiments.register('audits2', 'Audits 2.0');
    Runtime.experiments.register('autoAttachToCrossProcessSubframes', 'Auto-attach to cross-process subframes', true);
    Runtime.experiments.register('blackboxJSFramesOnTimeline', 'Blackbox JavaScript frames on Timeline', true);
    Runtime.experiments.register('changesDrawer', 'Changes drawer', true);
    Runtime.experiments.register('colorContrastRatio', 'Color contrast ratio line in color picker', true);
    Runtime.experiments.register('continueToLocationMarkers', 'Continue to location markers', true);
    Runtime.experiments.register('emptySourceMapAutoStepping', 'Empty sourcemap auto-stepping');
    Runtime.experiments.register('inputEventsOnTimelineOverview', 'Input events on Timeline overview', true);
    Runtime.experiments.register('liveSASS', 'Live SASS');
    Runtime.experiments.register('networkGroupingRequests', 'Network request groups support', true);
    Runtime.experiments.register('objectPreviews', 'Object previews', true);
    Runtime.experiments.register('networkInWorkers', 'Network in workers', true);
    Runtime.experiments.register('persistence2', 'Persistence 2.0');
    Runtime.experiments.register('sourceDiff', 'Source diff');
    Runtime.experiments.register('terminalInDrawer', 'Terminal in drawer', true);

    // Timeline
    Runtime.experiments.register('timelineColorByProduct', 'Timeline: color by product', true);
    Runtime.experiments.register('timelineEventInitiators', 'Timeline: event initiators');
    Runtime.experiments.register('timelineFlowEvents', 'Timeline: flow events', true);
    Runtime.experiments.register('timelineInvalidationTracking', 'Timeline: invalidation tracking', true);
    Runtime.experiments.register('timelineKeepHistory', 'Timeline: keep recording history');
    Runtime.experiments.register('timelineMultipleMainViews', 'Timeline: multiple main views');
    Runtime.experiments.register('timelinePaintTimingMarkers', 'Timeline: paint timing markers', true);
    Runtime.experiments.register('timelinePerFrameTrack', 'Timeline: per-frame tracks', true);
    Runtime.experiments.register('timelineShowAllEvents', 'Timeline: show all events', true);
    Runtime.experiments.register('timelineShowAllProcesses', 'Timeline: show all processes', true);
    Runtime.experiments.register('timelineTracingJSProfile', 'Timeline: tracing based JS profiler', true);
    Runtime.experiments.register('timelineV8RuntimeCallStats', 'Timeline: V8 Runtime Call Stats on Timeline', true);

    Runtime.experiments.cleanUpStaleExperiments();

    if (Host.isUnderTest(prefs)) {
      var testPath = JSON.parse(prefs['testPath'] || '""');
      // Enable experiments for testing.
      if (testPath.indexOf('accessibility/') !== -1)
        Runtime.experiments.enableForTest('accessibilityInspection');
      if (testPath.indexOf('audits2/') !== -1)
        Runtime.experiments.enableForTest('audits2');
      if (testPath.indexOf('coverage/') !== -1)
        Runtime.experiments.enableForTest('cssTrackerPanel');
      if (testPath.indexOf('changes/') !== -1)
        Runtime.experiments.enableForTest('changesDrawer');
      if (testPath.indexOf('sass/') !== -1)
        Runtime.experiments.enableForTest('liveSASS');
    }

    Runtime.experiments.setDefaultExperiments([
      'continueToLocationMarkers', 'autoAttachToCrossProcessSubframes', 'objectPreviews', 'audits2',
      'networkGroupingRequests', 'timelineColorByProduct'
    ]);
  }

  /**
   * @suppressGlobalPropertiesCheck
   */
  _createAppUI() {
    Main.Main.time('Main._createAppUI');

    UI.viewManager = new UI.ViewManager();

    // Request filesystems early, we won't create connections until callback is fired. Things will happen in parallel.
    Persistence.isolatedFileSystemManager = new Persistence.IsolatedFileSystemManager();

    var themeSetting = Common.settings.createSetting('uiTheme', 'default');
    UI.initializeUIUtils(document, themeSetting);
    themeSetting.addChangeListener(Components.reload.bind(Components));

    UI.installComponentRootStyles(/** @type {!Element} */ (document.body));

    this._addMainEventListeners(document);

    var canDock = !!Runtime.queryParam('can_dock');
    UI.zoomManager = new UI.ZoomManager(window, InspectorFrontendHost);
    UI.inspectorView = UI.InspectorView.instance();
    UI.ContextMenu.initialize();
    UI.ContextMenu.installHandler(document);
    UI.Tooltip.installHandler(document);
    Components.dockController = new Components.DockController(canDock);
    ConsoleModel.consoleModel = new ConsoleModel.ConsoleModel();
    SDK.multitargetNetworkManager = new SDK.MultitargetNetworkManager();
    NetworkLog.networkLog = new NetworkLog.NetworkLog();
    SDK.domDebuggerManager = new SDK.DOMDebuggerManager();
    SDK.targetManager.addEventListener(
        SDK.TargetManager.Events.SuspendStateChanged, this._onSuspendStateChanged.bind(this));

    UI.shortcutsScreen = new UI.ShortcutsScreen();
    // set order of some sections explicitly
    UI.shortcutsScreen.section(Common.UIString('Elements Panel'));
    UI.shortcutsScreen.section(Common.UIString('Styles Pane'));
    UI.shortcutsScreen.section(Common.UIString('Debugger'));
    UI.shortcutsScreen.section(Common.UIString('Console'));

    Workspace.fileManager = new Workspace.FileManager();
    Workspace.workspace = new Workspace.Workspace();
    Persistence.fileSystemMapping = new Persistence.FileSystemMapping(Persistence.isolatedFileSystemManager);

    Bindings.networkProjectManager = new Bindings.NetworkProjectManager(SDK.targetManager, Workspace.workspace);
    Bindings.resourceMapping = new Bindings.ResourceMapping(SDK.targetManager, Workspace.workspace);
    Bindings.presentationConsoleMessageHelper = new Bindings.PresentationConsoleMessageHelper(Workspace.workspace);
    Bindings.cssWorkspaceBinding = new Bindings.CSSWorkspaceBinding(SDK.targetManager, Workspace.workspace);
    Bindings.debuggerWorkspaceBinding = new Bindings.DebuggerWorkspaceBinding(SDK.targetManager, Workspace.workspace);
    Bindings.breakpointManager =
        new Bindings.BreakpointManager(null, Workspace.workspace, SDK.targetManager, Bindings.debuggerWorkspaceBinding);
    Extensions.extensionServer = new Extensions.ExtensionServer();

    new Persistence.FileSystemWorkspaceBinding(Persistence.isolatedFileSystemManager, Workspace.workspace);
    Persistence.persistence =
        new Persistence.Persistence(Workspace.workspace, Bindings.breakpointManager, Persistence.fileSystemMapping);

    new Main.ExecutionContextSelector(SDK.targetManager, UI.context);
    Bindings.blackboxManager = new Bindings.BlackboxManager(Bindings.debuggerWorkspaceBinding);

    new Main.Main.PauseListener();
    new Main.Main.InspectedNodeRevealer();
    new Main.NetworkPanelIndicator();
    new Main.SourcesPanelIndicator();
    new Main.BackendSettingsSync();

    UI.actionRegistry = new UI.ActionRegistry();
    UI.shortcutRegistry = new UI.ShortcutRegistry(UI.actionRegistry, document);
    UI.ShortcutsScreen.registerShortcuts();
    this._registerForwardedShortcuts();
    this._registerMessageSinkListener();

    self.runtime.extension(Common.AppProvider).instance().then(this._showAppUI.bind(this));
    Main.Main.timeEnd('Main._createAppUI');
  }

  /**
   * @param {!Object} appProvider
   * @suppressGlobalPropertiesCheck
   */
  _showAppUI(appProvider) {
    Main.Main.time('Main._showAppUI');
    var app = /** @type {!Common.AppProvider} */ (appProvider).createApp();
    // It is important to kick controller lifetime after apps are instantiated.
    Components.dockController.initialize();
    app.presentUI(document);

    var toggleSearchNodeAction = UI.actionRegistry.action('elements.toggle-element-search');
    // TODO: we should not access actions from other modules.
    if (toggleSearchNodeAction) {
      InspectorFrontendHost.events.addEventListener(
          InspectorFrontendHostAPI.Events.EnterInspectElementMode,
          toggleSearchNodeAction.execute.bind(toggleSearchNodeAction), this);
    }
    InspectorFrontendHost.events.addEventListener(
        InspectorFrontendHostAPI.Events.RevealSourceLine, this._revealSourceLine, this);

    UI.inspectorView.createToolbars();
    InspectorFrontendHost.loadCompleted();

    InspectorFrontendHost.events.addEventListener(
        InspectorFrontendHostAPI.Events.ReloadInspectedPage, this._reloadInspectedPage, this);

    var extensions = self.runtime.extensions(Common.QueryParamHandler);
    for (var extension of extensions) {
      var value = Runtime.queryParam(extension.descriptor()['name']);
      if (value !== null)
        extension.instance().then(handleQueryParam.bind(null, value));
    }

    /**
     * @param {string} value
     * @param {!Common.QueryParamHandler} handler
     */
    function handleQueryParam(value, handler) {
      handler.handleQueryParam(value);
    }

    // Allow UI cycles to repaint prior to creating connection.
    setTimeout(this._initializeTarget.bind(this), 0);
    Main.Main.timeEnd('Main._showAppUI');
  }

  _initializeTarget() {
    Main.Main.time('Main._initializeTarget');
    SDK.targetManager.connectToMainTarget(webSocketConnectionLost);

    InspectorFrontendHost.readyForTest();
    // Asynchronously run the extensions.
    setTimeout(this._lateInitialization.bind(this), 100);
    Main.Main.timeEnd('Main._initializeTarget');

    function webSocketConnectionLost() {
      if (!Main._disconnectedScreenWithReasonWasShown)
        Main.RemoteDebuggingTerminatedScreen.show('WebSocket disconnected');
    }
  }

  _lateInitialization() {
    console.timeStamp('Main._lateInitialization');
    this._registerShortcuts();
    Extensions.extensionServer.initializeExtensions();
    if (!Host.isUnderTest())
      Help.showReleaseNoteIfNeeded();
  }

  _registerForwardedShortcuts() {
    /** @const */ var forwardedActions =
        ['main.toggle-dock', 'debugger.toggle-breakpoints-active', 'debugger.toggle-pause', 'commandMenu.show'];
    var actionKeys =
        UI.shortcutRegistry.keysForActions(forwardedActions).map(UI.KeyboardShortcut.keyCodeAndModifiersFromKey);
    InspectorFrontendHost.setWhitelistedShortcuts(JSON.stringify(actionKeys));
  }

  _registerMessageSinkListener() {
    Common.console.addEventListener(Common.Console.Events.MessageAdded, messageAdded);

    /**
     * @param {!Common.Event} event
     */
    function messageAdded(event) {
      var message = /** @type {!Common.Console.Message} */ (event.data);
      if (message.show)
        Common.console.show();
    }
  }

  /**
   * @param {!Common.Event} event
   */
  _revealSourceLine(event) {
    var url = /** @type {string} */ (event.data['url']);
    var lineNumber = /** @type {number} */ (event.data['lineNumber']);
    var columnNumber = /** @type {number} */ (event.data['columnNumber']);

    var uiSourceCode = Workspace.workspace.uiSourceCodeForURL(url);
    if (uiSourceCode) {
      Common.Revealer.reveal(uiSourceCode.uiLocation(lineNumber, columnNumber));
      return;
    }

    /**
     * @param {!Common.Event} event
     */
    function listener(event) {
      var uiSourceCode = /** @type {!Workspace.UISourceCode} */ (event.data);
      if (uiSourceCode.url() === url) {
        Common.Revealer.reveal(uiSourceCode.uiLocation(lineNumber, columnNumber));
        Workspace.workspace.removeEventListener(Workspace.Workspace.Events.UISourceCodeAdded, listener);
      }
    }

    Workspace.workspace.addEventListener(Workspace.Workspace.Events.UISourceCodeAdded, listener);
  }

  _registerShortcuts() {
    var shortcut = UI.KeyboardShortcut;
    var section = UI.shortcutsScreen.section(Common.UIString('All Panels'));
    var keys = [
      shortcut.makeDescriptor('[', shortcut.Modifiers.CtrlOrMeta),
      shortcut.makeDescriptor(']', shortcut.Modifiers.CtrlOrMeta)
    ];
    section.addRelatedKeys(keys, Common.UIString('Go to the panel to the left/right'));

    var toggleConsoleLabel = Common.UIString('Show console');
    section.addKey(shortcut.makeDescriptor(shortcut.Keys.Tilde, shortcut.Modifiers.Ctrl), toggleConsoleLabel);
    section.addKey(shortcut.makeDescriptor(shortcut.Keys.Esc), Common.UIString('Toggle drawer'));
    if (Components.dockController.canDock()) {
      section.addKey(
          shortcut.makeDescriptor('M', shortcut.Modifiers.CtrlOrMeta | shortcut.Modifiers.Shift),
          Common.UIString('Toggle device mode'));
      section.addKey(
          shortcut.makeDescriptor('D', shortcut.Modifiers.CtrlOrMeta | shortcut.Modifiers.Shift),
          Common.UIString('Toggle dock side'));
    }
    section.addKey(shortcut.makeDescriptor('f', shortcut.Modifiers.CtrlOrMeta), Common.UIString('Search'));

    var advancedSearchShortcutModifier = Host.isMac() ?
        UI.KeyboardShortcut.Modifiers.Meta | UI.KeyboardShortcut.Modifiers.Alt :
        UI.KeyboardShortcut.Modifiers.Ctrl | UI.KeyboardShortcut.Modifiers.Shift;
    var advancedSearchShortcut = shortcut.makeDescriptor('f', advancedSearchShortcutModifier);
    section.addKey(advancedSearchShortcut, Common.UIString('Search across all sources'));

    var inspectElementModeShortcuts =
        UI.shortcutRegistry.shortcutDescriptorsForAction('elements.toggle-element-search');
    if (inspectElementModeShortcuts.length)
      section.addKey(inspectElementModeShortcuts[0], Common.UIString('Select node to inspect'));

    var openResourceShortcut = UI.KeyboardShortcut.makeDescriptor('p', UI.KeyboardShortcut.Modifiers.CtrlOrMeta);
    section.addKey(openResourceShortcut, Common.UIString('Go to source'));

    if (Host.isMac()) {
      keys = [
        shortcut.makeDescriptor('g', shortcut.Modifiers.Meta),
        shortcut.makeDescriptor('g', shortcut.Modifiers.Meta | shortcut.Modifiers.Shift)
      ];
      section.addRelatedKeys(keys, Common.UIString('Find next/previous'));
    }
  }

  _postDocumentKeyDown(event) {
    if (event.handled)
      return;

    if (!UI.Dialog.hasInstance() && UI.inspectorView.currentPanelDeprecated()) {
      UI.inspectorView.currentPanelDeprecated().handleShortcut(event);
      if (event.handled) {
        event.consume(true);
        return;
      }
    }

    UI.shortcutRegistry.handleShortcut(event);
  }

  /**
   * @param {!Event} event
   */
  _redispatchClipboardEvent(event) {
    var eventCopy = new CustomEvent('clipboard-' + event.type, {bubbles: true});
    eventCopy['original'] = event;
    var document = event.target && event.target.ownerDocument;
    var target = document ? document.deepActiveElement() : null;
    if (target)
      target.dispatchEvent(eventCopy);
    if (eventCopy.handled)
      event.preventDefault();
  }

  _contextMenuEventFired(event) {
    if (event.handled || event.target.classList.contains('popup-glasspane'))
      event.preventDefault();
  }

  /**
   * @param {!Document} document
   */
  _addMainEventListeners(document) {
    document.addEventListener('keydown', this._postDocumentKeyDown.bind(this), false);
    document.addEventListener('beforecopy', this._redispatchClipboardEvent.bind(this), true);
    document.addEventListener('copy', this._redispatchClipboardEvent.bind(this), false);
    document.addEventListener('cut', this._redispatchClipboardEvent.bind(this), false);
    document.addEventListener('paste', this._redispatchClipboardEvent.bind(this), false);
    document.addEventListener('contextmenu', this._contextMenuEventFired.bind(this), true);
  }

  /**
   * @param {!Common.Event} event
   */
  _reloadInspectedPage(event) {
    var hard = /** @type {boolean} */ (event.data);
    Main.Main._reloadPage(hard);
  }

  _onSuspendStateChanged() {
    var suspended = SDK.targetManager.allTargetsSuspended();
    UI.inspectorView.onSuspendStateChanged(suspended);
  }
};

/**
 * @implements {Protocol.InspectorDispatcher}
 */
Main.Main.InspectorModel = class extends SDK.SDKModel {
  /**
   * @param {!SDK.Target} target
   */
  constructor(target) {
    super(target);
    target.registerInspectorDispatcher(this);
    target.inspectorAgent().enable();
  }

  /**
   * @override
   * @param {string} reason
   */
  detached(reason) {
    Main._disconnectedScreenWithReasonWasShown = true;
    Main.RemoteDebuggingTerminatedScreen.show(reason);
  }

  /**
   * @override
   */
  targetCrashed() {
    var debuggerModel = this.target().model(SDK.DebuggerModel);
    if (debuggerModel)
      Main.TargetCrashedScreen.show(debuggerModel);
  }
};

SDK.SDKModel.register(Main.Main.InspectorModel, SDK.Target.Capability.Inspector, true);

/**
 * @implements {UI.ActionDelegate}
 * @unrestricted
 */
Main.Main.ReloadActionDelegate = class {
  /**
   * @override
   * @param {!UI.Context} context
   * @param {string} actionId
   * @return {boolean}
   */
  handleAction(context, actionId) {
    switch (actionId) {
      case 'main.reload':
        Main.Main._reloadPage(false);
        return true;
      case 'main.hard-reload':
        Main.Main._reloadPage(true);
        return true;
      case 'main.debug-reload':
        Components.reload();
        return true;
    }
    return false;
  }
};

/**
 * @implements {UI.ActionDelegate}
 * @unrestricted
 */
Main.Main.ZoomActionDelegate = class {
  /**
   * @override
   * @param {!UI.Context} context
   * @param {string} actionId
   * @return {boolean}
   */
  handleAction(context, actionId) {
    if (InspectorFrontendHost.isHostedMode())
      return false;

    switch (actionId) {
      case 'main.zoom-in':
        InspectorFrontendHost.zoomIn();
        return true;
      case 'main.zoom-out':
        InspectorFrontendHost.zoomOut();
        return true;
      case 'main.zoom-reset':
        InspectorFrontendHost.resetZoom();
        return true;
    }
    return false;
  }
};

/**
 * @implements {UI.ActionDelegate}
 * @unrestricted
 */
Main.Main.SearchActionDelegate = class {
  /**
   * @override
   * @param {!UI.Context} context
   * @param {string} actionId
   * @return {boolean}
   * @suppressGlobalPropertiesCheck
   */
  handleAction(context, actionId) {
    var searchableView = UI.SearchableView.fromElement(document.deepActiveElement()) ||
        UI.inspectorView.currentPanelDeprecated().searchableView();
    if (!searchableView)
      return false;
    switch (actionId) {
      case 'main.search-in-panel.find':
        return searchableView.handleFindShortcut();
      case 'main.search-in-panel.cancel':
        return searchableView.handleCancelSearchShortcut();
      case 'main.search-in-panel.find-next':
        return searchableView.handleFindNextShortcut();
      case 'main.search-in-panel.find-previous':
        return searchableView.handleFindPreviousShortcut();
    }
    return false;
  }
};


/**
 * @implements {UI.ToolbarItem.Provider}
 * @unrestricted
 */
Main.Main.WarningErrorCounter = class {
  constructor() {
    Main.Main.WarningErrorCounter._instanceForTest = this;

    this._counter = createElement('div');
    this._counter.addEventListener('click', Common.console.show.bind(Common.console), false);
    this._toolbarItem = new UI.ToolbarItem(this._counter);
    var shadowRoot = UI.createShadowRootWithCoreStyles(this._counter, 'main/errorWarningCounter.css');

    this._errors = this._createItem(shadowRoot, 'smallicon-error');
    this._warnings = this._createItem(shadowRoot, 'smallicon-warning');
    this._titles = [];

    ConsoleModel.consoleModel.addEventListener(ConsoleModel.ConsoleModel.Events.ConsoleCleared, this._update, this);
    ConsoleModel.consoleModel.addEventListener(ConsoleModel.ConsoleModel.Events.MessageAdded, this._update, this);
    ConsoleModel.consoleModel.addEventListener(ConsoleModel.ConsoleModel.Events.MessageUpdated, this._update, this);
    this._update();
  }

  /**
   * @param {!Node} shadowRoot
   * @param {string} iconType
   * @return {!{item: !Element, text: !Element}}
   */
  _createItem(shadowRoot, iconType) {
    var item = createElementWithClass('span', 'counter-item');
    var icon = item.createChild('label', '', 'dt-icon-label');
    icon.type = iconType;
    var text = icon.createChild('span');
    shadowRoot.appendChild(item);
    return {item: item, text: text};
  }

  /**
   * @param {!{item: !Element, text: !Element}} item
   * @param {number} count
   * @param {boolean} first
   * @param {string} title
   */
  _updateItem(item, count, first, title) {
    item.item.classList.toggle('hidden', !count);
    item.item.classList.toggle('counter-item-first', first);
    item.text.textContent = count;
    if (count)
      this._titles.push(title);
  }

  _update() {
    var errors = ConsoleModel.consoleModel.errors();
    var warnings = ConsoleModel.consoleModel.warnings();

    this._titles = [];
    this._toolbarItem.setVisible(!!(errors || warnings));
    this._updateItem(this._errors, errors, false, Common.UIString(errors === 1 ? '%d error' : '%d errors', errors));
    this._updateItem(
        this._warnings, warnings, !errors, Common.UIString(warnings === 1 ? '%d warning' : '%d warnings', warnings));
    this._counter.title = this._titles.join(', ');
    UI.inspectorView.toolbarItemResized();
  }

  /**
   * @override
   * @return {?UI.ToolbarItem}
   */
  item() {
    return this._toolbarItem;
  }
};

/**
 * @implements {UI.ToolbarItem.Provider}
 */
Main.Main.MainMenuItem = class {
  constructor() {
    this._item = new UI.ToolbarMenuButton(this._handleContextMenu.bind(this), true);
    this._item.setTitle(Common.UIString('Customize and control DevTools'));
  }

  /**
   * @override
   * @return {?UI.ToolbarItem}
   */
  item() {
    return this._item;
  }

  /**
   * @param {!UI.ContextMenu} contextMenu
   */
  _handleContextMenu(contextMenu) {
    if (Components.dockController.canDock()) {
      var dockItemElement = createElementWithClass('div', 'flex-centered flex-auto');
      var titleElement = dockItemElement.createChild('span', 'flex-auto');
      titleElement.textContent = Common.UIString('Dock side');
      var toggleDockSideShorcuts = UI.shortcutRegistry.shortcutDescriptorsForAction('main.toggle-dock');
      titleElement.title = Common.UIString(
          'Placement of DevTools relative to the page. (%s to restore last position)', toggleDockSideShorcuts[0].name);
      dockItemElement.appendChild(titleElement);
      var dockItemToolbar = new UI.Toolbar('', dockItemElement);
      dockItemToolbar.makeBlueOnHover();
      var undock = new UI.ToolbarToggle(Common.UIString('Undock into separate window'), 'largeicon-undock');
      var bottom = new UI.ToolbarToggle(Common.UIString('Dock to bottom'), 'largeicon-dock-to-bottom');
      var right = new UI.ToolbarToggle(Common.UIString('Dock to right'), 'largeicon-dock-to-right');
      var left = new UI.ToolbarToggle(Common.UIString('Dock to left'), 'largeicon-dock-to-left');
      undock.addEventListener(UI.ToolbarButton.Events.MouseDown, event => event.data.consume());
      bottom.addEventListener(UI.ToolbarButton.Events.MouseDown, event => event.data.consume());
      right.addEventListener(UI.ToolbarButton.Events.MouseDown, event => event.data.consume());
      left.addEventListener(UI.ToolbarButton.Events.MouseDown, event => event.data.consume());
      undock.addEventListener(
          UI.ToolbarButton.Events.MouseUp, setDockSide.bind(null, Components.DockController.State.Undocked));
      bottom.addEventListener(
          UI.ToolbarButton.Events.MouseUp, setDockSide.bind(null, Components.DockController.State.DockedToBottom));
      right.addEventListener(
          UI.ToolbarButton.Events.MouseUp, setDockSide.bind(null, Components.DockController.State.DockedToRight));
      left.addEventListener(
          UI.ToolbarButton.Events.MouseUp, setDockSide.bind(null, Components.DockController.State.DockedToLeft));
      undock.setToggled(Components.dockController.dockSide() === Components.DockController.State.Undocked);
      bottom.setToggled(Components.dockController.dockSide() === Components.DockController.State.DockedToBottom);
      right.setToggled(Components.dockController.dockSide() === Components.DockController.State.DockedToRight);
      left.setToggled(Components.dockController.dockSide() === Components.DockController.State.DockedToLeft);
      dockItemToolbar.appendToolbarItem(undock);
      dockItemToolbar.appendToolbarItem(left);
      dockItemToolbar.appendToolbarItem(bottom);
      dockItemToolbar.appendToolbarItem(right);
      contextMenu.appendCustomItem(dockItemElement);
      contextMenu.appendSeparator();
    }

    /**
     * @param {string} side
     */
    function setDockSide(side) {
      Components.dockController.setDockSide(side);
      contextMenu.discard();
    }

    contextMenu.appendAction(
        'main.toggle-drawer', UI.inspectorView.drawerVisible() ? Common.UIString('Hide console drawer') :
                                                                 Common.UIString('Show console drawer'));
    contextMenu.appendItemsAtLocation('mainMenu');
    var moreTools = contextMenu.namedSubMenu('mainMenuMoreTools');
    var extensions = self.runtime.extensions('view', undefined, true);
    for (var extension of extensions) {
      var descriptor = extension.descriptor();
      if (descriptor['persistence'] !== 'closeable')
        continue;
      if (descriptor['location'] !== 'drawer-view' && descriptor['location'] !== 'panel')
        continue;
      moreTools.appendItem(extension.title(), UI.viewManager.showView.bind(UI.viewManager, descriptor['id']));
    }

    var helpSubMenu = contextMenu.namedSubMenu('mainMenuHelp');
    helpSubMenu.appendAction('settings.documentation');
    helpSubMenu.appendItem('Release Notes', () => InspectorFrontendHost.openInNewTab(Help.latestReleaseNote().link));
  }
};

/**
 * @implements {UI.ToolbarItem.Provider}
 */
Main.Main.NodeIndicator = class {
  constructor() {
    var element = createElement('div');
    var shadowRoot = UI.createShadowRootWithCoreStyles(element, 'main/nodeIcon.css');
    this._element = shadowRoot.createChild('div', 'node-icon');
    element.addEventListener('click', () => InspectorFrontendHost.openNodeFrontend(), false);
    this._button = new UI.ToolbarItem(element);
    this._button.setTitle(Common.UIString('Open dedicated DevTools for Node.js'));
    SDK.targetManager.addEventListener(SDK.TargetManager.Events.AvailableNodeTargetsChanged, this._update, this);
    this._button.setVisible(false);
    this._update();
  }

  _update() {
    this._element.classList.toggle('inactive', !SDK.targetManager.availableNodeTargetsCount());
    if (SDK.targetManager.availableNodeTargetsCount())
      this._button.setVisible(true);
  }

  /**
   * @override
   * @return {?UI.ToolbarItem}
   */
  item() {
    return this._button;
  }
};

Main.NetworkPanelIndicator = class {
  constructor() {
    // TODO: we should not access network from other modules.
    if (!UI.inspectorView.hasPanel('network'))
      return;
    var manager = SDK.multitargetNetworkManager;
    manager.addEventListener(SDK.MultitargetNetworkManager.Events.ConditionsChanged, updateVisibility);
    manager.addEventListener(SDK.MultitargetNetworkManager.Events.BlockedPatternsChanged, updateVisibility);
    updateVisibility();

    function updateVisibility() {
      var icon = null;
      if (manager.isThrottling()) {
        icon = UI.Icon.create('smallicon-warning');
        icon.title = Common.UIString('Network throttling is enabled');
      } else if (manager.isBlocking()) {
        icon = UI.Icon.create('smallicon-warning');
        icon.title = Common.UIString('Requests may be blocked');
      }
      UI.inspectorView.setPanelIcon('network', icon);
    }
  }
};

/**
 * @unrestricted
 */
Main.SourcesPanelIndicator = class {
  constructor() {
    Common.moduleSetting('javaScriptDisabled').addChangeListener(javaScriptDisabledChanged);
    javaScriptDisabledChanged();

    function javaScriptDisabledChanged() {
      var icon = null;
      var javaScriptDisabled = Common.moduleSetting('javaScriptDisabled').get();
      if (javaScriptDisabled) {
        icon = UI.Icon.create('smallicon-warning');
        icon.title = Common.UIString('JavaScript is disabled');
      }
      UI.inspectorView.setPanelIcon('sources', icon);
    }
  }
};

/**
 * @unrestricted
 */
Main.Main.PauseListener = class {
  constructor() {
    SDK.targetManager.addModelListener(
        SDK.DebuggerModel, SDK.DebuggerModel.Events.DebuggerPaused, this._debuggerPaused, this);
  }

  /**
   * @param {!Common.Event} event
   */
  _debuggerPaused(event) {
    SDK.targetManager.removeModelListener(
        SDK.DebuggerModel, SDK.DebuggerModel.Events.DebuggerPaused, this._debuggerPaused, this);
    var debuggerModel = /** @type {!SDK.DebuggerModel} */ (event.data);
    var debuggerPausedDetails = debuggerModel.debuggerPausedDetails();
    UI.context.setFlavor(SDK.Target, debuggerModel.target());
    Common.Revealer.reveal(debuggerPausedDetails);
  }
};

/**
 * @unrestricted
 */
Main.Main.InspectedNodeRevealer = class {
  constructor() {
    SDK.targetManager.addModelListener(
        SDK.OverlayModel, SDK.OverlayModel.Events.InspectNodeRequested, this._inspectNode, this);
  }

  /**
   * @param {!Common.Event} event
   */
  _inspectNode(event) {
    var deferredNode = /** @type {!SDK.DeferredDOMNode} */ (event.data);
    Common.Revealer.reveal(deferredNode);
  }
};

/**
 * @param {string} method
 * @param {?Object} params
 * @return {!Promise}
 */
Main.sendOverProtocol = function(method, params) {
  return new Promise((resolve, reject) => {
    Protocol.InspectorBackend.sendRawMessageForTesting(method, params, (err, ...results) => {
      if (err)
        return reject(err);
      return resolve(results);
    });
  });
};

/**
 * @unrestricted
 */
Main.RemoteDebuggingTerminatedScreen = class extends UI.VBox {
  /**
   * @param {string} reason
   */
  constructor(reason) {
    super(true);
    this.registerRequiredCSS('main/remoteDebuggingTerminatedScreen.css');
    var message = this.contentElement.createChild('div', 'message');
    message.createChild('span').textContent = Common.UIString('Debugging connection was closed. Reason: ');
    message.createChild('span', 'reason').textContent = reason;
    this.contentElement.createChild('div', 'message').textContent =
        Common.UIString('Reconnect when ready by reopening DevTools.');
    var button = UI.createTextButton(Common.UIString('Reconnect DevTools'), () => window.location.reload());
    this.contentElement.createChild('div', 'button').appendChild(button);
  }

  /**
   * @param {string} reason
   */
  static show(reason) {
    var dialog = new UI.Dialog();
    dialog.setSizeBehavior(UI.GlassPane.SizeBehavior.MeasureContent);
    dialog.addCloseButton();
    dialog.setDimmed(true);
    new Main.RemoteDebuggingTerminatedScreen(reason).show(dialog.contentElement);
    dialog.show();
  }
};


/**
 * @unrestricted
 */
Main.TargetCrashedScreen = class extends UI.VBox {
  /**
   * @param {function()} hideCallback
   */
  constructor(hideCallback) {
    super(true);
    this.registerRequiredCSS('main/targetCrashedScreen.css');
    this.contentElement.createChild('div', 'message').textContent =
        Common.UIString('DevTools was disconnected from the page.');
    this.contentElement.createChild('div', 'message').textContent =
        Common.UIString('Once page is reloaded, DevTools will automatically reconnect.');
    this._hideCallback = hideCallback;
  }

  /**
   * @param {!SDK.DebuggerModel} debuggerModel
   */
  static show(debuggerModel) {
    var dialog = new UI.Dialog();
    dialog.setSizeBehavior(UI.GlassPane.SizeBehavior.MeasureContent);
    dialog.addCloseButton();
    dialog.setDimmed(true);
    var hideBound = dialog.hide.bind(dialog);
    debuggerModel.addEventListener(SDK.DebuggerModel.Events.GlobalObjectCleared, hideBound);

    new Main.TargetCrashedScreen(onHide).show(dialog.contentElement);
    dialog.show();

    function onHide() {
      debuggerModel.removeEventListener(SDK.DebuggerModel.Events.GlobalObjectCleared, hideBound);
    }
  }

  /**
   * @override
   */
  willHide() {
    this._hideCallback.call(null);
  }
};


/**
 * @implements {SDK.TargetManager.Observer}
 * @unrestricted
 */
Main.BackendSettingsSync = class {
  constructor() {
    this._autoAttachSetting = Common.settings.moduleSetting('autoAttachToCreatedPages');
    this._autoAttachSetting.addChangeListener(this._update, this);
    SDK.targetManager.observeTargets(this, SDK.Target.Capability.Browser);
  }

  /**
   * @param {!SDK.Target} target
   */
  _updateTarget(target) {
    target.pageAgent().setAutoAttachToCreatedPages(this._autoAttachSetting.get());
  }

  _update() {
    SDK.targetManager.targets(SDK.Target.Capability.Browser).forEach(this._updateTarget, this);
  }

  /**
   * @param {!SDK.Target} target
   * @override
   */
  targetAdded(target) {
    this._updateTarget(target);
  }

  /**
   * @param {!SDK.Target} target
   * @override
   */
  targetRemoved(target) {
  }
};

/**
 * @implements {UI.SettingUI}
 * @unrestricted
 */
Main.ShowMetricsRulersSettingUI = class {
  /**
   * @override
   * @return {?Element}
   */
  settingElement() {
    return UI.SettingsUI.createSettingCheckbox(
        Common.UIString('Show rulers'), Common.moduleSetting('showMetricsRulers'));
  }
};

new Main.Main();
