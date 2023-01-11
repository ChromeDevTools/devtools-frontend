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

import * as Common from '../../core/common/common.js';
import * as Platform from '../../core/platform/platform.js';
import * as TextUtils from '../text_utils/text_utils.js';
import * as Workspace from '../workspace/workspace.js';

import {type IsolatedFileSystem} from './IsolatedFileSystem.js';

import {Events, type IsolatedFileSystemManager} from './IsolatedFileSystemManager.js';
import {type PlatformFileSystem} from './PlatformFileSystem.js';

export class FileSystemWorkspaceBinding {
  readonly isolatedFileSystemManager: IsolatedFileSystemManager;
  private readonly workspace: Workspace.Workspace.WorkspaceImpl;
  private readonly eventListeners: Common.EventTarget.EventDescriptor[];
  private readonly boundFileSystems: Map<string, FileSystem>;
  constructor(isolatedFileSystemManager: IsolatedFileSystemManager, workspace: Workspace.Workspace.WorkspaceImpl) {
    this.isolatedFileSystemManager = isolatedFileSystemManager;
    this.workspace = workspace;
    this.eventListeners = [
      this.isolatedFileSystemManager.addEventListener(Events.FileSystemAdded, this.onFileSystemAdded, this),
      this.isolatedFileSystemManager.addEventListener(Events.FileSystemRemoved, this.onFileSystemRemoved, this),
      this.isolatedFileSystemManager.addEventListener(Events.FileSystemFilesChanged, this.fileSystemFilesChanged, this),
    ];
    this.boundFileSystems = new Map();
    void this.isolatedFileSystemManager.waitForFileSystems().then(this.onFileSystemsLoaded.bind(this));
  }

  static projectId(fileSystemPath: Platform.DevToolsPath.UrlString): Platform.DevToolsPath.UrlString {
    return fileSystemPath;
  }

  static relativePath(uiSourceCode: Workspace.UISourceCode.UISourceCode): Platform.DevToolsPath.EncodedPathString[] {
    const baseURL = (uiSourceCode.project() as FileSystem).fileSystemBaseURL;
    return Common.ParsedURL.ParsedURL.split(
        Common.ParsedURL.ParsedURL.sliceUrlToEncodedPathString(uiSourceCode.url(), baseURL.length), '/');
  }

  static tooltipForUISourceCode(uiSourceCode: Workspace.UISourceCode.UISourceCode): string {
    const fileSystem = (uiSourceCode.project() as FileSystem).fileSystemInternal;
    return fileSystem.tooltipForURL(uiSourceCode.url());
  }

  static fileSystemType(project: Workspace.Workspace.Project): string {
    const fileSystem = (project as FileSystem).fileSystemInternal;
    return fileSystem.type();
  }

  static fileSystemSupportsAutomapping(project: Workspace.Workspace.Project): boolean {
    const fileSystem = (project as FileSystem).fileSystemInternal;
    return fileSystem.supportsAutomapping();
  }

  static completeURL(project: Workspace.Workspace.Project, relativePath: string): Platform.DevToolsPath.UrlString {
    const fsProject = project as FileSystem;
    return Common.ParsedURL.ParsedURL.concatenate(fsProject.fileSystemBaseURL, relativePath);
  }

  static fileSystemPath(projectId: Platform.DevToolsPath.UrlString): Platform.DevToolsPath.UrlString {
    return projectId;
  }

  fileSystemManager(): IsolatedFileSystemManager {
    return this.isolatedFileSystemManager;
  }

  private onFileSystemsLoaded(fileSystems: IsolatedFileSystem[]): void {
    for (const fileSystem of fileSystems) {
      this.addFileSystem(fileSystem);
    }
  }

  private onFileSystemAdded(event: Common.EventTarget.EventTargetEvent<PlatformFileSystem>): void {
    const fileSystem = event.data;
    this.addFileSystem(fileSystem);
  }

  private addFileSystem(fileSystem: PlatformFileSystem): void {
    const boundFileSystem = new FileSystem(this, fileSystem, this.workspace);
    this.boundFileSystems.set(fileSystem.path(), boundFileSystem);
  }

  private onFileSystemRemoved(event: Common.EventTarget.EventTargetEvent<PlatformFileSystem>): void {
    const fileSystem = event.data;
    const boundFileSystem = this.boundFileSystems.get(fileSystem.path());
    if (boundFileSystem) {
      boundFileSystem.dispose();
    }
    this.boundFileSystems.delete(fileSystem.path());
  }

  private fileSystemFilesChanged(event: Common.EventTarget.EventTargetEvent<FilesChangedData>): void {
    const paths = event.data;
    for (const fileSystemPath of paths.changed.keysArray()) {
      const fileSystem = this.boundFileSystems.get(fileSystemPath);
      if (!fileSystem) {
        continue;
      }
      paths.changed.get(fileSystemPath).forEach(path => fileSystem.fileChanged(path));
    }

    for (const fileSystemPath of paths.added.keysArray()) {
      const fileSystem = this.boundFileSystems.get(fileSystemPath);
      if (!fileSystem) {
        continue;
      }
      paths.added.get(fileSystemPath).forEach(path => fileSystem.fileChanged(path));
    }

    for (const fileSystemPath of paths.removed.keysArray()) {
      const fileSystem = this.boundFileSystems.get(fileSystemPath);
      if (!fileSystem) {
        continue;
      }
      paths.removed.get(fileSystemPath).forEach(path => fileSystem.removeUISourceCode(path));
    }
  }

  dispose(): void {
    Common.EventTarget.removeEventListeners(this.eventListeners);
    for (const fileSystem of this.boundFileSystems.values()) {
      fileSystem.dispose();
      this.boundFileSystems.delete(fileSystem.fileSystemInternal.path());
    }
  }
}

export class FileSystem extends Workspace.Workspace.ProjectStore {
  readonly fileSystemInternal: PlatformFileSystem;
  readonly fileSystemBaseURL: Platform.DevToolsPath.UrlString;
  private readonly fileSystemParentURL: Platform.DevToolsPath.UrlString;
  private readonly fileSystemWorkspaceBinding: FileSystemWorkspaceBinding;
  private readonly fileSystemPathInternal: Platform.DevToolsPath.UrlString;
  private readonly creatingFilesGuard: Set<string>;
  constructor(
      fileSystemWorkspaceBinding: FileSystemWorkspaceBinding, isolatedFileSystem: PlatformFileSystem,
      workspace: Workspace.Workspace.WorkspaceImpl) {
    const fileSystemPath = isolatedFileSystem.path();
    const id = FileSystemWorkspaceBinding.projectId(fileSystemPath);
    console.assert(!workspace.project(id));
    const displayName = fileSystemPath.substr(fileSystemPath.lastIndexOf('/') + 1);

    super(workspace, id, Workspace.Workspace.projectTypes.FileSystem, displayName);

    this.fileSystemInternal = isolatedFileSystem;
    this.fileSystemBaseURL = Common.ParsedURL.ParsedURL.concatenate(this.fileSystemInternal.path(), '/');
    this.fileSystemParentURL =
        Common.ParsedURL.ParsedURL.substr(this.fileSystemBaseURL, 0, fileSystemPath.lastIndexOf('/') + 1);
    this.fileSystemWorkspaceBinding = fileSystemWorkspaceBinding;
    this.fileSystemPathInternal = fileSystemPath;
    this.creatingFilesGuard = new Set();

    workspace.addProject(this);
    this.populate();
  }

  fileSystemPath(): Platform.DevToolsPath.UrlString {
    return this.fileSystemPathInternal;
  }

  fileSystem(): PlatformFileSystem {
    return this.fileSystemInternal;
  }

  mimeType(uiSourceCode: Workspace.UISourceCode.UISourceCode): string {
    return this.fileSystemInternal.mimeFromPath(uiSourceCode.url());
  }

  initialGitFolders(): Platform.DevToolsPath.UrlString[] {
    return this.fileSystemInternal.initialGitFolders().map(
        folder => Common.ParsedURL.ParsedURL.concatenate(this.fileSystemPathInternal, '/', folder));
  }

  private filePathForUISourceCode(uiSourceCode: Workspace.UISourceCode.UISourceCode):
      Platform.DevToolsPath.EncodedPathString {
    return Common.ParsedURL.ParsedURL.sliceUrlToEncodedPathString(
        uiSourceCode.url(), this.fileSystemPathInternal.length);
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
    const relativePath = this.filePathForUISourceCode(uiSourceCode);
    const promise = this.fileSystemInternal.getMetadata(relativePath).then(onMetadata);
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
    return this.fileSystemInternal.requestFileBlob(this.filePathForUISourceCode(uiSourceCode));
  }

  requestFileContent(uiSourceCode: Workspace.UISourceCode.UISourceCode):
      Promise<TextUtils.ContentProvider.DeferredContent> {
    const filePath = this.filePathForUISourceCode(uiSourceCode);
    return this.fileSystemInternal.requestFileContent(filePath);
  }

  canSetFileContent(): boolean {
    return true;
  }

  async setFileContent(uiSourceCode: Workspace.UISourceCode.UISourceCode, newContent: string, isBase64: boolean):
      Promise<void> {
    const filePath = this.filePathForUISourceCode(uiSourceCode);
    await this.fileSystemInternal.setFileContent(filePath, newContent, isBase64);
  }

  fullDisplayName(uiSourceCode: Workspace.UISourceCode.UISourceCode): string {
    const baseURL = (uiSourceCode.project() as FileSystem).fileSystemParentURL;
    return uiSourceCode.url().substring(baseURL.length);
  }

  canRename(): boolean {
    return true;
  }

  rename(
      uiSourceCode: Workspace.UISourceCode.UISourceCode, newName: Platform.DevToolsPath.RawPathString,
      callback:
          (arg0: boolean, arg1?: string|undefined, arg2?: Platform.DevToolsPath.UrlString|undefined,
           arg3?: Common.ResourceType.ResourceType|undefined) => void): void {
    if (newName === uiSourceCode.name()) {
      callback(true, uiSourceCode.name(), uiSourceCode.url(), uiSourceCode.contentType());
      return;
    }

    let filePath = this.filePathForUISourceCode(uiSourceCode);
    this.fileSystemInternal.renameFile(filePath, newName, innerCallback.bind(this));

    function innerCallback(this: FileSystem, success: boolean, newName?: string): void {
      if (!success || !newName) {
        callback(false, newName);
        return;
      }
      console.assert(Boolean(newName));
      const slash = filePath.lastIndexOf('/');
      const parentPath = Common.ParsedURL.ParsedURL.substr(filePath, 0, slash);
      filePath = Common.ParsedURL.ParsedURL.encodedFromParentPathAndName(parentPath, newName);
      filePath = Common.ParsedURL.ParsedURL.substr(filePath, 1);
      const newURL = Common.ParsedURL.ParsedURL.concatenate(this.fileSystemBaseURL, filePath);
      const newContentType = this.fileSystemInternal.contentType(newName);
      this.renameUISourceCode(uiSourceCode, newName);
      callback(true, newName, newURL, newContentType);
    }
  }

  async searchInFileContent(
      uiSourceCode: Workspace.UISourceCode.UISourceCode, query: string, caseSensitive: boolean,
      isRegex: boolean): Promise<TextUtils.ContentProvider.SearchMatch[]> {
    const filePath = this.filePathForUISourceCode(uiSourceCode);
    const {content} = await this.fileSystemInternal.requestFileContent(filePath);
    if (content) {
      return TextUtils.TextUtils.performSearchInContent(content, query, caseSensitive, isRegex);
    }
    return [];
  }

  async findFilesMatchingSearchRequest(
      searchConfig: Workspace.Workspace.ProjectSearchConfig, filesMatchingFileQuery: Platform.DevToolsPath.UrlString[],
      progress: Common.Progress.Progress): Promise<string[]> {
    let result: string[] = filesMatchingFileQuery;
    const queriesToRun = searchConfig.queries().slice();
    if (!queriesToRun.length) {
      queriesToRun.push('');
    }
    progress.setTotalWork(queriesToRun.length);

    for (const query of queriesToRun) {
      const files = await this.fileSystemInternal.searchInPath(searchConfig.isRegex() ? '' : query, progress);
      files.sort(Platform.StringUtilities.naturalOrderComparator);
      result = Platform.ArrayUtilities.intersectOrdered(result, files, Platform.StringUtilities.naturalOrderComparator);
      progress.incrementWorked(1);
    }

    progress.done();
    return result;
  }

  indexContent(progress: Common.Progress.Progress): void {
    this.fileSystemInternal.indexContent(progress);
  }

  populate(): void {
    const chunkSize = 1000;
    const filePaths = this.fileSystemInternal.initialFilePaths();
    reportFileChunk.call(this, 0);

    function reportFileChunk(this: FileSystem, from: number): void {
      const to = Math.min(from + chunkSize, filePaths.length);
      for (let i = from; i < to; ++i) {
        this.addFile(filePaths[i]);
      }
      if (to < filePaths.length) {
        window.setTimeout(reportFileChunk.bind(this, to), 100);
      }
    }
  }

  excludeFolder(url: Platform.DevToolsPath.UrlString): void {
    let relativeFolder = Common.ParsedURL.ParsedURL.sliceUrlToEncodedPathString(url, this.fileSystemBaseURL.length);
    if (!relativeFolder.startsWith('/')) {
      relativeFolder = Common.ParsedURL.ParsedURL.prepend('/', relativeFolder);
    }
    if (!relativeFolder.endsWith('/')) {
      relativeFolder = Common.ParsedURL.ParsedURL.concatenate(relativeFolder, '/');
    }
    this.fileSystemInternal.addExcludedFolder(relativeFolder);

    for (const uiSourceCode of this.uiSourceCodes()) {
      if (uiSourceCode.url().startsWith(url)) {
        this.removeUISourceCode(uiSourceCode.url());
      }
    }
  }

  canExcludeFolder(path: Platform.DevToolsPath.EncodedPathString): boolean {
    return this.fileSystemInternal.canExcludeFolder(path);
  }

  canCreateFile(): boolean {
    return true;
  }

  async createFile(
      path: Platform.DevToolsPath.EncodedPathString, name: Platform.DevToolsPath.RawPathString|null, content: string,
      isBase64?: boolean): Promise<Workspace.UISourceCode.UISourceCode|null> {
    const guardFileName = this.fileSystemPathInternal + path + (!path.endsWith('/') ? '/' : '') + name;
    this.creatingFilesGuard.add(guardFileName);
    const filePath = await this.fileSystemInternal.createFile(path, name);
    if (!filePath) {
      return null;
    }
    const uiSourceCode = this.addFile(filePath);
    uiSourceCode.setContent(content, Boolean(isBase64));
    this.creatingFilesGuard.delete(guardFileName);
    return uiSourceCode;
  }

  deleteFile(uiSourceCode: Workspace.UISourceCode.UISourceCode): void {
    const relativePath = this.filePathForUISourceCode(uiSourceCode);
    void this.fileSystemInternal.deleteFile(relativePath).then(success => {
      if (success) {
        this.removeUISourceCode(uiSourceCode.url());
      }
    });
  }

  remove(): void {
    this.fileSystemWorkspaceBinding.isolatedFileSystemManager.removeFileSystem(this.fileSystemInternal);
  }

  private addFile(filePath: Platform.DevToolsPath.EncodedPathString): Workspace.UISourceCode.UISourceCode {
    const contentType = this.fileSystemInternal.contentType(filePath);
    const uiSourceCode =
        this.createUISourceCode(Common.ParsedURL.ParsedURL.concatenate(this.fileSystemBaseURL, filePath), contentType);
    this.addUISourceCode(uiSourceCode);
    return uiSourceCode;
  }

  fileChanged(path: Platform.DevToolsPath.UrlString): void {
    // Ignore files that are being created but do not have content yet.
    if (this.creatingFilesGuard.has(path)) {
      return;
    }
    const uiSourceCode = this.uiSourceCodeForURL(path);
    if (!uiSourceCode) {
      const contentType = this.fileSystemInternal.contentType(path);
      this.addUISourceCode(this.createUISourceCode(path, contentType));
      return;
    }
    sourceCodeToMetadataMap.delete(uiSourceCode);
    void uiSourceCode.checkContentUpdated();
  }

  tooltipForURL(url: Platform.DevToolsPath.UrlString): string {
    return this.fileSystemInternal.tooltipForURL(url);
  }

  dispose(): void {
    this.removeProject();
  }
}

const sourceCodeToMetadataMap =
    new WeakMap<Workspace.UISourceCode.UISourceCode, Promise<Workspace.UISourceCode.UISourceCodeMetadata|null>>();
export interface FilesChangedData {
  changed: Platform.MapUtilities.Multimap<Platform.DevToolsPath.UrlString, Platform.DevToolsPath.UrlString>;
  added: Platform.MapUtilities.Multimap<Platform.DevToolsPath.UrlString, Platform.DevToolsPath.UrlString>;
  removed: Platform.MapUtilities.Multimap<Platform.DevToolsPath.UrlString, Platform.DevToolsPath.UrlString>;
}
