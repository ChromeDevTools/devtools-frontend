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
import * as AutofillManager from '../../models/autofill_manager/autofill_manager.js';
import * as Bindings from '../../models/bindings/bindings.js';
import * as Breakpoints from '../../models/breakpoints/breakpoints.js';
import * as CrUXManager from '../../models/crux-manager/crux-manager.js';
import * as Extensions from '../../models/extensions/extensions.js';
import * as IssuesManager from '../../models/issues_manager/issues_manager.js';
import * as LiveMetrics from '../../models/live-metrics/live-metrics.js';
import * as Logs from '../../models/logs/logs.js';
import * as Persistence from '../../models/persistence/persistence.js';
import * as ProjectSettings from '../../models/project_settings/project_settings.js';
import * as Workspace from '../../models/workspace/workspace.js';
import * as Snippets from '../../panels/snippets/snippets.js';
import * as Buttons from '../../ui/components/buttons/buttons.js';
import * as IconButton from '../../ui/components/icon_button/icon_button.js';
import * as Components from '../../ui/legacy/components/utils/utils.js';
import * as UI from '../../ui/legacy/legacy.js';
import * as ThemeSupport from '../../ui/legacy/theme_support/theme_support.js';
import {html, render} from '../../ui/lit/lit.js';
import * as VisualLogging from '../../ui/visual_logging/visual_logging.js';

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
  focusDebuggee: 'Focus page',
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
} as const;
const str_ = i18n.i18n.registerUIStrings('entrypoints/main/MainImpl.ts', UIStrings);
const i18nString = i18n.i18n.getLocalizedString.bind(undefined, str_);

export class MainImpl {
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
    const [config, prefs] = await Promise.all([
      new Promise<Root.Runtime.HostConfig>(resolve => {
        Host.InspectorFrontendHost.InspectorFrontendHostInstance.getHostConfig(resolve);
      }),
      new Promise<{[key: string]: string}>(
          resolve => Host.InspectorFrontendHost.InspectorFrontendHostInstance.getPreferences(resolve)),
    ]);

    console.timeStamp('Main._gotPreferences');
    this.#initializeGlobalsForLayoutTests();
    Object.assign(Root.Runtime.hostConfig, config);
    this.createSettings(prefs);
    await this.requestAndRegisterLocaleData();

    Host.userMetrics.syncSetting(Common.Settings.Settings.instance().moduleSetting<boolean>('sync-preferences').get());
    const veLogging = config.devToolsVeLogging;
    if (veLogging?.enabled) {
      if (veLogging?.testing) {
        VisualLogging.setVeDebugLoggingEnabled(true, VisualLogging.DebugLoggingFormat.TEST);
        const options = {
          processingThrottler: new Common.Throttler.Throttler(0),
          keyboardLogThrottler: new Common.Throttler.Throttler(10),
          hoverLogThrottler: new Common.Throttler.Throttler(50),
          dragLogThrottler: new Common.Throttler.Throttler(50),
          clickLogThrottler: new Common.Throttler.Throttler(10),
          resizeLogThrottler: new Common.Throttler.Throttler(10),
        };
        void VisualLogging.startLogging(options);
      } else {
        void VisualLogging.startLogging();
      }
    }
    void this.#createAppUI();
  }

  #initializeGlobalsForLayoutTests(): void {
    // @ts-expect-error e2e test global
    self.Extensions ||= {};
    // @ts-expect-error e2e test global
    self.Host ||= {};
    // @ts-expect-error e2e test global
    self.Host.userMetrics ||= Host.userMetrics;
    // @ts-expect-error e2e test global
    self.Host.UserMetrics ||= Host.UserMetrics;
    // @ts-expect-error e2e test global
    self.ProtocolClient ||= {};
    // @ts-expect-error e2e test global
    self.ProtocolClient.test ||= ProtocolClient.InspectorBackend.test;
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

  createSettings(prefs: {[x: string]: string}): void {
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

    if (!Host.InspectorFrontendHost.isUnderTest()) {
      new Common.Settings.VersionController().updateVersion();
    }
  }

  #initializeExperiments(): void {
    Root.Runtime.experiments.register('capture-node-creation-stacks', 'Capture node creation stacks');
    Root.Runtime.experiments.register('live-heap-profile', 'Live heap profile', true);
    Root.Runtime.experiments.register(
        'protocol-monitor', 'Protocol Monitor', undefined,
        'https://developer.chrome.com/blog/new-in-devtools-92/#protocol-monitor');
    Root.Runtime.experiments.register('sampling-heap-profiler-timeline', 'Sampling heap profiler timeline', true);
    Root.Runtime.experiments.register(
        'show-option-tp-expose-internals-in-heap-snapshot', 'Show option to expose internals in heap snapshots');

    // Timeline
    Root.Runtime.experiments.register(
        'timeline-invalidation-tracking', 'Performance panel: invalidation tracking', true);
    Root.Runtime.experiments.register('timeline-show-all-events', 'Performance panel: show all events', true);
    Root.Runtime.experiments.register(
        'timeline-v8-runtime-call-stats', 'Performance panel: V8 runtime call stats', true);
    Root.Runtime.experiments.register(
        'timeline-enhanced-traces', 'Performance panel: Enable collecting enhanced traces', true);
    Root.Runtime.experiments.register(
        'timeline-compiled-sources', 'Performance panel: Enable collecting source text for compiled script', true);
    Root.Runtime.experiments.register(
        Root.Runtime.ExperimentName.TIMELINE_DEBUG_MODE,
        'Performance panel: Enable debug mode (trace event details, etc)', true);

    // Debugging
    Root.Runtime.experiments.register('instrumentation-breakpoints', 'Enable instrumentation breakpoints', true);
    Root.Runtime.experiments.register('use-source-map-scopes', 'Use scope information from source maps', true);

    // Advanced Perceptual Contrast Algorithm.
    Root.Runtime.experiments.register(
        'apca',
        'Enable new Advanced Perceptual Contrast Algorithm (APCA) replacing previous contrast ratio and AA/AAA guidelines',
        undefined, 'https://developer.chrome.com/blog/new-in-devtools-89/#apca');

    // Full Accessibility Tree
    Root.Runtime.experiments.register(
        'full-accessibility-tree', 'Enable full accessibility tree view in the Elements panel', undefined,
        'https://developer.chrome.com/blog/new-in-devtools-90/#accesibility-tree',
        'https://g.co/devtools/a11y-tree-feedback');

    // Font Editor
    Root.Runtime.experiments.register(
        'font-editor', 'Enable new font editor within the Styles tab', undefined,
        'https://developer.chrome.com/blog/new-in-devtools-89/#font');

    // Contrast issues reported via the Issues panel.
    Root.Runtime.experiments.register(
        'contrast-issues', 'Enable automatic contrast issue reporting via the Issues panel', undefined,
        'https://developer.chrome.com/blog/new-in-devtools-90/#low-contrast');

    // New cookie features.
    Root.Runtime.experiments.register('experimental-cookie-features', 'Enable experimental cookie features');

    // Integrate CSS changes in the Styles pane.
    Root.Runtime.experiments.register(
        Root.Runtime.ExperimentName.STYLES_PANE_CSS_CHANGES, 'Sync CSS changes in the Styles tab');

    // Highlights a violating node or attribute by rendering a squiggly line under it and adding a tooltip linking to the issues panel.
    // Right now violating nodes are exclusively form fields that contain an HTML issue, for example, and <input /> whose id is duplicate inside the form.
    Root.Runtime.experiments.register(
        Root.Runtime.ExperimentName.HIGHLIGHT_ERRORS_ELEMENTS_PANEL,
        'Highlights a violating node or attribute in the Elements panel DOM tree');

    // Change grouping of sources panel to use Authored/Deployed trees
    Root.Runtime.experiments.register(
        Root.Runtime.ExperimentName.AUTHORED_DEPLOYED_GROUPING, 'Group sources into authored and deployed trees',
        undefined, 'https://goo.gle/authored-deployed', 'https://goo.gle/authored-deployed-feedback');

    // Hide third party code (as determined by ignore lists or source maps)
    Root.Runtime.experiments.register(
        Root.Runtime.ExperimentName.JUST_MY_CODE, 'Hide ignore-listed code in Sources tree view');

    Root.Runtime.experiments.register(
        Root.Runtime.ExperimentName.NETWORK_PANEL_FILTER_BAR_REDESIGN,
        'Redesign of the filter bar in the Network panel',
        false,
        'https://goo.gle/devtools-network-filter-redesign',
        'https://crbug.com/1500573',
    );

    Root.Runtime.experiments.register(
        Root.Runtime.ExperimentName.AUTOFILL_VIEW,
        'Autofill panel',
        false,
        'https://goo.gle/devtools-autofill-panel',
        'https://crbug.com/329106326',
    );

    Root.Runtime.experiments.register(
        Root.Runtime.ExperimentName.TIMELINE_SHOW_POST_MESSAGE_EVENTS,
        'Performance panel: show postMessage dispatch and handling flows',
    );

    Root.Runtime.experiments.register(
        Root.Runtime.ExperimentName.TIMELINE_SERVER_TIMINGS,
        'Performance panel: enable server timings in the timeline',
    );

    Root.Runtime.experiments.register(
        Root.Runtime.ExperimentName.FLOATING_ENTRY_POINTS_FOR_AI_ASSISTANCE,
        'Floating entry points for the AI assistance panel');

    Root.Runtime.experiments.register(
        Root.Runtime.ExperimentName.TIMELINE_EXPERIMENTAL_INSIGHTS,
        'Performance panel: enable experimental performance insights',
    );

    Root.Runtime.experiments.register(
        Root.Runtime.ExperimentName.TIMELINE_DIM_UNRELATED_EVENTS,
        'Performance panel: enable dimming unrelated events in performance insights and search results',
    );

    Root.Runtime.experiments.register(
        Root.Runtime.ExperimentName.TIMELINE_ALTERNATIVE_NAVIGATION,
        'Performance panel: enable a switch to an alternative timeline navigation option',
    );

    Root.Runtime.experiments.enableExperimentsByDefault([
      Root.Runtime.ExperimentName.AUTOFILL_VIEW,
      Root.Runtime.ExperimentName.NETWORK_PANEL_FILTER_BAR_REDESIGN,
      Root.Runtime.ExperimentName.FLOATING_ENTRY_POINTS_FOR_AI_ASSISTANCE,
      Root.Runtime.ExperimentName.TIMELINE_ALTERNATIVE_NAVIGATION,
      Root.Runtime.ExperimentName.TIMELINE_DIM_UNRELATED_EVENTS,
      Root.Runtime.ExperimentName.FULL_ACCESSIBILITY_TREE,
      ...(Root.Runtime.Runtime.queryParam('isChromeForTesting') ? ['protocol-monitor'] : []),
    ]);

    Root.Runtime.experiments.cleanUpStaleExperiments();
    const enabledExperiments = Root.Runtime.Runtime.queryParam('enabledExperiments');
    if (enabledExperiments) {
      Root.Runtime.experiments.setServerEnabledExperiments(enabledExperiments.split(';'));
    }
    Root.Runtime.experiments.enableExperimentsTransiently([]);

    if (Host.InspectorFrontendHost.isUnderTest()) {
      const testParam = Root.Runtime.Runtime.queryParam('test');
      if (testParam?.includes('live-line-level-heap-profile.js')) {
        Root.Runtime.experiments.enableForTest('live-heap-profile');
      }
    }

    for (const experiment of Root.Runtime.experiments.allConfigurableExperiments()) {
      if (experiment.isEnabled()) {
        Host.userMetrics.experimentEnabledAtLaunch(experiment.name);
      } else {
        Host.userMetrics.experimentDisabledAtLaunch(experiment.name);
      }
    }
  }
  async #createAppUI(): Promise<void> {
    MainImpl.time('Main._createAppUI');

    // Request filesystems early, we won't create connections until callback is fired. Things will happen in parallel.
    Persistence.IsolatedFileSystemManager.IsolatedFileSystemManager.instance();

    const defaultThemeSetting = 'systemPreferred';
    const themeSetting = Common.Settings.Settings.instance().createSetting('ui-theme', defaultThemeSetting);
    UI.UIUtils.initializeUIUtils(document);

    // Initialize theme support and apply it.
    if (!ThemeSupport.ThemeSupport.hasInstance()) {
      ThemeSupport.ThemeSupport.instance({forceNew: true, setting: themeSetting});
    }

    UI.UIUtils.addPlatformClass(document.documentElement);
    UI.UIUtils.installComponentRootStyles(document.body);

    this.#addMainEventListeners(document);

    const canDock = Boolean(Root.Runtime.Runtime.queryParam('can_dock'));
    UI.ZoomManager.ZoomManager.instance(
        {forceNew: true, win: window, frontendHost: Host.InspectorFrontendHost.InspectorFrontendHostInstance});
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

    UI.DockController.DockController.instance({forceNew: true, canDock});
    SDK.NetworkManager.MultitargetNetworkManager.instance({forceNew: true});
    SDK.DOMDebuggerModel.DOMDebuggerManager.instance({forceNew: true});
    const targetManager = SDK.TargetManager.TargetManager.instance();
    targetManager.addEventListener(
        SDK.TargetManager.Events.SUSPEND_STATE_CHANGED, this.#onSuspendStateChanged.bind(this));

    Workspace.FileManager.FileManager.instance({forceNew: true});
    Workspace.Workspace.WorkspaceImpl.instance();

    Bindings.NetworkProject.NetworkProjectManager.instance();
    const resourceMapping = new Bindings.ResourceMapping.ResourceMapping(
        targetManager,
        Workspace.Workspace.WorkspaceImpl.instance(),
    );
    new Bindings.PresentationConsoleMessageHelper.PresentationConsoleMessageManager();
    Bindings.CSSWorkspaceBinding.CSSWorkspaceBinding.instance({
      forceNew: true,
      resourceMapping,
      targetManager,
    });
    Bindings.DebuggerWorkspaceBinding.DebuggerWorkspaceBinding.instance({
      forceNew: true,
      resourceMapping,
      targetManager,
    });
    targetManager.setScopeTarget(targetManager.primaryPageTarget());
    UI.Context.Context.instance().addFlavorChangeListener(SDK.Target.Target, ({data}) => {
      const outermostTarget = data?.outermostTarget();
      targetManager.setScopeTarget(outermostTarget);
    });
    Breakpoints.BreakpointManager.BreakpointManager.instance({
      forceNew: true,
      workspace: Workspace.Workspace.WorkspaceImpl.instance(),
      targetManager,
      debuggerWorkspaceBinding: Bindings.DebuggerWorkspaceBinding.DebuggerWorkspaceBinding.instance(),
    });
    // @ts-expect-error e2e test global
    self.Extensions.extensionServer = Extensions.ExtensionServer.ExtensionServer.instance({forceNew: true});

    new Persistence.FileSystemWorkspaceBinding.FileSystemWorkspaceBinding(
        Persistence.IsolatedFileSystemManager.IsolatedFileSystemManager.instance(),
        Workspace.Workspace.WorkspaceImpl.instance());
    Persistence.IsolatedFileSystemManager.IsolatedFileSystemManager.instance().addPlatformFileSystem(
        'snippet://' as Platform.DevToolsPath.UrlString, new Snippets.ScriptSnippetFileSystem.SnippetFileSystem());

    Persistence.Persistence.PersistenceImpl.instance({
      forceNew: true,
      workspace: Workspace.Workspace.WorkspaceImpl.instance(),
      breakpointManager: Breakpoints.BreakpointManager.BreakpointManager.instance(),
    });
    Persistence.NetworkPersistenceManager.NetworkPersistenceManager.instance(
        {forceNew: true, workspace: Workspace.Workspace.WorkspaceImpl.instance()});

    new ExecutionContextSelector(targetManager, UI.Context.Context.instance());
    Bindings.IgnoreListManager.IgnoreListManager.instance({
      forceNew: true,
      debuggerWorkspaceBinding: Bindings.DebuggerWorkspaceBinding.DebuggerWorkspaceBinding.instance(),
    });

    const projectSettingsModel = ProjectSettings.ProjectSettingsModel.ProjectSettingsModel.instance({
      forceNew: true,
      hostConfig: Root.Runtime.hostConfig,
      pageResourceLoader: SDK.PageResourceLoader.PageResourceLoader.instance(),
      targetManager,
    });

    Persistence.AutomaticFileSystemManager.AutomaticFileSystemManager.instance({
      forceNew: true,
      hostConfig: Root.Runtime.hostConfig,
      inspectorFrontendHost: Host.InspectorFrontendHost.InspectorFrontendHostInstance,
      projectSettingsModel,
    });

    AutofillManager.AutofillManager.AutofillManager.instance();

    LiveMetrics.LiveMetrics.instance();
    CrUXManager.CrUXManager.instance();

    new PauseListener();

    const actionRegistryInstance = UI.ActionRegistry.ActionRegistry.instance({forceNew: true});
    // Required for legacy a11y layout tests
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
    ThemeSupport.ThemeSupport.instance().fetchColorsAndApplyHostTheme();
    app.presentUI(document);

    if (UI.ActionRegistry.ActionRegistry.instance().hasAction('elements.toggle-element-search')) {
      const toggleSearchNodeAction =
          UI.ActionRegistry.ActionRegistry.instance().getAction('elements.toggle-element-search');
      // TODO: we should not access actions from other modules.
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
      // Only import Timeline if neeeded. If this was a static import, every load of devtools
      // would request and evaluate the Timeline panel dep tree, slowing down the UI's load.
      const Timeline = await import('../../panels/timeline/timeline.js');
      Timeline.TimelinePanel.LoadTimelineHandler.instance().handleQueryParam(value);
    }

    // Initialize ARIAUtils.alert Element
    UI.ARIAUtils.getOrCreateAlertElements();
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
    await this.#maybeInstallVeInspectionBinding();

    MainImpl.timeEnd('Main._initializeTarget');
  }

  async #maybeInstallVeInspectionBinding(): Promise<void> {
    const primaryPageTarget = SDK.TargetManager.TargetManager.instance().primaryPageTarget();
    const url = primaryPageTarget?.targetInfo()?.url;
    const origin = url ? Common.ParsedURL.ParsedURL.extractOrigin(url as Platform.DevToolsPath.UrlString) : undefined;

    const binding = '__devtools_ve_inspection_binding__';
    if (primaryPageTarget && await VisualLogging.isUnderInspection(origin)) {
      const runtimeModel = primaryPageTarget.model(SDK.RuntimeModel.RuntimeModel);
      await runtimeModel?.addBinding({name: binding});
      runtimeModel?.addEventListener(SDK.RuntimeModel.Events.BindingCalled, event => {
        if (event.data.name === binding) {
          VisualLogging.setVeDebuggingEnabled(event.data.payload === 'true', (query: string) => {
            VisualLogging.setVeDebuggingEnabled(false);
            void runtimeModel?.defaultExecutionContext()?.evaluate(
                {
                  expression: `window.inspect(${JSON.stringify(query)})`,
                  includeCommandLineAPI: false,
                  silent: true,
                  returnByValue: false,
                  generatePreview: false,
                },
                /* userGesture */ false,
                /* awaitPromise */ false);
          });
        }
      });
    }
  }

  // TODO(crbug.com/350668580) Move this to AISettingsTab once the setting is only available
  // there and not in the general settings screen anymore.
  // The ConsoleInsightsEnabledSetting represents the toggle/checkbox allowing the user to turn the feature on/off.
  // If the user turns the feature off, we want them to go through the full onboarding flow should they later turn
  // the feature on again. We achieve this by resetting the onboardig setting.
  #onConsoleInsightsEnabledSettingChanged(): void {
    const settingValue = this.#getConsoleInsightsEnabledSetting()?.get();
    if (settingValue === false) {
      Common.Settings.Settings.instance().createLocalSetting('console-insights-onboarding-finished', false).set(false);
    }
  }

  #getConsoleInsightsEnabledSetting(): Common.Settings.Setting<boolean>|undefined {
    try {
      return Common.Settings.moduleSetting('console-insights-enabled') as Common.Settings.Setting<boolean>;
    } catch {
      return;
    }
  }

  async #lateInitialization(): Promise<void> {
    MainImpl.time('Main._lateInitialization');
    Extensions.ExtensionServer.ExtensionServer.instance().initializeExtensions();
    const promises: Array<Promise<void>> =
        Common.Runnable.lateInitializationRunnables().map(async lateInitializationLoader => {
          const runnable = await lateInitializationLoader();
          return await runnable.run();
        });
    if (Root.Runtime.experiments.isEnabled('live-heap-profile')) {
      const PerfUI = await import('../../ui/legacy/components/perf_ui/perf_ui.js');
      const setting = 'memory-live-heap-profile';
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

    // TODO(crbug.com/350668580) Move this to AISettingsTab once the setting is only available
    // there and not in the general settings screen anymore.
    const consoleInsightsSetting = this.#getConsoleInsightsEnabledSetting();
    if (consoleInsightsSetting) {
      consoleInsightsSetting.addChangeListener(this.#onConsoleInsightsEnabledSettingChanged, this);
    }

    MainImpl.timeEnd('Main._lateInitialization');
  }

  readyForTest(): Promise<void> {
    return this.#readyForTestPromise;
  }

  #registerMessageSinkListener(): void {
    Common.Console.Console.instance().addEventListener(Common.Console.Events.MESSAGE_ADDED, messageAdded);

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
    // @ts-expect-error Used in ElementsTreeOutline
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

// @ts-expect-error Exported for Tests.js
globalThis.Main = globalThis.Main || {};
// @ts-expect-error Exported for Tests.js
globalThis.Main.Main = MainImpl;

export class ZoomActionDelegate implements UI.ActionRegistration.ActionDelegate {
  handleAction(_context: UI.Context.Context, actionId: string): boolean {
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

export class SearchActionDelegate implements UI.ActionRegistration.ActionDelegate {
  handleAction(_context: UI.Context.Context, actionId: string): boolean {
    let searchableView = UI.SearchableView.SearchableView.fromElement(
        Platform.DOMUtilities.deepActiveElement(document),
    );
    if (!searchableView) {
      const currentPanel = (UI.InspectorView.InspectorView.instance().currentPanelDeprecated() as UI.Panel.Panel);
      if (currentPanel?.searchableView) {
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
    this.#itemInternal = new UI.Toolbar.ToolbarMenuButton(
        this.#handleContextMenu.bind(this), /* isIconDropdown */ true, /* useSoftMenu */ true, 'main-menu',
        'dots-vertical');
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
    const dockController = UI.DockController.DockController.instance();
    if (dockController.canDock()) {
      const dockItemElement = document.createElement('div');
      dockItemElement.classList.add('flex-auto', 'flex-centered', 'location-menu');
      dockItemElement.setAttribute(
          'jslog', `${VisualLogging.item('dock-side').track({keydown: 'ArrowDown|ArrowLeft|ArrowRight'})}`);
      dockItemElement.tabIndex = -1;
      UI.ARIAUtils.setLabel(dockItemElement, UIStrings.dockSide + UIStrings.dockSideNaviation);
      const [toggleDockSideShorcut] =
          UI.ShortcutRegistry.ShortcutRegistry.instance().shortcutsForAction('main.toggle-dock');

      // clang-format off
      render(html`
        <span class="dockside-title"
              title=${i18nString(UIStrings.placementOfDevtoolsRelativeToThe, {PH1: toggleDockSideShorcut.title()})}>
          ${i18nString(UIStrings.dockSide)}
        </span>
        <devtools-toolbar @mousedown=${(event: Event) => event.consume()}>
          <devtools-button class="toolbar-button"
                           jslog=${VisualLogging.toggle().track({click: true}).context('current-dock-state-undock')}
                           title=${i18nString(UIStrings.undockIntoSeparateWindow)}
                           aria-label=${i18nString(UIStrings.undockIntoSeparateWindow)}
                           .iconName=${'dock-window'}
                           .toggled=${dockController.dockSide() === UI.DockController.DockState.UNDOCKED}
                           .toggledIconName=${'dock-window'}
                           .toggleType=${Buttons.Button.ToggleType.PRIMARY}
                           .variant=${Buttons.Button.Variant.ICON_TOGGLE}
                           @click=${setDockSide.bind(null, UI.DockController.DockState.UNDOCKED)}></devtools-button>
          <devtools-button class="toolbar-button"
                           jslog=${VisualLogging.toggle().track({click: true}).context('current-dock-state-left')}
                           title=${i18nString(UIStrings.dockToLeft)}
                           aria-label=${i18nString(UIStrings.dockToLeft)}
                           .iconName=${'dock-left'}
                           .toggled=${dockController.dockSide() === UI.DockController.DockState.LEFT}
                           .toggledIconName=${'dock-left'}
                           .toggleType=${Buttons.Button.ToggleType.PRIMARY}
                           .variant=${Buttons.Button.Variant.ICON_TOGGLE}
                           @click=${setDockSide.bind(null, UI.DockController.DockState.LEFT)}></devtools-button>
          <devtools-button class="toolbar-button"
                           jslog=${VisualLogging.toggle().track({click: true}).context('current-dock-state-bottom')}
                           title=${i18nString(UIStrings.dockToBottom)}
                           aria-label=${i18nString(UIStrings.dockToBottom)}
                           .iconName=${'dock-bottom'}
                           .toggled=${dockController.dockSide() === UI.DockController.DockState.BOTTOM}
                           .toggledIconName=${'dock-bottom'}
                           .toggleType=${Buttons.Button.ToggleType.PRIMARY}
                           .variant=${Buttons.Button.Variant.ICON_TOGGLE}
                           @click=${setDockSide.bind(null, UI.DockController.DockState.BOTTOM)}></devtools-button>
          <devtools-button class="toolbar-button"
                           jslog=${VisualLogging.toggle().track({click: true}).context('current-dock-state-right')}
                           title=${i18nString(UIStrings.dockToRight)}
                           aria-label=${i18nString(UIStrings.dockToRight)}
                           .iconName=${'dock-right'}
                           .toggled=${dockController.dockSide() === UI.DockController.DockState.RIGHT}
                           .toggledIconName=${'dock-right'}
                           .toggleType=${Buttons.Button.ToggleType.PRIMARY}
                           .variant=${Buttons.Button.Variant.ICON_TOGGLE}
                           @click=${setDockSide.bind(null, UI.DockController.DockState.RIGHT)}></devtools-button>
        </devtools-toolbar>
      `, dockItemElement, {host: this});
      // clang-format on

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

        const buttons = Array.from(dockItemElement.querySelectorAll('devtools-button'));
        let index = buttons.findIndex(button => button.hasFocus());
        index = Platform.NumberUtilities.clamp(index + dir, 0, buttons.length - 1);
        buttons[index].focus();
        event.consume(true);
      });
      contextMenu.headerSection().appendCustomItem(dockItemElement, 'dock-side');
    }

    const button = this.#itemInternal.element;

    function setDockSide(side: UI.DockController.DockState): void {
      void dockController.once(UI.DockController.Events.AFTER_DOCK_SIDE_CHANGED).then(() => button.focus());
      dockController.setDockSide(side);
      contextMenu.discard();
    }

    if (dockController.dockSide() === UI.DockController.DockState.UNDOCKED) {
      const mainTarget = SDK.TargetManager.TargetManager.instance().primaryPageTarget();
      if (mainTarget && mainTarget.type() === SDK.Target.Type.FRAME) {
        contextMenu.defaultSection().appendAction('inspector-main.focus-debuggee', i18nString(UIStrings.focusDebuggee));
      }
    }

    contextMenu.defaultSection().appendAction(
        'main.toggle-drawer',
        UI.InspectorView.InspectorView.instance().drawerVisible() ? i18nString(UIStrings.hideConsoleDrawer) :
                                                                    i18nString(UIStrings.showConsoleDrawer));
    contextMenu.appendItemsAtLocation('mainMenu');
    const moreTools =
        contextMenu.defaultSection().appendSubMenuItem(i18nString(UIStrings.moreTools), false, 'more-tools');
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
          Host.userMetrics.issuesPanelOpenedFrom(Host.UserMetrics.IssueOpener.HAMBURGER_MENU);
          void UI.ViewManager.ViewManager.instance().showView('issues-pane', /* userGesture */ true);
        }, {jslogContext: id});
        continue;
      }

      if (persistence !== 'closeable') {
        continue;
      }
      if (location !== 'drawer-view' && location !== 'panel') {
        continue;
      }

      if (viewExtension.isPreviewFeature()) {
        const additionalElement = IconButton.Icon.create('experiment');
        moreTools.defaultSection().appendItem(title, () => {
          void UI.ViewManager.ViewManager.instance().showView(id, true, false);
        }, {disabled: false, additionalElement, jslogContext: id});
        continue;
      }

      moreTools.defaultSection().appendItem(title, () => {
        void UI.ViewManager.ViewManager.instance().showView(id, true, false);
      }, {jslogContext: id});
    }

    const helpSubMenu = contextMenu.footerSection().appendSubMenuItem(i18nString(UIStrings.help), false, 'help');
    helpSubMenu.appendItemsAtLocation('mainMenuHelp');
  }
}

let settingsButtonProviderInstance: SettingsButtonProvider;

export class SettingsButtonProvider implements UI.Toolbar.Provider {
  readonly #settingsButton: UI.Toolbar.ToolbarButton;
  private constructor() {
    this.#settingsButton = UI.Toolbar.Toolbar.createActionButton('settings.show');
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

// Unused but mentioned at https://chromedevtools.github.io/devtools-protocol/#:~:text=use%20Main.MainImpl.-,sendOverProtocol,-()%20in%20the
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

export class ReloadActionDelegate implements UI.ActionRegistration.ActionDelegate {
  handleAction(_context: UI.Context.Context, actionId: string): boolean {
    switch (actionId) {
      case 'main.debug-reload':
        Components.Reload.reload();

        return true;
    }
    return false;
  }
}
