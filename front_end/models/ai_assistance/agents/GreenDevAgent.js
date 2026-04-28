// Copyright 2026 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.
import * as Host from '../../../core/host/host.js';
import * as Root from '../../../core/root/root.js';
import * as SDK from '../../../core/sdk/sdk.js';
import * as Greendev from '../../greendev/greendev.js';
import { AiAgent, ConversationContext } from './AiAgent.js';
const preamble = `You are a general purpose web page troubleshooting agent.
You are an expert in Chrome DevTools and you can help users with a wide range of issues.

You are expected to find the root cause for web page problems described by the user, such as:
- Why does nothing happen when I click this Submit button?
- Why is this ad not loading?
- Why is this text not using the correct font?
- ... and other similar requests.

Your job is to use the provided information to understand the problem, connect the dots to
find the root cause of the problem and explain what the user can do to fix the problem.

The user will start the process by selecting a DOM element and send a query about the page or the
selected DOM element. First, examine the provided context, then use function calls to gather
additional context and resolve the user request.

To help you root-cause the problem, you will be provided with the following information:
- Information about the user-selected DOM element, which is potentially relevant to the question
  from the user.
- The full accessibility tree for the web page.
- A list of the most recent network requests, whether the request was successful and whether it is
  considered to be ad-related. This list is capped to the most recent requests, but you can request
  more. If you think the error is relevant to the problem described by the user, make sure to mention
  the url of the failed network request in your reply to the user.
- The most recent console messages, including their index. This list is also capped to the most
  recent requests, but you can request more. Errors should have a source location, such
  as: file, line number and column number, for example: (filex.html:10:50) if an error occurs on line
  10, column 50 in filex.html. If you think the error is relevant to the problem described by the user,
  make sure to mention the console error in your reply to the user.

** IMPORTANT ** Never use the index when referring to individual console messages or network requests,
  because the values of the indicies is not visible to the user.

To help you further with root-causing problems, especially those indicated to originate in source
locations, you can call the following functions to request more information:
- 'getSourceLine': This function takes a file name, a line number, and a buffer (number of lines before
  and after) to return a snippet of the source code.
- 'getConsoleMessages': This function allows you to fetch specific slices of the console log based on the
  indices provided in the initial context. It takes optional parameters: 'beforeIndex' (to get historical
  messages before a certain index), 'afterIndex' (to get new messages that arrived after a certain index),
  'filter' ('errors', 'warnings', or 'all'), and 'limit' (max number of messages to return, defaults to 50).
- 'getNetworkRequests': This function allows you to fetch specific slices of the network request list based
   on the indices provided in the initial context. It takes optional parameters: 'beforeIndex' (to get
   historical messages before a certain index), 'afterIndex' (to get new messages that arrived after a
   certain index), 'filter' ('failed', or 'all', defaults to 'all'), and 'limit' (max number of messages
   to return, defaults to 50).

Start by using the selected node as a guide to figure out which problem the user wants to focus on. There
can be evidence of multiple failures (for example: multiple errors in the console log), but some might be
benign and others unrelated. You should focus on the ones that seem related to the user-selected problem.

Once you believe you have found the root cause, focus on applying a fix or explaining what the user can do
to fix the problem.

If you detect multiple possible problems, focus only on the root cause you think is most likely
to be related and explain what the user can do to fix it. For example, if the url used is obviously
incorrect, just say something like:

  "There are a few possible reasons for the problem you are describing. One is that it could be caused by
  the URL being incorrect. Try changing the url to 'xyz'. Let me know if you to suggest alternative
  solutions."

If the user suggests your fix not being the right solution, go through the remaining possible root causes
(one at a time).

Stick to what you have evidence for being the problem and refrain from speculating on things you
don't have concrete evidence for, such as CORS or Ad-blockers blocking requests. But feel free to
list those concerns after asking the user if they would like additional (general-purpose) details and
getting a favorable response.

**CRITICAL** You are a web age debugging assistant. NEVER provide answers to questions of unrelated
topics such as legal advice, financial advice, personal opinions, medical advice, religion, race,
politics, sexuality, gender, or any other non web-development topics. Answer "Sorry, I can't answer
that. I'm best at questions about debugging web pages." to such questions.
`;
export class GreenDevContext extends ConversationContext {
    #context;
    constructor(context) {
        super();
        this.#context = context;
    }
    getOrigin() {
        return 'devtools://ai-assistance';
    }
    getItem() {
        return this.#context;
    }
    getTitle() {
        return 'GreenDev';
    }
}
/**
 * This agent is a general-purpose web page troubleshooting agent for GreenDev
 * prototypes.
 */
export class GreenDevAgent extends AiAgent {
    constructor(options) {
        super(options);
        this.declareFunction('getSourceLine', {
            description: 'Get a source line from a file, with a buffer of additional lines around it.',
            parameters: {
                type: 6 /* Host.AidaClient.ParametersTypes.OBJECT */,
                description: '',
                nullable: false,
                properties: {
                    fileName: {
                        type: 1 /* Host.AidaClient.ParametersTypes.STRING */,
                        description: 'The full path of the file to read.',
                        nullable: false,
                    },
                    lineNumber: {
                        type: 3 /* Host.AidaClient.ParametersTypes.INTEGER */,
                        description: 'The line number to center the context around.',
                        nullable: false,
                    },
                    buffer: {
                        type: 3 /* Host.AidaClient.ParametersTypes.INTEGER */,
                        description: 'The number of lines to include before and after the line number.',
                        nullable: false,
                    },
                },
                required: ['fileName', 'lineNumber', 'buffer'],
            },
            handler: async (params) => {
                const result = await this.getSourceLine(params.fileName, params.lineNumber, params.buffer);
                return {
                    result,
                };
            },
        });
        this.declareFunction('getConsoleMessages', {
            description: 'Get console messages, with optional filters for severity and index-based slicing.',
            parameters: {
                type: 6 /* Host.AidaClient.ParametersTypes.OBJECT */,
                description: '',
                nullable: true,
                properties: {
                    filter: {
                        type: 1 /* Host.AidaClient.ParametersTypes.STRING */,
                        description: `The filter to apply: provide "errors" for errors only, "warnings" for errors and warnings, ` +
                            `and "all" for all messages. Defaults to "all".`,
                        nullable: true,
                    },
                    beforeIndex: {
                        type: 3 /* Host.AidaClient.ParametersTypes.INTEGER */,
                        description: 'Return messages exclusively before this index. Use to fetch older historical messages.',
                        nullable: true,
                    },
                    afterIndex: {
                        type: 3 /* Host.AidaClient.ParametersTypes.INTEGER */,
                        description: 'Return messages exclusively after this index. Use to check for new messages that arrived recently.',
                        nullable: true,
                    },
                    limit: {
                        type: 3 /* Host.AidaClient.ParametersTypes.INTEGER */,
                        description: 'The max number of messages to return. Defaults to 50.',
                        nullable: true,
                    },
                },
                required: [],
            },
            handler: async (params) => {
                const result = await this.getConsoleMessages(params);
                return {
                    result,
                };
            },
        });
        this.declareFunction('getNetworkRequests', {
            description: 'Get network requests, with optional filters for failure and index-based slicing.',
            parameters: {
                type: 6 /* Host.AidaClient.ParametersTypes.OBJECT */,
                description: '',
                nullable: true,
                properties: {
                    filter: {
                        type: 1 /* Host.AidaClient.ParametersTypes.STRING */,
                        description: 'The filter to apply: "failed" for failed requests only, "all" for all requests. Defaults to "all".',
                        nullable: true,
                    },
                    beforeIndex: {
                        type: 3 /* Host.AidaClient.ParametersTypes.INTEGER */,
                        description: 'Return requests exclusively before this index. Use to fetch older historical requests.',
                        nullable: true,
                    },
                    afterIndex: {
                        type: 3 /* Host.AidaClient.ParametersTypes.INTEGER */,
                        description: 'Return requests exclusively after this index. Use to check for new requests that arrived recently.',
                        nullable: true,
                    },
                    limit: {
                        type: 3 /* Host.AidaClient.ParametersTypes.INTEGER */,
                        description: 'The max number of requests to return. Defaults to 50.',
                        nullable: true,
                    },
                },
                required: [],
            },
            handler: async (params) => {
                const result = await this.getNetworkRequests(params);
                return {
                    result,
                };
            },
        });
    }
    preamble = preamble;
    get clientFeature() {
        // Reuse CHROME_NETWORK_AGENT similar to how we reuse CHROME_FILE_AGENT
        // in BreakpointDebuggerAgent.ts.
        return Host.AidaClient.ClientFeature.CHROME_NETWORK_AGENT;
    }
    get userTier() {
        return 'TESTERS';
        // TODO(b/491772868): tidy up userTier & feature flags in the backend.
        // return Root.Runtime.hostConfig.devToolsFreestyler?.userTier;
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
                    title: 'Conversation context',
                    text: context.getItem(),
                },
            ],
        };
    }
    async enhanceQuery(query, context) {
        const fullQuery = `QUERY: ${query}\n\n${context?.getItem() ?? ''}`;
        console.warn('Full query to AI:', fullQuery);
        return fullQuery;
    }
    static isEnabled() {
        console.warn('BeyondStyling prototype is enabled:', Greendev.Prototypes.instance().isEnabled('beyondStyling'));
        return Greendev.Prototypes.instance().isEnabled('beyondStyling');
    }
    static formatConsoleMessage(message, index) {
        const url = message.url ? ` (${message.url}:${message.line}:${message.column})` : '';
        return `[${index}] ${message.level}: ${message.messageText}${url}`;
    }
    static async getNetworkContextData(target) {
        const { frameTree } = await target.pageAgent().invoke_getResourceTree();
        const resourceTreeModel = target.model(SDK.ResourceTreeModel.ResourceTreeModel);
        // Recursively collect all raw resource info from the protocol response.
        const allResourceInfo = [];
        function processFrameTree(frameTree) {
            for (const resource of frameTree.resources) {
                allResourceInfo.push({ resource, frame: frameTree.frame });
            }
            if (frameTree.childFrames) {
                for (const child of frameTree.childFrames) {
                    processFrameTree(child);
                }
            }
        }
        processFrameTree(frameTree);
        const networkContextStrings = allResourceInfo.map(({ resource: resourceInfo, frame: resourceFrame }, index) => {
            let success = true;
            let isAdRelated = false;
            let frame = null;
            if (resourceInfo.failed || resourceInfo.canceled) {
                success = false;
            }
            frame = resourceTreeModel && resourceFrame.id ?
                resourceTreeModel.frameForId(resourceFrame.id) :
                null;
            if (frame &&
                (frame.adFrameType() === "child" /* Protocol.Page.AdFrameType.Child */ ||
                    frame.adFrameType() === "root" /* Protocol.Page.AdFrameType.Root */)) {
                isAdRelated = true;
            }
            const isAdRelatedString = isAdRelated ? `, Is ad-related: ${isAdRelated}` : '';
            const output = `[${index}] ${success ? 'Success' : 'Failed'}: ${resourceInfo.url}, ${isAdRelatedString}`;
            return { string: output, failed: success !== true };
        });
        return networkContextStrings;
    }
    async getNetworkRequests(params) {
        console.warn('[GreenDevAgent] AI Agent is calling getNetworkRequests with params:', JSON.stringify(params, null, 2));
        const target = SDK.TargetManager.TargetManager.instance().primaryPageTarget();
        if (!target) {
            return 'Target not found.';
        }
        const allRequests = await GreenDevAgent.getNetworkContextData(target);
        const limit = Math.min(Math.max(1, params.limit ?? 50), 1000);
        const filter = params.filter || 'all';
        let startIndex = params.afterIndex !== undefined ? params.afterIndex + 1 : 0;
        let endIndex = params.beforeIndex !== undefined ? params.beforeIndex : allRequests.length;
        // Ensure bounds are valid.
        startIndex = Math.max(0, startIndex);
        endIndex = Math.min(allRequests.length, endIndex);
        const resultRequests = [];
        // We iterate backwards to get the most recent requests up to the limit.
        for (let i = endIndex - 1; i >= startIndex; --i) {
            const request = allRequests[i];
            let matchesFilter = true;
            if (filter === 'failed') {
                matchesFilter = request.failed;
            }
            if (matchesFilter) {
                resultRequests.unshift(request.string);
                if (resultRequests.length >= limit) {
                    break;
                }
            }
        }
        if (resultRequests.length === 0) {
            console.warn('[GreenDevAgent] getNetworkRequests returning: No network requests found matching criteria.');
            return 'No network requests found matching criteria.';
        }
        const resultString = resultRequests.join('\n');
        console.warn('[GreenDevAgent] getNetworkRequests returning:\n' + resultString);
        return resultString;
    }
    async getConsoleMessages(params) {
        console.warn('[GreenDevAgent] AI Agent is calling getConsoleMessages with params:', JSON.stringify(params, null, 2));
        const target = SDK.TargetManager.TargetManager.instance().primaryPageTarget();
        const consoleModel = target?.model(SDK.ConsoleModel.ConsoleModel);
        if (!consoleModel) {
            return 'Console model not found.';
        }
        const allMessages = consoleModel.messages();
        const limit = Math.min(Math.max(1, params.limit ?? 50), 1000);
        const filter = params.filter || 'all';
        let startIndex = params.afterIndex !== undefined ? params.afterIndex + 1 : 0;
        let endIndex = params.beforeIndex !== undefined ? params.beforeIndex : allMessages.length;
        // Ensure bounds are valid.
        startIndex = Math.max(0, startIndex);
        endIndex = Math.min(allMessages.length, endIndex);
        const resultMessages = [];
        // We iterate backwards to get the most recent messages up to the limit.
        for (let i = endIndex - 1; i >= startIndex; --i) {
            const message = allMessages[i];
            let matchesFilter = true;
            if (filter === 'errors') {
                matchesFilter = message.level === "error" /* Protocol.Log.LogEntryLevel.Error */;
            }
            else if (filter === 'warnings') {
                matchesFilter =
                    message.level === "error" /* Protocol.Log.LogEntryLevel.Error */ || message.level === "warning" /* Protocol.Log.LogEntryLevel.Warning */;
            }
            if (matchesFilter) {
                resultMessages.unshift(GreenDevAgent.formatConsoleMessage(message, i));
                if (resultMessages.length >= limit) {
                    break;
                }
            }
        }
        if (resultMessages.length === 0) {
            console.warn('[GreenDevAgent] getConsoleMessages returning: No messages found matching criteria.');
            return 'No messages found matching criteria.';
        }
        const resultString = resultMessages.join('\n');
        console.warn('[GreenDevAgent] getConsoleMessages returning:\n' + resultString);
        return resultString;
    }
    async getSourceLine(fileName, lineNumber, buffer) {
        console.warn(`getSourceLine called with fileName: ${fileName}, lineNumber: ${lineNumber}, buffer: ${buffer}`);
        let url;
        try {
            new URL(fileName);
            url = fileName;
        }
        catch {
            const primaryPageTarget = SDK.TargetManager.TargetManager.instance().primaryPageTarget();
            const resourceTreeModel = primaryPageTarget?.model(SDK.ResourceTreeModel.ResourceTreeModel);
            const mainFrame = resourceTreeModel?.mainFrame;
            if (mainFrame) {
                url = new URL(fileName, mainFrame.url).href;
            }
            else {
                return `Could not resolve relative path: ${fileName}`;
            }
        }
        let content = '';
        if (url.startsWith('http://') || url.startsWith('https://')) {
            try {
                const response = await fetch(url);
                if (response.ok) {
                    content = await response.text();
                }
                else {
                    console.error(`Failed to load resource ${url}: status ${response.status}`);
                    return `Could not read file content: status ${response.status}`;
                }
            }
            catch (e) {
                console.error(`Failed to load resource ${url}:`, e);
                return `Could not read file content: ${e instanceof Error ? e.message : 'Unknown error'}`;
            }
        }
        else {
            content = await new Promise(resolve => {
                Host.ResourceLoader.load(url, null, (success, _headers, content, errorDescription) => {
                    if (!success) {
                        console.error(`Failed to load resource ${url}:`, errorDescription);
                        resolve('');
                    }
                    else {
                        resolve(content);
                    }
                }, true /* allowRemoteFilePaths */);
            });
        }
        if (!content) {
            return 'Could not read file content.';
        }
        const lines = content.split('\n');
        const start = Math.max(0, lineNumber - buffer - 1);
        const end = Math.min(lines.length, lineNumber + buffer);
        console.warn('AI requested source code for:', lines.slice(start, end));
        return lines.slice(start, end).join('\n');
    }
}
//# sourceMappingURL=GreenDevAgent.js.map