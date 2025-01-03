/*
 * Copyright (C) 2012 Google Inc. All rights reserved.
 *
 * Redistribution and use in source and binary forms, with or without
 * modification, are permitted provided that the following conditions are
 * met:
 *
 *     * Redistributions of source code must retain the above copyright
 * notice, this list of conditions and the following disclaimer.
 *     * Redistributions in binary form must reproduce the above
 * copyright notice, this list of conditions and the following disclaimer
 * in the documentation and/or other materials provided with the
 * distribution.
 *     * Neither the name of Google Inc. nor the names of its
 * contributors may be used to endorse or promote products derived from
 * this software without specific prior written permission.
 *
 * THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS
 * "AS IS" AND ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT
 * LIMITED TO, THE IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS FOR
 * A PARTICULAR PURPOSE ARE DISCLAIMED. IN NO EVENT SHALL THE COPYRIGHT
 * OWNER OR CONTRIBUTORS BE LIABLE FOR ANY DIRECT, INDIRECT, INCIDENTAL,
 * SPECIAL, EXEMPLARY, OR CONSEQUENTIAL DAMAGES (INCLUDING, BUT NOT
 * LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR SERVICES; LOSS OF USE,
 * DATA, OR PROFITS; OR BUSINESS INTERRUPTION) HOWEVER CAUSED AND ON ANY
 * THEORY OF LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY, OR TORT
 * (INCLUDING NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE
 * OF THIS SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.
 */

// See http://www.softwareishard.com/blog/har-12-spec/
// for HAR specification.

// FIXME: Some fields are not yet supported due to back-end limitations.
// See https://bugs.webkit.org/show_bug.cgi?id=58127 for details.

import * as Common from '../../core/common/common.js';
import type * as Platform from '../../core/platform/platform.js';
import * as SDK from '../../core/sdk/sdk.js';
import type * as Protocol from '../../generated/protocol.js';

export type BuildOptions = {
  sanitize: boolean,
};

export class Log {
  static pseudoWallTime(request: SDK.NetworkRequest.NetworkRequest, monotonicTime: number): Date {
    return new Date(request.pseudoWallTime(monotonicTime) * 1000);
  }

  static async build(requests: SDK.NetworkRequest.NetworkRequest[], options: BuildOptions): Promise<LogDTO> {
    const log = new Log();
    const entryPromises = [];
    for (const request of requests) {
      entryPromises.push(Entry.build(request, options));
    }
    const entries = await Promise.all(entryPromises);
    return {version: '1.2', creator: log.creator(), pages: log.buildPages(requests), entries};
  }

  private creator(): Creator {
    const webKitVersion = /AppleWebKit\/([^ ]+)/.exec(window.navigator.userAgent);

    return {name: 'WebInspector', version: webKitVersion ? webKitVersion[1] : 'n/a'};
  }

  private buildPages(requests: SDK.NetworkRequest.NetworkRequest[]): Page[] {
    const seenIdentifiers = new Set<number>();
    const pages = [];
    for (let i = 0; i < requests.length; ++i) {
      const request = requests[i];
      const page = SDK.PageLoad.PageLoad.forRequest(request);
      if (!page || seenIdentifiers.has(page.id)) {
        continue;
      }
      seenIdentifiers.add(page.id);
      pages.push(this.convertPage(page, request));
    }
    return pages;
  }

  private convertPage(page: SDK.PageLoad.PageLoad, request: SDK.NetworkRequest.NetworkRequest): Page {
    return {
      startedDateTime: Log.pseudoWallTime(request, page.startTime).toJSON(),
      id: 'page_' + page.id,
      title: page.url,
      pageTimings: {
        onContentLoad: this.pageEventTime(page, page.contentLoadTime),
        onLoad: this.pageEventTime(page, page.loadTime),
      },
    };
  }

  private pageEventTime(page: SDK.PageLoad.PageLoad, time: number): number {
    const startTime = page.startTime;
    if (time === -1 || startTime === -1) {
      return -1;
    }
    return Entry.toMilliseconds(time - startTime);
  }
}

export class Entry {
  private request: SDK.NetworkRequest.NetworkRequest;
  constructor(request: SDK.NetworkRequest.NetworkRequest) {
    this.request = request;
  }

  static toMilliseconds(time: number): number {
    return time === -1 ? -1 : time * 1000;
  }

  static async build(request: SDK.NetworkRequest.NetworkRequest, options: BuildOptions): Promise<EntryDTO> {
    const harEntry = new Entry(request);
    let ipAddress = harEntry.request.remoteAddress();
    const portPositionInString = ipAddress.lastIndexOf(':');
    const connection = portPositionInString !== -1 ? ipAddress.substring(portPositionInString + 1) : undefined;
    if (portPositionInString !== -1) {
      ipAddress = ipAddress.substr(0, portPositionInString);
    }
    const timings = harEntry.buildTimings();
    let time = 0;
    // "ssl" is included in the connect field, so do not double count it.
    for (const t of [timings.blocked, timings.dns, timings.connect, timings.send, timings.wait, timings.receive]) {
      time += Math.max(t, 0);
    }

    const initiator = harEntry.request.initiator();
    let exportedInitiator: Protocol.Network.Initiator|null = null;
    if (initiator) {
      exportedInitiator = {
        type: initiator.type,
      };
      if (initiator.url !== undefined) {
        exportedInitiator.url = initiator.url;
      }
      if (initiator.requestId !== undefined) {
        exportedInitiator.requestId = initiator.requestId;
      }
      if (initiator.lineNumber !== undefined) {
        exportedInitiator.lineNumber = initiator.lineNumber;
      }
      if (initiator.stack) {
        exportedInitiator.stack = initiator.stack;
      }
    }

    const entry: EntryDTO = {
      _connectionId: undefined,
      _fromCache: undefined,
      _initiator: exportedInitiator,
      _priority: harEntry.request.priority(),
      _resourceType: harEntry.request.resourceType().name(),
      _webSocketMessages: undefined,
      cache: {},
      connection,
      pageref: undefined,
      request: await harEntry.buildRequest(),
      response: harEntry.buildResponse(),
      // IPv6 address should not have square brackets per (https://tools.ietf.org/html/rfc2373#section-2.2).
      serverIPAddress: ipAddress.replace(/\[\]/g, ''),
      startedDateTime: Log.pseudoWallTime(harEntry.request, harEntry.request.issueTime()).toJSON(),
      time,
      timings,
    };

    // Sanitize HAR to remove sensitive data.

    if (options.sanitize) {
      entry.response.cookies = [];
      entry.response.headers =
          entry.response.headers.filter(({name}) => !['set-cookie'].includes(name.toLocaleLowerCase()));
      entry.request.cookies = [];
      entry.request.headers =
          entry.request.headers.filter(({name}) => !['authorization', 'cookie'].includes(name.toLocaleLowerCase()));
    }

    // Chrome specific.

    if (harEntry.request.cached()) {
      entry._fromCache = harEntry.request.cachedInMemory() ? 'memory' : 'disk';
    } else {
      delete entry._fromCache;
    }

    if (harEntry.request.connectionId !== '0') {
      entry._connectionId = harEntry.request.connectionId;
    } else {
      delete entry._connectionId;
    }

    const page = SDK.PageLoad.PageLoad.forRequest(harEntry.request);
    if (page) {
      entry.pageref = 'page_' + page.id;
    } else {
      delete entry.pageref;
    }

    if (harEntry.request.resourceType() === Common.ResourceType.resourceTypes.WebSocket) {
      const messages = [];
      for (const message of harEntry.request.frames()) {
        messages.push({type: message.type, time: message.time, opcode: message.opCode, data: message.text});
      }
      entry._webSocketMessages = messages;
    } else {
      delete entry._webSocketMessages;
    }

    return entry;
  }

  private async buildRequest(): Promise<Request> {
    const headersText = this.request.requestHeadersText();
    const res: Request = {
      method: this.request.requestMethod,
      url: this.buildRequestURL(this.request.url()),
      httpVersion: this.request.requestHttpVersion(),
      headers: this.request.requestHeaders(),
      queryString: this.buildParameters(this.request.queryParameters || []),
      cookies: this.buildCookies(
          this.request.includedRequestCookies().map(includedRequestCookie => includedRequestCookie.cookie)),
      headersSize: headersText ? headersText.length : -1,
      bodySize: await this.requestBodySize(),
      postData: undefined,
    };
    const postData = await this.buildPostData();
    if (postData) {
      res.postData = postData;
    } else {
      delete res.postData;
    }

    return res;
  }

  private buildResponse(): Response {
    const headersText = this.request.responseHeadersText;
    return {
      status: this.request.statusCode,
      statusText: this.request.statusText,
      httpVersion: this.request.responseHttpVersion(),
      headers: this.request.responseHeaders,
      cookies: this.buildCookies(this.request.responseCookies),
      content: this.buildContent(),
      redirectURL: this.request.responseHeaderValue('Location') || '',
      headersSize: headersText ? headersText.length : -1,
      bodySize: this.responseBodySize,
      _transferSize: this.request.transferSize,
      _error: this.request.localizedFailDescription,
      _fetchedViaServiceWorker: this.request.fetchedViaServiceWorker,
      _responseCacheStorageCacheName: this.request.getResponseCacheStorageCacheName(),
      _serviceWorkerResponseSource: this.request.serviceWorkerResponseSource(),
    };
  }

  private buildContent(): Content {
    const content = ({
      size: this.request.resourceSize,
      mimeType: this.request.mimeType || 'x-unknown',
      compression: undefined,
    } as Content);
    const compression = this.responseCompression;
    if (typeof compression === 'number') {
      content.compression = compression;
    } else {
      delete content.compression;
    }
    return content;
  }

  private buildTimings(): Timing {
    // Order of events: request_start = 0, [proxy], [dns], [connect [ssl]], [send], duration
    const timing = this.request.timing;
    const issueTime = this.request.issueTime();
    const startTime = this.request.startTime;

    const result: Timing = {
      blocked: -1,
      dns: -1,
      ssl: -1,
      connect: -1,
      send: 0,
      wait: 0,
      receive: 0,
      _blocked_queueing: -1,
      _blocked_proxy: undefined,
    };

    const queuedTime = (issueTime < startTime) ? startTime - issueTime : -1;
    result.blocked = Entry.toMilliseconds(queuedTime);
    result._blocked_queueing = Entry.toMilliseconds(queuedTime);

    let highestTime = 0;
    if (timing) {
      // "blocked" here represents both queued + blocked/stalled + proxy (ie: anything before request was started).
      // We pick the better of when the network request start was reported and pref timing.
      const blockedStart = leastNonNegative([timing.dnsStart, timing.connectStart, timing.sendStart]);
      if (blockedStart !== Infinity) {
        result.blocked += blockedStart;
      }

      // Proxy is part of blocked but sometimes (like quic) blocked is -1 but has proxy timings.
      if (timing.proxyEnd !== -1) {
        result._blocked_proxy = timing.proxyEnd - timing.proxyStart;
      }
      if (result._blocked_proxy && result._blocked_proxy > result.blocked) {
        result.blocked = result._blocked_proxy;
      }

      const dnsStart = timing.dnsEnd >= 0 ? blockedStart : 0;
      const dnsEnd = timing.dnsEnd >= 0 ? timing.dnsEnd : -1;
      result.dns = dnsEnd - dnsStart;

      // SSL timing is included in connection timing.
      const sslStart = timing.sslEnd > 0 ? timing.sslStart : 0;
      const sslEnd = timing.sslEnd > 0 ? timing.sslEnd : -1;
      result.ssl = sslEnd - sslStart;

      const connectStart = timing.connectEnd >= 0 ? leastNonNegative([dnsEnd, blockedStart]) : 0;
      const connectEnd = timing.connectEnd >= 0 ? timing.connectEnd : -1;
      result.connect = connectEnd - connectStart;

      // Send should not be -1 for legacy reasons even if it is served from cache.
      const sendStart = timing.sendEnd >= 0 ? Math.max(connectEnd, dnsEnd, blockedStart) : 0;
      const sendEnd = timing.sendEnd >= 0 ? timing.sendEnd : 0;
      result.send = sendEnd - sendStart;
      // Quic sometimes says that sendStart is before connectionEnd (see: crbug.com/740792)
      if (result.send < 0) {
        result.send = 0;
      }
      highestTime = Math.max(sendEnd, connectEnd, sslEnd, dnsEnd, blockedStart, 0);

      // Custom fields for service worker timings.
      result._workerStart = timing.workerStart;
      result._workerReady = timing.workerReady;
      result._workerFetchStart = timing.workerFetchStart;
      result._workerRespondWithSettled = timing.workerRespondWithSettled;
    } else if (this.request.responseReceivedTime === -1) {
      // Means that we don't have any more details after blocked, so attribute all to blocked.
      result.blocked = Entry.toMilliseconds(this.request.endTime - issueTime);
      return result;
    }

    const requestTime = timing ? timing.requestTime : startTime;
    const waitStart = highestTime;
    const waitEnd = Entry.toMilliseconds(this.request.responseReceivedTime - requestTime);
    result.wait = waitEnd - waitStart;

    const receiveStart = waitEnd;
    const receiveEnd = Entry.toMilliseconds(this.request.endTime - requestTime);
    result.receive = Math.max(receiveEnd - receiveStart, 0);

    return result;

    function leastNonNegative(values: number[]): number {
      return values.reduce((best, value) => (value >= 0 && value < best) ? value : best, Infinity);
    }
  }

  private async buildPostData(): Promise<PostData|null> {
    const postData = await this.request.requestFormData();
    if (!postData) {
      return null;
    }
    const res: PostData = {mimeType: this.request.requestContentType() || '', text: postData, params: undefined};
    const formParameters = await this.request.formParameters();
    if (formParameters) {
      res.params = this.buildParameters(formParameters);
    } else {
      delete res.params;
    }
    return res;
  }

  private buildParameters(parameters: Parameter[]): Parameter[] {
    return parameters.slice();
  }

  private buildRequestURL(url: Platform.DevToolsPath.UrlString): Platform.DevToolsPath.UrlString {
    return Common.ParsedURL.ParsedURL.split(url, '#', 2)[0];
  }

  private buildCookies(cookies: SDK.Cookie.Cookie[]): CookieDTO[] {
    return cookies.map(this.buildCookie.bind(this));
  }

  private buildCookie(cookie: SDK.Cookie.Cookie): CookieDTO {
    const c: CookieDTO = {
      name: cookie.name(),
      value: cookie.value(),
      path: cookie.path(),
      domain: cookie.domain(),
      expires: cookie.expiresDate(Log.pseudoWallTime(this.request, this.request.startTime)),
      httpOnly: cookie.httpOnly(),
      secure: cookie.secure(),
      sameSite: undefined,
      partitionKey: undefined,
    };
    if (cookie.sameSite()) {
      c.sameSite = cookie.sameSite();
    } else {
      delete c.sameSite;
    }
    if (cookie.partitionKey()) {
      c.partitionKey = cookie.partitionKey();
    } else {
      delete c.partitionKey;
    }
    return c;
  }

  private async requestBodySize(): Promise<number> {
    const postData = await this.request.requestFormData();
    if (!postData) {
      return 0;
    }

    // As per the har spec, returns the length in bytes of the posted data.
    // TODO(jarhar): This will be wrong if the underlying encoding is not UTF-8. SDK.NetworkRequest.NetworkRequest.requestFormData is
    //   assumed to be UTF-8 because the backend decodes post data to a UTF-8 string regardless of the provided
    //   content-type/charset in InspectorNetworkAgent::FormDataToString
    return new TextEncoder().encode(postData).length;
  }

  get responseBodySize(): number {
    if (this.request.cached() || this.request.statusCode === 304) {
      return 0;
    }
    if (!this.request.responseHeadersText) {
      return -1;
    }
    return this.request.transferSize - this.request.responseHeadersText.length;
  }

  get responseCompression(): number|undefined {
    if (this.request.cached() || this.request.statusCode === 304 || this.request.statusCode === 206) {
      return;
    }
    if (!this.request.responseHeadersText) {
      return;
    }
    return this.request.resourceSize - this.responseBodySize;
  }
}

export interface Timing {
  blocked: number;
  dns: number;
  ssl: number;
  connect: number;
  send: number;
  wait: number;
  receive: number;
  // TODO(crbug.com/1172300) Ignored during the jsdoc to ts migration
  // eslint-disable-next-line @typescript-eslint/naming-convention
  _blocked_queueing: number;
  // TODO(crbug.com/1172300) Ignored during the jsdoc to ts migration
  // eslint-disable-next-line @typescript-eslint/naming-convention
  _blocked_proxy?: number;

  // Custom fields for service workers.
  _workerStart?: number;
  _workerReady?: number;
  _workerFetchStart?: number;
  _workerRespondWithSettled?: number;
}

export interface Parameter {
  name: string;
  value: string;
}

export interface Content {
  size: number;
  mimeType: string;
  compression?: number;
  text?: string;
  encoding?: string;
}

export interface Request {
  method: string;
  url: Platform.DevToolsPath.UrlString;
  httpVersion: string;
  headers: {name: string, value: string, comment?: string}[];
  queryString: Parameter[];
  cookies: CookieDTO[];
  headersSize: number;
  bodySize: number;
  postData?: PostData;
}

export interface Response {
  status: number;
  statusText: string;
  httpVersion: string;
  headers: {name: string, value: string, comment?: string}[];
  cookies: CookieDTO[];
  content: Content;
  redirectURL: string;
  headersSize: number;
  bodySize: number;
  _transferSize: number;
  _error: string|null;
  _fetchedViaServiceWorker: boolean;
  _responseCacheStorageCacheName: string|undefined;
  _serviceWorkerResponseSource: Protocol.Network.ServiceWorkerResponseSource|undefined;
}

export interface EntryDTO {
  _connectionId?: string;
  _fromCache?: string;
  _initiator: Protocol.Network.Initiator|null;
  _priority: Protocol.Network.ResourcePriority|null;
  _resourceType: string;
  _webSocketMessages?: Object[];
  cache: Object;
  connection?: string;
  pageref?: string;
  request: Request;
  response: Response;
  serverIPAddress: string;
  startedDateTime: string|Object;
  time: number;
  timings: Timing;
}

export interface PostData {
  mimeType: string;
  params?: Parameter[];
  text: string;
}

export interface CookieDTO {
  name: string;
  value: string;
  path: string;
  domain: string;
  expires: Date|null;
  httpOnly: boolean;
  secure: boolean;
  sameSite?: Protocol.Network.CookieSameSite;
  partitionKey?: Protocol.Network.CookiePartitionKey;
}

export interface Page {
  startedDateTime: string|Object;
  id: string;
  title: string;
  pageTimings: {
    onContentLoad: number,
    onLoad: number,
  };
}

export interface Creator {
  version: string;
  name: string;
}

export interface LogDTO {
  version: string;
  creator: Creator;
  pages: Page[];
  entries: EntryDTO[];
}
