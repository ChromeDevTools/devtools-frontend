// Copyright 2024 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as Common from '../../core/common/common.js';
import * as Host from '../../core/host/host.js';
import * as i18n from '../../core/i18n/i18n.js';
import type * as Trace from '../../models/trace/trace.js';

import {
  AiAgent,
  type AidaRequestOptions,
  type ContextDetail,
  type ContextResponse,
  debugLog,
  ErrorType,
  isDebugMode,
  type ResponseData,
  ResponseType,
} from './AiAgent.js';

const preamble = `You are a performance expert deeply integrated with Chrome DevTools.
You specialize in analyzing web application behavior captured by Chrome DevTools Performance Panel.
You will be provided with a string containing the JSON.stringify representation of a tree of events captured in a Chrome DevTools performance recording.
This tree originates from the root task of a specific event that was selected by a user in the Performance panel's flame graph.
Each node in this tree represents an event and contains the following information:
* id: A unique identifier for the event.
* url:  The URL of the JavaScript file where the event originated (if applicable).
* line: The line number in the JavaScript file where the event originated (if applicable).
* column: The column number in the JavaScript file where the event originated (if applicable).
* function: The name of the function associated with this event.
* start: The start time of the event in milliseconds.
* totalTime: The total duration of the event, including the time spent in its children, in milliseconds.
* selfTime:  The duration of the event itself, excluding the time spent in its children, in milliseconds.
* selected: A boolean value indicating whether this is the event the user selected in the Performance panel.
* children: An array of child events, each represented as another node with the same structure.

Your task is to analyze this event and its surrounding context within the performance recording. Your analysis may include:
* Clearly state the name and purpose of the selected event based on its properties (e.g., function name, URL, line number). Explain what the task is broadly doing. You can also mention the function
* Describe its execution context:
  * Ancestors: Trace back through the tree to identify the chain of parent events that led to the execution of the selected event. Describe this execution path.
  * Descendants:  Analyze the children of the selected event. What tasks did it initiate? Did it spawn any long-running or resource-intensive sub-tasks?
* Quantify performance:
    * Duration
    * Relative Cost:  How much did this event contribute to the overall duration of its parent tasks and the entire recorded trace?
    * Potential Bottlenecks: Analyze the totalTime and selfTime of the selected event and its children to identify any potential performance bottlenecks. Are there any excessively long tasks or periods of idle time?
4. (Only provide if you have specific suggestions) Based on your analysis, provide specific and actionable suggestions for improving the performance of the selected event and its related tasks.  Are there any resources being acquired or held for longer than necessary?

# Considerations
* Keep your analysis concise and focused, highlighting only the most critical aspects for a software engineer.
* Do not mention id of the event in your response.
* **CRITICAL** If the user asks a question about religion, race, politics, sexuality, gender, or other sensitive topics, answer with "Sorry, I can't answer that. I'm best at questions about performance of websites."

## Example session

Selected call tree
'{"id":"1","function":"main","start":0,"totalTime":500,"selfTime":100,"children":[{"id":"2","function":"update","start":100,"totalTime":200,"selfTime":50,"children":[{"id":"3","function":"animate","url":"[invalid URL removed]","line":120,"column":10,"start":150,"totalTime":150,"selfTime":20,"selected":true,"children":[{"id":"4","function":"calculatePosition","start":160,"totalTime":80,"selfTime":80,"children":[]},{"id":"5","function":"applyStyles","start":240,"totalTime":50,"selfTime":50,"children":[]}]}]}]}'
Explain the selected task.


It looks like you've selected the animate function, which is responsible for animating elements on the page.
This function took a total of 150ms to execute, but only 20ms of that time was spent within the animate function itself.
The remaining 130ms were spent in its child functions, calculatePosition and applyStyles.
It seems like a significant portion of the animation time is spent calculating the position of the elements.
Perhaps there's room for optimization there. You could investigate whether the calculatePosition function can be made more efficient or if the number of calculations can be reduced.
`;

/*
* Strings that don't need to be translated at this time.
*/
const UIStringsNotTranslate = {
  analyzingStackTrace: 'Analyzing stack trace',
};

const lockedString = i18n.i18n.lockedString;

/**
 * One agent instance handles one conversation. Create a new agent
 * instance for a new conversation.
 */
export class DrJonesPerformanceAgent extends AiAgent {
  readonly preamble = preamble;
  readonly clientFeature = Host.AidaClient.ClientFeature.CHROME_DRJONES_PERFORMANCE_AGENT;
  get userTier(): string|undefined {
    const config = Common.Settings.Settings.instance().getHostConfig();
    return config.devToolsAiAssistancePerformanceAgentDogfood?.userTier;
  }
  get options(): AidaRequestOptions {
    const config = Common.Settings.Settings.instance().getHostConfig();
    const temperature = AiAgent.validTemperature(config.devToolsAiAssistancePerformanceAgentDogfood?.temperature);
    const modelId = config.devToolsAiAssistancePerformanceAgentDogfood?.modelId;

    return {
      temperature,
      model_id: modelId,
    };
  }

  *
      handleContextDetails(selectedStackTrace: Trace.Helpers.TreeHelpers.TraceEntryNodeForAI|null):
          Generator<ContextResponse, void, void> {
    yield {
      type: ResponseType.CONTEXT,
      title: lockedString(UIStringsNotTranslate.analyzingStackTrace),
      details: createContextDetailsForDrJonesPerformanceAgent(selectedStackTrace),
    };
  }

  async enhanceQuery(query: string, selectedStackTrace: Trace.Helpers.TreeHelpers.TraceEntryNodeForAI|null):
      Promise<string> {
    const networkEnchantmentQuery =
        selectedStackTrace ? `# Selected stack trace\n${JSON.stringify(selectedStackTrace)}\n\n# User request\n\n` : '';
    return `${networkEnchantmentQuery}${query}`;
  }

  #runId = 0;
  async * run(query: string, options: {
    signal?: AbortSignal, selectedStackTrace: Trace.Helpers.TreeHelpers.TraceEntryNodeForAI|null,
  }): AsyncGenerator<ResponseData, void, void> {
    yield* this.handleContextDetails(options.selectedStackTrace);

    query = await this.enhanceQuery(query, options.selectedStackTrace);
    const currentRunId = ++this.#runId;

    let response: string;
    let rpcId: number|undefined;
    try {
      const fetchResult = await this.aidaFetch(query, {signal: options.signal});
      response = fetchResult.response;
      rpcId = fetchResult.rpcId;
    } catch (err) {
      debugLog('Error calling the AIDA API', err);
      if (err instanceof Host.AidaClient.AidaAbortError) {
        this.removeHistoryRun(currentRunId);
        yield {
          type: ResponseType.ERROR,
          error: ErrorType.ABORT,
          rpcId,
        };
        return;
      }

      yield {
        type: ResponseType.ERROR,
        error: ErrorType.UNKNOWN,
        rpcId,
      };
      return;
    }

    this.addToHistory({
      id: currentRunId,
      query,
      output: response,
    });

    yield {
      type: ResponseType.ANSWER,
      text: response,
      rpcId,
    };
    if (isDebugMode()) {
      window.dispatchEvent(new CustomEvent('freestylerdone'));
    }
  }
}

function createContextDetailsForDrJonesPerformanceAgent(
    selectedStackTrace: Trace.Helpers.TreeHelpers.TraceEntryNodeForAI|null): [ContextDetail, ...ContextDetail[]] {
  return [
    {
      title: 'Selected stack trace',
      text: JSON.stringify(selectedStackTrace).trim(),
    },
  ];
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
