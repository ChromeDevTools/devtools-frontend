// Copyright 2026 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.
import * as Host from '../../../core/host/host.js';
import * as Root from '../../../core/root/root.js';
import { AiAgent, ConversationContext } from './AiAgent.js';
const preamble = `You are an expert technical assistant specializing in summarizing debugging conversations from Chrome DevTools.
You will receive a markdown-formatted transcript of a conversation between a user and a DevTools AI assistant.
Your goal is to produce a succinct, structured summary that a local AI agent in the user's IDE can use to apply code fixes.

Focus on extracting:
1. **Core Issue:** The primary problem or question the user was investigating.
2. **Diagnostic Findings:** Key technical details discovered (e.g., specific functions, bottlenecks, error messages, URLs, or CSS properties).
3. **Proposed Solution:** The specific changes or optimizations recommended by the DevTools assistant.
4. **Actionable Steps:** A clear, step-by-step list of instructions for the IDE agent to implement the fix.

Maintain a professional, technical, and extremely concise tone. Avoid conversational filler or introductory/concluding remarks.
The output must be structured markdown.`;
export class ConversationSummaryContext extends ConversationContext {
    #conversation;
    constructor(conversation) {
        super();
        this.#conversation = conversation;
    }
    getOrigin() {
        return 'devtools://ai-assistance';
    }
    getItem() {
        return this.#conversation;
    }
    getTitle() {
        return 'Conversation';
    }
}
/**
 * An agent that takes a full conversation between a user and an agent in markdown
 * format and produces a succinct summary of the conversation.
 *
 * This summary is designed to be read by a local agent in the user's IDE and it
 * will be used to help apply fixes to the user's local codebase based on the
 * debugging information the devtools agent found.
 *
 * This agent is not intended to be used directly by users in the AI Assistance
 * panel when chatting with DevTools AI.
 */
export class ConversationSummaryAgent extends AiAgent {
    preamble = preamble;
    get clientFeature() {
        return Host.AidaClient.ClientFeature.CHROME_CONVERSATION_SUMMARY_AGENT;
    }
    get userTier() {
        // TODO(b/491772868): tidy up userTier & feature flags in the backend.
        return Root.Runtime.hostConfig.devToolsFreestyler?.userTier;
    }
    get options() {
        // TODO(b/491772868): tidy up userTier & feature flags in the backend.
        const temperature = Root.Runtime.hostConfig.devToolsFreestyler?.temperature;
        const modelId = Root.Runtime.hostConfig.devToolsFreestyler?.modelId;
        return {
            temperature,
            modelId,
        };
    }
    async *handleContextDetails(context) {
        if (!context) {
            return;
        }
        yield {
            type: "context" /* ResponseType.CONTEXT */,
            title: 'Summarizing conversation',
            details: [
                {
                    title: 'Conversation transcript',
                    text: context.getItem(),
                },
            ],
        };
    }
    async enhanceQuery(query, context) {
        const conversation = context ? context.getItem() : query;
        return `Summarize the following conversation:\n\n${conversation}`;
    }
    async summarizeConversation(conversation) {
        const context = new ConversationSummaryContext(conversation);
        const response = await Array.fromAsync(this.run('', { selected: context }));
        const lastResponse = response.at(-1);
        if (lastResponse && lastResponse.type === "answer" /* ResponseType.ANSWER */ && lastResponse.complete === true) {
            return lastResponse.text.trim();
        }
        throw new Error('Failed to summarize conversation');
    }
}
//# sourceMappingURL=ConversationSummaryAgent.js.map