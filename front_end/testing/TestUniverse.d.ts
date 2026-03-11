import * as Common from '../core/common/common.js';
import type * as Host from '../core/host/host.js';
import * as SDK from '../core/sdk/sdk.js';
import type * as Foundation from '../foundation/foundation.js';
import * as Bindings from '../models/bindings/bindings.js';
import * as Workspace from '../models/workspace/workspace.js';
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
export declare class TestUniverse {
    #private;
    constructor(options?: CreationOptions);
    /**
     * Convenience shortcut for `createTarget({targetManager: testUniverse.targetManager})`
     */
    createTarget(options: Parameters<typeof createTarget>[0]): SDK.Target.Target;
    get console(): Common.Console.Console;
    get cssWorkspaceBinding(): Bindings.CSSWorkspaceBinding.CSSWorkspaceBinding;
    get debuggerWorkspaceBinding(): Bindings.DebuggerWorkspaceBinding.DebuggerWorkspaceBinding;
    get frameManager(): SDK.FrameManager.FrameManager;
    get ignoreListManager(): Workspace.IgnoreListManager.IgnoreListManager;
    get multitargetNetworkManager(): SDK.NetworkManager.MultitargetNetworkManager;
    get pageResourceLoader(): SDK.PageResourceLoader.PageResourceLoader;
    get targetManager(): SDK.TargetManager.TargetManager;
    get settings(): Common.Settings.Settings;
    get workspace(): Workspace.Workspace.WorkspaceImpl;
}
