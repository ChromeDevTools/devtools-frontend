// Copyright 2021 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.
/* eslint-disable @devtools/no-imperative-dom-api */
/* eslint-disable @devtools/no-lit-render-outside-of-view */
var _a;
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
import * as Foundation from '../../foundation/foundation.js';
import * as AiAssistanceModel from '../../models/ai_assistance/ai_assistance.js';
import * as AutofillManager from '../../models/autofill_manager/autofill_manager.js';
import * as Badges from '../../models/badges/badges.js';
import * as Bindings from '../../models/bindings/bindings.js';
import * as Breakpoints from '../../models/breakpoints/breakpoints.js';
import * as CrUXManager from '../../models/crux-manager/crux-manager.js';
import * as IssuesManager from '../../models/issues_manager/issues_manager.js';
import * as LiveMetrics from '../../models/live-metrics/live-metrics.js';
import * as Logs from '../../models/logs/logs.js';
import * as Persistence from '../../models/persistence/persistence.js';
import * as ProjectSettings from '../../models/project_settings/project_settings.js';
import * as Workspace from '../../models/workspace/workspace.js';
import * as PanelCommon from '../../panels/common/common.js';
import * as Snippets from '../../panels/snippets/snippets.js';
import * as Buttons from '../../ui/components/buttons/buttons.js';
import * as Snackbar from '../../ui/components/snackbars/snackbars.js';
import * as Components from '../../ui/legacy/components/utils/utils.js';
import * as UI from '../../ui/legacy/legacy.js';
import * as ThemeSupport from '../../ui/legacy/theme_support/theme_support.js';
import { html, render } from '../../ui/lit/lit.js';
import * as VisualLogging from '../../ui/visual_logging/visual_logging.js';
import { ExecutionContextSelector } from './ExecutionContextSelector.js';
const UIStrings = {
    /**
     * @description Title of item in main
     */
    customizeAndControlDevtools: 'Customize and control DevTools',
    /**
     * @description Title element text content in Main
     */
    dockSide: 'Dock side',
    /**
     * @description Title element title in Main
     * @example {Ctrl+Shift+D} PH1
     */
    placementOfDevtoolsRelativeToThe: 'Placement of DevTools relative to the page. ({PH1} to restore last position)',
    /**
     * @description Text to undock the DevTools
     */
    undockIntoSeparateWindow: 'Undock into separate window',
    /**
     * @description Text to dock the DevTools to the bottom of the browser tab
     */
    dockToBottom: 'Dock to bottom',
    /**
     * @description Text to dock the DevTools to the right of the browser tab
     */
    dockToRight: 'Dock to right',
    /**
     * @description Text to dock the DevTools to the left of the browser tab
     */
    dockToLeft: 'Dock to left',
    /**
     * @description Text in Main
     */
    focusDebuggee: 'Focus page',
    /**
     * @description Text in Main
     */
    hideConsoleDrawer: 'Hide console drawer',
    /**
     * @description Text in Main
     */
    showConsoleDrawer: 'Show console drawer',
    /**
     * @description A context menu item in the Main
     */
    moreTools: 'More tools',
    /**
     * @description Text for the viewing the help options
     */
    help: 'Help',
    /**
     * @description Text describing how to navigate the dock side menu
     */
    dockSideNavigation: 'Use left and right arrow keys to navigate the options',
    /**
     * @description Notification shown to the user whenever DevTools receives an external request.
     */
    externalRequestReceived: '`DevTools` received an external request',
};
const str_ = i18n.i18n.registerUIStrings('entrypoints/main/MainImpl.ts', UIStrings);
const i18nString = i18n.i18n.getLocalizedString.bind(undefined, str_);
let loadedPanelCommonModule;
export class MainImpl {
    #readyForTestPromise = Promise.withResolvers();
    #veStartPromise;
    constructor() {
        _a.instanceForTest = this;
        void this.#loaded();
    }
    static time(label) {
        if (Host.InspectorFrontendHost.isUnderTest()) {
            return;
        }
        console.time(label);
    }
    static timeEnd(label) {
        if (Host.InspectorFrontendHost.isUnderTest()) {
            return;
        }
        console.timeEnd(label);
    }
    async #loaded() {
        console.timeStamp('Main._loaded');
        Root.Runtime.Runtime.setPlatform(Host.Platform.platform());
        const [config, prefs] = await Promise.all([
            new Promise(resolve => {
                Host.InspectorFrontendHost.InspectorFrontendHostInstance.getHostConfig(resolve);
            }),
            new Promise(resolve => Host.InspectorFrontendHost.InspectorFrontendHostInstance.getPreferences(resolve)),
        ]);
        console.timeStamp('Main._gotPreferences');
        this.#initializeGlobalsForLayoutTests();
        Object.assign(Root.Runtime.hostConfig, config);
        const creationOptions = {
            settingsCreationOptions: {
                ...this.createSettingsStorage(prefs),
                settingRegistrations: Common.SettingRegistration.getRegisteredSettings(),
                logSettingAccess: VisualLogging.logSettingAccess,
                runSettingsMigration: !Host.InspectorFrontendHost.isUnderTest(),
            },
        };
        new Foundation.Universe.Universe(creationOptions);
        await this.requestAndRegisterLocaleData();
        Host.userMetrics.syncSetting(Common.Settings.Settings.instance().moduleSetting('sync-preferences').get());
        const veLogging = config.devToolsVeLogging;
        // Used by e2e_non_hosted to put VE Logs into "test mode".
        const veLogsTestMode = Common.Settings.Settings.instance().createSetting('veLogsTestMode', false).get();
        if (veLogging?.enabled) {
            // Note: as of https://crrev.com/c/6734500 landing, veLogging.testing is hard-coded to false.
            // But the e2e tests (test/conductor/frontend_tab.ts) use this to enable this flag for e2e tests.
            // TODO(crbug.com/432411398): remove the host config for VE logs + find a better way to set this up in e2e tests.
            if (veLogging?.testing || veLogsTestMode) {
                VisualLogging.setVeDebugLoggingEnabled(true, "Test" /* VisualLogging.DebugLoggingFormat.TEST */);
                const options = {
                    processingThrottler: new Common.Throttler.Throttler(0),
                    keyboardLogThrottler: new Common.Throttler.Throttler(10),
                    hoverLogThrottler: new Common.Throttler.Throttler(50),
                    dragLogThrottler: new Common.Throttler.Throttler(50),
                    clickLogThrottler: new Common.Throttler.Throttler(10),
                    resizeLogThrottler: new Common.Throttler.Throttler(10),
                };
                this.#veStartPromise = VisualLogging.startLogging(options);
            }
            else {
                this.#veStartPromise = VisualLogging.startLogging();
            }
        }
        void this.#createAppUI();
    }
    #initializeGlobalsForLayoutTests() {
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
    async requestAndRegisterLocaleData() {
        const settingLanguage = Common.Settings.Settings.instance().moduleSetting('language').get();
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
        }
        catch (error) {
            console.warn(`Unable to fetch & register locale data for '${devToolsLocale.locale}', falling back to 'en-US'. Cause: `, error);
            // Loading the actual locale data failed, tell DevTools to use 'en-US'.
            devToolsLocale.forceFallbackLocale();
        }
    }
    createSettingsStorage(prefs) {
        this.#initializeExperiments();
        let storagePrefix = '';
        if (Host.Platform.isCustomDevtoolsFrontend()) {
            storagePrefix = '__custom__';
        }
        else if (!Root.Runtime.Runtime.queryParam('can_dock') && Boolean(Root.Runtime.Runtime.queryParam('debugFrontend')) &&
            !Host.InspectorFrontendHost.isUnderTest()) {
            storagePrefix = '__bundled__';
        }
        let localStorage;
        if (!Host.InspectorFrontendHost.isUnderTest() && window.localStorage) {
            const localbackingStore = {
                ...Common.Settings.NOOP_STORAGE,
                clear: () => window.localStorage.clear(),
            };
            localStorage = new Common.Settings.SettingsStorage(window.localStorage, localbackingStore, storagePrefix);
        }
        else {
            localStorage = new Common.Settings.SettingsStorage({}, Common.Settings.NOOP_STORAGE, storagePrefix);
        }
        const hostUnsyncedStorage = {
            register: (name) => Host.InspectorFrontendHost.InspectorFrontendHostInstance.registerPreference(name, { synced: false }),
            set: Host.InspectorFrontendHost.InspectorFrontendHostInstance.setPreference,
            get: (name) => {
                return new Promise(resolve => {
                    Host.InspectorFrontendHost.InspectorFrontendHostInstance.getPreference(name, resolve);
                });
            },
            remove: Host.InspectorFrontendHost.InspectorFrontendHostInstance.removePreference,
            clear: Host.InspectorFrontendHost.InspectorFrontendHostInstance.clearPreferences,
        };
        const hostSyncedStorage = {
            ...hostUnsyncedStorage,
            register: (name) => Host.InspectorFrontendHost.InspectorFrontendHostInstance.registerPreference(name, { synced: true }),
        };
        // `prefs` is retrieved via `getPreferences` host binding and contains both synced and unsynced settings.
        // As such, we use `prefs` to initialize both the synced and the global storage. This is fine as an individual
        // setting can't change storage buckets during a single DevTools session.
        const syncedStorage = new Common.Settings.SettingsStorage(prefs, hostSyncedStorage, storagePrefix);
        const globalStorage = new Common.Settings.SettingsStorage(prefs, hostUnsyncedStorage, storagePrefix);
        return { syncedStorage, globalStorage, localStorage };
    }
    #initializeExperiments() {
        Root.Runtime.experiments.register('capture-node-creation-stacks', 'Capture node creation stacks');
        Root.Runtime.experiments.register('live-heap-profile', 'Live heap profile', true);
        Root.Runtime.experiments.register('protocol-monitor', 'Protocol Monitor', undefined, 'https://developer.chrome.com/blog/new-in-devtools-92/#protocol-monitor');
        Root.Runtime.experiments.register('sampling-heap-profiler-timeline', 'Sampling heap profiler timeline', true);
        Root.Runtime.experiments.register('show-option-tp-expose-internals-in-heap-snapshot', 'Show option to expose internals in heap snapshots');
        // Timeline
        Root.Runtime.experiments.register('timeline-invalidation-tracking', 'Performance panel: invalidation tracking', true);
        Root.Runtime.experiments.register('timeline-show-all-events', 'Performance panel: show all events', true);
        Root.Runtime.experiments.register('timeline-v8-runtime-call-stats', 'Performance panel: V8 runtime call stats', true);
        Root.Runtime.experiments.register("timeline-debug-mode" /* Root.Runtime.ExperimentName.TIMELINE_DEBUG_MODE */, 'Performance panel: Enable debug mode (trace event details, etc)', true);
        // Debugging
        Root.Runtime.experiments.register('instrumentation-breakpoints', 'Enable instrumentation breakpoints', true);
        Root.Runtime.experiments.register('use-source-map-scopes', 'Use scope information from source maps', true);
        // Advanced Perceptual Contrast Algorithm.
        Root.Runtime.experiments.register('apca', 'Enable new Advanced Perceptual Contrast Algorithm (APCA) replacing previous contrast ratio and AA/AAA guidelines', undefined, 'https://developer.chrome.com/blog/new-in-devtools-89/#apca');
        // Full Accessibility Tree
        Root.Runtime.experiments.register('full-accessibility-tree', 'Enable full accessibility tree view in the Elements panel', undefined, 'https://developer.chrome.com/blog/new-in-devtools-90/#accessibility-tree', 'https://g.co/devtools/a11y-tree-feedback');
        // Font Editor
        Root.Runtime.experiments.register('font-editor', 'Enable new font editor within the Styles tab', undefined, 'https://developer.chrome.com/blog/new-in-devtools-89/#font');
        // Contrast issues reported via the Issues panel.
        Root.Runtime.experiments.register('contrast-issues', 'Enable automatic contrast issue reporting via the Issues panel', undefined, 'https://developer.chrome.com/blog/new-in-devtools-90/#low-contrast');
        // New cookie features.
        Root.Runtime.experiments.register('experimental-cookie-features', 'Enable experimental cookie features');
        // Change grouping of sources panel to use Authored/Deployed trees
        Root.Runtime.experiments.register("authored-deployed-grouping" /* Root.Runtime.ExperimentName.AUTHORED_DEPLOYED_GROUPING */, 'Group sources into authored and deployed trees', undefined, 'https://goo.gle/authored-deployed', 'https://goo.gle/authored-deployed-feedback');
        // Hide third party code (as determined by ignore lists or source maps)
        Root.Runtime.experiments.register("just-my-code" /* Root.Runtime.ExperimentName.JUST_MY_CODE */, 'Hide ignore-listed code in Sources tree view');
        Root.Runtime.experiments.register("timeline-show-postmessage-events" /* Root.Runtime.ExperimentName.TIMELINE_SHOW_POST_MESSAGE_EVENTS */, 'Performance panel: show postMessage dispatch and handling flows');
        Root.Runtime.experiments.enableExperimentsByDefault([
            "full-accessibility-tree" /* Root.Runtime.ExperimentName.FULL_ACCESSIBILITY_TREE */,
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
            }
            else {
                Host.userMetrics.experimentDisabledAtLaunch(experiment.name);
            }
        }
    }
    async #createAppUI() {
        _a.time('Main._createAppUI');
        // Request filesystems early, we won't create connections until callback is fired. Things will happen in parallel.
        const isolatedFileSystemManager = Persistence.IsolatedFileSystemManager.IsolatedFileSystemManager.instance();
        isolatedFileSystemManager.addEventListener(Persistence.IsolatedFileSystemManager.Events.FileSystemError, event => Snackbar.Snackbar.Snackbar.show({ message: event.data }));
        const defaultThemeSetting = 'systemPreferred';
        const themeSetting = Common.Settings.Settings.instance().createSetting('ui-theme', defaultThemeSetting);
        UI.UIUtils.initializeUIUtils(document);
        // Initialize theme support and apply it.
        if (!ThemeSupport.ThemeSupport.hasInstance()) {
            ThemeSupport.ThemeSupport.instance({ forceNew: true, setting: themeSetting });
        }
        UI.UIUtils.addPlatformClass(document.documentElement);
        UI.UIUtils.installComponentRootStyles(document.body);
        this.#addMainEventListeners(document);
        const canDock = Boolean(Root.Runtime.Runtime.queryParam('can_dock'));
        UI.ZoomManager.ZoomManager.instance({ forceNew: true, win: window, frontendHost: Host.InspectorFrontendHost.InspectorFrontendHostInstance });
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
        UI.DockController.DockController.instance({ forceNew: true, canDock });
        SDK.NetworkManager.MultitargetNetworkManager.instance({ forceNew: true });
        SDK.DOMDebuggerModel.DOMDebuggerManager.instance({ forceNew: true });
        const targetManager = SDK.TargetManager.TargetManager.instance();
        targetManager.addEventListener("SuspendStateChanged" /* SDK.TargetManager.Events.SUSPEND_STATE_CHANGED */, this.#onSuspendStateChanged.bind(this));
        Workspace.FileManager.FileManager.instance({ forceNew: true });
        Workspace.Workspace.WorkspaceImpl.instance();
        Bindings.NetworkProject.NetworkProjectManager.instance();
        const resourceMapping = new Bindings.ResourceMapping.ResourceMapping(targetManager, Workspace.Workspace.WorkspaceImpl.instance());
        new Bindings.PresentationConsoleMessageHelper.PresentationConsoleMessageManager();
        Bindings.CSSWorkspaceBinding.CSSWorkspaceBinding.instance({
            forceNew: true,
            resourceMapping,
            targetManager,
        });
        Workspace.IgnoreListManager.IgnoreListManager.instance({
            forceNew: true,
        });
        Bindings.DebuggerWorkspaceBinding.DebuggerWorkspaceBinding.instance({
            forceNew: true,
            resourceMapping,
            targetManager,
            ignoreListManager: Workspace.IgnoreListManager.IgnoreListManager.instance(),
        });
        targetManager.setScopeTarget(targetManager.primaryPageTarget());
        UI.Context.Context.instance().addFlavorChangeListener(SDK.Target.Target, ({ data }) => {
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
        self.Extensions.extensionServer = PanelCommon.ExtensionServer.ExtensionServer.instance({ forceNew: true });
        new Persistence.FileSystemWorkspaceBinding.FileSystemWorkspaceBinding(isolatedFileSystemManager, Workspace.Workspace.WorkspaceImpl.instance());
        isolatedFileSystemManager.addPlatformFileSystem('snippet://', new Snippets.ScriptSnippetFileSystem.SnippetFileSystem());
        const persistenceImpl = Persistence.Persistence.PersistenceImpl.instance({
            forceNew: true,
            workspace: Workspace.Workspace.WorkspaceImpl.instance(),
            breakpointManager: Breakpoints.BreakpointManager.BreakpointManager.instance(),
        });
        const linkDecorator = new PanelCommon.PersistenceUtils.LinkDecorator(persistenceImpl);
        Components.Linkifier.Linkifier.setLinkDecorator(linkDecorator);
        Persistence.NetworkPersistenceManager.NetworkPersistenceManager.instance({ forceNew: true, workspace: Workspace.Workspace.WorkspaceImpl.instance() });
        new ExecutionContextSelector(targetManager, UI.Context.Context.instance());
        const projectSettingsModel = ProjectSettings.ProjectSettingsModel.ProjectSettingsModel.instance({
            forceNew: true,
            hostConfig: Root.Runtime.hostConfig,
            pageResourceLoader: SDK.PageResourceLoader.PageResourceLoader.instance(),
            targetManager,
        });
        const automaticFileSystemManager = Persistence.AutomaticFileSystemManager.AutomaticFileSystemManager.instance({
            forceNew: true,
            inspectorFrontendHost: Host.InspectorFrontendHost.InspectorFrontendHostInstance,
            projectSettingsModel,
        });
        Persistence.AutomaticFileSystemWorkspaceBinding.AutomaticFileSystemWorkspaceBinding.instance({
            forceNew: true,
            automaticFileSystemManager,
            isolatedFileSystemManager,
            workspace: Workspace.Workspace.WorkspaceImpl.instance(),
        });
        AutofillManager.AutofillManager.AutofillManager.instance();
        LiveMetrics.LiveMetrics.instance();
        CrUXManager.CrUXManager.instance();
        void AiAssistanceModel.BuiltInAi.BuiltInAi.instance();
        new PauseListener();
        const actionRegistryInstance = UI.ActionRegistry.ActionRegistry.instance({ forceNew: true });
        // Required for legacy a11y layout tests
        UI.ShortcutRegistry.ShortcutRegistry.instance({ forceNew: true, actionRegistry: actionRegistryInstance });
        this.#registerMessageSinkListener();
        // Initialize `GDPClient` and `UserBadges` for Google Developer Program integration
        if (Host.GdpClient.isGdpProfilesAvailable()) {
            void Host.GdpClient.GdpClient.instance().getProfile().then(getProfileResponse => {
                if (!getProfileResponse) {
                    return;
                }
                const { profile, isEligible } = getProfileResponse;
                const hasProfile = Boolean(profile);
                const contextString = hasProfile ? 'has-profile' :
                    isEligible ? 'no-profile-and-eligible' :
                        'no-profile-and-not-eligible';
                void VisualLogging.logFunctionCall('gdp-client-initialize', contextString);
            });
            void Badges.UserBadges.instance().initialize();
            Badges.UserBadges.instance().addEventListener("BadgeTriggered" /* Badges.Events.BADGE_TRIGGERED */, async (ev) => {
                loadedPanelCommonModule ??= await import('../../panels/common/common.js');
                const badgeNotification = new loadedPanelCommonModule.BadgeNotification();
                void badgeNotification.present(ev.data);
            });
        }
        const conversationHandler = AiAssistanceModel.ConversationHandler.ConversationHandler.instance();
        conversationHandler.addEventListener("ExternalRequestReceived" /* AiAssistanceModel.ConversationHandler.ConversationHandlerEvents.EXTERNAL_REQUEST_RECEIVED */, () => Snackbar.Snackbar.Snackbar.show({ message: i18nString(UIStrings.externalRequestReceived) }));
        conversationHandler.addEventListener("ExternalConversationStarted" /* AiAssistanceModel.ConversationHandler.ConversationHandlerEvents.EXTERNAL_CONVERSATION_STARTED */, event => void VisualLogging.logFunctionCall(`start-conversation-${event.data}`, 'external'));
        _a.timeEnd('Main._createAppUI');
        const appProvider = Common.AppProvider.getRegisteredAppProviders()[0];
        if (!appProvider) {
            throw new Error('Unable to boot DevTools, as the appprovider is missing');
        }
        await this.#showAppUI(await appProvider.loadAppProvider());
    }
    async #showAppUI(appProvider) {
        _a.time('Main._showAppUI');
        const app = appProvider.createApp();
        // It is important to kick controller lifetime after apps are instantiated.
        UI.DockController.DockController.instance().initialize();
        ThemeSupport.ThemeSupport.instance().fetchColorsAndApplyHostTheme();
        app.presentUI(document);
        if (UI.ActionRegistry.ActionRegistry.instance().hasAction('elements.toggle-element-search')) {
            const toggleSearchNodeAction = UI.ActionRegistry.ActionRegistry.instance().getAction('elements.toggle-element-search');
            // TODO: we should not access actions from other modules.
            Host.InspectorFrontendHost.InspectorFrontendHostInstance.events.addEventListener(Host.InspectorFrontendHostAPI.Events.EnterInspectElementMode, () => {
                void toggleSearchNodeAction.execute();
            }, this);
        }
        Host.InspectorFrontendHost.InspectorFrontendHostInstance.events.addEventListener(Host.InspectorFrontendHostAPI.Events.RevealSourceLine, this.#revealSourceLine, this);
        const inspectorView = UI.InspectorView.InspectorView.instance();
        Persistence.NetworkPersistenceManager.NetworkPersistenceManager.instance().addEventListener("LocalOverridesRequested" /* Persistence.NetworkPersistenceManager.Events.LOCAL_OVERRIDES_REQUESTED */, event => {
            inspectorView.displaySelectOverrideFolderInfobar(event.data);
        });
        await inspectorView.createToolbars();
        Host.InspectorFrontendHost.InspectorFrontendHostInstance.loadCompleted();
        // Initialize elements for the live announcer functionality for a11y.
        UI.ARIAUtils.LiveAnnouncer.initializeAnnouncerElements();
        UI.DockController.DockController.instance().announceDockLocation();
        // Allow UI cycles to repaint prior to creating connection.
        window.setTimeout(this.#initializeTarget.bind(this), 0);
        _a.timeEnd('Main._showAppUI');
    }
    async #initializeTarget() {
        _a.time('Main._initializeTarget');
        // We rely on having the early initialization runnables registered in Common when an app loads its
        // modules, so that we don't have to exhaustively check the app DevTools is running as to
        // start the applicable runnables.
        for (const runnableInstanceFunction of Common.Runnable.earlyInitializationRunnables()) {
            await runnableInstanceFunction().run();
        }
        await this.#veStartPromise;
        // Used for browser tests.
        Host.InspectorFrontendHost.InspectorFrontendHostInstance.readyForTest();
        this.#readyForTestPromise.resolve();
        // Asynchronously run the extensions.
        window.setTimeout(this.#lateInitialization.bind(this), 100);
        await this.#maybeInstallVeInspectionBinding();
        _a.timeEnd('Main._initializeTarget');
    }
    async #maybeInstallVeInspectionBinding() {
        const primaryPageTarget = SDK.TargetManager.TargetManager.instance().primaryPageTarget();
        const url = primaryPageTarget?.targetInfo()?.url;
        const origin = url ? Common.ParsedURL.ParsedURL.extractOrigin(url) : undefined;
        const binding = '__devtools_ve_inspection_binding__';
        if (primaryPageTarget && await VisualLogging.isUnderInspection(origin)) {
            const runtimeModel = primaryPageTarget.model(SDK.RuntimeModel.RuntimeModel);
            await runtimeModel?.addBinding({ name: binding });
            runtimeModel?.addEventListener(SDK.RuntimeModel.Events.BindingCalled, event => {
                if (event.data.name === binding) {
                    if (event.data.payload === 'true' || event.data.payload === 'false') {
                        VisualLogging.setVeDebuggingEnabled(event.data.payload === 'true', (query) => {
                            VisualLogging.setVeDebuggingEnabled(false);
                            void runtimeModel?.defaultExecutionContext()?.evaluate({
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
                    else {
                        VisualLogging.setHighlightedVe(event.data.payload === 'null' ? null : event.data.payload);
                    }
                }
            });
        }
    }
    async #lateInitialization() {
        _a.time('Main._lateInitialization');
        PanelCommon.ExtensionServer.ExtensionServer.instance().initializeExtensions();
        const promises = Common.Runnable.lateInitializationRunnables().map(async (lateInitializationLoader) => {
            const runnable = await lateInitializationLoader();
            return await runnable.run();
        });
        if (Root.Runtime.experiments.isEnabled('live-heap-profile')) {
            const PerfUI = await import('../../ui/legacy/components/perf_ui/perf_ui.js');
            const setting = 'memory-live-heap-profile';
            if (Common.Settings.Settings.instance().moduleSetting(setting).get()) {
                promises.push(PerfUI.LiveHeapProfile.LiveHeapProfile.instance().run());
            }
            else {
                const changeListener = async (event) => {
                    if (!event.data) {
                        return;
                    }
                    Common.Settings.Settings.instance().moduleSetting(setting).removeChangeListener(changeListener);
                    void PerfUI.LiveHeapProfile.LiveHeapProfile.instance().run();
                };
                Common.Settings.Settings.instance().moduleSetting(setting).addChangeListener(changeListener);
            }
        }
        _a.timeEnd('Main._lateInitialization');
    }
    readyForTest() {
        return this.#readyForTestPromise.promise;
    }
    #registerMessageSinkListener() {
        Common.Console.Console.instance().addEventListener("messageAdded" /* Common.Console.Events.MESSAGE_ADDED */, messageAdded);
        function messageAdded({ data: message }) {
            if (message.show) {
                Common.Console.Console.instance().show();
            }
        }
    }
    #revealSourceLine(event) {
        const { url, lineNumber, columnNumber } = event.data;
        const uiSourceCode = Workspace.Workspace.WorkspaceImpl.instance().uiSourceCodeForURL(url);
        if (uiSourceCode) {
            void Common.Revealer.reveal(uiSourceCode.uiLocation(lineNumber, columnNumber));
            return;
        }
        function listener(event) {
            const uiSourceCode = event.data;
            if (uiSourceCode.url() === url) {
                void Common.Revealer.reveal(uiSourceCode.uiLocation(lineNumber, columnNumber));
                Workspace.Workspace.WorkspaceImpl.instance().removeEventListener(Workspace.Workspace.Events.UISourceCodeAdded, listener);
            }
        }
        Workspace.Workspace.WorkspaceImpl.instance().addEventListener(Workspace.Workspace.Events.UISourceCodeAdded, listener);
    }
    #postDocumentKeyDown(event) {
        if (!event.handled) {
            UI.ShortcutRegistry.ShortcutRegistry.instance().handleShortcut(event);
        }
    }
    #redispatchClipboardEvent(event) {
        const eventCopy = new CustomEvent('clipboard-' + event.type, { bubbles: true });
        // @ts-expect-error Used in ElementsTreeOutline
        eventCopy['original'] = event;
        const document = event.target && event.target.ownerDocument;
        const target = document ? Platform.DOMUtilities.deepActiveElement(document) : null;
        if (target) {
            target.dispatchEvent(eventCopy);
        }
        if (eventCopy.handled) {
            event.preventDefault();
        }
    }
    #contextMenuEventFired(event) {
        if (event.handled || event.target.classList.contains('popup-glasspane')) {
            event.preventDefault();
        }
    }
    #addMainEventListeners(document) {
        document.addEventListener('keydown', this.#postDocumentKeyDown.bind(this), false);
        document.addEventListener('beforecopy', this.#redispatchClipboardEvent.bind(this), true);
        document.addEventListener('copy', this.#redispatchClipboardEvent.bind(this), false);
        document.addEventListener('cut', this.#redispatchClipboardEvent.bind(this), false);
        document.addEventListener('paste', this.#redispatchClipboardEvent.bind(this), false);
        document.addEventListener('contextmenu', this.#contextMenuEventFired.bind(this), true);
    }
    #onSuspendStateChanged() {
        const suspended = SDK.TargetManager.TargetManager.instance().allTargetsSuspended();
        UI.InspectorView.InspectorView.instance().onSuspendStateChanged(suspended);
    }
    static instanceForTest = null;
}
_a = MainImpl;
// @ts-expect-error Exported for Tests.js
globalThis.Main = globalThis.Main || {};
// @ts-expect-error Exported for Tests.js
globalThis.Main.Main = MainImpl;
export class ZoomActionDelegate {
    handleAction(_context, actionId) {
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
export class SearchActionDelegate {
    handleAction(_context, actionId) {
        let searchableView = UI.SearchableView.SearchableView.fromElement(Platform.DOMUtilities.deepActiveElement(document));
        if (!searchableView) {
            const currentPanel = UI.InspectorView.InspectorView.instance().currentPanelDeprecated();
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
let mainMenuItemInstance;
export class MainMenuItem {
    #item;
    constructor() {
        this.#item = new UI.Toolbar.ToolbarMenuButton(this.#handleContextMenu.bind(this), /* isIconDropdown */ true, /* useSoftMenu */ true, 'main-menu', 'dots-vertical');
        this.#item.element.classList.add('main-menu');
        this.#item.setTitle(i18nString(UIStrings.customizeAndControlDevtools));
    }
    static instance(opts = { forceNew: null }) {
        const { forceNew } = opts;
        if (!mainMenuItemInstance || forceNew) {
            mainMenuItemInstance = new MainMenuItem();
        }
        return mainMenuItemInstance;
    }
    item() {
        return this.#item;
    }
    #handleContextMenu(contextMenu) {
        const dockController = UI.DockController.DockController.instance();
        if (dockController.canDock()) {
            const dockItemElement = document.createElement('div');
            dockItemElement.classList.add('flex-auto', 'flex-centered', 'location-menu');
            dockItemElement.setAttribute('jslog', `${VisualLogging.item('dock-side').track({ keydown: 'ArrowDown|ArrowLeft|ArrowRight' })}`);
            dockItemElement.tabIndex = -1;
            UI.ARIAUtils.setLabel(dockItemElement, UIStrings.dockSide + UIStrings.dockSideNavigation);
            const [toggleDockSideShortcut] = UI.ShortcutRegistry.ShortcutRegistry.instance().shortcutsForAction('main.toggle-dock');
            // clang-format off
            render(html `
        <span class="dockside-title"
              title=${i18nString(UIStrings.placementOfDevtoolsRelativeToThe, { PH1: toggleDockSideShortcut.title() })}>
          ${i18nString(UIStrings.dockSide)}
        </span>
        <devtools-toolbar @mousedown=${(event) => event.consume()}>
          <devtools-button class="toolbar-button"
                           jslog=${VisualLogging.toggle().track({ click: true }).context('current-dock-state-undock')}
                           title=${i18nString(UIStrings.undockIntoSeparateWindow)}
                           aria-label=${i18nString(UIStrings.undockIntoSeparateWindow)}
                           .iconName=${'dock-window'}
                           .toggled=${dockController.dockSide() === "undocked" /* UI.DockController.DockState.UNDOCKED */}
                           .toggledIconName=${'dock-window'}
                           .toggleType=${"primary-toggle" /* Buttons.Button.ToggleType.PRIMARY */}
                           .variant=${"icon_toggle" /* Buttons.Button.Variant.ICON_TOGGLE */}
                           @click=${setDockSide.bind(null, "undocked" /* UI.DockController.DockState.UNDOCKED */)}></devtools-button>
          <devtools-button class="toolbar-button"
                           jslog=${VisualLogging.toggle().track({ click: true }).context('current-dock-state-left')}
                           title=${i18nString(UIStrings.dockToLeft)}
                           aria-label=${i18nString(UIStrings.dockToLeft)}
                           .iconName=${'dock-left'}
                           .toggled=${dockController.dockSide() === "left" /* UI.DockController.DockState.LEFT */}
                           .toggledIconName=${'dock-left'}
                           .toggleType=${"primary-toggle" /* Buttons.Button.ToggleType.PRIMARY */}
                           .variant=${"icon_toggle" /* Buttons.Button.Variant.ICON_TOGGLE */}
                           @click=${setDockSide.bind(null, "left" /* UI.DockController.DockState.LEFT */)}></devtools-button>
          <devtools-button class="toolbar-button"
                           jslog=${VisualLogging.toggle().track({ click: true }).context('current-dock-state-bottom')}
                           title=${i18nString(UIStrings.dockToBottom)}
                           aria-label=${i18nString(UIStrings.dockToBottom)}
                           .iconName=${'dock-bottom'}
                           .toggled=${dockController.dockSide() === "bottom" /* UI.DockController.DockState.BOTTOM */}
                           .toggledIconName=${'dock-bottom'}
                           .toggleType=${"primary-toggle" /* Buttons.Button.ToggleType.PRIMARY */}
                           .variant=${"icon_toggle" /* Buttons.Button.Variant.ICON_TOGGLE */}
                           @click=${setDockSide.bind(null, "bottom" /* UI.DockController.DockState.BOTTOM */)}></devtools-button>
          <devtools-button class="toolbar-button"
                           jslog=${VisualLogging.toggle().track({ click: true }).context('current-dock-state-right')}
                           title=${i18nString(UIStrings.dockToRight)}
                           aria-label=${i18nString(UIStrings.dockToRight)}
                           .iconName=${'dock-right'}
                           .toggled=${dockController.dockSide() === "right" /* UI.DockController.DockState.RIGHT */}
                           .toggledIconName=${'dock-right'}
                           .toggleType=${"primary-toggle" /* Buttons.Button.ToggleType.PRIMARY */}
                           .variant=${"icon_toggle" /* Buttons.Button.Variant.ICON_TOGGLE */}
                           @click=${setDockSide.bind(null, "right" /* UI.DockController.DockState.RIGHT */)}></devtools-button>
        </devtools-toolbar>
      `, dockItemElement, { host: this });
            // clang-format on
            dockItemElement.addEventListener('keydown', event => {
                let dir = 0;
                if (event.key === 'ArrowLeft') {
                    dir = -1;
                }
                else if (event.key === 'ArrowRight') {
                    dir = 1;
                }
                else if (event.key === 'ArrowDown') {
                    const contextMenuElement = dockItemElement.closest('.soft-context-menu');
                    contextMenuElement?.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowDown' }));
                    return;
                }
                else {
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
        const button = this.#item.element;
        function setDockSide(side) {
            void dockController.once("AfterDockSideChanged" /* UI.DockController.Events.AFTER_DOCK_SIDE_CHANGED */).then(() => button.focus());
            dockController.setDockSide(side);
            contextMenu.discard();
        }
        contextMenu.defaultSection().appendAction('freestyler.main-menu', undefined, /* optional */ true);
        if (dockController.dockSide() === "undocked" /* UI.DockController.DockState.UNDOCKED */) {
            const mainTarget = SDK.TargetManager.TargetManager.instance().primaryPageTarget();
            if (mainTarget && mainTarget.type() === SDK.Target.Type.FRAME) {
                contextMenu.defaultSection().appendAction('inspector-main.focus-debuggee', i18nString(UIStrings.focusDebuggee));
            }
        }
        contextMenu.defaultSection().appendAction('main.toggle-drawer', UI.InspectorView.InspectorView.instance().drawerVisible() ? i18nString(UIStrings.hideConsoleDrawer) :
            i18nString(UIStrings.showConsoleDrawer));
        contextMenu.appendItemsAtLocation('mainMenu');
        const moreTools = contextMenu.defaultSection().appendSubMenuItem(i18nString(UIStrings.moreTools), false, 'more-tools');
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
            const promotionId = viewExtension.featurePromotionId();
            if (id === 'issues-pane') {
                moreTools.defaultSection().appendItem(title, () => {
                    Host.userMetrics.issuesPanelOpenedFrom(3 /* Host.UserMetrics.IssueOpener.HAMBURGER_MENU */);
                    void UI.ViewManager.ViewManager.instance().showView('issues-pane', /* userGesture */ true);
                }, { jslogContext: id });
                continue;
            }
            if (persistence !== 'closeable') {
                continue;
            }
            if (location !== 'drawer-view' && location !== 'panel') {
                continue;
            }
            let additionalElement = undefined;
            if (promotionId) {
                additionalElement = UI.UIUtils.maybeCreateNewBadge(promotionId);
            }
            moreTools.defaultSection().appendItem(title, () => {
                void UI.ViewManager.ViewManager.instance().showView(id, true, false);
            }, { additionalElement, isPreviewFeature: viewExtension.isPreviewFeature(), jslogContext: id });
        }
        const helpSubMenu = contextMenu.footerSection().appendSubMenuItem(i18nString(UIStrings.help), false, 'help');
        helpSubMenu.appendItemsAtLocation('mainMenuHelp');
    }
}
let settingsButtonProviderInstance;
export class SettingsButtonProvider {
    #settingsButton;
    constructor() {
        this.#settingsButton = UI.Toolbar.Toolbar.createActionButton('settings.show');
    }
    static instance(opts = { forceNew: null }) {
        const { forceNew } = opts;
        if (!settingsButtonProviderInstance || forceNew) {
            settingsButtonProviderInstance = new SettingsButtonProvider();
        }
        return settingsButtonProviderInstance;
    }
    item() {
        return this.#settingsButton;
    }
}
export class PauseListener {
    constructor() {
        SDK.TargetManager.TargetManager.instance().addModelListener(SDK.DebuggerModel.DebuggerModel, SDK.DebuggerModel.Events.DebuggerPaused, this.#debuggerPaused, this);
    }
    #debuggerPaused(event) {
        SDK.TargetManager.TargetManager.instance().removeModelListener(SDK.DebuggerModel.DebuggerModel, SDK.DebuggerModel.Events.DebuggerPaused, this.#debuggerPaused, this);
        const debuggerModel = event.data;
        const debuggerPausedDetails = debuggerModel.debuggerPausedDetails();
        UI.Context.Context.instance().setFlavor(SDK.Target.Target, debuggerModel.target());
        void Common.Revealer.reveal(debuggerPausedDetails);
    }
}
/** Unused but mentioned at https://chromedevtools.github.io/devtools-protocol/#:~:text=use%20Main.MainImpl.-,sendOverProtocol,-()%20in%20the **/
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
export class ReloadActionDelegate {
    handleAction(_context, actionId) {
        switch (actionId) {
            case 'main.debug-reload':
                Components.Reload.reload();
                return true;
        }
        return false;
    }
}
/**
 * For backwards-compatibility we iterate over the generator and drop the
 * intermediate results. The final response is transformed to its legacy type.
 * Instead of sending responses of type error, errors are throws.
 **/
export async function handleExternalRequest(input) {
    const generator = await handleExternalRequestGenerator(input);
    let result;
    do {
        result = await generator.next();
    } while (!result.done);
    const response = result.value;
    if (response.type === "error" /* AiAssistanceModel.AiAgent.ExternalRequestResponseType.ERROR */) {
        throw new Error(response.message);
    }
    if (response.type === "answer" /* AiAssistanceModel.AiAgent.ExternalRequestResponseType.ANSWER */) {
        return {
            response: response.message,
            devToolsLogs: response.devToolsLogs,
        };
    }
    throw new Error('Received no response of type answer or type error');
}
// @ts-expect-error
globalThis.handleExternalRequest = handleExternalRequest;
export async function handleExternalRequestGenerator(input) {
    switch (input.kind) {
        case 'PERFORMANCE_RELOAD_GATHER_INSIGHTS': {
            const TimelinePanel = await import('../../panels/timeline/timeline.js');
            return TimelinePanel.TimelinePanel.TimelinePanel.handleExternalRecordRequest();
        }
        case 'PERFORMANCE_ANALYZE': {
            const TimelinePanel = await import('../../panels/timeline/timeline.js');
            return await TimelinePanel.TimelinePanel.TimelinePanel.handleExternalAnalyzeRequest(input.args.prompt);
        }
        case 'NETWORK_DEBUGGER': {
            const AiAssistanceModel = await import('../../models/ai_assistance/ai_assistance.js');
            const conversationHandler = AiAssistanceModel.ConversationHandler.ConversationHandler.instance();
            return await conversationHandler.handleExternalRequest({
                conversationType: "drjones-network-request" /* AiAssistanceModel.AiHistoryStorage.ConversationType.NETWORK */,
                prompt: input.args.prompt,
                requestUrl: input.args.requestUrl,
            });
        }
        case 'LIVE_STYLE_DEBUGGER': {
            const AiAssistanceModel = await import('../../models/ai_assistance/ai_assistance.js');
            const conversationHandler = AiAssistanceModel.ConversationHandler.ConversationHandler.instance();
            return await conversationHandler.handleExternalRequest({
                conversationType: "freestyler" /* AiAssistanceModel.AiHistoryStorage.ConversationType.STYLING */,
                prompt: input.args.prompt,
                selector: input.args.selector,
            });
        }
    }
    // eslint-disable-next-line require-yield
    return (async function* () {
        return {
            type: "error" /* AiAssistanceModel.AiAgent.ExternalRequestResponseType.ERROR */,
            // @ts-expect-error
            message: `Debugging with an agent of type '${input.kind}' is not implemented yet.`,
        };
    })();
}
// @ts-expect-error
globalThis.handleExternalRequestGenerator = handleExternalRequestGenerator;
//# sourceMappingURL=MainImpl.js.map