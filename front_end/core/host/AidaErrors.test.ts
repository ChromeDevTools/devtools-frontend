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
});
