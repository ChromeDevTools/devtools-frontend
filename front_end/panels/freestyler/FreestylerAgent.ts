// Copyright 2024 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as Common from '../../core/common/common.js';
import * as Host from '../../core/host/host.js';
import * as i18n from '../../core/i18n/i18n.js';
import * as Platform from '../../core/platform/platform.js';
import * as Root from '../../core/root/root.js';
import * as SDK from '../../core/sdk/sdk.js';
import * as UI from '../../ui/legacy/legacy.js';
import * as LitHtml from '../../ui/lit-html/lit-html.js';

import {
  type ActionResponse,
  AgentType,
  AiAgent,
  type AidaRequestOptions,
  type ContextResponse,
  ConversationContext,
  debugLog,
  isDebugMode,
  type ParsedResponse,
  ResponseType,
  type SideEffectResponse,
} from './AiAgent.js';
import {ChangeManager} from './ChangeManager.js';
import {ExtensionScope, FREESTYLER_WORLD_NAME} from './ExtensionScope.js';
import {ExecutionError, FreestylerEvaluateAction, SideEffectError} from './FreestylerEvaluateAction.js';

/*
* Strings that don't need to be translated at this time.
*/
const UIStringsNotTranslate = {
  /**
   *@description Title for context details for Freestyler.
   */
  analyzingThePrompt: 'Analyzing the prompt',
  /**
   *@description Heading text for context details of Freestyler agent.
   */
  dataUsed: 'Data used',
};

const lockedString = i18n.i18n.lockedString;

/* clang-format off */
const preamble = `You are the most advanced CSS debugging assistant integrated into Chrome DevTools.
You always suggest considering the best web development practices and the newest platform features such as view transitions.
The user selected a DOM element in the browser's DevTools and sends a query about the page or the selected DOM element.

# Considerations
* After applying a fix, please ask the user to confirm if the fix worked or not.
* Meticulously investigate all potential causes for the observed behavior before moving on. Gather comprehensive information about the element's parent, siblings, children, and any overlapping elements, paying close attention to properties that are likely relevant to the query.
* Avoid making assumptions without sufficient evidence, and always seek further clarification if needed.
* Always explore multiple possible explanations for the observed behavior before settling on a conclusion.
* When presenting solutions, clearly distinguish between the primary cause and contributing factors.
* Please answer only if you are sure about the answer. Otherwise, explain why you're not able to answer.
* When answering, always consider MULTIPLE possible solutions.
* You're also capable of executing the fix for the issue user mentioned. Reflect this in your suggestions.
* Use \`window.getComputedStyle\` to gather **rendered** styles and make sure that you take the distinction between authored styles and computed styles into account.
* **CRITICAL** Use \`window.getComputedStyle\` ALWAYS with property access, like \`window.getComputedStyle($0.parentElement)['color']\`.
* **CRITICAL** Never assume a selector for the elements unless you verified your knowledge.
* **CRITICAL** Consider that \`data\` variable from the previous ACTION blocks are not available in a different ACTION block.
* **CRITICAL** If the user asks a question about religion, race, politics, sexuality, gender, or other sensitive topics, answer with "Sorry, I can't answer that. I'm best at questions about debugging web pages."

# Instructions
You are going to answer to the query in these steps:
* THOUGHT
* TITLE
* ACTION
* ANSWER
* SUGGESTIONS
Use THOUGHT to explain why you take the ACTION. Use TITLE to provide a short summary of the thought.
Use ACTION to evaluate JavaScript code on the page to gather all the data needed to answer the query and put it inside the data variable - then return STOP.
You have access to a special $0 variable referencing the current element in the scope of the JavaScript code.
OBSERVATION will be the result of running the JS code on the page.
After that, you can answer the question with ANSWER or run another ACTION query.
Please run ACTION again if the information you received is not enough to answer the query.
Please answer only if you are sure about the answer. Otherwise, explain why you're not able to answer.
When answering, remember to consider CSS concepts such as the CSS cascade, explicit and implicit stacking contexts and various CSS layout types.
When answering, always consider MULTIPLE possible solutions.
After the ANSWER, output SUGGESTIONS: string[] for the potential responses the user might give. Make sure that the array and the \`SUGGESTIONS: \` text is in the same line.

If you need to set styles on an HTML element, always call the \`async setElementStyles(el: Element, styles: object)\` function.

## Example session

QUERY: Why am I not able to see the popup in this case?

THOUGHT: There are a few reasons why a popup might not be visible. It could be related to its positioning, its z-index, its display property, or overlapping elements. Let's gather information about these properties for the popup, its parent, and any potentially overlapping elements.
TITLE: Analyzing popup, container, and overlaps
ACTION
const computedStyles = window.getComputedStyle($0);
const parentComputedStyles = window.getComputedStyle($0.parentElement);
const data = {
  numberOfChildren: $0.children.length,
  numberOfSiblings: $0.parentElement.children.length,
  hasPreviousSibling: !!$0.previousElementSibling,
  hasNextSibling: !!$0.nextElementSibling,
  elementStyles: {
    display: computedStyles['display'],
    visibility: computedStyles['visibility'],
    position: computedStyles['position'],
    clipPath: computedStyles['clip-path'],
    zIndex: computedStyles['z-index']
  },
  parentStyles: {
    display: parentComputedStyles['display'],
    visibility: parentComputedStyles['visibility'],
    position: parentComputedStyles['position'],
    clipPath: parentComputedStyles['clip-path'],
    zIndex: parentComputedStyles['z-index']
  },
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
STOP

OBSERVATION: {"elementStyles":{"display":"block","visibility":"visible","position":"absolute","zIndex":"3","opacity":"1"},"parentStyles":{"display":"block","visibility":"visible","position":"relative","zIndex":"1","opacity":"1"},"overlappingElements":[{"tagName":"HTML","id":"","className":"","zIndex":"auto"},{"tagName":"BODY","id":"","className":"","zIndex":"auto"},{"tagName":"DIV","id":"","className":"container","zIndex":"auto"},{"tagName":"DIV","id":"","className":"background","zIndex":"2"}]}"

ANSWER: Even though the popup itself has a z-index of 3, its parent container has position: relative and z-index: 1. This creates a new stacking context for the popup. Because the "background" div has a z-index of 2, which is higher than the stacking context of the popup, it is rendered on top, obscuring the popup.
SUGGESTIONS: ["What is a stacking context?", "How can I change the stacking order?"]
`;
/* clang-format on */

async function executeJsCode(
    functionDeclaration: string, {throwOnSideEffect}: {throwOnSideEffect: boolean}): Promise<string> {
  const selectedNode = UI.Context.Context.instance().flavor(SDK.DOMModel.DOMNode);
  const target = selectedNode?.domModel().target() ?? UI.Context.Context.instance().flavor(SDK.Target.Target);

  if (!target) {
    throw new Error('Target is not found for executing code');
  }

  const resourceTreeModel = target.model(SDK.ResourceTreeModel.ResourceTreeModel);
  const frameId = selectedNode?.frameId() ?? resourceTreeModel?.mainFrame?.id;

  if (!frameId) {
    throw new Error('Main frame is not found for executing code');
  }

  const runtimeModel = target.model(SDK.RuntimeModel.RuntimeModel);
  const pageAgent = target.pageAgent();

  // This returns previously created world if it exists for the frame.
  const {executionContextId} = await pageAgent.invoke_createIsolatedWorld({frameId, worldName: FREESTYLER_WORLD_NAME});
  const executionContext = runtimeModel?.executionContext(executionContextId);
  if (!executionContext) {
    throw new Error('Execution context is not found for executing code');
  }

  if (executionContext.debuggerModel.selectedCallFrame()) {
    throw new ExecutionError('Cannot evaluate JavaScript because the execution is paused on a breakpoint.');
  }

  const result = await executionContext.evaluate(
      {
        expression: '$0',
        returnByValue: false,
        includeCommandLineAPI: true,
      },
      false, false);

  if ('error' in result) {
    throw new ExecutionError('Cannot find $0');
  }

  try {
    return await FreestylerEvaluateAction.execute(
        functionDeclaration, [result.object], executionContext, {throwOnSideEffect});
  } catch (err) {
    if (err instanceof ExecutionError) {
      return `Error: ${err.message}`;
    }

    throw err;
  }
}

const MAX_OBSERVATION_BYTE_LENGTH = 25_000;
const OBSERVATION_TIMEOUT = 5_000;

type CreateExtensionScopeFunction = (changes: ChangeManager) => {
  install(): Promise<void>, uninstall(): Promise<void>,
};

type AgentOptions = {
  aidaClient: Host.AidaClient.AidaClient,
  changeManager?: ChangeManager,
  confirmSideEffectForTest?: typeof Promise.withResolvers,
  serverSideLoggingEnabled?: boolean,
  createExtensionScope?: CreateExtensionScopeFunction,
  execJs?: typeof executeJsCode,
};

export class NodeContext extends ConversationContext<SDK.DOMModel.DOMNode> {
  #node: SDK.DOMModel.DOMNode;

  constructor(node: SDK.DOMModel.DOMNode) {
    super();
    this.#node = node;
  }

  getOrigin(): string {
    const ownerDocument = this.#node.ownerDocument;
    if (!ownerDocument) {
      // The node is detached from a document.
      return 'detached';
    }
    return new URL(ownerDocument.documentURL).origin;
  }

  getItem(): SDK.DOMModel.DOMNode {
    return this.#node;
  }

  override getIcon(): HTMLElement {
    return document.createElement('span');
  }

  override getTitle(): string|ReturnType<typeof LitHtml.Directives.until> {
    return LitHtml.Directives.until(
        Common.Linkifier.Linkifier.linkify(this.#node),
    );
  }
}

/**
 * One agent instance handles one conversation. Create a new agent
 * instance for a new conversation.
 */
export class FreestylerAgent extends AiAgent<SDK.DOMModel.DOMNode> {
  override type = AgentType.FREESTYLER;

  readonly preamble = preamble;
  readonly clientFeature = Host.AidaClient.ClientFeature.CHROME_FREESTYLER;
  get userTier(): string|undefined {
    const config = Common.Settings.Settings.instance().getHostConfig();

    return config.devToolsFreestyler?.userTier;
  }
  get executionMode(): Root.Runtime.HostConfigFreestylerExecutionMode {
    const config = Common.Settings.Settings.instance().getHostConfig();

    return config.devToolsFreestyler?.executionMode ?? Root.Runtime.HostConfigFreestylerExecutionMode.ALL_SCRIPTS;
  }

  get options(): AidaRequestOptions {
    const config = Common.Settings.Settings.instance().getHostConfig();
    const temperature = config.devToolsFreestyler?.temperature;
    const modelId = config.devToolsFreestyler?.modelId;

    return {
      temperature,
      modelId,
    };
  }

  override parseResponse(response: string): ParsedResponse {
    // We're returning an empty answer to denote the erroneous case.
    if (!response) {
      return {answer: ''};
    }

    const lines = response.split('\n');
    let thought: string|undefined;
    let title: string|undefined;
    let action: string|undefined;
    let answer: string|undefined;
    let suggestions: [string, ...string[]]|undefined;
    let i = 0;

    // If one of these is present, it means we're going to follow the instruction tags
    // to parse the response. If none of these is present, we'll assume the whole `response`
    // to be the `answer`.
    const isDefiningInstructionStart = (line: string): boolean => {
      const trimmed = line.trim();
      return trimmed.startsWith('THOUGHT:') || trimmed.startsWith('ACTION') || trimmed.startsWith('ANSWER:');
    };

    const isInstructionStart = (line: string): boolean => {
      const trimmed = line.trim();
      return isDefiningInstructionStart(line) || trimmed.startsWith('OBSERVATION:') || trimmed.startsWith('TITLE:') ||
          trimmed.startsWith('SUGGESTIONS:');
    };

    // Sometimes agent answers with no "ANSWER: " tag at the start, and also does not
    // include any "defining instructions". Then we use the whole `response` as the answer.
    // However, that case sometimes includes `SUGGESTIONS: ` tag in the response which is then shown to the user.
    // The block below ensures that the response we parse always contains a defining instruction tag.
    const hasDefiningInstruction = lines.some(line => isDefiningInstructionStart(line));
    if (!hasDefiningInstruction) {
      return this.parseResponse(`ANSWER: ${response}`);
    }

    while (i < lines.length) {
      const trimmed = lines[i].trim();
      if (trimmed.startsWith('THOUGHT:') && !thought) {
        // Start with the initial `THOUGHT: text` line and move forward by one line.
        const thoughtLines = [trimmed.substring('THOUGHT:'.length).trim()];
        i++;
        // Move until we see a new instruction, otherwise we're still inside the `THOUGHT` block.
        while (i < lines.length && !isInstructionStart(lines[i])) {
          const trimmedLine = lines[i].trim();
          if (trimmedLine) {
            thoughtLines.push(trimmedLine);
          }
          i++;
        }
        thought = thoughtLines.join('\n');
      } else if (trimmed.startsWith('TITLE:')) {
        title = trimmed.substring('TITLE:'.length).trim();
        i++;
      } else if (trimmed.startsWith('ACTION') && !action) {
        const actionLines = [];
        i++;
        while (i < lines.length) {
          if (lines[i].trim() === 'STOP') {
            i++;
            break;
          }
          if (isInstructionStart(lines[i])) {
            break;
          }
          // Sometimes the code block is in the form of "`````\njs\n{code}`````"
          if (lines[i].trim() !== 'js') {
            actionLines.push(lines[i]);
          }
          i++;
        }

        // Sometimes the LLM puts the STOP response to the last line of the code block.
        // Here, we check whether the last line ends with STOP keyword and if so, remove it
        // from the last line.
        const lastActionLine = actionLines[actionLines.length - 1];
        if (lastActionLine && lastActionLine.endsWith('STOP')) {
          actionLines[actionLines.length - 1] = lastActionLine.substring(0, lastActionLine.length - 'STOP'.length);
        }
        action = actionLines.join('\n').replaceAll('```', '').replaceAll('``', '').trim();
      } else if (trimmed.startsWith('ANSWER:') && !answer) {
        const answerLines = [
          trimmed.substring('ANSWER:'.length).trim(),
        ];
        let j = i + 1;
        while (j < lines.length) {
          const line = lines[j].trim();
          if (isInstructionStart(line)) {
            break;
          }
          answerLines.push(lines[j]);
          j++;
        }
        answer = answerLines.join('\n').trim();
        i = j;
      } else if (trimmed.startsWith('SUGGESTIONS:')) {
        try {
          // TODO: Do basic validation this is an array with strings
          suggestions = JSON.parse(trimmed.substring('SUGGESTIONS:'.length).trim());
        } catch {
        }

        i++;
      } else {
        i++;
      }
    }

    // Sometimes the answer will follow an action and a thought. In
    // that case, we only use the action and the thought (if present)
    // since the answer is not based on the observation resulted from
    // the action.
    if (action) {
      return {
        title,
        thought,
        action,
      };
    }

    // If we have a thought and an answer we want to give priority
    // to the answer as no observation is happening.
    if (thought && !answer) {
      return {
        title,
        thought,
      };
    }

    return {
      // If we could not parse the parts, consider the response to be an
      // answer.
      answer: answer || response,
      suggestions,
    };
  }

  #execJs: typeof executeJsCode;
  #confirmSideEffect: typeof Promise.withResolvers;
  #changes: ChangeManager;
  #createExtensionScope: CreateExtensionScopeFunction;

  constructor(opts: AgentOptions) {
    super({
      aidaClient: opts.aidaClient,
      serverSideLoggingEnabled: opts.serverSideLoggingEnabled,
    });

    this.#changes = opts.changeManager || new ChangeManager();
    this.#execJs = opts.execJs ?? executeJsCode;
    this.#createExtensionScope = opts.createExtensionScope ?? ((changes: ChangeManager) => {
                                   return new ExtensionScope(changes);
                                 });
    this.#confirmSideEffect = opts.confirmSideEffectForTest ?? (() => Promise.withResolvers());
    SDK.TargetManager.TargetManager.instance().addModelListener(
        SDK.ResourceTreeModel.ResourceTreeModel, SDK.ResourceTreeModel.Events.PrimaryPageChanged,
        this.onPrimaryPageChanged, this);
  }

  onPrimaryPageChanged(): void {
    void this.#changes.clear();
  }

  async #generateObservation(
      action: string,
      {
        throwOnSideEffect,
        confirmExecJs: confirm,
      }: {
        throwOnSideEffect: boolean,
        confirmExecJs?: Promise<boolean>,
      },
      ): Promise<{
    observation: string,
    sideEffect: boolean,
    canceled: boolean,
  }> {
    const functionDeclaration = `async function ($0) {
      ${action}
      ;
      return ((typeof data !== "undefined") ? data : undefined);
    }`;
    try {
      const runConfirmed = await confirm ?? Promise.resolve(true);
      if (!runConfirmed) {
        return {
          observation: 'Error: User denied code execution with side effects.',
          sideEffect: false,
          canceled: true,
        };
      }
      const result = await Promise.race([
        this.#execJs(
            functionDeclaration,
            {throwOnSideEffect},
            ),
        new Promise<never>((_, reject) => {
          setTimeout(
              () => reject(new Error('Script execution exceeded the maximum allowed time.')), OBSERVATION_TIMEOUT);
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
    } catch (error) {
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

  static async describeElement(element: SDK.DOMModel.DOMNode): Promise<string> {
    let output = `* Its selector is \`${element.simpleSelector()}\``;
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
          output += `\n* It has ${elementChildNodes.length} child element nodes: ${
              elementChildNodes.map(node => `\`${node.simpleSelector()}\``).join(', ')}`;
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
      const elementOrNodeElementNodeText =
          element.nextSibling.nodeType() === Node.ELEMENT_NODE ? 'an element' : 'a non element';
      output += `\n* It has a next sibling and it is ${elementOrNodeElementNodeText} node`;
    }

    if (element.previousSibling) {
      const elementOrNodeElementNodeText =
          element.previousSibling.nodeType() === Node.ELEMENT_NODE ? 'an element' : 'a non element';
      output += `\n* It has a previous sibling and it is ${elementOrNodeElementNodeText} node`;
    }

    const parentNode = element.parentNode;
    if (parentNode) {
      const parentChildrenNodes = await parentNode.getChildNodesPromise();
      output += `\n* Its parent's selector is \`${parentNode.simpleSelector()}\``;
      if (parentChildrenNodes) {
        const childElementNodes =
            parentChildrenNodes.filter(siblingNode => siblingNode.nodeType() === Node.ELEMENT_NODE);
        switch (childElementNodes.length) {
          case 0:
            break;
          case 1:
            output += '\n* Its parent has only 1 child element node';
            break;
          default:
            output += `\n* Its parent has ${childElementNodes.length} child element nodes: ${
                childElementNodes.map(node => `\`${node.simpleSelector()}\``).join(', ')}`;
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
            output += `\n* Its parent has ${siblingTextNodes.length} child text nodes: ${
                siblingTextNodes.map(node => `\`${node.simpleSelector()}\``).join(', ')}`;
            break;
        }
      }
    }

    return output.trim();
  }

  override async *
      handleAction(action: string, rpcId?: number): AsyncGenerator<SideEffectResponse, ActionResponse, void> {
    debugLog(`Action to execute: ${action}`);
    if (this.executionMode === Root.Runtime.HostConfigFreestylerExecutionMode.NO_SCRIPTS) {
      return {
        type: ResponseType.ACTION,
        code: action,
        output: 'Error: JavaScript execution is currently disabled.',
        canceled: true,
        rpcId,
      };
    }

    const scope = this.#createExtensionScope(this.#changes);
    await scope.install();
    try {
      let result = await this.#generateObservation(action, {throwOnSideEffect: true});
      debugLog(`Action result: ${JSON.stringify(result)}`);
      if (result.sideEffect) {
        if (this.executionMode === Root.Runtime.HostConfigFreestylerExecutionMode.SIDE_EFFECT_FREE_SCRIPTS_ONLY) {
          return {
            type: ResponseType.ACTION,
            code: action,
            output: 'Error: JavaScript execution that modifies the page is currently disabled.',
            canceled: true,
            rpcId,
          };
        }

        const sideEffectConfirmationPromiseWithResolvers = this.#confirmSideEffect<boolean>();
        if (isDebugMode()) {
          window.dispatchEvent(new CustomEvent(
              'freestylersideeffect', {detail: {confirm: sideEffectConfirmationPromiseWithResolvers.resolve}}));
        }

        yield {
          type: ResponseType.SIDE_EFFECT,
          code: action,
          confirm: (result: boolean) => {
            sideEffectConfirmationPromiseWithResolvers.resolve(result);
            Host.userMetrics.actionTaken(
                result ? Host.UserMetrics.Action.AiAssistanceSideEffectConfirmed :
                         Host.UserMetrics.Action.AiAssistanceSideEffectRejected,
            );
          },
          rpcId,
        };

        result = await this.#generateObservation(action, {
          throwOnSideEffect: false,
          confirmExecJs: sideEffectConfirmationPromiseWithResolvers.promise,
        });
      }
      return {
        type: ResponseType.ACTION,
        code: action,
        output: result.observation,
        canceled: result.canceled,
        rpcId,
      };
    } finally {
      await scope.uninstall();
    }
  }

  override async *
      handleContextDetails(selectedElement: ConversationContext<SDK.DOMModel.DOMNode>|null):
          AsyncGenerator<ContextResponse, void, void> {
    if (!selectedElement) {
      return;
    }
    yield {
      type: ResponseType.CONTEXT,
      title: lockedString(UIStringsNotTranslate.analyzingThePrompt),
      details: [{
        title: lockedString(UIStringsNotTranslate.dataUsed),
        text: await FreestylerAgent.describeElement(selectedElement.getItem()),
      }],
    };
  }

  override async enhanceQuery(query: string, selectedElement: ConversationContext<SDK.DOMModel.DOMNode>|null):
      Promise<string> {
    const elementEnchantmentQuery = selectedElement ?
        `# Inspected element\n\n${
            await FreestylerAgent.describeElement(selectedElement.getItem())}\n\n# User request\n\n` :
        '';
    return `${elementEnchantmentQuery}QUERY: ${query}`;
  }

  override formatHistoryChunkAnswer(text: string): string {
    return `ANSWER: ${text}`;
  }
}
