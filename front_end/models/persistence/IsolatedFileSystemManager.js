// Copyright 2012 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.
import * as Common from '../../core/common/common.js';
import * as Host from '../../core/host/host.js';
import * as i18n from '../../core/i18n/i18n.js';
import * as Platform from '../../core/platform/platform.js';
import { IsolatedFileSystem } from './IsolatedFileSystem.js';
import { PlatformFileSystemType } from './PlatformFileSystem.js';
const UIStrings = {
    /**
     * @description Text in Isolated File System Manager of the Workspace settings in Settings
     * @example {folder does not exist} PH1
     */
    unableToAddFilesystemS: 'Unable to add filesystem: {PH1}',
};
const str_ = i18n.i18n.registerUIStrings('models/persistence/IsolatedFileSystemManager.ts', UIStrings);
const i18nString = i18n.i18n.getLocalizedString.bind(undefined, str_);
let isolatedFileSystemManagerInstance;
export class IsolatedFileSystemManager extends Common.ObjectWrapper.ObjectWrapper {
    #fileSystems;
    callbacks;
    progresses;
    #workspaceFolderExcludePatternSetting;
    fileSystemRequestResolve;
    fileSystemsLoadedPromise;
    constructor() {
        super();
        this.#fileSystems = new Map();
        this.callbacks = new Map();
        this.progresses = new Map();
        Host.InspectorFrontendHost.InspectorFrontendHostInstance.events.addEventListener(Host.InspectorFrontendHostAPI.Events.FileSystemRemoved, this.onFileSystemRemoved, this);
        Host.InspectorFrontendHost.InspectorFrontendHostInstance.events.addEventListener(Host.InspectorFrontendHostAPI.Events.FileSystemAdded, event => {
            this.onFileSystemAdded(event);
        }, this);
        Host.InspectorFrontendHost.InspectorFrontendHostInstance.events.addEventListener(Host.InspectorFrontendHostAPI.Events.FileSystemFilesChangedAddedRemoved, this.onFileSystemFilesChanged, this);
        Host.InspectorFrontendHost.InspectorFrontendHostInstance.events.addEventListener(Host.InspectorFrontendHostAPI.Events.IndexingTotalWorkCalculated, this.onIndexingTotalWorkCalculated, this);
        Host.InspectorFrontendHost.InspectorFrontendHostInstance.events.addEventListener(Host.InspectorFrontendHostAPI.Events.IndexingWorked, this.onIndexingWorked, this);
        Host.InspectorFrontendHost.InspectorFrontendHostInstance.events.addEventListener(Host.InspectorFrontendHostAPI.Events.IndexingDone, this.onIndexingDone, this);
        Host.InspectorFrontendHost.InspectorFrontendHostInstance.events.addEventListener(Host.InspectorFrontendHostAPI.Events.SearchCompleted, this.onSearchCompleted, this);
        // Initialize exclude pattern settings
        const defaultCommonExcludedFolders = [
            '/node_modules/',
            '/\\.devtools',
            '/\\.git/',
            '/\\.sass-cache/',
            '/\\.hg/',
            '/\\.idea/',
            '/\\.svn/',
            '/\\.cache/',
            '/\\.project/',
            '/\\.next/',
        ];
        const defaultWinExcludedFolders = ['/Thumbs.db$', '/ehthumbs.db$', '/Desktop.ini$', '/\\$RECYCLE.BIN/'];
        const defaultMacExcludedFolders = [
            '/\\.DS_Store$',
            '/\\.Trashes$',
            '/\\.Spotlight-V100$',
            '/\\.AppleDouble$',
            '/\\.LSOverride$',
            '/Icon$',
            '/\\._.*$',
        ];
        const defaultLinuxExcludedFolders = ['/.*~$'];
        let defaultExcludedFolders = defaultCommonExcludedFolders;
        if (Host.Platform.isWin()) {
            defaultExcludedFolders = defaultExcludedFolders.concat(defaultWinExcludedFolders);
        }
        else if (Host.Platform.isMac()) {
            defaultExcludedFolders = defaultExcludedFolders.concat(defaultMacExcludedFolders);
        }
        else {
            defaultExcludedFolders = defaultExcludedFolders.concat(defaultLinuxExcludedFolders);
        }
        const defaultExcludedFoldersPattern = defaultExcludedFolders.join('|');
        this.#workspaceFolderExcludePatternSetting = Common.Settings.Settings.instance().createRegExpSetting('workspace-folder-exclude-pattern', defaultExcludedFoldersPattern, Host.Platform.isWin() ? 'i' : '');
        this.fileSystemRequestResolve = null;
        this.fileSystemsLoadedPromise = this.requestFileSystems();
    }
    static instance(opts = { forceNew: null }) {
        const { forceNew } = opts;
        if (!isolatedFileSystemManagerInstance || forceNew) {
            isolatedFileSystemManagerInstance = new IsolatedFileSystemManager();
        }
        return isolatedFileSystemManagerInstance;
    }
    static removeInstance() {
        isolatedFileSystemManagerInstance = null;
    }
    requestFileSystems() {
        const { resolve, promise } = Promise.withResolvers();
        Host.InspectorFrontendHost.InspectorFrontendHostInstance.events.addEventListener(Host.InspectorFrontendHostAPI.Events.FileSystemsLoaded, onFileSystemsLoaded, this);
        Host.InspectorFrontendHost.InspectorFrontendHostInstance.requestFileSystems();
        return promise;
        function onFileSystemsLoaded(event) {
            const fileSystems = event.data;
            const promises = [];
            for (let i = 0; i < fileSystems.length; ++i) {
                promises.push(this.#addFileSystem(fileSystems[i], false));
            }
            void Promise.all(promises).then(onFileSystemsAdded);
        }
        function onFileSystemsAdded(fileSystems) {
            resolve(fileSystems.filter(fs => !!fs));
        }
    }
    addFileSystem(type) {
        Host.userMetrics.actionTaken(type === 'overrides' ? Host.UserMetrics.Action.OverrideTabAddFolder :
            Host.UserMetrics.Action.WorkspaceTabAddFolder);
        return new Promise(resolve => {
            this.fileSystemRequestResolve = resolve;
            Host.InspectorFrontendHost.InspectorFrontendHostInstance.addFileSystem(type || '');
        });
    }
    removeFileSystem(fileSystem) {
        Host.userMetrics.actionTaken(fileSystem.type() === PlatformFileSystemType.OVERRIDES ? Host.UserMetrics.Action.OverrideTabRemoveFolder :
            Host.UserMetrics.Action.WorkspaceTabRemoveFolder);
        Host.InspectorFrontendHost.InspectorFrontendHostInstance.removeFileSystem(fileSystem.embedderPath());
    }
    waitForFileSystems() {
        return this.fileSystemsLoadedPromise;
    }
    #addFileSystem(fileSystem, dispatchEvent) {
        const embedderPath = fileSystem.fileSystemPath;
        const fileSystemURL = Common.ParsedURL.ParsedURL.rawPathToUrlString(fileSystem.fileSystemPath);
        const promise = IsolatedFileSystem.create(this, fileSystemURL, embedderPath, hostFileSystemTypeToPlatformFileSystemType(fileSystem.type), fileSystem.fileSystemName, fileSystem.rootURL, fileSystem.type === 'automatic');
        return promise.then(storeFileSystem.bind(this));
        function storeFileSystem(fileSystem) {
            if (!fileSystem) {
                return null;
            }
            this.#fileSystems.set(fileSystemURL, fileSystem);
            fileSystem.addEventListener("file-system-error" /* PlatformFileSystemEvents.FILE_SYSTEM_ERROR */, this.#onFileSystemError, this);
            if (dispatchEvent) {
                this.dispatchEventToListeners(Events.FileSystemAdded, fileSystem);
            }
            return fileSystem;
        }
    }
    addPlatformFileSystem(fileSystemURL, fileSystem) {
        this.#fileSystems.set(fileSystemURL, fileSystem);
        fileSystem.addEventListener("file-system-error" /* PlatformFileSystemEvents.FILE_SYSTEM_ERROR */, this.#onFileSystemError, this);
        this.dispatchEventToListeners(Events.FileSystemAdded, fileSystem);
    }
    onFileSystemAdded(event) {
        const { errorMessage, fileSystem } = event.data;
        if (errorMessage) {
            if (errorMessage !== '<selection cancelled>' && errorMessage !== '<permission denied>') {
                Common.Console.Console.instance().error(i18nString(UIStrings.unableToAddFilesystemS, { PH1: errorMessage }));
            }
            if (!this.fileSystemRequestResolve) {
                return;
            }
            this.fileSystemRequestResolve.call(null, null);
            this.fileSystemRequestResolve = null;
        }
        else if (fileSystem) {
            void this.#addFileSystem(fileSystem, true).then(fileSystem => {
                if (this.fileSystemRequestResolve) {
                    this.fileSystemRequestResolve.call(null, fileSystem);
                    this.fileSystemRequestResolve = null;
                }
            });
        }
    }
    #onFileSystemError(event) {
        this.dispatchEventToListeners(Events.FileSystemError, event.data);
    }
    onFileSystemRemoved(event) {
        const embedderPath = event.data;
        const fileSystemPath = Common.ParsedURL.ParsedURL.rawPathToUrlString(embedderPath);
        const isolatedFileSystem = this.#fileSystems.get(fileSystemPath);
        if (!isolatedFileSystem) {
            return;
        }
        this.#fileSystems.delete(fileSystemPath);
        isolatedFileSystem.removeEventListener("file-system-error" /* PlatformFileSystemEvents.FILE_SYSTEM_ERROR */, this.#onFileSystemError, this);
        isolatedFileSystem.fileSystemRemoved();
        this.dispatchEventToListeners(Events.FileSystemRemoved, isolatedFileSystem);
    }
    onFileSystemFilesChanged(event) {
        const urlPaths = {
            changed: groupFilePathsIntoFileSystemPaths.call(this, event.data.changed),
            added: groupFilePathsIntoFileSystemPaths.call(this, event.data.added),
            removed: groupFilePathsIntoFileSystemPaths.call(this, event.data.removed),
        };
        this.dispatchEventToListeners(Events.FileSystemFilesChanged, urlPaths);
        function groupFilePathsIntoFileSystemPaths(embedderPaths) {
            const paths = new Platform.MapUtilities.Multimap();
            for (const embedderPath of embedderPaths) {
                const filePath = Common.ParsedURL.ParsedURL.rawPathToUrlString(embedderPath);
                for (const fileSystemPath of this.#fileSystems.keys()) {
                    const fileSystem = this.#fileSystems.get(fileSystemPath);
                    if (fileSystem?.isFileExcluded(Common.ParsedURL.ParsedURL.rawPathToEncodedPathString(embedderPath))) {
                        continue;
                    }
                    const pathPrefix = fileSystemPath.endsWith('/') ? fileSystemPath : fileSystemPath + '/';
                    if (!filePath.startsWith(pathPrefix)) {
                        continue;
                    }
                    paths.set(fileSystemPath, filePath);
                }
            }
            return paths;
        }
    }
    fileSystems() {
        return [...this.#fileSystems.values()];
    }
    fileSystem(fileSystemPath) {
        return this.#fileSystems.get(fileSystemPath) || null;
    }
    workspaceFolderExcludePatternSetting() {
        return this.#workspaceFolderExcludePatternSetting;
    }
    registerCallback(callback) {
        const requestId = ++lastRequestId;
        this.callbacks.set(requestId, callback);
        return requestId;
    }
    registerProgress(progress) {
        const requestId = ++lastRequestId;
        this.progresses.set(requestId, progress);
        return requestId;
    }
    onIndexingTotalWorkCalculated(event) {
        const { requestId, totalWork } = event.data;
        const progress = this.progresses.get(requestId);
        if (!progress) {
            return;
        }
        progress.totalWork = totalWork;
    }
    onIndexingWorked(event) {
        const { requestId, worked } = event.data;
        const progress = this.progresses.get(requestId);
        if (!progress) {
            return;
        }
        progress.worked += worked;
        if (progress.canceled) {
            Host.InspectorFrontendHost.InspectorFrontendHostInstance.stopIndexing(requestId);
            this.onIndexingDone(event);
        }
    }
    onIndexingDone(event) {
        const { requestId } = event.data;
        const progress = this.progresses.get(requestId);
        if (!progress) {
            return;
        }
        progress.done = true;
        this.progresses.delete(requestId);
    }
    onSearchCompleted(event) {
        const { requestId, files } = event.data;
        const callback = this.callbacks.get(requestId);
        if (!callback) {
            return;
        }
        callback.call(null, files);
        this.callbacks.delete(requestId);
    }
}
export var Events;
(function (Events) {
    /* eslint-disable @typescript-eslint/naming-convention -- Used by web_tests. */
    Events["FileSystemAdded"] = "FileSystemAdded";
    Events["FileSystemRemoved"] = "FileSystemRemoved";
    Events["FileSystemFilesChanged"] = "FileSystemFilesChanged";
    Events["ExcludedFolderAdded"] = "ExcludedFolderAdded";
    Events["ExcludedFolderRemoved"] = "ExcludedFolderRemoved";
    Events["FileSystemError"] = "FileSystemError";
    /* eslint-enable @typescript-eslint/naming-convention */
})(Events || (Events = {}));
let lastRequestId = 0;
function hostFileSystemTypeToPlatformFileSystemType(type) {
    switch (type) {
        case 'snippets':
            return PlatformFileSystemType.SNIPPETS;
        case 'overrides':
            return PlatformFileSystemType.OVERRIDES;
        default:
            return PlatformFileSystemType.WORKSPACE_PROJECT;
    }
}
//# sourceMappingURL=IsolatedFileSystemManager.js.map