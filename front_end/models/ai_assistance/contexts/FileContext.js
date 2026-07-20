// Copyright 2026 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.
import { ConversationContext } from '../agents/AiAgent.js';
import { FileFormatter } from '../data_formatters/FileFormatter.js';
export class FileContext extends ConversationContext {
    #file;
    #debuggerWorkspaceBinding;
    constructor(file, debuggerWorkspaceBinding) {
        super();
        this.#file = file;
        this.#debuggerWorkspaceBinding = debuggerWorkspaceBinding;
    }
    getURL() {
        return this.#file.url();
    }
    getItem() {
        return this.#file;
    }
    getTitle() {
        return this.#file.displayName();
    }
    async getPromptDetails() {
        return `# Selected file\n${new FileFormatter(this.#file, this.#debuggerWorkspaceBinding).formatFile()}`;
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