// Copyright 2018 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import type * as Common from '../../core/common/common.js';
import type * as Platform from '../../core/platform/platform.js';
import * as i18n from '../../core/i18n/i18n.js';
import type * as TextUtils from '../text_utils/text_utils.js';

const UIStrings = {
  /**
   * @description Assertion error message when failing to load a file.
   */
  unableToReadFilesWithThis: '`PlatformFileSystem` cannot read files.',
};
const str_ = i18n.i18n.registerUIStrings('models/persistence/PlatformFileSystem.ts', UIStrings);
const i18nString = i18n.i18n.getLocalizedString.bind(undefined, str_);
export class PlatformFileSystem {
  private readonly pathInternal: Platform.DevToolsPath.UrlString;
  private readonly typeInternal: string;
  constructor(path: Platform.DevToolsPath.UrlString, type: string) {
    this.pathInternal = path;
    this.typeInternal = type;
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
    return this.pathInternal;
  }

  embedderPath(): Platform.DevToolsPath.RawPathString {
    throw new Error('Not implemented');
  }

  type(): string {
    // TODO(kozyatinskiy): remove type, overrides should implement this interface.
    return this.typeInternal;
  }

  async createFile(_path: Platform.DevToolsPath.EncodedPathString, _name: Platform.DevToolsPath.RawPathString|null):
      Promise<Platform.DevToolsPath.EncodedPathString|null> {
    return Promise.resolve(null);
  }

  deleteFile(_path: Platform.DevToolsPath.EncodedPathString): Promise<boolean> {
    return Promise.resolve(false);
  }

  requestFileBlob(_path: Platform.DevToolsPath.EncodedPathString): Promise<Blob|null> {
    return Promise.resolve(null as Blob | null);
  }

  async requestFileContent(_path: Platform.DevToolsPath.EncodedPathString):
      Promise<TextUtils.ContentProvider.DeferredContent> {
    return {content: null, error: i18nString(UIStrings.unableToReadFilesWithThis), isEncoded: false};
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
