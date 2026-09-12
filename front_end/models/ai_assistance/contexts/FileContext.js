// Copyright 2026 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.
import * as SDK from '../../../core/sdk/sdk.js';
import { ConversationContext } from '../agents/AiAgent.js';
import { FileFormatter } from '../data_formatters/FileFormatter.js';
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
     * Resolves the security origin of a given UISourceCode.
     * Prefers the project security origin, falling back to the origin of the file URL.
     */
    static originForUISourceCode(file) {
        return file.project()?.securityOrigin?.() ?? SDK.SecurityOrigin.SecurityOrigin.create(file.url());
    }
    /**
     * Returns the security origin of the project containing the file, falling
     * back to the origin derived from the file URL.
     */
    getOrigin() {
        return FileContext.originForUISourceCode(this.#file);
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