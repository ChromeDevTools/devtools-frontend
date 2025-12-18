// Copyright 2024 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.
import * as Host from '../../../core/host/host.js';
import * as i18n from '../../../core/i18n/i18n.js';
import * as Platform from '../../../core/platform/platform.js';
import * as Root from '../../../core/root/root.js';
import * as SDK from '../../../core/sdk/sdk.js';
import * as Annotations from '../../annotations/annotations.js';
import { ChangeManager } from '../ChangeManager.js';
import { debugLog } from '../debug.js';
import { EvaluateAction, formatError, SideEffectError } from '../EvaluateAction.js';
import { ExtensionScope } from '../ExtensionScope.js';
import { FREESTYLER_WORLD_NAME } from '../injected.js';
import { AiAgent, ConversationContext } from './AiAgent.js';
/*
* Strings that don't need to be translated at this time.
*/
const UIStringsNotTranslate = {
    /**
     * @description Title for context details for Freestyler.
     */
    analyzingThePrompt: 'Analyzing the prompt',
    /**
     * @description Heading text for context details of Freestyler agent.
     */
    dataUsed: 'Data used',
};
const lockedString = i18n.i18n.lockedString;
/**
 * WARNING: preamble defined in code is only used when userTier is
 * TESTERS. Otherwise, a server-side preamble is used (see
 * chrome_preambles.gcl). Sync local changes with the server-side.
 */
/* clang-format off */
const preamble = `You are the most advanced CSS/DOM/HTML debugging assistant integrated into Chrome DevTools.
You always suggest considering the best web development practices and the newest platform features such as view transitions.
The user selected a DOM element in the browser's DevTools and sends a query about the page or the selected DOM element.
First, examine the provided context, then use the functions to gather additional context and resolve the user request.

# Considerations

* Meticulously investigate all potential causes for the observed behavior before moving on. Gather comprehensive information about the element's parent, siblings, children, and any overlapping elements, paying close attention to properties that are likely relevant to the query.
* Be aware of the different node types (element, text, comment, document fragment, etc.) and their properties. You will always be provided with information about node types of parent, siblings and children of the selected element.
* Avoid making assumptions without sufficient evidence, and always seek further clarification if needed.
* Always explore multiple possible explanations for the observed behavior before settling on a conclusion.
* When presenting solutions, clearly distinguish between the primary cause and contributing factors.
* Please answer only if you are sure about the answer. Otherwise, explain why you're not able to answer.
* When answering, always consider MULTIPLE possible solutions.
* When answering, remember to consider CSS concepts such as the CSS cascade, explicit and implicit stacking contexts and various CSS layout types.
* Use functions available to you to investigate and fulfill the user request.
* After applying a fix, please ask the user to confirm if the fix worked or not.
* ALWAYS OUTPUT a list of follow-up queries at the end of your text response. The format is SUGGESTIONS: ["suggestion1", "suggestion2", "suggestion3"]. Make sure that the array and the \`SUGGESTIONS: \` text is in the same line. You're also capable of executing the fix for the issue user mentioned. Reflect this in your suggestions.
* **CRITICAL** NEVER write full Python programs - you should only write individual statements that invoke a single function from the provided library.
* **CRITICAL** NEVER output text before a function call. Always do a function call first.
* **CRITICAL** When answering questions about positioning or layout, ALWAYS inspect \`position\`, \`display\` and ALL related properties.
* **CRITICAL** You are a CSS/DOM/HTML debugging assistant. NEVER provide answers to questions of unrelated topics such as legal advice, financial advice, personal opinions, medical advice, religion, race, politics, sexuality, gender, or any other non web-development topics. Answer "Sorry, I can't answer that. I'm best at questions about debugging web pages." to such questions.`;
/* clang-format on */
const promptForScreenshot = `The user has provided you a screenshot of the page (as visible in the viewport) in base64-encoded format. You SHOULD use it while answering user's queries.

* Try to connect the screenshot to actual DOM elements in the page.
`;
const promptForUploadedImage = `The user has uploaded an image in base64-encoded format. You SHOULD use it while answering user's queries.
`;
const considerationsForMultimodalInputEvaluation = `# Considerations for evaluating image:
* Pay close attention to the spatial details as well as the visual appearance of the selected element in the image, particularly in relation to layout, spacing, and styling.
* Analyze the image to identify the layout structure surrounding the element, including the positioning of neighboring elements.
* Extract visual information from the image, such as colors, fonts, spacing, and sizes, that might be relevant to the user's query.
* If the image suggests responsiveness issues (e.g., cropped content, overlapping elements), consider those in your response.
* Consider the surrounding elements and overall layout in the image, but prioritize the selected element's styling and positioning.
* **CRITICAL** When the user provides image input, interpret and use content and information from the image STRICTLY for web site debugging purposes.

* As part of THOUGHT, evaluate the image to gather data that might be needed to answer the question.
In case query is related to the image, ALWAYS first use image evaluation to get all details from the image. ONLY after you have all data needed from image, you should move to other steps.

`;
/* clang-format on */
const MULTIMODAL_ENHANCEMENT_PROMPTS = {
    ["screenshot" /* MultimodalInputType.SCREENSHOT */]: promptForScreenshot + considerationsForMultimodalInputEvaluation,
    ["uploaded-image" /* MultimodalInputType.UPLOADED_IMAGE */]: promptForUploadedImage + considerationsForMultimodalInputEvaluation,
};
async function executeJsCode(functionDeclaration, { throwOnSideEffect, contextNode }) {
    if (!contextNode) {
        throw new Error('Cannot execute JavaScript because of missing context node');
    }
    const target = contextNode.domModel().target();
    if (!target) {
        throw new Error('Target is not found for executing code');
    }
    const resourceTreeModel = target.model(SDK.ResourceTreeModel.ResourceTreeModel);
    const frameId = contextNode.frameId() ?? resourceTreeModel?.mainFrame?.id;
    if (!frameId) {
        throw new Error('Main frame is not found for executing code');
    }
    const runtimeModel = target.model(SDK.RuntimeModel.RuntimeModel);
    const pageAgent = target.pageAgent();
    // This returns previously created world if it exists for the frame.
    const { executionContextId } = await pageAgent.invoke_createIsolatedWorld({ frameId, worldName: FREESTYLER_WORLD_NAME });
    const executionContext = runtimeModel?.executionContext(executionContextId);
    if (!executionContext) {
        throw new Error('Execution context is not found for executing code');
    }
    if (executionContext.debuggerModel.selectedCallFrame()) {
        return formatError('Cannot evaluate JavaScript because the execution is paused on a breakpoint.');
    }
    const remoteObject = await contextNode.resolveToObject(undefined, executionContextId);
    if (!remoteObject) {
        throw new Error('Cannot execute JavaScript because remote object cannot be resolved');
    }
    return await EvaluateAction.execute(functionDeclaration, [remoteObject], executionContext, { throwOnSideEffect });
}
const MAX_OBSERVATION_BYTE_LENGTH = 25_000;
const OBSERVATION_TIMEOUT = 5_000;
export class NodeContext extends ConversationContext {
    #node;
    constructor(node) {
        super();
        this.#node = node;
    }
    getOrigin() {
        const ownerDocument = this.#node.ownerDocument;
        if (!ownerDocument) {
            // The node is detached from a document.
            return 'detached';
        }
        return new URL(ownerDocument.documentURL).origin;
    }
    getItem() {
        return this.#node;
    }
    getTitle() {
        throw new Error('Not implemented');
    }
    async getSuggestions() {
        const layoutProps = await this.#node.domModel().cssModel().getLayoutPropertiesFromComputedStyle(this.#node.id);
        if (!layoutProps) {
            return;
        }
        if (layoutProps.isFlex) {
            return [
                { title: 'How can I make flex items wrap?', jslogContext: 'flex-wrap' },
                { title: 'How do I distribute flex items evenly?', jslogContext: 'flex-distribute' },
                { title: 'What is flexbox?', jslogContext: 'flex-what' },
            ];
        }
        if (layoutProps.isSubgrid) {
            return [
                { title: 'Where is this grid defined?', jslogContext: 'subgrid-where' },
                { title: 'How to overwrite parent grid properties?', jslogContext: 'subgrid-override' },
                { title: 'How do subgrids work? ', jslogContext: 'subgrid-how' },
            ];
        }
        if (layoutProps.isGrid) {
            return [
                { title: 'How do I align items in a grid?', jslogContext: 'grid-align' },
                { title: 'How to add spacing between grid items?', jslogContext: 'grid-gap' },
                { title: 'How does grid layout work?', jslogContext: 'grid-how' },
            ];
        }
        if (layoutProps.hasScroll) {
            return [
                { title: 'How do I remove scrollbars for this element?', jslogContext: 'scroll-remove' },
                { title: 'How can I style a scrollbar?', jslogContext: 'scroll-style' },
                { title: 'Why does this element scroll?', jslogContext: 'scroll-why' },
            ];
        }
        if (layoutProps.containerType) {
            return [
                { title: 'What are container queries?', jslogContext: 'container-what' },
                { title: 'How do I use container-type?', jslogContext: 'container-how' },
                { title: 'What\'s the container context for this element?', jslogContext: 'container-context' },
            ];
        }
        return;
    }
}
/**
 * One agent instance handles one conversation. Create a new agent
 * instance for a new conversation.
 */
export class StylingAgent extends AiAgent {
    preamble = preamble;
    clientFeature = Host.AidaClient.ClientFeature.CHROME_STYLING_AGENT;
    get userTier() {
        return Root.Runtime.hostConfig.devToolsFreestyler?.userTier;
    }
    get executionMode() {
        return Root.Runtime.hostConfig.devToolsFreestyler?.executionMode ??
            Root.Runtime.HostConfigFreestylerExecutionMode.ALL_SCRIPTS;
    }
    get options() {
        const temperature = Root.Runtime.hostConfig.devToolsFreestyler?.temperature;
        const modelId = Root.Runtime.hostConfig.devToolsFreestyler?.modelId;
        return {
            temperature,
            modelId,
        };
    }
    get multimodalInputEnabled() {
        return Boolean(Root.Runtime.hostConfig.devToolsFreestyler?.multimodal);
    }
    preambleFeatures() {
        return ['function_calling'];
    }
    #execJs;
    #changes;
    #createExtensionScope;
    constructor(opts) {
        super(opts);
        this.#changes = opts.changeManager || new ChangeManager();
        this.#execJs = opts.execJs ?? executeJsCode;
        this.#createExtensionScope = opts.createExtensionScope ?? ((changes) => {
            return new ExtensionScope(changes, this.sessionId, this.context?.getItem() ?? null);
        });
        this.declareFunction('getStyles', {
            description: `Get computed and source styles for one or multiple elements on the inspected page for multiple elements at once by uid.

**CRITICAL** Use selectors to refer to elements in the text output. Do not use uids.
**CRITICAL** Always provide the explanation argument to explain what and why you query.`,
            parameters: {
                type: 6 /* Host.AidaClient.ParametersTypes.OBJECT */,
                description: '',
                nullable: false,
                properties: {
                    explanation: {
                        type: 1 /* Host.AidaClient.ParametersTypes.STRING */,
                        description: 'Explain why you want to get styles',
                        nullable: false,
                    },
                    elements: {
                        type: 5 /* Host.AidaClient.ParametersTypes.ARRAY */,
                        description: 'A list of element uids to get data for',
                        items: { type: 1 /* Host.AidaClient.ParametersTypes.STRING */, description: `An element uid.` },
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
                }
            },
            displayInfoFromArgs: params => {
                return {
                    title: 'Reading computed and source styles',
                    thought: params.explanation,
                    action: `getStyles(${JSON.stringify(params.elements)}, ${JSON.stringify(params.styleProperties)})`,
                };
            },
            handler: async (params) => {
                return await this.getStyles(params.elements, params.styleProperties);
            },
        });
        this.declareFunction('executeJavaScript', {
            description: `This function allows you to run JavaScript code on the inspected page to access the element styles and page content.
Call this function to gather additional information or modify the page state. Call this function enough times to investigate the user request.`,
            parameters: {
                type: 6 /* Host.AidaClient.ParametersTypes.OBJECT */,
                description: '',
                nullable: false,
                properties: {
                    code: {
                        type: 1 /* Host.AidaClient.ParametersTypes.STRING */,
                        description: `JavaScript code snippet to run on the inspected page. Make sure the code is formatted for readability.

# Instructions

* To return data, define a top-level \`data\` variable and populate it with data you want to get. Only JSON-serializable objects can be assigned to \`data\`.
* If you modify styles on an element, ALWAYS call the pre-defined global \`async setElementStyles(el: Element, styles: object)\` function. This function is an internal mechanism for you and should never be presented as a command/advice to the user.
* **CRITICAL** Only get styles that might be relevant to the user request.
* **CRITICAL** Never assume a selector for the elements unless you verified your knowledge.
* **CRITICAL** Consider that \`data\` variable from the previous function calls are not available in a new function call.

For example, the code to change element styles:

\`\`\`
await setElementStyles($0, {
  color: 'blue',
});
\`\`\`

For example, the code to get overlapping elements:

\`\`\`
const data = {
  overlappingElements: Array.from(document.querySelectorAll('*'))
    .filter(el => {
      const rect = el.getBoundingClientRect();
      const popupRect = $0.getBoundingClientRect();
      return (
        el !== $0 &&
        rect.left < popupRect.right &&
        rect.right > popupRect.left &&
        rect.top < popupRect.bottom &&
        rect.bottom > popupRect.top
      );
    })
    .map(el => ({
      tagName: el.tagName,
      id: el.id,
      className: el.className,
      zIndex: window.getComputedStyle(el)['z-index']
    }))
};
\`\`\`
`,
                    },
                    thought: {
                        type: 1 /* Host.AidaClient.ParametersTypes.STRING */,
                        description: 'Explain why you want to run this code',
                    },
                    title: {
                        type: 1 /* Host.AidaClient.ParametersTypes.STRING */,
                        description: 'Provide a summary of what the code does. For example, "Checking related element styles".',
                    },
                },
            },
            displayInfoFromArgs: params => {
                return {
                    title: params.title,
                    thought: params.thought,
                    action: params.code,
                };
            },
            handler: async (params, options) => {
                return await this.executeAction(params.code, options);
            },
        });
        if (Annotations.AnnotationRepository.annotationsEnabled()) {
            this.declareFunction('addElementAnnotation', {
                description: 'Adds a visual annotation in the Elements panel, attached to a node with ' +
                    'the specific UID provided. Use it to highlight nodes in the Elements panel ' +
                    'and provide contextual suggestions to the user related to their queries.',
                parameters: {
                    type: 6 /* Host.AidaClient.ParametersTypes.OBJECT */,
                    description: '',
                    nullable: false,
                    properties: {
                        elementId: {
                            type: 1 /* Host.AidaClient.ParametersTypes.STRING */,
                            description: 'The UID of the element to annotate.',
                            nullable: false,
                        },
                        annotationMessage: {
                            type: 1 /* Host.AidaClient.ParametersTypes.STRING */,
                            description: 'The message the annotation should show to the user.',
                            nullable: false,
                        },
                    },
                },
                handler: async (params) => {
                    return await this.addElementAnnotation(params.elementId, params.annotationMessage);
                },
            });
        }
    }
    async generateObservation(action, { throwOnSideEffect, }) {
        const functionDeclaration = `async function ($0) {
  try {
    ${action}
    ;
    return ((typeof data !== "undefined") ? data : undefined);
  } catch (error) {
    return error;
  }
}`;
        try {
            const result = await Promise.race([
                this.#execJs(functionDeclaration, {
                    throwOnSideEffect,
                    contextNode: this.context?.getItem() || null,
                }),
                new Promise((_, reject) => {
                    setTimeout(() => reject(new Error('Script execution exceeded the maximum allowed time.')), OBSERVATION_TIMEOUT);
                }),
            ]);
            const byteCount = Platform.StringUtilities.countWtf8Bytes(result);
            Host.userMetrics.freestylerEvalResponseSize(byteCount);
            if (byteCount > MAX_OBSERVATION_BYTE_LENGTH) {
                throw new Error('Output exceeded the maximum allowed length.');
            }
            return {
                observation: result,
                sideEffect: false,
                canceled: false,
            };
        }
        catch (error) {
            if (error instanceof SideEffectError) {
                return {
                    observation: error.message,
                    sideEffect: true,
                    canceled: false,
                };
            }
            return {
                observation: `Error: ${error.message}`,
                sideEffect: false,
                canceled: false,
            };
        }
    }
    static async describeElement(element) {
        let output = `* Element's uid is ${element.backendNodeId()}.
* Its selector is \`${element.simpleSelector()}\``;
        const childNodes = await element.getChildNodesPromise();
        if (childNodes) {
            const textChildNodes = childNodes.filter(childNode => childNode.nodeType() === Node.TEXT_NODE);
            const elementChildNodes = childNodes.filter(childNode => childNode.nodeType() === Node.ELEMENT_NODE);
            switch (elementChildNodes.length) {
                case 0:
                    output += '\n* It doesn\'t have any child element nodes';
                    break;
                case 1:
                    output += `\n* It only has 1 child element node: \`${elementChildNodes[0].simpleSelector()}\``;
                    break;
                default:
                    output += `\n* It has ${elementChildNodes.length} child element nodes: ${elementChildNodes.map(node => `\`${node.simpleSelector()}\` (uid=${node.backendNodeId()})`).join(', ')}`;
            }
            switch (textChildNodes.length) {
                case 0:
                    output += '\n* It doesn\'t have any child text nodes';
                    break;
                case 1:
                    output += '\n* It only has 1 child text node';
                    break;
                default:
                    output += `\n* It has ${textChildNodes.length} child text nodes`;
            }
        }
        if (element.nextSibling) {
            const elementOrNodeElementNodeText = element.nextSibling.nodeType() === Node.ELEMENT_NODE ?
                `an element (uid=${element.nextSibling.backendNodeId()})` :
                'a non element';
            output += `\n* It has a next sibling and it is ${elementOrNodeElementNodeText} node`;
        }
        if (element.previousSibling) {
            const elementOrNodeElementNodeText = element.previousSibling.nodeType() === Node.ELEMENT_NODE ?
                `an element (uid=${element.previousSibling.backendNodeId()})` :
                'a non element';
            output += `\n* It has a previous sibling and it is ${elementOrNodeElementNodeText} node`;
        }
        if (element.isInShadowTree()) {
            output += '\n* It is in a shadow DOM tree.';
        }
        const parentNode = element.parentNode;
        if (parentNode) {
            const parentChildrenNodes = await parentNode.getChildNodesPromise();
            output += `\n* Its parent's selector is \`${parentNode.simpleSelector()}\` (uid=${parentNode.backendNodeId()})`;
            const elementOrNodeElementNodeText = parentNode.nodeType() === Node.ELEMENT_NODE ? 'an element' : 'a non element';
            output += `\n* Its parent is ${elementOrNodeElementNodeText} node`;
            if (parentNode.isShadowRoot()) {
                output += '\n* Its parent is a shadow root.';
            }
            if (parentChildrenNodes) {
                const childElementNodes = parentChildrenNodes.filter(siblingNode => siblingNode.nodeType() === Node.ELEMENT_NODE);
                switch (childElementNodes.length) {
                    case 0:
                        break;
                    case 1:
                        output += '\n* Its parent has only 1 child element node';
                        break;
                    default:
                        output += `\n* Its parent has ${childElementNodes.length} child element nodes: ${childElementNodes.map(node => `\`${node.simpleSelector()}\` (uid=${node.backendNodeId()})`)
                            .join(', ')}`;
                        break;
                }
                const siblingTextNodes = parentChildrenNodes.filter(siblingNode => siblingNode.nodeType() === Node.TEXT_NODE);
                switch (siblingTextNodes.length) {
                    case 0:
                        break;
                    case 1:
                        output += '\n* Its parent has only 1 child text node';
                        break;
                    default:
                        output += `\n* Its parent has ${siblingTextNodes.length} child text nodes: ${siblingTextNodes.map(node => `\`${node.simpleSelector()}\``).join(', ')}`;
                        break;
                }
            }
        }
        return output.trim();
    }
    #getSelectedNode() {
        return this.context?.getItem() ?? null;
    }
    async getStyles(elements, properties) {
        const result = {};
        for (const uid of elements) {
            result[uid] = { computed: {}, authored: {} };
            debugLog(`Action to execute: uid=${uid}`);
            const selectedNode = this.#getSelectedNode();
            if (!selectedNode) {
                return { error: 'Error: Could not find the currently selected element.' };
            }
            const node = new SDK.DOMModel.DeferredDOMNode(selectedNode.domModel().target(), Number(uid));
            const resolved = await node.resolvePromise();
            if (!resolved) {
                return { error: 'Error: Could not find the element with uid=' + uid };
            }
            const styles = await resolved.domModel().cssModel().getComputedStyle(resolved.id);
            if (!styles) {
                return { error: 'Error: Could not get computed styles.' };
            }
            const matchedStyles = await resolved.domModel().cssModel().getMatchedStyles(resolved.id);
            if (!matchedStyles) {
                return { error: 'Error: Could not get authored styles.' };
            }
            for (const prop of properties) {
                result[uid].computed[prop] = styles.get(prop);
            }
            for (const style of matchedStyles.nodeStyles()) {
                for (const property of style.allProperties()) {
                    if (!properties.includes(property.name)) {
                        continue;
                    }
                    const state = matchedStyles.propertyState(property);
                    if (state === "Active" /* SDK.CSSMatchedStyles.PropertyState.ACTIVE */) {
                        result[uid].authored[property.name] = property.value;
                    }
                }
            }
        }
        return {
            result: JSON.stringify(result, null, 2),
        };
    }
    async executeAction(action, options) {
        debugLog(`Action to execute: ${action}`);
        if (options?.approved === false) {
            return {
                error: 'Error: User denied code execution with side effects.',
            };
        }
        if (this.executionMode === Root.Runtime.HostConfigFreestylerExecutionMode.NO_SCRIPTS) {
            return {
                error: 'Error: JavaScript execution is currently disabled.',
            };
        }
        const selectedNode = this.#getSelectedNode();
        if (!selectedNode) {
            return { error: 'Error: no selected node found.' };
        }
        const target = selectedNode.domModel().target();
        if (target.model(SDK.DebuggerModel.DebuggerModel)?.selectedCallFrame()) {
            return {
                error: 'Error: Cannot evaluate JavaScript because the execution is paused on a breakpoint.',
            };
        }
        const scope = this.#createExtensionScope(this.#changes);
        await scope.install();
        try {
            let throwOnSideEffect = true;
            if (options?.approved) {
                throwOnSideEffect = false;
            }
            const result = await this.generateObservation(action, { throwOnSideEffect });
            debugLog(`Action result: ${JSON.stringify(result)}`);
            if (result.sideEffect) {
                if (this.executionMode === Root.Runtime.HostConfigFreestylerExecutionMode.SIDE_EFFECT_FREE_SCRIPTS_ONLY) {
                    return {
                        error: 'Error: JavaScript execution that modifies the page is currently disabled.',
                    };
                }
                if (options?.signal?.aborted) {
                    return {
                        error: 'Error: evaluation has been cancelled',
                    };
                }
                return {
                    requiresApproval: true,
                };
            }
            if (result.canceled) {
                return {
                    error: result.observation,
                };
            }
            return {
                result: result.observation,
            };
        }
        finally {
            await scope.uninstall();
        }
    }
    async addElementAnnotation(elementId, annotationMessage) {
        if (!Annotations.AnnotationRepository.annotationsEnabled()) {
            console.warn('Received agent request to add annotation with annotations disabled');
            return { error: 'Annotations are not currently enabled' };
        }
        // eslint-disable-next-line no-console
        console.log(`AI AGENT EVENT: Styling Agent adding annotation for element ${elementId} with message '${annotationMessage}'`);
        const selectedNode = this.#getSelectedNode();
        if (!selectedNode) {
            return { error: 'Error: Unable to find currently selected element.' };
        }
        const domModel = selectedNode.domModel();
        const backendNodeId = Number(elementId);
        const nodeMap = await domModel.pushNodesByBackendIdsToFrontend(new Set([backendNodeId]));
        const node = nodeMap?.get(backendNodeId);
        if (!node) {
            return { error: `Error: Could not find the element with backendNodeId=${elementId}` };
        }
        Annotations.AnnotationRepository.instance().addElementsAnnotation(annotationMessage, node);
        return {
            result: `Annotation added for element ${elementId}: ${annotationMessage}`,
        };
    }
    async *handleContextDetails(selectedElement) {
        if (!selectedElement) {
            return;
        }
        yield {
            type: "context" /* ResponseType.CONTEXT */,
            title: lockedString(UIStringsNotTranslate.analyzingThePrompt),
            details: [{
                    title: lockedString(UIStringsNotTranslate.dataUsed),
                    text: await StylingAgent.describeElement(selectedElement.getItem()),
                }],
        };
    }
    async enhanceQuery(query, selectedElement, multimodalInputType) {
        const elementEnchancementQuery = selectedElement ?
            `# Inspected element\n\n${await StylingAgent.describeElement(selectedElement.getItem())}\n\n# User request\n\n` :
            '';
        const multimodalInputEnhancementQuery = this.multimodalInputEnabled && multimodalInputType ? MULTIMODAL_ENHANCEMENT_PROMPTS[multimodalInputType] : '';
        return `${multimodalInputEnhancementQuery}${elementEnchancementQuery}QUERY: ${query}`;
    }
}
//# sourceMappingURL=StylingAgent.js.map