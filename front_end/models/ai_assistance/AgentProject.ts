// Copyright 2025 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as Common from '../../core/common/common.js';
import * as Diff from '../../third_party/diff/diff.js';
import * as TextUtils from '../text_utils/text_utils.js';
import * as Workspace from '../workspace/workspace.js';

import {debugLog} from './debug.js';

/**
 * AgentProject wraps around a Workspace.Workspace.Project and
 * implements AI Assistance-specific logic for accessing workspace files
 * including additional checks and restrictions.
 */
export class AgentProject {
  #projects: Workspace.Workspace.Project[];
  #ignoredFileNames = new Set(['inspector-stylesheet']);
  #filesChanged = new Set<string>();
  #linesChanged = 0;

  readonly #maxFilesChanged: number;
  readonly #maxLinesChanged: number;
  readonly #processedFiles = new Set<string>();

  constructor(options: {
    maxFilesChanged: number,
    maxLinesChanged: number,
  } = {
    maxFilesChanged: 5,
    maxLinesChanged: 200,
  }) {
    this.#projects =
        Workspace.Workspace.WorkspaceImpl.instance().projectsForType(Workspace.Workspace.projectTypes.Network);
    this.#maxFilesChanged = options.maxFilesChanged;
    this.#maxLinesChanged = options.maxLinesChanged;
  }

  /**
   * Returns a list of files from the project that has been used for
   * processing.
   */
  getProcessedFiles(): string[] {
    return Array.from(this.#processedFiles);
  }

  /**
   * Provides file names in the project to the agent.
   */
  getFiles(): string[] {
    return this.#indexFiles().files;
  }

  /**
   * Provides access to the file content in the working copy
   * of the matching UiSourceCode.
   */
  readFile(filepath: string): string|undefined {
    const {map} = this.#indexFiles();
    const uiSourceCode = map.get(filepath);
    if (!uiSourceCode) {
      return;
    }
    this.#processedFiles.add(filepath);
    // TODO: needs additional handling for binary files.
    const content = uiSourceCode.workingCopyContentData();
    if (!content.isTextContent) {
      return;
    }

    return content.text;
  }

  /**
   * This method updates the file content in the working copy of the
   * UiSourceCode identified by the filepath.
   */
  writeFile(filepath: string, content: string): void {
    const {map} = this.#indexFiles();
    const uiSourceCode = map.get(filepath);
    if (!uiSourceCode) {
      throw new Error(`UISourceCode ${filepath} not found`);
    }
    const currentContent = this.readFile(filepath);
    const lineEndRe = /\r\n?|\n/;
    let linesChanged = 0;
    if (currentContent) {
      const diff = Diff.Diff.DiffWrapper.lineDiff(currentContent.split(lineEndRe), content.split(lineEndRe));
      for (const item of diff) {
        if (item[0] !== Diff.Diff.Operation.Equal) {
          linesChanged++;
        }
      }
    } else {
      linesChanged += content.split(lineEndRe).length;
    }

    if (this.#linesChanged + linesChanged > this.#maxLinesChanged) {
      throw new Error('Too many lines changed');
    }

    this.#filesChanged.add(filepath);
    if (this.#filesChanged.size > this.#maxFilesChanged) {
      this.#filesChanged.delete(filepath);
      throw new Error('Too many files changed');
    }
    this.#linesChanged += linesChanged;
    uiSourceCode.setWorkingCopy(content);
    uiSourceCode.setContainsAiChanges(true);
  }

  /**
   * This method searches in files for the agent and provides the
   * matches to the agent.
   */
  async searchFiles(query: string, caseSensitive?: boolean, isRegex?: boolean, {signal}: {signal?: AbortSignal} = {}):
      Promise<Array<{
        filepath: string,
        lineNumber: number,
        columnNumber: number,
        matchLength: number,
      }>> {
    const {map} = this.#indexFiles();
    const matches = [];
    for (const [filepath, file] of map.entries()) {
      if (signal?.aborted) {
        break;
      }

      await file.requestContentData();
      debugLog('searching in', filepath, 'for', query);
      const content = file.isDirty() ? file.workingCopyContentData() : await file.requestContentData();
      const results =
          TextUtils.TextUtils.performSearchInContentData(content, query, caseSensitive ?? true, isRegex ?? false);
      for (const result of results) {
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

  #indexFiles(): {files: string[], map: Map<string, Workspace.UISourceCode.UISourceCode>} {
    const map = new Map();
    // TODO: this could be optimized and cached.
    for (const project of this.#projects) {
      for (const uiSourceCode of project.uiSourceCodes()) {
        const {path} = new Common.ParsedURL.ParsedURL(uiSourceCode.url());
        if (this.#ignoredFileNames.has(uiSourceCode.name())) {
          continue;
        }
        // TODO: There can be multiple files in the same path. Make sure
        // we choose one winner here for that case.
        map.set(path, uiSourceCode);
      }
    }
    return {files: Array.from(map.keys()), map};
  }
}
