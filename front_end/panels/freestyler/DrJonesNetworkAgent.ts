// Copyright 2024 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as Common from '../../core/common/common.js';
import * as Host from '../../core/host/host.js';
import type * as SDK from '../../core/sdk/sdk.js';
import * as Logs from '../../models/logs/logs.js';

import {
  type AidaRequestOptions,
  type ContextDetail,
  ErrorType,
  type HistoryChunk,
  type ResponseData,
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
  inspectingNetworkData: 'Inspecting network data',
  /**
   *@description Thought text for thinking step of DrJones Network agent.
   */
  dataUsedToGenerateThisResponse: 'Data used to generate this response',
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
  requestInitiatorChain: 'Request Initiator Chain',

};

type AgentOptions = {
  aidaClient: Host.AidaClient.AidaClient,
  serverSideLoggingEnabled?: boolean,
};

/**
 * One agent instance handles one conversation. Create a new agent
 * instance for a new conversation.
 */
export class DrJonesNetworkAgent {
  static buildRequest(opts: AidaRequestOptions): Host.AidaClient.AidaRequest {
    const config = Common.Settings.Settings.instance().getHostConfig();
    const temperature = config.devToolsExplainThisResourceDogfood?.temperature;
    const request: Host.AidaClient.AidaRequest = {
      input: opts.input,
      preamble: opts.preamble,
      // eslint-disable-next-line @typescript-eslint/naming-convention
      chat_history: opts.chatHistory,
      client: Host.AidaClient.CLIENT_NAME,
      options: {
        ...(temperature !== undefined && temperature >= 0) && {temperature},
        model_id: config.devToolsExplainThisResourceDogfood?.modelId ?? undefined,
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

  #aidaClient: Host.AidaClient.AidaClient;
  #chatHistory: Map<number, HistoryChunk[]> = new Map();
  #serverSideLoggingEnabled: boolean;

  readonly #sessionId = crypto.randomUUID();

  constructor(opts: AgentOptions) {
    this.#aidaClient = opts.aidaClient;
    this.#serverSideLoggingEnabled = opts.serverSideLoggingEnabled ?? false;
  }

  get #getHistoryEntry(): Array<HistoryChunk> {
    return [...this.#chatHistory.values()].flat();
  }

  get chatHistoryForTesting(): Array<HistoryChunk> {
    return this.#getHistoryEntry;
  }

  async #aidaFetch(request: Host.AidaClient.AidaRequest, options: {signal?: AbortSignal}):
      Promise<{response: string, rpcId: number|undefined}> {
    let response = '';
    let rpcId;
    for await (const lastResult of this.#aidaClient.fetch(request, options)) {
      response = lastResult.explanation;
      rpcId = lastResult.metadata.rpcGlobalId ?? rpcId;
      if (lastResult.metadata.attributionMetadata?.some(
              meta => meta.attributionAction === Host.AidaClient.RecitationAction.BLOCK)) {
        throw new Error('Attribution action does not allow providing the response');
      }
    }
    return {response, rpcId};
  }

  #runId = 0;
  async * run(query: string, options: {
    signal?: AbortSignal, selectedNetworkRequest: SDK.NetworkRequest.NetworkRequest|null,
  }): AsyncGenerator<ResponseData, void, void> {
    const structuredLog = [];
    query = `${
        options.selectedNetworkRequest ?
            `# Selected network request \n${
                formatNetworkRequest(options.selectedNetworkRequest)}\n\n# User request\n\n` :
            ''}${query}`;
    const currentRunId = ++this.#runId;

    const request = DrJonesNetworkAgent.buildRequest({
      input: query,
      preamble,
      chatHistory: this.#chatHistory.size ? this.#getHistoryEntry : undefined,
      serverSideLoggingEnabled: this.#serverSideLoggingEnabled,
      sessionId: this.#sessionId,
    });
    let response: string;
    let rpcId: number|undefined;
    try {
      yield {
        type: ResponseType.TITLE,
        title: UIStringsNotTranslate.inspectingNetworkData,
        rpcId,
      };
      yield {
        type: ResponseType.THOUGHT,
        thought: UIStringsNotTranslate.dataUsedToGenerateThisResponse,
        contextDetails: createContextDetailsForDrJonesNetworkAgent(options.selectedNetworkRequest),
        rpcId,
      };
      const fetchResult = await this.#aidaFetch(request, {signal: options.signal});
      response = fetchResult.response;
      rpcId = fetchResult.rpcId;
    } catch (err) {
      debugLog('Error calling the AIDA API', err);
      if (err instanceof Host.AidaClient.AidaAbortError) {
        this.#chatHistory.delete(currentRunId);
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

    if (options.signal?.aborted) {
      return;
    }

    debugLog('Request', request, 'Response', response);

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
    addToHistory(response);
    yield {
      type: ResponseType.ANSWER,
      text: response,
      // TODO: Remove this need.
      fixable: false,
      rpcId,
    };
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
  const timing = request.timing;

  return `
Request start time: ${request.startTime}
Request end time: ${request.endTime}
Receiving response headers start time: ${timing?.receiveHeadersStart}
Receiving response headers end time: ${timing?.receiveHeadersEnd}
Proxy negotiation start time: ${timing?.proxyStart}
Proxy negotiation end time: ${timing?.proxyEnd}
DNS lookup start time: ${timing?.dnsStart}
DNS lookup end time: ${timing?.dnsEnd}
TCP start time: ${timing?.connectStart}
TCP end time: ${timing?.connectEnd}
SSL start time: ${timing?.sslStart}
SSL end time: ${timing?.sslEnd}
Sending start: ${timing?.sendStart}
Sending end: ${timing?.sendEnd}
  `;
}

function formatRequestInitiated(
    request: SDK.NetworkRequest.NetworkRequest, initiatorChain: string, lineStart: string): string {
  const initiated = Logs.NetworkLog.NetworkLog.instance().initiatorGraphForRequest(request).initiated;
  initiated.forEach((k, initiatedRequest) => {
    if (request === k) {
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

  return initiatorChain;
}

export function formatNetworkRequest(request: SDK.NetworkRequest.NetworkRequest): string {
  const formatHeaders = (title: string, headers: SDK.NetworkRequest.NameValue[]): string => formatLines(
      title, headers.filter(allowHeader).map(header => header.name + ': ' + header.value + '\n'), MAX_HEADERS_SIZE);
  // TODO: anything else that might be relavant?
  // TODO: handle missing headers
  return `Request: ${request.url()}

${formatHeaders('Request headers:', request.requestHeaders())}

${formatHeaders('Response headers:', request.responseHeaders)}

Response status: ${request.statusCode} ${request.statusText}

Request Timing:\n ${formatNetworkRequestTiming(request)}

Request Initiator Chain:\n ${formatRequestInitiatorChain(request)}`;
}

function createContextDetailsForDrJonesNetworkAgent(request: SDK.NetworkRequest.NetworkRequest|null): ContextDetail[] {
  if (request) {
    const requestContextDetail: ContextDetail = {
      title: UIStringsNotTranslate.request,
      text: UIStringsNotTranslate.requestUrl + ': ' + request.url() + '\n\n' +
          formatHeaders(UIStringsNotTranslate.requestHeaders, request.requestHeaders()),
    };
    const responseContextDetail: ContextDetail = {
      title: UIStringsNotTranslate.response,
      text: UIStringsNotTranslate.responseStatus + ': ' + request.statusCode + ' ' + request.statusText + '\n\n' +
          formatHeaders(UIStringsNotTranslate.responseHeaders, request.responseHeaders),
    };
    const timingContextDetail: ContextDetail = {
      title: UIStringsNotTranslate.timing,
      text: formatNetworkRequestTiming(request),
    };
    const initiatorChainContextDetail: ContextDetail = {
      title: UIStringsNotTranslate.requestInitiatorChain,
      text: formatRequestInitiatorChain(request),
    };
    return [
      requestContextDetail,
      responseContextDetail,
      timingContextDetail,
      initiatorChainContextDetail,
    ];
  }
  return [];
}

// @ts-ignore
globalThis.setDebugFreestylerEnabled = setDebugFreestylerEnabled;
