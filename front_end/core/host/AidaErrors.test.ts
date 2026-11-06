// Copyright 2026 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import {assert} from 'chai';
import {describe, it} from 'mocha';

import * as Host from './host.js';

describe('AidaErrors', () => {
  describe('mapError', () => {
    it('returns the same error if it is already an instance of AidaClientError', () => {
      const err = new Host.AidaErrors.AidaQuotaError('quota exceeded');
      const mapped = Host.AidaErrors.mapError(err);
      assert.strictEqual(mapped, err);
    });

    it('maps DispatchHttpRequestError status 429 to AidaQuotaError', () => {
      const httpError = new Host.DispatchHttpRequestClient.DispatchHttpRequestError(
          Host.DispatchHttpRequestClient.ErrorType.HTTP_RESPONSE_UNAVAILABLE, {statusCode: 429, error: 'Error'});
      const mapped = Host.AidaErrors.mapError(httpError);
      assert.instanceOf(mapped, Host.AidaErrors.AidaQuotaError);
    });

    it('maps DispatchHttpRequestError status 403 to AidaPermissionDeniedError', () => {
      const httpError = new Host.DispatchHttpRequestClient.DispatchHttpRequestError(
          Host.DispatchHttpRequestClient.ErrorType.HTTP_RESPONSE_UNAVAILABLE, {statusCode: 403, error: 'Error'});
      const mapped = Host.AidaErrors.mapError(httpError);
      assert.instanceOf(mapped, Host.AidaErrors.AidaPermissionDeniedError);
    });

    it('maps DispatchHttpRequestError timed out to AidaTimeoutError', () => {
      const httpError = new Host.DispatchHttpRequestClient.DispatchHttpRequestError(
          Host.DispatchHttpRequestClient.ErrorType.HTTP_RESPONSE_UNAVAILABLE,
          {statusCode: 504, netErrorName: 'net::ERR_TIMED_OUT', error: 'Error'});
      const mapped = Host.AidaErrors.mapError(httpError);
      assert.instanceOf(mapped, Host.AidaErrors.AidaTimeoutError);
    });

    it('maps DispatchHttpRequestError abort to AidaAbortError', () => {
      const httpError =
          new Host.DispatchHttpRequestClient.DispatchHttpRequestError(Host.DispatchHttpRequestClient.ErrorType.ABORT);
      const mapped = Host.AidaErrors.mapError(httpError);
      assert.instanceOf(mapped, Host.AidaErrors.AidaAbortError);
    });

    it('maps general JSON errors containing quota to AidaQuotaError', () => {
      const httpError = new Host.DispatchHttpRequestClient.DispatchHttpRequestError(
          Host.DispatchHttpRequestClient.ErrorType.HTTP_RESPONSE_UNAVAILABLE,
          {statusCode: 400, error: 'quota exceeded'});
      const mapped = Host.AidaErrors.mapError(httpError);
      assert.instanceOf(mapped, Host.AidaErrors.AidaQuotaError);
    });

    it('maps general JSON errors containing payload size to AidaPayloadTooLargeError', () => {
      const httpError = new Host.DispatchHttpRequestClient.DispatchHttpRequestError(
          Host.DispatchHttpRequestClient.ErrorType.HTTP_RESPONSE_UNAVAILABLE,
          {statusCode: 400, error: 'payload size exceeds the limit'});
      const mapped = Host.AidaErrors.mapError(httpError);
      assert.instanceOf(mapped, Host.AidaErrors.AidaPayloadTooLargeError);
    });

    it('maps other DispatchHttpRequestError status codes to AidaUnknownError', () => {
      const httpError = new Host.DispatchHttpRequestClient.DispatchHttpRequestError(
          Host.DispatchHttpRequestClient.ErrorType.HTTP_RESPONSE_UNAVAILABLE, {statusCode: 500, error: 'Error'});
      const mapped = Host.AidaErrors.mapError(httpError);
      assert.instanceOf(mapped, Host.AidaErrors.AidaUnknownError);
      assert.strictEqual(mapped.cause, httpError);
    });

    it('maps string containing quota to AidaQuotaError', () => {
      const mapped = Host.AidaErrors.mapError('RESOURCE_EXHAUSTED', 'quota exceeded');
      assert.instanceOf(mapped, Host.AidaErrors.AidaQuotaError);
    });

    it('maps string containing payload size to AidaPayloadTooLargeError', () => {
      const mapped = Host.AidaErrors.mapError('payload size exceeds the limit');
      assert.instanceOf(mapped, Host.AidaErrors.AidaPayloadTooLargeError);
    });

    it('maps generic Error to AidaUnknownError', () => {
      const genericError = new Error('some other error');
      const mapped = Host.AidaErrors.mapError(genericError);
      assert.instanceOf(mapped, Host.AidaErrors.AidaUnknownError);
      assert.strictEqual(mapped.message, 'some other error');
    });

    it('maps DispatchHttpRequestError with status 200 and HTTP_RESPONSE_UNAVAILABLE to AidaInvalidJsonResponseError',
       () => {
         const httpError = new Host.DispatchHttpRequestClient.DispatchHttpRequestError(
             Host.DispatchHttpRequestClient.ErrorType.HTTP_RESPONSE_UNAVAILABLE,
             {statusCode: 200, response: 'invalid json'});
         const mapped = Host.AidaErrors.mapError(httpError);
         assert.instanceOf(mapped, Host.AidaErrors.AidaInvalidJsonResponseError);
         assert.strictEqual(mapped.message, 'Server responded with invalid JSON');
         assert.strictEqual(mapped.cause, httpError);
       });

    it('maps structured object with code 429 to AidaQuotaError', () => {
      const structuredError = {
        code: 429,
        status: 'RESOURCE_EXHAUSTED',
        message: 'You have exhausted your capacity on this model.',
      };
      const mapped = Host.AidaErrors.mapError(structuredError);
      assert.instanceOf(mapped, Host.AidaErrors.AidaQuotaError);
      assert.strictEqual(mapped.message, 'You have exhausted your capacity on this model.');
      assert.strictEqual(mapped.cause, structuredError);
    });

    it('maps structured object with code 403 to AidaPermissionDeniedError', () => {
      const structuredError = {
        code: 403,
        status: 'PERMISSION_DENIED',
        message: 'Permission denied',
      };
      const mapped = Host.AidaErrors.mapError(structuredError);
      assert.instanceOf(mapped, Host.AidaErrors.AidaPermissionDeniedError);
      assert.strictEqual(mapped.message, 'Permission denied');
      assert.strictEqual(mapped.cause, structuredError);
    });

    it('maps structured object with payload size message to AidaPayloadTooLargeError', () => {
      const structuredError = {
        code: 400,
        status: 'INVALID_ARGUMENT',
        message: 'Request payload size exceeds the limit',
      };
      const mapped = Host.AidaErrors.mapError(structuredError);
      assert.instanceOf(mapped, Host.AidaErrors.AidaPayloadTooLargeError);
      assert.strictEqual(mapped.message, 'Request payload size exceeds the limit');
      assert.strictEqual(mapped.cause, structuredError);
    });

    it('maps structured object with code 500 to AidaUnknownError with message', () => {
      const structuredError = {
        code: 500,
        status: 'INTERNAL',
        message: 'Internal error',
      };
      const mapped = Host.AidaErrors.mapError(structuredError);
      assert.instanceOf(mapped, Host.AidaErrors.AidaUnknownError);
      assert.strictEqual(mapped.message, 'Internal error');
      assert.strictEqual(mapped.cause, structuredError);
    });
  });

  describe('classifyRequestError', () => {
    const {AiClientRequestResult} = Host.UserMetrics;
    const {DispatchHttpRequestError, ErrorType} = Host.DispatchHttpRequestClient;
    const {classifyRequestError} = Host.AidaErrors;

    it('classifies AidaClientError subclasses', () => {
      assert.strictEqual(classifyRequestError(new Host.AidaErrors.AidaAbortError()), AiClientRequestResult.ABORTED);
      assert.strictEqual(classifyRequestError(new Host.AidaErrors.AidaBlockError()),
                         AiClientRequestResult.BLOCKED_BY_SAFETY_OR_RECITATION);
      assert.strictEqual(classifyRequestError(new Host.AidaErrors.AidaInvalidJsonResponseError()),
                         AiClientRequestResult.INVALID_JSON_RESPONSE);
      assert.strictEqual(classifyRequestError(new Host.AidaErrors.AidaQuotaError()),
                         AiClientRequestResult.HTTP_429_QUOTA_EXCEEDED);
      assert.strictEqual(classifyRequestError(new Host.AidaErrors.AidaPermissionDeniedError()),
                         AiClientRequestResult.HTTP_403_PERMISSION_DENIED);
      assert.strictEqual(classifyRequestError(new Host.AidaErrors.AidaPayloadTooLargeError()),
                         AiClientRequestResult.HTTP_400_PAYLOAD_TOO_LARGE);
      assert.strictEqual(classifyRequestError(new Host.AidaErrors.AidaTimeoutError()),
                         AiClientRequestResult.NETWORK_TIMEOUT);
    });

    it('classifies StreamChunkParseError', () => {
      assert.strictEqual(classifyRequestError(new Host.AidaErrors.StreamChunkParseError('Cannot parse chunk')),
                         AiClientRequestResult.STREAM_CHUNK_PARSE_ERROR);
    });

    it('unwraps AidaUnknownError cause when classifying', () => {
      const cause =
          new DispatchHttpRequestError(ErrorType.HTTP_RESPONSE_UNAVAILABLE, {statusCode: 503, error: 'Request failed'});
      const wrapped = new Host.AidaErrors.AidaUnknownError('Cannot send request: Request failed', {cause});
      assert.strictEqual(classifyRequestError(wrapped), AiClientRequestResult.HTTP_5XX_SERVER_ERROR);
    });

    it('returns UNKNOWN_ERROR when AidaUnknownError cause forms a cycle', () => {
      const cyclicError = new Host.AidaErrors.AidaUnknownError('Cyclic error');
      cyclicError.cause = cyclicError;
      assert.strictEqual(classifyRequestError(cyclicError), AiClientRequestResult.UNKNOWN_ERROR);
    });

    it('classifies pre-HTTP validation errors', () => {
      assert.strictEqual(classifyRequestError(new DispatchHttpRequestError(ErrorType.HTTP_RESPONSE_UNAVAILABLE,
                                                                           {error: 'Request validation failed'})),
                         AiClientRequestResult.VALIDATION_FAILED);
      assert.strictEqual(classifyRequestError(new DispatchHttpRequestError(ErrorType.HTTP_RESPONSE_UNAVAILABLE,
                                                                           {error: 'Disallowed path or method'})),
                         AiClientRequestResult.VALIDATION_FAILED);
      assert.strictEqual(classifyRequestError(new DispatchHttpRequestError(ErrorType.HTTP_RESPONSE_UNAVAILABLE,
                                                                           {error: 'Service not found'})),
                         AiClientRequestResult.VALIDATION_FAILED);
      assert.strictEqual(classifyRequestError('AIDA request was blocked'), AiClientRequestResult.VALIDATION_FAILED);
      assert.strictEqual(classifyRequestError(new Error('Unsupported client feature for GCA conversation: 0')),
                         AiClientRequestResult.VALIDATION_FAILED);
    });

    it('classifies OAuth token errors', () => {
      assert.strictEqual(classifyRequestError(new DispatchHttpRequestError(ErrorType.HTTP_RESPONSE_UNAVAILABLE,
                                                                           {error: 'Token fetch error'})),
                         AiClientRequestResult.OAUTH_TOKEN_ERROR);
      assert.strictEqual(classifyRequestError('Cannot get OAuth credentials'), AiClientRequestResult.OAUTH_TOKEN_ERROR);
      assert.strictEqual(classifyRequestError('IdentityManager is not available'),
                         AiClientRequestResult.OAUTH_TOKEN_ERROR);
    });

    it('prioritizes transport timeout ahead of HTTP status codes', () => {
      assert.strictEqual(classifyRequestError(new DispatchHttpRequestError(
                             ErrorType.HTTP_RESPONSE_UNAVAILABLE,
                             {statusCode: 504, netErrorName: 'net::ERR_TIMED_OUT', error: 'Request failed'})),
                         AiClientRequestResult.NETWORK_TIMEOUT);
    });

    it('prioritizes transport network errors ahead of HTTP status codes', () => {
      assert.strictEqual(
          classifyRequestError(new DispatchHttpRequestError(
              ErrorType.HTTP_RESPONSE_UNAVAILABLE,
              {statusCode: 200, netError: -101, netErrorName: 'net::ERR_CONNECTION_RESET', error: 'Request failed'})),
          AiClientRequestResult.NETWORK_ERROR);
      assert.strictEqual(classifyRequestError(new DispatchHttpRequestError(ErrorType.HTTP_RESPONSE_UNAVAILABLE,
                                                                           {statusCode: -1, error: 'Request failed'})),
                         AiClientRequestResult.NETWORK_ERROR);
    });

    it('classifies status 200 with HTTP_RESPONSE_UNAVAILABLE as INVALID_JSON_RESPONSE', () => {
      assert.strictEqual(classifyRequestError(new DispatchHttpRequestError(ErrorType.HTTP_RESPONSE_UNAVAILABLE,
                                                                           {statusCode: 200, response: 'not-json'})),
                         AiClientRequestResult.INVALID_JSON_RESPONSE);
    });

    it('classifies payload-too-large errors inside HTTP 400 responses', () => {
      assert.strictEqual(
          classifyRequestError(new DispatchHttpRequestError(
              ErrorType.HTTP_RESPONSE_UNAVAILABLE,
              {statusCode: 400, error: 'Request failed', detail: 'Request payload size exceeds the limit'})),
          AiClientRequestResult.HTTP_400_PAYLOAD_TOO_LARGE);
    });

    it('classifies quota errors inside HTTP 400 responses', () => {
      assert.strictEqual(classifyRequestError(new DispatchHttpRequestError(
                             ErrorType.HTTP_RESPONSE_UNAVAILABLE, {statusCode: 400, error: 'RESOURCE_EXHAUSTED'})),
                         AiClientRequestResult.HTTP_429_QUOTA_EXCEEDED);
    });

    it('classifies HTTP status codes', () => {
      assert.strictEqual(classifyRequestError(new DispatchHttpRequestError(ErrorType.HTTP_RESPONSE_UNAVAILABLE,
                                                                           {statusCode: 400, error: 'Request failed'})),
                         AiClientRequestResult.HTTP_400_INVALID_ARGUMENT);
      assert.strictEqual(classifyRequestError(new DispatchHttpRequestError(ErrorType.HTTP_RESPONSE_UNAVAILABLE,
                                                                           {statusCode: 401, error: 'Request failed'})),
                         AiClientRequestResult.HTTP_401_UNAUTHORIZED);
      assert.strictEqual(classifyRequestError(new DispatchHttpRequestError(ErrorType.HTTP_RESPONSE_UNAVAILABLE,
                                                                           {statusCode: 403, error: 'Request failed'})),
                         AiClientRequestResult.HTTP_403_PERMISSION_DENIED);
      assert.strictEqual(classifyRequestError(
                             new DispatchHttpRequestError(ErrorType.NOT_FOUND, {statusCode: 404, error: 'Not found'})),
                         AiClientRequestResult.HTTP_404_NOT_FOUND);
      assert.strictEqual(classifyRequestError(new DispatchHttpRequestError(ErrorType.HTTP_RESPONSE_UNAVAILABLE,
                                                                           {statusCode: 429, error: 'Request failed'})),
                         AiClientRequestResult.HTTP_429_QUOTA_EXCEEDED);
      assert.strictEqual(classifyRequestError(new DispatchHttpRequestError(ErrorType.HTTP_RESPONSE_UNAVAILABLE,
                                                                           {statusCode: 502, error: 'Request failed'})),
                         AiClientRequestResult.HTTP_5XX_SERVER_ERROR);
      assert.strictEqual(classifyRequestError(new DispatchHttpRequestError(ErrorType.HTTP_RESPONSE_UNAVAILABLE,
                                                                           {statusCode: 418, error: 'Request failed'})),
                         AiClientRequestResult.UNKNOWN_ERROR);
    });

    it('classifies structured error objects', () => {
      assert.strictEqual(classifyRequestError({code: 400, status: 'INVALID_ARGUMENT', message: 'Bad field'}),
                         AiClientRequestResult.HTTP_400_INVALID_ARGUMENT);
      assert.strictEqual(classifyRequestError({code: 401, status: 'UNAUTHENTICATED'}),
                         AiClientRequestResult.HTTP_401_UNAUTHORIZED);
      assert.strictEqual(classifyRequestError({code: 404, status: 'NOT_FOUND'}),
                         AiClientRequestResult.HTTP_404_NOT_FOUND);
      assert.strictEqual(classifyRequestError({code: 500, status: 'INTERNAL'}),
                         AiClientRequestResult.HTTP_5XX_SERVER_ERROR);
    });

    it('prioritizes quota details ahead of code 400 in structured error objects', () => {
      assert.strictEqual(
          classifyRequestError({code: 400, status: 'INVALID_ARGUMENT', details: [{reason: 'RATE_LIMIT_EXCEEDED'}]}),
          AiClientRequestResult.HTTP_429_QUOTA_EXCEEDED);
    });

    it('prioritizes payload-too-large message ahead of code 400 in structured error objects', () => {
      assert.strictEqual(
          classifyRequestError(
              {code: 400, status: 'INVALID_ARGUMENT', message: 'Request payload size exceeds the limit'}),
          AiClientRequestResult.HTTP_400_PAYLOAD_TOO_LARGE);
    });

    it('handles circular details in structured error objects without throwing', () => {
      const circularDetails: Record<string, unknown> = {};
      circularDetails.self = circularDetails;
      assert.strictEqual(classifyRequestError({code: 503, status: 'UNAVAILABLE', details: circularDetails}),
                         AiClientRequestResult.HTTP_5XX_SERVER_ERROR);
    });

    it('ignores non-plain object instances when classifying unknown errors', () => {
      const nonPlainObject = Object.assign(new Map<string, string>(), {code: 403, status: 'PERMISSION_DENIED'});
      assert.strictEqual(classifyRequestError(nonPlainObject), AiClientRequestResult.UNKNOWN_ERROR);
    });

    it('classifies wrapped JSON error detail strings', () => {
      assert.strictEqual(
          classifyRequestError(
              'Got error response from AIDA',
              JSON.stringify({error: {code: 503, status: 'UNAVAILABLE', message: 'Backend unavailable'}})),
          AiClientRequestResult.HTTP_5XX_SERVER_ERROR);
    });

    it('classifies streamed chunk array JSON error detail strings', () => {
      assert.strictEqual(
          classifyRequestError('Got error response from AIDA',
                               JSON.stringify([{error: {code: 403, status: 'PERMISSION_DENIED', message: 'Denied'}}])),
          AiClientRequestResult.HTTP_403_PERMISSION_DENIED);
      assert.strictEqual(
          classifyRequestError('Got error response from AIDA',
                               JSON.stringify([{code: 503, status: 'UNAVAILABLE', message: 'Backend unavailable'}])),
          AiClientRequestResult.HTTP_5XX_SERVER_ERROR);
    });

    it('classifies direct google.rpc.Status JSON error detail strings', () => {
      assert.strictEqual(
          classifyRequestError('Got error response from AIDA',
                               JSON.stringify({code: 400, status: 'INVALID_ARGUMENT', message: 'Bad request'})),
          AiClientRequestResult.HTTP_400_INVALID_ARGUMENT);
    });

    it('falls back to UNKNOWN_ERROR when detail is malformed JSON or lacks error fields', () => {
      assert.strictEqual(classifyRequestError('Got error response from AIDA', 'not-json'),
                         AiClientRequestResult.UNKNOWN_ERROR);
      assert.strictEqual(classifyRequestError('Got error response from AIDA', '{}'),
                         AiClientRequestResult.UNKNOWN_ERROR);
      assert.strictEqual(classifyRequestError('Got error response from AIDA', '[]'),
                         AiClientRequestResult.UNKNOWN_ERROR);
    });

    it('classifies structured JSON detail inside DispatchHttpRequestError', () => {
      assert.strictEqual(classifyRequestError(new DispatchHttpRequestError(ErrorType.HTTP_RESPONSE_UNAVAILABLE, {
                           statusCode: 400,
                           error: 'Request failed',
                           detail: JSON.stringify({error: {code: 403, status: 'PERMISSION_DENIED', message: 'Denied'}}),
                         })),
                         AiClientRequestResult.HTTP_403_PERMISSION_DENIED);
    });
  });
});
