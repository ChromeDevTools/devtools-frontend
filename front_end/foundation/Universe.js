// Copyright 2025 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.
import * as Common from '../core/common/common.js';
import * as Root from '../core/root/root.js';
import * as SDK from '../core/sdk/sdk.js';
import * as Bindings from '../models/bindings/bindings.js';
import * as Workspace from '../models/workspace/workspace.js';
export class Universe {
    context = new Root.DevToolsContext.DevToolsContext();
    constructor(options) {
        // TODO(crbug.com/458180550): Store instance on a "DevToolsContext" instead.
        //                            For now the global is fine as we don't anticipate the MCP server to change settings.
        const settings = Common.Settings.Settings.instance({
            forceNew: true,
            ...options.settingsCreationOptions,
        });
        const targetManager = new SDK.TargetManager.TargetManager(this.context, options.overrideAutoStartModels);
        this.context.set(SDK.TargetManager.TargetManager, targetManager);
        const multitargetNetworkManager = new SDK.NetworkManager.MultitargetNetworkManager(targetManager);
        this.context.set(SDK.NetworkManager.MultitargetNetworkManager, multitargetNetworkManager);
        const pageResourceLoader = new SDK.PageResourceLoader.PageResourceLoader(targetManager, settings, multitargetNetworkManager, null);
        this.context.set(SDK.PageResourceLoader.PageResourceLoader, pageResourceLoader);
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
}
//# sourceMappingURL=Universe.js.map