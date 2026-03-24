// Copyright 2026 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.
import * as Host from '../../../core/host/host.js';
import * as i18n from '../../../core/i18n/i18n.js';
import * as Root from '../../../core/root/root.js';
import * as Logs from '../../logs/logs.js';
import * as NetworkTimeCalculator from '../../network_time_calculator/network_time_calculator.js';
import * as Workspace from '../../workspace/workspace.js';
import { AccessibilityContext } from './AccessibilityAgent.js';
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
* Determine what is the domain of the question - styling, network, sources, performance or other part of DevTools.
* Proactively try to gather additional data. If a select specific data can be selected, select one.
* Always try select single specific context before answering the question.
* Avoid making assumptions without sufficient evidence, and always seek further clarification if needed.
* When presenting solutions, clearly distinguish between the primary cause and contributing factors.
* Please answer only if you are sure about the answer. Otherwise, explain why you're not able to answer.
* If you are unable to gather more information provide a comprehensive guide to how to fix the issue using Chrome DevTools and explain how and why.
* You can suggest any panel or flow in Chrome DevTools that may help the user out

# Formatting Guidelines
* Use Markdown for all code snippets.
* Always specify the language for code blocks (e.g., \`\`\`css, \`\`\`javascript).
* Keep text responses concise and scannable.

* **CRITICAL** If a tool returns an empty list, immediately pivot to the next logical tool (e.g., from sources to network).
* **CRITICAL** Always exhaust all possible way to find and select context from different domains.
* **CRITICAL** NEVER write full Python programs - you should only write individual statements that invoke a single function from the provided library.
* **CRITICAL** NEVER output text before a function call. Always do a function call first.
* **CRITICAL** You are a debugging assistant in DevTools. NEVER provide answers to questions of unrelated topics such as legal advice, financial advice, personal opinions, medical advice, religion, race, politics, sexuality, gender, or any other non web-development topics. Answer "Sorry, I can't answer that. I'm best at questions about debugging web pages." to such questions.
* **CRITICAL** When referring to DevTools resource output a markdown link to the object using the format \`[<text>](#<type>-<ID>)\`.
* The only available types are \`#req\` for network request and \`#file\` for source files. Only use ID inside the link, never ask about user selecting by ID.
`;
/**
 * One agent instance handles one conversation. Create a new agent
 * instance for a new conversation.
 */
export class ContextSelectionAgent extends AiAgent {
    preamble = preamble;
    clientFeature = Host.AidaClient.ClientFeature.CHROME_CONTEXT_SELECTION_AGENT;
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
    #lighthouseRecording;
    #allowedOrigin;
    constructor(opts) {
        super(opts);
        this.#performanceRecordAndReload = opts.performanceRecordAndReload;
        this.#lighthouseRecording = opts.lighthouseRecording;
        this.#onInspectElement = opts.onInspectElement;
        this.#networkTimeCalculator = opts.networkTimeCalculator;
        this.#allowedOrigin = opts.allowedOrigin ?? (() => undefined);
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
                const origin = this.#allowedOrigin();
                let hasCrossOriginRequest = false;
                for (const request of Logs.NetworkLog.NetworkLog.instance().requests()) {
                    const requestOrigin = new URL(request.documentURL).origin;
                    /**
                     * NOTE: this origin check does not ensure that all the requests are
                     * from the same origin as the target page. Instead, it ensures that
                     * the document that loaded the request is the same as the target
                     * page. This ensures that we limit the scope to all requests fetched
                     * during the loading of the target page, and do not leak URLs from
                     * other pages.
                     */
                    if (origin && requestOrigin !== origin) {
                        hasCrossOriginRequest = true;
                        continue;
                    }
                    requests.push({
                        id: request.requestId(),
                        url: request.url(),
                        statusCode: request.statusCode,
                        duration: i18n.TimeUtilities.secondsToString(request.duration),
                        transferSize: i18n.ByteUtilities.formatBytesToKb(request.transferSize),
                    });
                }
                if (requests.length === 0) {
                    return {
                        error: hasCrossOriginRequest ?
                            `No requests showing with origin ${origin}. Tell the user to start a new chat` :
                            'No requests recorded by DevTools',
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
                required: ['id'],
                properties: {
                    id: {
                        type: 1 /* Host.AidaClient.ParametersTypes.STRING */,
                        description: 'The id of the network request',
                        nullable: false,
                    },
                },
            },
            displayInfoFromArgs: args => {
                return {
                    title: lockedString('Getting network request…'),
                    action: `selectNetworkRequest(${args.id})`,
                };
            },
            handler: async ({ id }) => {
                const origin = this.#allowedOrigin();
                const request = Logs.NetworkLog.NetworkLog.instance().requests().find(req => {
                    if (req.requestId() !== id) {
                        return false;
                    }
                    const requestOrigin = new URL(req.documentURL).origin;
                    return !origin || requestOrigin === origin;
                });
                if (request) {
                    const calculator = this.#networkTimeCalculator ?? new NetworkTimeCalculator.NetworkTransferTimeCalculator();
                    return {
                        context: new RequestContext(request, calculator),
                        description: 'User selected a network request',
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
                    action: 'listSourceFiles()',
                };
            },
            handler: async () => {
                const files = [];
                for (const file of ContextSelectionAgent.getUISourceCodes()) {
                    files.push({
                        file: file.fullDisplayName(),
                        id: ContextSelectionAgent.uiSourceCodeId.get(file),
                    });
                }
                return {
                    result: files,
                };
            },
        });
        this.declareFunction('selectSourceFile', {
            description: `Selects a source file. Use this when asked about files on the page. Use listSourceFiles to find the file ID.`,
            parameters: {
                type: 6 /* Host.AidaClient.ParametersTypes.OBJECT */,
                description: '',
                nullable: true,
                required: ['id'],
                properties: {
                    id: {
                        type: 3 /* Host.AidaClient.ParametersTypes.INTEGER */,
                        description: 'The id (URL) of the file you want to select.',
                        nullable: false,
                    },
                },
            },
            displayInfoFromArgs: args => {
                return {
                    title: lockedString('Getting source file…'),
                    action: `selectSourceFile(${args.id})`,
                };
            },
            handler: async (params) => {
                const file = ContextSelectionAgent.getUISourceCodes().find(file => ContextSelectionAgent.uiSourceCodeId.get(file) === params.id);
                if (!file) {
                    return {
                        error: 'Unable to find file.',
                    };
                }
                return {
                    context: new FileContext(file),
                    description: 'User selected a source file',
                };
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
                    description: 'User recorded a performance trace',
                    widgets: [{ name: 'PERFORMANCE_TRACE', data: { parsedTrace: result } }]
                };
            }
        });
        this.declareFunction('runLighthouseAudits', {
            description: 'Records a Lighthouse audit on the current page, to help debug accessibility issues.',
            parameters: {
                type: 6 /* Host.AidaClient.ParametersTypes.OBJECT */,
                description: '',
                nullable: true,
                required: [],
                properties: {},
            },
            displayInfoFromArgs: () => {
                return {
                    title: 'Auditing your page with Lighthouse…',
                    action: 'runLighthouseAudits()',
                };
            },
            handler: async () => {
                if (!this.#lighthouseRecording) {
                    return {
                        error: 'Lighthouse report is not available.',
                    };
                }
                const result = await this.#lighthouseRecording();
                if (!result) {
                    return { error: 'Failed to generate Lighthouse report.' };
                }
                return {
                    context: new AccessibilityContext(result),
                    description: 'User has selected a Lighthouse report',
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
                    title: lockedString('Select an element on the page or in the Elements panel'),
                };
            },
            handler: async (_params, options) => {
                if (!this.#onInspectElement) {
                    return {
                        error: 'The inspect element action is not available.',
                    };
                }
                if (!options?.approved) {
                    return {
                        requiresApproval: true,
                        description: null,
                    };
                }
                const node = await this.#onInspectElement();
                if (node) {
                    return {
                        context: new NodeContext(node),
                        description: 'User selected an element',
                    };
                }
                return {
                    error: 'Unable to select element.',
                };
            },
        });
    }
    async *handleContextDetails() {
    }
    async enhanceQuery(query) {
        return query;
    }
    static lastSourceId = 0;
    static uiSourceCodeId = new WeakMap();
    /**
     * This is a heuristic algorithm that gets all the source files coming from the
     * network and assigns unique ids to be linked from the LLM Markdown response.
     * Steps we do:
     * 1. Get all project that are coming from the Network. This scopes down
     * sources exposed to the LLM
     * 2. Remove all ignore listed source code. We further reduce thing that the
     * user most likely does not have interest in, from global setting.
     * 3.1. Source files don't have an uniqueId so we use the URL to differentiate
     * them.
     * 3.2. In cases where we encounter a duplicated URLs we prefer the latest one
     * coming from SourceMaps (usually only one) as that has simple code and
     * usually is what the user authored.
     */
    static getUISourceCodes() {
        const workspace = Workspace.Workspace.WorkspaceImpl.instance();
        const projects = workspace.projects().filter(project => project.type() === Workspace.Workspace.projectTypes.Network);
        const uiSourceCodes = new Map();
        for (const project of projects) {
            for (const uiSourceCode of project.uiSourceCodes()) {
                if (uiSourceCode.isIgnoreListed()) {
                    continue;
                }
                const url = uiSourceCode.url();
                // This helps us pick the file that is a resolved source map.
                if (!uiSourceCodes.get(url) || uiSourceCode.contentType().isFromSourceMap()) {
                    uiSourceCodes.set(url, uiSourceCode);
                    if (!ContextSelectionAgent.uiSourceCodeId.has(uiSourceCode)) {
                        ContextSelectionAgent.uiSourceCodeId.set(uiSourceCode, ++ContextSelectionAgent.lastSourceId);
                    }
                }
            }
        }
        return [...uiSourceCodes.values()];
    }
}
//# sourceMappingURL=ContextSelectionAgent.js.map