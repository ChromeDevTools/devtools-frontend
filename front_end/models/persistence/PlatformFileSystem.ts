// Copyright 2018 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as Common from '../../core/common/common.js';
import * as i18n from '../../core/i18n/i18n.js';
import type * as Platform from '../../core/platform/platform.js';
import type * as TextUtils from '../text_utils/text_utils.js';

const UIStrings = {
  /**
   * @description Assertion error message when failing to load a file.
   */
  unableToReadFilesWithThis: '`PlatformFileSystem` cannot read files.',
} as const;
const str_ = i18n.i18n.registerUIStrings('models/persistence/PlatformFileSystem.ts', UIStrings);
const i18nString = i18n.i18n.getLocalizedString.bind(undefined, str_);

export enum PlatformFileSystemType {
  /**
   * Snippets are implemented as a PlatformFileSystem but they are
   * actually stored in the browser's profile directory and do not
   * create files on the actual filesystem.
   *
   * See Sources > Snippets in the UI.
   */
  SNIPPETS = 'snippets',
  /**
   * Overrides is a filesystem that represents a user-selected folder on
   * disk. This folder is used to replace page resources using request
   * interception.
   *
   * See Sources > Overrides in the UI.
   */
  OVERRIDES = 'overrides',
  /**
   * Represents a filesystem for a workspace folder that the user added
   * to DevTools. It can be manually connected or it can be
   * automatically discovered based on the hints found in devtools.json
   * served by the inspected page (see
   * https://goo.gle/devtools-json-design). DevTools tries to map the
   * page content to the content in such folder but does not use request
   * interception for this.
   */
  WORKSPACE_PROJECT = 'workspace-project',
}

export const enum Events {
  FILE_SYSTEM_ERROR = 'file-system-error',
}

interface EventTypes {
  [Events.FILE_SYSTEM_ERROR]: string;
}

export class PlatformFileSystem extends Common.ObjectWrapper.ObjectWrapper<EventTypes> {
  readonly #path: Platform.DevToolsPath.UrlString;
  #type: PlatformFileSystemType;
  /**
   * True if the filesystem was automatically discovered (see
   * https://goo.gle/devtools-json-design).
   */
  readonly automatic: boolean;

  constructor(path: Platform.DevToolsPath.UrlString, type: PlatformFileSystemType, automatic: boolean) {
    super();
    this.#path = path;
    this.#type = type;
    this.automatic = automatic;
  }

  getMetadata(_path: Platform.DevToolsPath.EncodedPathString): Promise<{modificationTime: Date, size: number}|null> {
    return Promise.resolve(null);
  }

  initialFilePaths(): Platform.DevToolsPath.EncodedPathString[] {
    return [];
  }

  initialGitFolders(): Platform.DevToolsPath.EncodedPathString[] {
    return [];
  }

  path(): Platform.DevToolsPath.UrlString {
    return this.#path;
  }

  embedderPath(): Platform.DevToolsPath.RawPathString {
    throw new Error('Not implemented');
  }

  type(): PlatformFileSystemType {
    return this.#type;
  }

  async createFile(_path: Platform.DevToolsPath.EncodedPathString, _name: Platform.DevToolsPath.RawPathString|null):
      Promise<Platform.DevToolsPath.EncodedPathString|null> {
    return await Promise.resolve(null);
  }

  deleteFile(_path: Platform.DevToolsPath.EncodedPathString): Promise<boolean> {
    return Promise.resolve(false);
  }

  deleteDirectoryRecursively(_path: Platform.DevToolsPath.EncodedPathString): Promise<boolean> {
    return Promise.resolve(false);
  }

  requestFileBlob(_path: Platform.DevToolsPath.EncodedPathString): Promise<Blob|null> {
    return Promise.resolve(null as Blob | null);
  }

  async requestFileContent(_path: Platform.DevToolsPath.EncodedPathString):
      Promise<TextUtils.ContentData.ContentDataOrError> {
    return {error: i18nString(UIStrings.unableToReadFilesWithThis)};
  }

  setFileContent(_path: Platform.DevToolsPath.EncodedPathString, _content: string, _isBase64: boolean): void {
    throw new Error('Not implemented');
  }

  renameFile(
      _path: Platform.DevToolsPath.EncodedPathString, _newName: Platform.DevToolsPath.RawPathString,
      callback: (arg0: boolean, arg1?: string|undefined) => void): void {
    callback(false);
  }

  addExcludedFolder(_path: Platform.DevToolsPath.EncodedPathString): void {
  }

  removeExcludedFolder(_path: Platform.DevToolsPath.EncodedPathString): void {
  }

  fileSystemRemoved(): void {
  }

  isFileExcluded(_folderPath: Platform.DevToolsPath.EncodedPathString): boolean {
    return false;
  }

  excludedFolders(): Set<Platform.DevToolsPath.EncodedPathString> {
    return new Set();
  }

  searchInPath(_query: string, _progress: Common.Progress.Progress): Promise<string[]> {
    return Promise.resolve([]);
  }

  indexContent(progress: Common.Progress.Progress): void {
    queueMicrotask(() => {
      progress.done();
    });
  }

  mimeFromPath(_path: Platform.DevToolsPath.UrlString): string {
    throw new Error('Not implemented');
  }

  canExcludeFolder(_path: Platform.DevToolsPath.EncodedPathString): boolean {
    return false;
  }

  contentType(_path: string): Common.ResourceType.ResourceType {
    throw new Error('Not implemented');
  }

  tooltipForURL(_url: Platform.DevToolsPath.UrlString): string {
    throw new Error('Not implemented');
  }

  supportsAutomapping(): boolean {
    throw new Error('Not implemented');
  }
}
