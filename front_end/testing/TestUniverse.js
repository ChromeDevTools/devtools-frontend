// Copyright 2026 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.
/* eslint @devtools/enforce-test-universe-return-types: "error" */
import * as Common from '../core/common/common.js';
import * as Host from '../core/host/host.js';
import * as Root from '../core/root/root.js';
import * as SDK from '../core/sdk/sdk.js';
import * as AiAssistance from '../models/ai_assistance/ai_assistance.js';
import * as AutofillManager from '../models/autofill_manager/autofill_manager.js';
import * as Badges from '../models/badges/badges.js';
import * as Bindings from '../models/bindings/bindings.js';
import * as Breakpoints from '../models/breakpoints/breakpoints.js';
import * as CrUXManager from '../models/crux-manager/crux-manager.js';
import * as Emulation from '../models/emulation/emulation.js';
import * as IssuesManager from '../models/issues_manager/issues_manager.js';
import * as JavaScriptMetadata from '../models/javascript_metadata/javascript_metadata.js';
import * as LiveMetrics from '../models/live-metrics/live-metrics.js';
import * as Logs from '../models/logs/logs.js';
import * as Persistence from '../models/persistence/persistence.js';
import * as ProjectSettings from '../models/project_settings/project_settings.js';
import * as Workspace from '../models/workspace/workspace.js';
import * as WorkspaceDiff from '../models/workspace_diff/workspace_diff.js';
import { DEFAULT_SETTING_REGISTRATIONS_FOR_TEST } from './SettingsHelpers.js';
import { createTarget } from './TargetHelpers.js';
/**
 * Similar to a `Foundation.Universe` but creates instances lazily as required.
 *
 * IMPORTANT: Do not add any `.instance()` singleton access here. Only add classes
 * that take all their dependencies via constructor (including Settings)!
 *
 * Registered settings need to be passed via constructor. By default `TestUniverse`
 * uses DEFAULT_SETTING_REGISTRATIONS_FOR_TEST, but it will not read the global
 * registered settings (on purpose).
 */
export class TestUniverse {
    #context = new Root.DevToolsContext.WritableDevToolsContext();
    #creationOptions;
    supportsEmulation = true;
    constructor(options) {
        this.#creationOptions = options;
    }
    /**
     * Convenience shortcut for `createTarget({targetManager: testUniverse.targetManager})`
     */
    createTarget(options = {}) {
        return createTarget({ ...options, targetManager: this.targetManager });
    }
    get aiHistoryStorage() {
        if (!this.#context.has(AiAssistance.AiHistoryStorage.AiHistoryStorage)) {
            this.#context.set(AiAssistance.AiHistoryStorage.AiHistoryStorage, new AiAssistance.AiHistoryStorage.AiHistoryStorage(this.settings));
        }
        return this.#context.get(AiAssistance.AiHistoryStorage.AiHistoryStorage);
    }
    get autofillManager() {
        if (!this.#context.has(AutofillManager.AutofillManager.AutofillManager)) {
            this.#context.set(AutofillManager.AutofillManager.AutofillManager, new AutofillManager.AutofillManager.AutofillManager(this.targetManager, this.frameManager));
        }
        return this.#context.get(AutofillManager.AutofillManager.AutofillManager);
    }
    get automaticFileSystemManager() {
        if (!this.#context.has(Persistence.AutomaticFileSystemManager.AutomaticFileSystemManager)) {
            this.#context.set(Persistence.AutomaticFileSystemManager.AutomaticFileSystemManager, new Persistence.AutomaticFileSystemManager.AutomaticFileSystemManager(this.#creationOptions?.inspectorFrontendHost ?? Host.InspectorFrontendHost.InspectorFrontendHostInstance, this.projectSettingsModel));
        }
        return this.#context.get(Persistence.AutomaticFileSystemManager.AutomaticFileSystemManager);
    }
    get automaticFileSystemWorkspaceBinding() {
        if (!this.#context.has(Persistence.AutomaticFileSystemWorkspaceBinding.AutomaticFileSystemWorkspaceBinding)) {
            this.#context.set(Persistence.AutomaticFileSystemWorkspaceBinding.AutomaticFileSystemWorkspaceBinding, new Persistence.AutomaticFileSystemWorkspaceBinding.AutomaticFileSystemWorkspaceBinding(this.automaticFileSystemManager, this.isolatedFileSystemManager, this.workspace));
        }
        return this.#context.get(Persistence.AutomaticFileSystemWorkspaceBinding.AutomaticFileSystemWorkspaceBinding);
    }
    get breakpointManager() {
        if (!this.#context.has(Breakpoints.BreakpointManager.BreakpointManager)) {
            this.#context.set(Breakpoints.BreakpointManager.BreakpointManager, new Breakpoints.BreakpointManager.BreakpointManager(this.targetManager, this.workspace, this.debuggerWorkspaceBinding, this.settings));
        }
        return this.#context.get(Breakpoints.BreakpointManager.BreakpointManager);
    }
    get console() {
        if (!this.#context.has(Common.Console.Console)) {
            this.#context.set(Common.Console.Console, new Common.Console.Console());
        }
        return this.#context.get(Common.Console.Console);
    }
    // eslint-disable-next-line @devtools/enforce-test-universe-return-types
    get context() {
        return this.#context;
    }
    get cpuThrottlingManager() {
        if (!this.#context.has(SDK.CPUThrottlingManager.CPUThrottlingManager)) {
            this.#context.set(SDK.CPUThrottlingManager.CPUThrottlingManager, new SDK.CPUThrottlingManager.CPUThrottlingManager(this.settings, this.targetManager));
        }
        return this.#context.get(SDK.CPUThrottlingManager.CPUThrottlingManager);
    }
    get cruxManager() {
        if (!this.#context.has(CrUXManager.CrUXManager)) {
            this.#context.set(CrUXManager.CrUXManager, new CrUXManager.CrUXManager(this.targetManager, this.settings));
        }
        return this.#context.get(CrUXManager.CrUXManager);
    }
    get cssWorkspaceBinding() {
        if (!this.#context.has(Bindings.CSSWorkspaceBinding.CSSWorkspaceBinding)) {
            this.#context.set(Bindings.CSSWorkspaceBinding.CSSWorkspaceBinding, new Bindings.CSSWorkspaceBinding.CSSWorkspaceBinding(this.#resourceMapping, this.targetManager));
        }
        return this.#context.get(Bindings.CSSWorkspaceBinding.CSSWorkspaceBinding);
    }
    get debuggerWorkspaceBinding() {
        if (!this.#context.has(Bindings.DebuggerWorkspaceBinding.DebuggerWorkspaceBinding)) {
            this.#context.set(Bindings.DebuggerWorkspaceBinding.DebuggerWorkspaceBinding, new Bindings.DebuggerWorkspaceBinding.DebuggerWorkspaceBinding(this.#resourceMapping, this.targetManager, this.ignoreListManager, this.workspace));
        }
        return this.#context.get(Bindings.DebuggerWorkspaceBinding.DebuggerWorkspaceBinding);
    }
    get deviceModeModel() {
        if (!this.#context.has(Emulation.DeviceModeModel.DeviceModeModel)) {
            this.#context.set(Emulation.DeviceModeModel.DeviceModeModel, new Emulation.DeviceModeModel.DeviceModeModel(this.targetManager, this.settings, this.multitargetNetworkManager));
        }
        return this.#context.get(Emulation.DeviceModeModel.DeviceModeModel);
    }
    get domDebuggerManager() {
        if (!this.#context.has(SDK.DOMDebuggerModel.DOMDebuggerManager)) {
            this.#context.set(SDK.DOMDebuggerModel.DOMDebuggerManager, new SDK.DOMDebuggerModel.DOMDebuggerManager(this.targetManager));
        }
        return this.#context.get(SDK.DOMDebuggerModel.DOMDebuggerManager);
    }
    get domModelUndoStack() {
        if (!this.#context.has(SDK.DOMModel.DOMModelUndoStack)) {
            this.#context.set(SDK.DOMModel.DOMModelUndoStack, new SDK.DOMModel.DOMModelUndoStack());
        }
        return this.#context.get(SDK.DOMModel.DOMModelUndoStack);
    }
    get emulatedDevicesList() {
        if (!this.#context.has(Emulation.EmulatedDevices.EmulatedDevicesList)) {
            this.#context.set(Emulation.EmulatedDevices.EmulatedDevicesList, new Emulation.EmulatedDevices.EmulatedDevicesList(this.settings));
        }
        return this.#context.get(Emulation.EmulatedDevices.EmulatedDevicesList);
    }
    get eventBreakpointsManager() {
        if (!this.#context.has(SDK.EventBreakpointsModel.EventBreakpointsManager)) {
            this.#context.set(SDK.EventBreakpointsModel.EventBreakpointsManager, new SDK.EventBreakpointsModel.EventBreakpointsManager(this.targetManager));
        }
        return this.#context.get(SDK.EventBreakpointsModel.EventBreakpointsManager);
    }
    get fileManager() {
        if (!this.#context.has(Workspace.FileManager.FileManager)) {
            this.#context.set(Workspace.FileManager.FileManager, new Workspace.FileManager.FileManager());
        }
        return this.#context.get(Workspace.FileManager.FileManager);
    }
    get fileSystemWorkspaceBinding() {
        if (!this.#context.has(Persistence.FileSystemWorkspaceBinding.FileSystemWorkspaceBinding)) {
            this.#context.set(Persistence.FileSystemWorkspaceBinding.FileSystemWorkspaceBinding, new Persistence.FileSystemWorkspaceBinding.FileSystemWorkspaceBinding(this.isolatedFileSystemManager, this.workspace));
        }
        return this.#context.get(Persistence.FileSystemWorkspaceBinding.FileSystemWorkspaceBinding);
    }
    get frameManager() {
        if (!this.#context.has(SDK.FrameManager.FrameManager)) {
            this.#context.set(SDK.FrameManager.FrameManager, new SDK.FrameManager.FrameManager(this.targetManager));
        }
        return this.#context.get(SDK.FrameManager.FrameManager);
    }
    get gdpClient() {
        if (!this.#context.has(Host.GdpClient.GdpClient)) {
            this.#context.set(Host.GdpClient.GdpClient, new Host.GdpClient.GdpClient());
        }
        return this.#context.get(Host.GdpClient.GdpClient);
    }
    get hostConfigTracker() {
        if (!this.#context.has(Host.AidaClient.HostConfigTracker)) {
            this.#context.set(Host.AidaClient.HostConfigTracker, new Host.AidaClient.HostConfigTracker());
        }
        return this.#context.get(Host.AidaClient.HostConfigTracker);
    }
    get ignoreListManager() {
        if (!this.#context.has(Workspace.IgnoreListManager.IgnoreListManager)) {
            this.#context.set(Workspace.IgnoreListManager.IgnoreListManager, new Workspace.IgnoreListManager.IgnoreListManager(this.settings, this.targetManager));
        }
        return this.#context.get(Workspace.IgnoreListManager.IgnoreListManager);
    }
    get isolateManager() {
        if (!this.#context.has(SDK.IsolateManager.IsolateManager)) {
            this.#context.set(SDK.IsolateManager.IsolateManager, new SDK.IsolateManager.IsolateManager(this.targetManager));
        }
        return this.#context.get(SDK.IsolateManager.IsolateManager);
    }
    get issuesManager() {
        if (!this.#context.has(IssuesManager.IssuesManager.IssuesManager)) {
            this.#context.set(IssuesManager.IssuesManager.IssuesManager, new IssuesManager.IssuesManager.IssuesManager(IssuesManager.Issue.getShowThirdPartyIssuesSetting(this.settings), IssuesManager.IssuesManager.getHideIssueByCodeSetting(this.settings), this.frameManager, this.targetManager, this.workspace, this.debuggerWorkspaceBinding, this.cssWorkspaceBinding));
        }
        return this.#context.get(IssuesManager.IssuesManager.IssuesManager);
    }
    get logManager() {
        if (!this.#context.has(Logs.LogManager.LogManager)) {
            this.#context.set(Logs.LogManager.LogManager, new Logs.LogManager.LogManager(this.targetManager, this.networkLog));
        }
        return this.#context.get(Logs.LogManager.LogManager);
    }
    get isolatedFileSystemManager() {
        if (!this.#context.has(Persistence.IsolatedFileSystemManager.IsolatedFileSystemManager)) {
            this.#context.set(Persistence.IsolatedFileSystemManager.IsolatedFileSystemManager, new Persistence.IsolatedFileSystemManager.IsolatedFileSystemManager(this.settings, this.console));
        }
        return this.#context.get(Persistence.IsolatedFileSystemManager.IsolatedFileSystemManager);
    }
    get javaScriptMetadata() {
        if (!this.#context.has(JavaScriptMetadata.JavaScriptMetadata.JavaScriptMetadataImpl)) {
            this.#context.set(JavaScriptMetadata.JavaScriptMetadata.JavaScriptMetadataImpl, new JavaScriptMetadata.JavaScriptMetadata.JavaScriptMetadataImpl());
        }
        return this.#context.get(JavaScriptMetadata.JavaScriptMetadata.JavaScriptMetadataImpl);
    }
    get liveMetrics() {
        if (!this.#context.has(LiveMetrics.LiveMetrics)) {
            this.#context.set(LiveMetrics.LiveMetrics, new LiveMetrics.LiveMetrics(this.targetManager, this.deviceModeModel));
        }
        return this.#context.get(LiveMetrics.LiveMetrics);
    }
    get multitargetNetworkManager() {
        if (!this.#context.has(SDK.NetworkManager.MultitargetNetworkManager)) {
            const multitargetNetworkManager = new SDK.NetworkManager.MultitargetNetworkManager(this.targetManager);
            this.#context.set(SDK.NetworkManager.MultitargetNetworkManager, multitargetNetworkManager);
        }
        return this.#context.get(SDK.NetworkManager.MultitargetNetworkManager);
    }
    get networkLog() {
        if (!this.#context.has(Logs.NetworkLog.NetworkLog)) {
            this.#context.set(Logs.NetworkLog.NetworkLog, new Logs.NetworkLog.NetworkLog(this.targetManager, this.settings));
        }
        return this.#context.get(Logs.NetworkLog.NetworkLog);
    }
    get networkPersistenceManager() {
        if (!this.#context.has(Persistence.NetworkPersistenceManager.NetworkPersistenceManager)) {
            this.#context.set(Persistence.NetworkPersistenceManager.NetworkPersistenceManager, new Persistence.NetworkPersistenceManager.NetworkPersistenceManager(this.workspace, this.persistence, this.breakpointManager, this.targetManager, this.settings, this.isolatedFileSystemManager, this.multitargetNetworkManager));
        }
        return this.#context.get(Persistence.NetworkPersistenceManager.NetworkPersistenceManager);
    }
    get networkProjectManager() {
        if (!this.#context.has(Bindings.NetworkProject.NetworkProjectManager)) {
            this.#context.set(Bindings.NetworkProject.NetworkProjectManager, new Bindings.NetworkProject.NetworkProjectManager());
        }
        return this.#context.get(Bindings.NetworkProject.NetworkProjectManager);
    }
    get pageResourceLoader() {
        if (!this.#context.has(SDK.PageResourceLoader.PageResourceLoader)) {
            const options = this.#creationOptions?.pageResourceLoaderOptions ?? {
                loadOverride: null,
            };
            const pageResourceLoader = new SDK.PageResourceLoader.PageResourceLoader(this.targetManager, this.settings, this.multitargetNetworkManager, options.loadOverride, options.maxConcurrentLoads);
            this.#context.set(SDK.PageResourceLoader.PageResourceLoader, pageResourceLoader);
        }
        return this.#context.get(SDK.PageResourceLoader.PageResourceLoader);
    }
    get persistence() {
        if (!this.#context.has(Persistence.Persistence.PersistenceImpl)) {
            this.#context.set(Persistence.Persistence.PersistenceImpl, new Persistence.Persistence.PersistenceImpl(this.workspace, this.breakpointManager));
        }
        return this.#context.get(Persistence.Persistence.PersistenceImpl);
    }
    get presentationConsoleMessageManager() {
        if (!this.#context.has(Bindings.PresentationConsoleMessageHelper.PresentationConsoleMessageManager)) {
            const manager = new Bindings.PresentationConsoleMessageHelper.PresentationConsoleMessageManager(this.targetManager, this.workspace, this.debuggerWorkspaceBinding, this.cssWorkspaceBinding);
            manager.enable();
            this.#context.set(Bindings.PresentationConsoleMessageHelper.PresentationConsoleMessageManager, manager);
        }
        return this.#context.get(Bindings.PresentationConsoleMessageHelper.PresentationConsoleMessageManager);
    }
    get projectSettingsModel() {
        if (!this.#context.has(ProjectSettings.ProjectSettingsModel.ProjectSettingsModel)) {
            this.#context.set(ProjectSettings.ProjectSettingsModel.ProjectSettingsModel, new ProjectSettings.ProjectSettingsModel.ProjectSettingsModel(this.#creationOptions?.hostConfig ?? {}, this.pageResourceLoader, this.targetManager));
        }
        return this.#context.get(ProjectSettings.ProjectSettingsModel.ProjectSettingsModel);
    }
    get targetManager() {
        if (!this.#context.has(SDK.TargetManager.TargetManager)) {
            // `SDKModel` instances pull their dependencies from the context we pass here.
            // Instead of eagerly creating them in `createTarget`, we pass a simple stub that
            // re-directs to the TestUniverse for lazy initialization. This also makes it explicit
            // what dependencies `SDKModel` instances are using and also safe-guards against
            // `createTarget({targetManager: universe.targetManager}) instantiations.
            const universe = this;
            const context = new (class LazyContext {
                // eslint-disable-next-line @devtools/enforce-test-universe-return-types
                get(ctor) {
                    if (ctor === Common.Settings.Settings.prototype.constructor) {
                        return universe.settings;
                    }
                    if (ctor === Common.Console.Console.prototype.constructor) {
                        return universe.console;
                    }
                    if (ctor === SDK.FrameManager.FrameManager.prototype.constructor) {
                        return universe.frameManager;
                    }
                    if (ctor === SDK.DOMModel.DOMModelUndoStack.prototype.constructor) {
                        return universe.domModelUndoStack;
                    }
                    if (ctor === SDK.PageResourceLoader.PageResourceLoader.prototype.constructor) {
                        return universe.pageResourceLoader;
                    }
                    if (ctor === SDK.IsolateManager.IsolateManager.prototype.constructor) {
                        return universe.isolateManager;
                    }
                    if (ctor === SDK.NetworkManager.MultitargetNetworkManager.prototype.constructor) {
                        return universe.multitargetNetworkManager;
                    }
                    if (ctor === Bindings.DebuggerWorkspaceBinding.DebuggerWorkspaceBinding.prototype.constructor) {
                        return universe.debuggerWorkspaceBinding;
                    }
                    throw new Error(`Class ${ctor.name} not set-up as a dependency for SDKModels in TestUniverse.ts. Add it to LazyContext#get in TestUniverse.ts`);
                }
            })();
            const targetManager = new SDK.TargetManager.TargetManager(context, this.#creationOptions?.overrideAutoStartModels ?? new Set());
            this.#context.set(SDK.TargetManager.TargetManager, targetManager);
        }
        return this.#context.get(SDK.TargetManager.TargetManager);
    }
    get userBadges() {
        if (!this.#context.has(Badges.UserBadges)) {
            this.#context.set(Badges.UserBadges, new Badges.UserBadges(this.settings, this.gdpClient, this.#creationOptions?.inspectorFrontendHost ?? Host.InspectorFrontendHost.InspectorFrontendHostInstance));
        }
        return this.#context.get(Badges.UserBadges);
    }
    get settings() {
        if (!this.#context.has(Common.Settings.Settings)) {
            const storage = new Common.Settings.SettingsStorage({}, undefined, 'test');
            const options = {
                syncedStorage: storage,
                globalStorage: storage,
                localStorage: storage,
                settingRegistrations: [...DEFAULT_SETTING_REGISTRATIONS_FOR_TEST],
                console: this.console,
                ...this.#creationOptions?.settingsCreationOptions,
            };
            const settings = new Common.Settings.Settings(options);
            this.#context.set(Common.Settings.Settings, settings);
        }
        return this.#context.get(Common.Settings.Settings);
    }
    get workspace() {
        if (!this.#context.has(Workspace.Workspace.WorkspaceImpl)) {
            this.#context.set(Workspace.Workspace.WorkspaceImpl, new Workspace.Workspace.WorkspaceImpl());
        }
        return this.#context.get(Workspace.Workspace.WorkspaceImpl);
    }
    get workspaceDiff() {
        if (!this.#context.has(WorkspaceDiff.WorkspaceDiff.WorkspaceDiffImpl)) {
            this.#context.set(WorkspaceDiff.WorkspaceDiff.WorkspaceDiffImpl, new WorkspaceDiff.WorkspaceDiff.WorkspaceDiffImpl(this.workspace, this.persistence, this.networkPersistenceManager, this.settings));
        }
        return this.#context.get(WorkspaceDiff.WorkspaceDiff.WorkspaceDiffImpl);
    }
    get #resourceMapping() {
        if (!this.#context.has(Bindings.ResourceMapping.ResourceMapping)) {
            this.#context.set(Bindings.ResourceMapping.ResourceMapping, new Bindings.ResourceMapping.ResourceMapping(this.targetManager, this.workspace));
        }
        return this.#context.get(Bindings.ResourceMapping.ResourceMapping);
    }
}
//# sourceMappingURL=TestUniverse.js.map