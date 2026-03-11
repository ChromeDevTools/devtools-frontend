// Copyright 2025 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.
import * as Common from '../core/common/common.js';
import * as Root from '../core/root/root.js';
import * as SDK from '../core/sdk/sdk.js';
import * as Bindings from '../models/bindings/bindings.js';
import * as Workspace from '../models/workspace/workspace.js';
export class Universe {
    context;
    constructor(options) {
        const context = new Root.DevToolsContext.WritableDevToolsContext();
        this.context = context;
        // TODO(crbug.com/458180550): Store instance only on this.context instead.
        //                            For now the global is required as not everything in foundation cleanly
        //                            reads from the scoped `Settings` instance.
        const settings = Common.Settings.Settings.instance({
            forceNew: true,
            ...options.settingsCreationOptions,
        });
        context.set(Common.Settings.Settings, settings);
        const console = new Common.Console.Console();
        context.set(Common.Console.Console, console);
        const targetManager = new SDK.TargetManager.TargetManager(context, options.overrideAutoStartModels);
        context.set(SDK.TargetManager.TargetManager, targetManager);
        const frameManager = new SDK.FrameManager.FrameManager(targetManager);
        context.set(SDK.FrameManager.FrameManager, frameManager);
        const multitargetNetworkManager = new SDK.NetworkManager.MultitargetNetworkManager(targetManager);
        context.set(SDK.NetworkManager.MultitargetNetworkManager, multitargetNetworkManager);
        const pageResourceLoader = new SDK.PageResourceLoader.PageResourceLoader(targetManager, settings, multitargetNetworkManager, null);
        context.set(SDK.PageResourceLoader.PageResourceLoader, pageResourceLoader);
        const workspace = new Workspace.Workspace.WorkspaceImpl();
        context.set(Workspace.Workspace.WorkspaceImpl, workspace);
        const ignoreListManager = new Workspace.IgnoreListManager.IgnoreListManager(settings, targetManager);
        context.set(Workspace.IgnoreListManager.IgnoreListManager, ignoreListManager);
        const resourceMapping = new Bindings.ResourceMapping.ResourceMapping(targetManager, workspace);
        const cssWorkspaceBinding = new Bindings.CSSWorkspaceBinding.CSSWorkspaceBinding(resourceMapping, targetManager);
        context.set(Bindings.CSSWorkspaceBinding.CSSWorkspaceBinding, cssWorkspaceBinding);
        const debuggerWorkspaceBinding = new Bindings.DebuggerWorkspaceBinding.DebuggerWorkspaceBinding(resourceMapping, targetManager, ignoreListManager, workspace);
        context.set(Bindings.DebuggerWorkspaceBinding.DebuggerWorkspaceBinding, debuggerWorkspaceBinding);
    }
}
//# sourceMappingURL=Universe.js.map