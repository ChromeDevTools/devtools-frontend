// Copyright 2026 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.
import * as Host from '../../../core/host/host.js';
import * as i18n from '../../../core/i18n/i18n.js';
import * as Root from '../../../core/root/root.js';
import { LighthouseFormatter } from '../data_formatters/LighthouseFormatter.js';
import { debugLog } from '../debug.js';
import { AiAgent, ConversationContext, } from './AiAgent.js';
/**
 * WARNING: preamble defined in code is only used when userTier is
 * TESTERS. Otherwise, a server-side preamble is used (see
 * chrome_preambles.gcl). Sync local changes with the server-side.
 */
const preamble = `You are an accessibility expert agent.

# Goals
* Help users understand and fix accessibility issues found in Lighthouse reports.
* Provide succinct, actionable advice. Avoid long explanations and "walls of text".
* Focus on the most critical information first, prioritizing audits with low scores.

# Capabilities
* You have access to the \`getLighthouseAudits\` function to retrieve detailed audit data for performance, accessibility, best-practices, and SEO.
* Proactively use this function to investigate categories with low scores and help the user focus on the most important areas.

# Constraints
* Keep your analysis concise and focused, highlighting only the most critical aspects for a software engineer.
* **CRITICAL** You are an accessibility agent. NEVER provide answers to questions of unrelated topics such as legal advice, financial advice, personal opinions, medical advice, or any other non web-development topics.
`;
export class AccessibilityContext extends ConversationContext {
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
    async *handleContextDetails(lhr) {
        if (!lhr) {
            return;
        }
        yield {
            type: "context" /* ResponseType.CONTEXT */,
            details: this.#createContextDetails(lhr),
        };
    }
    #declareFunctions() {
        this.declareFunction('getLighthouseAudits', {
            description: 'Returns the audits for a specific Lighthouse category. Use this to get more information about the performance, accessibility, best-practices, or seo audits.',
            parameters: {
                type: 6 /* Host.AidaClient.ParametersTypes.OBJECT */,
                description: '',
                nullable: false,
                properties: {
                    categoryId: {
                        type: 1 /* Host.AidaClient.ParametersTypes.STRING */,
                        description: 'The category of audits to retrieve. Valid values are "performance", "accessibility", "best-practices", "seo".',
                        nullable: false,
                    },
                },
                required: ['categoryId'],
            },
            displayInfoFromArgs: params => {
                return {
                    title: i18n.i18n.lockedString(`Getting Lighthouse audits for ${params.categoryId}…`),
                    action: `getLighthouseAudits('${params.categoryId}')`
                };
            },
            handler: async (params) => {
                debugLog('Function call: getLighthouseAudits', params);
                const report = this.context?.getItem();
                if (!report) {
                    return { error: 'No Lighthouse report available.' };
                }
                const audits = new LighthouseFormatter().audits(report, params.categoryId);
                return { result: { audits } };
            }
        });
    }
    /**
     * This is the initial payload we send at the start of a conversation.
     * Because the agent is focused on Accessibility, we include the
     * Accessibility Audits summary in the payload to avoid an extra round step of
     * the AI querying them.
     */
    #getInitialPayload(context) {
        const report = context.getItem();
        const formatter = new LighthouseFormatter();
        return `# Lighthouse Report:\n${formatter.summary(report)}\n${formatter.audits(report, 'accessibility')}\n`;
    }
    async enhanceQuery(query, lhr) {
        this.clearDeclaredFunctions();
        if (lhr) {
            this.#declareFunctions();
        }
        const enhancedQuery = lhr ? `${this.#getInitialPayload(lhr)}\n# User request:\n\n` : '';
        return `${enhancedQuery}${query}`;
    }
    #createContextDetails(lhr) {
        return [
            { title: 'Lighthouse report', text: this.#getInitialPayload(lhr) },
        ];
    }
}
//# sourceMappingURL=AccessibilityAgent.js.map