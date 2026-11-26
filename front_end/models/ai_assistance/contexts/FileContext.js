// Copyright 2026 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.
import { ConversationContext } from '../agents/AiAgent.js';
import { FileFormatter } from '../data_formatters/FileFormatter.js';
import { ListSourcesTool } from '../tools/ListSources.js';
export class FileContext extends ConversationContext {
    jslogContext = 'ai-context-file';
    #file;
    #debuggerWorkspaceBinding;
    constructor(file, debuggerWorkspaceBinding) {
        super();
        this.#file = file;
        this.#debuggerWorkspaceBinding = debuggerWorkspaceBinding;
    }
    /**
     * Returns the security origin of the workspace file.
     */
    getOrigin() {
        return this.#file.securityOrigin();
    }
    getItem() {
        return this.#file;
    }
    getTitle() {
        return this.#file.displayName();
    }
    /**
     * Registers the selected file and includes its `File ID` so the model can page
     * truncated content with `getSourceContent` and match `listSources` rows without
     * an extra `listSources` call.
     */
    async getPromptDetails() {
        const fileId = ListSourcesTool.registerSource(this.#file);
        const header = fileId !== null ? `# Selected file\nFile ID: ${fileId}` : '# Selected file';
        return `${header}\n${new FileFormatter(this.#file, this.#debuggerWorkspaceBinding).formatFile()}`;
    }
    async getUserFacingDetails() {
        return [
            {
                title: 'Selected file',
                text: new FileFormatter(this.#file, this.#debuggerWorkspaceBinding).formatFile(),
            },
        ];
    }
    async refresh() {
        await this.#file.requestContentData();
    }
}
//# sourceMappingURL=FileContext.js.map