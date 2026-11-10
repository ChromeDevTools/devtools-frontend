/**
 * @license
 * Copyright 2026 Google Inc.
 * SPDX-License-Identifier: Apache-2.0
 */
import type { BidiHTTPRequest } from './HTTPRequest.js';
import type { BidiHTTPResponse } from './HTTPResponse.js';
import type { BidiPage } from './Page.js';
/**
 * @internal
 */
export declare function emitRequest(page: BidiPage, request: BidiHTTPRequest): void;
/**
 * @internal
 */
export declare function emitRequestServedFromCache(page: BidiPage, request: BidiHTTPRequest): void;
/**
 * @internal
 */
export declare function emitResponse(page: BidiPage, response: BidiHTTPResponse): void;
/**
 * @internal
 */
export declare function emitRequestFinished(page: BidiPage, request: BidiHTTPRequest): void;
/**
 * @internal
 */
export declare function emitRequestFailed(page: BidiPage, request: BidiHTTPRequest): void;
//# sourceMappingURL=NetworkEvents.d.ts.map