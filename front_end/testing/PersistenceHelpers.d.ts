import type * as Platform from '../core/platform/platform.js';
import type * as SDK from '../core/sdk/sdk.js';
import type * as Persistence from '../models/persistence/persistence.js';
import * as Workspace from '../models/workspace/workspace.js';
/**
 * This helper sets up a file system and a file system uiSourceCode that can be used for
 * Persistence testing. As soon as a script is added that has the given `networkScriptUrl` and the `content`,
 * PersistenceImpl will try to bind the network uiSourceCode with this file system uiSourceCode.
 **/
export declare function createFileSystemFileForPersistenceTests(fileSystemScript: {
    fileSystemFileUrl: Platform.DevToolsPath.UrlString;
    fileSystemPath: Platform.DevToolsPath.UrlString;
    type?: Persistence.PlatformFileSystem.PlatformFileSystemType;
}, networkScriptUrl: Platform.DevToolsPath.UrlString, content: string, target: SDK.Target.Target): {
    uiSourceCode: Workspace.UISourceCode.UISourceCode;
    project: Persistence.FileSystemWorkspaceBinding.FileSystem;
};
