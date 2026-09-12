// Copyright 2026 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.
import * as SDK from '../../../core/sdk/sdk.js';
import { ConversationContext, } from '../agents/AiAgent.js';
import { LighthouseFormatter } from '../data_formatters/LighthouseFormatter.js';
export class AccessibilityContext extends ConversationContext {
    jslogContext = 'ai-context-accessibility';
    #lh;
    #cachedPayload = null;
    constructor(report) {
        super();
        this.#lh = report;
    }
    #url() {
        return this.#lh.finalUrl ?? this.#lh.finalDisplayedUrl;
    }
    /**
     * Returns the security origin of the audited page from the Lighthouse report.
     *
     * Derives the origin from the report URL (`finalUrl` or `finalDisplayedUrl`).
     * If the report does not contain a valid URL, returns a unique opaque origin.
     *
     * @returns The security origin of the audited page.
     */
    getOrigin() {
        return SDK.SecurityOrigin.SecurityOrigin.create(this.#url());
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
    async getWidgets() {
        return [
            {
                name: 'LIGHTHOUSE_REPORT',
                data: {
                    report: this.#lh,
                },
            },
        ];
    }
}
//# sourceMappingURL=AccessibilityContext.js.map