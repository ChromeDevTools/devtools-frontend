// Copyright 2026 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as DispatchHttpRequestClient from './DispatchHttpRequestClient.js';

export abstract class AidaClientError extends Error {
  override name = 'AidaClientError';
}
export class AidaUnknownError extends AidaClientError {
  override name = 'AidaUnknownError';
}
export class AidaAbortError extends AidaClientError {
  override name = 'AidaAbortError';
}
export class AidaBlockError extends AidaClientError {
  override name = 'AidaBlockError';
}
export class AidaQuotaError extends AidaClientError {
  override name = 'AidaQuotaError';
}
export class AidaPayloadTooLargeError extends AidaClientError {
  override name = 'AidaPayloadTooLargeError';
}
export class AidaPermissionDeniedError extends AidaClientError {
  override name = 'AidaPermissionDeniedError';
}
export class AidaTimeoutError extends AidaClientError {
  override name = 'AidaTimeoutError';
}
export class AidaInvalidJsonResponseError extends AidaClientError {
  override name = 'AidaInvalidJsonResponseError';
}

/**
 * Checks whether any of the provided error strings indicate a quota or rate-limit failure.
 *
 * AIDA and GCA surface quota errors across different fields (status codes, human-readable
 * messages, and serialized `google.rpc.ErrorInfo` details), so this predicate checks three
 * substrings:
 * - `'quota'`: direct AIDA error messages or details (for example,
 *   `"Quota exceeded for quota metric 'AiCodeCompleteService'"` or `"USER_QUOTA_EXCEEDED"`).
 * - `'resource_exhausted'`: the standard `google.rpc.Code` status string (for example,
 *   `status: "RESOURCE_EXHAUSTED"` or `"RESOURCE_EXHAUSTED: quota exceeded"`).
 * - `'rate_limit_exceeded'`: the `reason` field inside `google.rpc.ErrorInfo` details when
 *   the message itself does not mention `'quota'` (for example, GCA returning
 *   `message: "You have exhausted your capacity on this model."` with
 *   `details: [{"reason": "RATE_LIMIT_EXCEEDED", "domain": "cloudcode-pa.googleapis.com"}]`).
 */
export function isQuotaError(...inputs: Array<string|undefined>): boolean {
  return inputs.some(input => {
    const lower = input?.toLowerCase();
    return lower?.includes('quota') || lower?.includes('resource_exhausted') || lower?.includes('rate_limit_exceeded');
  });
}

export function isPayloadTooLargeError(...inputs: Array<string|undefined>): boolean {
  return inputs.some(input => input?.toLowerCase().includes('payload size exceeds the limit'));
}

/**
 * Type guard that narrows an `unknown` error value to a plain key-value object so structured
 * `google.rpc.Status` fields (`code`, `status`, `message`, `details`) can be inspected.
 */
function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

/**
 * Maps AIDA-specific errors, DispatchHttpRequestErrors, strings, structured
 * error objects, and generic Errors to dedicated AidaClientError subclasses.
 */
export function mapError(err: unknown, detail?: string): AidaClientError {
  if (err instanceof AidaClientError) {
    return err;
  }

  if (err instanceof DispatchHttpRequestClient.DispatchHttpRequestError) {
    if (err.type === DispatchHttpRequestClient.ErrorType.ABORT) {
      return new AidaAbortError();
    }
    const response = err.response;
    if (response) {
      if (response.statusCode === 429) {
        return new AidaQuotaError('Server responded: quota exceeded');
      }
      if (response.statusCode === 403) {
        return new AidaPermissionDeniedError('Server responded: permission denied');
      }
      if ('netErrorName' in response && response.netErrorName === 'net::ERR_TIMED_OUT') {
        return new AidaTimeoutError('AIDA request timed out');
      }
      if ('error' in response && response.error) {
        return mapError(response.error, response.detail);
      }
      // The dispatcher throws HTTP_RESPONSE_UNAVAILABLE with status code 200
      // when it receives the HTTP response but fails to parse its JSON body.
      if (response.statusCode === 200 && err.type === DispatchHttpRequestClient.ErrorType.HTTP_RESPONSE_UNAVAILABLE) {
        return new AidaInvalidJsonResponseError('Server responded with invalid JSON', {cause: err});
      }
      if (response.statusCode !== 200) {
        return new AidaUnknownError(`Request failed: ${JSON.stringify(response)}`);
      }
    }
  }

  if (typeof err === 'string') {
    if (isQuotaError(err, detail)) {
      return new AidaQuotaError(`Cannot send request: ${err}${detail ? ` ${detail}` : ''}`);
    }
    if (isPayloadTooLargeError(err, detail)) {
      return new AidaPayloadTooLargeError(`Cannot send request: ${err}${detail ? ` ${detail}` : ''}`);
    }
    return new AidaUnknownError(`Cannot send request: ${err}${detail ? ` ${detail}` : ''}`);
  }

  if (err instanceof Error) {
    return new AidaUnknownError(err.message, {cause: err});
  }

  if (isRecord(err)) {
    const code = typeof err.code === 'number' ? err.code : undefined;
    const status = typeof err.status === 'string' ? err.status : undefined;
    const message = typeof err.message === 'string' ? err.message : undefined;
    const details = err.details !== undefined ? JSON.stringify(err.details) : undefined;
    if (code === 429 || isQuotaError(status, message, details)) {
      return new AidaQuotaError(message ?? 'Server responded: quota exceeded', {cause: err});
    }
    if (code === 403 || status === 'PERMISSION_DENIED') {
      return new AidaPermissionDeniedError(message ?? 'Server responded: permission denied', {cause: err});
    }
    if (isPayloadTooLargeError(message, details)) {
      return new AidaPayloadTooLargeError(message ?? 'Server responded: payload size exceeds the limit', {cause: err});
    }
    return new AidaUnknownError(message ?? JSON.stringify(err), {cause: err});
  }

  return new AidaUnknownError(String(err));
}
