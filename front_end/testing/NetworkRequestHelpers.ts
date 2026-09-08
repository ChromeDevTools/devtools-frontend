// Copyright 2026 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import type * as Common from '../core/common/common.js';
import * as Platform from '../core/platform/platform.js';
import * as SDK from '../core/sdk/sdk.js';
import type * as TextUtils from '../core/text_utils/text_utils.js';
import type * as Protocol from '../generated/protocol.js';

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
  initiator?: Protocol.Network.Initiator|null;
  frameId?: Protocol.Page.FrameId|null;
  loaderId?: Protocol.Network.LoaderId|null;
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
                                               options.frameId ?? null,
                                               options.loaderId ?? null,
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
  if (options.mimeType !== undefined) {
    request.mimeType = options.mimeType;
  }
  if (options.resourceType !== undefined) {
    request.setResourceType(options.resourceType);
  }
  if (options.finished !== undefined) {
    request.finished = options.finished;
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
