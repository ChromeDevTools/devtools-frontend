// Copyright 2024 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as Common from '../../core/common/common.js';
import * as Host from '../../core/host/host.js';
import * as i18n from '../../core/i18n/i18n.js';
import type * as SDK from '../../core/sdk/sdk.js';
import * as Logs from '../../models/logs/logs.js';
import * as Network from '../../panels/network/network.js';

import {
  AiAgent,
  type AidaRequestOptions,
  type ContextDetail,
  type ContextResponse,
  type ParsedResponse,
  ResponseType,
} from './AiAgent.js';

/* clang-format off */
const preamble = `You are the most advanced network request debugging assistant integrated into Chrome DevTools.
The user selected a network request in the browser's DevTools Network Panel and sends a query to understand the request.
Provide a comprehensive analysis of the network request, focusing on areas crucial for a software engineer. Your analysis should include:
* Briefly explain the purpose of the request based on the URL, method, and any relevant headers or payload.
* Analyze timing information to identify potential bottlenecks or areas for optimization.
* Highlight potential issues indicated by the status code.

# Considerations
* If the response payload or request payload contains sensitive data, redact or generalize it in your analysis to ensure privacy.
* Tailor your explanations and suggestions to the specific context of the request and the technologies involved (if discernible from the provided details).
* Keep your analysis concise and focused, highlighting only the most critical aspects for a software engineer.
* **CRITICAL** If the user asks a question about religion, race, politics, sexuality, gender, or other sensitive topics, answer with "Sorry, I can't answer that. I'm best at questions about network requests."

## Example session

Explain this network request
Request: https://api.example.com/products/search?q=laptop&category=electronics
Response Headers:
    Content-Type: application/json
    Cache-Control: max-age=300
...
Request Headers:
    User-Agent: Mozilla/5.0
...
Request Status: 200 OK


This request aims to retrieve a list of products matching the search query "laptop" within the "electronics" category. The successful 200 OK status confirms that the server fulfilled the request and returned the relevant data.
`;
/* clang-format on */

const MAX_HEADERS_SIZE = 1000;

/*
* Strings that don't need to be translated at this time.
*/
const UIStringsNotTranslate = {
  /**
   *@description Title for thinking step of DrJones Network agent.
   */
  analyzingNetworkData: 'Analyzing network data',
  /**
   *@description Heading text for the block that shows the network request details.
   */
  request: 'Request',
  /**
   *@description Heading text for the block that shows the network response details.
   */
  response: 'Response',
  /**
   *@description Prefix text for request URL.
   */
  requestUrl: 'Request URL',
  /**
   *@description Title text for request headers.
   */
  requestHeaders: 'Request Headers',
  /**
   *@description Title text for request timing details.
   */
  timing: 'Timing',
  /**
   *@description Title text for response headers.
   */
  responseHeaders: 'Response Headers',
  /**
   *@description Prefix text for response status.
   */
  responseStatus: 'Response Status',
  /**
   *@description Title text for request initiator chain.
   */
  requestInitiatorChain: 'Request initiator chain',
};

const lockedString = i18n.i18n.lockedString;

/**
 * One agent instance handles one conversation. Create a new agent
 * instance for a new conversation.
 */
export class DrJonesNetworkAgent extends AiAgent<SDK.NetworkRequest.NetworkRequest> {
  readonly preamble = preamble;
  readonly clientFeature = Host.AidaClient.ClientFeature.CHROME_DRJONES_NETWORK_AGENT;
  get userTier(): string|undefined {
    const config = Common.Settings.Settings.instance().getHostConfig();
    return config.devToolsExplainThisResourceDogfood?.userTier;
  }
  get options(): AidaRequestOptions {
    const config = Common.Settings.Settings.instance().getHostConfig();
    const temperature = config.devToolsExplainThisResourceDogfood?.temperature;
    const modelId = config.devToolsExplainThisResourceDogfood?.modelId;

    return {
      temperature,
      modelId,
    };
  }

  async *
      handleContextDetails(selectedNetworkRequest: SDK.NetworkRequest.NetworkRequest|null):
          AsyncGenerator<ContextResponse, void, void> {
    if (!selectedNetworkRequest) {
      return;
    }

    yield {
      type: ResponseType.CONTEXT,
      title: lockedString(UIStringsNotTranslate.analyzingNetworkData),
      details: createContextDetailsForDrJonesNetworkAgent(selectedNetworkRequest),
    };
  }

  override async enhanceQuery(query: string, selectedNetworkRequest: SDK.NetworkRequest.NetworkRequest|null):
      Promise<string> {
    const networkEnchantmentQuery = selectedNetworkRequest ?
        `# Selected network request \n${formatNetworkRequest(selectedNetworkRequest)}\n\n# User request\n\n` :
        '';
    return `${networkEnchantmentQuery}${query}`;
  }

  override parseResponse(response: string): ParsedResponse {
    return {
      answer: response,
    };
  }
}

function formatLines(title: string, lines: string[], maxLength: number): string {
  let result = '';
  for (const line of lines) {
    if (result.length + line.length > maxLength) {
      break;
    }
    result += line;
  }
  result = result.trim();
  return result && title ? title + '\n' + result : result;
}

export function allowHeader(header: SDK.NetworkRequest.NameValue): boolean {
  const normalizedName = header.name.toLowerCase().trim();
  // Skip custom headers.
  if (normalizedName.startsWith('x-')) {
    return false;
  }
  // Skip cookies as they might contain auth.
  if (normalizedName === 'cookie' || normalizedName === 'set-cookie') {
    return false;
  }
  if (normalizedName === 'authorization') {
    return false;
  }
  return true;
}

export function formatHeaders(title: string, headers: SDK.NetworkRequest.NameValue[]): string {
  return formatLines(
      title, headers.filter(allowHeader).map(header => header.name + ': ' + header.value + '\n'), MAX_HEADERS_SIZE);
}

export function formatNetworkRequestTiming(request: SDK.NetworkRequest.NetworkRequest): string {
  const calculator = Network.NetworkPanel.NetworkPanel.instance().networkLogView.timeCalculator();
  const results =
      Network.RequestTimingView.RequestTimingView.calculateRequestTimeRanges(request, calculator.minimumBoundary());

  function getDuration(name: string): string|undefined {
    const result = results.find(r => r.name === name);
    if (!result) {
      return;
    }
    return i18n.TimeUtilities.secondsToString(result.end - result.start, true);
  }

  const labels = [
    {
      label: 'Queued at (timestamp)',
      value: calculator.formatValue(request.issueTime(), 2),
    },
    {
      label: 'Started at (timestamp)',
      value: calculator.formatValue(request.startTime, 2),
    },
    {
      label: 'Queueing (duration)',
      value: getDuration('queueing'),
    },
    {
      label: 'Connection start (stalled) (duration)',
      value: getDuration('blocking'),
    },
    {
      label: 'Request sent (duration)',
      value: getDuration('sending'),
    },
    {
      label: 'Waiting for server response (duration)',
      value: getDuration('waiting'),
    },
    {
      label: 'Content download (duration)',
      value: getDuration('receiving'),
    },
    {
      label: 'Duration (duration)',
      value: getDuration('total'),
    },
  ];

  return labels.filter(label => Boolean(label.value)).map(label => `${label.label}: ${label.value}`).join('\n');
}

function formatRequestInitiated(
    request: SDK.NetworkRequest.NetworkRequest, initiatorChain: string, lineStart: string): string {
  const initiated = Logs.NetworkLog.NetworkLog.instance().initiatorGraphForRequest(request).initiated;
  initiated.forEach((v, initiatedRequest) => {
    if (request === v) {
      initiatorChain = initiatorChain + lineStart + initiatedRequest.url() + '\n';
      initiatorChain = formatRequestInitiated(initiatedRequest, initiatorChain, '\t' + lineStart);
    }
  });
  return initiatorChain;
}

function formatRequestInitiatorChain(request: SDK.NetworkRequest.NetworkRequest): string {
  let initiatorChain = '';
  let lineStart = '- URL: ';
  const initiators = Logs.NetworkLog.NetworkLog.instance().initiatorGraphForRequest(request).initiators;

  for (const initator of Array.from(initiators).reverse()) {
    initiatorChain = initiatorChain + lineStart + initator.url() + '\n';
    lineStart = '\t' + lineStart;
    if (initator === request) {
      initiatorChain = formatRequestInitiated(initator, initiatorChain, lineStart);
      break;
    }
  }

  return initiatorChain.trim();
}

export function formatNetworkRequest(request: SDK.NetworkRequest.NetworkRequest): string {
  // TODO: anything else that might be relavant?
  // TODO: handle missing headers
  return `Request: ${request.url()}

${formatHeaders('Request headers:', request.requestHeaders())}

${formatHeaders('Response headers:', request.responseHeaders)}

Response status: ${request.statusCode} ${request.statusText}

Request timing:\n${formatNetworkRequestTiming(request)}

Request initiator chain:\n${formatRequestInitiatorChain(request)}`;
}

function createContextDetailsForDrJonesNetworkAgent(request: SDK.NetworkRequest.NetworkRequest):
    [ContextDetail, ...ContextDetail[]] {
  const requestContextDetail: ContextDetail = {
    title: lockedString(UIStringsNotTranslate.request),
    text: lockedString(UIStringsNotTranslate.requestUrl) + ': ' + request.url() + '\n\n' +
        formatHeaders(lockedString(UIStringsNotTranslate.requestHeaders), request.requestHeaders()),
  };
  const responseContextDetail: ContextDetail = {
    title: lockedString(UIStringsNotTranslate.response),
    text: lockedString(UIStringsNotTranslate.responseStatus) + ': ' + request.statusCode + ' ' + request.statusText +
        '\n\n' + formatHeaders(lockedString(UIStringsNotTranslate.responseHeaders), request.responseHeaders),
  };
  const timingContextDetail: ContextDetail = {
    title: lockedString(UIStringsNotTranslate.timing),
    text: formatNetworkRequestTiming(request),
  };
  const initiatorChainContextDetail: ContextDetail = {
    title: lockedString(UIStringsNotTranslate.requestInitiatorChain),
    text: formatRequestInitiatorChain(request),
  };
  return [
    requestContextDetail,
    responseContextDetail,
    timingContextDetail,
    initiatorChainContextDetail,
  ];
}
