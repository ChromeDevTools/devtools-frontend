// Copyright 2025 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as TextUtils from '../../models/text_utils/text_utils.js';
import type * as Workspace from '../../models/workspace/workspace.js';

import {debugLog} from './debug.js';

/**
 * AgentProject wraps around a Workspace.Workspace.Project and
 * implements AI Assistance-specific logic for accessing workspace files
 * including additional checks and restrictions.
 */
export class AgentProject {
  #project: Workspace.Workspace.Project;

  constructor(project: Workspace.Workspace.Project) {
    this.#project = project;
  }

  #indexFiles(): {files: string[], map: Map<string, Workspace.UISourceCode.UISourceCode>} {
    const files = [];
    const map = new Map();
    for (const uiSourceCode of this.#project.uiSourceCodes()) {
      // fullDisplayName includes the project name. TODO: a better
      // getter for a relative file path is needed.
      let path = uiSourceCode.fullDisplayName();
      const idx = path.indexOf('/');
      if (idx !== -1) {
        path = path.substring(idx + 1);
      }
      files.push(path);
      map.set(path, uiSourceCode);
    }
    return {files, map};
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
    // TODO: needs additional handling for binary files.
    return uiSourceCode.workingCopyContentData().text;
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
    uiSourceCode.setWorkingCopy(content);
  }

  /**
   * This method searches in files for the agent and provides the
   * matches to the agent.
   */
  async searchFiles(query: string, caseSensitive?: boolean, isRegex?: boolean): Promise<Array<{
    filepath: string,
    lineNumber: number,
    columnNumber: number,
    matchLength: number,
  }>> {
    const {map} = this.#indexFiles();
    const matches = [];
    for (const [filepath, file] of map.entries()) {
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
}
