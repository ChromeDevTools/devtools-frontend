// Copyright 2025 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.
import * as Diff from '../../third_party/diff/diff.js';
import * as Persistence from '../persistence/persistence.js';
import * as TextUtils from '../text_utils/text_utils.js';
import { debugLog } from './debug.js';
const LINE_END_RE = /\r\n?|\n/;
const MAX_RESULTS_PER_FILE = 10;
/**
 * AgentProject wraps around a Workspace.Workspace.Project and
 * implements AI Assistance-specific logic for accessing workspace files
 * including additional checks and restrictions.
 */
export class AgentProject {
    #project;
    #ignoredFileOrFolderNames = new Set(['node_modules', 'package-lock.json']);
    #filesChanged = new Set();
    #totalLinesChanged = 0;
    #maxFilesChanged;
    #maxLinesChanged;
    #processedFiles = new Set();
    constructor(project, options = {
        maxFilesChanged: 5,
        maxLinesChanged: 200,
    }) {
        this.#project = project;
        this.#maxFilesChanged = options.maxFilesChanged;
        this.#maxLinesChanged = options.maxLinesChanged;
    }
    /**
     * Returns a list of files from the project that has been used for
     * processing.
     */
    getProcessedFiles() {
        return Array.from(this.#processedFiles);
    }
    /**
     * Provides file names in the project to the agent.
     */
    getFiles() {
        return this.#indexFiles().files;
    }
    /**
     * Provides access to the file content in the working copy
     * of the matching UiSourceCode.
     */
    async readFile(filepath) {
        const { map } = this.#indexFiles();
        const uiSourceCode = map.get(filepath);
        if (!uiSourceCode) {
            return;
        }
        const content = uiSourceCode.isDirty() ? uiSourceCode.workingCopyContentData() : await uiSourceCode.requestContentData();
        this.#processedFiles.add(filepath);
        if (TextUtils.ContentData.ContentData.isError(content) || !content.isTextContent) {
            return;
        }
        return content.text;
    }
    /**
     * This method updates the file content in the working copy of the
     * UiSourceCode identified by the filepath.
     */
    async writeFile(filepath, update, mode = "full" /* ReplaceStrategy.FULL_FILE */) {
        const { map } = this.#indexFiles();
        const uiSourceCode = map.get(filepath);
        if (!uiSourceCode) {
            throw new Error(`UISourceCode ${filepath} not found`);
        }
        const currentContent = await this.readFile(filepath);
        let content;
        switch (mode) {
            case "full" /* ReplaceStrategy.FULL_FILE */:
                content = update;
                break;
            case "unified" /* ReplaceStrategy.UNIFIED_DIFF */:
                content = this.#writeWithUnifiedDiff(update, currentContent);
                break;
        }
        const linesChanged = this.getLinesChanged(currentContent, content);
        if (this.#totalLinesChanged + linesChanged > this.#maxLinesChanged) {
            throw new Error('Too many lines changed');
        }
        this.#filesChanged.add(filepath);
        if (this.#filesChanged.size > this.#maxFilesChanged) {
            this.#filesChanged.delete(filepath);
            throw new Error('Too many files changed');
        }
        this.#totalLinesChanged += linesChanged;
        uiSourceCode.setWorkingCopy(content);
        uiSourceCode.setContainsAiChanges(true);
    }
    #writeWithUnifiedDiff(llmDiff, content = '') {
        let updatedContent = content;
        const diffChunk = llmDiff.trim();
        const normalizedDiffLines = diffChunk.split(LINE_END_RE);
        const lineAfterSeparatorRegEx = /^@@.*@@([- +].*)/;
        const changeChunk = [];
        let currentChunk = [];
        for (const line of normalizedDiffLines) {
            if (line.startsWith('```')) {
                continue;
            }
            // The ending is not always @@
            if (line.startsWith('@@')) {
                line.search('@@');
                currentChunk = [];
                changeChunk.push(currentChunk);
                if (!line.endsWith('@@')) {
                    const match = line.match(lineAfterSeparatorRegEx);
                    if (match?.[1]) {
                        currentChunk.push(match[1]);
                    }
                }
            }
            else {
                currentChunk.push(line);
            }
        }
        for (const chunk of changeChunk) {
            const search = [];
            const replace = [];
            for (const changeLine of chunk) {
                // Unified diff first char is ' ', '-', '+'
                // to represent what happened to the line
                const line = changeLine.slice(1);
                if (changeLine.startsWith('-')) {
                    search.push(line);
                }
                else if (changeLine.startsWith('+')) {
                    replace.push(line);
                }
                else {
                    search.push(line);
                    replace.push(line);
                }
            }
            if (replace.length === 0) {
                const searchString = search.join('\n');
                // If we remove we want to
                if (updatedContent.search(searchString + '\n') !== -1) {
                    updatedContent = updatedContent.replace(searchString + '\n', '');
                }
                else {
                    updatedContent = updatedContent.replace(searchString, '');
                }
            }
            else if (search.length === 0) {
                // This just adds it to the beginning of the file
                updatedContent = updatedContent.replace('', replace.join('\n'));
            }
            else {
                updatedContent = updatedContent.replace(search.join('\n'), replace.join('\n'));
            }
        }
        return updatedContent;
    }
    getLinesChanged(currentContent, updatedContent) {
        let linesChanged = 0;
        if (currentContent) {
            const diff = Diff.Diff.DiffWrapper.lineDiff(updatedContent.split(LINE_END_RE), currentContent.split(LINE_END_RE));
            for (const item of diff) {
                if (item[0] !== Diff.Diff.Operation.Equal) {
                    linesChanged++;
                }
            }
        }
        else {
            linesChanged += updatedContent.split(LINE_END_RE).length;
        }
        return linesChanged;
    }
    /**
     * This method searches in files for the agent and provides the
     * matches to the agent.
     */
    async searchFiles(query, caseSensitive, isRegex, { signal } = {}) {
        const { map } = this.#indexFiles();
        const matches = [];
        for (const [filepath, file] of map.entries()) {
            if (signal?.aborted) {
                break;
            }
            debugLog('searching in', filepath, 'for', query);
            const content = file.isDirty() ? file.workingCopyContentData() : await file.requestContentData();
            const results = TextUtils.TextUtils.performSearchInContentData(content, query, caseSensitive ?? true, isRegex ?? false);
            for (const result of results.slice(0, MAX_RESULTS_PER_FILE)) {
                debugLog('matches in', filepath);
                matches.push({
                    filepath,
                    lineNumber: result.lineNumber,
                    columnNumber: result.columnNumber,
                    matchLength: result.matchLength
                });
            }
        }
        return matches;
    }
    #shouldSkipPath(pathParts) {
        for (const part of pathParts) {
            if (this.#ignoredFileOrFolderNames.has(part) || part.startsWith('.')) {
                return true;
            }
        }
        return false;
    }
    #indexFiles() {
        const files = [];
        const map = new Map();
        // TODO: this could be optimized and cached.
        for (const uiSourceCode of this.#project.uiSourceCodes()) {
            const pathParts = Persistence.FileSystemWorkspaceBinding.FileSystemWorkspaceBinding.relativePath(uiSourceCode);
            if (this.#shouldSkipPath(pathParts)) {
                continue;
            }
            const path = pathParts.join('/');
            files.push(path);
            map.set(path, uiSourceCode);
        }
        return { files, map };
    }
}
//# sourceMappingURL=AgentProject.js.map