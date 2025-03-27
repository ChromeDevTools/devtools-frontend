// Copyright 2025 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as i18n from '../../../core/i18n/i18n.js';
import type * as SDK from '../../../core/sdk/sdk.js';
import * as Network from '../../../panels/network/network.js';
import * as Logs from '../../logs/logs.js';

const MAX_HEADERS_SIZE = 1000;

/**
 * Sanitizes the set of headers, removing values that are not on the allow-list and replacing them with '<redacted>'.
 */
function sanitizeHeaders(headers: Array<{name: string, value: string}>): Array<{name: string, value: string}> {
  return headers.map(header => {
    if (NetworkRequestFormatter.allowHeader(header.name)) {
      return header;
    }
    return {name: header.name, value: '<redacted>'};
  });
}

export class NetworkRequestFormatter {
  static allowHeader(headerName: string): boolean {
    return allowedHeaders.has(headerName.toLowerCase().trim());
  }
  static formatHeaders(title: string, headers: Array<{name: string, value: string}>, addListPrefixToEachLine?: boolean):
      string {
    return formatLines(
        title, sanitizeHeaders(headers).map(header => {
          const prefix = addListPrefixToEachLine ? '- ' : '';
          return prefix + header.name + ': ' + header.value + '\n';
        }),
        MAX_HEADERS_SIZE);
  }

  static formatInitiatorUrl(initiatorUrl: string, allowedOrigin: string): string {
    const initiatorOrigin = new URL(initiatorUrl).origin;
    if (initiatorOrigin === allowedOrigin) {
      return initiatorUrl;
    }
    return '<redacted cross-origin initiator URL>';
  }

  #request: SDK.NetworkRequest.NetworkRequest;

  constructor(request: SDK.NetworkRequest.NetworkRequest) {
    this.#request = request;
  }

  formatRequestHeaders(): string {
    return NetworkRequestFormatter.formatHeaders('Request headers:', this.#request.requestHeaders());
  }

  formatResponseHeaders(): string {
    return NetworkRequestFormatter.formatHeaders('Response headers:', this.#request.responseHeaders);
  }

  /**
   * Note: nothing here should include information from origins other than
   * the request's origin.
   */
  formatNetworkRequest(): string {
    return `Request: ${this.#request.url()}

${this.formatRequestHeaders()}

${this.formatResponseHeaders()}

Response status: ${this.#request.statusCode} ${this.#request.statusText}

Request timing:\n${this.formatNetworkRequestTiming()}

Request initiator chain:\n${this.formatRequestInitiatorChain()}`;
  }

  /**
   * Note: nothing here should include information from origins other than
   * the request's origin.
   */
  formatRequestInitiatorChain(): string {
    const allowedOrigin = new URL(this.#request.url()).origin;
    let initiatorChain = '';
    let lineStart = '- URL: ';
    const graph = Logs.NetworkLog.NetworkLog.instance().initiatorGraphForRequest(this.#request);

    for (const initiator of Array.from(graph.initiators).reverse()) {
      initiatorChain = initiatorChain + lineStart +
          NetworkRequestFormatter.formatInitiatorUrl(initiator.url(), allowedOrigin) + '\n';
      lineStart = '\t' + lineStart;
      if (initiator === this.#request) {
        initiatorChain =
            this.#formatRequestInitiated(graph.initiated, this.#request, initiatorChain, lineStart, allowedOrigin);
      }
    }

    return initiatorChain.trim();
  }

  formatNetworkRequestTiming(): string {
    const calculator = Network.NetworkPanel.NetworkPanel.instance().networkLogView.timeCalculator();
    const results = Network.RequestTimingView.RequestTimingView.calculateRequestTimeRanges(
        this.#request, calculator.minimumBoundary());

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
        value: calculator.formatValue(this.#request.issueTime(), 2),
      },
      {
        label: 'Started at (timestamp)',
        value: calculator.formatValue(this.#request.startTime, 2),
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

    return labels.filter(label => !!label.value).map(label => `${label.label}: ${label.value}`).join('\n');
  }

  #formatRequestInitiated(
      initiated: Map<SDK.NetworkRequest.NetworkRequest, SDK.NetworkRequest.NetworkRequest>,
      parentRequest: SDK.NetworkRequest.NetworkRequest,
      initiatorChain: string,
      lineStart: string,
      allowedOrigin: string,
      ): string {
    const visited = new Set<SDK.NetworkRequest.NetworkRequest>();

    // this.request should be already in the tree when build initiator part
    visited.add(this.#request);
    for (const [keyRequest, initiatedRequest] of initiated.entries()) {
      if (initiatedRequest === parentRequest) {
        if (!visited.has(keyRequest)) {
          visited.add(keyRequest);
          initiatorChain = initiatorChain + lineStart +
              NetworkRequestFormatter.formatInitiatorUrl(keyRequest.url(), allowedOrigin) + '\n';
          initiatorChain =
              this.#formatRequestInitiated(initiated, keyRequest, initiatorChain, '\t' + lineStart, allowedOrigin);
        }
      }
    }

    return initiatorChain;
  }
}

// Header names that could be included in the prompt, lowercase.
const allowedHeaders = new Set([
  ':authority',
  ':method',
  ':path',
  ':scheme',
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
