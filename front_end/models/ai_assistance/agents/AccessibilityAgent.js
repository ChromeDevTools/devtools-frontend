// Copyright 2026 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.
import * as Host from '../../../core/host/host.js';
import * as i18n from '../../../core/i18n/i18n.js';
import * as Root from '../../../core/root/root.js';
import * as SDK from '../../../core/sdk/sdk.js';
import { LighthouseFormatter } from '../data_formatters/LighthouseFormatter.js';
import { debugLog } from '../debug.js';
import { AiAgent, ConversationContext, } from './AiAgent.js';
/**
 * WARNING: preamble defined in code is only used when userTier is
 * TESTERS. Otherwise, a server-side preamble is used (see
 * chrome_preambles.gcl). Sync local changes with the server-side.
 */
const preamble = `You are an accessibility expert agent integrated into Chrome DevTools.
Your role is to help users understand and fix accessibility issues found in Lighthouse reports.

# Style Guidelines
* **Concise and Direct**: Use short sentences and bullet points. Avoid paragraphs and long explanations.
* **Structured**: Organize your findings by problem, root cause, and next steps, but do NOT use those literal words as headings.
* **No Internal Identifiers**: NEVER show Lighthouse paths (e.g., "1,HTML,1,BODY...") to the user. Refer to elements by their tag name, classes, or IDs.
* **Managing Volume**: If the report contains many issues, provide a brief summary of the top 2-3 most critical ones. Tell the user that there are more issues and invite them to ask for more details or to explore a specific area.

# Workflow
1. **Identify**: Find the most critical accessibility issues in the Lighthouse report.
2. **Investigate**: For any element identified as failing, you **MUST** call \`getStyles\` or \`getElementAccessibilityDetails\` first to confirm its current state and gather details.
3. **Analyze**: Use the live data from your tools to determine the exact root cause.
4. **Respond**: Provide a succinct summary of the problem, why it's happening based on your investigation, and a clear fix.

# Capabilities
* \`getLighthouseAudits\`: Get detailed audit data.
* \`getStyles\`: Get computed styles for an element by its path.
* \`getElementAccessibilityDetails\`: Get A11y properties for an element by its path.

# Constraints
* **CRITICAL**: ALWAYS call a tool before providing an answer if an element path is available.
* **CRITICAL**: You are an accessibility agent. NEVER provide answers to questions of unrelated topics such as legal advice, financial advice, personal opinions, medical advice, or any other non web-development topics.
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
    async #resolvePathToNode(path) {
        const target = SDK.TargetManager.TargetManager.instance().primaryPageTarget();
        if (!target) {
            return null;
        }
        const domModel = target.model(SDK.DOMModel.DOMModel);
        if (!domModel) {
            return null;
        }
        const nodeId = await domModel.pushNodeByPathToFrontend(path);
        if (!nodeId) {
            return null;
        }
        return domModel.nodeForId(nodeId);
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
        this.declareFunction('getStyles', {
            description: 'Get computed styles for an element on the inspected page by its Lighthouse path.',
            parameters: {
                type: 6 /* Host.AidaClient.ParametersTypes.OBJECT */,
                description: '',
                nullable: false,
                properties: {
                    explanation: {
                        type: 1 /* Host.AidaClient.ParametersTypes.STRING */,
                        description: 'Explain why you want to get styles.',
                        nullable: false,
                    },
                    path: {
                        type: 1 /* Host.AidaClient.ParametersTypes.STRING */,
                        description: 'The Lighthouse path of the element (e.g., "1,HTML,1,BODY,2,DIV"). Find this in the report data.',
                        nullable: false,
                    },
                    styleProperties: {
                        type: 5 /* Host.AidaClient.ParametersTypes.ARRAY */,
                        description: 'One or more CSS style property names to fetch.',
                        nullable: false,
                        items: {
                            type: 1 /* Host.AidaClient.ParametersTypes.STRING */,
                            description: 'A CSS style property name to retrieve. For example, \'background-color\'.'
                        }
                    },
                },
                required: ['explanation', 'path', 'styleProperties']
            },
            displayInfoFromArgs: params => {
                return {
                    title: 'Reading computed styles',
                    thought: params.explanation,
                    action: `getStyles('${params.path}', ${JSON.stringify(params.styleProperties)})`,
                };
            },
            handler: async (params) => {
                debugLog('Function call: getStyles', params);
                const node = await this.#resolvePathToNode(params.path);
                if (!node) {
                    return { error: `Could not find the element with path: ${params.path}` };
                }
                const styles = await node.domModel().cssModel().getComputedStyle(node.id);
                if (!styles) {
                    return { error: 'Could not get computed styles.' };
                }
                const result = {};
                for (const prop of params.styleProperties) {
                    result[prop] = styles.get(prop);
                }
                return { result: JSON.stringify(result, null, 2) };
            },
        });
        this.declareFunction('getElementAccessibilityDetails', {
            description: 'Get detailed accessibility information for an element on the inspected page by its Lighthouse path.',
            parameters: {
                type: 6 /* Host.AidaClient.ParametersTypes.OBJECT */,
                description: '',
                nullable: false,
                properties: {
                    explanation: {
                        type: 1 /* Host.AidaClient.ParametersTypes.STRING */,
                        description: 'Explain why you want to get accessibility details.',
                        nullable: false,
                    },
                    path: {
                        type: 1 /* Host.AidaClient.ParametersTypes.STRING */,
                        description: 'The Lighthouse path of the element (e.g., "1,HTML,1,BODY,2,DIV"). Find this in the report data.',
                        nullable: false,
                    },
                },
                required: ['explanation', 'path']
            },
            displayInfoFromArgs: params => {
                return {
                    title: 'Reading accessibility details',
                    thought: params.explanation,
                    action: `getElementAccessibilityDetails('${params.path}')`,
                };
            },
            handler: async (params) => {
                debugLog('Function call: getElementAccessibilityDetails', params);
                const node = await this.#resolvePathToNode(params.path);
                if (!node) {
                    return { error: `Could not find the element with path: ${params.path}` };
                }
                const accessibilityModel = node.domModel().target().model(SDK.AccessibilityModel.AccessibilityModel);
                if (!accessibilityModel) {
                    return { error: 'Accessibility model not found.' };
                }
                await accessibilityModel.requestAndLoadSubTreeToNode(node);
                const axNode = accessibilityModel.axNodeForDOMNode(node);
                if (!axNode) {
                    return { error: 'Could not find accessibility node for the element.' };
                }
                const result = {
                    role: axNode.role()?.value,
                    name: axNode.name()?.value,
                    nameSource: axNode.name()?.sources?.[0]?.type,
                    properties: {
                        focusable: node.getAttribute('tabindex') !== undefined || axNode.role()?.value === 'button' ||
                            axNode.role()?.value === 'link',
                        hidden: axNode.ignored(),
                    },
                    ariaAttributes: node.attributes()
                        .filter(attr => attr.name.startsWith('aria-') || attr.name === 'role')
                        .reduce((acc, attr) => {
                        acc[attr.name] = attr.value;
                        return acc;
                    }, {}),
                    isIgnored: axNode.ignored(),
                    ignoredReasons: axNode.ignoredReasons(),
                };
                return { result: JSON.stringify(result, null, 2) };
            },
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