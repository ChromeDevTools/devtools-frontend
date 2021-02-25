/*
 * Copyright (C) 2012 Google Inc. All rights reserved.
 *
 * Redistribution and use in source and binary forms, with or without
 * modification, are permitted provided that the following conditions are
 * met:
 *
 *     * Redistributions of source code must retain the above copyright
 * notice, this list of conditions and the following disclaimer.
 *     * Redistributions in binary form must reproduce the above
 * copyright notice, this list of conditions and the following disclaimer
 * in the documentation and/or other materials provided with the
 * distribution.
 *     * Neither the name of Google Inc. nor the names of its
 * contributors may be used to endorse or promote products derived from
 * this software without specific prior written permission.
 *
 * THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS
 * "AS IS" AND ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT
 * LIMITED TO, THE IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS FOR
 * A PARTICULAR PURPOSE ARE DISCLAIMED. IN NO EVENT SHALL THE COPYRIGHT
 * OWNER OR CONTRIBUTORS BE LIABLE FOR ANY DIRECT, INDIRECT, INCIDENTAL,
 * SPECIAL, EXEMPLARY, OR CONSEQUENTIAL DAMAGES (INCLUDING, BUT NOT
 * LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR SERVICES; LOSS OF USE,
 * DATA, OR PROFITS; OR BUSINESS INTERRUPTION) HOWEVER CAUSED AND ON ANY
 * THEORY OF LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY, OR TORT
 * (INCLUDING NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE
 * OF THIS SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.
 */

/* eslint-disable rulesdir/no_underscored_properties */

import * as Common from '../common/common.js';
import * as Host from '../host/host.js';
import * as i18n from '../i18n/i18n.js';
import * as Platform from '../platform/platform.js';

import {IsolatedFileSystem} from './IsolatedFileSystem.js';
import type {PlatformFileSystem} from './PlatformFileSystem.js';

export const UIStrings = {
  /**
  *@description Text in Isolated File System Manager of the Workspace settings in Settings
  *@example {folder does not exist} PH1
  */
  unableToAddFilesystemS: 'Unable to add filesystem: {PH1}',
};
const str_ = i18n.i18n.registerUIStrings('persistence/IsolatedFileSystemManager.ts', UIStrings);
const i18nString = i18n.i18n.getLocalizedString.bind(undefined, str_);
let isolatedFileSystemManagerInstance: IsolatedFileSystemManager;

export class IsolatedFileSystemManager extends Common.ObjectWrapper.ObjectWrapper {
  _fileSystems: Map<string, PlatformFileSystem>;
  _callbacks: Map<number, (arg0: Array<string>) => void>;
  _progresses: Map<number, Common.Progress.Progress>;
  _workspaceFolderExcludePatternSetting: Common.Settings.RegExpSetting;
  _fileSystemRequestResolve: ((arg0: IsolatedFileSystem|null) => void)|null;
  _fileSystemsLoadedPromise: Promise<IsolatedFileSystem[]>;
  private constructor() {
    super();

    this._fileSystems = new Map();
    this._callbacks = new Map();
    this._progresses = new Map();

    Host.InspectorFrontendHost.InspectorFrontendHostInstance.events.addEventListener(
        Host.InspectorFrontendHostAPI.Events.FileSystemRemoved, this._onFileSystemRemoved, this);
    Host.InspectorFrontendHost.InspectorFrontendHostInstance.events.addEventListener(
        Host.InspectorFrontendHostAPI.Events.FileSystemAdded, event => {
          this._onFileSystemAdded(event);
        }, this);
    Host.InspectorFrontendHost.InspectorFrontendHostInstance.events.addEventListener(
        Host.InspectorFrontendHostAPI.Events.FileSystemFilesChangedAddedRemoved, this._onFileSystemFilesChanged, this);
    Host.InspectorFrontendHost.InspectorFrontendHostInstance.events.addEventListener(
        Host.InspectorFrontendHostAPI.Events.IndexingTotalWorkCalculated, this._onIndexingTotalWorkCalculated, this);
    Host.InspectorFrontendHost.InspectorFrontendHostInstance.events.addEventListener(
        Host.InspectorFrontendHostAPI.Events.IndexingWorked, this._onIndexingWorked, this);
    Host.InspectorFrontendHost.InspectorFrontendHostInstance.events.addEventListener(
        Host.InspectorFrontendHostAPI.Events.IndexingDone, this._onIndexingDone, this);
    Host.InspectorFrontendHost.InspectorFrontendHostInstance.events.addEventListener(
        Host.InspectorFrontendHostAPI.Events.SearchCompleted, this._onSearchCompleted, this);

    // Initialize exclude pattern settings
    const defaultCommonExcludedFolders = [
      '/node_modules/',
      '/bower_components/',
      '/\\.devtools',
      '/\\.git/',
      '/\\.sass-cache/',
      '/\\.hg/',
      '/\\.idea/',
      '/\\.svn/',
      '/\\.cache/',
      '/\\.project/',
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
    let defaultExcludedFolders: string[] = defaultCommonExcludedFolders;
    if (Host.Platform.isWin()) {
      defaultExcludedFolders = defaultExcludedFolders.concat(defaultWinExcludedFolders);
    } else if (Host.Platform.isMac()) {
      defaultExcludedFolders = defaultExcludedFolders.concat(defaultMacExcludedFolders);
    } else {
      defaultExcludedFolders = defaultExcludedFolders.concat(defaultLinuxExcludedFolders);
    }
    const defaultExcludedFoldersPattern = defaultExcludedFolders.join('|');
    this._workspaceFolderExcludePatternSetting = Common.Settings.Settings.instance().createRegExpSetting(
        'workspaceFolderExcludePattern', defaultExcludedFoldersPattern, Host.Platform.isWin() ? 'i' : '');

    this._fileSystemRequestResolve = null;
    this._fileSystemsLoadedPromise = this._requestFileSystems();
  }

  static instance(opts: {forceNew: boolean|null} = {forceNew: null}): IsolatedFileSystemManager {
    const {forceNew} = opts;
    if (!isolatedFileSystemManagerInstance || forceNew) {
      isolatedFileSystemManagerInstance = new IsolatedFileSystemManager();
    }

    return isolatedFileSystemManagerInstance;
  }

  _requestFileSystems(): Promise<IsolatedFileSystem[]> {
    let fulfill: (arg0: IsolatedFileSystem[]) => void;
    const promise = new Promise<IsolatedFileSystem[]>(f => {
      fulfill = f;
    });
    Host.InspectorFrontendHost.InspectorFrontendHostInstance.events.addEventListener(
        Host.InspectorFrontendHostAPI.Events.FileSystemsLoaded, onFileSystemsLoaded, this);
    Host.InspectorFrontendHost.InspectorFrontendHostInstance.requestFileSystems();
    return promise;

    function onFileSystemsLoaded(this: IsolatedFileSystemManager, event: Common.EventTarget.EventTargetEvent): void {
      const fileSystems = event.data as FileSystem[];
      const promises = [];
      for (let i = 0; i < fileSystems.length; ++i) {
        promises.push(this._innerAddFileSystem(fileSystems[i], false));
      }
      Promise.all(promises).then(onFileSystemsAdded);
    }

    function onFileSystemsAdded(fileSystems: (IsolatedFileSystem|null)[]): void {
      fulfill(fileSystems.filter(fs => Boolean(fs)) as IsolatedFileSystem[]);
    }
  }

  addFileSystem(type?: string): Promise<IsolatedFileSystem|null> {
    return new Promise(resolve => {
      this._fileSystemRequestResolve = resolve;
      Host.InspectorFrontendHost.InspectorFrontendHostInstance.addFileSystem(type || '');
    });
  }

  removeFileSystem(fileSystem: PlatformFileSystem): void {
    Host.InspectorFrontendHost.InspectorFrontendHostInstance.removeFileSystem(fileSystem.embedderPath());
  }

  waitForFileSystems(): Promise<IsolatedFileSystem[]> {
    return this._fileSystemsLoadedPromise;
  }

  _innerAddFileSystem(fileSystem: FileSystem, dispatchEvent: boolean): Promise<IsolatedFileSystem|null> {
    const embedderPath = fileSystem.fileSystemPath;
    const fileSystemURL = Common.ParsedURL.ParsedURL.platformPathToURL(fileSystem.fileSystemPath);
    const promise = IsolatedFileSystem.create(
        this, fileSystemURL, embedderPath, fileSystem.type, fileSystem.fileSystemName, fileSystem.rootURL);
    return promise.then(storeFileSystem.bind(this));

    function storeFileSystem(this: IsolatedFileSystemManager, fileSystem: IsolatedFileSystem|null): IsolatedFileSystem|
        null {
      if (!fileSystem) {
        return null;
      }
      this._fileSystems.set(fileSystemURL, fileSystem);
      if (dispatchEvent) {
        this.dispatchEventToListeners(Events.FileSystemAdded, fileSystem);
      }
      return fileSystem;
    }
  }

  addPlatformFileSystem(fileSystemURL: string, fileSystem: PlatformFileSystem): void {
    this._fileSystems.set(fileSystemURL, fileSystem);
    this.dispatchEventToListeners(Events.FileSystemAdded, fileSystem);
  }

  _onFileSystemAdded(event: Common.EventTarget.EventTargetEvent): void {
    const errorMessage = event.data['errorMessage'] as string;
    const fileSystem = event.data['fileSystem'] as FileSystem | null;
    if (errorMessage) {
      if (errorMessage !== '<selection cancelled>') {
        Common.Console.Console.instance().error(i18nString(UIStrings.unableToAddFilesystemS, {PH1: errorMessage}));
      }
      if (!this._fileSystemRequestResolve) {
        return;
      }
      this._fileSystemRequestResolve.call(null, null);
      this._fileSystemRequestResolve = null;
    } else if (fileSystem) {
      this._innerAddFileSystem(fileSystem, true).then(fileSystem => {
        if (this._fileSystemRequestResolve) {
          this._fileSystemRequestResolve.call(null, fileSystem);
          this._fileSystemRequestResolve = null;
        }
      });
    }
  }

  _onFileSystemRemoved(event: Common.EventTarget.EventTargetEvent): void {
    const embedderPath = event.data as string;
    const fileSystemPath = Common.ParsedURL.ParsedURL.platformPathToURL(embedderPath);
    const isolatedFileSystem = this._fileSystems.get(fileSystemPath);
    if (!isolatedFileSystem) {
      return;
    }
    this._fileSystems.delete(fileSystemPath);
    isolatedFileSystem.fileSystemRemoved();
    this.dispatchEventToListeners(Events.FileSystemRemoved, isolatedFileSystem);
  }

  _onFileSystemFilesChanged(event: Common.EventTarget.EventTargetEvent): void {
    const urlPaths = {
      changed: groupFilePathsIntoFileSystemPaths.call(this, event.data.changed),
      added: groupFilePathsIntoFileSystemPaths.call(this, event.data.added),
      removed: groupFilePathsIntoFileSystemPaths.call(this, event.data.removed),
    };

    this.dispatchEventToListeners(Events.FileSystemFilesChanged, urlPaths);

    function groupFilePathsIntoFileSystemPaths(
        this: IsolatedFileSystemManager, embedderPaths: string[]): Platform.MapUtilities.Multimap<string, string> {
      const paths = new Platform.MapUtilities.Multimap<string, string>();
      for (const embedderPath of embedderPaths) {
        const filePath = Common.ParsedURL.ParsedURL.platformPathToURL(embedderPath);
        for (const fileSystemPath of this._fileSystems.keys()) {
          const fileSystem = this._fileSystems.get(fileSystemPath);
          if (fileSystem && fileSystem.isFileExcluded(embedderPath)) {
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

  fileSystems(): PlatformFileSystem[] {
    return [...this._fileSystems.values()];
  }

  fileSystem(fileSystemPath: string): PlatformFileSystem|null {
    return this._fileSystems.get(fileSystemPath) || null;
  }

  workspaceFolderExcludePatternSetting(): Common.Settings.RegExpSetting {
    return this._workspaceFolderExcludePatternSetting;
  }

  registerCallback(callback: (arg0: Array<string>) => void): number {
    const requestId = ++lastRequestId;
    this._callbacks.set(requestId, callback);
    return requestId;
  }

  registerProgress(progress: Common.Progress.Progress): number {
    const requestId = ++lastRequestId;
    this._progresses.set(requestId, progress);
    return requestId;
  }

  _onIndexingTotalWorkCalculated(event: Common.EventTarget.EventTargetEvent): void {
    const requestId = event.data['requestId'] as number;
    const totalWork = event.data['totalWork'] as number;

    const progress = this._progresses.get(requestId);
    if (!progress) {
      return;
    }
    progress.setTotalWork(totalWork);
  }

  _onIndexingWorked(event: Common.EventTarget.EventTargetEvent): void {
    const requestId = event.data['requestId'] as number;
    const worked = event.data['worked'] as number;

    const progress = this._progresses.get(requestId);
    if (!progress) {
      return;
    }
    progress.worked(worked);
    if (progress.isCanceled()) {
      Host.InspectorFrontendHost.InspectorFrontendHostInstance.stopIndexing(requestId);
      this._onIndexingDone(event);
    }
  }

  _onIndexingDone(event: Common.EventTarget.EventTargetEvent): void {
    const requestId = event.data['requestId'] as number;

    const progress = this._progresses.get(requestId);
    if (!progress) {
      return;
    }
    progress.done();
    this._progresses.delete(requestId);
  }

  _onSearchCompleted(event: Common.EventTarget.EventTargetEvent): void {
    const requestId = event.data['requestId'] as number;
    const files = event.data['files'] as string[];

    const callback = this._callbacks.get(requestId);
    if (!callback) {
      return;
    }
    callback.call(null, files);
    this._callbacks.delete(requestId);
  }
}

// TODO(crbug.com/1167717): Make this a const enum again
// eslint-disable-next-line rulesdir/const_enum
export enum Events {
  FileSystemAdded = 'FileSystemAdded',
  FileSystemRemoved = 'FileSystemRemoved',
  FileSystemFilesChanged = 'FileSystemFilesChanged',
  ExcludedFolderAdded = 'ExcludedFolderAdded',
  ExcludedFolderRemoved = 'ExcludedFolderRemoved',
}

let lastRequestId = 0;

export interface FileSystem {
  type: string;
  fileSystemName: string;
  rootURL: string;
  fileSystemPath: string;
}
