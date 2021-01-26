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
import * as i18n from '../i18n/i18n.js';
import * as Persistence from '../persistence/persistence.js';
import * as Platform from '../platform/platform.js';
import {ls} from '../platform/platform.js';
import * as ProtocolClient from '../protocol_client/protocol_client.js';
import * as Recorder from '../recorder/recorder.js';
import * as Root from '../root/root.js';
import * as SDK from '../sdk/sdk.js';
import * as Snippets from '../snippets/snippets.js';
import * as ThemeSupport from '../theme_support/theme_support.js';
import * as UI from '../ui/ui.js';
import * as Workspace from '../workspace/workspace.js';

import {ExecutionContextSelector} from './ExecutionContextSelector.js';

export class MainImpl {
  constructor() {
    MainImpl._instanceForTest = this;
    Platform.runOnWindowLoad(() => {
      this._loaded();
    });

    /** @type {!Promise<void>} */
    this._lateInitDonePromise;
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
    await Root.Runtime.appStarted;
    Root.Runtime.Runtime.setPlatform(Host.Platform.platform());
    Root.Runtime.Runtime.setL10nCallback(ls);
    const prefs = await new Promise(resolve => {
      Host.InspectorFrontendHost.InspectorFrontendHostInstance.getPreferences(resolve);
    });

    console.timeStamp('Main._gotPreferences');
    this._createSettings(prefs);
    await this.requestAndRegisterLocaleData();
    this._createAppUI();
  }

  async requestAndRegisterLocaleData() {
    const hostLocale = navigator.language || 'en-US';
    i18n.i18n.registerLocale(hostLocale);
    const locale = i18n.i18n.registeredLocale;
    if (locale) {
      const data = await Root.Runtime.loadResourcePromise(`i18n/locales/${locale}.json`);
      if (data) {
        const localizedStrings = JSON.parse(data);
        i18n.i18n.registerLocaleData(locale, localizedStrings);
      }
    }
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
        !Root.Runtime.Runtime.queryParam('can_dock') && Boolean(Root.Runtime.Runtime.queryParam('debugFrontend')) &&
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

    // @ts-ignore layout test global
    self.Common.settings = Common.Settings.Settings.instance();

    if (!Host.InspectorFrontendHost.isUnderTest()) {
      new Common.Settings.VersionController().updateVersion();
    }
  }

  _initializeExperiments() {
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
    // TODO(crbug.com/1161439): remove 'blackboxJSFramesOnTimeline', keep 'ignoreListJSFramesOnTimeline'
    Root.Runtime.experiments.register(
        'blackboxJSFramesOnTimeline', 'Ignore List for JavaScript frames on Timeline', true);
    Root.Runtime.experiments.register(
        'ignoreListJSFramesOnTimeline', 'Ignore List for JavaScript frames on Timeline', true);
    Root.Runtime.experiments.register('cssOverview', 'CSS Overview');
    Root.Runtime.experiments.register('emptySourceMapAutoStepping', 'Empty sourcemap auto-stepping');
    Root.Runtime.experiments.register('inputEventsOnTimelineOverview', 'Input events on Timeline overview', true);
    Root.Runtime.experiments.register('liveHeapProfile', 'Live heap profile', true);
    Root.Runtime.experiments.register('protocolMonitor', 'Protocol Monitor');
    Root.Runtime.experiments.register('developerResourcesView', 'Show developer resources view');
    Root.Runtime.experiments.register('cspViolationsView', 'Show CSP Violations view');
    Root.Runtime.experiments.register(
        'recordCoverageWithPerformanceTracing', 'Record coverage while performance tracing');
    Root.Runtime.experiments.register('samplingHeapProfilerTimeline', 'Sampling heap profiler timeline', true);
    Root.Runtime.experiments.register(
        'showOptionToNotTreatGlobalObjectsAsRoots',
        'Show option to take heap snapshot where globals are not treated as root');
    Root.Runtime.experiments.register('sourceDiff', 'Source diff');
    Root.Runtime.experiments.register('sourceOrderViewer', 'Source order viewer');
    Root.Runtime.experiments.register('spotlight', 'Spotlight', true);
    Root.Runtime.experiments.register('webauthnPane', 'WebAuthn Pane');
    Root.Runtime.experiments.register('keyboardShortcutEditor', 'Enable keyboard shortcut editor', true);
    Root.Runtime.experiments.register('recorder', 'Recorder');

    // Timeline
    Root.Runtime.experiments.register('timelineEventInitiators', 'Timeline: event initiators');
    Root.Runtime.experiments.register('timelineInvalidationTracking', 'Timeline: invalidation tracking', true);
    Root.Runtime.experiments.register('timelineShowAllEvents', 'Timeline: show all events', true);
    Root.Runtime.experiments.register(
        'timelineV8RuntimeCallStats', 'Timeline: V8 Runtime Call Stats on Timeline', true);
    Root.Runtime.experiments.register('timelineWebGL', 'Timeline: WebGL-based flamechart');
    Root.Runtime.experiments.register('timelineReplayEvent', 'Timeline: Replay input events', true);
    Root.Runtime.experiments.register('wasmDWARFDebugging', 'WebAssembly Debugging: Enable DWARF support');

    // Dual-screen
    Root.Runtime.experiments.register('dualScreenSupport', 'Emulation: Support dual screen mode');
    Root.Runtime.experiments.setEnabled('dualScreenSupport', true);

    // CSS Flexbox
    Root.Runtime.experiments.register('cssFlexboxFeatures', 'Enable new CSS Flexbox debugging features');

    // Advanced Perceptual Contrast Algorithm.
    Root.Runtime.experiments.register(
        'APCA',
        'Enable new Advanced Perceptual Contrast Algorithm (APCA) replacing previous contrast ratio and AA/AAA guidelines');

    // Full Accessibility Tree
    Root.Runtime.experiments.register('fullAccessibilityTree', 'Enable full accessibility tree view in Elements pane');

    // Font Editor
    Root.Runtime.experiments.register('fontEditor', 'Enable new Font Editor tool within the Styles Pane.');

    Root.Runtime.experiments.enableExperimentsByDefault([
      'cssFlexboxFeatures',
    ]);

    Root.Runtime.experiments.cleanUpStaleExperiments();
    const enabledExperiments = Root.Runtime.Runtime.queryParam('enabledExperiments');
    if (enabledExperiments) {
      Root.Runtime.experiments.setServerEnabledExperiments(enabledExperiments.split(';'));
    }
    Root.Runtime.experiments.enableExperimentsTransiently([
      'backgroundServices',
      'backgroundServicesNotifications',
      'backgroundServicesPushMessaging',
      'backgroundServicesPaymentHandler',
      'webauthnPane',
      'developerResourcesView',
    ]);

    if (Host.InspectorFrontendHost.isUnderTest()) {
      const testParam = Root.Runtime.Runtime.queryParam('test');
      if (testParam && testParam.includes('live-line-level-heap-profile.js')) {
        Root.Runtime.experiments.enableForTest('liveHeapProfile');
      }
    }

    // TODO(crbug.com/1161439): remove experiment duplication
    const isBlackboxJSFramesOnTimelineEnabled = Root.Runtime.experiments.isEnabled('blackboxJSFramesOnTimeline');
    Root.Runtime.experiments.setEnabled('ignoreListJSFramesOnTimeline', isBlackboxJSFramesOnTimelineEnabled);

    for (const experiment of Root.Runtime.experiments.enabledExperiments()) {
      Host.userMetrics.experimentEnabledAtLaunch(experiment.name);
    }
  }
  async _createAppUI() {
    MainImpl.time('Main._createAppUI');

    // @ts-ignore layout test global
    self.UI.viewManager = UI.ViewManager.ViewManager.instance();

    // Request filesystems early, we won't create connections until callback is fired. Things will happen in parallel.
    // @ts-ignore layout test global
    self.Persistence.isolatedFileSystemManager =
        Persistence.IsolatedFileSystemManager.IsolatedFileSystemManager.instance();

    const defaultThemeSetting = 'systemPreferred';
    const themeSetting = Common.Settings.Settings.instance().createSetting('uiTheme', defaultThemeSetting);
    UI.UIUtils.initializeUIUtils(document, themeSetting);
    if (themeSetting.get() === defaultThemeSetting) {
      const darkThemeMediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
      darkThemeMediaQuery.addEventListener('change', () => {
        UI.InspectorView.InspectorView.instance().displayReloadRequiredWarning(
            ls`The system-preferred color scheme has changed. To apply this change to DevTools, reload.`);
      });
    }

    UI.UIUtils.installComponentRootStyles(/** @type {!Element} */ (document.body));

    this._addMainEventListeners(document);

    const canDock = Boolean(Root.Runtime.Runtime.queryParam('can_dock'));
    // @ts-ignore layout test global
    self.UI.zoomManager = UI.ZoomManager.ZoomManager.instance(
        {forceNew: true, win: window, frontendHost: Host.InspectorFrontendHost.InspectorFrontendHostInstance});
    // @ts-ignore layout test global
    self.UI.inspectorView = UI.InspectorView.InspectorView.instance();
    UI.ContextMenu.ContextMenu.initialize();
    UI.ContextMenu.ContextMenu.installHandler(document);
    UI.Tooltip.Tooltip.installHandler(document);

    // We need to force creation of the FrameManager early to make sure no issues are missed.
    SDK.FrameManager.FrameManager.instance();
    // We need to force creation of the NetworkLog early to make sure no requests are missed.
    SDK.NetworkLog.NetworkLog.instance();

    // @ts-ignore layout test global
    self.SDK.consoleModel = SDK.ConsoleModel.ConsoleModel.instance();
    // @ts-ignore layout test global
    self.UI.dockController = UI.DockController.DockController.instance({forceNew: true, canDock});
    // @ts-ignore layout test global
    self.SDK.multitargetNetworkManager = SDK.NetworkManager.MultitargetNetworkManager.instance({forceNew: true});
    // @ts-ignore layout test global
    self.SDK.domDebuggerManager = SDK.DOMDebuggerModel.DOMDebuggerManager.instance({forceNew: true});
    SDK.SDKModel.TargetManager.instance().addEventListener(
        SDK.SDKModel.Events.SuspendStateChanged, this._onSuspendStateChanged.bind(this));

    // @ts-ignore layout test global
    self.Workspace.fileManager = Workspace.FileManager.FileManager.instance({forceNew: true});
    // @ts-ignore layout test global
    self.Workspace.workspace = Workspace.Workspace.WorkspaceImpl.instance();

    // @ts-ignore layout test global
    self.Bindings.networkProjectManager = Bindings.NetworkProject.NetworkProjectManager.instance();
    // @ts-ignore layout test global
    self.Bindings.resourceMapping = Bindings.ResourceMapping.ResourceMapping.instance({
      forceNew: true,
      targetManager: SDK.SDKModel.TargetManager.instance(),
      workspace: Workspace.Workspace.WorkspaceImpl.instance()
    });
    new Bindings.PresentationConsoleMessageHelper.PresentationConsoleMessageManager();
    // @ts-ignore layout test global
    self.Bindings.cssWorkspaceBinding = Bindings.CSSWorkspaceBinding.CSSWorkspaceBinding.instance({
      forceNew: true,
      targetManager: SDK.SDKModel.TargetManager.instance(),
      workspace: Workspace.Workspace.WorkspaceImpl.instance()
    });
    // @ts-ignore layout test global
    self.Bindings.debuggerWorkspaceBinding = Bindings.DebuggerWorkspaceBinding.DebuggerWorkspaceBinding.instance({
      forceNew: true,
      targetManager: SDK.SDKModel.TargetManager.instance(),
      workspace: Workspace.Workspace.WorkspaceImpl.instance()
    });
    // @ts-ignore layout test global
    self.Bindings.breakpointManager = Bindings.BreakpointManager.BreakpointManager.instance({
      forceNew: true,
      workspace: Workspace.Workspace.WorkspaceImpl.instance(),
      targetManager: SDK.SDKModel.TargetManager.instance(),
      debuggerWorkspaceBinding: Bindings.DebuggerWorkspaceBinding.DebuggerWorkspaceBinding.instance()
    });
    // @ts-ignore layout test global
    self.Extensions.extensionServer = Extensions.ExtensionServer.ExtensionServer.instance({forceNew: true});

    new Persistence.FileSystemWorkspaceBinding.FileSystemWorkspaceBinding(
        Persistence.IsolatedFileSystemManager.IsolatedFileSystemManager.instance(),
        Workspace.Workspace.WorkspaceImpl.instance());
    Persistence.IsolatedFileSystemManager.IsolatedFileSystemManager.instance().addPlatformFileSystem(
        // @ts-ignore https://github.com/microsoft/TypeScript/issues/41397
        'snippet://', new Snippets.ScriptSnippetFileSystem.SnippetFileSystem());

    if (Root.Runtime.experiments.isEnabled('recorder')) {
      Persistence.IsolatedFileSystemManager.IsolatedFileSystemManager.instance().addPlatformFileSystem(
          // @ts-ignore https://github.com/microsoft/TypeScript/issues/41397
          'recording://', new Recorder.RecordingFileSystem.RecordingFileSystem());
    }

    // @ts-ignore layout test global
    self.Persistence.persistence = Persistence.Persistence.PersistenceImpl.instance({
      forceNew: true,
      workspace: Workspace.Workspace.WorkspaceImpl.instance(),
      breakpointManager: Bindings.BreakpointManager.BreakpointManager.instance()
    });
    // @ts-ignore layout test global
    self.Persistence.networkPersistenceManager =
        Persistence.NetworkPersistenceManager.NetworkPersistenceManager.instance(
            {forceNew: true, workspace: Workspace.Workspace.WorkspaceImpl.instance()});

    new ExecutionContextSelector(SDK.SDKModel.TargetManager.instance(), UI.Context.Context.instance());
    // @ts-ignore layout test global
    self.Bindings.ignoreListManager = Bindings.IgnoreListManager.IgnoreListManager.instance({
      forceNew: true,
      debuggerWorkspaceBinding: Bindings.DebuggerWorkspaceBinding.DebuggerWorkspaceBinding.instance()
    });

    new PauseListener();

    const actionRegistryInstance = UI.ActionRegistry.ActionRegistry.instance({forceNew: true});
    // Required for legacy a11y layout tests
    // @ts-ignore layout test global
    self.UI.actionRegistry = actionRegistryInstance;
    // @ts-ignore layout test global
    self.UI.shortcutRegistry =
        UI.ShortcutRegistry.ShortcutRegistry.instance({forceNew: true, actionRegistry: actionRegistryInstance});
    this._registerMessageSinkListener();

    MainImpl.timeEnd('Main._createAppUI');
    const appProvider = Root.Runtime.Runtime.instance().extension(Common.AppProvider.AppProvider);
    if (!appProvider) {
      throw new Error('Unable to boot DevTools, as the appprovider is missing');
    }
    this._showAppUI(await appProvider.instance());
  }

  /**
   * @param {!Object} appProvider
   */
  _showAppUI(appProvider) {
    MainImpl.time('Main._showAppUI');
    const app = /** @type {!Common.AppProvider.AppProvider} */ (appProvider).createApp();
    // It is important to kick controller lifetime after apps are instantiated.
    UI.DockController.DockController.instance().initialize();
    app.presentUI(document);

    const toggleSearchNodeAction = UI.ActionRegistry.ActionRegistry.instance().action('elements.toggle-element-search');
    // TODO: we should not access actions from other modules.
    if (toggleSearchNodeAction) {
      Host.InspectorFrontendHost.InspectorFrontendHostInstance.events.addEventListener(
          Host.InspectorFrontendHostAPI.Events.EnterInspectElementMode, () => {
            toggleSearchNodeAction.execute();
          }, this);
    }
    Host.InspectorFrontendHost.InspectorFrontendHostInstance.events.addEventListener(
        Host.InspectorFrontendHostAPI.Events.RevealSourceLine, this._revealSourceLine, this);

    UI.InspectorView.InspectorView.instance().createToolbars();
    Host.InspectorFrontendHost.InspectorFrontendHostInstance.loadCompleted();

    const extensions = Root.Runtime.Runtime.instance().extensions(Common.QueryParamHandler.QueryParamHandler);
    for (const extension of extensions) {
      const value = Root.Runtime.Runtime.queryParam(/** @type {string} */ (extension.descriptor()['name']));
      if (value !== null) {
        extension.instance().then(handler => {
          /** @type {!Common.QueryParamHandler.QueryParamHandler} */ (handler).handleQueryParam(
              /** @type {string} */ (value));
        });
      }
    }

    // Allow UI cycles to repaint prior to creating connection.
    setTimeout(this._initializeTarget.bind(this), 0);
    MainImpl.timeEnd('Main._showAppUI');
  }

  async _initializeTarget() {
    MainImpl.time('Main._initializeTarget');
    const instances = await Promise.all(
        Root.Runtime.Runtime.instance().extensions('early-initialization').map(extension => extension.instance()));
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
    Extensions.ExtensionServer.ExtensionServer.instance().initializeExtensions();
    const extensions = Root.Runtime.Runtime.instance().extensions('late-initialization');
    /** @type {!Array<!Promise<void>>} */
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
      const changeListener = async event => {
        if (!event.data) {
          return;
        }
        Common.Settings.Settings.instance().moduleSetting(setting).removeChangeListener(changeListener);
        (/** @type {!Common.Runnable.Runnable} */ (await extension.instance())).run();
      };
      Common.Settings.Settings.instance().moduleSetting(setting).addChangeListener(changeListener);
    }
    this._lateInitDonePromise = Promise.all(promises).then(() => undefined);
    MainImpl.timeEnd('Main._lateInitialization');
  }

  /**
   * @return {?Promise<void>}
   */
  lateInitDonePromiseForTest() {
    return this._lateInitDonePromise;
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

  /**
   * @param {!Event} event
   */
  _postDocumentKeyDown(event) {
    if (!event.handled) {
      UI.ShortcutRegistry.ShortcutRegistry.instance().handleShortcut(/** @type {!KeyboardEvent} */ (event));
    }
  }

  /**
   * @param {!Event} event
   */
  _redispatchClipboardEvent(event) {
    const eventCopy = new CustomEvent('clipboard-' + event.type, {bubbles: true});
    // @ts-ignore Used in ElementsTreeOutline
    eventCopy['original'] = event;
    const document = event.target && /** @type {!HTMLElement} */ (event.target).ownerDocument;
    const target = document ? document.deepActiveElement() : null;
    if (target) {
      target.dispatchEvent(eventCopy);
    }
    if (eventCopy.handled) {
      event.preventDefault();
    }
  }

  /**
   * @param {!Event} event
   */
  _contextMenuEventFired(event) {
    if (event.handled || /** @type {!HTMLElement} */ (event.target).classList.contains('popup-glasspane')) {
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
    UI.InspectorView.InspectorView.instance().onSuspendStateChanged(suspended);
  }
}

/** @type {?MainImpl} */
MainImpl._instanceForTest = null;

/**
 * @implements {UI.ActionRegistration.ActionDelegate}
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
 * @implements {UI.ActionRegistration.ActionDelegate}
 */
export class SearchActionDelegate {
  /**
   * @override
   * @param {!UI.Context.Context} context
   * @param {string} actionId
   * @return {boolean}
   */
  handleAction(context, actionId) {
    let searchableView = UI.SearchableView.SearchableView.fromElement(document.deepActiveElement());
    if (!searchableView) {
      const currentPanel = UI.InspectorView.InspectorView.instance().currentPanelDeprecated();
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
    if (UI.DockController.DockController.instance().canDock()) {
      const dockItemElement = document.createElement('div');
      dockItemElement.classList.add('flex-centered');
      dockItemElement.classList.add('flex-auto');
      dockItemElement.tabIndex = -1;
      const titleElement = dockItemElement.createChild('span', 'flex-auto');
      titleElement.textContent = Common.UIString.UIString('Dock side');
      const toggleDockSideShorcuts =
          UI.ShortcutRegistry.ShortcutRegistry.instance().shortcutsForAction('main.toggle-dock');
      UI.Tooltip.Tooltip.install(
          titleElement,
          Common.UIString.UIString(
              'Placement of DevTools relative to the page. (%s to restore last position)',
              toggleDockSideShorcuts[0].title()));
      dockItemElement.appendChild(titleElement);
      const dockItemToolbar = new UI.Toolbar.Toolbar('', dockItemElement);
      if (Host.Platform.isMac() && !ThemeSupport.ThemeSupport.instance().hasTheme()) {
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
          UI.Toolbar.ToolbarButton.Events.Click, setDockSide.bind(null, UI.DockController.State.Undocked));
      bottom.addEventListener(
          UI.Toolbar.ToolbarButton.Events.Click, setDockSide.bind(null, UI.DockController.State.DockedToBottom));
      right.addEventListener(
          UI.Toolbar.ToolbarButton.Events.Click, setDockSide.bind(null, UI.DockController.State.DockedToRight));
      left.addEventListener(
          UI.Toolbar.ToolbarButton.Events.Click, setDockSide.bind(null, UI.DockController.State.DockedToLeft));
      undock.setToggled(UI.DockController.DockController.instance().dockSide() === UI.DockController.State.Undocked);
      bottom.setToggled(
          UI.DockController.DockController.instance().dockSide() === UI.DockController.State.DockedToBottom);
      right.setToggled(
          UI.DockController.DockController.instance().dockSide() === UI.DockController.State.DockedToRight);
      left.setToggled(UI.DockController.DockController.instance().dockSide() === UI.DockController.State.DockedToLeft);
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


    const button = /** @type {!HTMLButtonElement} */ (this._item.element);

    /**
     * @param {string} side
     */
    function setDockSide(side) {
      UI.DockController.DockController.instance().once(UI.DockController.Events.AfterDockSideChanged).then(() => {
        button.focus();
      });
      UI.DockController.DockController.instance().setDockSide(side);
      contextMenu.discard();
    }

    if (UI.DockController.DockController.instance().dockSide() === UI.DockController.State.Undocked) {
      const mainTarget = SDK.SDKModel.TargetManager.instance().mainTarget();
      if (mainTarget && mainTarget.type() === SDK.SDKModel.Type.Frame) {
        contextMenu.defaultSection().appendAction(
            'inspector_main.focus-debuggee', Common.UIString.UIString('Focus debuggee'));
      }
    }

    contextMenu.defaultSection().appendAction(
        'main.toggle-drawer',
        UI.InspectorView.InspectorView.instance().drawerVisible() ? Common.UIString.UIString('Hide console drawer') :
                                                                    Common.UIString.UIString('Show console drawer'));
    contextMenu.appendItemsAtLocation('mainMenu');
    const moreTools = contextMenu.defaultSection().appendSubMenuItem(Common.UIString.UIString('More tools'));
    const viewExtensions = UI.ViewManager.getRegisteredViewExtensions();
    viewExtensions.sort((extension1, extension2) => {
      const title1 = extension1.title();
      const title2 = extension2.title();
      return title1.localeCompare(title2);
    });

    for (const viewExtension of viewExtensions) {
      const location = viewExtension.location();
      const persistence = viewExtension.persistence();
      const title = viewExtension.title();
      const id = viewExtension.viewId();

      if (id === 'issues-pane') {
        moreTools.defaultSection().appendItem(title, () => {
          Host.userMetrics.issuesPanelOpenedFrom(Host.UserMetrics.IssueOpener.HamburgerMenu);
          UI.ViewManager.ViewManager.instance().showView('issues-pane', /* userGesture */ true);
        });
        continue;
      }

      if (persistence !== 'closeable') {
        continue;
      }
      if (location !== 'drawer-view' && location !== 'panel') {
        continue;
      }
      moreTools.defaultSection().appendItem(title, () => {
        UI.ViewManager.ViewManager.instance().showView(id, true, false);
      });
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
    this._settingsButton =
        UI.Toolbar.Toolbar.createActionButtonForId(settingsActionId, {showLabel: false, userActionCode: undefined});
  }

  /**
   * @override
   * @return {?UI.Toolbar.ToolbarItem}
   */
  item() {
    return this._settingsButton;
  }
}

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
    UI.Context.Context.instance().setFlavor(SDK.SDKModel.Target, debuggerModel.target());
    Common.Revealer.reveal(debuggerPausedDetails);
  }
}

/**
 * @param {string} method
 * @param {?Object} params
 * @return {!Promise<?Array<*>>}
 */
export function sendOverProtocol(method, params) {
  return new Promise((resolve, reject) => {
    const sendRawMessage = ProtocolClient.InspectorBackend.test.sendRawMessage;
    if (!sendRawMessage) {
      return reject('Unable to send message to test client');
    }
    sendRawMessage(method, params, (err, ...results) => {
      if (err) {
        return reject(err);
      }
      return resolve(results);
    });
  });
}

/**
 * @implements {UI.ActionRegistration.ActionDelegate}
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
