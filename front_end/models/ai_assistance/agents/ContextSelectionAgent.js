// Copyright 2026 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.
import * as Host from '../../../core/host/host.js';
import * as Platform from '../../../core/platform/platform.js';
import * as Root from '../../../core/root/root.js';
import * as Logs from '../../logs/logs.js';
import { AiAgent, } from './AiAgent.js';
/**
 * WARNING: preamble defined in code is only used when userTier is
 * TESTERS. Otherwise, a server-side preamble is used (see
 * chrome_preambles.gcl). Sync local changes with the server-side.
 */
const preamble = `
You are a Web Development Assistant integrated into Chrome DevTools. Your tone is educational, supportive, and technically precise.
You aim to help developers of all levels, prioritizing teaching web concepts as the primary entry point for any solution.

# Considerations
* Determine what the question the domain of the question is - styling, network, sources, performance or other part of DevTools.
* When possible proactively try to gather additional data and select context that they user may find relevant to the question they are asking utilizing the function calls available to you.
* Avoid making assumptions without sufficient evidence, and always seek further clarification if needed.
* Always explore multiple possible explanations for the observed behavior before settling on a conclusion.
* When presenting solutions, clearly distinguish between the primary cause and contributing factors.
* Please answer only if you are sure about the answer. Otherwise, explain why you're not able to answer.
* When answering, always consider MULTIPLE possible solutions.
* If you are unable to gather more information provide a comprehensive guide to how to fix the issue using Chrome DevTools and explain how and why.
* You can suggest any panel or flow in Chrome DevTools that may help the user out

# Formatting Guidelines
* Use Markdown for all code snippets.
* Always specify the language for code blocks (e.g., \`\`\`css, \`\`\`javascript).
* Keep text responses concise and scannable.

* ALWAYS OUTPUT a list of follow-up queries at the end of your text response. The format is SUGGESTIONS: ["suggestion1", "suggestion2", "suggestion3"]. Make sure that the array and the \`SUGGESTIONS: \` text is in the same line. You're also capable of executing the fix for the issue user mentioned. Reflect this in your suggestions.
* **CRITICAL** NEVER write full Python programs - you should only write individual statements that invoke a single function from the provided library.
* **CRITICAL** NEVER output text before a function call. Always do a function call first.
* **CRITICAL** You are a debugging assistant in DevTools. NEVER provide answers to questions of unrelated topics such as legal advice, financial advice, personal opinions, medical advice, religion, race, politics, sexuality, gender, or any other non web-development topics. Answer "Sorry, I can't answer that. I'm best at questions about debugging web pages." to such questions.
`;
/**
 * One agent instance handles one conversation. Create a new agent
 * instance for a new conversation.
 */
export class ContextSelectionAgent extends AiAgent {
    preamble = preamble;
    clientFeature = Host.AidaClient.ClientFeature.CHROME_FILE_AGENT;
    get userTier() {
        // TODO: Make this depend on variable.
        return Root.Runtime.hostConfig.devToolsFreestyler?.userTier;
    }
    get options() {
        const temperature = Root.Runtime.hostConfig.devToolsAiAssistanceFileAgent?.temperature;
        const modelId = Root.Runtime.hostConfig.devToolsAiAssistanceFileAgent?.modelId;
        return {
            temperature,
            modelId,
        };
    }
    constructor(opts) {
        super(opts);
        this.declareFunction('listNetworkRequests', {
            description: `Gives a list of network requests`,
            parameters: {
                type: 6 /* Host.AidaClient.ParametersTypes.OBJECT */,
                description: '',
                nullable: true,
                required: [],
                properties: {},
            },
            handler: async (_params, options) => {
                if (!options?.approved) {
                    return {
                        requiresApproval: true,
                    };
                }
                const requestURls = [];
                for (const request of Logs.NetworkLog.NetworkLog.instance().requests()) {
                    requestURls.push(request.url());
                }
                return {
                    result: requestURls,
                };
            },
        });
        this.declareFunction('selectNetworkRequest', {
            description: `From the list of selected request select one to debug`,
            parameters: {
                type: 6 /* Host.AidaClient.ParametersTypes.OBJECT */,
                description: '',
                nullable: true,
                required: ['url'],
                properties: {
                    url: {
                        type: 1 /* Host.AidaClient.ParametersTypes.STRING */,
                        description: 'The url of the requests',
                        nullable: false,
                    },
                },
            },
            handler: async ({ url }) => {
                // TODO: Switch to using IDs to make is easier to link to as well.
                const request = Logs.NetworkLog.NetworkLog.instance().requests().find(req => {
                    return req.url() === Platform.DevToolsPath.urlString `${url}` ||
                        req.url() === Platform.DevToolsPath.urlString `${url.slice(0, -1)}` ||
                        req.url() === Platform.DevToolsPath.urlString `${url}/`;
                });
                if (request) {
                    return {
                        context: request,
                    };
                }
                return {
                    error: 'No request found',
                };
            },
        });
    }
    async *handleContextDetails() {
    }
    async enhanceQuery(query) {
        return query;
    }
}
//# sourceMappingURL=ContextSelectionAgent.js.map