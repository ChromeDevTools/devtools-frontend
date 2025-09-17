// Copyright 2013 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

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
} as const;
const str_ = i18n.i18n.registerUIStrings('models/bindings/ContentProviderBasedProject.ts', UIStrings);
const i18nString = i18n.i18n.getLocalizedString.bind(undefined, str_);

interface UISourceCodeData {
  mimeType: string;
  metadata: Workspace.UISourceCode.UISourceCodeMetadata|null;
  contentProvider: TextUtils.ContentProvider.ContentProvider;
}

export class ContentProviderBasedProject extends Workspace.Workspace.ProjectStore {
  readonly #isServiceProject: boolean;
  readonly #uiSourceCodeToData = new WeakMap<Workspace.UISourceCode.UISourceCode, UISourceCodeData>();
  constructor(
      workspace: Workspace.Workspace.WorkspaceImpl, id: string, type: Workspace.Workspace.projectTypes,
      displayName: string, isServiceProject: boolean) {
    super(workspace, id, type, displayName);
    this.#isServiceProject = isServiceProject;
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
    return this.#isServiceProject;
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
    } catch {
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
      _uiSourceCode: Workspace.UISourceCode.UISourceCode, _newName: Platform.DevToolsPath.RawPathString,
      callback:
          (arg0: boolean, arg1?: string|undefined, arg2?: Platform.DevToolsPath.UrlString|undefined,
           arg3?: Common.ResourceType.ResourceType|undefined) => void): void {
    callback(false);
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
    progress.totalWork = filesMatchingFileQuery.length;
    await Promise.all(filesMatchingFileQuery.map(searchInContent.bind(this)));
    progress.done = true;
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
            matches, searchMatches, TextUtils.ContentProvider.SearchMatch.comparator);
      }
      if (allMatchesFound) {
        result.set(uiSourceCode, matches);
      }
      ++progress.worked;
    }
  }

  override indexContent(progress: Common.Progress.Progress): void {
    queueMicrotask(() => {
      progress.done = true;
    });
  }

  addUISourceCodeWithProvider(
      uiSourceCode: Workspace.UISourceCode.UISourceCode,
      contentProvider: TextUtils.ContentProvider.ContentProvider,
      metadata: Workspace.UISourceCode.UISourceCodeMetadata|null,
      mimeType: string,
      ): void {
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
