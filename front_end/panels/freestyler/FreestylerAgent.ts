// Copyright 2024 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as Common from '../../core/common/common.js';
import * as Host from '../../core/host/host.js';
import * as Platform from '../../core/platform/platform.js';
import * as SDK from '../../core/sdk/sdk.js';
import * as UI from '../../ui/legacy/legacy.js';

import {ChangeManager} from './ChangeManager.js';
import {ExtensionScope, FREESTYLER_WORLD_NAME} from './ExtensionScope.js';
import {ExecutionError, FreestylerEvaluateAction, SideEffectError} from './FreestylerEvaluateAction.js';

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
* Use \`window.getComputedStyle\` to gather **rendered** styles and make sure that you take the distinction between authored styles and computed styles into account.
* **CRITICAL** Use \`window.getComputedStyle\` ALWAYS with property access, like \`window.getComputedStyle($0.parentElement)['color']\`.
* **CRITICAL** Never assume a selector for the elements unless you verified your knowledge.
* **CRITICAL** Consider that \`data\` variable from the previous ACTION blocks are not available in a different ACTION block.

# Instructions
You are going to answer to the query in these steps:
* THOUGHT
* TITLE
* ACTION
* ANSWER
* FIXABLE
Use THOUGHT to explain why you take the ACTION. Use TITLE to provide a short summary of the thought.
Use ACTION to evaluate JavaScript code on the page to gather all the data needed to answer the query and put it inside the data variable - then return STOP.
You have access to a special $0 variable referencing the current element in the scope of the JavaScript code.
OBSERVATION will be the result of running the JS code on the page.
After that, you can answer the question with ANSWER or run another ACTION query.
Please run ACTION again if the information you received is not enough to answer the query.
Please answer only if you are sure about the answer. Otherwise, explain why you're not able to answer.
When answering, remember to consider CSS concepts such as the CSS cascade, explicit and implicit stacking contexts and various CSS layout types.
When answering, always consider MULTIPLE possible solutions.
After the ANSWER, output FIXABLE: true if the user request needs a fix using JavaScript or Web APIs and it has not been fixed previously.

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
FIXABLE: true
`;
/* clang-format on */

export enum ResponseType {
  TITLE = 'title',
  THOUGHT = 'thought',
  ACTION = 'action',
  SIDE_EFFECT = 'side-effect',
  ANSWER = 'answer',
  ERROR = 'error',
  QUERYING = 'querying',
}

export interface AnswerResponse {
  type: ResponseType.ANSWER;
  text: string;
  rpcId?: number;
  fixable: boolean;
}

export const enum ErrorType {
  UNKNOWN = 'unknown',
  ABORT = 'abort',
  MAX_STEPS = 'max-steps',
}

export interface ErrorResponse {
  type: ResponseType.ERROR;
  error: ErrorType;
  rpcId?: number;
}

export interface TitleResponse {
  type: ResponseType.TITLE;
  title: string;
  rpcId?: number;
}

export interface ThoughtResponse {
  type: ResponseType.THOUGHT;
  thought: string;
  rpcId?: number;
}

export interface SideEffectResponse {
  type: ResponseType.SIDE_EFFECT;
  code: string;
  confirm: (confirm: boolean) => void;
  rpcId?: number;
}

export interface ActionResponse {
  type: ResponseType.ACTION;
  code: string;
  output: string;
  canceled: boolean;
  rpcId?: number;
}

export interface QueryResponse {
  type: ResponseType.QUERYING;
}

export type ResponseData =
    AnswerResponse|ErrorResponse|ActionResponse|SideEffectResponse|ThoughtResponse|TitleResponse|QueryResponse;

async function executeJsCode(code: string, {throwOnSideEffect}: {throwOnSideEffect: boolean}): Promise<string> {
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

  try {
    return await FreestylerEvaluateAction.execute(code, executionContext, {throwOnSideEffect});
  } catch (err) {
    if (err instanceof ExecutionError) {
      return `Error: ${err.message}`;
    }

    throw err;
  }
}

type HistoryChunk = {
  text: string,
  entity: Host.AidaClient.Entity,
};

const MAX_STEPS = 10;
const MAX_OBSERVATION_BYTE_LENGTH = 25_000;

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

interface AidaRequestOptions {
  input: string;
  preamble?: string;
  chatHistory?: Host.AidaClient.Chunk[];
  /**
   * @default false
   */
  serverSideLoggingEnabled?: boolean;
  sessionId?: string;
}

/**
 * One agent instance handles one conversation. Create a new agent
 * instance for a new conversation.
 */
export class FreestylerAgent {
  static buildRequest(opts: AidaRequestOptions): Host.AidaClient.AidaRequest {
    const config = Common.Settings.Settings.instance().getHostConfig();
    const temperature = config.devToolsFreestylerDogfood?.temperature;
    const request: Host.AidaClient.AidaRequest = {
      input: opts.input,
      preamble: opts.preamble,
      // eslint-disable-next-line @typescript-eslint/naming-convention
      chat_history: opts.chatHistory,
      client: Host.AidaClient.CLIENT_NAME,
      options: {
        ...(temperature !== undefined && temperature >= 0) && {temperature},
        model_id: config.devToolsFreestylerDogfood?.modelId ?? undefined,
      },
      metadata: {
        // TODO: disable logging based on query params.
        disable_user_content_logging: !(opts.serverSideLoggingEnabled ?? false),
        string_session_id: opts.sessionId,
        user_tier: Host.AidaClient.convertToUserTierEnum(config.devToolsFreestylerDogfood?.userTier),
      },
      // eslint-disable-next-line @typescript-eslint/naming-convention
      functionality_type: Host.AidaClient.FunctionalityType.CHAT,
      // eslint-disable-next-line @typescript-eslint/naming-convention
      client_feature: Host.AidaClient.ClientFeature.CHROME_FREESTYLER,
    };
    return request;
  }

  static parseResponse(response: string):
      {thought?: string, title?: string, action?: string, answer?: string, fixable: boolean} {
    const lines = response.split('\n');
    let thought: string|undefined;
    let title: string|undefined;
    let action: string|undefined;
    let answer: string|undefined;
    let fixable = false;
    let i = 0;
    const isInstructionStart = (line: string): boolean => {
      const trimmed = line.trim();
      return trimmed.startsWith('THOUGHT:') || trimmed.startsWith('OBSERVATION:') || trimmed.startsWith('TITLE:') ||
          trimmed.startsWith('ACTION') || trimmed.startsWith('ANSWER:') || trimmed.startsWith('FIXABLE:');
    };
    while (i < lines.length) {
      const trimmed = lines[i].trim();
      if (trimmed.startsWith('THOUGHT:') && !thought) {
        // TODO: multiline thoughts.
        thought = trimmed.substring('THOUGHT:'.length).trim();
        i++;
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
        // TODO: perhaps trying to parse with a Markdown parser would
        // yield more reliable results.
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
      } else if (trimmed.startsWith('FIXABLE: true')) {
        fixable = true;
        i++;
      } else {
        i++;
      }
    }
    // If we could not parse the parts, consider the response to be an
    // answer.
    if (!answer && !thought && !action) {
      answer = response;
    }
    return {thought, title, action, answer, fixable};
  }

  #aidaClient: Host.AidaClient.AidaClient;
  #chatHistory: Map<number, HistoryChunk[]> = new Map();
  #serverSideLoggingEnabled: boolean;

  #execJs: typeof executeJsCode;

  #confirmSideEffect: typeof Promise.withResolvers;
  readonly #sessionId = crypto.randomUUID();
  #changes: ChangeManager;
  #createExtensionScope: CreateExtensionScopeFunction;

  constructor(opts: AgentOptions) {
    this.#aidaClient = opts.aidaClient;
    this.#changes = opts.changeManager || new ChangeManager();
    this.#execJs = opts.execJs ?? executeJsCode;
    this.#createExtensionScope = opts.createExtensionScope ?? ((changes: ChangeManager) => {
                                   return new ExtensionScope(changes);
                                 });
    this.#serverSideLoggingEnabled = opts.serverSideLoggingEnabled ?? false;
    this.#confirmSideEffect = opts.confirmSideEffectForTest ?? (() => Promise.withResolvers());
    SDK.TargetManager.TargetManager.instance().addModelListener(
        SDK.ResourceTreeModel.ResourceTreeModel, SDK.ResourceTreeModel.Events.PrimaryPageChanged,
        this.onPrimaryPageChanged, this);
  }

  onPrimaryPageChanged(): void {
    void this.#changes.clear();
  }

  get #getHistoryEntry(): Array<HistoryChunk> {
    return [...this.#chatHistory.values()].flat();
  }

  get chatHistoryForTesting(): Array<HistoryChunk> {
    return this.#getHistoryEntry;
  }

  async #aidaFetch(
      request: Host.AidaClient.AidaRequest,
      options?: {signal?: AbortSignal},
      ): Promise<{
    response: string,
    rpcId: number|undefined,
    rawResponse: Host.AidaClient.AidaResponse|undefined,
  }> {
    let rawResponse: Host.AidaClient.AidaResponse|undefined = undefined;
    let response = '';
    let rpcId;
    for await (rawResponse of this.#aidaClient.fetch(request, options)) {
      response = rawResponse.explanation;
      rpcId = rawResponse.metadata.rpcGlobalId ?? rpcId;
      if (rawResponse.metadata.attributionMetadata?.some(
              meta => meta.attributionAction === Host.AidaClient.RecitationAction.BLOCK)) {
        throw new Error('Attribution action does not allow providing the response');
      }
    }

    return {response, rpcId, rawResponse};
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
    const actionExpression = `{
      const scope = {$0, $1, getEventListeners};
      with (scope) {
        ${action}
        ;((typeof data !== "undefined") ? data : undefined)
      }
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
      const result = await this.#execJs(
          actionExpression,
          {throwOnSideEffect},
      );
      const byteCount = Platform.StringUtilities.countWtf8Bytes(result);
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

    return output;
  }

  #runId = 0;
  async * run(query: string, options: {
    signal?: AbortSignal, selectedElement: SDK.DOMModel.DOMNode|null,
  }): AsyncGenerator<ResponseData, void, void> {
    const structuredLog = [];
    const elementEnchantmentQuery = options.selectedElement ?
        `# Inspected element\n\n${
            await FreestylerAgent.describeElement(options.selectedElement)}\n\n# User request\n\n` :
        '';
    query = `${elementEnchantmentQuery}QUERY: ${query}`;
    const currentRunId = ++this.#runId;

    for (let i = 0; i < MAX_STEPS; i++) {
      yield {
        type: ResponseType.QUERYING,
      };

      const request = FreestylerAgent.buildRequest({
        input: query,
        preamble,
        chatHistory: this.#chatHistory.size ? this.#getHistoryEntry : undefined,
        serverSideLoggingEnabled: this.#serverSideLoggingEnabled,
        sessionId: this.#sessionId,
      });
      let response: string;
      let rpcId: number|undefined;
      let rawResponse: Host.AidaClient.AidaResponse|undefined;
      try {
        const fetchResult = await this.#aidaFetch(
            request,
            {signal: options.signal},
        );
        response = fetchResult.response;
        rpcId = fetchResult.rpcId;
        rawResponse = fetchResult.rawResponse;
      } catch (err) {
        debugLog('Error calling the AIDA API', err);

        if (err instanceof Host.AidaClient.AidaAbortError) {
          this.#chatHistory.delete(currentRunId);
          yield {
            type: ResponseType.ERROR,
            error: ErrorType.ABORT,
            rpcId,
          };
          break;
        }

        yield {
          type: ResponseType.ERROR,
          error: ErrorType.UNKNOWN,
          rpcId,
        };
        break;
      }

      debugLog({
        iteration: i,
        request,
        response: rawResponse,
      });

      structuredLog.push({
        request: structuredClone(request),
        response,
      });

      const addToHistory = (text: string): void => {
        this.#chatHistory.set(currentRunId, [
          ...currentRunEntries,
          {
            text: query,
            entity: Host.AidaClient.Entity.USER,
          },
          {
            text,
            entity: Host.AidaClient.Entity.SYSTEM,
          },
        ]);
      };
      const currentRunEntries = this.#chatHistory.get(currentRunId) ?? [];
      const {thought, title, action, answer, fixable} = FreestylerAgent.parseResponse(response);
      // Sometimes the answer will follow an action and a thought. In
      // that case, we only use the action and the thought (if present)
      // since the answer is not based on the observation resulted from
      // the action.
      if (action) {
        if (title) {
          yield {
            type: ResponseType.TITLE,
            title,
            rpcId,
          };
        }

        if (thought) {
          addToHistory(`THOUGHT: ${thought}
TITLE: ${title}
ACTION
${action}
STOP`);
          yield {
            type: ResponseType.THOUGHT,
            thought,
            rpcId,
          };
        } else {
          addToHistory(`ACTION
${action}
STOP`);
        }
        debugLog(`Action to execute: ${action}`);
        const scope = this.#createExtensionScope(this.#changes);
        await scope.install();
        try {
          let result = await this.#generateObservation(action, {throwOnSideEffect: true});
          debugLog(`Action result: ${JSON.stringify(result)}`);
          if (result.sideEffect) {
            const sideEffectConfirmationPromiseWithResolvers = this.#confirmSideEffect<boolean>();
            if (isDebugMode()) {
              window.dispatchEvent(new CustomEvent(
                  'freestylersideeffect', {detail: {confirm: sideEffectConfirmationPromiseWithResolvers.resolve}}));
            }

            yield {
              type: ResponseType.SIDE_EFFECT,
              code: action,
              confirm: sideEffectConfirmationPromiseWithResolvers.resolve,
              rpcId,
            };

            result = await this.#generateObservation(action, {
              throwOnSideEffect: false,
              confirmExecJs: sideEffectConfirmationPromiseWithResolvers.promise,
            });
          }
          yield {
            type: ResponseType.ACTION,
            code: action,
            output: result.observation,
            canceled: result.canceled,
            rpcId,
          };

          query = `OBSERVATION: ${result.observation}`;
        } finally {
          await scope.uninstall();
        }
      } else if (answer) {
        addToHistory(`ANSWER: ${answer}`);
        yield {
          type: ResponseType.ANSWER,
          text: answer,
          rpcId,
          fixable,
        };
        break;
      } else {
        addToHistory(response);
        yield {
          type: ResponseType.ERROR,
          error: ErrorType.UNKNOWN,
          rpcId,
        };
        break;
      }

      if (i === MAX_STEPS - 1) {
        yield {
          type: ResponseType.ERROR,
          error: ErrorType.MAX_STEPS,
        };
        break;
      }
    }
    if (isDebugMode()) {
      localStorage.setItem('freestylerStructuredLog', JSON.stringify(structuredLog));
      window.dispatchEvent(new CustomEvent('freestylerdone'));
    }
  }
}

function isDebugMode(): boolean {
  return Boolean(localStorage.getItem('debugFreestylerEnabled'));
}

function debugLog(...log: unknown[]): void {
  if (!isDebugMode()) {
    return;
  }

  // eslint-disable-next-line no-console
  console.log(...log);
}

function setDebugFreestylerEnabled(enabled: boolean): void {
  if (enabled) {
    localStorage.setItem('debugFreestylerEnabled', 'true');
  } else {
    localStorage.removeItem('debugFreestylerEnabled');
  }
}

// @ts-ignore
globalThis.setDebugFreestylerEnabled = setDebugFreestylerEnabled;
