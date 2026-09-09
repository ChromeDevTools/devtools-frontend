// Copyright 2026 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import sinon from 'sinon';

import type * as Common from '../core/common/common.js';
import * as Platform from '../core/platform/platform.js';
import * as SDK from '../core/sdk/sdk.js';
import type * as TextUtils from '../core/text_utils/text_utils.js';
import type * as Protocol from '../generated/protocol.js';
import * as Logs from '../models/logs/logs.js';

const {urlString} = Platform.DevToolsPath;

/**
 * Configuration options for creating a mock {@link SDK.NetworkRequest.NetworkRequest}.
 */
export interface CreateNetworkRequestOptions {
  /** The URL for the request. Defaults to `'https://example.com'`. */
  url?: string|Platform.DevToolsPath.UrlString;
  /**
   * The document/initiator page URL. Defaults to the request's `url`, making the
   * request same-origin by default. Specify a different URL or empty string to test
   * cross-origin behavior.
   */
  documentURL?: string|Platform.DevToolsPath.UrlString;
  /** The request identifier. Defaults to `'requestId'`. */
  requestId?: string|Protocol.Network.RequestId;
  /**
   * If true, creates a request via `createWithoutBackendRequest`, which leaves
   * `backendRequestId()` undefined and omits frame/loader associations.
   */
  withoutBackend?: boolean;
  statusCode?: number;
  statusText?: string;
  requestMethod?: string;
  requestHeaders?: SDK.NetworkRequest.NameValue[];
  responseHeaders?: SDK.NetworkRequest.NameValue[];
  originalResponseHeaders?: SDK.NetworkRequest.NameValue[];
  fromMemoryCache?: boolean;
  /**
   * Content data or a content data provider function. When provided, configures
   * `request.setContentDataProvider()`. Pass a function returning `{error: string}`
   * to simulate content retrieval failures.
   */
  contentData?: TextUtils.ContentData.ContentData|(() => Promise<TextUtils.ContentData.ContentDataOrError>);
  /** Flags the request as imported from a HAR archive via `setIsImportedHar()`. */
  isImportedHar?: boolean;
  mimeType?: string;
  resourceType?: Common.ResourceType.ResourceType;
  finished?: boolean;
  failed?: boolean;
  charset?: string;
  timing?: Protocol.Network.ResourceTiming;
  serviceWorkerRouterInfo?: Protocol.Network.ServiceWorkerRouterInfo;
  fetchedViaServiceWorker?: boolean;
  initiator?: Protocol.Network.Initiator|null;
  frameId?: string|Protocol.Page.FrameId|null;
  loaderId?: string|Protocol.Network.LoaderId|null;
}

/**
 * Creates and configures a synthetic {@link SDK.NetworkRequest.NetworkRequest} for unit testing.
 * Automatically handles string-to-UrlString conversion and provides default values
 * so callers only need to specify properties relevant to their test case.
 */
export function createNetworkRequest(options: CreateNetworkRequestOptions = {}): SDK.NetworkRequest.NetworkRequest {
  const reqId = (options.requestId ?? 'requestId') as Protocol.Network.RequestId;
  const rawUrl = options.url ?? 'https://example.com';
  const reqUrl = typeof rawUrl === 'string' ? urlString`${rawUrl}` : rawUrl;
  // Default documentURL to reqUrl so that requests are same-origin by default,
  // avoiding unintended cross-origin redactions or security checks in tests.
  const rawDocUrl = options.documentURL ?? reqUrl;
  const docUrl = typeof rawDocUrl === 'string' ? urlString`${rawDocUrl}` : rawDocUrl;
  const frameId =
      (options.frameId !== undefined && options.frameId !== null) ? options.frameId as Protocol.Page.FrameId : null;
  const loaderId = (options.loaderId !== undefined && options.loaderId !== null) ?
      options.loaderId as Protocol.Network.LoaderId :
      null;

  const request = options.withoutBackend ? SDK.NetworkRequest.NetworkRequest.createWithoutBackendRequest(
                                               reqId,
                                               reqUrl,
                                               docUrl,
                                               options.initiator ?? null,
                                               ) :
                                           SDK.NetworkRequest.NetworkRequest.create(
                                               reqId,
                                               reqUrl,
                                               docUrl,
                                               frameId,
                                               loaderId,
                                               options.initiator ?? null,
                                           );

  if (options.statusCode !== undefined) {
    request.statusCode = options.statusCode;
  }
  if (options.statusText !== undefined) {
    request.statusText = options.statusText;
  }
  if (options.requestMethod !== undefined) {
    request.requestMethod = options.requestMethod;
  }
  if (options.requestHeaders) {
    request.setRequestHeaders(options.requestHeaders);
  }
  if (options.responseHeaders) {
    request.responseHeaders = options.responseHeaders;
  }
  if (options.originalResponseHeaders) {
    request.originalResponseHeaders = options.originalResponseHeaders;
  }
  if (options.fromMemoryCache) {
    request.setFromMemoryCache();
  }
  if (options.mimeType !== undefined) {
    request.mimeType = options.mimeType;
  }
  if (options.resourceType !== undefined) {
    request.setResourceType(options.resourceType);
  }
  if (options.finished !== undefined) {
    request.finished = options.finished;
  }
  if (options.failed !== undefined) {
    request.failed = options.failed;
  }
  if (options.charset !== undefined) {
    request.setCharset(options.charset);
  }
  if (options.timing !== undefined) {
    request.timing = options.timing;
  }
  if (options.serviceWorkerRouterInfo !== undefined) {
    request.serviceWorkerRouterInfo = options.serviceWorkerRouterInfo;
  }
  if (options.fetchedViaServiceWorker !== undefined) {
    request.fetchedViaServiceWorker = options.fetchedViaServiceWorker;
  }
  if (options.contentData) {
    const dataOrFn = options.contentData;
    request.setContentDataProvider(typeof dataOrFn === 'function' ? dataOrFn : () => Promise.resolve(dataOrFn));
  }
  if (options.isImportedHar !== undefined) {
    request.setIsImportedHar(options.isImportedHar);
  }

  return request;
}

/**
 * Configuration options for {@link stubInitiatorGraph}.
 */
export interface StubInitiatorGraphOptions {
  /**
   * Upstream requests that triggered the target request. Do not include the target
   * request itself; it is automatically added as the primary initiator.
   * Defaults to a single synthetic cross-origin initiator.
   */
  initiators?: SDK.NetworkRequest.NetworkRequest[];
  /**
   * Downstream requests triggered by the target request.
   * Defaults to two synthetic cross-origin child requests.
   */
  initiated?: SDK.NetworkRequest.NetworkRequest[];
  /**
   * The NetworkLog instance on which to install the Sinon stub.
   * Defaults to `Logs.NetworkLog.NetworkLog.instance()`.
   */
  networkLog?: Logs.NetworkLog.NetworkLog;
}

/**
 * Stubs {@link Logs.NetworkLog.NetworkLog.initiatorGraphForRequest} for the given request
 * using Sinon.
 *
 * If `initiators` or `initiated` lists are omitted, generates default synthetic requests
 * simulating a typical multi-level initiator chain with cross-origin boundaries.
 *
 * @param request The network request whose initiator graph is being queried.
 * @param options Custom requests or NetworkLog instance to configure the stub.
 * @returns The lists of ancestor (`initiators`) and descendant (`initiated`) requests used,
 * along with the Sinon stub.
 */
export function stubInitiatorGraph(
    request: SDK.NetworkRequest.NetworkRequest,
    options: StubInitiatorGraphOptions = {},
    ): {
  initiators: SDK.NetworkRequest.NetworkRequest[],
  initiated: SDK.NetworkRequest.NetworkRequest[],
  stub: sinon.SinonStub<[SDK.NetworkRequest.NetworkRequest], Logs.NetworkLog.InitiatorGraph>,
} {
  // Explicitly use EmptyUrlString so that default synthetic requests are treated as
  // cross-origin, exercising URL redaction and security checks in downstream formatters.
  const initiators = options.initiators ?? [
    createNetworkRequest({
      requestId: 'requestId-initiator',
      url: urlString`https://www.initiator.com`,
      documentURL: Platform.DevToolsPath.EmptyUrlString,
    }),
  ];

  const initiated = options.initiated ?? [
    createNetworkRequest({
      requestId: 'requestId-initiated-1',
      url: urlString`https://www.example.com/1`,
      documentURL: Platform.DevToolsPath.EmptyUrlString,
    }),
    createNetworkRequest({
      requestId: 'requestId-initiated-2',
      url: urlString`https://www.example.com/2`,
      documentURL: Platform.DevToolsPath.EmptyUrlString,
    }),
  ];

  const networkLog = options.networkLog ?? Logs.NetworkLog.NetworkLog.instance();

  const stub = sinon.stub(networkLog, 'initiatorGraphForRequest');
  // Default fallback for any request not explicitly handled:
  stub.returns({
    initiators: new Set<SDK.NetworkRequest.NetworkRequest>(),
    initiated: new Map<SDK.NetworkRequest.NetworkRequest, SDK.NetworkRequest.NetworkRequest>(),
  });

  // InitiatorGraph.initiated is a Map<ChildRequest, ParentInitiator>:
  // - [request, init]: target request was initiated by upstream ancestor `init`.
  // - [init, request]: downstream child `init` was initiated by target `request`.
  stub.withArgs(request).returns({
    initiators: new Set([request, ...initiators]),
    initiated: new Map([
      ...initiators.map(init => [request, init] as const),
      ...initiated.map(init => [init, request] as const),
    ]),
  });
  // Downstream consumers may recursively query initiatorGraphForRequest on child requests:
  for (const init of initiated) {
    stub.withArgs(init).returns({
      initiators: new Set([]),
      initiated: new Map([[init, request]]),
    });
  }

  return {initiators, initiated, stub};
}
