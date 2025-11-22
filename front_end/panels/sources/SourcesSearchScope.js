// Copyright 2011 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.
import * as Common from '../../core/common/common.js';
import * as Platform from '../../core/platform/platform.js';
import * as Bindings from '../../models/bindings/bindings.js';
import * as Persistence from '../../models/persistence/persistence.js';
import * as TextUtils from '../../models/text_utils/text_utils.js';
import * as Workspace from '../../models/workspace/workspace.js';
export class SourcesSearchScope {
    searchId;
    searchResultCandidates;
    searchResultCallback;
    searchFinishedCallback;
    searchConfig;
    constructor() {
        // FIXME: Add title once it is used by search controller.
        this.searchId = 0;
        this.searchResultCandidates = [];
        this.searchResultCallback = null;
        this.searchFinishedCallback = null;
        this.searchConfig = null;
    }
    static filesComparator(uiSourceCode1, uiSourceCode2) {
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
        return Platform.StringUtilities.naturalOrderComparator(uiSourceCode1.fullDisplayName(), uiSourceCode2.fullDisplayName());
    }
    static urlComparator(uiSourceCode1, uiSourceCode2) {
        return Platform.StringUtilities.naturalOrderComparator(uiSourceCode1.url(), uiSourceCode2.url());
    }
    performIndexing(progress) {
        this.stopSearch();
        const projects = this.projects();
        const compositeProgress = new Common.Progress.CompositeProgress(progress);
        for (let i = 0; i < projects.length; ++i) {
            const project = projects[i];
            const projectProgress = compositeProgress.createSubProgress([...project.uiSourceCodes()].length);
            project.indexContent(projectProgress);
        }
    }
    projects() {
        const searchInAnonymousAndContentScripts = Common.Settings.Settings.instance().moduleSetting('search-in-anonymous-and-content-scripts').get();
        const localOverridesEnabled = Common.Settings.Settings.instance().moduleSetting('persistence-network-overrides-enabled').get();
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
            if (!localOverridesEnabled && project.type() === Workspace.Workspace.projectTypes.FileSystem) {
                return false;
            }
            return true;
        });
    }
    performSearch(searchConfig, progress, searchResultCallback, searchFinishedCallback) {
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
            const promise = project
                .findFilesMatchingSearchRequest(searchConfig, filesMatchingFileQuery, findMatchingFilesInProjectProgress)
                .then(this.processMatchingFilesForProject.bind(this, this.searchId, project, searchConfig, filesMatchingFileQuery));
            promises.push(promise);
        }
        void Promise.all(promises).then(this.processMatchingFiles.bind(this, this.searchId, searchContentProgress, this.searchFinishedCallback.bind(this, true)));
    }
    projectFilesMatchingFileQuery(project, searchConfig, dirtyOnly) {
        const result = [];
        for (const uiSourceCode of project.uiSourceCodes()) {
            if (!uiSourceCode.contentType().isTextType()) {
                continue;
            }
            if (Workspace.IgnoreListManager.IgnoreListManager.instance().isUserOrSourceMapIgnoreListedUISourceCode(uiSourceCode)) {
                continue;
            }
            const binding = Persistence.Persistence.PersistenceImpl.instance().binding(uiSourceCode);
            if (binding?.network === uiSourceCode) {
                continue;
            }
            if (dirtyOnly && !uiSourceCode.isDirty()) {
                continue;
            }
            if (searchConfig.filePathMatchesFileQuery(uiSourceCode.fullDisplayName())) {
                result.push(uiSourceCode);
            }
        }
        result.sort(SourcesSearchScope.urlComparator);
        return result;
    }
    processMatchingFilesForProject(searchId, project, searchConfig, filesMatchingFileQuery, filesWithPreliminaryResult) {
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
        this.searchResultCandidates = Platform.ArrayUtilities.mergeOrdered(this.searchResultCandidates, uiSourceCodes, SourcesSearchScope.filesComparator);
    }
    processMatchingFiles(searchId, progress, callback) {
        if (searchId !== this.searchId && this.searchFinishedCallback) {
            this.searchFinishedCallback(false);
            return;
        }
        const files = this.searchResultCandidates;
        if (!files.length) {
            progress.done = true;
            callback();
            return;
        }
        progress.totalWork = files.length;
        let fileIndex = 0;
        const maxFileContentRequests = 20;
        let callbacksLeft = 0;
        for (let i = 0; i < maxFileContentRequests && i < files.length; ++i) {
            scheduleSearchInNextFileOrFinish.call(this);
        }
        function searchInNextFile(uiSourceCode) {
            if (uiSourceCode.isDirty()) {
                contentLoaded.call(this, uiSourceCode, new TextUtils.Text.Text(uiSourceCode.workingCopy()));
            }
            else {
                void uiSourceCode.requestContentData().then(contentData => {
                    contentLoaded.call(this, uiSourceCode, TextUtils.ContentData.ContentData.contentDataOrEmpty(contentData).textObj);
                });
            }
        }
        function scheduleSearchInNextFileOrFinish() {
            if (fileIndex >= files.length) {
                if (!callbacksLeft) {
                    progress.done = true;
                    callback();
                    return;
                }
                return;
            }
            ++callbacksLeft;
            const uiSourceCode = files[fileIndex++];
            window.setTimeout(searchInNextFile.bind(this, uiSourceCode), 0);
        }
        function contentLoaded(uiSourceCode, content) {
            ++progress.worked;
            let matches = [];
            const searchConfig = this.searchConfig;
            const queries = searchConfig.queries();
            if (content !== null) {
                for (let i = 0; i < queries.length; ++i) {
                    const nextMatches = TextUtils.TextUtils.performSearchInContent(content, queries[i], !searchConfig.ignoreCase(), searchConfig.isRegex());
                    matches = Platform.ArrayUtilities.mergeOrdered(matches, nextMatches, TextUtils.ContentProvider.SearchMatch.comparator);
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
    stopSearch() {
        ++this.searchId;
    }
}
export class FileBasedSearchResult {
    uiSourceCode;
    searchMatches;
    constructor(uiSourceCode, searchMatches) {
        this.uiSourceCode = uiSourceCode;
        this.searchMatches = searchMatches;
    }
    label() {
        return this.uiSourceCode.displayName();
    }
    description() {
        return this.uiSourceCode.fullDisplayName();
    }
    matchesCount() {
        return this.searchMatches.length;
    }
    matchLineContent(index) {
        return this.searchMatches[index].lineContent;
    }
    matchRevealable(index) {
        const { lineNumber, columnNumber, matchLength } = this.searchMatches[index];
        const range = new TextUtils.TextRange.TextRange(lineNumber, columnNumber, lineNumber, columnNumber + matchLength);
        return new Workspace.UISourceCode.UILocationRange(this.uiSourceCode, range);
    }
    matchLabel(index) {
        return String(this.searchMatches[index].lineNumber + 1);
    }
    matchColumn(index) {
        return this.searchMatches[index].columnNumber;
    }
    matchLength(index) {
        return this.searchMatches[index].matchLength;
    }
}
//# sourceMappingURL=SourcesSearchScope.js.map