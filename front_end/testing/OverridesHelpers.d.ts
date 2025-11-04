import * as Platform from '../core/platform/platform.js';
import * as Bindings from '../models/bindings/bindings.js';
import * as Persistence from '../models/persistence/persistence.js';
import * as Workspace from '../models/workspace/workspace.js';
export declare function setUpEnvironment(): {
    networkPersistenceManager: Persistence.NetworkPersistenceManager.NetworkPersistenceManager;
    workspace: Workspace.Workspace.WorkspaceImpl;
    debuggerWorkspaceBinding: Bindings.DebuggerWorkspaceBinding.DebuggerWorkspaceBinding;
};
export declare function createWorkspaceProject(baseUrl: Platform.DevToolsPath.UrlString, files: Array<{
    path: string;
    content: string;
    name: string;
}>): Promise<Persistence.NetworkPersistenceManager.NetworkPersistenceManager>;
