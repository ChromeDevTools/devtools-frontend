// Copyright 2026 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.
/* eslint @devtools/enforce-test-universe-return-types: "error" */
import * as Common from '../core/common/common.js';
import * as Root from '../core/root/root.js';
import * as SDK from '../core/sdk/sdk.js';
import * as Bindings from '../models/bindings/bindings.js';
import * as Workspace from '../models/workspace/workspace.js';
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
    constructor(options) {
        this.#creationOptions = options;
    }
    /**
     * Convenience shortcut for `createTarget({targetManager: testUniverse.targetManager})`
     */
    createTarget(options) {
        return createTarget({ ...options, targetManager: this.targetManager });
    }
    get console() {
        if (!this.#context.has(Common.Console.Console)) {
            this.#context.set(Common.Console.Console, new Common.Console.Console());
        }
        return this.#context.get(Common.Console.Console);
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
    get frameManager() {
        if (!this.#context.has(SDK.FrameManager.FrameManager)) {
            this.#context.set(SDK.FrameManager.FrameManager, new SDK.FrameManager.FrameManager(this.targetManager));
        }
        return this.#context.get(SDK.FrameManager.FrameManager);
    }
    get ignoreListManager() {
        if (!this.#context.has(Workspace.IgnoreListManager.IgnoreListManager)) {
            this.#context.set(Workspace.IgnoreListManager.IgnoreListManager, new Workspace.IgnoreListManager.IgnoreListManager(this.settings, this.targetManager));
        }
        return this.#context.get(Workspace.IgnoreListManager.IgnoreListManager);
    }
    get multitargetNetworkManager() {
        if (!this.#context.has(SDK.NetworkManager.MultitargetNetworkManager)) {
            const multitargetNetworkManager = new SDK.NetworkManager.MultitargetNetworkManager(this.targetManager);
            this.#context.set(SDK.NetworkManager.MultitargetNetworkManager, multitargetNetworkManager);
        }
        return this.#context.get(SDK.NetworkManager.MultitargetNetworkManager);
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
                    if (ctor === SDK.FrameManager.FrameManager.prototype.constructor) {
                        return universe.frameManager;
                    }
                    if (ctor === SDK.PageResourceLoader.PageResourceLoader.prototype.constructor) {
                        return universe.pageResourceLoader;
                    }
                    throw new Error(`Class ${ctor.name} not set-up as a dependency for SDKModels in TestUniverse.ts. Add it to LazyContext#get in TestUniverse.ts`);
                }
            })();
            const targetManager = new SDK.TargetManager.TargetManager(context, this.#creationOptions?.overrideAutoStartModels ?? new Set());
            this.#context.set(SDK.TargetManager.TargetManager, targetManager);
        }
        return this.#context.get(SDK.TargetManager.TargetManager);
    }
    get settings() {
        if (!this.#context.has(Common.Settings.Settings)) {
            const storage = new Common.Settings.SettingsStorage({}, undefined, 'test');
            const options = this.#creationOptions?.settingsCreationOptions ?? {
                syncedStorage: storage,
                globalStorage: storage,
                localStorage: storage,
                settingRegistrations: DEFAULT_SETTING_REGISTRATIONS_FOR_TEST,
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
    get #resourceMapping() {
        if (!this.#context.has(Bindings.ResourceMapping.ResourceMapping)) {
            this.#context.set(Bindings.ResourceMapping.ResourceMapping, new Bindings.ResourceMapping.ResourceMapping(this.targetManager, this.workspace));
        }
        return this.#context.get(Bindings.ResourceMapping.ResourceMapping);
    }
}
//# sourceMappingURL=TestUniverse.js.map