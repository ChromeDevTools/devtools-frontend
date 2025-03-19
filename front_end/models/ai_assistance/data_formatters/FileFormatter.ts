// Copyright 2025 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as Bindings from '../../bindings/bindings.js';
import type * as Workspace from '../../workspace/workspace.js';

import {NetworkRequestFormatter} from './NetworkRequestFormatter.js';

const MAX_FILE_SIZE = 10000;

/**
 * File that formats a file for the LLM usage.
 */
export class FileFormatter {
  static formatSourceMapDetails(
      selectedFile: Workspace.UISourceCode.UISourceCode,
      debuggerWorkspaceBinding: Bindings.DebuggerWorkspaceBinding.DebuggerWorkspaceBinding): string {
    const mappedFileUrls = [];
    const sourceMapUrls = [];
    if (selectedFile.contentType().isFromSourceMap()) {
      for (const script of debuggerWorkspaceBinding.scriptsForUISourceCode(selectedFile)) {
        const uiSourceCode = debuggerWorkspaceBinding.uiSourceCodeForScript(script);
        if (uiSourceCode) {
          mappedFileUrls.push(uiSourceCode.url());
          if (script.sourceMapURL !== undefined) {
            sourceMapUrls.push(script.sourceMapURL);
          }
        }
      }
      for (const originURL of Bindings.SASSSourceMapping.SASSSourceMapping.uiSourceOrigin(selectedFile)) {
        mappedFileUrls.push(originURL);
      }
    } else if (selectedFile.contentType().isScript()) {
      for (const script of debuggerWorkspaceBinding.scriptsForUISourceCode(selectedFile)) {
        if (script.sourceMapURL !== undefined && script.sourceMapURL !== '') {
          sourceMapUrls.push(script.sourceMapURL);
        }
      }
    }
    if (sourceMapUrls.length === 0) {
      return '';
    }
    let sourceMapDetails = 'Source map: ' + sourceMapUrls;
    if (mappedFileUrls.length > 0) {
      sourceMapDetails += '\nSource mapped from: ' + mappedFileUrls;
    }
    return sourceMapDetails;
  }

  #file: Workspace.UISourceCode.UISourceCode;
  constructor(file: Workspace.UISourceCode.UISourceCode) {
    this.#file = file;
  }
  formatFile(): string {
    const debuggerWorkspaceBinding = Bindings.DebuggerWorkspaceBinding.DebuggerWorkspaceBinding.instance();
    const sourceMapDetails = FileFormatter.formatSourceMapDetails(this.#file, debuggerWorkspaceBinding);
    const lines = [
      `File name: ${this.#file.displayName()}`,
      `URL: ${this.#file.url()}`,
      sourceMapDetails,
    ];
    const resource = Bindings.ResourceUtils.resourceForURL(this.#file.url());
    if (resource?.request) {
      lines.push(`Request initiator chain:
${new NetworkRequestFormatter(resource.request).formatRequestInitiatorChain()}`);
    }
    lines.push(`File content:
${this.#formatFileContent()}`);
    return lines.filter(line => line.trim() !== '').join('\n');
  }

  #formatFileContent(): string {
    const contentData = this.#file.workingCopyContentData();
    const content = contentData.isTextContent ? contentData.text : '<binary data>';
    const truncated = content.length > MAX_FILE_SIZE ? content.slice(0, MAX_FILE_SIZE) + '...' : content;
    return `\`\`\`
${truncated}
\`\`\``;
  }
}
