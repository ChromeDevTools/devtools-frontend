import * as UserMetrics from './UserMetrics.js';
export declare abstract class AidaClientError extends Error {
    name: string;
}
export declare class AidaUnknownError extends AidaClientError {
    name: string;
}
export declare class AidaAbortError extends AidaClientError {
    name: string;
}
export declare class AidaBlockError extends AidaClientError {
    name: string;
}
export declare class AidaQuotaError extends AidaClientError {
    name: string;
}
export declare class AidaPayloadTooLargeError extends AidaClientError {
    name: string;
}
export declare class AidaPermissionDeniedError extends AidaClientError {
    name: string;
}
export declare class AidaTimeoutError extends AidaClientError {
    name: string;
}
export declare class AidaInvalidJsonResponseError extends AidaClientError {
    name: string;
}
/**
 * Represents a failure to parse a streamed JSON chunk from an AIDA or GCA response.
 */
export declare class StreamChunkParseError extends Error {
    name: string;
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
export declare function isQuotaError(...inputs: Array<string | undefined>): boolean;
export declare function isPayloadTooLargeError(...inputs: Array<string | undefined>): boolean;
/**
 * Maps AIDA-specific errors, DispatchHttpRequestErrors, strings, structured
 * error objects, and generic Errors to dedicated AidaClientError subclasses.
 */
export declare function mapError(err: unknown, detail?: string): AidaClientError;
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
export declare function classifyRequestError(err: unknown, detail?: string): UserMetrics.AiClientRequestResult;
