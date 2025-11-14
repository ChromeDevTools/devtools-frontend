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
import * as Root from "./../core/root/root.js";
import * as SDK from "./../core/sdk/sdk.js";
import * as Bindings from "./../models/bindings/bindings.js";
import * as Workspace from "./../models/workspace/workspace.js";
var Universe = class {
  context = new Root.DevToolsContext.DevToolsContext();
  constructor(options) {
    const settings = Common.Settings.Settings.instance({
      forceNew: true,
      ...options.settingsCreationOptions
    });
    const targetManager = new SDK.TargetManager.TargetManager();
    this.context.set(SDK.TargetManager.TargetManager, targetManager);
    const workspace = new Workspace.Workspace.WorkspaceImpl();
    this.context.set(Workspace.Workspace.WorkspaceImpl, workspace);
    const ignoreListManager = new Workspace.IgnoreListManager.IgnoreListManager(settings, targetManager);
    this.context.set(Workspace.IgnoreListManager.IgnoreListManager, ignoreListManager);
    const resourceMapping = new Bindings.ResourceMapping.ResourceMapping(targetManager, workspace);
    const cssWorkspaceBinding = new Bindings.CSSWorkspaceBinding.CSSWorkspaceBinding(resourceMapping, targetManager);
    this.context.set(Bindings.CSSWorkspaceBinding.CSSWorkspaceBinding, cssWorkspaceBinding);
    const debuggerWorkspaceBinding = new Bindings.DebuggerWorkspaceBinding.DebuggerWorkspaceBinding(resourceMapping, targetManager, ignoreListManager, workspace);
    this.context.set(Bindings.DebuggerWorkspaceBinding.DebuggerWorkspaceBinding, debuggerWorkspaceBinding);
  }
};
export {
  Universe_exports as Universe
};
//# sourceMappingURL=foundation.js.map
