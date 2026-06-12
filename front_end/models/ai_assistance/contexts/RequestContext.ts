// Copyright 2026 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as Common from '../../../core/common/common.js';
import * as i18n from '../../../core/i18n/i18n.js';
import type * as Platform from '../../../core/platform/platform.js';
import type * as SDK from '../../../core/sdk/sdk.js';
import type * as NetworkTimeCalculator from '../../network_time_calculator/network_time_calculator.js';
import {
  type ContextDetail,
  ConversationContext,
} from '../agents/AiAgent.js';
import {extractContextOrigin} from '../AiOrigins.js';
import {NetworkRequestFormatter} from '../data_formatters/NetworkRequestFormatter.js';

const UIStringsNotTranslate = {
  request: 'Request',
  response: 'Response',
  requestUrl: 'Request URL',
  timing: 'Timing',
  requestInitiatorChain: 'Request initiator chain',
} as const;

const lockedString = i18n.i18n.lockedString;

/**
 * Returns the origin for a network request in the AI context.
 *
 * To prevent cross-origin prompt injection attacks, HAR-imported requests
 * are isolated from live pages. We assign them a virtual origin
 * (`imported-har://${domain}`) so they do not share the origin of live pages
 * (e.g., `https://${domain}`). This forces a conversation reset when transitioning
 * between imported HAR data and live pages.
 */
export function getRequestContextOrigin(request: SDK.NetworkRequest.NetworkRequest): string {
  const origin = extractContextOrigin(request.documentURL);
  if (request.isImportedHar()) {
    const parsed = Common.ParsedURL.ParsedURL.fromString(origin as Platform.DevToolsPath.UrlString);
    return `imported-har://${parsed ? parsed.domain() : origin}`;
  }
  return origin;
}

export class RequestContext extends ConversationContext<SDK.NetworkRequest.NetworkRequest> {
  #request: SDK.NetworkRequest.NetworkRequest;
  #calculator: NetworkTimeCalculator.NetworkTransferTimeCalculator;

  constructor(
      request: SDK.NetworkRequest.NetworkRequest,
      calculator: NetworkTimeCalculator.NetworkTransferTimeCalculator,
  ) {
    super();
    this.#request = request;
    this.#calculator = calculator;
  }

  /**
   * Note: this is not the literal origin of the network request. This URL
   * is used to determine when we should force the user to start a new AI
   * conversation when the context changes. We allow a single AI conversation to
   * inspect all network requests that were made for that given target URL.
   */
  override getURL(): string {
    return this.#request.documentURL;
  }

  override getOrigin(): string {
    return getRequestContextOrigin(this.#request);
  }

  override getItem(): SDK.NetworkRequest.NetworkRequest {
    return this.#request;
  }

  override getTitle(): string {
    return this.#request.name();
  }

  override async getPromptDetails(): Promise<string|null> {
    const formatter = new NetworkRequestFormatter(this.#request, this.#calculator);
    return `# Selected network request\n${await formatter.formatNetworkRequest()}`;
  }

  override async getUserFacingDetails(): Promise<[ContextDetail, ...ContextDetail[]]|null> {
    const formatter = new NetworkRequestFormatter(this.#request, this.#calculator);
    const requestContextDetail: ContextDetail = {
      title: lockedString(UIStringsNotTranslate.request),
      text: lockedString(UIStringsNotTranslate.requestUrl) + ': ' + this.#request.url() + '\n\n' +
          formatter.formatRequestHeaders(),
    };
    const responseBody = await formatter.formatResponseBody();
    const responseBodyString = responseBody ? `\n\n${responseBody}` : '';

    const responseContextDetail: ContextDetail = {
      title: lockedString(UIStringsNotTranslate.response),
      text: formatter.formatResponseHeaders() + responseBodyString +
          `\n\n${formatter.formatStatus()}${formatter.formatFailureReasons()}`,
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
}
