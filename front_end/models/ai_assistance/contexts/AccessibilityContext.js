// Copyright 2026 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.
import { ConversationContext } from '../agents/AiAgent.js';
import { LighthouseFormatter } from '../data_formatters/LighthouseFormatter.js';
export class AccessibilityContext extends ConversationContext {
    #lh;
    #cachedPayload = null;
    constructor(report) {
        super();
        this.#lh = report;
    }
    #url() {
        return this.#lh.finalUrl ?? this.#lh.finalDisplayedUrl;
    }
    getURL() {
        return this.#url();
    }
    getItem() {
        return this.#lh;
    }
    getTitle() {
        return `Lighthouse report: ${this.#url()}`;
    }
    #getInitialPayload() {
        if (this.#cachedPayload !== null) {
            return this.#cachedPayload;
        }
        const formatter = new LighthouseFormatter();
        const summary = formatter.summary(this.#lh);
        const audits = formatter.audits(this.#lh, 'accessibility');
        const allFailed = Object.values(this.#lh.categories).every(category => category.score === null);
        if (allFailed) {
            this.#cachedPayload =
                '**CRITICAL**: The Lighthouse report failed to record or all category scores are error/unavailable (n/a). This indicates a failed run or missing data.';
        }
        else {
            this.#cachedPayload = `# Lighthouse Report:\n${summary}\n${audits}`;
        }
        return this.#cachedPayload;
    }
    async getPromptDetails() {
        return this.#getInitialPayload();
    }
    async getUserFacingDetails() {
        return [
            {
                title: 'Lighthouse report',
                text: this.#getInitialPayload(),
            },
        ];
    }
}
//# sourceMappingURL=AccessibilityContext.js.map