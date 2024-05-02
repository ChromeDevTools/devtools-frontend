// Copyright 2016 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as Common from '../../core/common/common.js';
import * as Host from '../../core/host/host.js';
import type * as Platform from '../../core/platform/platform.js';
import * as SDK from '../../core/sdk/sdk.js';
import * as Bindings from '../bindings/bindings.js';
import * as Workspace from '../workspace/workspace.js';

import {FileSystemWorkspaceBinding, type FileSystem} from './FileSystemWorkspaceBinding.js';
import {PersistenceImpl} from './PersistenceImpl.js';

export class Automapping {
  private readonly workspace: Workspace.Workspace.WorkspaceImpl;
  private readonly onStatusAdded: (arg0: AutomappingStatus) => Promise<void>;
  private readonly onStatusRemoved: (arg0: AutomappingStatus) => Promise<void>;
  private readonly statuses: Set<AutomappingStatus>;
  private readonly fileSystemUISourceCodes: FileSystemUISourceCodes;
  private readonly sweepThrottler: Common.Throttler.Throttler;
  private readonly sourceCodeToProcessingPromiseMap: WeakMap<Workspace.UISourceCode.UISourceCode, Promise<void>>;
  private readonly sourceCodeToAutoMappingStatusMap: WeakMap<Workspace.UISourceCode.UISourceCode, AutomappingStatus>;
  private readonly sourceCodeToMetadataMap:
      WeakMap<Workspace.UISourceCode.UISourceCode, Workspace.UISourceCode.UISourceCodeMetadata|null>;
  private readonly filesIndex: FilePathIndex;
  private readonly projectFoldersIndex: FolderIndex;
  private readonly activeFoldersIndex: FolderIndex;
  private readonly interceptors: ((arg0: Workspace.UISourceCode.UISourceCode) => boolean)[];
  constructor(
      workspace: Workspace.Workspace.WorkspaceImpl, onStatusAdded: (arg0: AutomappingStatus) => Promise<void>,
      onStatusRemoved: (arg0: AutomappingStatus) => Promise<void>) {
    this.workspace = workspace;

    this.onStatusAdded = onStatusAdded;
    this.onStatusRemoved = onStatusRemoved;
    this.statuses = new Set();

    this.fileSystemUISourceCodes = new FileSystemUISourceCodes();
    this.sweepThrottler = new Common.Throttler.Throttler(100);

    this.sourceCodeToProcessingPromiseMap = new WeakMap();
    this.sourceCodeToAutoMappingStatusMap = new WeakMap();
    this.sourceCodeToMetadataMap = new WeakMap();

    this.filesIndex = new FilePathIndex();
    this.projectFoldersIndex = new FolderIndex();
    this.activeFoldersIndex = new FolderIndex();

    this.interceptors = [];

    this.workspace.addEventListener(
        Workspace.Workspace.Events.UISourceCodeAdded, event => this.onUISourceCodeAdded(event.data));
    this.workspace.addEventListener(
        Workspace.Workspace.Events.UISourceCodeRemoved, event => this.onUISourceCodeRemoved(event.data));
    this.workspace.addEventListener(Workspace.Workspace.Events.UISourceCodeRenamed, this.onUISourceCodeRenamed, this);
    this.workspace.addEventListener(
        Workspace.Workspace.Events.ProjectAdded, event => this.onProjectAdded(event.data), this);
    this.workspace.addEventListener(
        Workspace.Workspace.Events.ProjectRemoved, event => this.onProjectRemoved(event.data), this);

    for (const fileSystem of workspace.projects()) {
      this.onProjectAdded(fileSystem);
    }
    for (const uiSourceCode of workspace.uiSourceCodes()) {
      this.onUISourceCodeAdded(uiSourceCode);
    }
  }

  addNetworkInterceptor(interceptor: (arg0: Workspace.UISourceCode.UISourceCode) => boolean): void {
    this.interceptors.push(interceptor);
    this.scheduleRemap();
  }

  scheduleRemap(): void {
    for (const status of this.statuses.values()) {
      this.clearNetworkStatus(status.network);
    }
    this.scheduleSweep();
  }

  private scheduleSweep(): void {
    void this.sweepThrottler.schedule(sweepUnmapped.bind(this));

    function sweepUnmapped(this: Automapping): Promise<void> {
      const networkProjects = this.workspace.projectsForType(Workspace.Workspace.projectTypes.Network);
      for (const networkProject of networkProjects) {
        for (const uiSourceCode of networkProject.uiSourceCodes()) {
          void this.computeNetworkStatus(uiSourceCode);
        }
      }
      this.onSweepHappenedForTest();
      return Promise.resolve();
    }
  }

  private onSweepHappenedForTest(): void {
  }

  private onProjectRemoved(project: Workspace.Workspace.Project): void {
    for (const uiSourceCode of project.uiSourceCodes()) {
      this.onUISourceCodeRemoved(uiSourceCode);
    }
    if (project.type() !== Workspace.Workspace.projectTypes.FileSystem) {
      return;
    }
    const fileSystem = project as FileSystem;
    for (const gitFolder of fileSystem.initialGitFolders()) {
      this.projectFoldersIndex.removeFolder(gitFolder);
    }
    this.projectFoldersIndex.removeFolder(fileSystem.fileSystemPath());
    this.scheduleRemap();
  }

  private onProjectAdded(project: Workspace.Workspace.Project): void {
    if (project.type() !== Workspace.Workspace.projectTypes.FileSystem) {
      return;
    }
    const fileSystem = project as FileSystem;
    for (const gitFolder of fileSystem.initialGitFolders()) {
      this.projectFoldersIndex.addFolder(gitFolder);
    }
    this.projectFoldersIndex.addFolder(fileSystem.fileSystemPath());
    for (const uiSourceCode of project.uiSourceCodes()) {
      this.onUISourceCodeAdded(uiSourceCode);
    }
    this.scheduleRemap();
  }

  private onUISourceCodeAdded(uiSourceCode: Workspace.UISourceCode.UISourceCode): void {
    const project = uiSourceCode.project();
    if (project.type() === Workspace.Workspace.projectTypes.FileSystem) {
      if (!FileSystemWorkspaceBinding.fileSystemSupportsAutomapping(project)) {
        return;
      }
      this.filesIndex.addPath(uiSourceCode.url());
      this.fileSystemUISourceCodes.add(uiSourceCode);
      this.scheduleSweep();
    } else if (project.type() === Workspace.Workspace.projectTypes.Network) {
      void this.computeNetworkStatus(uiSourceCode);
    }
  }

  private onUISourceCodeRemoved(uiSourceCode: Workspace.UISourceCode.UISourceCode): void {
    if (uiSourceCode.project().type() === Workspace.Workspace.projectTypes.FileSystem) {
      this.filesIndex.removePath(uiSourceCode.url());
      this.fileSystemUISourceCodes.delete(uiSourceCode.url());
      const status = this.sourceCodeToAutoMappingStatusMap.get(uiSourceCode);
      if (status) {
        this.clearNetworkStatus(status.network);
      }
    } else if (uiSourceCode.project().type() === Workspace.Workspace.projectTypes.Network) {
      this.clearNetworkStatus(uiSourceCode);
    }
  }

  private onUISourceCodeRenamed(
      event: Common.EventTarget.EventTargetEvent<Workspace.Workspace.UISourceCodeRenamedEvent>): void {
    const {uiSourceCode, oldURL} = event.data;
    if (uiSourceCode.project().type() !== Workspace.Workspace.projectTypes.FileSystem) {
      return;
    }

    this.filesIndex.removePath(oldURL);
    this.fileSystemUISourceCodes.delete(oldURL);
    const status = this.sourceCodeToAutoMappingStatusMap.get(uiSourceCode);
    if (status) {
      this.clearNetworkStatus(status.network);
    }

    this.filesIndex.addPath(uiSourceCode.url());
    this.fileSystemUISourceCodes.add(uiSourceCode);
    this.scheduleSweep();
  }

  computeNetworkStatus(networkSourceCode: Workspace.UISourceCode.UISourceCode): Promise<void> {
    const processingPromise = this.sourceCodeToProcessingPromiseMap.get(networkSourceCode);
    if (processingPromise) {
      return processingPromise;
    }
    if (this.sourceCodeToAutoMappingStatusMap.has(networkSourceCode)) {
      return Promise.resolve();
    }
    if (this.interceptors.some(interceptor => interceptor(networkSourceCode))) {
      return Promise.resolve();
    }
    if (Common.ParsedURL.schemeIs(networkSourceCode.url(), 'wasm:')) {
      return Promise.resolve();
    }
    const createBindingPromise =
        this.createBinding(networkSourceCode).then(validateStatus.bind(this)).then(onStatus.bind(this));
    this.sourceCodeToProcessingPromiseMap.set(networkSourceCode, createBindingPromise);
    return createBindingPromise;

    async function validateStatus(this: Automapping, status: AutomappingStatus|null): Promise<AutomappingStatus|null> {
      if (!status) {
        return null;
      }
      if (this.sourceCodeToProcessingPromiseMap.get(networkSourceCode) !== createBindingPromise) {
        return null;
      }
      if (status.network.contentType().isFromSourceMap() || !status.fileSystem.contentType().isTextType()) {
        return status;
      }

      // At the time binding comes, there are multiple user scenarios:
      // 1. Both network and fileSystem files are **not** dirty.
      //    This is a typical scenario when user hasn't done any edits yet to the
      //    files in question.
      // 2. FileSystem file has unsaved changes, network is clear.
      //    This typically happens with CSS files editing. Consider the following
      //    scenario:
      //      - user edits file that has been successfully mapped before
      //      - user doesn't save the file
      //      - user hits reload
      // 3. Network file has either unsaved changes or commits, but fileSystem file is clear.
      //    This typically happens when we've been editing file and then realized we'd like to drop
      //    a folder and persist all the changes.
      // 4. Network file has either unsaved changes or commits, and fileSystem file has unsaved changes.
      //    We consider this to be un-realistic scenario and in this case just fail gracefully.
      //
      // To support usecase (3), we need to validate against original network content.
      if (status.fileSystem.isDirty() && (status.network.isDirty() || status.network.hasCommits())) {
        return null;
      }

      const [fileSystemContent, networkContent] = await Promise.all(
          [status.fileSystem.requestContent(), status.network.project().requestFileContent(status.network)]);
      if (fileSystemContent.content === null || networkContent === null) {
        return null;
      }

      if (this.sourceCodeToProcessingPromiseMap.get(networkSourceCode) !== createBindingPromise) {
        return null;
      }

      const target = Bindings.NetworkProject.NetworkProject.targetForUISourceCode(status.network);
      let isValid = false;
      const fileContent = fileSystemContent.content;
      if (target && target.type() === SDK.Target.Type.Node) {
        if (networkContent.content) {
          const rewrappedNetworkContent =
              PersistenceImpl.rewrapNodeJSContent(status.fileSystem, fileContent, networkContent.content);
          isValid = fileContent === rewrappedNetworkContent;
        }
      } else {
        if (networkContent.content) {
          // Trim trailing whitespaces because V8 adds trailing newline.
          isValid = fileContent.trimEnd() === networkContent.content.trimEnd();
        }
      }
      if (!isValid) {
        this.prevalidationFailedForTest(status);
        return null;
      }
      return status;
    }

    async function onStatus(this: Automapping, status: AutomappingStatus|null): Promise<void> {
      if (this.sourceCodeToProcessingPromiseMap.get(networkSourceCode) !== createBindingPromise) {
        return;
      }
      if (!status) {
        this.onBindingFailedForTest();
        this.sourceCodeToProcessingPromiseMap.delete(networkSourceCode);
        return;
      }
      // TODO(lushnikov): remove this check once there's a single uiSourceCode per url. @see crbug.com/670180
      if (this.sourceCodeToAutoMappingStatusMap.has(status.network) ||
          this.sourceCodeToAutoMappingStatusMap.has(status.fileSystem)) {
        this.sourceCodeToProcessingPromiseMap.delete(networkSourceCode);
        return;
      }

      this.statuses.add(status);
      this.sourceCodeToAutoMappingStatusMap.set(status.network, status);
      this.sourceCodeToAutoMappingStatusMap.set(status.fileSystem, status);
      if (status.exactMatch) {
        const projectFolder = this.projectFoldersIndex.closestParentFolder(status.fileSystem.url());
        const newFolderAdded = projectFolder ? this.activeFoldersIndex.addFolder(projectFolder) : false;
        if (newFolderAdded) {
          this.scheduleSweep();
        }
      }
      await this.onStatusAdded.call(null, status);
      this.sourceCodeToProcessingPromiseMap.delete(networkSourceCode);
    }
  }

  private prevalidationFailedForTest(_binding: AutomappingStatus): void {
  }

  private onBindingFailedForTest(): void {
  }

  private clearNetworkStatus(networkSourceCode: Workspace.UISourceCode.UISourceCode): void {
    if (this.sourceCodeToProcessingPromiseMap.has(networkSourceCode)) {
      this.sourceCodeToProcessingPromiseMap.delete(networkSourceCode);
      return;
    }
    const status = this.sourceCodeToAutoMappingStatusMap.get(networkSourceCode);
    if (!status) {
      return;
    }

    this.statuses.delete(status);
    this.sourceCodeToAutoMappingStatusMap.delete(status.network);
    this.sourceCodeToAutoMappingStatusMap.delete(status.fileSystem);
    if (status.exactMatch) {
      const projectFolder = this.projectFoldersIndex.closestParentFolder(status.fileSystem.url());
      if (projectFolder) {
        this.activeFoldersIndex.removeFolder(projectFolder);
      }
    }
    void this.onStatusRemoved.call(null, status);
  }

  private async createBinding(networkSourceCode: Workspace.UISourceCode.UISourceCode): Promise<AutomappingStatus|null> {
    const url = networkSourceCode.url();
    if (Common.ParsedURL.schemeIs(url, 'file:') || Common.ParsedURL.schemeIs(url, 'snippet:')) {
      const fileSourceCode = this.fileSystemUISourceCodes.get(url);
      const status = fileSourceCode ? new AutomappingStatus(networkSourceCode, fileSourceCode, false) : null;
      return status;
    }

    let networkPath = Common.ParsedURL.ParsedURL.extractPath(url);
    if (networkPath === null) {
      return null;
    }

    if (networkPath.endsWith('/')) {
      networkPath = Common.ParsedURL.ParsedURL.concatenate(networkPath, 'index.html');
    }

    const similarFiles =
        this.filesIndex.similarFiles(networkPath).map(path => this.fileSystemUISourceCodes.get(path)) as
        Workspace.UISourceCode.UISourceCode[];
    if (!similarFiles.length) {
      return null;
    }

    await Promise.all(similarFiles.concat(networkSourceCode).map(async sourceCode => {
      this.sourceCodeToMetadataMap.set(sourceCode, await sourceCode.requestMetadata());
    }));

    const activeFiles = similarFiles.filter(file => Boolean(this.activeFoldersIndex.closestParentFolder(file.url())));
    const networkMetadata = this.sourceCodeToMetadataMap.get(networkSourceCode);
    if (!networkMetadata || (!networkMetadata.modificationTime && typeof networkMetadata.contentSize !== 'number')) {
      // If networkSourceCode does not have metadata, try to match against active folders.
      if (activeFiles.length !== 1) {
        return null;
      }
      return new AutomappingStatus(networkSourceCode, activeFiles[0], false);
    }

    // Try to find exact matches, prioritizing active folders.
    let exactMatches = this.filterWithMetadata(activeFiles, networkMetadata);
    if (!exactMatches.length) {
      exactMatches = this.filterWithMetadata(similarFiles, networkMetadata);
    }
    if (exactMatches.length !== 1) {
      return null;
    }
    return new AutomappingStatus(networkSourceCode, exactMatches[0], true);
  }

  private filterWithMetadata(
      files: Workspace.UISourceCode.UISourceCode[],
      networkMetadata: Workspace.UISourceCode.UISourceCodeMetadata): Workspace.UISourceCode.UISourceCode[] {
    return files.filter(file => {
      const fileMetadata = this.sourceCodeToMetadataMap.get(file);
      if (!fileMetadata) {
        return false;
      }
      // Allow a second of difference due to network timestamps lack of precision.
      const timeMatches = !networkMetadata.modificationTime || !fileMetadata.modificationTime ||
          Math.abs(networkMetadata.modificationTime.getTime() - fileMetadata.modificationTime.getTime()) < 1000;
      const contentMatches = !networkMetadata.contentSize || fileMetadata.contentSize === networkMetadata.contentSize;
      return timeMatches && contentMatches;
    });
  }
}

class FilePathIndex {
  readonly #reversedIndex = Common.Trie.Trie.newArrayTrie<string[]>();

  addPath(path: Platform.DevToolsPath.UrlString): void {
    const reversePathParts = path.split('/').reverse();
    this.#reversedIndex.add(reversePathParts);
  }

  removePath(path: Platform.DevToolsPath.UrlString): void {
    const reversePathParts = path.split('/').reverse();
    this.#reversedIndex.remove(reversePathParts);
  }

  similarFiles(networkPath: Platform.DevToolsPath.EncodedPathString): Platform.DevToolsPath.UrlString[] {
    const reversePathParts = networkPath.split('/').reverse();
    const longestCommonPrefix = this.#reversedIndex.longestPrefix(reversePathParts, false);
    if (longestCommonPrefix.length === 0) {
      return [];
    }
    return this.#reversedIndex.words(longestCommonPrefix)
               .map(reversePathParts => reversePathParts.reverse().join('/')) as Platform.DevToolsPath.UrlString[];
  }
}

class FolderIndex {
  readonly #index = Common.Trie.Trie.newArrayTrie<string[]>();
  readonly #folderCount = new Map<string, number>();

  addFolder(path: Platform.DevToolsPath.UrlString): boolean {
    const pathParts = this.#removeTrailingSlash(path).split('/');
    this.#index.add(pathParts);

    const pathForCount = pathParts.join('/');
    const count = this.#folderCount.get(pathForCount) ?? 0;
    this.#folderCount.set(pathForCount, count + 1);
    return count === 0;
  }

  removeFolder(path: Platform.DevToolsPath.UrlString): boolean {
    const pathParts = this.#removeTrailingSlash(path).split('/');
    const pathForCount = pathParts.join('/');
    const count = this.#folderCount.get(pathForCount) ?? 0;
    if (!count) {
      return false;
    }
    if (count > 1) {
      this.#folderCount.set(pathForCount, count - 1);
      return false;
    }
    this.#index.remove(pathParts);
    this.#folderCount.delete(pathForCount);
    return true;
  }

  closestParentFolder(path: Platform.DevToolsPath.UrlString): Platform.DevToolsPath.UrlString {
    const pathParts = path.split('/');
    const commonPrefix = this.#index.longestPrefix(pathParts, /* fullWordOnly */ true);
    return commonPrefix.join('/') as Platform.DevToolsPath.UrlString;
  }

  #removeTrailingSlash(path: Platform.DevToolsPath.UrlString): Platform.DevToolsPath.UrlString {
    if (path.endsWith('/')) {
      return Common.ParsedURL.ParsedURL.substring(path, 0, path.length - 1);
    }
    return path;
  }
}

class FileSystemUISourceCodes {
  private readonly sourceCodes: Map<Platform.DevToolsPath.UrlString, Workspace.UISourceCode.UISourceCode>;

  constructor() {
    this.sourceCodes = new Map();
  }

  private getPlatformCanonicalFileUrl(path: Platform.DevToolsPath.UrlString): Platform.DevToolsPath.UrlString {
    return Host.Platform.isWin() ? Common.ParsedURL.ParsedURL.toLowerCase(path) : path;
  }

  add(sourceCode: Workspace.UISourceCode.UISourceCode): void {
    const fileUrl = this.getPlatformCanonicalFileUrl(sourceCode.url());
    this.sourceCodes.set(fileUrl, sourceCode);
  }

  get(fileUrl: Platform.DevToolsPath.UrlString): Workspace.UISourceCode.UISourceCode|undefined {
    fileUrl = this.getPlatformCanonicalFileUrl(fileUrl);
    return this.sourceCodes.get(fileUrl);
  }

  delete(fileUrl: Platform.DevToolsPath.UrlString): void {
    fileUrl = this.getPlatformCanonicalFileUrl(fileUrl);
    this.sourceCodes.delete(fileUrl);
  }
}

export class AutomappingStatus {
  network: Workspace.UISourceCode.UISourceCode;
  fileSystem: Workspace.UISourceCode.UISourceCode;
  exactMatch: boolean;
  constructor(
      network: Workspace.UISourceCode.UISourceCode, fileSystem: Workspace.UISourceCode.UISourceCode,
      exactMatch: boolean) {
    this.network = network;
    this.fileSystem = fileSystem;
    this.exactMatch = exactMatch;
  }
}
