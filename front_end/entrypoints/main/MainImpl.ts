// Copyright 2021 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

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

import * as Common from '../../core/common/common.js';
import * as Host from '../../core/host/host.js';
import * as i18n from '../../core/i18n/i18n.js';
import * as Platform from '../../core/platform/platform.js';
import * as ProtocolClient from '../../core/protocol_client/protocol_client.js';
import * as Root from '../../core/root/root.js';
import * as SDK from '../../core/sdk/sdk.js';
import * as Bindings from '../../models/bindings/bindings.js';
import * as Breakpoints from '../../models/breakpoints/breakpoints.js';
import * as Extensions from '../../models/extensions/extensions.js';
import * as IssuesManager from '../../models/issues_manager/issues_manager.js';
import * as Logs from '../../models/logs/logs.js';
import * as Persistence from '../../models/persistence/persistence.js';
import * as Workspace from '../../models/workspace/workspace.js';
import * as Snippets from '../../panels/snippets/snippets.js';
import * as Timeline from '../../panels/timeline/timeline.js';
import * as IconButton from '../../ui/components/icon_button/icon_button.js';
import * as PerfUI from '../../ui/legacy/components/perf_ui/perf_ui.js';
import * as Components from '../../ui/legacy/components/utils/utils.js';
import * as UI from '../../ui/legacy/legacy.js';
import * as ThemeSupport from '../../ui/legacy/theme_support/theme_support.js';

import {ExecutionContextSelector} from './ExecutionContextSelector.js';

const UIStrings = {
  /**
   *@description Title of item in main
   */
  customizeAndControlDevtools: 'Customize and control DevTools',
  /**
   *@description Title element text content in Main
   */
  dockSide: 'Dock side',
  /**
   *@description Title element title in Main
   *@example {Ctrl+Shift+D} PH1
   */
  placementOfDevtoolsRelativeToThe: 'Placement of DevTools relative to the page. ({PH1} to restore last position)',
  /**
   *@description Text to undock the DevTools
   */
  undockIntoSeparateWindow: 'Undock into separate window',
  /**
   *@description Text to dock the DevTools to the bottom of the browser tab
   */
  dockToBottom: 'Dock to bottom',
  /**
   *@description Text to dock the DevTools to the right of the browser tab
   */
  dockToRight: 'Dock to right',
  /**
   *@description Text to dock the DevTools to the left of the browser tab
   */
  dockToLeft: 'Dock to left',
  /**
   *@description Text in Main
   */
  focusDebuggee: 'Focus debuggee',
  /**
   *@description Text in Main
   */
  hideConsoleDrawer: 'Hide console drawer',
  /**
   *@description Text in Main
   */
  showConsoleDrawer: 'Show console drawer',
  /**
   *@description A context menu item in the Main
   */
  moreTools: 'More tools',
  /**
   *@description Text for the viewing the help options
   */
  help: 'Help',
  /**
   *@description Text describing how to navigate the dock side menu
   */
  dockSideNaviation: 'Use left and right arrow keys to navigate the options',
};
const str_ = i18n.i18n.registerUIStrings('entrypoints/main/MainImpl.ts', UIStrings);
const i18nString = i18n.i18n.getLocalizedString.bind(undefined, str_);

export class MainImpl {
  #lateInitDonePromise!: Promise<void>;
  #readyForTestPromise: Promise<void>;
  #resolveReadyForTestPromise!: () => void;

  constructor() {
    MainImpl.instanceForTest = this;
    this.#readyForTestPromise = new Promise(resolve => {
      this.#resolveReadyForTestPromise = resolve;
    });
    void this.#loaded();
  }

  static time(label: string): void {
    if (Host.InspectorFrontendHost.isUnderTest()) {
      return;
    }
    console.time(label);
  }

  static timeEnd(label: string): void {
    if (Host.InspectorFrontendHost.isUnderTest()) {
      return;
    }
    console.timeEnd(label);
  }

  async #loaded(): Promise<void> {
    console.timeStamp('Main._loaded');
    Root.Runtime.Runtime.setPlatform(Host.Platform.platform());
    const prefs = await new Promise<{[key: string]: string}>(resolve => {
      Host.InspectorFrontendHost.InspectorFrontendHostInstance.getPreferences(resolve);
    });

    console.timeStamp('Main._gotPreferences');
    this.#initializeGlobalsForLayoutTests();
    this.createSettings(prefs);
    await this.requestAndRegisterLocaleData();

    Host.userMetrics.syncSetting(Common.Settings.Settings.instance().moduleSetting<boolean>('sync_preferences').get());

    void this.#createAppUI();
  }

  #initializeGlobalsForLayoutTests(): void {
    // @ts-ignore layout test global
    self.Common = self.Common || {};
    // @ts-ignore layout test global
    self.UI = self.UI || {};
    // @ts-ignore layout test global
    self.UI.panels = self.UI.panels || {};
    // @ts-ignore layout test global
    self.SDK = self.SDK || {};
    // @ts-ignore layout test global
    self.Bindings = self.Bindings || {};
    // @ts-ignore layout test global
    self.Persistence = self.Persistence || {};
    // @ts-ignore layout test global
    self.Workspace = self.Workspace || {};
    // @ts-ignore layout test global
    self.Extensions = self.Extensions || {};
    // @ts-ignore e2e test global
    self.Host = self.Host || {};
    // @ts-ignore e2e test global
    self.Host.userMetrics = self.Host.userMetrics || Host.userMetrics;
    // @ts-ignore e2e test global
    self.Host.UserMetrics = self.Host.UserMetrics || Host.UserMetrics;
    // @ts-ignore e2e test global
    self.ProtocolClient = self.ProtocolClient || {};
    // @ts-ignore e2e test global
    self.ProtocolClient.test = self.ProtocolClient.test || ProtocolClient.InspectorBackend.test;
  }

  async requestAndRegisterLocaleData(): Promise<void> {
    const settingLanguage = Common.Settings.Settings.instance().moduleSetting<string>('language').get();
    const devToolsLocale = i18n.DevToolsLocale.DevToolsLocale.instance({
      create: true,
      data: {
        navigatorLanguage: navigator.language,
        settingLanguage,
        lookupClosestDevToolsLocale: i18n.i18n.lookupClosestSupportedDevToolsLocale,
      },
    });
    // Record the intended locale, regardless whether we are able to fetch it or not.
    Host.userMetrics.language(devToolsLocale.locale);

    if (devToolsLocale.locale !== 'en-US') {
      // Always load en-US locale data as a fallback. This is important, newly added
      // strings won't have a translation. If fetching en-US.json fails, something
      // is seriously wrong and the exception should bubble up.
      await i18n.i18n.fetchAndRegisterLocaleData('en-US');
    }

    try {
      await i18n.i18n.fetchAndRegisterLocaleData(devToolsLocale.locale);
    } catch (error) {
      console.warn(
          `Unable to fetch & register locale data for '${devToolsLocale.locale}', falling back to 'en-US'. Cause: `,
          error);
      // Loading the actual locale data failed, tell DevTools to use 'en-US'.
      devToolsLocale.forceFallbackLocale();
    }
  }

  createSettings(prefs: {
    [x: string]: string,
  }): void {
    this.#initializeExperiments();
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
      const localbackingStore: Common.Settings.SettingsBackingStore = {
        ...Common.Settings.NOOP_STORAGE,
        clear: () => window.localStorage.clear(),
      };
      localStorage = new Common.Settings.SettingsStorage(window.localStorage, localbackingStore, storagePrefix);
    } else {
      localStorage = new Common.Settings.SettingsStorage({}, Common.Settings.NOOP_STORAGE, storagePrefix);
    }

    const hostUnsyncedStorage: Common.Settings.SettingsBackingStore = {
      register: (name: string) =>
          Host.InspectorFrontendHost.InspectorFrontendHostInstance.registerPreference(name, {synced: false}),
      set: Host.InspectorFrontendHost.InspectorFrontendHostInstance.setPreference,
      get: (name: string) => {
        return new Promise(resolve => {
          Host.InspectorFrontendHost.InspectorFrontendHostInstance.getPreference(name, resolve);
        });
      },
      remove: Host.InspectorFrontendHost.InspectorFrontendHostInstance.removePreference,
      clear: Host.InspectorFrontendHost.InspectorFrontendHostInstance.clearPreferences,
    };
    const hostSyncedStorage: Common.Settings.SettingsBackingStore = {
      ...hostUnsyncedStorage,
      register: (name: string) =>
          Host.InspectorFrontendHost.InspectorFrontendHostInstance.registerPreference(name, {synced: true}),
    };
    // `prefs` is retrieved via `getPreferences` host binding and contains both synced and unsynced settings.
    // As such, we use `prefs` to initialize both the synced and the global storage. This is fine as an individual
    // setting can't change storage buckets during a single DevTools session.
    const syncedStorage = new Common.Settings.SettingsStorage(prefs, hostSyncedStorage, storagePrefix);
    const globalStorage = new Common.Settings.SettingsStorage(prefs, hostUnsyncedStorage, storagePrefix);
    Common.Settings.Settings.instance({forceNew: true, syncedStorage, globalStorage, localStorage});

    // @ts-ignore layout test global
    self.Common.settings = Common.Settings.Settings.instance();

    if (!Host.InspectorFrontendHost.isUnderTest()) {
      new Common.Settings.VersionController().updateVersion();
    }
  }

  #initializeExperiments(): void {
    Root.Runtime.experiments.register('applyCustomStylesheet', 'Allow extensions to load custom stylesheets');
    Root.Runtime.experiments.register('captureNodeCreationStacks', 'Capture node creation stacks');
    Root.Runtime.experiments.register('sourcesPrettyPrint', 'Automatically pretty print minified sources');
    Root.Runtime.experiments.register(
        'ignoreListJSFramesOnTimeline', 'Ignore List for JavaScript frames on Timeline', true);
    Root.Runtime.experiments.register('liveHeapProfile', 'Live heap profile', true);
    Root.Runtime.experiments.register(
        'protocolMonitor', 'Protocol Monitor', undefined,
        'https://developer.chrome.com/blog/new-in-devtools-92/#protocol-monitor');
    Root.Runtime.experiments.register('developerResourcesView', 'Show developer resources view');
    Root.Runtime.experiments.register(
        'cspViolationsView', 'Show CSP Violations view', undefined,
        'https://developer.chrome.com/blog/new-in-devtools-89/#csp');
    Root.Runtime.experiments.register('samplingHeapProfilerTimeline', 'Sampling heap profiler timeline', true);
    Root.Runtime.experiments.register(
        'showOptionToExposeInternalsInHeapSnapshot', 'Show option to expose internals in heap snapshots');
    Root.Runtime.experiments.register(
        'sourceOrderViewer', 'Source order viewer', undefined,
        'https://developer.chrome.com/blog/new-in-devtools-92/#source-order');
    Root.Runtime.experiments.register('webauthnPane', 'WebAuthn Pane');
    Root.Runtime.experiments.register(
        'keyboardShortcutEditor', 'Enable keyboard shortcut editor', false,
        'https://developer.chrome.com/blog/new-in-devtools-88/#keyboard-shortcuts');

    // Back/forward cache
    Root.Runtime.experiments.register(
        'bfcacheDisplayTree', 'Show back/forward cache blocking reasons in the frame tree structure view');

    // Timeline
    Root.Runtime.experiments.register('timelineEventInitiators', 'Timeline: event initiators');
    Root.Runtime.experiments.register('timelineInvalidationTracking', 'Timeline: invalidation tracking', true);
    Root.Runtime.experiments.register('timelineShowAllEvents', 'Timeline: show all events', true);
    Root.Runtime.experiments.register(
        'timelineV8RuntimeCallStats', 'Timeline: V8 Runtime Call Stats on Timeline', true);
    Root.Runtime.experiments.register(
        'timelineAsConsoleProfileResultPanel', 'View console.profile() results in the Performance panel for Node.js',
        true);

    // Debugging
    Root.Runtime.experiments.register(
        'wasmDWARFDebugging', 'WebAssembly Debugging: Enable DWARF support', undefined,
        'https://developer.chrome.com/blog/wasm-debugging-2020/');
    Root.Runtime.experiments.register(
        'evaluateExpressionsWithSourceMaps', 'Resolve variable names in expressions using source maps', undefined);
    Root.Runtime.experiments.register('instrumentationBreakpoints', 'Enable instrumentation breakpoints', true);
    Root.Runtime.experiments.register('setAllBreakpointsEagerly', 'Set all breakpoints eagerly at startup', true);

    // Dual-screen
    Root.Runtime.experiments.register(
        'dualScreenSupport', 'Emulation: Support dual screen mode', undefined,
        'https://developer.chrome.com/blog/new-in-devtools-89#dual-screen');
    Root.Runtime.experiments.setEnabled('dualScreenSupport', true);

    // Advanced Perceptual Contrast Algorithm.
    Root.Runtime.experiments.register(
        'APCA',
        'Enable new Advanced Perceptual Contrast Algorithm (APCA) replacing previous contrast ratio and AA/AAA guidelines',
        undefined, 'https://developer.chrome.com/blog/new-in-devtools-89/#apca');

    // Full Accessibility Tree
    Root.Runtime.experiments.register(
        'fullAccessibilityTree', 'Enable full accessibility tree view in the Elements panel', undefined,
        'https://developer.chrome.com/blog/new-in-devtools-90/#accesibility-tree',
        'https://g.co/devtools/a11y-tree-feedback');

    // Font Editor
    Root.Runtime.experiments.register(
        'fontEditor', 'Enable new Font Editor tool within the Styles Pane.', undefined,
        'https://developer.chrome.com/blog/new-in-devtools-89/#font');

    // Contrast issues reported via the Issues panel.
    Root.Runtime.experiments.register(
        'contrastIssues', 'Enable automatic contrast issue reporting via the Issues panel', undefined,
        'https://developer.chrome.com/blog/new-in-devtools-90/#low-contrast');

    // New cookie features.
    Root.Runtime.experiments.register('experimentalCookieFeatures', 'Enable experimental cookie features');

    // CSS <length> authoring tool.
    Root.Runtime.experiments.register(
        'cssTypeComponentLength', 'Enable CSS <length> authoring tool in the Styles pane', undefined,
        'https://developer.chrome.com/blog/new-in-devtools-96/#length', 'https://g.co/devtools/length-feedback');

    // Display precise changes in the Changes tab.
    Root.Runtime.experiments.register(
        Root.Runtime.ExperimentName.PRECISE_CHANGES, 'Display more precise changes in the Changes tab');

    // Integrate CSS changes in the Styles pane.
    Root.Runtime.experiments.register(
        Root.Runtime.ExperimentName.STYLES_PANE_CSS_CHANGES, 'Sync CSS changes in the Styles pane');

    // Highlights a violating node or attribute by rendering a squiggly line under it and adding a tooltip linking to the issues panel.
    // Right now violating nodes are exclusively form fields that contain an HTML issue, for example, and <input /> whose id is duplicate inside the form.
    Root.Runtime.experiments.register(
        Root.Runtime.ExperimentName.HIGHLIGHT_ERRORS_ELEMENTS_PANEL,
        'Highlights a violating node or attribute in the Elements panel DOM tree');

    // Local overrides for response headers
    Root.Runtime.experiments.register(
        Root.Runtime.ExperimentName.HEADER_OVERRIDES, 'Local overrides for response headers');

    // Enable color picking outside the browser window (using Eyedropper API)
    Root.Runtime.experiments.register(
        Root.Runtime.ExperimentName.EYEDROPPER_COLOR_PICKER, 'Enable color picking outside the browser window');

    // Change grouping of sources panel to use Authored/Deployed trees
    Root.Runtime.experiments.register(
        Root.Runtime.ExperimentName.AUTHORED_DEPLOYED_GROUPING, 'Group sources into Authored and Deployed trees',
        undefined, 'https://goo.gle/authored-deployed', 'https://goo.gle/authored-deployed-feedback');

    // Hide third party code (as determined by ignore lists or source maps)
    Root.Runtime.experiments.register(
        Root.Runtime.ExperimentName.JUST_MY_CODE, 'Hide ignore-listed code in sources tree view');

    // Highlight important DOM properties in the Object Properties viewer.
    Root.Runtime.experiments.register(
        Root.Runtime.ExperimentName.IMPORTANT_DOM_PROPERTIES,
        'Highlight important DOM properties in the Object Properties viewer');

    Root.Runtime.experiments.register(
        Root.Runtime.ExperimentName.PRELOADING_STATUS_PANEL, 'Enable Preloading Status Panel in Application panel',
        true);

    Root.Runtime.experiments.register(
        Root.Runtime.ExperimentName.DISABLE_COLOR_FORMAT_SETTING,
        // Adding the reload hint here because users getting here are likely coming from inside the settings UI, but the regular reminder bar is only shown after the UI is closed which they're not going to see.
        'Disable the deprecated `Color format` setting (requires reloading DevTools)', false);

    Root.Runtime.experiments.register(
        Root.Runtime.ExperimentName.OUTERMOST_TARGET_SELECTOR,
        'Enable background page selector (e.g. for prerendering debugging)', false);

    Root.Runtime.experiments.enableExperimentsByDefault([
      'sourceOrderViewer',
      'cssTypeComponentLength',
      Root.Runtime.ExperimentName.PRECISE_CHANGES,
      ...('EyeDropper' in window ? [Root.Runtime.ExperimentName.EYEDROPPER_COLOR_PICKER] : []),
      'keyboardShortcutEditor',
      'sourcesPrettyPrint',
      Root.Runtime.ExperimentName.DISABLE_COLOR_FORMAT_SETTING,
      Root.Runtime.ExperimentName.TIMELINE_AS_CONSOLE_PROFILE_RESULT_PANEL,
      Root.Runtime.ExperimentName.WASM_DWARF_DEBUGGING,
      Root.Runtime.ExperimentName.HEADER_OVERRIDES,
    ]);

    Root.Runtime.experiments.setNonConfigurableExperiments([
      ...(!('EyeDropper' in window) ? [Root.Runtime.ExperimentName.EYEDROPPER_COLOR_PICKER] : []),
    ]);

    Root.Runtime.experiments.cleanUpStaleExperiments();
    const enabledExperiments = Root.Runtime.Runtime.queryParam('enabledExperiments');
    if (enabledExperiments) {
      Root.Runtime.experiments.setServerEnabledExperiments(enabledExperiments.split(';'));
    }
    Root.Runtime.experiments.enableExperimentsTransiently([
      'bfcacheDisplayTree',
      'webauthnPane',
      'developerResourcesView',
    ]);

    if (Host.InspectorFrontendHost.isUnderTest()) {
      const testParam = Root.Runtime.Runtime.queryParam('test');
      if (testParam && testParam.includes('live-line-level-heap-profile.js')) {
        Root.Runtime.experiments.enableForTest('liveHeapProfile');
      }
    }

    for (const experiment of Root.Runtime.experiments.enabledExperiments()) {
      Host.userMetrics.experimentEnabledAtLaunch(experiment.name);
    }
  }
  async #createAppUI(): Promise<void> {
    MainImpl.time('Main._createAppUI');

    // @ts-ignore layout test global
    self.UI.viewManager = UI.ViewManager.ViewManager.instance();

    // Request filesystems early, we won't create connections until callback is fired. Things will happen in parallel.
    // @ts-ignore layout test global
    self.Persistence.isolatedFileSystemManager =
        Persistence.IsolatedFileSystemManager.IsolatedFileSystemManager.instance();

    const defaultThemeSetting = 'systemPreferred';
    const themeSetting = Common.Settings.Settings.instance().createSetting('uiTheme', defaultThemeSetting);
    UI.UIUtils.initializeUIUtils(document);

    // Initialize theme support and apply it.
    if (!ThemeSupport.ThemeSupport.hasInstance()) {
      ThemeSupport.ThemeSupport.instance({forceNew: true, setting: themeSetting});
    }

    ThemeSupport.ThemeSupport.instance().applyTheme(document);

    const onThemeChange = (): void => {
      ThemeSupport.ThemeSupport.instance().applyTheme(document);
    };

    // When the theme changes we instantiate a new theme support and reapply.
    // Equally if the user has set to match the system and the OS preference changes
    // we perform the same change.
    const darkThemeMediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    const highContrastMediaQuery = window.matchMedia('(forced-colors: active)');
    darkThemeMediaQuery.addEventListener('change', onThemeChange);
    highContrastMediaQuery.addEventListener('change', onThemeChange);
    themeSetting.addChangeListener(onThemeChange);

    UI.UIUtils.installComponentRootStyles((document.body as Element));

    this.#addMainEventListeners(document);

    const canDock = Boolean(Root.Runtime.Runtime.queryParam('can_dock'));
    // @ts-ignore layout test global
    self.UI.zoomManager = UI.ZoomManager.ZoomManager.instance(
        {forceNew: true, win: window, frontendHost: Host.InspectorFrontendHost.InspectorFrontendHostInstance});
    // @ts-ignore layout test global
    self.UI.inspectorView = UI.InspectorView.InspectorView.instance();
    UI.ContextMenu.ContextMenu.initialize();
    UI.ContextMenu.ContextMenu.installHandler(document);

    // These instances need to be created early so they don't miss any events about requests/issues/etc.
    Logs.NetworkLog.NetworkLog.instance();
    SDK.FrameManager.FrameManager.instance();
    Logs.LogManager.LogManager.instance();
    IssuesManager.IssuesManager.IssuesManager.instance({
      forceNew: true,
      ensureFirst: true,
      showThirdPartyIssuesSetting: IssuesManager.Issue.getShowThirdPartyIssuesSetting(),
      hideIssueSetting: IssuesManager.IssuesManager.getHideIssueByCodeSetting(),
    });
    IssuesManager.ContrastCheckTrigger.ContrastCheckTrigger.instance();

    // @ts-ignore layout test global
    self.UI.dockController = UI.DockController.DockController.instance({forceNew: true, canDock});
    // @ts-ignore layout test global
    self.SDK.multitargetNetworkManager = SDK.NetworkManager.MultitargetNetworkManager.instance({forceNew: true});
    // @ts-ignore layout test global
    self.SDK.domDebuggerManager = SDK.DOMDebuggerModel.DOMDebuggerManager.instance({forceNew: true});
    SDK.TargetManager.TargetManager.instance().addEventListener(
        SDK.TargetManager.Events.SuspendStateChanged, this.#onSuspendStateChanged.bind(this));

    // @ts-ignore layout test global
    self.Workspace.fileManager = Workspace.FileManager.FileManager.instance({forceNew: true});
    // @ts-ignore layout test global
    self.Workspace.workspace = Workspace.Workspace.WorkspaceImpl.instance();

    // @ts-ignore layout test global
    self.Bindings.networkProjectManager = Bindings.NetworkProject.NetworkProjectManager.instance();
    const resourceMapping = new Bindings.ResourceMapping.ResourceMapping(
        SDK.TargetManager.TargetManager.instance(),
        Workspace.Workspace.WorkspaceImpl.instance(),
    );
    // @ts-ignore layout test global
    self.Bindings.resourceMapping = resourceMapping;
    new Bindings.PresentationConsoleMessageHelper.PresentationConsoleMessageManager();
    // @ts-ignore layout test global
    self.Bindings.cssWorkspaceBinding = Bindings.CSSWorkspaceBinding.CSSWorkspaceBinding.instance({
      forceNew: true,
      resourceMapping,
      targetManager: SDK.TargetManager.TargetManager.instance(),
    });
    // @ts-ignore layout test global
    self.Bindings.debuggerWorkspaceBinding = Bindings.DebuggerWorkspaceBinding.DebuggerWorkspaceBinding.instance({
      forceNew: true,
      resourceMapping,
      targetManager: SDK.TargetManager.TargetManager.instance(),
    });
    SDK.TargetManager.TargetManager.instance().setScopeTarget(
        SDK.TargetManager.TargetManager.instance().primaryPageTarget());
    UI.Context.Context.instance().addFlavorChangeListener(SDK.Target.Target, ({data}) => {
      const outermostTarget = data?.outermostTarget();
      SDK.TargetManager.TargetManager.instance().setScopeTarget(outermostTarget);
    });
    // @ts-ignore layout test global
    self.Bindings.breakpointManager = Breakpoints.BreakpointManager.BreakpointManager.instance({
      forceNew: true,
      workspace: Workspace.Workspace.WorkspaceImpl.instance(),
      targetManager: SDK.TargetManager.TargetManager.instance(),
      debuggerWorkspaceBinding: Bindings.DebuggerWorkspaceBinding.DebuggerWorkspaceBinding.instance(),
    });
    // @ts-ignore layout test global
    self.Extensions.extensionServer = Extensions.ExtensionServer.ExtensionServer.instance({forceNew: true});

    new Persistence.FileSystemWorkspaceBinding.FileSystemWorkspaceBinding(
        Persistence.IsolatedFileSystemManager.IsolatedFileSystemManager.instance(),
        Workspace.Workspace.WorkspaceImpl.instance());
    Persistence.IsolatedFileSystemManager.IsolatedFileSystemManager.instance().addPlatformFileSystem(
        // @ts-ignore https://github.com/microsoft/TypeScript/issues/41397
        'snippet://', new Snippets.ScriptSnippetFileSystem.SnippetFileSystem());

    // @ts-ignore layout test global
    self.Persistence.persistence = Persistence.Persistence.PersistenceImpl.instance({
      forceNew: true,
      workspace: Workspace.Workspace.WorkspaceImpl.instance(),
      breakpointManager: Breakpoints.BreakpointManager.BreakpointManager.instance(),
    });
    // @ts-ignore layout test global
    self.Persistence.networkPersistenceManager =
        Persistence.NetworkPersistenceManager.NetworkPersistenceManager.instance(
            {forceNew: true, workspace: Workspace.Workspace.WorkspaceImpl.instance()});
    // @ts-ignore layout test global
    self.Host.Platform = Host.Platform;

    new ExecutionContextSelector(SDK.TargetManager.TargetManager.instance(), UI.Context.Context.instance());
    // @ts-ignore layout test global
    self.Bindings.ignoreListManager = Bindings.IgnoreListManager.IgnoreListManager.instance({
      forceNew: true,
      debuggerWorkspaceBinding: Bindings.DebuggerWorkspaceBinding.DebuggerWorkspaceBinding.instance(),
    });

    new PauseListener();

    const actionRegistryInstance = UI.ActionRegistry.ActionRegistry.instance({forceNew: true});
    // Required for legacy a11y layout tests
    // @ts-ignore layout test global
    self.UI.actionRegistry = actionRegistryInstance;
    // @ts-ignore layout test global
    self.UI.shortcutRegistry =
        UI.ShortcutRegistry.ShortcutRegistry.instance({forceNew: true, actionRegistry: actionRegistryInstance});
    this.#registerMessageSinkListener();

    MainImpl.timeEnd('Main._createAppUI');

    const appProvider = Common.AppProvider.getRegisteredAppProviders()[0];
    if (!appProvider) {
      throw new Error('Unable to boot DevTools, as the appprovider is missing');
    }
    await this.#showAppUI(await appProvider.loadAppProvider());
  }

  async #showAppUI(appProvider: Object): Promise<void> {
    MainImpl.time('Main._showAppUI');
    const app = (appProvider as Common.AppProvider.AppProvider).createApp();
    // It is important to kick controller lifetime after apps are instantiated.
    UI.DockController.DockController.instance().initialize();
    app.presentUI(document);

    const toggleSearchNodeAction = UI.ActionRegistry.ActionRegistry.instance().action('elements.toggle-element-search');
    // TODO: we should not access actions from other modules.
    if (toggleSearchNodeAction) {
      Host.InspectorFrontendHost.InspectorFrontendHostInstance.events.addEventListener(
          Host.InspectorFrontendHostAPI.Events.EnterInspectElementMode, () => {
            void toggleSearchNodeAction.execute();
          }, this);
    }
    Host.InspectorFrontendHost.InspectorFrontendHostInstance.events.addEventListener(
        Host.InspectorFrontendHostAPI.Events.RevealSourceLine, this.#revealSourceLine, this);

    await UI.InspectorView.InspectorView.instance().createToolbars();
    Host.InspectorFrontendHost.InspectorFrontendHostInstance.loadCompleted();

    const value = Root.Runtime.Runtime.queryParam('loadTimelineFromURL');
    if (value !== null) {
      Timeline.TimelinePanel.LoadTimelineHandler.instance().handleQueryParam(value);
    }

    // Initialize ARIAUtils.alert Element
    UI.ARIAUtils.alertElementInstance();
    UI.DockController.DockController.instance().announceDockLocation();

    // Allow UI cycles to repaint prior to creating connection.
    window.setTimeout(this.#initializeTarget.bind(this), 0);
    MainImpl.timeEnd('Main._showAppUI');
  }

  async #initializeTarget(): Promise<void> {
    MainImpl.time('Main._initializeTarget');

    // We rely on having the early initialization runnables registered in Common when an app loads its
    // modules, so that we don't have to exhaustively check the app DevTools is running as to
    // start the applicable runnables.
    for (const runnableInstanceFunction of Common.Runnable.earlyInitializationRunnables()) {
      await runnableInstanceFunction().run();
    }
    // Used for browser tests.
    Host.InspectorFrontendHost.InspectorFrontendHostInstance.readyForTest();
    this.#resolveReadyForTestPromise();
    // Asynchronously run the extensions.
    window.setTimeout(this.#lateInitialization.bind(this), 100);
    MainImpl.timeEnd('Main._initializeTarget');
  }

  #lateInitialization(): void {
    MainImpl.time('Main._lateInitialization');
    Extensions.ExtensionServer.ExtensionServer.instance().initializeExtensions();
    const promises: Promise<void>[] =
        Common.Runnable.lateInitializationRunnables().map(async lateInitializationLoader => {
          const runnable = await lateInitializationLoader();
          return runnable.run();
        });
    if (Root.Runtime.experiments.isEnabled('liveHeapProfile')) {
      const setting = 'memoryLiveHeapProfile';
      if (Common.Settings.Settings.instance().moduleSetting(setting).get()) {
        promises.push(PerfUI.LiveHeapProfile.LiveHeapProfile.instance().run());
      } else {
        const changeListener = async(event: Common.EventTarget.EventTargetEvent<unknown>): Promise<void> => {
          if (!event.data) {
            return;
          }
          Common.Settings.Settings.instance().moduleSetting(setting).removeChangeListener(changeListener);
          void PerfUI.LiveHeapProfile.LiveHeapProfile.instance().run();
        };
        Common.Settings.Settings.instance().moduleSetting(setting).addChangeListener(changeListener);
      }
    }
    this.#lateInitDonePromise = Promise.all(promises).then(() => undefined);
    MainImpl.timeEnd('Main._lateInitialization');
  }

  lateInitDonePromiseForTest(): Promise<void>|null {
    return this.#lateInitDonePromise;
  }

  readyForTest(): Promise<void> {
    return this.#readyForTestPromise;
  }

  #registerMessageSinkListener(): void {
    Common.Console.Console.instance().addEventListener(Common.Console.Events.MessageAdded, messageAdded);

    function messageAdded({data: message}: Common.EventTarget.EventTargetEvent<Common.Console.Message>): void {
      if (message.show) {
        Common.Console.Console.instance().show();
      }
    }
  }

  #revealSourceLine(event: Common.EventTarget.EventTargetEvent<Host.InspectorFrontendHostAPI.RevealSourceLineEvent>):
      void {
    const {url, lineNumber, columnNumber} = event.data;
    const uiSourceCode = Workspace.Workspace.WorkspaceImpl.instance().uiSourceCodeForURL(url);
    if (uiSourceCode) {
      void Common.Revealer.reveal(uiSourceCode.uiLocation(lineNumber, columnNumber));
      return;
    }

    function listener(event: Common.EventTarget.EventTargetEvent<Workspace.UISourceCode.UISourceCode>): void {
      const uiSourceCode = event.data;
      if (uiSourceCode.url() === url) {
        void Common.Revealer.reveal(uiSourceCode.uiLocation(lineNumber, columnNumber));
        Workspace.Workspace.WorkspaceImpl.instance().removeEventListener(
            Workspace.Workspace.Events.UISourceCodeAdded, listener);
      }
    }

    Workspace.Workspace.WorkspaceImpl.instance().addEventListener(
        Workspace.Workspace.Events.UISourceCodeAdded, listener);
  }

  #postDocumentKeyDown(event: Event): void {
    if (!event.handled) {
      UI.ShortcutRegistry.ShortcutRegistry.instance().handleShortcut((event as KeyboardEvent));
    }
  }

  #redispatchClipboardEvent(event: Event): void {
    const eventCopy = new CustomEvent('clipboard-' + event.type, {bubbles: true});
    // @ts-ignore Used in ElementsTreeOutline
    eventCopy['original'] = event;
    const document = event.target && (event.target as HTMLElement).ownerDocument;
    const target = document ? Platform.DOMUtilities.deepActiveElement(document) : null;
    if (target) {
      target.dispatchEvent(eventCopy);
    }
    if (eventCopy.handled) {
      event.preventDefault();
    }
  }

  #contextMenuEventFired(event: Event): void {
    if (event.handled || (event.target as HTMLElement).classList.contains('popup-glasspane')) {
      event.preventDefault();
    }
  }

  #addMainEventListeners(document: Document): void {
    document.addEventListener('keydown', this.#postDocumentKeyDown.bind(this), false);
    document.addEventListener('beforecopy', this.#redispatchClipboardEvent.bind(this), true);
    document.addEventListener('copy', this.#redispatchClipboardEvent.bind(this), false);
    document.addEventListener('cut', this.#redispatchClipboardEvent.bind(this), false);
    document.addEventListener('paste', this.#redispatchClipboardEvent.bind(this), false);
    document.addEventListener('contextmenu', this.#contextMenuEventFired.bind(this), true);
  }

  #onSuspendStateChanged(): void {
    const suspended = SDK.TargetManager.TargetManager.instance().allTargetsSuspended();
    UI.InspectorView.InspectorView.instance().onSuspendStateChanged(suspended);
  }

  static instanceForTest: MainImpl|null = null;
}

// @ts-ignore Exported for Tests.js
globalThis.Main = globalThis.Main || {};
// @ts-ignore Exported for Tests.js
globalThis.Main.Main = MainImpl;

let zoomActionDelegateInstance: ZoomActionDelegate;

export class ZoomActionDelegate implements UI.ActionRegistration.ActionDelegate {
  static instance(opts: {
    forceNew: boolean|null,
  } = {forceNew: null}): ZoomActionDelegate {
    const {forceNew} = opts;
    if (!zoomActionDelegateInstance || forceNew) {
      zoomActionDelegateInstance = new ZoomActionDelegate();
    }

    return zoomActionDelegateInstance;
  }

  handleAction(context: UI.Context.Context, actionId: string): boolean {
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

let searchActionDelegateInstance: SearchActionDelegate;

export class SearchActionDelegate implements UI.ActionRegistration.ActionDelegate {
  static instance(opts: {
    forceNew: boolean|null,
  } = {forceNew: null}): SearchActionDelegate {
    const {forceNew} = opts;
    if (!searchActionDelegateInstance || forceNew) {
      searchActionDelegateInstance = new SearchActionDelegate();
    }

    return searchActionDelegateInstance;
  }

  handleAction(context: UI.Context.Context, actionId: string): boolean {
    let searchableView = UI.SearchableView.SearchableView.fromElement(
        Platform.DOMUtilities.deepActiveElement(document),
    );
    if (!searchableView) {
      const currentPanel = (UI.InspectorView.InspectorView.instance().currentPanelDeprecated() as UI.Panel.Panel);
      if (currentPanel && currentPanel.searchableView) {
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
let mainMenuItemInstance: MainMenuItem;

export class MainMenuItem implements UI.Toolbar.Provider {
  readonly #itemInternal: UI.Toolbar.ToolbarMenuButton;
  constructor() {
    this.#itemInternal = new UI.Toolbar.ToolbarMenuButton(this.#handleContextMenu.bind(this), true);
    this.#itemInternal.element.classList.add('main-menu');
    this.#itemInternal.setTitle(i18nString(UIStrings.customizeAndControlDevtools));
  }

  static instance(opts: {
    forceNew: boolean|null,
  } = {forceNew: null}): MainMenuItem {
    const {forceNew} = opts;
    if (!mainMenuItemInstance || forceNew) {
      mainMenuItemInstance = new MainMenuItem();
    }

    return mainMenuItemInstance;
  }

  item(): UI.Toolbar.ToolbarItem|null {
    return this.#itemInternal;
  }

  #handleContextMenu(contextMenu: UI.ContextMenu.ContextMenu): void {
    if (UI.DockController.DockController.instance().canDock()) {
      const dockItemElement = document.createElement('div');
      dockItemElement.classList.add('flex-centered');
      dockItemElement.classList.add('flex-auto');
      dockItemElement.classList.add('location-menu');
      dockItemElement.tabIndex = -1;
      UI.ARIAUtils.setLabel(dockItemElement, UIStrings.dockSide + UIStrings.dockSideNaviation);
      const titleElement = dockItemElement.createChild('span', 'dockside-title');
      titleElement.textContent = i18nString(UIStrings.dockSide);
      const toggleDockSideShorcuts =
          UI.ShortcutRegistry.ShortcutRegistry.instance().shortcutsForAction('main.toggle-dock');
      UI.Tooltip.Tooltip.install(
          titleElement,
          i18nString(UIStrings.placementOfDevtoolsRelativeToThe, {PH1: toggleDockSideShorcuts[0].title()}));
      dockItemElement.appendChild(titleElement);
      const dockItemToolbar = new UI.Toolbar.Toolbar('', dockItemElement);
      dockItemToolbar.makeBlueOnHover();
      const undock = new UI.Toolbar.ToolbarToggle(i18nString(UIStrings.undockIntoSeparateWindow), 'dock-window');
      const bottom = new UI.Toolbar.ToolbarToggle(i18nString(UIStrings.dockToBottom), 'dock-bottom');
      const right = new UI.Toolbar.ToolbarToggle(i18nString(UIStrings.dockToRight), 'dock-right');
      const left = new UI.Toolbar.ToolbarToggle(i18nString(UIStrings.dockToLeft), 'dock-left');
      undock.addEventListener(UI.Toolbar.ToolbarButton.Events.MouseDown, event => event.data.consume());
      bottom.addEventListener(UI.Toolbar.ToolbarButton.Events.MouseDown, event => event.data.consume());
      right.addEventListener(UI.Toolbar.ToolbarButton.Events.MouseDown, event => event.data.consume());
      left.addEventListener(UI.Toolbar.ToolbarButton.Events.MouseDown, event => event.data.consume());
      undock.addEventListener(
          UI.Toolbar.ToolbarButton.Events.Click, setDockSide.bind(null, UI.DockController.DockState.UNDOCKED));
      bottom.addEventListener(
          UI.Toolbar.ToolbarButton.Events.Click, setDockSide.bind(null, UI.DockController.DockState.BOTTOM));
      right.addEventListener(
          UI.Toolbar.ToolbarButton.Events.Click, setDockSide.bind(null, UI.DockController.DockState.RIGHT));
      left.addEventListener(
          UI.Toolbar.ToolbarButton.Events.Click, setDockSide.bind(null, UI.DockController.DockState.LEFT));
      undock.setToggled(
          UI.DockController.DockController.instance().dockSide() === UI.DockController.DockState.UNDOCKED);
      bottom.setToggled(UI.DockController.DockController.instance().dockSide() === UI.DockController.DockState.BOTTOM);
      right.setToggled(UI.DockController.DockController.instance().dockSide() === UI.DockController.DockState.RIGHT);
      left.setToggled(UI.DockController.DockController.instance().dockSide() === UI.DockController.DockState.LEFT);
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
        } else if (event.key === 'ArrowDown') {
          const contextMenuElement = dockItemElement.closest('.soft-context-menu');
          contextMenuElement?.dispatchEvent(new KeyboardEvent('keydown', {key: 'ArrowDown'}));
          return;
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

    const button = (this.#itemInternal.element as HTMLButtonElement);

    function setDockSide(side: UI.DockController.DockState): void {
      void UI.DockController.DockController.instance().once(UI.DockController.Events.AfterDockSideChanged).then(() => {
        button.focus();
      });
      UI.DockController.DockController.instance().setDockSide(side);
      contextMenu.discard();
    }

    if (UI.DockController.DockController.instance().dockSide() === UI.DockController.DockState.UNDOCKED) {
      const mainTarget = SDK.TargetManager.TargetManager.instance().primaryPageTarget();
      if (mainTarget && mainTarget.type() === SDK.Target.Type.Frame) {
        contextMenu.defaultSection().appendAction('inspector_main.focus-debuggee', i18nString(UIStrings.focusDebuggee));
      }
    }

    contextMenu.defaultSection().appendAction(
        'main.toggle-drawer',
        UI.InspectorView.InspectorView.instance().drawerVisible() ? i18nString(UIStrings.hideConsoleDrawer) :
                                                                    i18nString(UIStrings.showConsoleDrawer));
    contextMenu.appendItemsAtLocation('mainMenu');
    const moreTools = contextMenu.defaultSection().appendSubMenuItem(i18nString(UIStrings.moreTools));
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
          void UI.ViewManager.ViewManager.instance().showView('issues-pane', /* userGesture */ true);
        });
        continue;
      }

      if (persistence !== 'closeable') {
        continue;
      }
      if (location !== 'drawer-view' && location !== 'panel') {
        continue;
      }

      if (viewExtension.isPreviewFeature()) {
        const previewIcon = new IconButton.Icon.Icon();
        previewIcon.data = {iconName: 'experiment', color: 'var(--icon-default)', width: '16px', height: '16px'};
        moreTools.defaultSection().appendItem(title, () => {
          void UI.ViewManager.ViewManager.instance().showView(id, true, false);
        }, /* disabled=*/ false, previewIcon);
        continue;
      }

      moreTools.defaultSection().appendItem(title, () => {
        void UI.ViewManager.ViewManager.instance().showView(id, true, false);
      });
    }

    const helpSubMenu = contextMenu.footerSection().appendSubMenuItem(i18nString(UIStrings.help));
    helpSubMenu.appendItemsAtLocation('mainMenuHelp');
  }
}

let settingsButtonProviderInstance: SettingsButtonProvider;

export class SettingsButtonProvider implements UI.Toolbar.Provider {
  readonly #settingsButton: UI.Toolbar.ToolbarButton;
  private constructor() {
    const settingsActionId = 'settings.show';
    this.#settingsButton =
        UI.Toolbar.Toolbar.createActionButtonForId(settingsActionId, {showLabel: false, userActionCode: undefined});
  }

  static instance(opts: {
    forceNew: boolean|null,
  } = {forceNew: null}): SettingsButtonProvider {
    const {forceNew} = opts;
    if (!settingsButtonProviderInstance || forceNew) {
      settingsButtonProviderInstance = new SettingsButtonProvider();
    }

    return settingsButtonProviderInstance;
  }

  item(): UI.Toolbar.ToolbarItem|null {
    return this.#settingsButton;
  }
}

export class PauseListener {
  constructor() {
    SDK.TargetManager.TargetManager.instance().addModelListener(
        SDK.DebuggerModel.DebuggerModel, SDK.DebuggerModel.Events.DebuggerPaused, this.#debuggerPaused, this);
  }

  #debuggerPaused(event: Common.EventTarget.EventTargetEvent<SDK.DebuggerModel.DebuggerModel>): void {
    SDK.TargetManager.TargetManager.instance().removeModelListener(
        SDK.DebuggerModel.DebuggerModel, SDK.DebuggerModel.Events.DebuggerPaused, this.#debuggerPaused, this);
    const debuggerModel = event.data;
    const debuggerPausedDetails = debuggerModel.debuggerPausedDetails();
    UI.Context.Context.instance().setFlavor(SDK.Target.Target, debuggerModel.target());
    void Common.Revealer.reveal(debuggerPausedDetails);
  }
}

export function sendOverProtocol(
    method: ProtocolClient.InspectorBackend.QualifiedName, params: Object|null): Promise<unknown[]|null> {
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

let reloadActionDelegateInstance: ReloadActionDelegate;

export class ReloadActionDelegate implements UI.ActionRegistration.ActionDelegate {
  static instance(opts: {
    forceNew: boolean|null,
  } = {forceNew: null}): ReloadActionDelegate {
    const {forceNew} = opts;
    if (!reloadActionDelegateInstance || forceNew) {
      reloadActionDelegateInstance = new ReloadActionDelegate();
    }

    return reloadActionDelegateInstance;
  }

  handleAction(context: UI.Context.Context, actionId: string): boolean {
    switch (actionId) {
      case 'main.debug-reload':
        Components.Reload.reload();
        return true;
    }
    return false;
  }
}
