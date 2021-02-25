/*
 * Copyright (C) 2013 Google Inc. All rights reserved.
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
import * as Platform from '../platform/platform.js';
import * as TextUtils from '../text_utils/text_utils.js';
import * as Workspace from '../workspace/workspace.js';

import type {IsolatedFileSystem} from './IsolatedFileSystem.js';
import type {IsolatedFileSystemManager} from './IsolatedFileSystemManager.js';
import {Events} from './IsolatedFileSystemManager.js';
import type {PlatformFileSystem} from './PlatformFileSystem.js';

export class FileSystemWorkspaceBinding {
  _isolatedFileSystemManager: IsolatedFileSystemManager;
  _workspace: Workspace.Workspace.WorkspaceImpl;
  _eventListeners: Common.EventTarget.EventDescriptor[];
  _boundFileSystems: Map<string, FileSystem>;
  constructor(isolatedFileSystemManager: IsolatedFileSystemManager, workspace: Workspace.Workspace.WorkspaceImpl) {
    this._isolatedFileSystemManager = isolatedFileSystemManager;
    this._workspace = workspace;
    this._eventListeners = [
      this._isolatedFileSystemManager.addEventListener(Events.FileSystemAdded, this._onFileSystemAdded, this),
      this._isolatedFileSystemManager.addEventListener(Events.FileSystemRemoved, this._onFileSystemRemoved, this),
      this._isolatedFileSystemManager.addEventListener(
          Events.FileSystemFilesChanged, this._fileSystemFilesChanged, this),
    ];
    this._boundFileSystems = new Map();
    this._isolatedFileSystemManager.waitForFileSystems().then(this._onFileSystemsLoaded.bind(this));
  }

  static projectId(fileSystemPath: string): string {
    return fileSystemPath;
  }

  static relativePath(uiSourceCode: Workspace.UISourceCode.UISourceCode): string[] {
    const baseURL = (uiSourceCode.project() as FileSystem)._fileSystemBaseURL;
    return uiSourceCode.url().substring(baseURL.length).split('/');
  }

  static tooltipForUISourceCode(uiSourceCode: Workspace.UISourceCode.UISourceCode): string {
    const fileSystem = (uiSourceCode.project() as FileSystem)._fileSystem;
    return fileSystem.tooltipForURL(uiSourceCode.url());
  }

  static fileSystemType(project: Workspace.Workspace.Project): string {
    const fileSystem = (project as FileSystem)._fileSystem;
    return fileSystem.type();
  }

  static fileSystemSupportsAutomapping(project: Workspace.Workspace.Project): boolean {
    const fileSystem = (project as FileSystem)._fileSystem;
    return fileSystem.supportsAutomapping();
  }

  static completeURL(project: Workspace.Workspace.Project, relativePath: string): string {
    const fsProject = project as FileSystem;
    return fsProject._fileSystemBaseURL + relativePath;
  }

  static fileSystemPath(projectId: string): string {
    return projectId;
  }

  fileSystemManager(): IsolatedFileSystemManager {
    return this._isolatedFileSystemManager;
  }

  _onFileSystemsLoaded(fileSystems: IsolatedFileSystem[]): void {
    for (const fileSystem of fileSystems) {
      this._addFileSystem(fileSystem);
    }
  }

  _onFileSystemAdded(event: Common.EventTarget.EventTargetEvent): void {
    const fileSystem = event.data as PlatformFileSystem;
    this._addFileSystem(fileSystem);
  }

  _addFileSystem(fileSystem: PlatformFileSystem): void {
    const boundFileSystem = new FileSystem(this, fileSystem, this._workspace);
    this._boundFileSystems.set(fileSystem.path(), boundFileSystem);
  }

  _onFileSystemRemoved(event: Common.EventTarget.EventTargetEvent): void {
    const fileSystem = event.data as PlatformFileSystem;
    const boundFileSystem = this._boundFileSystems.get(fileSystem.path());
    if (boundFileSystem) {
      boundFileSystem.dispose();
    }
    this._boundFileSystems.delete(fileSystem.path());
  }

  _fileSystemFilesChanged(event: Common.EventTarget.EventTargetEvent): void {
    const paths = event.data as FilesChangedData;
    for (const fileSystemPath of paths.changed.keysArray()) {
      const fileSystem = this._boundFileSystems.get(fileSystemPath);
      if (!fileSystem) {
        continue;
      }
      paths.changed.get(fileSystemPath).forEach(path => fileSystem._fileChanged(path));
    }

    for (const fileSystemPath of paths.added.keysArray()) {
      const fileSystem = this._boundFileSystems.get(fileSystemPath);
      if (!fileSystem) {
        continue;
      }
      paths.added.get(fileSystemPath).forEach(path => fileSystem._fileChanged(path));
    }

    for (const fileSystemPath of paths.removed.keysArray()) {
      const fileSystem = this._boundFileSystems.get(fileSystemPath);
      if (!fileSystem) {
        continue;
      }
      paths.removed.get(fileSystemPath).forEach(path => fileSystem.removeUISourceCode(path));
    }
  }

  dispose(): void {
    Common.EventTarget.EventTarget.removeEventListeners(this._eventListeners);
    for (const fileSystem of this._boundFileSystems.values()) {
      fileSystem.dispose();
      this._boundFileSystems.delete(fileSystem._fileSystem.path());
    }
  }
}

export class FileSystem extends Workspace.Workspace.ProjectStore implements Workspace.Workspace.Project {
  _fileSystem: PlatformFileSystem;
  _fileSystemBaseURL: string;
  _fileSystemParentURL: string;
  _fileSystemWorkspaceBinding: FileSystemWorkspaceBinding;
  _fileSystemPath: string;
  _creatingFilesGuard: Set<string>;
  constructor(
      fileSystemWorkspaceBinding: FileSystemWorkspaceBinding, isolatedFileSystem: PlatformFileSystem,
      workspace: Workspace.Workspace.WorkspaceImpl) {
    const fileSystemPath = isolatedFileSystem.path();
    const id = FileSystemWorkspaceBinding.projectId(fileSystemPath);
    console.assert(!workspace.project(id));
    const displayName = fileSystemPath.substr(fileSystemPath.lastIndexOf('/') + 1);

    super(workspace, id, Workspace.Workspace.projectTypes.FileSystem, displayName);

    this._fileSystem = isolatedFileSystem;
    this._fileSystemBaseURL = this._fileSystem.path() + '/';
    this._fileSystemParentURL = this._fileSystemBaseURL.substr(0, fileSystemPath.lastIndexOf('/') + 1);
    this._fileSystemWorkspaceBinding = fileSystemWorkspaceBinding;
    this._fileSystemPath = fileSystemPath;
    this._creatingFilesGuard = new Set();

    workspace.addProject(this);
    this.populate();
  }

  fileSystemPath(): string {
    return this._fileSystemPath;
  }

  fileSystem(): PlatformFileSystem {
    return this._fileSystem;
  }

  mimeType(uiSourceCode: Workspace.UISourceCode.UISourceCode): string {
    return this._fileSystem.mimeFromPath(uiSourceCode.url());
  }

  initialGitFolders(): string[] {
    return this._fileSystem.initialGitFolders().map(folder => this._fileSystemPath + '/' + folder);
  }

  _filePathForUISourceCode(uiSourceCode: Workspace.UISourceCode.UISourceCode): string {
    return uiSourceCode.url().substring(this._fileSystemPath.length);
  }

  isServiceProject(): boolean {
    return false;
  }

  requestMetadata(uiSourceCode: Workspace.UISourceCode.UISourceCode):
      Promise<Workspace.UISourceCode.UISourceCodeMetadata|null> {
    const metadata = sourceCodeToMetadataMap.get(uiSourceCode);
    if (metadata) {
      return metadata;
    }
    const relativePath = this._filePathForUISourceCode(uiSourceCode);
    const promise = this._fileSystem.getMetadata(relativePath).then(onMetadata);
    sourceCodeToMetadataMap.set(uiSourceCode, promise);
    return promise;

    function onMetadata(metadata: {modificationTime: Date, size: number}|
                        null): Workspace.UISourceCode.UISourceCodeMetadata|null {
      if (!metadata) {
        return null;
      }
      return new Workspace.UISourceCode.UISourceCodeMetadata(metadata.modificationTime, metadata.size);
    }
  }

  requestFileBlob(uiSourceCode: Workspace.UISourceCode.UISourceCode): Promise<Blob|null> {
    return this._fileSystem.requestFileBlob(this._filePathForUISourceCode(uiSourceCode));
  }

  requestFileContent(uiSourceCode: Workspace.UISourceCode.UISourceCode):
      Promise<TextUtils.ContentProvider.DeferredContent> {
    const filePath = this._filePathForUISourceCode(uiSourceCode);
    return this._fileSystem.requestFileContent(filePath);
  }

  canSetFileContent(): boolean {
    return true;
  }

  async setFileContent(uiSourceCode: Workspace.UISourceCode.UISourceCode, newContent: string, isBase64: boolean):
      Promise<void> {
    const filePath = this._filePathForUISourceCode(uiSourceCode);
    await this._fileSystem.setFileContent(filePath, newContent, isBase64);
  }

  fullDisplayName(uiSourceCode: Workspace.UISourceCode.UISourceCode): string {
    const baseURL = (uiSourceCode.project() as FileSystem)._fileSystemParentURL;
    return uiSourceCode.url().substring(baseURL.length);
  }

  canRename(): boolean {
    return true;
  }

  rename(
      uiSourceCode: Workspace.UISourceCode.UISourceCode, newName: string,
      callback:
          (arg0: boolean, arg1?: string|undefined, arg2?: string|undefined,
           arg3?: Common.ResourceType.ResourceType|undefined) => void): void {
    if (newName === uiSourceCode.name()) {
      callback(true, uiSourceCode.name(), uiSourceCode.url(), uiSourceCode.contentType());
      return;
    }

    let filePath = this._filePathForUISourceCode(uiSourceCode);
    this._fileSystem.renameFile(filePath, newName, innerCallback.bind(this));

    function innerCallback(this: FileSystem, success: boolean, newName?: string): void {
      if (!success || !newName) {
        callback(false, newName);
        return;
      }
      console.assert(Boolean(newName));
      const slash = filePath.lastIndexOf('/');
      const parentPath = filePath.substring(0, slash);
      filePath = parentPath + '/' + newName;
      filePath = filePath.substr(1);
      const newURL = this._fileSystemBaseURL + filePath;
      const newContentType = this._fileSystem.contentType(newName);
      this.renameUISourceCode(uiSourceCode, newName);
      callback(true, newName, newURL, newContentType);
    }
  }

  async searchInFileContent(
      uiSourceCode: Workspace.UISourceCode.UISourceCode, query: string, caseSensitive: boolean,
      isRegex: boolean): Promise<TextUtils.ContentProvider.SearchMatch[]> {
    const filePath = this._filePathForUISourceCode(uiSourceCode);
    const {content} = await this._fileSystem.requestFileContent(filePath);
    if (content) {
      return TextUtils.TextUtils.performSearchInContent(content, query, caseSensitive, isRegex);
    }
    return [];
  }

  async findFilesMatchingSearchRequest(
      searchConfig: Workspace.Workspace.ProjectSearchConfig, filesMathingFileQuery: string[],
      progress: Common.Progress.Progress): Promise<string[]> {
    let result: string[] = filesMathingFileQuery;
    const queriesToRun = searchConfig.queries().slice();
    if (!queriesToRun.length) {
      queriesToRun.push('');
    }
    progress.setTotalWork(queriesToRun.length);

    for (const query of queriesToRun) {
      const files = await this._fileSystem.searchInPath(searchConfig.isRegex() ? '' : query, progress);
      result = Platform.ArrayUtilities.intersectOrdered(
          result, files.sort(), Platform.StringUtilities.naturalOrderComparator);
      progress.worked(1);
    }

    progress.done();
    return result;
  }

  indexContent(progress: Common.Progress.Progress): void {
    this._fileSystem.indexContent(progress);
  }

  populate(): void {
    const chunkSize = 1000;
    const filePaths = this._fileSystem.initialFilePaths();
    reportFileChunk.call(this, 0);

    function reportFileChunk(this: FileSystem, from: number): void {
      const to = Math.min(from + chunkSize, filePaths.length);
      for (let i = from; i < to; ++i) {
        this._addFile(filePaths[i]);
      }
      if (to < filePaths.length) {
        setTimeout(reportFileChunk.bind(this, to), 100);
      }
    }
  }

  excludeFolder(url: string): void {
    let relativeFolder = url.substring(this._fileSystemBaseURL.length);
    if (!relativeFolder.startsWith('/')) {
      relativeFolder = '/' + relativeFolder;
    }
    if (!relativeFolder.endsWith('/')) {
      relativeFolder += '/';
    }
    this._fileSystem.addExcludedFolder(relativeFolder);

    const uiSourceCodes = this.uiSourceCodes().slice();
    for (let i = 0; i < uiSourceCodes.length; ++i) {
      const uiSourceCode = uiSourceCodes[i];
      if (uiSourceCode.url().startsWith(url)) {
        this.removeUISourceCode(uiSourceCode.url());
      }
    }
  }

  canExcludeFolder(path: string): boolean {
    return this._fileSystem.canExcludeFolder(path);
  }

  canCreateFile(): boolean {
    return true;
  }

  async createFile(path: string, name: string|null, content: string, isBase64?: boolean):
      Promise<Workspace.UISourceCode.UISourceCode|null> {
    const guardFileName = this._fileSystemPath + path + (!path.endsWith('/') ? '/' : '') + name;
    this._creatingFilesGuard.add(guardFileName);
    const filePath = await this._fileSystem.createFile(path, name);
    if (!filePath) {
      return null;
    }
    const uiSourceCode = this._addFile(filePath);
    uiSourceCode.setContent(content, Boolean(isBase64));
    this._creatingFilesGuard.delete(guardFileName);
    return uiSourceCode;
  }

  deleteFile(uiSourceCode: Workspace.UISourceCode.UISourceCode): void {
    const relativePath = this._filePathForUISourceCode(uiSourceCode);
    this._fileSystem.deleteFile(relativePath).then(success => {
      if (success) {
        this.removeUISourceCode(uiSourceCode.url());
      }
    });
  }

  remove(): void {
    this._fileSystemWorkspaceBinding._isolatedFileSystemManager.removeFileSystem(this._fileSystem);
  }

  _addFile(filePath: string): Workspace.UISourceCode.UISourceCode {
    const contentType = this._fileSystem.contentType(filePath);
    const uiSourceCode = this.createUISourceCode(this._fileSystemBaseURL + filePath, contentType);
    this.addUISourceCode(uiSourceCode);
    return uiSourceCode;
  }

  _fileChanged(path: string): void {
    // Ignore files that are being created but do not have content yet.
    if (this._creatingFilesGuard.has(path)) {
      return;
    }
    const uiSourceCode = this.uiSourceCodeForURL(path);
    if (!uiSourceCode) {
      const contentType = this._fileSystem.contentType(path);
      this.addUISourceCode(this.createUISourceCode(path, contentType));
      return;
    }
    sourceCodeToMetadataMap.delete(uiSourceCode);
    uiSourceCode.checkContentUpdated();
  }

  tooltipForURL(url: string): string {
    return this._fileSystem.tooltipForURL(url);
  }

  dispose(): void {
    this.removeProject();
  }
}

const sourceCodeToMetadataMap =
    new WeakMap<Workspace.UISourceCode.UISourceCode, Promise<Workspace.UISourceCode.UISourceCodeMetadata|null>>();
export interface FilesChangedData {
  changed: Platform.MapUtilities.Multimap<string, string>;
  added: Platform.MapUtilities.Multimap<string, string>;
  removed: Platform.MapUtilities.Multimap<string, string>;
}
