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
import { createTarget } from './TargetHelpers.js';
export interface CreationOptions extends Partial<Foundation.Universe.CreationOptions> {
    pageResourceLoaderOptions?: {
        loadOverride: ((arg0: string) => Promise<{
            success: boolean;
            content: string | Uint8Array<ArrayBuffer>;
            errorDescription: Host.ResourceLoader.LoadErrorDescription;
        }>) | null;
        maxConcurrentLoads?: number;
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
export declare class TestUniverse implements Foundation.Universe.Universe {
    #private;
    readonly supportsEmulation = true;
    constructor(options?: CreationOptions);
    /**
     * Convenience shortcut for `createTarget({targetManager: testUniverse.targetManager})`
     */
    createTarget(options?: Parameters<typeof createTarget>[0]): SDK.Target.Target;
    get aiHistoryStorage(): AiAssistance.AiHistoryStorage.AiHistoryStorage;
    get autofillManager(): AutofillManager.AutofillManager.AutofillManager;
    get automaticFileSystemManager(): Persistence.AutomaticFileSystemManager.AutomaticFileSystemManager;
    get automaticFileSystemWorkspaceBinding(): Persistence.AutomaticFileSystemWorkspaceBinding.AutomaticFileSystemWorkspaceBinding;
    get breakpointManager(): Breakpoints.BreakpointManager.BreakpointManager;
    get console(): Common.Console.Console;
    get context(): Root.DevToolsContext.DevToolsContext;
    get cpuThrottlingManager(): SDK.CPUThrottlingManager.CPUThrottlingManager;
    get cruxManager(): CrUXManager.CrUXManager;
    get cssWorkspaceBinding(): Bindings.CSSWorkspaceBinding.CSSWorkspaceBinding;
    get debuggerWorkspaceBinding(): Bindings.DebuggerWorkspaceBinding.DebuggerWorkspaceBinding;
    get deviceModeModel(): Emulation.DeviceModeModel.DeviceModeModel;
    get domDebuggerManager(): SDK.DOMDebuggerModel.DOMDebuggerManager;
    get domModelUndoStack(): SDK.DOMModel.DOMModelUndoStack;
    get emulatedDevicesList(): Emulation.EmulatedDevices.EmulatedDevicesList;
    get eventBreakpointsManager(): SDK.EventBreakpointsModel.EventBreakpointsManager;
    get fileManager(): Workspace.FileManager.FileManager;
    get fileSystemWorkspaceBinding(): Persistence.FileSystemWorkspaceBinding.FileSystemWorkspaceBinding;
    get frameManager(): SDK.FrameManager.FrameManager;
    get gdpClient(): Host.GdpClient.GdpClient;
    get hostConfigTracker(): Host.AidaClient.HostConfigTracker;
    get ignoreListManager(): Workspace.IgnoreListManager.IgnoreListManager;
    get isolateManager(): SDK.IsolateManager.IsolateManager;
    get issuesManager(): IssuesManager.IssuesManager.IssuesManager;
    get logManager(): Logs.LogManager.LogManager;
    get isolatedFileSystemManager(): Persistence.IsolatedFileSystemManager.IsolatedFileSystemManager;
    get javaScriptMetadata(): JavaScriptMetadata.JavaScriptMetadata.JavaScriptMetadataImpl;
    get liveMetrics(): LiveMetrics.LiveMetrics;
    get multitargetNetworkManager(): SDK.NetworkManager.MultitargetNetworkManager;
    get networkLog(): Logs.NetworkLog.NetworkLog;
    get networkPersistenceManager(): Persistence.NetworkPersistenceManager.NetworkPersistenceManager;
    get networkProjectManager(): Bindings.NetworkProject.NetworkProjectManager;
    get pageResourceLoader(): SDK.PageResourceLoader.PageResourceLoader;
    get persistence(): Persistence.Persistence.PersistenceImpl;
    get presentationConsoleMessageManager(): Bindings.PresentationConsoleMessageHelper.PresentationConsoleMessageManager;
    get projectSettingsModel(): ProjectSettings.ProjectSettingsModel.ProjectSettingsModel;
    get targetManager(): SDK.TargetManager.TargetManager;
    get userBadges(): Badges.UserBadges;
    get settings(): Common.Settings.Settings;
    get workspace(): Workspace.Workspace.WorkspaceImpl;
    get workspaceDiff(): WorkspaceDiff.WorkspaceDiff.WorkspaceDiffImpl;
}
