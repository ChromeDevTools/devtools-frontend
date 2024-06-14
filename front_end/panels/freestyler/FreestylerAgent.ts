// Copyright 2024 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as Common from '../../core/common/common.js';
import * as Host from '../../core/host/host.js';
import * as SDK from '../../core/sdk/sdk.js';
import * as UI from '../../ui/legacy/legacy.js';

import {FreestylerEvaluateAction} from './FreestylerEvaluateAction.js';

const preamble = `You are a CSS debugging agent integrated into Chrome DevTools.
You are going to receive a query about the CSS on the page and you are going to answer to this query in these steps:
* THOUGHT
* ACTION
* ANSWER
Use ACTION to evaluate JS code (without markdown) on the page to gather all the data needed to answer the query and put it inside the data variable - then return STOP.
OBSERVATION will be the result of running the JS code on the page.
You can then answer the question with ANSWER or run another ACTION query.
Please run ACTION again if the information you got is not enough to answer the query.

Example:
ACTION
const data = {
  hoverStyles: window.getComputedStyle($0, 'hover') // USING 'hover' NOT ':hover'
}
STOP

You have access to $0 variable to denote the currently inspected element while executing JS code.

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

Please answer only if you are sure about the answer. Otherwise, explain why you're not able to answer.`;

export enum Step {
  THOUGHT = 'thought',
  ACTION = 'action',
  ANSWER = 'answer',
}

export type StepData = {
  step: Step.THOUGHT|Step.ANSWER,
  text: string,
}|{
  step: Step.ACTION,
  code: string,
  output: string,
};

async function executeJsCode(code: string): Promise<string> {
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

  return FreestylerEvaluateAction.execute(code, executionContext);
}

const MAX_STEPS = 5;
export class FreestylerAgent {
  #aidaClient: Host.AidaClient.AidaClient;

  constructor({aidaClient}: {aidaClient: Host.AidaClient.AidaClient}) {
    this.#aidaClient = aidaClient;
  }

  static buildRequest(input: string, preamble?: string, chatHistory?: Host.AidaClient.Chunk[]):
      Host.AidaClient.AidaRequest {
    const config = Common.Settings.Settings.instance().getHostConfig();
    const request: Host.AidaClient.AidaRequest = {
      input,
      preamble,
      // eslint-disable-next-line @typescript-eslint/naming-convention
      chat_history: chatHistory,
      client: 'CHROME_DEVTOOLS',
      options: {
        // TODO: have a config for temperature
        temperature: 0,
        // TODO: have a separate config for modelId
        model_id: config?.devToolsConsoleInsightsDogfood.aidaModelId ?? config?.devToolsConsoleInsights.aidaModelId ??
            undefined,
      },
      metadata: {
        // TODO: enable logging later.
        disable_user_content_logging: true,
      },
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
          // TODO: handle markdown backticks.
          actionLines.push(lines[j]);
          j++;
        }
        action = actionLines.join('\n').trim();
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
    return {thought, action, answer};
  }

  async #aidaFetch(request: Host.AidaClient.AidaRequest): Promise<string> {
    let result;
    for await (const lastResult of this.#aidaClient.fetch(request)) {
      result = lastResult.explanation;
    }

    return result ?? '';
  }

  async run(query: string, onStep: (data: StepData) => void): Promise<void> {
    const structuredLog = [];
    const chatHistory: Host.AidaClient.Chunk[] = [];
    query = `QUERY: ${query}`;
    for (let i = 0; i < MAX_STEPS; i++) {
      const request = FreestylerAgent.buildRequest(query, preamble, chatHistory.length ? chatHistory : undefined);
      const response = await this.#aidaFetch(request);
      debugLog(`Iteration: ${i}: ${JSON.stringify(request)}\n${response}`);
      structuredLog.push({
        request: request,
        response: response,
      });

      chatHistory.push({
        text: query,
        entity: i === 0 ? Host.AidaClient.Entity.USER : Host.AidaClient.Entity.SYSTEM,
      });

      const {thought, action, answer} = FreestylerAgent.parseResponse(response);

      if (!thought && !action && !answer) {
        onStep({step: Step.ANSWER, text: 'Sorry, I could not help you with this query.'});
        break;
      }

      if (answer) {
        onStep({step: Step.ANSWER, text: answer});
        chatHistory.push({
          text: `ANSWER: ${answer}`,
          entity: Host.AidaClient.Entity.SYSTEM,
        });
        break;
      }

      if (thought) {
        onStep({step: Step.THOUGHT, text: thought});
        chatHistory.push({
          text: `THOUGHT: ${thought}`,
          entity: Host.AidaClient.Entity.SYSTEM,
        });
      }

      if (action) {
        chatHistory.push({
          text: `ACTION\n${action}\nSTOP`,
          entity: Host.AidaClient.Entity.SYSTEM,
        });
        const observation = await executeJsCode(`{${action};data}`);
        debugLog(`Executed action: ${action}\nResult: ${observation}`);
        onStep({step: Step.ACTION, code: action, output: observation});
        query = `OBSERVATION: ${observation}`;
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

function debugLog(log: string): void {
  if (!isDebugMode()) {
    return;
  }

  // eslint-disable-next-line no-console
  console.log(log);
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
