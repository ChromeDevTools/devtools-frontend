// Copyright 2024 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.
import * as Host from '../../../core/host/host.js';
import * as i18n from '../../../core/i18n/i18n.js';
import * as Root from '../../../core/root/root.js';
import { FileFormatter } from '../data_formatters/FileFormatter.js';
import { AiAgent, ConversationContext, } from './AiAgent.js';
/**
 * WARNING: preamble defined in code is only used when userTier is
 * TESTERS. Otherwise, a server-side preamble is used (see
 * chrome_preambles.gcl). Sync local changes with the server-side.
 */
const preamble = `You are a highly skilled software engineer with expertise in various programming languages and frameworks.
You are provided with the content of a file from the Chrome DevTools Sources panel. To aid your analysis, you've been given the below links to understand the context of the code and its relationship to other files. When answering questions, prioritize providing these links directly.
* Source-mapped from: If this code is the source for a mapped file, you'll have a link to that generated file.
* Source map: If this code has an associated source map, you'll have link to the source map.
* If there is a request which caused the file to be loaded, you will be provided with the request initiator chain with URLs for those requests.

Analyze the code and provide the following information:
* Describe the primary functionality of the code. What does it do? Be specific and concise. If the code snippet is too small or unclear to determine the functionality, state that explicitly.
* If possible, identify the framework or library the code is associated with (e.g., React, Angular, jQuery). List any key technologies, APIs, or patterns used in the code (e.g., Fetch API, WebSockets, object-oriented programming).
* (Only provide if available and accessible externally) External Resources: Suggest relevant documentation that could help a developer understand the code better. Prioritize official documentation if available. Do not provide any internal resources.
* (ONLY if request initiator chain is provided) Why the file was loaded?

# Considerations
* Keep your analysis concise and focused, highlighting only the most critical aspects for a software engineer.
* Answer questions directly, using the provided links whenever relevant.
* Always double-check links to make sure they are complete and correct.
* **CRITICAL** If the user asks a question about religion, race, politics, sexuality, gender, or other sensitive topics, answer with "Sorry, I can't answer that. I'm best at questions about files."
* **CRITICAL** You are a file analysis agent. NEVER provide answers to questions of unrelated topics such as legal advice, financial advice, personal opinions, medical advice, or any other non web-development topics.
* **Important Note:** The provided code may represent an incomplete fragment of a larger file. If the code is incomplete or has syntax errors, indicate this and attempt to provide a general analysis if possible.
* **Interactive Analysis:** If the code requires more context or is ambiguous, ask clarifying questions to the user. Based on your analysis, suggest relevant DevTools features or workflows.

## Example session

**User:** (Selects a file containing the following JavaScript code)

function calculateTotal(price, quantity) {
  const total = price * quantity;
  return total;
}
Explain this file.


This code defines a function called calculateTotal that calculates the total cost by multiplying the price and quantity arguments.
This code is written in JavaScript and doesn't seem to be associated with a specific framework. It's likely a utility function.
Relevant Technologies: JavaScript, functions, arithmetic operations.
External Resources:
MDN Web Docs: JavaScript Functions: https://developer.mozilla.org/en-US/docs/Web/JavaScript/Guide/Functions
`;
/*
* Strings that don't need to be translated at this time.
*/
const UIStringsNotTranslate = {
    /**
     * @description Title for thinking step of File agent.
     */
    analyzingFile: 'Analyzing file',
};
const lockedString = i18n.i18n.lockedString;
export class FileContext extends ConversationContext {
    #file;
    constructor(file) {
        super();
        this.#file = file;
    }
    getOrigin() {
        return new URL(this.#file.url()).origin;
    }
    getItem() {
        return this.#file;
    }
    getTitle() {
        return this.#file.displayName();
    }
    async refresh() {
        await this.#file.requestContentData();
    }
}
/**
 * One agent instance handles one conversation. Create a new agent
 * instance for a new conversation.
 */
export class FileAgent extends AiAgent {
    preamble = preamble;
    clientFeature = Host.AidaClient.ClientFeature.CHROME_FILE_AGENT;
    get userTier() {
        return Root.Runtime.hostConfig.devToolsAiAssistanceFileAgent?.userTier;
    }
    get options() {
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
            title: lockedString(UIStringsNotTranslate.analyzingFile),
            details: createContextDetailsForFileAgent(selectedFile),
        };
    }
    async enhanceQuery(query, selectedFile) {
        const fileEnchantmentQuery = selectedFile ?
            `# Selected file\n${new FileFormatter(selectedFile.getItem()).formatFile()}\n\n# User request\n\n` :
            '';
        return `${fileEnchantmentQuery}${query}`;
    }
}
function createContextDetailsForFileAgent(selectedFile) {
    return [
        {
            title: 'Selected file',
            text: new FileFormatter(selectedFile.getItem()).formatFile(),
        },
    ];
}
//# sourceMappingURL=FileAgent.js.map