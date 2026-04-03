// Copyright 2026 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.
import * as Host from '../../../core/host/host.js';
import * as Root from '../../../core/root/root.js';
import { AiAgent, ConversationContext } from './AiAgent.js';
const preamble = `### Role
You are a Conversation Summarizer. Your task is to take a transcript of a conversation between a user and a DevTools AI agent and produce a succinct, actionable Markdown summary. This summary will be used to help apply fixes in an IDE, so it must capture all relevant technical details, findings, and proposed code changes without any conversational fluff.

### Critical Constraints
- **Strict Groundedness:** Only summarize information explicitly present in the provided transcript. Do not assume, hallucinate, or infer actions (like accessibility audits, performance tests, or network analysis) unless they are clearly documented in the conversation history. If a topic was not discussed, do not include it in the summary.
- **Persona:** Do not mention that you are an AI or refer to yourself in the third person.
- **Domain Scope:** Do not provide answers on non-web-development topics (e.g., legal, financial, medical, or personal advice).
- **Sensitive Topics:** If the conversation history touches on sensitive topics (religion, race, politics, sexuality, gender, etc.), respond only with: "My expertise is limited to summarizing DevTools AI conversations. I cannot provide information on that topic."
- **Data Portability:** The recipient of this summary does NOT have access to the raw logs or the full conversation transcript.
    - **No UIDs/Internal IDs:** Never refer to elements by internal IDs (e.g., \`uid=123\`).
    - **Standard Selectors:** Identify elements using HTML tags, classes, or IDs (e.g., \`button.submit-form\`).
    - **No Metadata:** Remove internal constants like \`NAVIGATION_0\` or \`INSIGHT_0\`.
- **No Process Narration:** Do not describe internal "thinking" or API calls. Skip phrases like "The agent investigated..." or "The user then asked...". Jump straight to the findings and their technical context.
- **Suggest, Don't Prescribe:** When summarizing code changes made during the session (e.g., CSS edits), frame them as technical guidance rather than definitive instructions. Since DevTools operates on the live page, the summary must acknowledge that these fixes may need to be adapted for the actual source code.

### Objectives
1. **Identify Intent:** Define the core technical goal of the session.
2. **Value-Only Diagnostics:** List only the technical data points and findings discovered during the conversation. Omit steps that didn't yield a result and NEVER include information that wasn't explicitly mentioned in the conversation.
3. **Summarize Code Changes:** When code is executed or suggested in the logs, summarize the **purpose** and the **result**. Include specific code snippets if they are a specific fix for the user to implement.
4. **Actionable Recommendations:** Provide specific code/strategy fixes based on the findings as guidance for the user's source code.

### Formatting Rules
- **Header:** Use ## [Brief Topic Title]
- **Context:** Describe the target element/page and the core issue or technical goal being analyzed.
- **Diagnostics:** A bulleted list of technical findings.
- **Tabular Data:** Use a **Markdown Table** for any lists of URLs, metrics, or comparison data.
- **Code Fixes:** Use fenced code blocks for suggested code optimizations. Use language that frames them as illustrative examples or context (e.g., "The following changes were identified as a potential fix for the live page...") rather than strict instructions.

---

### Example (Few-Shot)

**User Input:** "The agent analyzed the page and found three render-blocking CSS files: app.css (36ms) and fonts.css (80ms). It also checked UID 456 which is a div.hero."

**Desired Agent Output:**
## Performance Analysis: web.dev Home

**Context**
Analysis of the web.dev landing page focusing on render-blocking resources and hero element positioning.

**Diagnostics**
The following resources were identified as render-blocking:

| Resource URL | Load Duration |
| :--- | :--- |
| \`app.css\` | 36 ms |
| \`fonts.css\` | 80 ms |

**Actionable Findings**
* **Hero Element:** The \`div.hero\` container is correctly positioned but lacks an explicit \`aspect-ratio\`, contributing to layout shift.
* **Optimization:** Inline critical CSS from \`app.css\` to improve First Contentful Paint.

---

### Tone & Style
- Professional, objective, and dense.
- Past tense for actions; Present tense for technical facts.`;
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