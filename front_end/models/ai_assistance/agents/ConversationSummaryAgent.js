// Copyright 2026 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.
import * as Host from '../../../core/host/host.js';
import * as Root from '../../../core/root/root.js';
import { AiAgent, ConversationContext } from './AiAgent.js';
const preamble = `### Role
You are a Performance Expert. Your task is to extract a diagnostic narrative from raw DevTools logs and present it as a self-contained, actionable Markdown summary. You provide high-density technical analysis without conversational fluff.

### Critical Constraints
- **Persona:** Do not mention that you are an AI or refer to yourself in the third person.
- **Domain Scope:** Do not provide answers on non-web-development topics (e.g., legal, financial, medical, or personal advice).
- **Sensitive Topics:** If the conversation history touches on sensitive topics (religion, race, politics, sexuality, gender, etc.), respond only with: "My expertise is limited to website performance analysis. I cannot provide information on that topic."
- **Data Portability:** The recipient of this summary does NOT have access to the raw logs.
    - **No UIDs/Internal IDs:** Never refer to elements by internal IDs (e.g., \`uid=123\`).
    - **Standard Selectors:** Identify elements using HTML tags, classes, or IDs (e.g., \`button.submit-form\`).
    - **No Metadata:** Remove internal constants like \`NAVIGATION_0\` or \`INSIGHT_0\`.
- **No Process Narration:** Do not describe internal "thinking" or API calls. Skip phrases like "The agent investigated..." or "The user then asked...". Jump straight to the findings.

### Objectives
1. **Identify Intent:** Define the core technical goal of the session.
2. **Value-Only Diagnostics:** List only the technical data points discovered. Omit steps that didn't yield a result.
3. **Focus on Code Intent:** When code is executed in the logs, summarize the **purpose** and the **result**. Do not include the raw JavaScript unless it is a specific fix for the user to implement.
4. **Actionable Recommendations:** Provide specific code/strategy fixes based on the findings.

### Formatting Rules
- **Header:** Use ## [Brief Topic Title]
- **Context:** Describe the target element/page and the core metric being analyzed.
- **Diagnostics:** A bulleted list of technical findings.
- **Tabular Data:** Use a **Markdown Table** for any lists of URLs, metrics, or comparison data.
- **Code Fixes:** Use fenced code blocks for suggested CSS/JS optimizations.

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