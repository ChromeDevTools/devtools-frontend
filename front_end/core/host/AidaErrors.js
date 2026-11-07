// Copyright 2026 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.
import * as DispatchHttpRequestClient from './DispatchHttpRequestClient.js';
import * as UserMetrics from './UserMetrics.js';
export class AidaClientError extends Error {
    name = 'AidaClientError';
}
export class AidaUnknownError extends AidaClientError {
    name = 'AidaUnknownError';
}
export class AidaAbortError extends AidaClientError {
    name = 'AidaAbortError';
}
export class AidaBlockError extends AidaClientError {
    name = 'AidaBlockError';
}
export class AidaQuotaError extends AidaClientError {
    name = 'AidaQuotaError';
}
export class AidaPayloadTooLargeError extends AidaClientError {
    name = 'AidaPayloadTooLargeError';
}
export class AidaPermissionDeniedError extends AidaClientError {
    name = 'AidaPermissionDeniedError';
}
export class AidaTimeoutError extends AidaClientError {
    name = 'AidaTimeoutError';
}
export class AidaInvalidJsonResponseError extends AidaClientError {
    name = 'AidaInvalidJsonResponseError';
}
/**
 * Represents a failure to parse a streamed JSON chunk from an AIDA or GCA response.
 */
export class StreamChunkParseError extends Error {
    name = 'StreamChunkParseError';
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
export function isQuotaError(...inputs) {
    return inputs.some(input => {
        const lower = input?.toLowerCase();
        return lower?.includes('quota') || lower?.includes('resource_exhausted') || lower?.includes('rate_limit_exceeded');
    });
}
export function isPayloadTooLargeError(...inputs) {
    return inputs.some(input => input?.toLowerCase().includes('payload size exceeds the limit'));
}
/**
 * Type guard that narrows an `unknown` error value to a plain key-value object so structured
 * `google.rpc.Status` fields (`code`, `status`, `message`, `details`) can be inspected.
 */
function isRecord(value) {
    if (typeof value !== 'object' || value === null) {
        return false;
    }
    const proto = Object.getPrototypeOf(value);
    return proto === Object.prototype || proto === null;
}
/**
 * Maps AIDA-specific errors, DispatchHttpRequestErrors, strings, structured
 * error objects, and generic Errors to dedicated AidaClientError subclasses.
 */
export function mapError(err, detail) {
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
                const mapped = mapError(response.error, response.detail);
                // Preserve the original HTTP error when recursive string mapping produces a cause-less AidaUnknownError.
                if (mapped instanceof AidaUnknownError && mapped.cause === undefined) {
                    return new AidaUnknownError(mapped.message, { cause: err });
                }
                return mapped;
            }
            // The dispatcher throws HTTP_RESPONSE_UNAVAILABLE with status code 200
            // when it receives the HTTP response but fails to parse its JSON body.
            if (response.statusCode === 200 && err.type === DispatchHttpRequestClient.ErrorType.HTTP_RESPONSE_UNAVAILABLE) {
                return new AidaInvalidJsonResponseError('Server responded with invalid JSON', { cause: err });
            }
            if (response.statusCode !== 200) {
                return new AidaUnknownError(`Request failed: ${JSON.stringify(response)}`, { cause: err });
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
        return new AidaUnknownError(err.message, { cause: err });
    }
    if (isRecord(err)) {
        const code = typeof err.code === 'number' ? err.code : undefined;
        const status = typeof err.status === 'string' ? err.status : undefined;
        const message = typeof err.message === 'string' ? err.message : undefined;
        const details = err.details !== undefined ? JSON.stringify(err.details) : undefined;
        if (code === 429 || isQuotaError(status, message, details)) {
            return new AidaQuotaError(message ?? 'Server responded: quota exceeded', { cause: err });
        }
        if (code === 403 || status === 'PERMISSION_DENIED') {
            return new AidaPermissionDeniedError(message ?? 'Server responded: permission denied', { cause: err });
        }
        if (isPayloadTooLargeError(message, details)) {
            return new AidaPayloadTooLargeError(message ?? 'Server responded: payload size exceeds the limit', { cause: err });
        }
        return new AidaUnknownError(message ?? JSON.stringify(err), { cause: err });
    }
    return new AidaUnknownError(String(err));
}
/**
 * Pre-flight `"error"` strings emitted by Chromium's C++ DevTools bindings
 * (`chrome/browser/devtools/devtools_ui_bindings.cc` and
 * `devtools_embedder_message_dispatcher.cc`) when the browser rejects a request locally:
 * - `'AIDA request was blocked'`: `HandleAidaClientUnavailable()` returns this string on
 *   `aidaCodeComplete` when `AidaClient::CanUseAida()` blocks the profile, and the embedder
 *   dispatcher returns it when a non-local frontend invokes `aidaCodeComplete`.
 * - `'Disallowed path or method'`: `OnHttpRequestPerformed()` returns this string for
 *   `kAccessDenied` when `DevToolsHttpServiceRegistry` rejects the endpoint path or HTTP method.
 * - `'Request validation failed'`: `OnHttpRequestPerformed()` returns this string for
 *   `kValidationFailed` when `CanMakeRequest()` rejects the profile (off-the-record, enterprise
 *   policy, age, or geo restrictions), and the embedder dispatcher returns it when a non-local
 *   frontend invokes `dispatchHttpRequest`.
 * - `'Service not found'`: `OnHttpRequestPerformed()` returns this string for `kServiceNotFound`
 *   when `DevToolsHttpServiceRegistry` has no registration for the requested service name.
 */
const VALIDATION_ERROR_MESSAGES = new Set([
    'AIDA request was blocked',
    'Disallowed path or method',
    'Request validation failed',
    'Service not found',
]);
/**
 * OAuth `"error"` strings emitted by Chromium's C++ DevTools bindings when fetching a token
 * from `IdentityManager` fails:
 * - `'Cannot get OAuth credentials'` and `'IdentityManager is not available'`:
 *   `AidaClient::PrepareRequestOrFail()` and `AccessTokenFetchFinished()` in
 *   `chrome/browser/devtools/aida_client.cc` serialize these strings on legacy AIDA calls
 *   (`HandleAidaRequestError()` currently wraps that JSON payload inside
 *   `completeCodeResult.response` rather than setting a top-level `completeCodeResult.error`).
 * - `'Token fetch error'`: `OnHttpRequestPerformed()` in
 *   `chrome/browser/devtools/devtools_ui_bindings.cc` returns this string for `kTokenFetchFailed`
 *   on `dispatchHttpRequest` calls.
 */
const OAUTH_TOKEN_ERROR_MESSAGES = new Set([
    'Cannot get OAuth credentials',
    'IdentityManager is not available',
    'Token fetch error',
]);
/**
 * Parses a serialized JSON error body (such as `AidaCodeCompleteResult.detail`) and extracts
 * the inner structured error object when present.
 *
 * Handles three backend response shapes:
 * - Wrapped object: `{"error": {"code": 503, "status": "UNAVAILABLE", ...}}`.
 * - Streamed chunk array: `[{"error": {...}}]` or `[{"code": 429, "status": "RESOURCE_EXHAUSTED", ...}]`.
 * - Direct `google.rpc.Status` object: `{"code": 400, "status": "INVALID_ARGUMENT", ...}`.
 *
 * Returns `null` if `jsonText` is not valid JSON or does not match a structured error shape.
 */
function extractStructuredError(jsonText) {
    try {
        const parsed = JSON.parse(jsonText);
        const candidate = Array.isArray(parsed) && parsed.length > 0 ? parsed[0] : parsed;
        if (isRecord(candidate)) {
            if (isRecord(candidate.error)) {
                return candidate.error;
            }
            if (typeof candidate.code === 'number' || typeof candidate.status === 'string') {
                return candidate;
            }
        }
    }
    catch {
        return null;
    }
    return null;
}
function safeJsonStringify(value) {
    try {
        return JSON.stringify(value);
    }
    catch {
        return undefined;
    }
}
/**
 * Maps a structured `google.rpc.Status` or HTTP JSON error record (`code`, `status`,
 * `message`, `details`) to an `AiClientRequestResult` UMA bucket.
 *
 * Evaluates quota and payload-size predicates ahead of generic `400` / `INVALID_ARGUMENT`
 * checks because AIDA and GCA can report quota or payload-limit failures inside 400 responses.
 */
function classifyStructuredError(err) {
    const code = typeof err.code === 'number' ? err.code : undefined;
    const status = typeof err.status === 'string' ? err.status : undefined;
    const message = typeof err.message === 'string' ? err.message : undefined;
    // Guard serialization because `classifyRequestError()` accepts arbitrary `unknown` objects
    // whose `details` property can contain circular references or `BigInt` values.
    const details = err.details !== undefined ? safeJsonStringify(err.details) : undefined;
    if (code === 429 || isQuotaError(status, message, details)) {
        return UserMetrics.AiClientRequestResult.HTTP_429_QUOTA_EXCEEDED;
    }
    if (isPayloadTooLargeError(message, details)) {
        return UserMetrics.AiClientRequestResult.HTTP_400_PAYLOAD_TOO_LARGE;
    }
    if (code === 400 || status === 'INVALID_ARGUMENT') {
        return UserMetrics.AiClientRequestResult.HTTP_400_INVALID_ARGUMENT;
    }
    if (code === 401 || status === 'UNAUTHENTICATED') {
        return UserMetrics.AiClientRequestResult.HTTP_401_UNAUTHORIZED;
    }
    if (code === 403 || status === 'PERMISSION_DENIED') {
        return UserMetrics.AiClientRequestResult.HTTP_403_PERMISSION_DENIED;
    }
    if (code === 404 || status === 'NOT_FOUND') {
        return UserMetrics.AiClientRequestResult.HTTP_404_NOT_FOUND;
    }
    if ((typeof code === 'number' && code >= 500 && code < 600) || status === 'INTERNAL' || status === 'UNAVAILABLE' ||
        status === 'DEADLINE_EXCEEDED') {
        return UserMetrics.AiClientRequestResult.HTTP_5XX_SERVER_ERROR;
    }
    return UserMetrics.AiClientRequestResult.UNKNOWN_ERROR;
}
/**
 * Maps a failed request error from `doConversation`, `completeCode`, or `generateCode` to a
 * backend-neutral `AiClientRequestResult` UMA bucket.
 *
 * Accepts already-mapped `AidaClientError` instances (unwrapping `AidaUnknownError.cause`),
 * `StreamChunkParseError`, `DispatchHttpRequestError`, host error strings paired with an
 * optional `detail` payload (from `aidaCodeComplete`), or raw structured error objects.
 * Transport-level `netError` failures take precedence over HTTP status codes so mid-stream
 * disconnects after an HTTP 200 header still record as network failures.
 */
export function classifyRequestError(err, detail) {
    return classifyRequestErrorInternal(err, detail, new Set());
}
/**
 * Tracks visited object references across recursive `cause` and `response.error` unwrapping so
 * cyclic error references terminate with `UNKNOWN_ERROR` instead of overflowing the call stack.
 */
function classifyRequestErrorInternal(err, detail, seen) {
    if (typeof err === 'object' && err !== null) {
        if (seen.has(err)) {
            return UserMetrics.AiClientRequestResult.UNKNOWN_ERROR;
        }
        seen.add(err);
    }
    if (err instanceof AidaAbortError) {
        return UserMetrics.AiClientRequestResult.ABORTED;
    }
    if (err instanceof AidaBlockError) {
        return UserMetrics.AiClientRequestResult.BLOCKED_BY_SAFETY_OR_RECITATION;
    }
    if (err instanceof AidaInvalidJsonResponseError) {
        return UserMetrics.AiClientRequestResult.INVALID_JSON_RESPONSE;
    }
    if (err instanceof AidaQuotaError) {
        return UserMetrics.AiClientRequestResult.HTTP_429_QUOTA_EXCEEDED;
    }
    if (err instanceof AidaPermissionDeniedError) {
        return UserMetrics.AiClientRequestResult.HTTP_403_PERMISSION_DENIED;
    }
    if (err instanceof AidaPayloadTooLargeError) {
        return UserMetrics.AiClientRequestResult.HTTP_400_PAYLOAD_TOO_LARGE;
    }
    if (err instanceof AidaTimeoutError) {
        return UserMetrics.AiClientRequestResult.NETWORK_TIMEOUT;
    }
    if (err instanceof AidaUnknownError && err.cause !== undefined) {
        return classifyRequestErrorInternal(err.cause, undefined, seen);
    }
    if (err instanceof StreamChunkParseError) {
        return UserMetrics.AiClientRequestResult.STREAM_CHUNK_PARSE_ERROR;
    }
    if (err instanceof DispatchHttpRequestClient.DispatchHttpRequestError) {
        if (err.type === DispatchHttpRequestClient.ErrorType.ABORT) {
            return UserMetrics.AiClientRequestResult.ABORTED;
        }
        if (err.type === DispatchHttpRequestClient.ErrorType.NOT_FOUND) {
            return UserMetrics.AiClientRequestResult.HTTP_404_NOT_FOUND;
        }
        const response = err.response;
        if (response) {
            // Check transport errors ahead of HTTP status codes because mid-stream disconnects can still carry statusCode 200.
            if ('netErrorName' in response && response.netErrorName === 'net::ERR_TIMED_OUT') {
                return UserMetrics.AiClientRequestResult.NETWORK_TIMEOUT;
            }
            if (('netError' in response && typeof response.netError === 'number' && response.netError !== 0) ||
                ('netErrorName' in response && Boolean(response.netErrorName) && response.netErrorName !== 'net::OK')) {
                return UserMetrics.AiClientRequestResult.NETWORK_ERROR;
            }
            if (response.statusCode === 200 && err.type === DispatchHttpRequestClient.ErrorType.HTTP_RESPONSE_UNAVAILABLE) {
                return UserMetrics.AiClientRequestResult.INVALID_JSON_RESPONSE;
            }
            if ('error' in response && response.error) {
                const structuredOrStringResult = classifyRequestErrorInternal(response.error, response.detail, seen);
                if (structuredOrStringResult !== UserMetrics.AiClientRequestResult.UNKNOWN_ERROR) {
                    return structuredOrStringResult;
                }
            }
            if (response.statusCode === -1) {
                return UserMetrics.AiClientRequestResult.NETWORK_ERROR;
            }
            if (response.statusCode === 400) {
                return UserMetrics.AiClientRequestResult.HTTP_400_INVALID_ARGUMENT;
            }
            if (response.statusCode === 401) {
                return UserMetrics.AiClientRequestResult.HTTP_401_UNAUTHORIZED;
            }
            if (response.statusCode === 403) {
                return UserMetrics.AiClientRequestResult.HTTP_403_PERMISSION_DENIED;
            }
            if (response.statusCode === 404) {
                return UserMetrics.AiClientRequestResult.HTTP_404_NOT_FOUND;
            }
            if (response.statusCode === 429) {
                return UserMetrics.AiClientRequestResult.HTTP_429_QUOTA_EXCEEDED;
            }
            if (typeof response.statusCode === 'number' && response.statusCode >= 500 && response.statusCode < 600) {
                return UserMetrics.AiClientRequestResult.HTTP_5XX_SERVER_ERROR;
            }
        }
        return UserMetrics.AiClientRequestResult.UNKNOWN_ERROR;
    }
    if (typeof err === 'string') {
        if (VALIDATION_ERROR_MESSAGES.has(err)) {
            return UserMetrics.AiClientRequestResult.VALIDATION_FAILED;
        }
        if (OAUTH_TOKEN_ERROR_MESSAGES.has(err)) {
            return UserMetrics.AiClientRequestResult.OAUTH_TOKEN_ERROR;
        }
        if (isQuotaError(err, detail)) {
            return UserMetrics.AiClientRequestResult.HTTP_429_QUOTA_EXCEEDED;
        }
        if (isPayloadTooLargeError(err, detail)) {
            return UserMetrics.AiClientRequestResult.HTTP_400_PAYLOAD_TOO_LARGE;
        }
        if (detail) {
            const structuredError = extractStructuredError(detail);
            if (structuredError) {
                return classifyStructuredError(structuredError);
            }
        }
        return UserMetrics.AiClientRequestResult.UNKNOWN_ERROR;
    }
    if (err instanceof Error) {
        if (err.message.startsWith('Unsupported client feature for GCA conversation:')) {
            return UserMetrics.AiClientRequestResult.VALIDATION_FAILED;
        }
        return UserMetrics.AiClientRequestResult.UNKNOWN_ERROR;
    }
    if (isRecord(err)) {
        return classifyStructuredError(err);
    }
    return UserMetrics.AiClientRequestResult.UNKNOWN_ERROR;
}
//# sourceMappingURL=AidaErrors.js.map