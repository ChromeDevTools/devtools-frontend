// Copyright 2026 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as i18n from '../../../core/i18n/i18n.js';
import type * as SDK from '../../../core/sdk/sdk.js';
import type * as NetworkTimeCalculator from '../../network_time_calculator/network_time_calculator.js';
import {
  type ContextDetail,
  ConversationContext,
} from '../agents/AiAgent.js';
import {
  NetworkRequestFormatter,
} from '../data_formatters/NetworkRequestFormatter.js';

const UIStringsNotTranslate = {
  request: 'Request',
  response: 'Response',
  requestUrl: 'Request URL',
  timing: 'Timing',
  requestInitiatorChain: 'Request initiator chain',
} as const;

const lockedString = i18n.i18n.lockedString;

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
   * Returns the security origin of the document that initiated the request.
   *
   * Network requests to third-party endpoints share the origin of the page
   * that initiated them. This permits the AI to inspect third-party subresources
   * without triggering a cross-origin conversation reset.
   */
  override getOrigin(): SDK.SecurityOrigin.SecurityOrigin {
    return this.#request.initiatorSecurityOrigin();
  }

  override getItem(): SDK.NetworkRequest.NetworkRequest {
    return this.#request;
  }

  override getTitle(): string {
    return this.#request.name();
  }

  #createFormatter(): NetworkRequestFormatter {
    return new NetworkRequestFormatter(this.#request, this.#calculator, {
      accessingSecurityOrigin: this.#request.initiatorSecurityOrigin(),
    });
  }

  override async getPromptDetails(): Promise<string|null> {
    const formatter = this.#createFormatter();
    return `# Selected network request\n${await formatter.formatNetworkRequest()}`;
  }

  override async getUserFacingDetails(): Promise<[ContextDetail, ...ContextDetail[]]|null> {
    const formatter = this.#createFormatter();
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
