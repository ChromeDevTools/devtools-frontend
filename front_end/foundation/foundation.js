var __defProp = Object.defineProperty;
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};

// gen/front_end/foundation/Universe.js
var Universe_exports = {};
__export(Universe_exports, {
  Universe: () => Universe
});
import * as Common from "./../core/common/common.js";
import * as Host from "./../core/host/host.js";
import * as Root from "./../core/root/root.js";
import * as SDK from "./../core/sdk/sdk.js";
import * as AutofillManager from "./../models/autofill_manager/autofill_manager.js";
import * as Bindings from "./../models/bindings/bindings.js";
import * as Breakpoints from "./../models/breakpoints/breakpoints.js";
import * as CrUXManager from "./../models/crux-manager/crux-manager.js";
import * as Emulation from "./../models/emulation/emulation.js";
import * as JavaScriptMetadata from "./../models/javascript_metadata/javascript_metadata.js";
import * as LiveMetrics from "./../models/live-metrics/live-metrics.js";
import * as Logs from "./../models/logs/logs.js";
import * as Persistence from "./../models/persistence/persistence.js";
import * as ProjectSettings from "./../models/project_settings/project_settings.js";
import * as Workspace from "./../models/workspace/workspace.js";
import * as WorkspaceDiff from "./../models/workspace_diff/workspace_diff.js";
var Universe = class {
  // TODO(crbug.com/493763857): Once a singleton is no longer a singleton (i.e. it has no 'instance')
  //                            static method, we can move it out of the `DevToolsContext` and store it
  //                            directly on the `Universe`.
  context;
  autofillManager;
  supportsEmulation;
  fileSystemWorkspaceBinding;
  constructor(options) {
    const context = new Root.DevToolsContext.WritableDevToolsContext();
    this.context = context;
    const console = new Common.Console.Console();
    context.set(Common.Console.Console, console);
    const hostConfigTracker = new Host.AidaClient.HostConfigTracker();
    context.set(Host.AidaClient.HostConfigTracker, hostConfigTracker);
    const gdpClient = new Host.GdpClient.GdpClient();
    context.set(Host.GdpClient.GdpClient, gdpClient);
    const settings = Common.Settings.Settings.instance({
      forceNew: true,
      console,
      ...options.settingsCreationOptions
    });
    context.set(Common.Settings.Settings, settings);
    const emulatedDevicesList = new Emulation.EmulatedDevices.EmulatedDevicesList(settings);
    context.set(Emulation.EmulatedDevices.EmulatedDevicesList, emulatedDevicesList);
    const isolatedFileSystemManager = new Persistence.IsolatedFileSystemManager.IsolatedFileSystemManager(settings, console);
    context.set(Persistence.IsolatedFileSystemManager.IsolatedFileSystemManager, isolatedFileSystemManager);
    const targetManager = new SDK.TargetManager.TargetManager(context, options.overrideAutoStartModels);
    context.set(SDK.TargetManager.TargetManager, targetManager);
    const frameManager = new SDK.FrameManager.FrameManager(targetManager);
    context.set(SDK.FrameManager.FrameManager, frameManager);
    const multitargetNetworkManager = new SDK.NetworkManager.MultitargetNetworkManager(targetManager);
    context.set(SDK.NetworkManager.MultitargetNetworkManager, multitargetNetworkManager);
    this.supportsEmulation = options.supportsEmulation;
    let deviceModeModel = null;
    if (options.supportsEmulation) {
      deviceModeModel = new Emulation.DeviceModeModel.DeviceModeModel(targetManager, settings, multitargetNetworkManager);
      context.set(Emulation.DeviceModeModel.DeviceModeModel, deviceModeModel);
    }
    const pageResourceLoader = new SDK.PageResourceLoader.PageResourceLoader(targetManager, settings, multitargetNetworkManager, null);
    context.set(SDK.PageResourceLoader.PageResourceLoader, pageResourceLoader);
    const projectSettingsModel = new ProjectSettings.ProjectSettingsModel.ProjectSettingsModel(options.hostConfig, pageResourceLoader, targetManager);
    context.set(ProjectSettings.ProjectSettingsModel.ProjectSettingsModel, projectSettingsModel);
    const automaticFileSystemManager = new Persistence.AutomaticFileSystemManager.AutomaticFileSystemManager(options.inspectorFrontendHost, projectSettingsModel);
    context.set(Persistence.AutomaticFileSystemManager.AutomaticFileSystemManager, automaticFileSystemManager);
    const cpuThrottlingManager = new SDK.CPUThrottlingManager.CPUThrottlingManager(settings, targetManager);
    context.set(SDK.CPUThrottlingManager.CPUThrottlingManager, cpuThrottlingManager);
    const domDebuggerManager = new SDK.DOMDebuggerModel.DOMDebuggerManager(targetManager);
    context.set(SDK.DOMDebuggerModel.DOMDebuggerManager, domDebuggerManager);
    const cruxManager = new CrUXManager.CrUXManager(targetManager, settings);
    context.set(CrUXManager.CrUXManager, cruxManager);
    const isolateManager = new SDK.IsolateManager.IsolateManager(targetManager);
    context.set(SDK.IsolateManager.IsolateManager, isolateManager);
    const eventBreakpointsManager = new SDK.EventBreakpointsModel.EventBreakpointsManager(targetManager);
    context.set(SDK.EventBreakpointsModel.EventBreakpointsManager, eventBreakpointsManager);
    const domModelUndoStack = new SDK.DOMModel.DOMModelUndoStack();
    context.set(SDK.DOMModel.DOMModelUndoStack, domModelUndoStack);
    const workspace = new Workspace.Workspace.WorkspaceImpl();
    context.set(Workspace.Workspace.WorkspaceImpl, workspace);
    const fileManager = new Workspace.FileManager.FileManager();
    context.set(Workspace.FileManager.FileManager, fileManager);
    const automaticFileSystemWorkspaceBinding = new Persistence.AutomaticFileSystemWorkspaceBinding.AutomaticFileSystemWorkspaceBinding(automaticFileSystemManager, isolatedFileSystemManager, workspace);
    context.set(Persistence.AutomaticFileSystemWorkspaceBinding.AutomaticFileSystemWorkspaceBinding, automaticFileSystemWorkspaceBinding);
    this.fileSystemWorkspaceBinding = new Persistence.FileSystemWorkspaceBinding.FileSystemWorkspaceBinding(isolatedFileSystemManager, workspace);
    const ignoreListManager = new Workspace.IgnoreListManager.IgnoreListManager(settings, targetManager);
    context.set(Workspace.IgnoreListManager.IgnoreListManager, ignoreListManager);
    const resourceMapping = new Bindings.ResourceMapping.ResourceMapping(targetManager, workspace);
    const cssWorkspaceBinding = new Bindings.CSSWorkspaceBinding.CSSWorkspaceBinding(resourceMapping, targetManager);
    context.set(Bindings.CSSWorkspaceBinding.CSSWorkspaceBinding, cssWorkspaceBinding);
    const debuggerWorkspaceBinding = new Bindings.DebuggerWorkspaceBinding.DebuggerWorkspaceBinding(resourceMapping, targetManager, ignoreListManager, workspace);
    context.set(Bindings.DebuggerWorkspaceBinding.DebuggerWorkspaceBinding, debuggerWorkspaceBinding);
    const networkProjectManager = new Bindings.NetworkProject.NetworkProjectManager();
    context.set(Bindings.NetworkProject.NetworkProjectManager, networkProjectManager);
    const breakpointManager = new Breakpoints.BreakpointManager.BreakpointManager(targetManager, workspace, debuggerWorkspaceBinding, settings);
    context.set(Breakpoints.BreakpointManager.BreakpointManager, breakpointManager);
    const persistence = new Persistence.Persistence.PersistenceImpl(workspace, breakpointManager);
    context.set(Persistence.Persistence.PersistenceImpl, persistence);
    const networkPersistenceManager = new Persistence.NetworkPersistenceManager.NetworkPersistenceManager(workspace, persistence, breakpointManager, targetManager, settings, isolatedFileSystemManager, multitargetNetworkManager);
    context.set(Persistence.NetworkPersistenceManager.NetworkPersistenceManager, networkPersistenceManager);
    const workspaceDiff = new WorkspaceDiff.WorkspaceDiff.WorkspaceDiffImpl(workspace, persistence, networkPersistenceManager);
    context.set(WorkspaceDiff.WorkspaceDiff.WorkspaceDiffImpl, workspaceDiff);
    const networkLog = new Logs.NetworkLog.NetworkLog(targetManager, settings);
    context.set(Logs.NetworkLog.NetworkLog, networkLog);
    const logManager = new Logs.LogManager.LogManager(targetManager, networkLog);
    context.set(Logs.LogManager.LogManager, logManager);
    const javaScriptMetadata = new JavaScriptMetadata.JavaScriptMetadata.JavaScriptMetadataImpl();
    context.set(JavaScriptMetadata.JavaScriptMetadata.JavaScriptMetadataImpl, javaScriptMetadata);
    const liveMetrics = new LiveMetrics.LiveMetrics(targetManager, deviceModeModel);
    context.set(LiveMetrics.LiveMetrics, liveMetrics);
    this.autofillManager = new AutofillManager.AutofillManager.AutofillManager(targetManager, frameManager);
  }
  get automaticFileSystemManager() {
    return this.context.get(Persistence.AutomaticFileSystemManager.AutomaticFileSystemManager);
  }
  get automaticFileSystemWorkspaceBinding() {
    return this.context.get(Persistence.AutomaticFileSystemWorkspaceBinding.AutomaticFileSystemWorkspaceBinding);
  }
  get breakpointManager() {
    return this.context.get(Breakpoints.BreakpointManager.BreakpointManager);
  }
  get cpuThrottlingManager() {
    return this.context.get(SDK.CPUThrottlingManager.CPUThrottlingManager);
  }
  get cruxManager() {
    return this.context.get(CrUXManager.CrUXManager);
  }
  // The DeviceModeModel may not be present, as emulation is only present for the `devtools_app` entrypoint, but not for the others.
  get deviceModeModel() {
    return this.supportsEmulation ? this.context.get(Emulation.DeviceModeModel.DeviceModeModel) : null;
  }
  get domDebuggerManager() {
    return this.context.get(SDK.DOMDebuggerModel.DOMDebuggerManager);
  }
  get domModelUndoStack() {
    return this.context.get(SDK.DOMModel.DOMModelUndoStack);
  }
  get emulatedDevicesList() {
    return this.context.get(Emulation.EmulatedDevices.EmulatedDevicesList);
  }
  get eventBreakpointsManager() {
    return this.context.get(SDK.EventBreakpointsModel.EventBreakpointsManager);
  }
  get fileManager() {
    return this.context.get(Workspace.FileManager.FileManager);
  }
  get gdpClient() {
    return this.context.get(Host.GdpClient.GdpClient);
  }
  get hostConfigTracker() {
    return this.context.get(Host.AidaClient.HostConfigTracker);
  }
  get isolatedFileSystemManager() {
    return this.context.get(Persistence.IsolatedFileSystemManager.IsolatedFileSystemManager);
  }
  get isolateManager() {
    return this.context.get(SDK.IsolateManager.IsolateManager);
  }
  get networkPersistenceManager() {
    return this.context.get(Persistence.NetworkPersistenceManager.NetworkPersistenceManager);
  }
  get networkProjectManager() {
    return this.context.get(Bindings.NetworkProject.NetworkProjectManager);
  }
  get liveMetrics() {
    return this.context.get(LiveMetrics.LiveMetrics);
  }
  get pageResourceLoader() {
    return this.context.get(SDK.PageResourceLoader.PageResourceLoader);
  }
  get persistence() {
    return this.context.get(Persistence.Persistence.PersistenceImpl);
  }
  get projectSettingsModel() {
    return this.context.get(ProjectSettings.ProjectSettingsModel.ProjectSettingsModel);
  }
  get settings() {
    return this.context.get(Common.Settings.Settings);
  }
  get targetManager() {
    return this.context.get(SDK.TargetManager.TargetManager);
  }
  get workspace() {
    return this.context.get(Workspace.Workspace.WorkspaceImpl);
  }
  get workspaceDiff() {
    return this.context.get(WorkspaceDiff.WorkspaceDiff.WorkspaceDiffImpl);
  }
};
export {
  Universe_exports as Universe
};
//# sourceMappingURL=foundation.js.map
