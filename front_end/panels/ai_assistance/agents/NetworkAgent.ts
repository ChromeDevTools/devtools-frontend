// Copyright 2024 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as Common from '../../../core/common/common.js';
import * as Host from '../../../core/host/host.js';
import * as i18n from '../../../core/i18n/i18n.js';
import type * as SDK from '../../../core/sdk/sdk.js';
import * as PanelUtils from '../../utils/utils.js';
import {NetworkRequestFormatter} from '../data_formatters/NetworkRequestFormatter.js';

import {
  AgentType,
  AiAgent,
  type ContextDetail,
  type ContextResponse,
  ConversationContext,
  type RequestOptions,
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

/*
* Strings that don't need to be translated at this time.
*/
const UIStringsNotTranslate = {
  /**
   *@description Title for thinking step of Network agent.
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
export class NetworkAgent extends AiAgent<SDK.NetworkRequest.NetworkRequest> {
  override readonly type = AgentType.NETWORK;
  readonly preamble = preamble;
  readonly clientFeature = Host.AidaClient.ClientFeature.CHROME_NETWORK_AGENT;
  get userTier(): string|undefined {
    const config = Common.Settings.Settings.instance().getHostConfig();
    return config.devToolsAiAssistanceNetworkAgent?.userTier;
  }
  get options(): RequestOptions {
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
      details: createContextDetailsForNetworkAgent(selectedNetworkRequest.getItem()),
    };
  }

  override async enhanceQuery(
      query: string,
      selectedNetworkRequest: ConversationContext<SDK.NetworkRequest.NetworkRequest>|null): Promise<string> {
    const networkEnchantmentQuery = selectedNetworkRequest ?
        `# Selected network request \n${
            new NetworkRequestFormatter(selectedNetworkRequest.getItem())
                .formatNetworkRequest()}\n\n# User request\n\n` :
        '';
    return `${networkEnchantmentQuery}${query}`;
  }
}

function createContextDetailsForNetworkAgent(request: SDK.NetworkRequest.NetworkRequest):
    [ContextDetail, ...ContextDetail[]] {
  const formatter = new NetworkRequestFormatter(request);
  const requestContextDetail: ContextDetail = {
    title: lockedString(UIStringsNotTranslate.request),
    text: lockedString(UIStringsNotTranslate.requestUrl) + ': ' + request.url() + '\n\n' +
        formatter.formatRequestHeaders(),
  };
  const responseContextDetail: ContextDetail = {
    title: lockedString(UIStringsNotTranslate.response),
    text: lockedString(UIStringsNotTranslate.responseStatus) + ': ' + request.statusCode + ' ' + request.statusText +
        '\n\n' + formatter.formatResponseHeaders(),
  };
  const timingContextDetail: ContextDetail = {
    title: lockedString(UIStringsNotTranslate.timing),
    text: formatter.formatNetworkRequestTiming(),
  };
  const initiatorChainContextDetail: ContextDetail = {
    title: lockedString(UIStringsNotTranslate.requestInitiatorChain),
    text: formatter.formatRequestInitiatorChain(),
  };
  return [
    requestContextDetail,
    responseContextDetail,
    timingContextDetail,
    initiatorChainContextDetail,
  ];
}
