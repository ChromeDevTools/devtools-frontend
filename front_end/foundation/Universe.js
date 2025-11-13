// Copyright 2025 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.
import * as Common from '../core/common/common.js';
import * as Root from '../core/root/root.js';
import * as SDK from '../core/sdk/sdk.js';
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
        const targetManager = new SDK.TargetManager.TargetManager();
        this.context.set(SDK.TargetManager.TargetManager, targetManager);
        this.context.set(Workspace.Workspace.WorkspaceImpl, new Workspace.Workspace.WorkspaceImpl());
        const ignoreListManager = new Workspace.IgnoreListManager.IgnoreListManager(settings, targetManager);
        this.context.set(Workspace.IgnoreListManager.IgnoreListManager, ignoreListManager);
    }
}
//# sourceMappingURL=Universe.js.map