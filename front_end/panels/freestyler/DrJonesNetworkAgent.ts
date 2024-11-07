// Copyright 2024 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as Common from '../../core/common/common.js';
import * as Host from '../../core/host/host.js';
import * as i18n from '../../core/i18n/i18n.js';
import type * as SDK from '../../core/sdk/sdk.js';
import * as Logs from '../../models/logs/logs.js';
import * as Network from '../../panels/network/network.js';
import * as PanelUtils from '../utils/utils.js';

import {
  AgentType,
  AiAgent,
  type AidaRequestOptions,
  type ContextDetail,
  type ContextResponse,
  ConversationContext,
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

export class RequestContext extends ConversationContext<SDK.NetworkRequest.NetworkRequest> {
  #request: SDK.NetworkRequest.NetworkRequest;

  constructor(request: SDK.NetworkRequest.NetworkRequest) {
    super();
    this.#request = request;
  }

  override getOrigin(): string {
    return new URL(this.#request.url()).origin;
  }

  override getItem(): SDK.NetworkRequest.NetworkRequest {
    return this.#request;
  }

  override getIcon(): HTMLElement {
    return PanelUtils.PanelUtils.getIconForNetworkRequest(this.#request);
  }

  override getTitle(): string {
    return this.#request.name();
  }
}

/**
 * One agent instance handles one conversation. Create a new agent
 * instance for a new conversation.
 */
export class DrJonesNetworkAgent extends AiAgent<SDK.NetworkRequest.NetworkRequest> {
  override type = AgentType.DRJONES_NETWORK_REQUEST;
  readonly preamble = preamble;
  readonly clientFeature = Host.AidaClient.ClientFeature.CHROME_DRJONES_NETWORK_AGENT;
  get userTier(): string|undefined {
    const config = Common.Settings.Settings.instance().getHostConfig();
    return config.devToolsAiAssistanceNetworkAgent?.userTier;
  }
  get options(): AidaRequestOptions {
    const config = Common.Settings.Settings.instance().getHostConfig();
    const temperature = config.devToolsAiAssistanceNetworkAgent?.temperature;
    const modelId = config.devToolsAiAssistanceNetworkAgent?.modelId;

    return {
      temperature,
      modelId,
    };
  }

  async *
      handleContextDetails(selectedNetworkRequest: ConversationContext<SDK.NetworkRequest.NetworkRequest>|null):
          AsyncGenerator<ContextResponse, void, void> {
    if (!selectedNetworkRequest) {
      return;
    }

    yield {
      type: ResponseType.CONTEXT,
      title: lockedString(UIStringsNotTranslate.analyzingNetworkData),
      details: createContextDetailsForDrJonesNetworkAgent(selectedNetworkRequest.getItem()),
    };
  }

  override async enhanceQuery(
      query: string,
      selectedNetworkRequest: ConversationContext<SDK.NetworkRequest.NetworkRequest>|null): Promise<string> {
    const networkEnchantmentQuery = selectedNetworkRequest ?
        `# Selected network request \n${formatNetworkRequest(selectedNetworkRequest.getItem())}\n\n# User request\n\n` :
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

// Header names that could be included in the prompt, lowercase.
const allowedHeaders = new Set([
  'a-im',
  'accept-ch',
  'accept-charset',
  'accept-datetime',
  'accept-encoding',
  'accept-language',
  'accept-patch',
  'accept-ranges',
  'accept',
  'access-control-allow-credentials',
  'access-control-allow-headers',
  'access-control-allow-methods',
  'access-control-allow-origin',
  'access-control-expose-headers',
  'access-control-max-age',
  'access-control-request-headers',
  'access-control-request-method',
  'age',
  'allow',
  'alt-svc',
  'cache-control',
  'connection',
  'content-disposition',
  'content-encoding',
  'content-language',
  'content-location',
  'content-range',
  'content-security-policy',
  'content-type',
  'correlation-id',
  'date',
  'delta-base',
  'dnt',
  'expect-ct',
  'expect',
  'expires',
  'forwarded',
  'front-end-https',
  'host',
  'http2-settings',
  'if-modified-since',
  'if-range',
  'if-unmodified-source',
  'im',
  'last-modified',
  'link',
  'location',
  'max-forwards',
  'nel',
  'origin',
  'permissions-policy',
  'pragma',
  'preference-applied',
  'proxy-connection',
  'public-key-pins',
  'range',
  'referer',
  'refresh',
  'report-to',
  'retry-after',
  'save-data',
  'sec-gpc',
  'server',
  'status',
  'strict-transport-security',
  'te',
  'timing-allow-origin',
  'tk',
  'trailer',
  'transfer-encoding',
  'upgrade-insecure-requests',
  'upgrade',
  'user-agent',
  'vary',
  'via',
  'warning',
  'www-authenticate',
  'x-att-deviceid',
  'x-content-duration',
  'x-content-security-policy',
  'x-content-type-options',
  'x-correlation-id',
  'x-forwarded-for',
  'x-forwarded-host',
  'x-forwarded-proto',
  'x-frame-options',
  'x-http-method-override',
  'x-powered-by',
  'x-redirected-by',
  'x-request-id',
  'x-requested-with',
  'x-ua-compatible',
  'x-wap-profile',
  'x-webkit-csp',
  'x-xss-protection',
]);

export function allowHeader(header: SDK.NetworkRequest.NameValue): boolean {
  return allowedHeaders.has(header.name.toLowerCase().trim());
}

export function formatHeaders(title: string, headers: SDK.NetworkRequest.NameValue[]): string {
  return formatLines(
      title,
      headers
          .map(header => {
            if (allowHeader(header)) {
              return header;
            }
            return {
              name: header.name,
              value: '<redacted>',
            };
          })
          .map(header => header.name + ': ' + header.value + '\n'),
      MAX_HEADERS_SIZE);
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

export function formatInitiatorUrl(initiatorUrl: string, allowedOrigin: string): string {
  const initiatorOrigin = new URL(initiatorUrl).origin;
  if (initiatorOrigin === allowedOrigin) {
    return initiatorUrl;
  }
  return '<redacted cross-origin initiator URL>';
}

function formatRequestInitiated(
    request: SDK.NetworkRequest.NetworkRequest, initiatorChain: string, lineStart: string,
    allowedOrigin: string): string {
  const initiated = Logs.NetworkLog.NetworkLog.instance().initiatorGraphForRequest(request).initiated;
  initiated.forEach((v, initiatedRequest) => {
    if (request === v) {
      initiatorChain = initiatorChain + lineStart + formatInitiatorUrl(initiatedRequest.url(), allowedOrigin) + '\n';
      initiatorChain = formatRequestInitiated(initiatedRequest, initiatorChain, '\t' + lineStart, allowedOrigin);
    }
  });
  return initiatorChain;
}

/**
 * Note: nothing here should include information from origins other than
 * the request's origin.
 */
function formatRequestInitiatorChain(request: SDK.NetworkRequest.NetworkRequest): string {
  const allowedOrigin = new URL(request.url()).origin;
  let initiatorChain = '';
  let lineStart = '- URL: ';
  const initiators = Logs.NetworkLog.NetworkLog.instance().initiatorGraphForRequest(request).initiators;

  for (const initator of Array.from(initiators).reverse()) {
    initiatorChain = initiatorChain + lineStart + formatInitiatorUrl(initator.url(), allowedOrigin) + '\n';
    lineStart = '\t' + lineStart;
    if (initator === request) {
      initiatorChain = formatRequestInitiated(initator, initiatorChain, lineStart, allowedOrigin);
      break;
    }
  }

  return initiatorChain.trim();
}

/**
 * Note: nothing here should include information from origins other than
 * the request's origin.
 */
export function formatNetworkRequest(request: SDK.NetworkRequest.NetworkRequest): string {
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
