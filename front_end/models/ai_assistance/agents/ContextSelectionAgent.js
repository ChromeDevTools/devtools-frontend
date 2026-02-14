// Copyright 2026 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.
import * as Common from '../../../core/common/common.js';
import * as Host from '../../../core/host/host.js';
import * as i18n from '../../../core/i18n/i18n.js';
import * as Platform from '../../../core/platform/platform.js';
import * as Root from '../../../core/root/root.js';
import * as SDK from '../../../core/sdk/sdk.js';
import * as Logs from '../../logs/logs.js';
import * as NetworkTimeCalculator from '../../network_time_calculator/network_time_calculator.js';
import * as Workspace from '../../workspace/workspace.js';
import { AiAgent, } from './AiAgent.js';
import { FileContext } from './FileAgent.js';
import { RequestContext } from './NetworkAgent.js';
import { PerformanceTraceContext } from './PerformanceAgent.js';
import { NodeContext } from './StylingAgent.js';
const lockedString = i18n.i18n.lockedString;
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
* Proactively try to gather additional data. If a select specific data can be selected, select one.
* Always try select single specific context before answering the question.
* Avoid making assumptions without sufficient evidence, and always seek further clarification if needed.
* When presenting solutions, clearly distinguish between the primary cause and contributing factors.
* Please answer only if you are sure about the answer. Otherwise, explain why you're not able to answer.
* When answering, always consider MULTIPLE possible solutions.
* If you are unable to gather more information provide a comprehensive guide to how to fix the issue using Chrome DevTools and explain how and why.
* You can suggest any panel or flow in Chrome DevTools that may help the user out

# Formatting Guidelines
* Use Markdown for all code snippets.
* Always specify the language for code blocks (e.g., \`\`\`css, \`\`\`javascript).
* Keep text responses concise and scannable.

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
    #performanceRecordAndReload;
    #onInspectElement;
    #networkTimeCalculator;
    constructor(opts) {
        super(opts);
        this.#performanceRecordAndReload = opts.performanceRecordAndReload;
        this.#onInspectElement = opts.onInspectElement;
        this.#networkTimeCalculator = opts.networkTimeCalculator;
        this.declareFunction('listNetworkRequests', {
            description: `Gives a list of network requests including URL, status code, and duration.`,
            parameters: {
                type: 6 /* Host.AidaClient.ParametersTypes.OBJECT */,
                description: '',
                nullable: true,
                required: [],
                properties: {},
            },
            displayInfoFromArgs: () => {
                return {
                    title: lockedString('Listing network requests…'),
                    action: 'listNetworkRequest()',
                };
            },
            handler: async () => {
                const requests = [];
                const target = SDK.TargetManager.TargetManager.instance().primaryPageTarget();
                const inspectedURL = target?.inspectedURL();
                const mainSecurityOrigin = inspectedURL ? new Common.ParsedURL.ParsedURL(inspectedURL).securityOrigin() : null;
                for (const request of Logs.NetworkLog.NetworkLog.instance().requests()) {
                    if (mainSecurityOrigin && request.securityOrigin() !== mainSecurityOrigin) {
                        continue;
                    }
                    requests.push({
                        url: request.url(),
                        statusCode: request.statusCode,
                        duration: i18n.TimeUtilities.secondsToString(request.duration),
                    });
                }
                if (requests.length === 0) {
                    return {
                        error: 'No requests recorded by DevTools',
                    };
                }
                return {
                    result: requests,
                };
            },
        });
        this.declareFunction('selectNetworkRequest', {
            description: `Selects a specific network request to further provide information about. Use this when asked about network requests issues.`,
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
            displayInfoFromArgs: args => {
                return {
                    title: lockedString('Getting network request…'),
                    action: `selectNetworkRequest(${args.url})`,
                };
            },
            handler: async ({ url }) => {
                // TODO: Switch to using IDs to make is easier to link to as well.
                const request = Logs.NetworkLog.NetworkLog.instance().requests().find(req => {
                    return req.url() === Platform.DevToolsPath.urlString `${url}` ||
                        req.url() === Platform.DevToolsPath.urlString `${url.slice(0, -1)}` ||
                        req.url() === Platform.DevToolsPath.urlString `${url}/`;
                });
                if (request) {
                    const calculator = this.#networkTimeCalculator ?? new NetworkTimeCalculator.NetworkTransferTimeCalculator();
                    return {
                        context: new RequestContext(request, calculator),
                    };
                }
                return {
                    error: 'No request found',
                };
            },
        });
        this.declareFunction('listSourceFiles', {
            description: `Returns a list of all files in the project.`,
            parameters: {
                type: 6 /* Host.AidaClient.ParametersTypes.OBJECT */,
                description: '',
                nullable: true,
                required: [],
                properties: {},
            },
            displayInfoFromArgs: () => {
                return {
                    title: lockedString('Listing source requests…'),
                    action: 'listSourceFile()',
                };
            },
            handler: async () => {
                const files = [];
                for (const file of this.#getUISourceCodes()) {
                    files.push(file.fullDisplayName());
                }
                return {
                    result: files,
                };
            },
        });
        this.declareFunction('selectSourceFile', {
            description: `Selects a source file. Use this when asked about files on the page.`,
            parameters: {
                type: 6 /* Host.AidaClient.ParametersTypes.OBJECT */,
                description: '',
                nullable: true,
                required: ['name'],
                properties: {
                    name: {
                        type: 1 /* Host.AidaClient.ParametersTypes.STRING */,
                        description: 'The name of the file you want to select.',
                        nullable: false,
                    },
                },
            },
            displayInfoFromArgs: args => {
                return {
                    title: lockedString('Getting source file…'),
                    action: `selectSourceFile(${args.name})`,
                };
            },
            handler: async (params) => {
                for (const file of this.#getUISourceCodes()) {
                    if (file.fullDisplayName() === params.name) {
                        return {
                            context: new FileContext(file),
                        };
                    }
                }
                return { error: 'Unable to find file.' };
            },
        });
        this.declareFunction('performanceRecordAndReload', {
            description: 'Records a new performance trace, to help debug performance issue.',
            parameters: {
                type: 6 /* Host.AidaClient.ParametersTypes.OBJECT */,
                description: '',
                nullable: true,
                required: [],
                properties: {},
            },
            displayInfoFromArgs: () => {
                return {
                    title: 'Recording a performance trace…',
                    action: 'performanceRecordAndReload()',
                };
            },
            handler: async () => {
                if (!this.#performanceRecordAndReload) {
                    return {
                        error: 'Performance recording is not available.',
                    };
                }
                const result = await this.#performanceRecordAndReload();
                return {
                    context: PerformanceTraceContext.fromParsedTrace(result),
                };
            }
        });
        this.declareFunction('inspectDom', {
            description: `Prompts user to select a DOM element from the page. Use this when you don't know which element is selected.`,
            parameters: {
                type: 6 /* Host.AidaClient.ParametersTypes.OBJECT */,
                description: '',
                nullable: true,
                required: [],
                properties: {},
            },
            displayInfoFromArgs: () => {
                return {
                    title: lockedString('Please select an element on the page…'),
                    action: 'selectElement()',
                };
            },
            handler: async () => {
                if (!this.#onInspectElement) {
                    return { error: 'The inspect element action is not available.' };
                }
                const node = await this.#onInspectElement();
                if (node) {
                    return {
                        context: new NodeContext(node),
                    };
                }
                return {
                    error: 'Unable to select element.',
                };
            },
        });
    }
    #getUISourceCodes = () => {
        const workspace = Workspace.Workspace.WorkspaceImpl.instance();
        const projects = workspace.projects().filter(project => {
            switch (project.type()) {
                case Workspace.Workspace.projectTypes.Network:
                case Workspace.Workspace.projectTypes.FileSystem:
                case Workspace.Workspace.projectTypes.ConnectableFileSystem:
                    return true;
                default:
                    return false;
            }
        });
        const uiSourceCodes = [];
        for (const project of projects) {
            for (const uiSourceCode of project.uiSourceCodes()) {
                uiSourceCodes.push(uiSourceCode);
            }
        }
        return uiSourceCodes;
    };
    async *handleContextDetails() {
    }
    async enhanceQuery(query) {
        return query;
    }
}
//# sourceMappingURL=ContextSelectionAgent.js.map