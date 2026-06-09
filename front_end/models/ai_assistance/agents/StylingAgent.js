// Copyright 2024 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.
import * as Host from '../../../core/host/host.js';
import * as Root from '../../../core/root/root.js';
import * as SDK from '../../../core/sdk/sdk.js';
import * as Greendev from '../../../models/greendev/greendev.js';
import * as Annotations from '../../annotations/annotations.js';
import * as Emulation from '../../emulation/emulation.js';
import { ChangeManager } from '../ChangeManager.js';
import { ExtensionScope } from '../ExtensionScope.js';
import { AI_ASSISTANCE_CSS_CLASS_NAME } from '../injected.js';
import { ToolRegistry } from '../tools/ToolRegistry.js';
import { AiAgent } from './AiAgent.js';
import { executeJavaScriptFunction, executeJsCode, JavascriptExecutor } from './ExecuteJavascript.js';
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
* Use the precision of Strunk & White, the brevity of Hemingway, and the simple clarity of Vonnegut. Don't add repeated information, and keep the whole answer short.
* **CRITICAL** NEVER write full Python programs - you should only write individual statements that invoke a single function from the provided library.
* **CRITICAL** NEVER output text before a function call. Always do a function call first.
* **CRITICAL** When answering questions about positioning or layout, ALWAYS inspect \`position\`, \`display\` and all other related properties. You MUST provide a specific list of CSS property names when calling functions to get styles. Do not use generic values like "all" or "*".
* **CRITICAL** You are a CSS/DOM/HTML debugging assistant. NEVER provide answers to questions of unrelated topics such as legal advice, financial advice, personal opinions, medical advice, religion, race, politics, sexuality, gender, or any other non web-development topics. Answer "Sorry, I can't answer that. I'm best at questions about debugging web pages." to such questions.

## Response Structure

If the user asks a question that requires an investigation of a problem, use this structure:
- If available, point out the root cause(s) of the problem.
  - Example: "**Root Cause**: The page is slow because of [reason]."
    - Example: "**Root Causes**:"
      - [Reason 1]
      - [Reason 2]
- if applicable, list actionable solution suggestion(s) in order of impact:
  - Example: "**Suggestion**: [Suggestion 1]
    - Example: "**Suggestions**:"
      - [Suggestion 1]
      - [Suggestion 2]`;
const emulationInstructions = `
# Emulation and Screenshots

* If asked to verify whether the page is visually broken or if there are display problems with specific devices, use the \`activateDeviceEmulation\` tool. This tool will activate emulation for a specified device and capture a screenshot.
* **DEVICE SELECTION**: You must choose the most closely related device match from the allowed list.
    * If the user asks about a specific device (e.g., "iPhone 6"), choose the closest match (e.g., "iPhone 6/7/8").
    * If the user specifies a generic category (e.g., "Android phone", "iPhone", "Samsung"), choose the device with the highest version number available in that category (e.g., "Pixel 7" or "Samsung Galaxy S20" for Android, "iPhone 14 Pro Max" for iPhone).
* **VISION DEFICIENCY**: If the user asks about checking for color blindness or vision issues, you can pass an optional \`visionDeficiency\` parameter to \`activateDeviceEmulation\`. Allowed values are: 'blurredVision', 'reducedContrast', 'achromatopsia', 'deuteranopia', 'protanopia', 'tritanopia'.
* **IMPORTANT**: This is a **TWO-STEP** process.
* **STEP 1**: Call \`activateDeviceEmulation\`. After calling this tool, YOU MUST STOP and tell the user that the screenshot has been captured and ask them whether they would like you to focus on specific sections of the screenshot or review it all for possible problems.
* **STEP 2**: The captured screenshot will be automatically attached to the user's **NEXT** query.
* **CRITICAL**: DO NOT try to investigate/analyze the page state or element visibility automatically. But, after the user has requested to analyze the page, you can prompt the user to select one of the problematic elements if they want to diagnose further.
* **CRITICAL**: The output of the analysis should only be in json form (no supplemental text) and the json should list the problems found on the device, with a short description of the problem. If identical problems are identified acress multiple devices, feel free to combine sections.
* **CRITICAL**: ALWAYS escape single and double quotes within the json output strings (\' and \").
*
* Example (with no duplication):

[
  {
    "Problem": "Element not resizing",
    "Element": "Hero banner",
    "NodeId": "23",
    "Details": "The \"hero\" element is not resizing because... etc etc."
  }
]

# Additional notes:

When referring to an element for which you know the nodeId, annotate your output using markdown link syntax:
- For example, if nodeId is 23: ([link](#node-23))
- Always prefix the nodeId with the 'node-' prefix when using the markdown syntax.
- This link will reveal the element in the Elements panel
- Never mention node or nodeId when referring to the element, and especially not in the link text.`;
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
export const AI_ASSISTANCE_FILTER_REGEX = `\\.${AI_ASSISTANCE_CSS_CLASS_NAME}-.*&`;
/**
 * One agent instance handles one conversation. Create a new agent
 * instance for a new conversation.
 */
export class StylingAgent extends AiAgent {
    preamble = preamble;
    clientFeature = Host.AidaClient.ClientFeature.CHROME_STYLING_AGENT;
    get userTier() {
        const greenDevEmulationEnabled = Greendev.Prototypes.instance().isEnabled('emulationCapabilities');
        return greenDevEmulationEnabled ? 'TESTERS' : Root.Runtime.hostConfig.devToolsFreestyler?.userTier;
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
    #execJs;
    #javascriptExecutor;
    #changes;
    #createExtensionScope;
    #greenDevEmulationScreenshot = null;
    #greenDevEmulationAxTree = null;
    #hasAddedEmulationInstructions = false;
    #currentTurnId = 0;
    constructor(opts) {
        super(opts);
        this.#changes = opts.changeManager || new ChangeManager();
        this.#execJs = opts.execJs ?? executeJsCode;
        this.#createExtensionScope =
            opts.createExtensionScope ?? ((changes) => {
                return new ExtensionScope(changes, this.sessionId, this.context?.getItem() ?? null, this.#currentTurnId);
            });
        this.#javascriptExecutor = new JavascriptExecutor({
            executionMode: this.executionMode,
            getContextNode: () => this.#getSelectedNode(),
            createExtensionScope: this.#createExtensionScope.bind(this),
            changes: this.#changes,
        }, this.#execJs);
        const getStylesTool = ToolRegistry.get("getStyles" /* ToolName.GET_STYLES */);
        if (!getStylesTool) {
            throw new Error('Required tool "getStyles" not found');
        }
        this.declareFunction("getStyles" /* ToolName.GET_STYLES */, {
            description: getStylesTool.description,
            parameters: getStylesTool.parameters,
            displayInfoFromArgs: getStylesTool.displayInfoFromArgs,
            handler: args => getStylesTool.handler(args, {
                conversationContext: this.context ?? null,
            }),
        });
        this.declareFunction('executeJavaScript', executeJavaScriptFunction(this.#javascriptExecutor));
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
                    required: ['elementId', 'annotationMessage']
                },
                handler: async (params) => {
                    return await this.addElementAnnotation(params.elementId, params.annotationMessage);
                },
            });
        }
        this.declareFunction('activateDeviceEmulation', {
            description: 'Sets emulation viewing mode for a specific device and optionally enables vision deficiency emulation.',
            parameters: {
                type: 6 /* Host.AidaClient.ParametersTypes.OBJECT */,
                description: '',
                nullable: false,
                properties: {
                    deviceName: {
                        type: 1 /* Host.AidaClient.ParametersTypes.STRING */,
                        description: 'The name of the device to emulate. Allowed values: Pixel 3 XL, Pixel 7, Samsung Galaxy S8+, Samsung Galaxy S20 Ultra, Surface Pro 7, Surface Duo, Galaxy Z Fold 5, Asus Zenbook Fold, Samsung Galaxy A51/71, Nest Hub Max, Nest Hub, iPhone 4, iPhone 5/SE, iPhone 6/7/8, iPhone SE, iPhone XR, iPhone 12 Pro, iPhone 14 Pro Max, iPad Mini, iPad Air, iPad Pro.',
                        nullable: false,
                    },
                    visionDeficiency: {
                        type: 1 /* Host.AidaClient.ParametersTypes.STRING */,
                        description: 'Optional vision deficiency to emulate. Allowed values: blurredVision, reducedContrast, achromatopsia, deuteranopia, protanopia, tritanopia.',
                        nullable: true,
                    },
                },
                required: ['deviceName']
            },
            handler: async (params) => {
                return await this.activateDeviceEmulation(params.deviceName, params.visionDeficiency);
            },
        });
    }
    #getSelectedNode() {
        return this.context?.getItem() ?? null;
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
    async #compressScreenshot(base64Data) {
        return await new Promise((resolve, reject) => {
            const img = new Image();
            img.onload = () => {
                // eslint-disable-next-line @devtools/no-imperative-dom-api
                const canvas = document.createElement('canvas');
                const maxDimension = 2000;
                let scale = 1;
                if (img.width > maxDimension || img.height > maxDimension) {
                    scale = maxDimension / Math.max(img.width, img.height);
                }
                canvas.width = img.width * scale;
                canvas.height = img.height * scale;
                const ctx = canvas.getContext('2d');
                if (!ctx) {
                    reject(new Error('Could not get canvas context'));
                    return;
                }
                ctx.imageSmoothingEnabled = true;
                ctx.imageSmoothingQuality = 'high';
                ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
                const dataUrl = canvas.toDataURL('image/jpeg', 0.9);
                resolve(dataUrl.split(',')[1]);
            };
            img.onerror = e => reject(new Error('Image load error: ' + e));
            img.src = 'data:image/png;base64,' + base64Data;
        });
    }
    async activateDeviceEmulation(deviceName, visionDeficiency) {
        const greenDevEmulationEnabled = Greendev.Prototypes.instance().isEnabled('emulationCapabilities');
        if (!greenDevEmulationEnabled) {
            return { error: `GreenDev emulation capabilities not enabled` };
        }
        // eslint-disable-next-line no-console
        console.log('activateDeviceEmulation called with device:', deviceName, 'visionDeficiency:', visionDeficiency);
        this.#greenDevEmulationScreenshot = null;
        this.#greenDevEmulationAxTree = null;
        const emulatedDevicesList = Emulation.EmulatedDevices.EmulatedDevicesList.instance();
        const device = emulatedDevicesList.standard().find(d => d.title === deviceName);
        if (!device) {
            return {
                error: `Could not find device "${deviceName}" in the list of emulated devices.`,
            };
        }
        const deviceModeModel = Emulation.DeviceModeModel.DeviceModeModel.instance();
        const verticalMode = device.modesForOrientation(Emulation.EmulatedDevices.Vertical)[0];
        if (!verticalMode) {
            return {
                error: `Could not find vertical mode for "${deviceName}".`,
            };
        }
        deviceModeModel.emulate(Emulation.DeviceModeModel.Type.Device, device, verticalMode);
        // Get the selected node early to use for both vision deficiency and wait mechanism.
        const selectedNode = this.#getSelectedNode();
        // Apply vision deficiency if provided (and turn it off when not provided).
        try {
            if (selectedNode) {
                const target = selectedNode.domModel().target();
                const emulationModel = target.model(SDK.EmulationModel.EmulationModel);
                if (emulationModel) {
                    let type = "none" /* Protocol.Emulation.SetEmulatedVisionDeficiencyRequestType.None */;
                    if (visionDeficiency && visionDeficiency !== 'none') {
                        type = visionDeficiency;
                    }
                    await target.emulationAgent().invoke_setEmulatedVisionDeficiency({ type });
                }
            }
            else {
                console.error('No selected node context to retrieve EmulationModel.');
            }
        }
        catch {
            return {
                error: `Unable to apply vision deficiency "${visionDeficiency}".`,
            };
        }
        // Wait for the layout to settle after emulation changes.
        // We use a double requestAnimationFrame to ensure at least one frame is rendered.
        if (selectedNode) {
            try {
                const code = 'await new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)))';
                // We use throwOnSideEffect: false because this is a benign wait, not a modification of the page state relevant to the user.
                await this.#execJs(code, { throwOnSideEffect: false, contextNode: selectedNode });
            }
            catch (e) {
                console.error('Failed to wait for layout settle:', e);
            }
        }
        const orientation = device.orientationByName(Emulation.EmulatedDevices.Vertical);
        const width = orientation.width;
        // TODO(finnur): Investigate better screen capture alternatives (that can do the whole page).
        let documentHeight = 2000;
        if (selectedNode) {
            try {
                const heightJs = 'document.body.scrollHeight';
                const result = await this.#execJs(heightJs, { throwOnSideEffect: false, contextNode: selectedNode });
                const parsedHeight = Number(result);
                if (!isNaN(parsedHeight)) {
                    documentHeight = Math.min(parsedHeight, 2000);
                }
            }
            catch (e) {
                console.error('Failed to get document height:', e);
            }
        }
        // Specify a clip capping the height to the top 5000px.
        const clip = {
            x: 0,
            y: 0,
            width,
            height: documentHeight,
            scale: 1,
        };
        // Capture using the clip. fullSize must be false when clip is used.
        const screenshot = await deviceModeModel.captureScreenshot(false, clip);
        if (!screenshot) {
            return {
                error: `Emulation for ${deviceName} activated, but failed to capture screenshot.`,
            };
        }
        try {
            this.#greenDevEmulationScreenshot = await this.#compressScreenshot(screenshot);
        }
        catch (e) {
            console.error('Screenshot compression failed, using original', e);
            this.#greenDevEmulationScreenshot = screenshot;
        }
        try {
            if (selectedNode) {
                const accessibilityModel = selectedNode.domModel().target().model(SDK.AccessibilityModel.AccessibilityModel);
                if (accessibilityModel) {
                    await accessibilityModel.resumeModel();
                    const axResponse = await accessibilityModel.agent.invoke_getFullAXTree({});
                    if (!axResponse.getError()) {
                        this.#greenDevEmulationAxTree = JSON.stringify(axResponse.nodes);
                    }
                    else {
                        console.error('Failed to capture Accessibility Tree:', axResponse.getError());
                    }
                }
            }
        }
        catch (e) {
            console.error('Exception capturing Accessibility Tree:', e);
        }
        let resultMsg = `Emulation for ${deviceName} activated and screenshot has been captured.`;
        if (visionDeficiency) {
            resultMsg += ` Vision deficiency "${visionDeficiency}" was also applied.`;
        }
        resultMsg += ' Ready for analysis.';
        return {
            result: resultMsg,
        };
    }
    popPendingMultimodalInput() {
        const greenDevEmulationEnabled = Greendev.Prototypes.instance().isEnabled('emulationCapabilities');
        if (!greenDevEmulationEnabled) {
            return undefined;
        }
        if (this.#greenDevEmulationScreenshot) {
            const data = this.#greenDevEmulationScreenshot;
            this.#greenDevEmulationScreenshot = null;
            return {
                type: "screenshot" /* MultimodalInputType.SCREENSHOT */,
                input: {
                    inlineData: {
                        data,
                        mimeType: 'image/jpeg',
                    },
                },
                id: crypto.randomUUID(),
            };
        }
        return undefined;
    }
    async *handleContextDetails(selectedElement) {
        if (selectedElement) {
            const details = await selectedElement.getUserFacingDetails();
            if (details) {
                yield {
                    type: "context" /* ResponseType.CONTEXT */,
                    details,
                };
            }
        }
    }
    async preRun() {
        this.#currentTurnId++;
    }
    async enhanceQuery(query, selectedElement, multimodalInputType) {
        let multimodalInputEnhancementQuery = this.multimodalInputEnabled && multimodalInputType ? MULTIMODAL_ENHANCEMENT_PROMPTS[multimodalInputType] : '';
        if (this.#greenDevEmulationAxTree) {
            multimodalInputEnhancementQuery += '\n# Accessibility Tree\n\n' + this.#greenDevEmulationAxTree;
            this.#greenDevEmulationAxTree = null;
        }
        if (Greendev.Prototypes.instance().isEnabled('emulationCapabilities') && !this.#hasAddedEmulationInstructions) {
            multimodalInputEnhancementQuery = emulationInstructions + '\n' + multimodalInputEnhancementQuery;
            this.#hasAddedEmulationInstructions = true;
        }
        const promptDetails = selectedElement ? await selectedElement.getPromptDetails() : null;
        const elementEnchancementQuery = promptDetails ? `${promptDetails}\n\n# User request\n\n` : '';
        return `${multimodalInputEnhancementQuery}${elementEnchancementQuery}QUERY: ${query}`;
    }
}
//# sourceMappingURL=StylingAgent.js.map