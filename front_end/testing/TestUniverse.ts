// Copyright 2026 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

/* eslint @devtools/enforce-test-universe-return-types: "error" */

import * as Common from '../core/common/common.js';
import * as Host from '../core/host/host.js';
import * as Root from '../core/root/root.js';
import * as SDK from '../core/sdk/sdk.js';
import type * as Foundation from '../foundation/foundation.js';
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

import {DEFAULT_SETTING_REGISTRATIONS_FOR_TEST} from './SettingsHelpers.js';
import {createTarget} from './TargetHelpers.js';

export interface CreationOptions extends Partial<Foundation.Universe.CreationOptions> {
  pageResourceLoaderOptions?: {
    loadOverride: ((arg0: string) => Promise<{
                     success: boolean,
                     content: string|Uint8Array<ArrayBuffer>,
                     errorDescription: Host.ResourceLoader.LoadErrorDescription,
                   }>)|null,
    maxConcurrentLoads?: number,
  };
}

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
export class TestUniverse implements Foundation.Universe.Universe {
  readonly #context = new Root.DevToolsContext.WritableDevToolsContext();
  readonly #creationOptions?: CreationOptions;
  readonly supportsEmulation = true;

  readonly #producers = new Map<Root.DevToolsContext.ConstructorT<unknown>, () => unknown>([
    [
      AiAssistance.AiHistoryStorage.AiHistoryStorage,
      () => new AiAssistance.AiHistoryStorage.AiHistoryStorage(this.settings),
    ],
    [
      AiAssistance.BuiltInAi.BuiltInAi,
      () => new AiAssistance.BuiltInAi.BuiltInAi(),
    ],
    [
      AutofillManager.AutofillManager.AutofillManager,
      () => new AutofillManager.AutofillManager.AutofillManager(this.targetManager, this.frameManager),
    ],
    [
      Badges.UserBadges,
      () => new Badges.UserBadges(
          this.settings,
          this.gdpClient,
          this.#creationOptions?.inspectorFrontendHost ?? Host.InspectorFrontendHost.InspectorFrontendHostInstance,
          ),
    ],
    [
      Bindings.CSSWorkspaceBinding.CSSWorkspaceBinding,
      () => new Bindings.CSSWorkspaceBinding.CSSWorkspaceBinding(this.#resourceMapping, this.targetManager),
    ],
    [
      Bindings.DebuggerWorkspaceBinding.DebuggerWorkspaceBinding,
      () => new Bindings.DebuggerWorkspaceBinding.DebuggerWorkspaceBinding(this.#resourceMapping, this.targetManager,
                                                                           this.ignoreListManager, this.workspace),
    ],
    [
      Bindings.NetworkProject.NetworkProjectManager,
      () => new Bindings.NetworkProject.NetworkProjectManager(),
    ],
    [
      Bindings.PresentationConsoleMessageHelper.PresentationConsoleMessageManager,
      () => {
        const manager = new Bindings.PresentationConsoleMessageHelper.PresentationConsoleMessageManager(
            this.targetManager, this.workspace, this.debuggerWorkspaceBinding, this.cssWorkspaceBinding);
        manager.enable();
        return manager;
      },
    ],
    [
      Bindings.ResourceMapping.ResourceMapping,
      () => new Bindings.ResourceMapping.ResourceMapping(this.targetManager, this.workspace),
    ],
    [
      Breakpoints.BreakpointManager.BreakpointManager,
      () => new Breakpoints.BreakpointManager.BreakpointManager(this.targetManager, this.workspace,
                                                                this.debuggerWorkspaceBinding, this.settings),
    ],
    [
      Common.Console.Console,
      () => new Common.Console.Console(),
    ],
    [
      Common.Settings.Settings,
      () => {
        const storage = new Common.Settings.SettingsStorage({}, undefined, 'test');
        const options = {
          syncedStorage: storage,
          globalStorage: storage,
          localStorage: storage,
          settingRegistrations: [...DEFAULT_SETTING_REGISTRATIONS_FOR_TEST],
          console: this.console,
          ...this.#creationOptions?.settingsCreationOptions,
        };
        return new Common.Settings.Settings(options);
      },
    ],
    [
      CrUXManager.CrUXManager,
      () => new CrUXManager.CrUXManager(this.targetManager, this.settings),
    ],
    [
      Emulation.DeviceModeModel.DeviceModeModel,
      () => new Emulation.DeviceModeModel.DeviceModeModel(this.targetManager, this.settings,
                                                          this.multitargetNetworkManager),
    ],
    [
      Emulation.EmulatedDevices.EmulatedDevicesList,
      () => new Emulation.EmulatedDevices.EmulatedDevicesList(this.settings),
    ],
    [
      Host.AidaClient.HostConfigTracker,
      () => new Host.AidaClient.HostConfigTracker(),
    ],
    [
      Host.GdpClient.GdpClient,
      () => new Host.GdpClient.GdpClient(),
    ],
    [
      JavaScriptMetadata.JavaScriptMetadata.JavaScriptMetadataImpl,
      () => new JavaScriptMetadata.JavaScriptMetadata.JavaScriptMetadataImpl(),
    ],
    [
      LiveMetrics.LiveMetrics,
      () => new LiveMetrics.LiveMetrics(this.targetManager, this.deviceModeModel),
    ],
    [
      Logs.LogManager.LogManager,
      () => new Logs.LogManager.LogManager(this.targetManager, this.networkLog),
    ],
    [
      Logs.NetworkLog.NetworkLog,
      () => new Logs.NetworkLog.NetworkLog(this.targetManager, this.settings),
    ],
    [
      Persistence.AutomaticFileSystemManager.AutomaticFileSystemManager,
      () => new Persistence.AutomaticFileSystemManager.AutomaticFileSystemManager(
          this.#creationOptions?.inspectorFrontendHost ?? Host.InspectorFrontendHost.InspectorFrontendHostInstance,
          this.projectSettingsModel,
          ),
    ],
    [
      Persistence.AutomaticFileSystemWorkspaceBinding.AutomaticFileSystemWorkspaceBinding,
      () => new Persistence.AutomaticFileSystemWorkspaceBinding.AutomaticFileSystemWorkspaceBinding(
          this.automaticFileSystemManager,
          this.isolatedFileSystemManager,
          this.workspace,
          ),
    ],
    [
      Persistence.FileSystemWorkspaceBinding.FileSystemWorkspaceBinding,
      () => new Persistence.FileSystemWorkspaceBinding.FileSystemWorkspaceBinding(
          this.isolatedFileSystemManager,
          this.workspace,
          ),
    ],
    [
      Persistence.IsolatedFileSystemManager.IsolatedFileSystemManager,
      () => new Persistence.IsolatedFileSystemManager.IsolatedFileSystemManager(
          this.settings,
          this.console,
          ),
    ],
    [
      Persistence.NetworkPersistenceManager.NetworkPersistenceManager,
      () => new Persistence.NetworkPersistenceManager.NetworkPersistenceManager(
          this.workspace,
          this.persistence,
          this.breakpointManager,
          this.targetManager,
          this.settings,
          this.isolatedFileSystemManager,
          this.multitargetNetworkManager,
          ),
    ],
    [
      Persistence.Persistence.PersistenceImpl,
      () => new Persistence.Persistence.PersistenceImpl(this.workspace, this.breakpointManager),
    ],
    [
      ProjectSettings.ProjectSettingsModel.ProjectSettingsModel,
      () => new ProjectSettings.ProjectSettingsModel.ProjectSettingsModel(
          this.#creationOptions?.hostConfig ?? {} as Root.Runtime.HostConfig,
          this.pageResourceLoader,
          this.targetManager,
          ),
    ],
    [
      SDK.CPUThrottlingManager.CPUThrottlingManager,
      () => new SDK.CPUThrottlingManager.CPUThrottlingManager(this.settings, this.targetManager),
    ],
    [
      SDK.DOMDebuggerModel.DOMDebuggerManager,
      () => new SDK.DOMDebuggerModel.DOMDebuggerManager(this.targetManager),
    ],
    [
      SDK.DOMModel.DOMModelUndoStack,
      () => new SDK.DOMModel.DOMModelUndoStack(),
    ],
    [
      SDK.EventBreakpointsModel.EventBreakpointsManager,
      () => new SDK.EventBreakpointsModel.EventBreakpointsManager(this.targetManager),
    ],
    [
      SDK.FrameManager.FrameManager,
      () => new SDK.FrameManager.FrameManager(this.targetManager),
    ],
    [
      SDK.IsolateManager.IsolateManager,
      () => new SDK.IsolateManager.IsolateManager(this.targetManager),
    ],
    [
      SDK.NetworkManager.MultitargetNetworkManager,
      () => new SDK.NetworkManager.MultitargetNetworkManager(this.targetManager),
    ],
    [
      SDK.PageResourceLoader.PageResourceLoader,
      () => {
        const options = this.#creationOptions?.pageResourceLoaderOptions ?? {
          loadOverride: null,
        };
        return new SDK.PageResourceLoader.PageResourceLoader(this.targetManager, this.settings,
                                                             this.multitargetNetworkManager, options.loadOverride,
                                                             options.maxConcurrentLoads);
      },
    ],
    [
      SDK.TargetManager.TargetManager,
      () => {
        const universe = this;
        const context = new (class LazyContext extends Root.DevToolsContext.WritableDevToolsContext {
          // eslint-disable-next-line @devtools/enforce-test-universe-return-types
          override get<T>(ctor: Root.DevToolsContext.ConstructorT<T>): T {
            return universe.get(ctor);
          }
          // eslint-disable-next-line @devtools/enforce-test-universe-return-types
          override has<T>(ctor: Root.DevToolsContext.ConstructorT<T>): boolean {
            return universe.#context.has(ctor) || universe.#producers.has(ctor);
          }
        })();
        return new SDK.TargetManager.TargetManager(context,
                                                   this.#creationOptions?.overrideAutoStartModels ?? new Set());
      },
    ],
    [
      Workspace.FileManager.FileManager,
      () => new Workspace.FileManager.FileManager(),
    ],
    [
      Workspace.IgnoreListManager.IgnoreListManager,
      () => new Workspace.IgnoreListManager.IgnoreListManager(this.settings, this.targetManager),
    ],
    [
      Workspace.Workspace.WorkspaceImpl,
      () => new Workspace.Workspace.WorkspaceImpl(),
    ],
    [
      WorkspaceDiff.WorkspaceDiff.WorkspaceDiffImpl,
      () => new WorkspaceDiff.WorkspaceDiff.WorkspaceDiffImpl(this.workspace, this.persistence,
                                                              this.networkPersistenceManager, this.settings),
    ],
  ]);

  constructor(options?: CreationOptions) {
    this.#creationOptions = options;
  }

  // eslint-disable-next-line @devtools/enforce-test-universe-return-types
  get<T>(ctor: Root.DevToolsContext.ConstructorT<T>): T {
    if (this.#context.has(ctor)) {
      return this.#context.get(ctor);
    }
    const producer = this.#producers.get(ctor);
    if (producer) {
      const instance = producer() as T;
      this.#context.set(ctor, instance);
      return instance;
    }
    throw new Error(`Class ${ctor.name} not set-up in TestUniverse.`);
  }

  /**
   * Convenience shortcut for `createTarget({targetManager: testUniverse.targetManager})`
   */
  createTarget(options: Parameters<typeof createTarget>[0] = {}): SDK.Target.Target {
    return createTarget({...options, targetManager: this.targetManager});
  }

  get aiHistoryStorage(): AiAssistance.AiHistoryStorage.AiHistoryStorage {
    return this.get(AiAssistance.AiHistoryStorage.AiHistoryStorage);
  }

  get builtInAi(): AiAssistance.BuiltInAi.BuiltInAi {
    return this.get(AiAssistance.BuiltInAi.BuiltInAi);
  }

  get autofillManager(): AutofillManager.AutofillManager.AutofillManager {
    return this.get(AutofillManager.AutofillManager.AutofillManager);
  }

  get automaticFileSystemManager(): Persistence.AutomaticFileSystemManager.AutomaticFileSystemManager {
    return this.get(Persistence.AutomaticFileSystemManager.AutomaticFileSystemManager);
  }

  get automaticFileSystemWorkspaceBinding():
      Persistence.AutomaticFileSystemWorkspaceBinding.AutomaticFileSystemWorkspaceBinding {
    return this.get(Persistence.AutomaticFileSystemWorkspaceBinding.AutomaticFileSystemWorkspaceBinding);
  }

  get breakpointManager(): Breakpoints.BreakpointManager.BreakpointManager {
    return this.get(Breakpoints.BreakpointManager.BreakpointManager);
  }

  get console(): Common.Console.Console {
    return this.get(Common.Console.Console);
  }

  // eslint-disable-next-line @devtools/enforce-test-universe-return-types
  get context(): Root.DevToolsContext.DevToolsContext {
    return this.#context;
  }

  get cpuThrottlingManager(): SDK.CPUThrottlingManager.CPUThrottlingManager {
    return this.get(SDK.CPUThrottlingManager.CPUThrottlingManager);
  }

  get cruxManager(): CrUXManager.CrUXManager {
    return this.get(CrUXManager.CrUXManager);
  }

  get cssWorkspaceBinding(): Bindings.CSSWorkspaceBinding.CSSWorkspaceBinding {
    return this.get(Bindings.CSSWorkspaceBinding.CSSWorkspaceBinding);
  }

  get debuggerWorkspaceBinding(): Bindings.DebuggerWorkspaceBinding.DebuggerWorkspaceBinding {
    return this.get(Bindings.DebuggerWorkspaceBinding.DebuggerWorkspaceBinding);
  }

  get deviceModeModel(): Emulation.DeviceModeModel.DeviceModeModel {
    return this.get(Emulation.DeviceModeModel.DeviceModeModel);
  }

  get domDebuggerManager(): SDK.DOMDebuggerModel.DOMDebuggerManager {
    return this.get(SDK.DOMDebuggerModel.DOMDebuggerManager);
  }

  get domModelUndoStack(): SDK.DOMModel.DOMModelUndoStack {
    return this.get(SDK.DOMModel.DOMModelUndoStack);
  }

  get emulatedDevicesList(): Emulation.EmulatedDevices.EmulatedDevicesList {
    return this.get(Emulation.EmulatedDevices.EmulatedDevicesList);
  }

  get eventBreakpointsManager(): SDK.EventBreakpointsModel.EventBreakpointsManager {
    return this.get(SDK.EventBreakpointsModel.EventBreakpointsManager);
  }

  get fileManager(): Workspace.FileManager.FileManager {
    return this.get(Workspace.FileManager.FileManager);
  }

  get fileSystemWorkspaceBinding(): Persistence.FileSystemWorkspaceBinding.FileSystemWorkspaceBinding {
    return this.get(Persistence.FileSystemWorkspaceBinding.FileSystemWorkspaceBinding);
  }

  get frameManager(): SDK.FrameManager.FrameManager {
    return this.get(SDK.FrameManager.FrameManager);
  }

  get gdpClient(): Host.GdpClient.GdpClient {
    return this.get(Host.GdpClient.GdpClient);
  }

  get hostConfigTracker(): Host.AidaClient.HostConfigTracker {
    return this.get(Host.AidaClient.HostConfigTracker);
  }

  get ignoreListManager(): Workspace.IgnoreListManager.IgnoreListManager {
    return this.get(Workspace.IgnoreListManager.IgnoreListManager);
  }

  get isolateManager(): SDK.IsolateManager.IsolateManager {
    return this.get(SDK.IsolateManager.IsolateManager);
  }

  get issuesManager(): IssuesManager.IssuesManager.IssuesManager {
    if (!this.#context.has(IssuesManager.IssuesManager.IssuesManager)) {
      this.#context.set(IssuesManager.IssuesManager.IssuesManager,
                        new IssuesManager.IssuesManager.IssuesManager(
                            IssuesManager.Issue.getShowThirdPartyIssuesSetting(this.settings),
                            IssuesManager.IssuesManager.getHideIssueByCodeSetting(this.settings),
                            this.frameManager,
                            this.targetManager,
                            this.workspace,
                            this.debuggerWorkspaceBinding,
                            this.cssWorkspaceBinding,
                            ));
    }
    return this.#context.get(IssuesManager.IssuesManager.IssuesManager);
  }

  get logManager(): Logs.LogManager.LogManager {
    return this.get(Logs.LogManager.LogManager);
  }

  get isolatedFileSystemManager(): Persistence.IsolatedFileSystemManager.IsolatedFileSystemManager {
    return this.get(Persistence.IsolatedFileSystemManager.IsolatedFileSystemManager);
  }

  get javaScriptMetadata(): JavaScriptMetadata.JavaScriptMetadata.JavaScriptMetadataImpl {
    return this.get(JavaScriptMetadata.JavaScriptMetadata.JavaScriptMetadataImpl);
  }

  get liveMetrics(): LiveMetrics.LiveMetrics {
    return this.get(LiveMetrics.LiveMetrics);
  }

  get multitargetNetworkManager(): SDK.NetworkManager.MultitargetNetworkManager {
    return this.get(SDK.NetworkManager.MultitargetNetworkManager);
  }

  get networkLog(): Logs.NetworkLog.NetworkLog {
    return this.get(Logs.NetworkLog.NetworkLog);
  }

  get networkPersistenceManager(): Persistence.NetworkPersistenceManager.NetworkPersistenceManager {
    return this.get(Persistence.NetworkPersistenceManager.NetworkPersistenceManager);
  }

  get networkProjectManager(): Bindings.NetworkProject.NetworkProjectManager {
    return this.get(Bindings.NetworkProject.NetworkProjectManager);
  }

  get pageResourceLoader(): SDK.PageResourceLoader.PageResourceLoader {
    return this.get(SDK.PageResourceLoader.PageResourceLoader);
  }

  get persistence(): Persistence.Persistence.PersistenceImpl {
    return this.get(Persistence.Persistence.PersistenceImpl);
  }

  get presentationConsoleMessageManager(): Bindings.PresentationConsoleMessageHelper.PresentationConsoleMessageManager {
    return this.get(Bindings.PresentationConsoleMessageHelper.PresentationConsoleMessageManager);
  }

  get projectSettingsModel(): ProjectSettings.ProjectSettingsModel.ProjectSettingsModel {
    return this.get(ProjectSettings.ProjectSettingsModel.ProjectSettingsModel);
  }

  get targetManager(): SDK.TargetManager.TargetManager {
    return this.get(SDK.TargetManager.TargetManager);
  }

  get userBadges(): Badges.UserBadges {
    return this.get(Badges.UserBadges);
  }

  get settings(): Common.Settings.Settings {
    return this.get(Common.Settings.Settings);
  }

  get workspace(): Workspace.Workspace.WorkspaceImpl {
    return this.get(Workspace.Workspace.WorkspaceImpl);
  }

  get workspaceDiff(): WorkspaceDiff.WorkspaceDiff.WorkspaceDiffImpl {
    return this.get(WorkspaceDiff.WorkspaceDiff.WorkspaceDiffImpl);
  }

  get #resourceMapping(): Bindings.ResourceMapping.ResourceMapping {
    return this.get(Bindings.ResourceMapping.ResourceMapping);
  }
}
