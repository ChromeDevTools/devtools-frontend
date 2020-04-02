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

import * as Bindings from '../bindings/bindings.js';
import * as Common from '../common/common.js';
import * as Components from '../components/components.js';
import * as Extensions from '../extensions/extensions.js';
import * as Host from '../host/host.js';
import * as Persistence from '../persistence/persistence.js';
import * as Platform from '../platform/platform.js';
import * as ProtocolClient from '../protocol_client/protocol_client.js';
import * as SDK from '../sdk/sdk.js';
import * as UI from '../ui/ui.js';
import * as Workspace from '../workspace/workspace.js';

import {ExecutionContextSelector} from './ExecutionContextSelector.js';

/**
 * @unrestricted
 */
export class MainImpl {
  /**
   * @suppressGlobalPropertiesCheck
   */
  constructor() {
    MainImpl._instanceForTest = this;
    runOnWindowLoad(this._loaded.bind(this));
  }

  /**
   * @param {string} label
   */
  static time(label) {
    if (Host.InspectorFrontendHost.isUnderTest()) {
      return;
    }
    console.time(label);
  }

  /**
   * @param {string} label
   */
  static timeEnd(label) {
    if (Host.InspectorFrontendHost.isUnderTest()) {
      return;
    }
    console.timeEnd(label);
  }

  async _loaded() {
    console.timeStamp('Main._loaded');
    await Runtime.appStarted;
    Root.Runtime.setPlatform(Host.Platform.platform());
    Root.Runtime.setL10nCallback(ls);
    Host.InspectorFrontendHost.InspectorFrontendHostInstance.getPreferences(this._gotPreferences.bind(this));
  }

  /**
   * @param {!Object<string, string>} prefs
   */
  _gotPreferences(prefs) {
    console.timeStamp('Main._gotPreferences');
    if (Host.InspectorFrontendHost.isUnderTest(prefs)) {
      self.runtime.useTestBase();
    }
    this._createSettings(prefs);
    this._createAppUI();
  }

  /**
   * @param {!Object<string, string>} prefs
   * Note: this function is called from testSettings in Tests.js.
   */
  _createSettings(prefs) {
    this._initializeExperiments();
    let storagePrefix = '';
    if (Host.Platform.isCustomDevtoolsFrontend()) {
      storagePrefix = '__custom__';
    } else if (
        !Root.Runtime.queryParam('can_dock') && !!Root.Runtime.queryParam('debugFrontend') &&
        !Host.InspectorFrontendHost.isUnderTest()) {
      storagePrefix = '__bundled__';
    }

    let localStorage;
    if (!Host.InspectorFrontendHost.isUnderTest() && window.localStorage) {
      localStorage = new Common.Settings.SettingsStorage(
          window.localStorage, undefined, undefined, () => window.localStorage.clear(), storagePrefix);
    } else {
      localStorage = new Common.Settings.SettingsStorage({}, undefined, undefined, undefined, storagePrefix);
    }
    const globalStorage = new Common.Settings.SettingsStorage(
        prefs, Host.InspectorFrontendHost.InspectorFrontendHostInstance.setPreference,
        Host.InspectorFrontendHost.InspectorFrontendHostInstance.removePreference,
        Host.InspectorFrontendHost.InspectorFrontendHostInstance.clearPreferences, storagePrefix);
    Common.Settings.Settings.instance({forceNew: true, globalStorage, localStorage});

    self.Common.settings = Common.Settings.Settings.instance();

    if (!Host.InspectorFrontendHost.isUnderTest()) {
      new Common.Settings.VersionController().updateVersion();
    }
  }

  _initializeExperiments() {
    // Keep this sorted alphabetically: both keys and values.
    Root.Runtime.experiments.register('applyCustomStylesheet', 'Allow custom UI themes');
    Root.Runtime.experiments.register('captureNodeCreationStacks', 'Capture node creation stacks');
    Root.Runtime.experiments.register('sourcesPrettyPrint', 'Automatically pretty print in the Sources Panel');
    Root.Runtime.experiments.register('backgroundServices', 'Background web platform feature events', true);
    Root.Runtime.experiments.register(
        'backgroundServicesNotifications', 'Background services section for Notifications');
    Root.Runtime.experiments.register(
        'backgroundServicesPaymentHandler', 'Background services section for Payment Handler');
    Root.Runtime.experiments.register(
        'backgroundServicesPushMessaging', 'Background services section for Push Messaging');
    Root.Runtime.experiments.register('blackboxJSFramesOnTimeline', 'Blackbox JavaScript frames on Timeline', true);
    Root.Runtime.experiments.register('cssOverview', 'CSS Overview');
    Root.Runtime.experiments.register('emptySourceMapAutoStepping', 'Empty sourcemap auto-stepping');
    Root.Runtime.experiments.register('inputEventsOnTimelineOverview', 'Input events on Timeline overview', true);
    Root.Runtime.experiments.register('liveHeapProfile', 'Live heap profile', true);
    Root.Runtime.experiments.register('mediaInspector', 'Media Element Inspection');
    Root.Runtime.experiments.register('nativeHeapProfiler', 'Native memory sampling heap profiler', true);
    Root.Runtime.experiments.register('protocolMonitor', 'Protocol Monitor');
    Root.Runtime.experiments.register('issuesPane', 'Issues Pane');
    Root.Runtime.experiments.register(
        'recordCoverageWithPerformanceTracing', 'Record coverage while performance tracing');
    Root.Runtime.experiments.register('samplingHeapProfilerTimeline', 'Sampling heap profiler timeline', true);
    Root.Runtime.experiments.register(
        'showOptionToNotTreatGlobalObjectsAsRoots',
        'Show option to take heap snapshot where globals are not treated as root');
    Root.Runtime.experiments.register('sourceDiff', 'Source diff');
    Root.Runtime.experiments.register('spotlight', 'Spotlight', true);
    Root.Runtime.experiments.register(
        'customKeyboardShortcuts', 'Enable custom keyboard shortcuts settings tab (requires reload)');

    // Timeline
    Root.Runtime.experiments.register('timelineEventInitiators', 'Timeline: event initiators');
    Root.Runtime.experiments.register('timelineFlowEvents', 'Timeline: flow events', true);
    Root.Runtime.experiments.register('timelineInvalidationTracking', 'Timeline: invalidation tracking', true);
    Root.Runtime.experiments.register('timelineShowAllEvents', 'Timeline: show all events', true);
    Root.Runtime.experiments.register(
        'timelineV8RuntimeCallStats', 'Timeline: V8 Runtime Call Stats on Timeline', true);
    Root.Runtime.experiments.register('timelineWebGL', 'Timeline: WebGL-based flamechart');
    Root.Runtime.experiments.register('timelineReplayEvent', 'Timeline: Replay input events', true);
    Root.Runtime.experiments.register('wasmDWARFDebugging', 'WebAssembly Debugging: Enable DWARF support');

    Root.Runtime.experiments.cleanUpStaleExperiments();
    const enabledExperiments = Root.Runtime.queryParam('enabledExperiments');
    if (enabledExperiments) {
      Root.Runtime.experiments.setServerEnabledExperiments(enabledExperiments.split(';'));
    }
    Root.Runtime.experiments.setDefaultExperiments([
      'backgroundServices',
      'backgroundServicesNotifications',
      'backgroundServicesPushMessaging',
      'backgroundServicesPaymentHandler',
    ]);

    if (Host.InspectorFrontendHost.isUnderTest() &&
        Root.Runtime.queryParam('test').includes('live-line-level-heap-profile.js')) {
      Root.Runtime.experiments.enableForTest('liveHeapProfile');
    }
  }

  /**
   * @suppressGlobalPropertiesCheck
   */
  async _createAppUI() {
    MainImpl.time('Main._createAppUI');

    self.UI.viewManager = UI.ViewManager.ViewManager.instance();

    // Request filesystems early, we won't create connections until callback is fired. Things will happen in parallel.
    self.Persistence.isolatedFileSystemManager =
        Persistence.IsolatedFileSystemManager.IsolatedFileSystemManager.instance();

    const themeSetting = Common.Settings.Settings.instance().createSetting('uiTheme', 'systemPreferred');
    UI.UIUtils.initializeUIUtils(document, themeSetting);
    themeSetting.addChangeListener(Components.Reload.reload.bind(Components));

    UI.UIUtils.installComponentRootStyles(/** @type {!Element} */ (document.body));

    this._addMainEventListeners(document);

    const canDock = !!Root.Runtime.queryParam('can_dock');
    self.UI.zoomManager = UI.ZoomManager.ZoomManager.instance(
        {forceNew: true, win: window, frontendHost: Host.InspectorFrontendHost.InspectorFrontendHostInstance});
    self.UI.inspectorView = UI.InspectorView.InspectorView.instance();
    UI.ContextMenu.ContextMenu.initialize();
    UI.ContextMenu.ContextMenu.installHandler(document);
    UI.Tooltip.Tooltip.installHandler(document);
    self.SDK.consoleModel = SDK.ConsoleModel.ConsoleModel.instance();
    self.Components.dockController = new Components.DockController.DockController(canDock);
    self.SDK.multitargetNetworkManager = new SDK.NetworkManager.MultitargetNetworkManager();
    self.SDK.domDebuggerManager = new SDK.DOMDebuggerModel.DOMDebuggerManager();
    SDK.SDKModel.TargetManager.instance().addEventListener(
        SDK.SDKModel.Events.SuspendStateChanged, this._onSuspendStateChanged.bind(this));

    self.UI.shortcutsScreen = new UI.ShortcutsScreen.ShortcutsScreen();
    // set order of some sections explicitly
    self.UI.shortcutsScreen.section(Common.UIString.UIString('Elements Panel'));
    self.UI.shortcutsScreen.section(Common.UIString.UIString('Styles Pane'));
    self.UI.shortcutsScreen.section(Common.UIString.UIString('Debugger'));
    self.UI.shortcutsScreen.section(Common.UIString.UIString('Console'));

    self.Workspace.fileManager = new Workspace.FileManager.FileManager();
    self.Workspace.workspace = Workspace.Workspace.WorkspaceImpl.instance();

    self.Bindings.networkProjectManager = Bindings.NetworkProject.NetworkProjectManager.instance();
    self.Bindings.resourceMapping = Bindings.ResourceMapping.ResourceMapping.instance({
      forceNew: true,
      targetManager: SDK.SDKModel.TargetManager.instance(),
      workspace: Workspace.Workspace.WorkspaceImpl.instance()
    });
    new Bindings.PresentationConsoleMessageHelper.PresentationConsoleMessageManager();
    self.Bindings.cssWorkspaceBinding = Bindings.CSSWorkspaceBinding.CSSWorkspaceBinding.instance({
      forceNew: true,
      targetManager: SDK.SDKModel.TargetManager.instance(),
      workspace: Workspace.Workspace.WorkspaceImpl.instance()
    });
    self.Bindings.debuggerWorkspaceBinding = Bindings.DebuggerWorkspaceBinding.DebuggerWorkspaceBinding.instance({
      forceNew: true,
      targetManager: SDK.SDKModel.TargetManager.instance(),
      workspace: Workspace.Workspace.WorkspaceImpl.instance()
    });
    self.Bindings.breakpointManager = Bindings.BreakpointManager.BreakpointManager.instance({
      forceNew: true,
      workspace: Workspace.Workspace.WorkspaceImpl.instance(),
      targetManager: SDK.SDKModel.TargetManager.instance(),
      debuggerWorkspaceBinding: Bindings.DebuggerWorkspaceBinding.DebuggerWorkspaceBinding.instance()
    });
    self.Extensions.extensionServer = new Extensions.ExtensionServer.ExtensionServer();

    new Persistence.FileSystemWorkspaceBinding.FileSystemWorkspaceBinding(
        Persistence.IsolatedFileSystemManager.IsolatedFileSystemManager.instance(),
        Workspace.Workspace.WorkspaceImpl.instance());
    self.Persistence.persistence = new Persistence.Persistence.PersistenceImpl(
        Workspace.Workspace.WorkspaceImpl.instance(), Bindings.BreakpointManager.BreakpointManager.instance());
    self.Persistence.networkPersistenceManager = new Persistence.NetworkPersistenceManager.NetworkPersistenceManager(
        Workspace.Workspace.WorkspaceImpl.instance());

    new ExecutionContextSelector(SDK.SDKModel.TargetManager.instance(), self.UI.context);
    self.Bindings.blackboxManager = Bindings.BlackboxManager.BlackboxManager.instance({
      forceNew: true,
      debuggerWorkspaceBinding: Bindings.DebuggerWorkspaceBinding.DebuggerWorkspaceBinding.instance()
    });

    new PauseListener();

    self.UI.actionRegistry = new UI.ActionRegistry.ActionRegistry();
    self.UI.shortcutRegistry = new UI.ShortcutRegistry.ShortcutRegistry(self.UI.actionRegistry);
    UI.ShortcutsScreen.ShortcutsScreen.registerShortcuts();
    this._registerForwardedShortcuts();
    this._registerMessageSinkListener();

    MainImpl.timeEnd('Main._createAppUI');
    this._showAppUI(await self.runtime.extension(Common.AppProvider.AppProvider).instance());
  }

  /**
   * @param {!Object} appProvider
   * @suppressGlobalPropertiesCheck
   */
  _showAppUI(appProvider) {
    MainImpl.time('Main._showAppUI');
    const app = /** @type {!Common.AppProvider.AppProvider} */ (appProvider).createApp();
    // It is important to kick controller lifetime after apps are instantiated.
    self.Components.dockController.initialize();
    app.presentUI(document);

    const toggleSearchNodeAction = self.UI.actionRegistry.action('elements.toggle-element-search');
    // TODO: we should not access actions from other modules.
    if (toggleSearchNodeAction) {
      Host.InspectorFrontendHost.InspectorFrontendHostInstance.events.addEventListener(
          Host.InspectorFrontendHostAPI.Events.EnterInspectElementMode,
          () => {
            toggleSearchNodeAction.execute();
          }, this);
    }
    Host.InspectorFrontendHost.InspectorFrontendHostInstance.events.addEventListener(
        Host.InspectorFrontendHostAPI.Events.RevealSourceLine, this._revealSourceLine, this);

    self.UI.inspectorView.createToolbars();
    Host.InspectorFrontendHost.InspectorFrontendHostInstance.loadCompleted();

    const extensions = self.runtime.extensions(Common.QueryParamHandler.QueryParamHandler);
    for (const extension of extensions) {
      const value = Root.Runtime.queryParam(extension.descriptor()['name']);
      if (value !== null) {
        extension.instance().then(handleQueryParam.bind(null, value));
      }
    }

    /**
     * @param {string} value
     * @param {!Common.QueryParamHandler.QueryParamHandler} handler
     */
    function handleQueryParam(value, handler) {
      handler.handleQueryParam(value);
    }

    // Allow UI cycles to repaint prior to creating connection.
    setTimeout(this._initializeTarget.bind(this), 0);
    MainImpl.timeEnd('Main._showAppUI');
  }

  async _initializeTarget() {
    MainImpl.time('Main._initializeTarget');
    const instances =
        await Promise.all(self.runtime.extensions('early-initialization').map(extension => extension.instance()));
    for (const instance of instances) {
      await /** @type {!Common.Runnable.Runnable} */ (instance).run();
    }
    // Used for browser tests.
    Host.InspectorFrontendHost.InspectorFrontendHostInstance.readyForTest();
    // Asynchronously run the extensions.
    setTimeout(this._lateInitialization.bind(this), 100);
    MainImpl.timeEnd('Main._initializeTarget');
  }

  _lateInitialization() {
    MainImpl.time('Main._lateInitialization');
    this._registerShortcuts();
    self.Extensions.extensionServer.initializeExtensions();
    const extensions = self.runtime.extensions('late-initialization');
    const promises = [];
    for (const extension of extensions) {
      const setting = extension.descriptor()['setting'];
      if (!setting || Common.Settings.Settings.instance().moduleSetting(setting).get()) {
        promises.push(
            extension.instance().then(instance => (/** @type {!Common.Runnable.Runnable} */ (instance)).run()));
        continue;
      }
      /**
       * @param {!Common.EventTarget.EventTargetEvent} event
       */
      async function changeListener(event) {
        if (!event.data) {
          return;
        }
        Common.Settings.Settings.instance().moduleSetting(setting).removeChangeListener(changeListener);
        (/** @type {!Common.Runnable.Runnable} */ (await extension.instance())).run();
      }
      Common.Settings.Settings.instance().moduleSetting(setting).addChangeListener(changeListener);
    }
    this._lateInitDonePromise = Promise.all(promises);
    MainImpl.timeEnd('Main._lateInitialization');
  }

  /**
   * @return {!Promise}
   */
  lateInitDonePromiseForTest() {
    return this._lateInitDonePromise;
  }

  _registerForwardedShortcuts() {
    /** @const */ const forwardedActions = [
      'main.toggle-dock', 'debugger.toggle-breakpoints-active', 'debugger.toggle-pause', 'commandMenu.show',
      'console.show'
    ];
    const actionKeys = self.UI.shortcutRegistry.keysForActions(forwardedActions)
                           .map(UI.KeyboardShortcut.KeyboardShortcut.keyCodeAndModifiersFromKey);
    Host.InspectorFrontendHost.InspectorFrontendHostInstance.setWhitelistedShortcuts(JSON.stringify(actionKeys));
  }

  _registerMessageSinkListener() {
    Common.Console.Console.instance().addEventListener(Common.Console.Events.MessageAdded, messageAdded);

    /**
     * @param {!Common.EventTarget.EventTargetEvent} event
     */
    function messageAdded(event) {
      const message = /** @type {!Common.Console.Message} */ (event.data);
      if (message.show) {
        Common.Console.Console.instance().show();
      }
    }
  }

  /**
   * @param {!Common.EventTarget.EventTargetEvent} event
   */
  _revealSourceLine(event) {
    const url = /** @type {string} */ (event.data['url']);
    const lineNumber = /** @type {number} */ (event.data['lineNumber']);
    const columnNumber = /** @type {number} */ (event.data['columnNumber']);

    const uiSourceCode = Workspace.Workspace.WorkspaceImpl.instance().uiSourceCodeForURL(url);
    if (uiSourceCode) {
      Common.Revealer.reveal(uiSourceCode.uiLocation(lineNumber, columnNumber));
      return;
    }

    /**
     * @param {!Common.EventTarget.EventTargetEvent} event
     */
    function listener(event) {
      const uiSourceCode = /** @type {!Workspace.UISourceCode.UISourceCode} */ (event.data);
      if (uiSourceCode.url() === url) {
        Common.Revealer.reveal(uiSourceCode.uiLocation(lineNumber, columnNumber));
        Workspace.Workspace.WorkspaceImpl.instance().removeEventListener(
            Workspace.Workspace.Events.UISourceCodeAdded, listener);
      }
    }

    Workspace.Workspace.WorkspaceImpl.instance().addEventListener(
        Workspace.Workspace.Events.UISourceCodeAdded, listener);
  }

  _registerShortcuts() {
    const shortcut = UI.KeyboardShortcut.KeyboardShortcut;
    const section = self.UI.shortcutsScreen.section(Common.UIString.UIString('All Panels'));
    let keys = [
      shortcut.makeDescriptor('[', UI.KeyboardShortcut.Modifiers.CtrlOrMeta),
      shortcut.makeDescriptor(']', UI.KeyboardShortcut.Modifiers.CtrlOrMeta)
    ];
    section.addRelatedKeys(keys, Common.UIString.UIString('Go to the panel to the left/right'));

    const toggleConsoleLabel = Common.UIString.UIString('Show console');
    section.addKey(
        shortcut.makeDescriptor(UI.KeyboardShortcut.Keys.Tilde, UI.KeyboardShortcut.Modifiers.Ctrl),
        toggleConsoleLabel);
    section.addKey(shortcut.makeDescriptor(UI.KeyboardShortcut.Keys.Esc), Common.UIString.UIString('Toggle drawer'));
    if (self.Components.dockController.canDock()) {
      section.addKey(
          shortcut.makeDescriptor('M', UI.KeyboardShortcut.Modifiers.CtrlOrMeta | UI.KeyboardShortcut.Modifiers.Shift),
          Common.UIString.UIString('Toggle device mode'));
      section.addKey(
          shortcut.makeDescriptor('D', UI.KeyboardShortcut.Modifiers.CtrlOrMeta | UI.KeyboardShortcut.Modifiers.Shift),
          Common.UIString.UIString('Toggle dock side'));
    }
    section.addKey(
        shortcut.makeDescriptor('f', UI.KeyboardShortcut.Modifiers.CtrlOrMeta), Common.UIString.UIString('Search'));

    const advancedSearchShortcutModifier = Host.Platform.isMac() ?
        UI.KeyboardShortcut.Modifiers.Meta | UI.KeyboardShortcut.Modifiers.Alt :
        UI.KeyboardShortcut.Modifiers.Ctrl | UI.KeyboardShortcut.Modifiers.Shift;
    const advancedSearchShortcut = shortcut.makeDescriptor('f', advancedSearchShortcutModifier);
    section.addKey(advancedSearchShortcut, Common.UIString.UIString('Search across all sources'));

    const inspectElementModeShortcuts =
        self.UI.shortcutRegistry.shortcutDescriptorsForAction('elements.toggle-element-search');
    if (inspectElementModeShortcuts.length) {
      section.addKey(inspectElementModeShortcuts[0], Common.UIString.UIString('Select node to inspect'));
    }

    const openResourceShortcut =
        UI.KeyboardShortcut.KeyboardShortcut.makeDescriptor('p', UI.KeyboardShortcut.Modifiers.CtrlOrMeta);
    section.addKey(openResourceShortcut, Common.UIString.UIString('Go to source'));

    if (Host.Platform.isMac()) {
      keys = [
        shortcut.makeDescriptor('g', UI.KeyboardShortcut.Modifiers.Meta),
        shortcut.makeDescriptor('g', UI.KeyboardShortcut.Modifiers.Meta | UI.KeyboardShortcut.Modifiers.Shift)
      ];
      section.addRelatedKeys(keys, Common.UIString.UIString('Find next/previous'));
    }
  }

  _postDocumentKeyDown(event) {
    if (!event.handled) {
      self.UI.shortcutRegistry.handleShortcut(event);
    }
  }

  /**
   * @param {!Event} event
   */
  _redispatchClipboardEvent(event) {
    const eventCopy = new CustomEvent('clipboard-' + event.type, {bubbles: true});
    eventCopy['original'] = event;
    const document = event.target && event.target.ownerDocument;
    const target = document ? document.deepActiveElement() : null;
    if (target) {
      target.dispatchEvent(eventCopy);
    }
    if (eventCopy.handled) {
      event.preventDefault();
    }
  }

  _contextMenuEventFired(event) {
    if (event.handled || event.target.classList.contains('popup-glasspane')) {
      event.preventDefault();
    }
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

  _onSuspendStateChanged() {
    const suspended = SDK.SDKModel.TargetManager.instance().allTargetsSuspended();
    self.UI.inspectorView.onSuspendStateChanged(suspended);
  }
}

/**
 * @implements {UI.ActionDelegate.ActionDelegate}
 * @unrestricted
 */
export class ZoomActionDelegate {
  /**
   * @override
   * @param {!UI.Context.Context} context
   * @param {string} actionId
   * @return {boolean}
   */
  handleAction(context, actionId) {
    if (Host.InspectorFrontendHost.InspectorFrontendHostInstance.isHostedMode()) {
      return false;
    }

    switch (actionId) {
      case 'main.zoom-in':
        Host.InspectorFrontendHost.InspectorFrontendHostInstance.zoomIn();
        return true;
      case 'main.zoom-out':
        Host.InspectorFrontendHost.InspectorFrontendHostInstance.zoomOut();
        return true;
      case 'main.zoom-reset':
        Host.InspectorFrontendHost.InspectorFrontendHostInstance.resetZoom();
        return true;
    }
    return false;
  }
}

/**
 * @implements {UI.ActionDelegate.ActionDelegate}
 * @unrestricted
 */
export class SearchActionDelegate {
  /**
   * @override
   * @param {!UI.Context.Context} context
   * @param {string} actionId
   * @return {boolean}
   * @suppressGlobalPropertiesCheck
   */
  handleAction(context, actionId) {
    let searchableView = UI.SearchableView.SearchableView.fromElement(document.deepActiveElement());
    if (!searchableView) {
      const currentPanel = self.UI.inspectorView.currentPanelDeprecated();
      if (currentPanel) {
        searchableView = currentPanel.searchableView();
      }
      if (!searchableView) {
        return false;
      }
    }
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
}

/**
 * @implements {UI.Toolbar.Provider}
 */
export class MainMenuItem {
  constructor() {
    this._item = new UI.Toolbar.ToolbarMenuButton(this._handleContextMenu.bind(this), true);
    this._item.setTitle(Common.UIString.UIString('Customize and control DevTools'));
  }

  /**
   * @override
   * @return {?UI.Toolbar.ToolbarItem}
   */
  item() {
    return this._item;
  }

  /**
   * @param {!UI.ContextMenu.ContextMenu} contextMenu
   */
  _handleContextMenu(contextMenu) {
    if (self.Components.dockController.canDock()) {
      const dockItemElement = createElementWithClass('div', 'flex-centered flex-auto');
      dockItemElement.tabIndex = -1;
      const titleElement = dockItemElement.createChild('span', 'flex-auto');
      titleElement.textContent = Common.UIString.UIString('Dock side');
      const toggleDockSideShorcuts = self.UI.shortcutRegistry.shortcutDescriptorsForAction('main.toggle-dock');
      titleElement.title = Common.UIString.UIString(
          'Placement of DevTools relative to the page. (%s to restore last position)', toggleDockSideShorcuts[0].name);
      dockItemElement.appendChild(titleElement);
      const dockItemToolbar = new UI.Toolbar.Toolbar('', dockItemElement);
      if (Host.Platform.isMac() && !self.UI.themeSupport.hasTheme()) {
        dockItemToolbar.makeBlueOnHover();
      }
      const undock =
          new UI.Toolbar.ToolbarToggle(Common.UIString.UIString('Undock into separate window'), 'largeicon-undock');
      const bottom =
          new UI.Toolbar.ToolbarToggle(Common.UIString.UIString('Dock to bottom'), 'largeicon-dock-to-bottom');
      const right = new UI.Toolbar.ToolbarToggle(Common.UIString.UIString('Dock to right'), 'largeicon-dock-to-right');
      const left = new UI.Toolbar.ToolbarToggle(Common.UIString.UIString('Dock to left'), 'largeicon-dock-to-left');
      undock.addEventListener(UI.Toolbar.ToolbarButton.Events.MouseDown, event => event.data.consume());
      bottom.addEventListener(UI.Toolbar.ToolbarButton.Events.MouseDown, event => event.data.consume());
      right.addEventListener(UI.Toolbar.ToolbarButton.Events.MouseDown, event => event.data.consume());
      left.addEventListener(UI.Toolbar.ToolbarButton.Events.MouseDown, event => event.data.consume());
      undock.addEventListener(
          UI.Toolbar.ToolbarButton.Events.Click, setDockSide.bind(null, Components.DockController.State.Undocked));
      bottom.addEventListener(
          UI.Toolbar.ToolbarButton.Events.Click,
          setDockSide.bind(null, Components.DockController.State.DockedToBottom));
      right.addEventListener(
          UI.Toolbar.ToolbarButton.Events.Click, setDockSide.bind(null, Components.DockController.State.DockedToRight));
      left.addEventListener(
          UI.Toolbar.ToolbarButton.Events.Click, setDockSide.bind(null, Components.DockController.State.DockedToLeft));
      undock.setToggled(self.Components.dockController.dockSide() === Components.DockController.State.Undocked);
      bottom.setToggled(self.Components.dockController.dockSide() === Components.DockController.State.DockedToBottom);
      right.setToggled(self.Components.dockController.dockSide() === Components.DockController.State.DockedToRight);
      left.setToggled(self.Components.dockController.dockSide() === Components.DockController.State.DockedToLeft);
      dockItemToolbar.appendToolbarItem(undock);
      dockItemToolbar.appendToolbarItem(left);
      dockItemToolbar.appendToolbarItem(bottom);
      dockItemToolbar.appendToolbarItem(right);
      dockItemElement.addEventListener('keydown', event => {
        let dir = 0;
        if (event.key === 'ArrowLeft') {
          dir = -1;
        } else if (event.key === 'ArrowRight') {
          dir = 1;
        } else {
          return;
        }

        const buttons = [undock, left, bottom, right];
        let index = buttons.findIndex(button => button.element.hasFocus());
        index = Platform.NumberUtilities.clamp(index + dir, 0, buttons.length - 1);

        buttons[index].element.focus();
        event.consume(true);
      });
      contextMenu.headerSection().appendCustomItem(dockItemElement);
    }


    const button = this._item.element;

    /**
     * @param {string} side
     * @suppressGlobalPropertiesCheck
     */
    function setDockSide(side) {
      const hadKeyboardFocus = document.deepActiveElement().hasAttribute('data-keyboard-focus');
      self.Components.dockController.once(Components.DockController.Events.AfterDockSideChanged).then(() => {
        button.focus();
        if (hadKeyboardFocus) {
          UI.UIUtils.markAsFocusedByKeyboard(button);
        }
      });
      self.Components.dockController.setDockSide(side);
      contextMenu.discard();
    }

    if (self.Components.dockController.dockSide() === Components.DockController.State.Undocked &&
        SDK.SDKModel.TargetManager.instance().mainTarget() &&
        SDK.SDKModel.TargetManager.instance().mainTarget().type() === SDK.SDKModel.Type.Frame) {
      contextMenu.defaultSection().appendAction(
          'inspector_main.focus-debuggee', Common.UIString.UIString('Focus debuggee'));
    }

    contextMenu.defaultSection().appendAction(
        'main.toggle-drawer',
        self.UI.inspectorView.drawerVisible() ? Common.UIString.UIString('Hide console drawer') :
                                                Common.UIString.UIString('Show console drawer'));
    contextMenu.appendItemsAtLocation('mainMenu');
    const moreTools = contextMenu.defaultSection().appendSubMenuItem(Common.UIString.UIString('More tools'));
    const extensions = self.runtime.extensions('view', undefined, true);
    for (const extension of extensions) {
      const descriptor = extension.descriptor();

      if (descriptor['id'] === 'settings-default') {
        moreTools.defaultSection().appendItem(extension.title(), () => {
          Host.userMetrics.actionTaken(Host.UserMetrics.Action.SettingsOpenedFromMenu);
          UI.ViewManager.ViewManager.instance().showView('preferences', /* userGesture */ true);
        });
        continue;
      }

      if (descriptor['persistence'] !== 'closeable') {
        continue;
      }
      if (descriptor['location'] !== 'drawer-view' && descriptor['location'] !== 'panel') {
        continue;
      }

      moreTools.defaultSection().appendItem(
          extension.title(),
          UI.ViewManager.ViewManager.instance().showView.bind(
              UI.ViewManager.ViewManager.instance(), descriptor['id'], /* userGesture */ true));
    }

    const helpSubMenu = contextMenu.footerSection().appendSubMenuItem(Common.UIString.UIString('Help'));
    helpSubMenu.appendItemsAtLocation('mainMenuHelp');
  }
}

/**
 * @implements {UI.Toolbar.Provider}
 */
export class SettingsButtonProvider {
  constructor() {
    const settingsActionId = 'settings.show';
    this._settingsButton = UI.Toolbar.Toolbar.createActionButtonForId(
        settingsActionId, {showLabel: false, userActionCode: Host.UserMetrics.Action.SettingsOpenedFromGear});
  }

  /**
   * @override
   * @return {?UI.Toolbar.ToolbarItem}
   */
  item() {
    return this._settingsButton;
  }
}

/**
 * @unrestricted
 */
export class PauseListener {
  constructor() {
    SDK.SDKModel.TargetManager.instance().addModelListener(
        SDK.DebuggerModel.DebuggerModel, SDK.DebuggerModel.Events.DebuggerPaused, this._debuggerPaused, this);
  }

  /**
   * @param {!Common.EventTarget.EventTargetEvent} event
   */
  _debuggerPaused(event) {
    SDK.SDKModel.TargetManager.instance().removeModelListener(
        SDK.DebuggerModel.DebuggerModel, SDK.DebuggerModel.Events.DebuggerPaused, this._debuggerPaused, this);
    const debuggerModel = /** @type {!SDK.DebuggerModel.DebuggerModel} */ (event.data);
    const debuggerPausedDetails = debuggerModel.debuggerPausedDetails();
    self.UI.context.setFlavor(SDK.SDKModel.Target, debuggerModel.target());
    Common.Revealer.reveal(debuggerPausedDetails);
  }
}

/**
 * @param {string} method
 * @param {?Object} params
 * @return {!Promise}
 */
export function sendOverProtocol(method, params) {
  return new Promise((resolve, reject) => {
    ProtocolClient.InspectorBackend.test.sendRawMessage(method, params, (err, ...results) => {
      if (err) {
        return reject(err);
      }
      return resolve(results);
    });
  });
}

/**
 * @implements {UI.ActionDelegate.ActionDelegate}
 * @unrestricted
 */
export class ReloadActionDelegate {
  /**
   * @override
   * @param {!UI.Context.Context} context
   * @param {string} actionId
   * @return {boolean}
   */
  handleAction(context, actionId) {
    switch (actionId) {
      case 'main.debug-reload':
        Components.Reload.reload();
        return true;
    }
    return false;
  }
}

new MainImpl();
