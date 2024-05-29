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

import type * as Common from '../../core/common/common.js';
import * as i18n from '../../core/i18n/i18n.js';
import * as Platform from '../../core/platform/platform.js';
import * as TextUtils from '../text_utils/text_utils.js';
import * as Workspace from '../workspace/workspace.js';

const UIStrings = {
  /**
   * @description Error message that is displayed in the Sources panel when can't be loaded.
   */
  unknownErrorLoadingFile: 'Unknown error loading file',
};
const str_ = i18n.i18n.registerUIStrings('models/bindings/ContentProviderBasedProject.ts', UIStrings);
const i18nString = i18n.i18n.getLocalizedString.bind(undefined, str_);

interface UISourceCodeData {
  mimeType: string;
  metadata: Workspace.UISourceCode.UISourceCodeMetadata|null;
  contentProvider: TextUtils.ContentProvider.ContentProvider;
}

export class ContentProviderBasedProject extends Workspace.Workspace.ProjectStore {
  readonly #isServiceProjectInternal: boolean;
  readonly #uiSourceCodeToData: WeakMap<Workspace.UISourceCode.UISourceCode, UISourceCodeData>;
  constructor(
      workspace: Workspace.Workspace.WorkspaceImpl, id: string, type: Workspace.Workspace.projectTypes,
      displayName: string, isServiceProject: boolean) {
    super(workspace, id, type, displayName);
    this.#isServiceProjectInternal = isServiceProject;
    this.#uiSourceCodeToData = new WeakMap();
    workspace.addProject(this);
  }

  async requestFileContent(uiSourceCode: Workspace.UISourceCode.UISourceCode):
      Promise<TextUtils.ContentData.ContentDataOrError> {
    const {contentProvider} = this.#uiSourceCodeToData.get(uiSourceCode) as UISourceCodeData;
    try {
      return await contentProvider.requestContentData();
    } catch (err) {
      // TODO(rob.paveza): CRBug 1013683 - Consider propagating exceptions full-stack
      return {
        error: err ? String(err) : i18nString(UIStrings.unknownErrorLoadingFile),
      };
    }
  }

  isServiceProject(): boolean {
    return this.#isServiceProjectInternal;
  }

  async requestMetadata(uiSourceCode: Workspace.UISourceCode.UISourceCode):
      Promise<Workspace.UISourceCode.UISourceCodeMetadata|null> {
    const {metadata} = this.#uiSourceCodeToData.get(uiSourceCode) as UISourceCodeData;
    return metadata;
  }

  canSetFileContent(): boolean {
    return false;
  }

  async setFileContent(_uiSourceCode: Workspace.UISourceCode.UISourceCode, _newContent: string, _isBase64: boolean):
      Promise<void> {
  }

  fullDisplayName(uiSourceCode: Workspace.UISourceCode.UISourceCode): string {
    let parentPath = uiSourceCode.parentURL().replace(/^(?:https?|file)\:\/\//, '');
    try {
      parentPath = decodeURI(parentPath);
    } catch (e) {
    }
    return parentPath + '/' + uiSourceCode.displayName(true);
  }

  mimeType(uiSourceCode: Workspace.UISourceCode.UISourceCode): string {
    const {mimeType} = (this.#uiSourceCodeToData.get(uiSourceCode) as UISourceCodeData);
    return mimeType;
  }

  canRename(): boolean {
    return false;
  }

  override rename(
      uiSourceCode: Workspace.UISourceCode.UISourceCode, newName: Platform.DevToolsPath.RawPathString,
      callback:
          (arg0: boolean, arg1?: string|undefined, arg2?: Platform.DevToolsPath.UrlString|undefined,
           arg3?: Common.ResourceType.ResourceType|undefined) => void): void {
    const path = uiSourceCode.url();
    this.performRename(path, newName, (success: boolean, newName?: string) => {
      if (success && newName) {
        this.renameUISourceCode(uiSourceCode, newName);
      }
      callback(success, newName);
    });
  }

  override excludeFolder(_path: Platform.DevToolsPath.UrlString): void {
  }

  canExcludeFolder(_path: Platform.DevToolsPath.EncodedPathString): boolean {
    return false;
  }

  async createFile(
      _path: Platform.DevToolsPath.EncodedPathString, _name: string|null, _content: string,
      _isBase64?: boolean): Promise<Workspace.UISourceCode.UISourceCode|null> {
    return null;
  }

  canCreateFile(): boolean {
    return false;
  }

  override deleteFile(_uiSourceCode: Workspace.UISourceCode.UISourceCode): void {
  }

  override remove(): void {
  }

  performRename(
      path: Platform.DevToolsPath.UrlString, newName: string,
      callback: (arg0: boolean, arg1?: string|undefined) => void): void {
    callback(false);
  }

  searchInFileContent(
      uiSourceCode: Workspace.UISourceCode.UISourceCode, query: string, caseSensitive: boolean,
      isRegex: boolean): Promise<TextUtils.ContentProvider.SearchMatch[]> {
    const {contentProvider} = this.#uiSourceCodeToData.get(uiSourceCode) as UISourceCodeData;
    return contentProvider.searchInContent(query, caseSensitive, isRegex);
  }

  async findFilesMatchingSearchRequest(
      searchConfig: Workspace.SearchConfig.SearchConfig, filesMatchingFileQuery: Workspace.UISourceCode.UISourceCode[],
      progress: Common.Progress.Progress):
      Promise<Map<Workspace.UISourceCode.UISourceCode, TextUtils.ContentProvider.SearchMatch[]|null>> {
    const result = new Map();
    progress.setTotalWork(filesMatchingFileQuery.length);
    await Promise.all(filesMatchingFileQuery.map(searchInContent.bind(this)));
    progress.done();
    return result;

    async function searchInContent(
        this: ContentProviderBasedProject, uiSourceCode: Workspace.UISourceCode.UISourceCode): Promise<void> {
      let allMatchesFound = true;
      let matches: TextUtils.ContentProvider.SearchMatch[] = [];
      for (const query of searchConfig.queries().slice()) {
        const searchMatches =
            await this.searchInFileContent(uiSourceCode, query, !searchConfig.ignoreCase(), searchConfig.isRegex());
        if (!searchMatches.length) {
          allMatchesFound = false;
          break;
        }
        matches = Platform.ArrayUtilities.mergeOrdered(
            matches, searchMatches as TextUtils.ContentProvider.SearchMatch[],
            TextUtils.ContentProvider.SearchMatch.comparator);
      }
      if (allMatchesFound) {
        result.set(uiSourceCode, matches);
      }
      progress.incrementWorked(1);
    }
  }

  override indexContent(progress: Common.Progress.Progress): void {
    queueMicrotask(progress.done.bind(progress));
  }

  addUISourceCodeWithProvider(
      uiSourceCode: Workspace.UISourceCode.UISourceCode, contentProvider: TextUtils.ContentProvider.ContentProvider,
      metadata: Workspace.UISourceCode.UISourceCodeMetadata|null, mimeType: string): void {
    this.#uiSourceCodeToData.set(uiSourceCode, {mimeType, metadata, contentProvider});
    this.addUISourceCode(uiSourceCode);
  }

  addContentProvider(
      url: Platform.DevToolsPath.UrlString, contentProvider: TextUtils.ContentProvider.ContentProvider,
      mimeType: string): Workspace.UISourceCode.UISourceCode {
    const uiSourceCode = this.createUISourceCode(url, contentProvider.contentType());
    this.addUISourceCodeWithProvider(uiSourceCode, contentProvider, null, mimeType);
    return uiSourceCode;
  }

  reset(): void {
    this.removeProject();
    this.workspace().addProject(this);
  }

  dispose(): void {
    this.removeProject();
  }
}
