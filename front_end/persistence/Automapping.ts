// Copyright 2016 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

/* eslint-disable rulesdir/no_underscored_properties */

import * as Bindings from '../bindings/bindings.js';
import * as Common from '../common/common.js';
import * as i18n from '../i18n/i18n.js';
import * as Platform from '../platform/platform.js';
import * as SDK from '../sdk/sdk.js';
import * as Workspace from '../workspace/workspace.js';

import {FileSystem, FileSystemWorkspaceBinding} from './FileSystemWorkspaceBinding.js';  // eslint-disable-line no-unused-vars
import {PathEncoder, PersistenceImpl} from './PersistenceImpl.js';

export const UIStrings = {
  /**
  *@description Error message when attempting to create a binding from a malformed URI.
  *@example {file://%E0%A4%A} PH1
  */
  theAttemptToBindSInTheWorkspace: 'The attempt to bind "{PH1}" in the workspace failed as this URI is malformed.',
};
const str_ = i18n.i18n.registerUIStrings('persistence/Automapping.ts', UIStrings);
const i18nString = i18n.i18n.getLocalizedString.bind(undefined, str_);

export class Automapping {
  _workspace: Workspace.Workspace.WorkspaceImpl;
  _onStatusAdded: (arg0: AutomappingStatus) => Promise<void>;
  _onStatusRemoved: (arg0: AutomappingStatus) => Promise<void>;
  _statuses: Set<AutomappingStatus>;
  _fileSystemUISourceCodes: Map<string, Workspace.UISourceCode.UISourceCode>;
  _sweepThrottler: Common.Throttler.Throttler;
  _sourceCodeToProcessingPromiseMap: WeakMap<Workspace.UISourceCode.UISourceCode, Promise<void>>;
  _sourceCodeToAutoMappingStatusMap: WeakMap<Workspace.UISourceCode.UISourceCode, AutomappingStatus>;
  _sourceCodeToMetadataMap:
      WeakMap<Workspace.UISourceCode.UISourceCode, Workspace.UISourceCode.UISourceCodeMetadata|null>;
  _filesIndex: FilePathIndex;
  _projectFoldersIndex: FolderIndex;
  _activeFoldersIndex: FolderIndex;
  _interceptors: ((arg0: Workspace.UISourceCode.UISourceCode) => boolean)[];
  constructor(
      workspace: Workspace.Workspace.WorkspaceImpl, onStatusAdded: (arg0: AutomappingStatus) => Promise<void>,
      onStatusRemoved: (arg0: AutomappingStatus) => Promise<void>) {
    this._workspace = workspace;

    this._onStatusAdded = onStatusAdded;
    this._onStatusRemoved = onStatusRemoved;
    this._statuses = new Set();

    this._fileSystemUISourceCodes = new Map();
    this._sweepThrottler = new Common.Throttler.Throttler(100);

    this._sourceCodeToProcessingPromiseMap = new WeakMap();
    this._sourceCodeToAutoMappingStatusMap = new WeakMap();
    this._sourceCodeToMetadataMap = new WeakMap();

    const pathEncoder = new PathEncoder();
    this._filesIndex = new FilePathIndex(pathEncoder);
    this._projectFoldersIndex = new FolderIndex(pathEncoder);
    this._activeFoldersIndex = new FolderIndex(pathEncoder);

    this._interceptors = [];

    this._workspace.addEventListener(
        Workspace.Workspace.Events.UISourceCodeAdded,
        event => this._onUISourceCodeAdded(event.data as Workspace.UISourceCode.UISourceCode));
    this._workspace.addEventListener(
        Workspace.Workspace.Events.UISourceCodeRemoved,
        event => this._onUISourceCodeRemoved(event.data as Workspace.UISourceCode.UISourceCode));
    this._workspace.addEventListener(Workspace.Workspace.Events.UISourceCodeRenamed, this._onUISourceCodeRenamed, this);
    this._workspace.addEventListener(
        Workspace.Workspace.Events.ProjectAdded,
        event => this._onProjectAdded(event.data as Workspace.Workspace.Project), this);
    this._workspace.addEventListener(
        Workspace.Workspace.Events.ProjectRemoved,
        event => this._onProjectRemoved(event.data as Workspace.Workspace.Project), this);

    for (const fileSystem of workspace.projects()) {
      this._onProjectAdded(fileSystem);
    }
    for (const uiSourceCode of workspace.uiSourceCodes()) {
      this._onUISourceCodeAdded(uiSourceCode);
    }
  }

  addNetworkInterceptor(interceptor: (arg0: Workspace.UISourceCode.UISourceCode) => boolean): void {
    this._interceptors.push(interceptor);
    this.scheduleRemap();
  }

  scheduleRemap(): void {
    for (const status of this._statuses.values()) {
      this._clearNetworkStatus(status.network);
    }
    this._scheduleSweep();
  }

  _scheduleSweep(): void {
    this._sweepThrottler.schedule(sweepUnmapped.bind(this));

    function sweepUnmapped(this: Automapping): Promise<void> {
      const networkProjects = this._workspace.projectsForType(Workspace.Workspace.projectTypes.Network);
      for (const networkProject of networkProjects) {
        for (const uiSourceCode of networkProject.uiSourceCodes()) {
          this._computeNetworkStatus(uiSourceCode);
        }
      }
      this._onSweepHappenedForTest();
      return Promise.resolve();
    }
  }

  _onSweepHappenedForTest(): void {
  }

  _onProjectRemoved(project: Workspace.Workspace.Project): void {
    for (const uiSourceCode of project.uiSourceCodes()) {
      this._onUISourceCodeRemoved(uiSourceCode);
    }
    if (project.type() !== Workspace.Workspace.projectTypes.FileSystem) {
      return;
    }
    const fileSystem = project as FileSystem;
    for (const gitFolder of fileSystem.initialGitFolders()) {
      this._projectFoldersIndex.removeFolder(gitFolder);
    }
    this._projectFoldersIndex.removeFolder(fileSystem.fileSystemPath());
    this.scheduleRemap();
  }

  _onProjectAdded(project: Workspace.Workspace.Project): void {
    if (project.type() !== Workspace.Workspace.projectTypes.FileSystem) {
      return;
    }
    const fileSystem = project as FileSystem;
    for (const gitFolder of fileSystem.initialGitFolders()) {
      this._projectFoldersIndex.addFolder(gitFolder);
    }
    this._projectFoldersIndex.addFolder(fileSystem.fileSystemPath());
    project.uiSourceCodes().forEach(this._onUISourceCodeAdded.bind(this));
    this.scheduleRemap();
  }

  _onUISourceCodeAdded(uiSourceCode: Workspace.UISourceCode.UISourceCode): void {
    const project = uiSourceCode.project();
    if (project.type() === Workspace.Workspace.projectTypes.FileSystem) {
      if (!FileSystemWorkspaceBinding.fileSystemSupportsAutomapping(project)) {
        return;
      }
      this._filesIndex.addPath(uiSourceCode.url());
      this._fileSystemUISourceCodes.set(uiSourceCode.url(), uiSourceCode);
      this._scheduleSweep();
    } else if (project.type() === Workspace.Workspace.projectTypes.Network) {
      this._computeNetworkStatus(uiSourceCode);
    }
  }

  _onUISourceCodeRemoved(uiSourceCode: Workspace.UISourceCode.UISourceCode): void {
    if (uiSourceCode.project().type() === Workspace.Workspace.projectTypes.FileSystem) {
      this._filesIndex.removePath(uiSourceCode.url());
      this._fileSystemUISourceCodes.delete(uiSourceCode.url());
      const status = this._sourceCodeToAutoMappingStatusMap.get(uiSourceCode);
      if (status) {
        this._clearNetworkStatus(status.network);
      }
    } else if (uiSourceCode.project().type() === Workspace.Workspace.projectTypes.Network) {
      this._clearNetworkStatus(uiSourceCode);
    }
  }

  _onUISourceCodeRenamed(event: Common.EventTarget.EventTargetEvent): void {
    const uiSourceCode = event.data.uiSourceCode as Workspace.UISourceCode.UISourceCode;
    const oldURL = event.data.oldURL as string;
    if (uiSourceCode.project().type() !== Workspace.Workspace.projectTypes.FileSystem) {
      return;
    }

    this._filesIndex.removePath(oldURL);
    this._fileSystemUISourceCodes.delete(oldURL);
    const status = this._sourceCodeToAutoMappingStatusMap.get(uiSourceCode);
    if (status) {
      this._clearNetworkStatus(status.network);
    }

    this._filesIndex.addPath(uiSourceCode.url());
    this._fileSystemUISourceCodes.set(uiSourceCode.url(), uiSourceCode);
    this._scheduleSweep();
  }

  _computeNetworkStatus(networkSourceCode: Workspace.UISourceCode.UISourceCode): void {
    if (this._sourceCodeToProcessingPromiseMap.has(networkSourceCode) ||
        this._sourceCodeToAutoMappingStatusMap.has(networkSourceCode)) {
      return;
    }
    if (this._interceptors.some(interceptor => interceptor(networkSourceCode))) {
      return;
    }
    if (networkSourceCode.url().startsWith('wasm://')) {
      return;
    }
    const createBindingPromise =
        this._createBinding(networkSourceCode).then(validateStatus.bind(this)).then(onStatus.bind(this));
    this._sourceCodeToProcessingPromiseMap.set(networkSourceCode, createBindingPromise);

    async function validateStatus(this: Automapping, status: AutomappingStatus|null): Promise<AutomappingStatus|null> {
      if (!status) {
        return null;
      }
      if (this._sourceCodeToProcessingPromiseMap.get(networkSourceCode) !== createBindingPromise) {
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

      if (this._sourceCodeToProcessingPromiseMap.get(networkSourceCode) !== createBindingPromise) {
        return null;
      }

      const target = Bindings.NetworkProject.NetworkProject.targetForUISourceCode(status.network);
      let isValid = false;
      const fileContent = fileSystemContent.content;
      if (target && target.type() === SDK.SDKModel.Type.Node) {
        if (networkContent.content) {
          const rewrappedNetworkContent =
              PersistenceImpl.rewrapNodeJSContent(status.fileSystem, fileContent, networkContent.content);
          isValid = fileContent === rewrappedNetworkContent;
        }
      } else {
        if (networkContent.content) {
          // Trim trailing whitespaces because V8 adds trailing newline.
          isValid = fileContent.trimRight() === networkContent.content.trimRight();
        }
      }
      if (!isValid) {
        this._prevalidationFailedForTest(status);
        return null;
      }
      return status;
    }

    function onStatus(this: Automapping, status: AutomappingStatus|null): void {
      if (this._sourceCodeToProcessingPromiseMap.get(networkSourceCode) !== createBindingPromise) {
        return;
      }
      this._sourceCodeToProcessingPromiseMap.delete(networkSourceCode);
      if (!status) {
        this._onBindingFailedForTest();
        return;
      }
      // TODO(lushnikov): remove this check once there's a single uiSourceCode per url. @see crbug.com/670180
      if (this._sourceCodeToAutoMappingStatusMap.has(status.network) ||
          this._sourceCodeToAutoMappingStatusMap.has(status.fileSystem)) {
        return;
      }

      this._statuses.add(status);
      this._sourceCodeToAutoMappingStatusMap.set(status.network, status);
      this._sourceCodeToAutoMappingStatusMap.set(status.fileSystem, status);
      if (status.exactMatch) {
        const projectFolder = this._projectFoldersIndex.closestParentFolder(status.fileSystem.url());
        const newFolderAdded = projectFolder ? this._activeFoldersIndex.addFolder(projectFolder) : false;
        if (newFolderAdded) {
          this._scheduleSweep();
        }
      }
      this._onStatusAdded.call(null, status);
    }
  }

  _prevalidationFailedForTest(_binding: AutomappingStatus): void {
  }

  _onBindingFailedForTest(): void {
  }

  _clearNetworkStatus(networkSourceCode: Workspace.UISourceCode.UISourceCode): void {
    if (this._sourceCodeToProcessingPromiseMap.has(networkSourceCode)) {
      this._sourceCodeToProcessingPromiseMap.delete(networkSourceCode);
      return;
    }
    const status = this._sourceCodeToAutoMappingStatusMap.get(networkSourceCode);
    if (!status) {
      return;
    }

    this._statuses.delete(status);
    this._sourceCodeToAutoMappingStatusMap.delete(status.network);
    this._sourceCodeToAutoMappingStatusMap.delete(status.fileSystem);
    if (status.exactMatch) {
      const projectFolder = this._projectFoldersIndex.closestParentFolder(status.fileSystem.url());
      if (projectFolder) {
        this._activeFoldersIndex.removeFolder(projectFolder);
      }
    }
    this._onStatusRemoved.call(null, status);
  }

  _createBinding(networkSourceCode: Workspace.UISourceCode.UISourceCode): Promise<AutomappingStatus|null> {
    const url = networkSourceCode.url();
    if (url.startsWith('file://') || url.startsWith('snippet://')) {
      const decodedUrl = sanitizeSourceUrl(url);
      if (!decodedUrl) {
        return Promise.resolve(null as AutomappingStatus | null);
      }
      const fileSourceCode = this._fileSystemUISourceCodes.get(decodedUrl);
      const status = fileSourceCode ? new AutomappingStatus(networkSourceCode, fileSourceCode, false) : null;
      return Promise.resolve(status);
    }

    let networkPath = Common.ParsedURL.ParsedURL.extractPath(url);
    if (networkPath === null) {
      return Promise.resolve(null as AutomappingStatus | null);
    }

    if (networkPath.endsWith('/')) {
      networkPath += 'index.html';
    }

    const urlDecodedNetworkPath = sanitizeSourceUrl(networkPath);
    if (!urlDecodedNetworkPath) {
      return Promise.resolve(null as AutomappingStatus | null);
    }

    const similarFiles =
        this._filesIndex.similarFiles(urlDecodedNetworkPath).map(path => this._fileSystemUISourceCodes.get(path)) as
        Workspace.UISourceCode.UISourceCode[];
    if (!similarFiles.length) {
      return Promise.resolve(null as AutomappingStatus | null);
    }

    return this._pullMetadatas(similarFiles.concat(networkSourceCode)).then(onMetadatas.bind(this));

    function sanitizeSourceUrl(url: string): string|null {
      try {
        const decodedUrl = decodeURI(url);
        return decodedUrl;
      } catch (error) {
        Common.Console.Console.instance().error(i18nString(UIStrings.theAttemptToBindSInTheWorkspace, {PH1: url}));
        return null;
      }
    }

    function onMetadatas(this: Automapping): AutomappingStatus|null {
      const activeFiles =
          similarFiles.filter(
              file => Boolean(file) && Boolean(this._activeFoldersIndex.closestParentFolder(file.url()))) as
          Workspace.UISourceCode.UISourceCode[];
      const networkMetadata = this._sourceCodeToMetadataMap.get(networkSourceCode);
      if (!networkMetadata || (!networkMetadata.modificationTime && typeof networkMetadata.contentSize !== 'number')) {
        // If networkSourceCode does not have metadata, try to match against active folders.
        if (activeFiles.length !== 1) {
          return null;
        }
        return new AutomappingStatus(networkSourceCode, activeFiles[0], false);
      }

      // Try to find exact matches, prioritizing active folders.
      let exactMatches = this._filterWithMetadata(activeFiles, networkMetadata);
      if (!exactMatches.length) {
        exactMatches = this._filterWithMetadata(similarFiles, networkMetadata);
      }
      if (exactMatches.length !== 1) {
        return null;
      }
      return new AutomappingStatus(networkSourceCode, exactMatches[0], true);
    }
  }

  async _pullMetadatas(uiSourceCodes: Workspace.UISourceCode.UISourceCode[]): Promise<void> {
    await Promise.all(uiSourceCodes.map(async file => {
      this._sourceCodeToMetadataMap.set(file, await file.requestMetadata());
    }));
  }

  _filterWithMetadata(
      files: Workspace.UISourceCode.UISourceCode[],
      networkMetadata: Workspace.UISourceCode.UISourceCodeMetadata): Workspace.UISourceCode.UISourceCode[] {
    return files.filter(file => {
      const fileMetadata = this._sourceCodeToMetadataMap.get(file);
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
  _encoder: PathEncoder;
  _reversedIndex: Common.Trie.Trie;
  constructor(encoder: PathEncoder) {
    this._encoder = encoder;
    this._reversedIndex = new Common.Trie.Trie();
  }

  addPath(path: string): void {
    const encodedPath = this._encoder.encode(path);
    this._reversedIndex.add(Platform.StringUtilities.reverse(encodedPath));
  }

  removePath(path: string): void {
    const encodedPath = this._encoder.encode(path);
    this._reversedIndex.remove(Platform.StringUtilities.reverse(encodedPath));
  }

  similarFiles(networkPath: string): string[] {
    const encodedPath = this._encoder.encode(networkPath);
    const reversedEncodedPath = Platform.StringUtilities.reverse(encodedPath);
    const longestCommonPrefix = this._reversedIndex.longestPrefix(reversedEncodedPath, false);
    if (!longestCommonPrefix) {
      return [];
    }
    return this._reversedIndex.words(longestCommonPrefix)
        .map(encodedPath => this._encoder.decode(Platform.StringUtilities.reverse(encodedPath)));
  }
}

class FolderIndex {
  _encoder: PathEncoder;
  _index: Common.Trie.Trie;
  _folderCount: Map<string, number>;
  constructor(encoder: PathEncoder) {
    this._encoder = encoder;
    this._index = new Common.Trie.Trie();
    this._folderCount = new Map();
  }

  addFolder(path: string): boolean {
    if (path.endsWith('/')) {
      path = path.substring(0, path.length - 1);
    }
    const encodedPath = this._encoder.encode(path);
    this._index.add(encodedPath);
    const count = this._folderCount.get(encodedPath) || 0;
    this._folderCount.set(encodedPath, count + 1);
    return count === 0;
  }

  removeFolder(path: string): boolean {
    if (path.endsWith('/')) {
      path = path.substring(0, path.length - 1);
    }
    const encodedPath = this._encoder.encode(path);
    const count = this._folderCount.get(encodedPath) || 0;
    if (!count) {
      return false;
    }
    if (count > 1) {
      this._folderCount.set(encodedPath, count - 1);
      return false;
    }
    this._index.remove(encodedPath);
    this._folderCount.delete(encodedPath);
    return true;
  }

  closestParentFolder(path: string): string {
    const encodedPath = this._encoder.encode(path);
    const commonPrefix = this._index.longestPrefix(encodedPath, true);
    return this._encoder.decode(commonPrefix);
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
