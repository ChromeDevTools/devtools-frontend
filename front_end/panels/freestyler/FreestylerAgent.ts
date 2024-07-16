// Copyright 2024 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as Common from '../../core/common/common.js';
import * as Host from '../../core/host/host.js';
import * as Platform from '../../core/platform/platform.js';
import * as SDK from '../../core/sdk/sdk.js';
import * as UI from '../../ui/legacy/legacy.js';

import {ExecutionError, FreestylerEvaluateAction, SideEffectError} from './FreestylerEvaluateAction.js';

const preamble = `You are a CSS debugging assistant integrated into Chrome DevTools.
The user selected a DOM element in the browser's DevTools and sends a CSS-related
query about the selected DOM element. You are going to answer to the query in these steps:
* THOUGHT
* ACTION
* ANSWER
Use THOUGHT to explain why you take the ACTION.
Use ACTION to evaluate JavaScript code on the page to gather all the data needed to answer the query and put it inside the data variable - then return STOP.
You have access to a special $0 variable referencing the current element in the scope of the JavaScript code.
OBSERVATION will be the result of running the JS code on the page.
After that, you can answer the question with ANSWER or run another ACTION query.
Please run ACTION again if the information you received is not enough to answer the query.
Please answer only if you are sure about the answer. Otherwise, explain why you're not able to answer.
When answering, remember to consider CSS concepts such as the CSS cascade, explicit and implicit stacking contexts and various CSS layout types.
When answering, always consider MULTIPLE possible solutions.

Example:
ACTION
const data = {
  color: window.getComputedStyle($0)['color'],
  backgroundColor: window.getComputedStyle($0)['backgroundColor'],
}
STOP

Example session:

QUERY: Why is this element centered in its container?
THOUGHT: Let's check the layout properties of the container.
ACTION
/* COLLECT_INFORMATION_HERE */
const data = {
  /* THE RESULT YOU ARE GOING TO USE AS INFORMATION */
}
STOP

You will be called again with this:
OBSERVATION
/* OBJECT_CONTAINING_YOUR_DATA */

You then output:
ANSWER: The element is centered on the page because the parent is a flex container with justify-content set to center.

The example session ends here.`;

export const FIX_THIS_ISSUE_PROMPT = 'Fix this issue using JavaScript code execution';

export enum Step {
  THOUGHT = 'thought',
  ACTION = 'action',
  ANSWER = 'answer',
  ERROR = 'error',
  QUERYING = 'querying',
}

export interface CommonStepData {
  step: Step.THOUGHT|Step.ANSWER|Step.ERROR;
  text: string;
  rpcId?: number;
}

export interface ActionStepData {
  step: Step.ACTION;
  code: string;
  output: string;
  rpcId?: number;
}

export interface QueryStepData {
  step: Step.QUERYING;
}

export type StepData = CommonStepData|ActionStepData;

async function executeJsCode(code: string, {throwOnSideEffect}: {throwOnSideEffect: boolean}): Promise<string> {
  const target = UI.Context.Context.instance().flavor(SDK.Target.Target);
  if (!target) {
    throw new Error('Target is not found for executing code');
  }

  const resourceTreeModel = target.model(SDK.ResourceTreeModel.ResourceTreeModel);
  const runtimeModel = target.model(SDK.RuntimeModel.RuntimeModel);
  const pageAgent = target.pageAgent();
  if (!resourceTreeModel?.mainFrame) {
    throw new Error('Main frame is not found for executing code');
  }

  // This returns previously created world if it exists for the frame.
  const {executionContextId} = await pageAgent.invoke_createIsolatedWorld(
      {frameId: resourceTreeModel.mainFrame.id, worldName: 'devtools_freestyler'});
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

interface AgentOptions {
  aidaClient: Host.AidaClient.AidaClient;
  serverSideLoggingEnabled?: boolean;
  execJs?: typeof executeJsCode;
  confirmSideEffect: (action: string) => Promise<boolean>;
}

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
    const request: Host.AidaClient.AidaRequest = {
      input: opts.input,
      preamble: opts.preamble,
      // eslint-disable-next-line @typescript-eslint/naming-convention
      chat_history: opts.chatHistory,
      client: Host.AidaClient.CLIENT_NAME,
      options: {
        temperature: config?.devToolsFreestylerDogfood.aidaTemperature ?? 0,
        model_id: config?.devToolsFreestylerDogfood.aidaModelId ?? undefined,
      },
      metadata: {
        // TODO: disable logging based on query params.
        disable_user_content_logging: !(opts.serverSideLoggingEnabled ?? false),
        string_session_id: opts.sessionId,
      },
      // eslint-disable-next-line @typescript-eslint/naming-convention
      functionality_type: Host.AidaClient.FunctionalityType.CHAT,
      // eslint-disable-next-line @typescript-eslint/naming-convention
      client_feature: Host.AidaClient.ClientFeature.CHROME_FREESTYLER,
    };
    return request;
  }

  static parseResponse(response: string): {thought?: string, action?: string, answer?: string} {
    const lines = response.split('\n');
    let thought: string|undefined;
    let action: string|undefined;
    let answer: string|undefined;
    let i = 0;
    while (i < lines.length) {
      const trimmed = lines[i].trim();
      if (trimmed.startsWith('THOUGHT:') && !thought) {
        // TODO: multiline thoughts.
        thought = trimmed.substring('THOUGHT:'.length).trim();
        i++;
      } else if (trimmed.startsWith('ACTION') && !action) {
        const actionLines = [];
        let j = i + 1;
        while (j < lines.length && lines[j].trim() !== 'STOP') {
          // Sometimes the code block is in the form of "`````\njs\n{code}`````"
          if (lines[j].trim() !== 'js') {
            actionLines.push(lines[j]);
          }
          j++;
        }
        // TODO: perhaps trying to parse with a Markdown parser would
        // yield more reliable results.
        action = actionLines.join('\n').replaceAll('```', '').replaceAll('``', '').trim();
        i = j + 1;
      } else if (trimmed.startsWith('ANSWER:') && !answer) {
        const answerLines = [
          trimmed.substring('ANSWER:'.length).trim(),
        ];
        let j = i + 1;
        while (j < lines.length) {
          const line = lines[j].trim();
          if (line.startsWith('ACTION') || line.startsWith('OBSERVATION:') || line.startsWith('THOUGHT:')) {
            break;
          }
          answerLines.push(lines[j]);
          j++;
        }
        answer = answerLines.join('\n').trim();
        i = j;
      } else {
        i++;
      }
    }
    // If we could not parse the parts, consider the response to be an
    // answer.
    if (!answer && !thought && !action) {
      answer = response;
    }
    return {thought, action, answer};
  }

  #aidaClient: Host.AidaClient.AidaClient;
  #chatHistory: Map<number, HistoryChunk[]> = new Map();
  #serverSideLoggingEnabled: boolean;

  #confirmSideEffect: (action: string) => Promise<boolean>;
  #execJs: typeof executeJsCode;

  readonly #sessionId = crypto.randomUUID();

  constructor(opts: AgentOptions) {
    this.#aidaClient = opts.aidaClient;
    this.#execJs = opts.execJs ?? executeJsCode;
    this.#confirmSideEffect = opts.confirmSideEffect;
    this.#serverSideLoggingEnabled = opts.serverSideLoggingEnabled ?? false;
  }

  get #getHistoryEntry(): Array<HistoryChunk> {
    return [...this.#chatHistory.values()].flat();
  }

  get chatHistoryForTesting(): Array<HistoryChunk> {
    return this.#getHistoryEntry;
  }

  async #aidaFetch(request: Host.AidaClient.AidaRequest): Promise<{response: string, rpcId: number|undefined}> {
    let response = '';
    let rpcId;
    for await (const lastResult of this.#aidaClient.fetch(request)) {
      response = lastResult.explanation;
      rpcId = lastResult.metadata.rpcGlobalId ?? rpcId;
      if (lastResult.metadata.attributionMetadata?.some(
              meta => meta.attributionAction === Host.AidaClient.RecitationAction.BLOCK)) {
        throw new Error('Attribution action does not allow providing the response');
      }
    }

    return {response, rpcId};
  }

  async #generateObservation(
      action: string, {throwOnSideEffect, confirmExecJs: confirm, execJsDeniedMesssage: denyErrorMessage}: {
        throwOnSideEffect: boolean,
        confirmExecJs?: (this: FreestylerAgent, action: string) => Promise<boolean>,
        execJsDeniedMesssage?: string,
      }): Promise<string> {
    const actionExpression = `{${action};((typeof data !== "undefined") ? data : undefined)}`;

    try {
      const runConfirmed = await (confirm?.call(this, action) ?? Promise.resolve(true));
      if (!runConfirmed) {
        throw new Error(denyErrorMessage ?? 'Code execution is not allowed');
      }
      const result = await this.#execJs(
          actionExpression,
          {throwOnSideEffect},
      );
      const byteCount = Platform.StringUtilities.countWtf8Bytes(result);
      if (byteCount > MAX_OBSERVATION_BYTE_LENGTH) {
        throw new Error('Output exceeded the maximum allowed length.');
      }
      return result;
    } catch (error) {
      if (error instanceof SideEffectError) {
        return await this.#generateObservation(action, {
          throwOnSideEffect: false,
          confirmExecJs: this.#confirmSideEffect,
          execJsDeniedMesssage: error.message,
        });
      }

      return `Error: ${error.message}`;
    }
  }

  #runId = 0;
  async *
      run(query: string, options: {signal?: AbortSignal, isFixQuery: boolean} = {isFixQuery: false}):
          AsyncGenerator<StepData|QueryStepData, void, void> {
    const genericErrorMessage = 'Sorry, I could not help you with this query.';
    const structuredLog = [];
    query = `QUERY: ${query}`;
    const currentRunId = ++this.#runId;

    options.signal?.addEventListener('abort', () => {
      this.#chatHistory.delete(currentRunId);
    });
    for (let i = 0; i < MAX_STEPS; i++) {
      yield {step: Step.QUERYING};

      const request = FreestylerAgent.buildRequest({
        input: query,
        preamble,
        chatHistory: this.#chatHistory.size ? this.#getHistoryEntry : undefined,
        serverSideLoggingEnabled: this.#serverSideLoggingEnabled,
        sessionId: this.#sessionId,
      });
      let response: string;
      let rpcId: number|undefined;
      try {
        const fetchResult = await this.#aidaFetch(request);
        response = fetchResult.response;
        rpcId = fetchResult.rpcId;
      } catch (err) {
        debugLog('Error calling the AIDA API', err);

        if (options.signal?.aborted) {
          break;
        }

        yield {step: Step.ERROR, text: genericErrorMessage, rpcId};
        break;
      }

      if (options.signal?.aborted) {
        break;
      }

      debugLog(`Iteration: ${i}`, 'Request', request, 'Response', response);
      structuredLog.push({
        request: structuredClone(request),
        response: response,
      });
      const currentRunEntries = this.#chatHistory.get(currentRunId) ?? [];
      this.#chatHistory.set(currentRunId, [
        ...currentRunEntries,
        {
          text: query,
          entity: Host.AidaClient.Entity.USER,
        },
        {
          text: response,
          entity: Host.AidaClient.Entity.SYSTEM,
        },
      ]);

      const {thought, action, answer} = FreestylerAgent.parseResponse(response);
      // Sometimes the answer will follow an action and a thought. In
      // that case, we only use the action and the thought (if present)
      // since the answer is not based on the observation resulted from
      // the action.
      if (action) {
        if (thought) {
          yield {step: Step.THOUGHT, text: thought, rpcId};
        }
        debugLog(`Action to execute: ${action}`);
        const observation = await this.#generateObservation(action, {throwOnSideEffect: !options.isFixQuery});
        debugLog(`Action result: ${observation}`);
        yield {step: Step.ACTION, code: action, output: observation, rpcId};
        query = `OBSERVATION: ${observation}`;
      } else if (answer) {
        yield {step: Step.ANSWER, text: answer, rpcId};
        break;
      } else {
        yield {step: Step.ANSWER, text: genericErrorMessage, rpcId};
        break;
      }

      if (i === MAX_STEPS - 1) {
        yield {step: Step.ERROR, text: 'Max steps reached, please try again.'};
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
