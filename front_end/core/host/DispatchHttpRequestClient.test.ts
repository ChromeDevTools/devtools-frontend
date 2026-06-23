// Copyright 2025 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import {assert} from 'chai';
import sinon from 'sinon';

import {setupLocaleHooks} from '../../testing/LocaleHelpers.js';
import {setupRuntimeHooks} from '../../testing/RuntimeHelpers.js';

import * as Host from './host.js';
import type {DispatchHttpRequestRequest, DispatchHttpRequestResult,} from './InspectorFrontendHostAPI.js';

describe('DispatchHttpRequestClient', () => {
  setupLocaleHooks();
  setupRuntimeHooks();
  const defaultRequest: Host.InspectorFrontendHostAPI.DispatchHttpRequestRequest = {
    service: 'testService',
    path: '/test',
    method: 'POST',
    body: JSON.stringify({foo: 'bar'}),
  };

  it('handles successful requests', async () => {
    sinon
        .stub(
            Host.InspectorFrontendHost.InspectorFrontendHostInstance,
            'dispatchHttpRequest',
            )
        .callsFake(
            async (
                _: DispatchHttpRequestRequest,
                callback: (result: DispatchHttpRequestResult) => void,
                ) => {
              callback({
                statusCode: 200,
                response: JSON.stringify({result: 'ok'}),
              });
            },
        );

    const result = await Host.DispatchHttpRequestClient.makeHttpRequest(defaultRequest);

    assert.deepEqual(result, {result: 'ok'});
  });

  it('handles 404 errors', async () => {
    sinon
        .stub(
            Host.InspectorFrontendHost.InspectorFrontendHostInstance,
            'dispatchHttpRequest',
            )
        .callsFake(
            async (
                _: DispatchHttpRequestRequest,
                callback: (result: DispatchHttpRequestResult) => void,
                ) => {
              callback({error: 'Error', statusCode: 404});
            },
        );

    try {
      await Host.DispatchHttpRequestClient.makeHttpRequest(defaultRequest);
      assert.fail('makeHttpRequest did not throw');
    } catch (err) {
      assert.instanceOf(
          err,
          Host.DispatchHttpRequestClient.DispatchHttpRequestError,
      );
      assert.strictEqual(
          err.type,
          Host.DispatchHttpRequestClient.ErrorType.NOT_FOUND,
      );
    }
  });

  it('handles other HTTP errors', async () => {
    sinon
        .stub(
            Host.InspectorFrontendHost.InspectorFrontendHostInstance,
            'dispatchHttpRequest',
            )
        .callsFake(
            async (
                _: DispatchHttpRequestRequest,
                callback: (result: DispatchHttpRequestResult) => void,
                ) => {
              callback({error: 'Error', statusCode: 500});
            },
        );

    try {
      await Host.DispatchHttpRequestClient.makeHttpRequest(defaultRequest);
      assert.fail('makeHttpRequest did not throw');
    } catch (err) {
      assert.instanceOf(
          err,
          Host.DispatchHttpRequestClient.DispatchHttpRequestError,
      );
      assert.strictEqual(
          err.type,
          Host.DispatchHttpRequestClient.ErrorType.HTTP_RESPONSE_UNAVAILABLE,
      );
    }
  });

  it('handles invalid JSON response', async () => {
    sinon
        .stub(
            Host.InspectorFrontendHost.InspectorFrontendHostInstance,
            'dispatchHttpRequest',
            )
        .callsFake(
            async (
                _: DispatchHttpRequestRequest,
                callback: (result: DispatchHttpRequestResult) => void,
                ) => {
              callback({statusCode: 200, response: 'invalid json'});
            },
        );

    try {
      await Host.DispatchHttpRequestClient.makeHttpRequest(defaultRequest);
      assert.fail('makeHttpRequest did not throw');
    } catch (err) {
      assert.instanceOf(
          err,
          Host.DispatchHttpRequestClient.DispatchHttpRequestError,
      );
      assert.strictEqual(
          err.type,
          Host.DispatchHttpRequestClient.ErrorType.HTTP_RESPONSE_UNAVAILABLE,
      );
    }
  });

  it('aborts the request when the signal is aborted before request execution', async () => {
    const promiseWithResolvers = Promise.withResolvers<void>();
    sinon
        .stub(
            Host.InspectorFrontendHost.InspectorFrontendHostInstance,
            'dispatchHttpRequest',
            )
        .callsFake(
            async (
                _: DispatchHttpRequestRequest,
                callback: (result: DispatchHttpRequestResult) => void,
                ) => {
              await promiseWithResolvers.promise;
              callback({
                statusCode: 200,
                response: JSON.stringify({result: 'ok'}),
              });
            },
        );

    const controller = new AbortController();
    controller.abort();
    const result = Host.DispatchHttpRequestClient.makeHttpRequest(
        defaultRequest,
        {signal: controller.signal},
    );
    try {
      await result;
      assert.fail('makeHttpRequest did not throw');
    } catch (err) {
      assert.instanceOf(
          err,
          Host.DispatchHttpRequestClient.DispatchHttpRequestError,
      );
      assert.strictEqual(
          err.type,
          Host.DispatchHttpRequestClient.ErrorType.ABORT,
      );
    } finally {
      promiseWithResolvers.resolve();
    }
  });

  it('aborts the request when the signal is aborted during request execution', async () => {
    const promiseWithResolvers = Promise.withResolvers<void>();
    sinon
        .stub(
            Host.InspectorFrontendHost.InspectorFrontendHostInstance,
            'dispatchHttpRequest',
            )
        .callsFake(
            async (
                _: DispatchHttpRequestRequest,
                callback: (result: DispatchHttpRequestResult) => void,
                ) => {
              await promiseWithResolvers.promise;
              callback({
                statusCode: 200,
                response: JSON.stringify({result: 'ok'}),
              });
            },
        );

    const controller = new AbortController();
    const result = Host.DispatchHttpRequestClient.makeHttpRequest(
        defaultRequest,
        {signal: controller.signal},
    );
    controller.abort();
    try {
      await result;
      assert.fail('makeHttpRequest did not throw');
    } catch (err) {
      assert.instanceOf(
          err,
          Host.DispatchHttpRequestClient.DispatchHttpRequestError,
      );
      assert.strictEqual(
          err.type,
          Host.DispatchHttpRequestClient.ErrorType.ABORT,
      );
    } finally {
      promiseWithResolvers.resolve();
    }
  });
});
