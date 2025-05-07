// Copyright 2025 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as Common from '../../core/common/common.js';
import * as Host from '../../core/host/host.js';
import type * as Platform from '../../core/platform/platform.js';
import type {ContentDataOrError} from '../text_utils/ContentData.js';
import type {SearchMatch} from '../text_utils/ContentProvider.js';
import * as Workspace from '../workspace/workspace.js';

import {
  type AutomaticFileSystem,
  type AutomaticFileSystemManager,
  Events as AutomaticFileSystemManagerEvents
} from './AutomaticFileSystemManager.js';
import {
  Events as IsolatedFileSystemManagerEvents,
  type IsolatedFileSystemManager
} from './IsolatedFileSystemManager.js';

/**
 * Placeholder project that acts as an empty file system within the workspace,
 * and automatically disappears when the user connects the automatic workspace
 * folder.
 *
 * @see AutomaticFileSystemWorkspaceBinding
 */
export class FileSystem implements Workspace.Workspace.Project {
  readonly automaticFileSystem: Readonly<AutomaticFileSystem>;
  readonly automaticFileSystemManager: AutomaticFileSystemManager;
  readonly #workspace: Workspace.Workspace.WorkspaceImpl;

  constructor(
      automaticFileSystem: Readonly<AutomaticFileSystem>, automaticFileSystemManager: AutomaticFileSystemManager,
      workspace: Workspace.Workspace.WorkspaceImpl) {
    this.automaticFileSystem = automaticFileSystem;
    this.automaticFileSystemManager = automaticFileSystemManager;
    this.#workspace = workspace;
  }

  workspace(): Workspace.Workspace.WorkspaceImpl {
    return this.#workspace;
  }

  id(): string {
    return `${this.type()}:${this.automaticFileSystem.root}:${this.automaticFileSystem.uuid}`;
  }

  type(): Workspace.Workspace.projectTypes {
    return Workspace.Workspace.projectTypes.ConnectableFileSystem;
  }

  isServiceProject(): boolean {
    return false;
  }

  displayName(): string {
    const {root} = this.automaticFileSystem;
    let slash = root.lastIndexOf('/');
    if (slash === -1 && Host.Platform.isWin()) {
      slash = root.lastIndexOf('\\');
    }
    return root.substr(slash + 1);
  }

  async requestMetadata(_uiSourceCode: Workspace.UISourceCode.UISourceCode):
      Promise<Workspace.UISourceCode.UISourceCodeMetadata|null> {
    throw new Error('Not implemented');
  }

  async requestFileContent(_uiSourceCode: Workspace.UISourceCode.UISourceCode): Promise<ContentDataOrError> {
    throw new Error('Not implemented');
  }

  canSetFileContent(): boolean {
    return false;
  }

  async setFileContent(_uiSourceCode: Workspace.UISourceCode.UISourceCode, _newContent: string, _isBase64: boolean):
      Promise<void> {
    throw new Error('Not implemented');
  }

  fullDisplayName(_uiSourceCode: Workspace.UISourceCode.UISourceCode): string {
    throw new Error('Not implemented');
  }

  mimeType(_uiSourceCode: Workspace.UISourceCode.UISourceCode): string {
    throw new Error('Not implemented');
  }

  canRename(): boolean {
    return false;
  }

  rename(
      _uiSourceCode: Workspace.UISourceCode.UISourceCode, _newName: Platform.DevToolsPath.RawPathString,
      _callback:
          (arg0: boolean, arg1?: string, arg2?: Platform.DevToolsPath.UrlString,
           arg3?: Common.ResourceType.ResourceType) => void): void {
    throw new Error('Not implemented');
  }

  excludeFolder(_path: Platform.DevToolsPath.UrlString): void {
    throw new Error('Not implemented');
  }

  canExcludeFolder(_path: Platform.DevToolsPath.EncodedPathString): boolean {
    return false;
  }

  async createFile(
      _path: Platform.DevToolsPath.EncodedPathString, _name: string|null, _content: string,
      _isBase64?: boolean): Promise<Workspace.UISourceCode.UISourceCode|null> {
    throw new Error('Not implemented');
  }

  canCreateFile(): boolean {
    return false;
  }

  deleteFile(_uiSourceCode: Workspace.UISourceCode.UISourceCode): void {
    throw new Error('Not implemented');
  }

  async deleteDirectoryRecursively(_path: Platform.DevToolsPath.EncodedPathString): Promise<boolean> {
    throw new Error('Not implemented');
  }

  remove(): void {
  }

  removeUISourceCode(_url: Platform.DevToolsPath.UrlString): void {
    throw new Error('Not implemented');
  }

  async searchInFileContent(
      _uiSourceCode: Workspace.UISourceCode.UISourceCode, _query: string, _caseSensitive: boolean,
      _isRegex: boolean): Promise<SearchMatch[]> {
    return [];
  }

  async findFilesMatchingSearchRequest(
      _searchConfig: Workspace.SearchConfig.SearchConfig,
      _filesMatchingFileQuery: Workspace.UISourceCode.UISourceCode[],
      _progress: Common.Progress.Progress): Promise<Map<Workspace.UISourceCode.UISourceCode, SearchMatch[]|null>> {
    return new Map();
  }

  indexContent(_progress: Common.Progress.Progress): void {
  }

  uiSourceCodeForURL(_url: Platform.DevToolsPath.UrlString): Workspace.UISourceCode.UISourceCode|null {
    return null;
  }

  uiSourceCodes(): Iterable<Workspace.UISourceCode.UISourceCode> {
    return [];
  }
}

let automaticFileSystemWorkspaceBindingInstance: AutomaticFileSystemWorkspaceBinding|undefined;

/**
 * Provides a transient workspace `Project` that doesn't contain any `UISourceCode`s,
 * and only acts as a placeholder for the automatic file system, while it's not
 * connected yet. The placeholder project automatically disappears as soon as
 * the automatic file system is connected successfully.
 */
export class AutomaticFileSystemWorkspaceBinding {
  readonly #automaticFileSystemManager: AutomaticFileSystemManager;
  #fileSystem: FileSystem|null = null;
  readonly #isolatedFileSystemManager: IsolatedFileSystemManager;
  readonly #workspace: Workspace.Workspace.WorkspaceImpl;

  /**
   * @internal
   */
  private constructor(
      automaticFileSystemManager: AutomaticFileSystemManager,
      isolatedFileSystemManager: IsolatedFileSystemManager,
      workspace: Workspace.Workspace.WorkspaceImpl,
  ) {
    this.#automaticFileSystemManager = automaticFileSystemManager;
    this.#isolatedFileSystemManager = isolatedFileSystemManager;
    this.#workspace = workspace;
    this.#automaticFileSystemManager.addEventListener(
        AutomaticFileSystemManagerEvents.AUTOMATIC_FILE_SYSTEM_CHANGED, this.#update, this);
    this.#isolatedFileSystemManager.addEventListener(
        IsolatedFileSystemManagerEvents.FileSystemAdded, this.#update, this);
    this.#isolatedFileSystemManager.addEventListener(
        IsolatedFileSystemManagerEvents.FileSystemRemoved, this.#update, this);
    this.#update();
  }

  /**
   * Yields the `AutomaticFileSystemWorkspaceBinding` singleton.
   *
   * @returns the singleton.
   */
  static instance({forceNew, automaticFileSystemManager, isolatedFileSystemManager, workspace}: {
    forceNew: boolean|null,
    automaticFileSystemManager: AutomaticFileSystemManager|null,
    isolatedFileSystemManager: IsolatedFileSystemManager|null,
    workspace: Workspace.Workspace.WorkspaceImpl|null,
  } = {
    forceNew: false,
    automaticFileSystemManager: null,
    isolatedFileSystemManager: null,
    workspace: null,
  }): AutomaticFileSystemWorkspaceBinding {
    if (!automaticFileSystemWorkspaceBindingInstance || forceNew) {
      if (!automaticFileSystemManager || !isolatedFileSystemManager || !workspace) {
        throw new Error(
            'Unable to create AutomaticFileSystemWorkspaceBinding: ' +
            'automaticFileSystemManager, isolatedFileSystemManager, ' +
            'and workspace must be provided');
      }
      automaticFileSystemWorkspaceBindingInstance = new AutomaticFileSystemWorkspaceBinding(
          automaticFileSystemManager,
          isolatedFileSystemManager,
          workspace,
      );
    }
    return automaticFileSystemWorkspaceBindingInstance;
  }

  /**
   * Clears the `AutomaticFileSystemWorkspaceBinding` singleton (if any);
   */
  static removeInstance(): void {
    if (automaticFileSystemWorkspaceBindingInstance) {
      automaticFileSystemWorkspaceBindingInstance.#dispose();
      automaticFileSystemWorkspaceBindingInstance = undefined;
    }
  }

  #dispose(): void {
    if (this.#fileSystem) {
      this.#workspace.removeProject(this.#fileSystem);
    }
    this.#automaticFileSystemManager.removeEventListener(
        AutomaticFileSystemManagerEvents.AUTOMATIC_FILE_SYSTEM_CHANGED, this.#update, this);
    this.#isolatedFileSystemManager.removeEventListener(
        IsolatedFileSystemManagerEvents.FileSystemAdded, this.#update, this);
    this.#isolatedFileSystemManager.removeEventListener(
        IsolatedFileSystemManagerEvents.FileSystemRemoved, this.#update, this);
  }

  #update(): void {
    const automaticFileSystem = this.#automaticFileSystemManager.automaticFileSystem;
    if (this.#fileSystem !== null) {
      if (this.#fileSystem.automaticFileSystem === automaticFileSystem) {
        return;
      }
      this.#workspace.removeProject(this.#fileSystem);
      this.#fileSystem = null;
    }
    if (automaticFileSystem !== null && automaticFileSystem.state !== 'connected') {
      // Check if we already have a (manually added) file system, and if so, don't
      // offer the option to connect the automatic file system.
      const fileSystemURL = Common.ParsedURL.ParsedURL.rawPathToUrlString(automaticFileSystem.root);
      if (this.#isolatedFileSystemManager.fileSystem(fileSystemURL) === null) {
        this.#fileSystem = new FileSystem(
            automaticFileSystem,
            this.#automaticFileSystemManager,
            this.#workspace,
        );
        this.#workspace.addProject(this.#fileSystem);
      }
    }
  }
}
