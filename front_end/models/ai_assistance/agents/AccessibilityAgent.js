// Copyright 2026 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.
import * as Host from '../../../core/host/host.js';
import * as i18n from '../../../core/i18n/i18n.js';
import * as Root from '../../../core/root/root.js';
import { AiAgent, ConversationContext, } from './AiAgent.js';
/**
 * WARNING: preamble defined in code is only used when userTier is
 * TESTERS. Otherwise, a server-side preamble is used (see
 * chrome_preambles.gcl). Sync local changes with the server-side.
 */
const preamble = `You are an accessibility agent.

# Considerations
* Keep your analysis concise and focused, highlighting only the most critical aspects for a software engineer.
* Answer questions directly, using the provided links whenever relevant.
* Always double-check links to make sure they are complete and correct.
* **CRITICAL** You are an accessibility agent. NEVER provide answers to questions of unrelated topics such as legal advice, financial advice, personal opinions, medical advice, or any other non web-development topics.
`;
/*
* Strings that don't need to be translated at this time.
*/
const UIStringsNotTranslate = {
    /**
     * @description Title for thinking step of the accessibility agent.
     */
    inspectingAudits: 'Inspecting audits',
};
const lockedString = i18n.i18n.lockedString;
export class Context extends ConversationContext {
    #lh;
    constructor(report) {
        super();
        this.#lh = report;
    }
    #url() {
        return this.#lh.finalUrl ?? this.#lh.finalDisplayedUrl;
    }
    getOrigin() {
        return new URL(this.#url()).origin;
    }
    getItem() {
        return this.#lh;
    }
    getTitle() {
        return `Lighthouse report: ${this.#url()}`;
    }
}
/**
 * One agent instance handles one conversation. Create a new agent
 * instance for a new conversation.
 */
export class AccessibilityAgent extends AiAgent {
    preamble = preamble;
    clientFeature = Host.AidaClient.ClientFeature.CHROME_ACCESSIBILITY_AGENT;
    get userTier() {
        // TODO(b/491772868): tidy up userTier & feature flags in the backend.
        return Root.Runtime.hostConfig.devToolsFreestyler?.userTier;
    }
    get options() {
        // TODO(b/491772868): tidy up userTier & feature flags in the backend.
        const temperature = Root.Runtime.hostConfig.devToolsAiAssistanceFileAgent?.temperature;
        const modelId = Root.Runtime.hostConfig.devToolsAiAssistanceFileAgent?.modelId;
        return {
            temperature,
            modelId,
        };
    }
    async *handleContextDetails(selectedFile) {
        if (!selectedFile) {
            return;
        }
        yield {
            type: "context" /* ResponseType.CONTEXT */,
            title: lockedString(UIStringsNotTranslate.inspectingAudits),
            details: createContextDetails(selectedFile),
        };
    }
    async enhanceQuery(query, lhr) {
        const enhancedQuery = lhr ?
            // TODO: formatter for LH report.
            `# Lighthouse Report\n${JSON.stringify(lhr.getItem(), null, 2)}\n\n# User request\n\n` :
            '';
        return `${enhancedQuery}${query}`;
    }
}
function createContextDetails(_lhr) {
    return [
        {
            title: 'Lighthouse report',
            // TODO(b/491772868);
            text: ''
        },
    ];
}
//# sourceMappingURL=AccessibilityAgent.js.map