// Copyright 2022 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.
import * as Platform from '../core/platform/platform.js';
import * as SDK from '../core/sdk/sdk.js';
import * as Bindings from '../models/bindings/bindings.js';
import * as Breakpoints from '../models/breakpoints/breakpoints.js';
import * as Persistence from '../models/persistence/persistence.js';
import * as TextUtils from '../models/text_utils/text_utils.js';
import * as Workspace from '../models/workspace/workspace.js';
const { urlString } = Platform.DevToolsPath;
export function setUpEnvironment() {
    const workspace = Workspace.Workspace.WorkspaceImpl.instance();
    const targetManager = SDK.TargetManager.TargetManager.instance();
    const resourceMapping = new Bindings.ResourceMapping.ResourceMapping(targetManager, workspace);
    const debuggerWorkspaceBinding = Bindings.DebuggerWorkspaceBinding.DebuggerWorkspaceBinding.instance({
        forceNew: true,
        resourceMapping,
        targetManager,
        ignoreListManager: Workspace.IgnoreListManager.IgnoreListManager.instance({ forceNew: true })
    });
    const breakpointManager = Breakpoints.BreakpointManager.BreakpointManager.instance({ forceNew: true, targetManager, workspace, debuggerWorkspaceBinding });
    Persistence.Persistence.PersistenceImpl.instance({ forceNew: true, workspace, breakpointManager });
    const networkPersistenceManager = Persistence.NetworkPersistenceManager.NetworkPersistenceManager.instance({ forceNew: true, workspace });
    return { networkPersistenceManager, workspace, debuggerWorkspaceBinding };
}
export async function createWorkspaceProject(baseUrl, files) {
    const { networkPersistenceManager } = setUpEnvironment();
    const fileSystem = {
        fileSystemPath: () => baseUrl,
        fileSystemBaseURL: urlString `${baseUrl}/`,
        type: () => Workspace.Workspace.projectTypes.FileSystem,
        fileSystem: () => ({
            supportsAutomapping: () => false,
        }),
    };
    const uiSourceCodes = new Map();
    const mockProject = {
        uiSourceCodes: () => Array.from(uiSourceCodes.values()),
        id: () => baseUrl,
        fileSystemPath: () => baseUrl,
        uiSourceCodeForURL: (url) => {
            return uiSourceCodes.get(url) || null;
        },
        type: () => Workspace.Workspace.projectTypes.FileSystem,
        initialGitFolders: () => [],
        fileSystem: () => ({
            type: () => 'filesystem',
        }),
        fileSystemBaseURL: urlString `${baseUrl}/`,
        createFile: () => Promise.resolve(null),
    };
    await networkPersistenceManager.setProject(mockProject);
    for (const file of files) {
        const url = urlString `${file.path.concat(file.name)}`;
        const fileUrl = networkPersistenceManager.fileUrlFromNetworkUrl(url, true);
        uiSourceCodes.set(fileUrl, {
            requestContentData: () => Promise.resolve(new TextUtils.ContentData.ContentData(file.content, /* isBase64=*/ false, 'text/plain')),
            url: () => fileUrl,
            project: () => {
                return { ...fileSystem, requestFileBlob: () => new Blob([file.content]) };
            },
            name: () => file.name,
            setWorkingCopy: () => { },
            commitWorkingCopy: () => { },
        });
    }
    await networkPersistenceManager.setProject(mockProject);
    const workspace = Workspace.Workspace.WorkspaceImpl.instance();
    workspace.addProject(mockProject);
    return networkPersistenceManager;
}
//# sourceMappingURL=OverridesHelpers.js.map