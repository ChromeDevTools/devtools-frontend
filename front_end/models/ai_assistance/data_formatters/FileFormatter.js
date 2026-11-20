// Copyright 2025 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.
import * as Bindings from '../../bindings/bindings.js';
const MAX_FILE_SIZE = 5_000;
/**
 * File that formats a file for the LLM usage.
 */
export class FileFormatter {
    static formatSourceMapDetails(selectedFile, debuggerWorkspaceBinding) {
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
        }
        else if (selectedFile.contentType().isScript()) {
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
    #file;
    #debuggerWorkspaceBinding;
    constructor(file, debuggerWorkspaceBinding = 
    // eslint-disable-next-line @devtools/no-instance-of-migrated-singletons
    Bindings.DebuggerWorkspaceBinding.DebuggerWorkspaceBinding.instance()) {
        this.#file = file;
        this.#debuggerWorkspaceBinding = debuggerWorkspaceBinding;
    }
    formatFile(options = {}) {
        const sourceMapDetails = FileFormatter.formatSourceMapDetails(this.#file, this.#debuggerWorkspaceBinding);
        return [
            `File name: ${this.#file.displayName()}`,
            `URL: ${this.#file.url()}`,
            sourceMapDetails,
            this.#formatFileContent(options.offset ?? 0),
        ].filter(Boolean)
            .join('\n');
    }
    /**
     * Formats the file content section with at most `MAX_FILE_SIZE` characters
     * starting at `offset`. Non-zero offsets label the header with the character
     * range, and truncated parts append a notice with the next part's offset.
     */
    #formatFileContent(offset) {
        const contentData = this.#file.workingCopyContentData();
        const content = contentData.isTextContent ? contentData.text : '<binary data>';
        const end = Math.min(offset + MAX_FILE_SIZE, content.length);
        const header = offset > 0 ? `File content (characters ${offset}-${end} of ${content.length}):` : 'File content:';
        const codeBlock = `${header}
\`\`\`
${content.slice(offset, end)}
\`\`\``;
        if (end === content.length) {
            return codeBlock;
        }
        return `${codeBlock}
Content truncated: showing characters ${offset}-${end} of ${content.length}. The next part starts at offset ${end}.`;
    }
}
//# sourceMappingURL=FileFormatter.js.map