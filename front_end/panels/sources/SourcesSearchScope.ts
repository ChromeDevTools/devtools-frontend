/*
 * Copyright (C) 2011 Google Inc. All rights reserved.
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
import * as Bindings from '../../models/bindings/bindings.js';
import * as Persistence from '../../models/persistence/persistence.js';
import * as TextUtils from '../../models/text_utils/text_utils.js';
import * as Workspace from '../../models/workspace/workspace.js';
import type * as Search from '../search/search.js';

export class SourcesSearchScope implements Search.SearchScope.SearchScope {
  private searchId: number;
  private searchResultCandidates: Workspace.UISourceCode.UISourceCode[];
  private searchResultCallback: ((arg0: Search.SearchScope.SearchResult) => void)|null;
  private searchFinishedCallback: ((arg0: boolean) => void)|null;
  private searchConfig: Workspace.SearchConfig.SearchConfig|null;
  constructor() {
    // FIXME: Add title once it is used by search controller.
    this.searchId = 0;
    this.searchResultCandidates = [];
    this.searchResultCallback = null;
    this.searchFinishedCallback = null;
    this.searchConfig = null;
  }

  private static filesComparator(
      uiSourceCode1: Workspace.UISourceCode.UISourceCode, uiSourceCode2: Workspace.UISourceCode.UISourceCode): number {
    if (uiSourceCode1.isDirty() && !uiSourceCode2.isDirty()) {
      return -1;
    }
    if (!uiSourceCode1.isDirty() && uiSourceCode2.isDirty()) {
      return 1;
    }
    const isFileSystem1 = uiSourceCode1.project().type() === Workspace.Workspace.projectTypes.FileSystem &&
        !Persistence.Persistence.PersistenceImpl.instance().binding(uiSourceCode1);
    const isFileSystem2 = uiSourceCode2.project().type() === Workspace.Workspace.projectTypes.FileSystem &&
        !Persistence.Persistence.PersistenceImpl.instance().binding(uiSourceCode2);
    if (isFileSystem1 !== isFileSystem2) {
      return isFileSystem1 ? 1 : -1;
    }
    const url1 = uiSourceCode1.url();
    const url2 = uiSourceCode2.url();
    if (url1 && !url2) {
      return -1;
    }
    if (!url1 && url2) {
      return 1;
    }
    return Platform.StringUtilities.naturalOrderComparator(
        uiSourceCode1.fullDisplayName(), uiSourceCode2.fullDisplayName());
  }

  private static urlComparator(
      uiSourceCode1: Workspace.UISourceCode.UISourceCode, uiSourceCode2: Workspace.UISourceCode.UISourceCode): number {
    return Platform.StringUtilities.naturalOrderComparator(uiSourceCode1.url(), uiSourceCode2.url());
  }

  performIndexing(progress: Common.Progress.Progress): void {
    this.stopSearch();

    const projects = this.projects();
    const compositeProgress = new Common.Progress.CompositeProgress(progress);
    for (let i = 0; i < projects.length; ++i) {
      const project = projects[i];
      const projectProgress = compositeProgress.createSubProgress([...project.uiSourceCodes()].length);
      project.indexContent(projectProgress);
    }
  }

  private projects(): Workspace.Workspace.Project[] {
    const searchInAnonymousAndContentScripts =
        Common.Settings.Settings.instance().moduleSetting('search-in-anonymous-and-content-scripts').get();

    return Workspace.Workspace.WorkspaceImpl.instance().projects().filter(project => {
      if (project.type() === Workspace.Workspace.projectTypes.Service) {
        return false;
      }
      if (!searchInAnonymousAndContentScripts && project.isServiceProject() &&
          project.type() !== Workspace.Workspace.projectTypes.Formatter) {
        return false;
      }
      if (!searchInAnonymousAndContentScripts && project.type() === Workspace.Workspace.projectTypes.ContentScripts) {
        return false;
      }
      return true;
    });
  }

  performSearch(
      searchConfig: Workspace.SearchConfig.SearchConfig, progress: Common.Progress.Progress,
      searchResultCallback: (arg0: Search.SearchScope.SearchResult) => void,
      searchFinishedCallback: (arg0: boolean) => void): void {
    this.stopSearch();
    this.searchResultCandidates = [];
    this.searchResultCallback = searchResultCallback;
    this.searchFinishedCallback = searchFinishedCallback;
    this.searchConfig = searchConfig;

    const promises = [];
    const compositeProgress = new Common.Progress.CompositeProgress(progress);
    const searchContentProgress = compositeProgress.createSubProgress();
    const findMatchingFilesProgress = new Common.Progress.CompositeProgress(compositeProgress.createSubProgress());
    for (const project of this.projects()) {
      const weight = [...project.uiSourceCodes()].length;
      const findMatchingFilesInProjectProgress = findMatchingFilesProgress.createSubProgress(weight);
      const filesMatchingFileQuery = this.projectFilesMatchingFileQuery(project, searchConfig);
      const promise =
          project
              .findFilesMatchingSearchRequest(searchConfig, filesMatchingFileQuery, findMatchingFilesInProjectProgress)
              .then(this.processMatchingFilesForProject.bind(
                  this, this.searchId, project, searchConfig, filesMatchingFileQuery));
      promises.push(promise);
    }

    void Promise.all(promises).then(this.processMatchingFiles.bind(
        this, this.searchId, searchContentProgress, this.searchFinishedCallback.bind(this, true)));
  }

  private projectFilesMatchingFileQuery(
      project: Workspace.Workspace.Project, searchConfig: Workspace.SearchConfig.SearchConfig,
      dirtyOnly?: boolean): Workspace.UISourceCode.UISourceCode[] {
    const result = [];
    for (const uiSourceCode of project.uiSourceCodes()) {
      if (!uiSourceCode.contentType().isTextType()) {
        continue;
      }
      if (Bindings.IgnoreListManager.IgnoreListManager.instance().isUserOrSourceMapIgnoreListedUISourceCode(
              uiSourceCode)) {
        continue;
      }
      const binding = Persistence.Persistence.PersistenceImpl.instance().binding(uiSourceCode);
      if (binding && binding.network === uiSourceCode) {
        continue;
      }
      if (dirtyOnly && !uiSourceCode.isDirty()) {
        continue;
      }
      if (searchConfig.filePathMatchesFileQuery(
              uiSourceCode.fullDisplayName() as Platform.DevToolsPath.UrlString |
              Platform.DevToolsPath.EncodedPathString)) {
        result.push(uiSourceCode);
      }
    }
    result.sort(SourcesSearchScope.urlComparator);
    return result;
  }

  private processMatchingFilesForProject(
      searchId: number, project: Workspace.Workspace.Project, searchConfig: Workspace.SearchConfig.SearchConfig,
      filesMatchingFileQuery: Workspace.UISourceCode.UISourceCode[],
      filesWithPreliminaryResult:
          Map<Workspace.UISourceCode.UISourceCode, TextUtils.ContentProvider.SearchMatch[]|null>): void {
    if (searchId !== this.searchId && this.searchFinishedCallback) {
      this.searchFinishedCallback(false);
      return;
    }

    let files = [...filesWithPreliminaryResult.keys()];
    files.sort(SourcesSearchScope.urlComparator);
    files = Platform.ArrayUtilities.intersectOrdered(files, filesMatchingFileQuery, SourcesSearchScope.urlComparator);
    const dirtyFiles = this.projectFilesMatchingFileQuery(project, searchConfig, true);
    files = Platform.ArrayUtilities.mergeOrdered(files, dirtyFiles, SourcesSearchScope.urlComparator);

    const uiSourceCodes = [];
    for (const uiSourceCode of files) {
      const script = Bindings.DefaultScriptMapping.DefaultScriptMapping.scriptForUISourceCode(uiSourceCode);
      if (script && !script.isAnonymousScript()) {
        continue;
      }
      uiSourceCodes.push(uiSourceCode);
    }
    uiSourceCodes.sort(SourcesSearchScope.filesComparator);
    this.searchResultCandidates = Platform.ArrayUtilities.mergeOrdered(
        this.searchResultCandidates, uiSourceCodes, SourcesSearchScope.filesComparator);
  }

  private processMatchingFiles(searchId: number, progress: Common.Progress.Progress, callback: () => void): void {
    if (searchId !== this.searchId && this.searchFinishedCallback) {
      this.searchFinishedCallback(false);
      return;
    }

    const files = this.searchResultCandidates;
    if (!files.length) {
      progress.done();
      callback();
      return;
    }

    progress.setTotalWork(files.length);

    let fileIndex = 0;
    const maxFileContentRequests = 20;
    let callbacksLeft = 0;

    for (let i = 0; i < maxFileContentRequests && i < files.length; ++i) {
      scheduleSearchInNextFileOrFinish.call(this);
    }

    function searchInNextFile(this: SourcesSearchScope, uiSourceCode: Workspace.UISourceCode.UISourceCode): void {
      if (uiSourceCode.isDirty()) {
        contentLoaded.call(this, uiSourceCode, new TextUtils.Text.Text(uiSourceCode.workingCopy()));
      } else {
        void uiSourceCode.requestContentData().then(contentData => {
          contentLoaded.call(
              this, uiSourceCode, TextUtils.ContentData.ContentData.contentDataOrEmpty(contentData).textObj);
        });
      }
    }

    function scheduleSearchInNextFileOrFinish(this: SourcesSearchScope): void {
      if (fileIndex >= files.length) {
        if (!callbacksLeft) {
          progress.done();
          callback();
          return;
        }
        return;
      }

      ++callbacksLeft;
      const uiSourceCode = files[fileIndex++];
      window.setTimeout(searchInNextFile.bind(this, uiSourceCode), 0);
    }

    function contentLoaded(
        this: SourcesSearchScope, uiSourceCode: Workspace.UISourceCode.UISourceCode,
        content: TextUtils.Text.Text): void {
      progress.incrementWorked(1);
      let matches: TextUtils.ContentProvider.SearchMatch[] = [];
      const searchConfig = (this.searchConfig as Workspace.SearchConfig.SearchConfig);
      const queries = searchConfig.queries();
      if (content !== null) {
        for (let i = 0; i < queries.length; ++i) {
          const nextMatches = TextUtils.TextUtils.performSearchInContent(
              content, queries[i], !searchConfig.ignoreCase(), searchConfig.isRegex());
          matches = Platform.ArrayUtilities.mergeOrdered(
              matches, nextMatches, TextUtils.ContentProvider.SearchMatch.comparator);
        }
        if (!searchConfig.queries().length) {
          matches = [new TextUtils.ContentProvider.SearchMatch(0, content.lineAt(0), 0, 0)];
        }
      }
      if (matches && this.searchResultCallback) {
        const searchResult = new FileBasedSearchResult(uiSourceCode, matches);
        this.searchResultCallback(searchResult);
      }

      --callbacksLeft;
      scheduleSearchInNextFileOrFinish.call(this);
    }
  }

  stopSearch(): void {
    ++this.searchId;
  }
}

export class FileBasedSearchResult implements Search.SearchScope.SearchResult {
  private readonly uiSourceCode: Workspace.UISourceCode.UISourceCode;
  private readonly searchMatches: TextUtils.ContentProvider.SearchMatch[];
  constructor(
      uiSourceCode: Workspace.UISourceCode.UISourceCode, searchMatches: TextUtils.ContentProvider.SearchMatch[]) {
    this.uiSourceCode = uiSourceCode;
    this.searchMatches = searchMatches;
  }

  label(): string {
    return this.uiSourceCode.displayName();
  }

  description(): string {
    return this.uiSourceCode.fullDisplayName();
  }

  matchesCount(): number {
    return this.searchMatches.length;
  }

  matchLineContent(index: number): string {
    return this.searchMatches[index].lineContent;
  }

  matchRevealable(index: number): Object {
    const {lineNumber, columnNumber, matchLength} = this.searchMatches[index];
    const range = new TextUtils.TextRange.TextRange(lineNumber, columnNumber, lineNumber, columnNumber + matchLength);
    return new Workspace.UISourceCode.UILocationRange(this.uiSourceCode, range);
  }

  matchLabel(index: number): string {
    return String(this.searchMatches[index].lineNumber + 1);
  }

  matchColumn(index: number): number {
    return this.searchMatches[index].columnNumber;
  }

  matchLength(index: number): number {
    return this.searchMatches[index].matchLength;
  }
}
