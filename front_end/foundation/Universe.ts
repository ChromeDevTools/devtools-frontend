// Copyright 2025 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as Common from '../core/common/common.js';
import * as Root from '../core/root/root.js';
import * as SDK from '../core/sdk/sdk.js';
import * as AutofillManager from '../models/autofill_manager/autofill_manager.js';
import * as Bindings from '../models/bindings/bindings.js';
import * as Logs from '../models/logs/logs.js';
import * as Workspace from '../models/workspace/workspace.js';

export interface CreationOptions {
  settingsCreationOptions: Common.Settings.SettingsCreationOptions;
  overrideAutoStartModels?: Set<SDK.SDKModel.SDKModelConstructor>;
}

export class Universe {
  // TODO(crbug.com/493763857): Once a singleton is no longer a singleton (i.e. it has no 'instance')
  //                            static method, we can move it out of the `DevToolsContext` and store it
  //                            directly on the `Universe`.
  readonly context: Root.DevToolsContext.DevToolsContext;
  readonly autofillManager: AutofillManager.AutofillManager.AutofillManager;

  constructor(options: CreationOptions) {
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

    const pageResourceLoader =
        new SDK.PageResourceLoader.PageResourceLoader(targetManager, settings, multitargetNetworkManager, null);
    context.set(SDK.PageResourceLoader.PageResourceLoader, pageResourceLoader);

    const cpuThrottlingManager = new SDK.CPUThrottlingManager.CPUThrottlingManager(settings, targetManager);
    context.set(SDK.CPUThrottlingManager.CPUThrottlingManager, cpuThrottlingManager);

    const workspace = new Workspace.Workspace.WorkspaceImpl();
    context.set(Workspace.Workspace.WorkspaceImpl, workspace);

    const ignoreListManager = new Workspace.IgnoreListManager.IgnoreListManager(settings, targetManager);
    context.set(Workspace.IgnoreListManager.IgnoreListManager, ignoreListManager);

    const resourceMapping = new Bindings.ResourceMapping.ResourceMapping(targetManager, workspace);
    const cssWorkspaceBinding = new Bindings.CSSWorkspaceBinding.CSSWorkspaceBinding(resourceMapping, targetManager);
    context.set(Bindings.CSSWorkspaceBinding.CSSWorkspaceBinding, cssWorkspaceBinding);

    const debuggerWorkspaceBinding = new Bindings.DebuggerWorkspaceBinding.DebuggerWorkspaceBinding(
        resourceMapping, targetManager, ignoreListManager, workspace);
    context.set(Bindings.DebuggerWorkspaceBinding.DebuggerWorkspaceBinding, debuggerWorkspaceBinding);

    const networkLog = new Logs.NetworkLog.NetworkLog(targetManager, settings);
    context.set(Logs.NetworkLog.NetworkLog, networkLog);

    const logManager = new Logs.LogManager.LogManager(targetManager, networkLog);
    context.set(Logs.LogManager.LogManager, logManager);

    this.autofillManager = new AutofillManager.AutofillManager.AutofillManager(targetManager, frameManager);
  }

  get cpuThrottlingManager(): SDK.CPUThrottlingManager.CPUThrottlingManager {
    return this.context.get(SDK.CPUThrottlingManager.CPUThrottlingManager);
  }

  get pageResourceLoader(): SDK.PageResourceLoader.PageResourceLoader {
    return this.context.get(SDK.PageResourceLoader.PageResourceLoader);
  }
}
