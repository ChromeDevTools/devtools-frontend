// Copyright 2026 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.
import sinon from 'sinon';
import * as Platform from '../core/platform/platform.js';
import * as SDK from '../core/sdk/sdk.js';
import * as Logs from '../models/logs/logs.js';
const { urlString } = Platform.DevToolsPath;
/**
 * Creates and configures a synthetic {@link SDK.NetworkRequest.NetworkRequest} for unit testing.
 * Automatically handles string-to-UrlString conversion and provides default values
 * so callers only need to specify properties relevant to their test case.
 */
export function createNetworkRequest(options = {}) {
    const reqId = (options.requestId ?? 'requestId');
    const rawUrl = options.url ?? 'https://example.com';
    const reqUrl = typeof rawUrl === 'string' ? urlString `${rawUrl}` : rawUrl;
    // Default documentURL to reqUrl so that requests are same-origin by default,
    // avoiding unintended cross-origin redactions or security checks in tests.
    const rawDocUrl = options.documentURL ?? reqUrl;
    const docUrl = typeof rawDocUrl === 'string' ? urlString `${rawDocUrl}` : rawDocUrl;
    const request = options.withoutBackend ? SDK.NetworkRequest.NetworkRequest.createWithoutBackendRequest(reqId, reqUrl, docUrl, options.initiator ?? null) :
        SDK.NetworkRequest.NetworkRequest.create(reqId, reqUrl, docUrl, options.frameId ?? null, options.loaderId ?? null, options.initiator ?? null);
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
export function stubInitiatorGraph(request, options = {}) {
    // Explicitly use EmptyUrlString so that default synthetic requests are treated as
    // cross-origin, exercising URL redaction and security checks in downstream formatters.
    const initiators = options.initiators ?? [
        createNetworkRequest({
            requestId: 'requestId-initiator',
            url: urlString `https://www.initiator.com`,
            documentURL: Platform.DevToolsPath.EmptyUrlString,
        }),
    ];
    const initiated = options.initiated ?? [
        createNetworkRequest({
            requestId: 'requestId-initiated-1',
            url: urlString `https://www.example.com/1`,
            documentURL: Platform.DevToolsPath.EmptyUrlString,
        }),
        createNetworkRequest({
            requestId: 'requestId-initiated-2',
            url: urlString `https://www.example.com/2`,
            documentURL: Platform.DevToolsPath.EmptyUrlString,
        }),
    ];
    const networkLog = options.networkLog ?? Logs.NetworkLog.NetworkLog.instance();
    const stub = sinon.stub(networkLog, 'initiatorGraphForRequest');
    // Default fallback for any request not explicitly handled:
    stub.returns({
        initiators: new Set(),
        initiated: new Map(),
    });
    // InitiatorGraph.initiated is a Map<ChildRequest, ParentInitiator>:
    // - [request, init]: target request was initiated by upstream ancestor `init`.
    // - [init, request]: downstream child `init` was initiated by target `request`.
    stub.withArgs(request).returns({
        initiators: new Set([request, ...initiators]),
        initiated: new Map([
            ...initiators.map(init => [request, init]),
            ...initiated.map(init => [init, request]),
        ]),
    });
    // Downstream consumers may recursively query initiatorGraphForRequest on child requests:
    for (const init of initiated) {
        stub.withArgs(init).returns({
            initiators: new Set([]),
            initiated: new Map([[init, request]]),
        });
    }
    return { initiators, initiated, stub };
}
//# sourceMappingURL=NetworkRequestHelpers.js.map