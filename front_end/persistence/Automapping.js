// Copyright 2016 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as Bindings from '../bindings/bindings.js';
import * as Common from '../common/common.js';
import * as Platform from '../platform/platform.js';
import * as SDK from '../sdk/sdk.js';
import * as Workspace from '../workspace/workspace.js';

import {FileSystem, FileSystemWorkspaceBinding} from './FileSystemWorkspaceBinding.js';  // eslint-disable-line no-unused-vars
import {PathEncoder, PersistenceImpl} from './PersistenceImpl.js';

export class Automapping {
  /**
   * @param {!Workspace.Workspace.WorkspaceImpl} workspace
   * @param {function(!AutomappingStatus)} onStatusAdded
   * @param {function(!AutomappingStatus)} onStatusRemoved
   */
  constructor(workspace, onStatusAdded, onStatusRemoved) {
    this._workspace = workspace;

    this._onStatusAdded = onStatusAdded;
    this._onStatusRemoved = onStatusRemoved;
    /** @type {!Set<!AutomappingStatus>} */
    this._statuses = new Set();
    this._statusSymbol = Symbol('Automapping.Status');
    this._processingPromiseSymbol = Symbol('Automapping.ProcessingPromise');
    this._metadataSymbol = Symbol('Automapping.Metadata');


    /** @type {!Map<string, !Workspace.UISourceCode.UISourceCode>} */
    this._fileSystemUISourceCodes = new Map();
    this._sweepThrottler = new Common.Throttler.Throttler(100);

    const pathEncoder = new PathEncoder();
    this._filesIndex = new FilePathIndex(pathEncoder);
    this._projectFoldersIndex = new FolderIndex(pathEncoder);
    this._activeFoldersIndex = new FolderIndex(pathEncoder);

    /** @type {!Array<function(!Workspace.UISourceCode.UISourceCode):boolean>} */
    this._interceptors = [];

    this._workspace.addEventListener(
        Workspace.Workspace.Events.UISourceCodeAdded,
        event => this._onUISourceCodeAdded(/** @type {!Workspace.UISourceCode.UISourceCode} */ (event.data)));
    this._workspace.addEventListener(
        Workspace.Workspace.Events.UISourceCodeRemoved,
        event => this._onUISourceCodeRemoved(/** @type {!Workspace.UISourceCode.UISourceCode} */ (event.data)));
    this._workspace.addEventListener(Workspace.Workspace.Events.UISourceCodeRenamed, this._onUISourceCodeRenamed, this);
    this._workspace.addEventListener(
        Workspace.Workspace.Events.ProjectAdded,
        event => this._onProjectAdded(/** @type {!Workspace.Workspace.Project} */ (event.data)), this);
    this._workspace.addEventListener(
        Workspace.Workspace.Events.ProjectRemoved,
        event => this._onProjectRemoved(/** @type {!Workspace.Workspace.Project} */ (event.data)), this);

    for (const fileSystem of workspace.projects()) {
      this._onProjectAdded(fileSystem);
    }
    for (const uiSourceCode of workspace.uiSourceCodes()) {
      this._onUISourceCodeAdded(uiSourceCode);
    }
  }

  /**
   * @param {function(!Workspace.UISourceCode.UISourceCode):boolean} interceptor
   */
  addNetworkInterceptor(interceptor) {
    this._interceptors.push(interceptor);
    this.scheduleRemap();
  }

  scheduleRemap() {
    for (const status of this._statuses.values()) {
      this._clearNetworkStatus(status.network);
    }
    this._scheduleSweep();
  }

  _scheduleSweep() {
    this._sweepThrottler.schedule(sweepUnmapped.bind(this));

    /**
     * @this {Automapping}
     * @return {!Promise}
     */
    function sweepUnmapped() {
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

  _onSweepHappenedForTest() {
  }

  /**
   * @param {!Workspace.Workspace.Project} project
   */
  _onProjectRemoved(project) {
    for (const uiSourceCode of project.uiSourceCodes()) {
      this._onUISourceCodeRemoved(uiSourceCode);
    }
    if (project.type() !== Workspace.Workspace.projectTypes.FileSystem) {
      return;
    }
    const fileSystem = /** @type {!FileSystem} */ (project);
    for (const gitFolder of fileSystem.initialGitFolders()) {
      this._projectFoldersIndex.removeFolder(gitFolder);
    }
    this._projectFoldersIndex.removeFolder(fileSystem.fileSystemPath());
    this.scheduleRemap();
  }

  /**
   * @param {!Workspace.Workspace.Project} project
   */
  _onProjectAdded(project) {
    if (project.type() !== Workspace.Workspace.projectTypes.FileSystem) {
      return;
    }
    const fileSystem = /** @type {!FileSystem} */ (project);
    for (const gitFolder of fileSystem.initialGitFolders()) {
      this._projectFoldersIndex.addFolder(gitFolder);
    }
    this._projectFoldersIndex.addFolder(fileSystem.fileSystemPath());
    project.uiSourceCodes().forEach(this._onUISourceCodeAdded.bind(this));
    this.scheduleRemap();
  }

  /**
   * @param {!Workspace.UISourceCode.UISourceCode} uiSourceCode
   */
  _onUISourceCodeAdded(uiSourceCode) {
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

  /**
   * @param {!Workspace.UISourceCode.UISourceCode} uiSourceCode
   */
  _onUISourceCodeRemoved(uiSourceCode) {
    if (uiSourceCode.project().type() === Workspace.Workspace.projectTypes.FileSystem) {
      this._filesIndex.removePath(uiSourceCode.url());
      this._fileSystemUISourceCodes.delete(uiSourceCode.url());
      const status = uiSourceCode[this._statusSymbol];
      if (status) {
        this._clearNetworkStatus(status.network);
      }
    } else if (uiSourceCode.project().type() === Workspace.Workspace.projectTypes.Network) {
      this._clearNetworkStatus(uiSourceCode);
    }
  }

  /**
   * @param {!Common.EventTarget.EventTargetEvent} event
   */
  _onUISourceCodeRenamed(event) {
    const uiSourceCode = /** @type {!Workspace.UISourceCode.UISourceCode} */ (event.data.uiSourceCode);
    const oldURL = /** @type {string} */ (event.data.oldURL);
    if (uiSourceCode.project().type() !== Workspace.Workspace.projectTypes.FileSystem) {
      return;
    }

    this._filesIndex.removePath(oldURL);
    this._fileSystemUISourceCodes.delete(oldURL);
    const status = uiSourceCode[this._statusSymbol];
    if (status) {
      this._clearNetworkStatus(status.network);
    }

    this._filesIndex.addPath(uiSourceCode.url());
    this._fileSystemUISourceCodes.set(uiSourceCode.url(), uiSourceCode);
    this._scheduleSweep();
  }

  /**
   * @param {!Workspace.UISourceCode.UISourceCode} networkSourceCode
   */
  _computeNetworkStatus(networkSourceCode) {
    if (networkSourceCode[this._processingPromiseSymbol] || networkSourceCode[this._statusSymbol]) {
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
    networkSourceCode[this._processingPromiseSymbol] = createBindingPromise;

    /**
     * @param {?AutomappingStatus} status
     * @return {!Promise<?AutomappingStatus>}
     * @this {Automapping}
     */
    async function validateStatus(status) {
      if (!status) {
        return null;
      }
      if (networkSourceCode[this._processingPromiseSymbol] !== createBindingPromise) {
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

      if (networkSourceCode[this._processingPromiseSymbol] !== createBindingPromise) {
        return null;
      }

      const target = Bindings.NetworkProject.NetworkProject.targetForUISourceCode(status.network);
      let isValid = false;
      const fileContent = fileSystemContent.content;
      if (target && target.type() === SDK.SDKModel.Type.Node) {
        const rewrappedNetworkContent =
            PersistenceImpl.rewrapNodeJSContent(status.fileSystem, fileContent, networkContent.content);
        isValid = fileContent === rewrappedNetworkContent;
      } else {
        // Trim trailing whitespaces because V8 adds trailing newline.
        isValid = fileContent.trimRight() === networkContent.content.trimRight();
      }
      if (!isValid) {
        this._prevalidationFailedForTest(status);
        return null;
      }
      return status;
    }

    /**
     * @param {?AutomappingStatus} status
     * @this {Automapping}
     */
    function onStatus(status) {
      if (networkSourceCode[this._processingPromiseSymbol] !== createBindingPromise) {
        return;
      }
      networkSourceCode[this._processingPromiseSymbol] = null;
      if (!status) {
        this._onBindingFailedForTest();
        return;
      }
      // TODO(lushnikov): remove this check once there's a single uiSourceCode per url. @see crbug.com/670180
      if (status.network[this._statusSymbol] || status.fileSystem[this._statusSymbol]) {
        return;
      }

      this._statuses.add(status);
      status.network[this._statusSymbol] = status;
      status.fileSystem[this._statusSymbol] = status;
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

  /**
   * @param {!AutomappingStatus} binding
   */
  _prevalidationFailedForTest(binding) {
  }

  _onBindingFailedForTest() {
  }

  /**
   * @param {!Workspace.UISourceCode.UISourceCode} networkSourceCode
   */
  _clearNetworkStatus(networkSourceCode) {
    if (networkSourceCode[this._processingPromiseSymbol]) {
      networkSourceCode[this._processingPromiseSymbol] = null;
      return;
    }
    const status = networkSourceCode[this._statusSymbol];
    if (!status) {
      return;
    }

    this._statuses.delete(status);
    status.network[this._statusSymbol] = null;
    status.fileSystem[this._statusSymbol] = null;
    if (status.exactMatch) {
      const projectFolder = this._projectFoldersIndex.closestParentFolder(status.fileSystem.url());
      if (projectFolder) {
        this._activeFoldersIndex.removeFolder(projectFolder);
      }
    }
    this._onStatusRemoved.call(null, status);
  }

  /**
   * @param {!Workspace.UISourceCode.UISourceCode} networkSourceCode
   * @return {!Promise<?AutomappingStatus>}
   */
  _createBinding(networkSourceCode) {
    if (networkSourceCode.url().startsWith('file://') || networkSourceCode.url().startsWith('snippet://')) {
      const decodedUrl = decodeURI(networkSourceCode.url());
      const fileSourceCode = this._fileSystemUISourceCodes.get(decodedUrl);
      const status = fileSourceCode ? new AutomappingStatus(networkSourceCode, fileSourceCode, false) : null;
      return Promise.resolve(status);
    }

    let networkPath = Common.ParsedURL.ParsedURL.extractPath(networkSourceCode.url());
    if (networkPath === null) {
      return Promise.resolve(/** @type {?AutomappingStatus} */ (null));
    }

    if (networkPath.endsWith('/')) {
      networkPath += 'index.html';
    }
    const urlDecodedNetworkPath = decodeURI(networkPath);
    const similarFiles =
        this._filesIndex.similarFiles(urlDecodedNetworkPath).map(path => this._fileSystemUISourceCodes.get(path));
    if (!similarFiles.length) {
      return Promise.resolve(/** @type {?AutomappingStatus} */ (null));
    }

    return this._pullMetadatas(similarFiles.concat(networkSourceCode)).then(onMetadatas.bind(this));

    /**
     * @this {Automapping}
     */
    function onMetadatas() {
      const activeFiles = similarFiles.filter(file => !!this._activeFoldersIndex.closestParentFolder(file.url()));
      const networkMetadata = networkSourceCode[this._metadataSymbol];
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

  /**
   * @param {!Array<!Workspace.UISourceCode.UISourceCode>} uiSourceCodes
   * @return {!Promise}
   */
  _pullMetadatas(uiSourceCodes) {
    return Promise.all(uiSourceCodes.map(async file => {
      file[this._metadataSymbol] = await file.requestMetadata();
    }));
  }

  /**
   * @param {!Array<!Workspace.UISourceCode.UISourceCode>} files
   * @param {!Workspace.UISourceCode.UISourceCodeMetadata} networkMetadata
   * @return {!Array<!Workspace.UISourceCode.UISourceCode>}
   */
  _filterWithMetadata(files, networkMetadata) {
    return files.filter(file => {
      const fileMetadata = file[this._metadataSymbol];
      if (!fileMetadata) {
        return false;
      }
      // Allow a second of difference due to network timestamps lack of precision.
      const timeMatches = !networkMetadata.modificationTime ||
          Math.abs(networkMetadata.modificationTime - fileMetadata.modificationTime) < 1000;
      const contentMatches = !networkMetadata.contentSize || fileMetadata.contentSize === networkMetadata.contentSize;
      return timeMatches && contentMatches;
    });
  }
}

/**
 * @unrestricted
 */
class FilePathIndex {
  /**
   * @param {!PathEncoder} encoder
   */
  constructor(encoder) {
    this._encoder = encoder;
    this._reversedIndex = new Common.Trie.Trie();
  }

  /**
   * @param {string} path
   */
  addPath(path) {
    const encodedPath = this._encoder.encode(path);
    this._reversedIndex.add(Platform.StringUtilities.reverse(encodedPath));
  }

  /**
   * @param {string} path
   */
  removePath(path) {
    const encodedPath = this._encoder.encode(path);
    this._reversedIndex.remove(Platform.StringUtilities.reverse(encodedPath));
  }

  /**
   * @param {string} networkPath
   * @return {!Array<string>}
   */
  similarFiles(networkPath) {
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

/**
 * @unrestricted
 */
class FolderIndex {
  /**
   * @param {!PathEncoder} encoder
   */
  constructor(encoder) {
    this._encoder = encoder;
    this._index = new Common.Trie.Trie();
    /** @type {!Map<string, number>} */
    this._folderCount = new Map();
  }

  /**
   * @param {string} path
   * @return {boolean}
   */
  addFolder(path) {
    if (path.endsWith('/')) {
      path = path.substring(0, path.length - 1);
    }
    const encodedPath = this._encoder.encode(path);
    this._index.add(encodedPath);
    const count = this._folderCount.get(encodedPath) || 0;
    this._folderCount.set(encodedPath, count + 1);
    return count === 0;
  }

  /**
   * @param {string} path
   * @return {boolean}
   */
  removeFolder(path) {
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

  /**
   * @param {string} path
   * @return {string}
   */
  closestParentFolder(path) {
    const encodedPath = this._encoder.encode(path);
    const commonPrefix = this._index.longestPrefix(encodedPath, true);
    return this._encoder.decode(commonPrefix);
  }
}

/**
 * @unrestricted
 */
export class AutomappingStatus {
  /**
   * @param {!Workspace.UISourceCode.UISourceCode} network
   * @param {!Workspace.UISourceCode.UISourceCode} fileSystem
   * @param {boolean} exactMatch
   */
  constructor(network, fileSystem, exactMatch) {
    this.network = network;
    this.fileSystem = fileSystem;
    this.exactMatch = exactMatch;
  }
}
