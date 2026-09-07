// Copyright 2025 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import {assert} from 'chai';

import * as Common from '../../../core/common/common.js';
import * as Platform from '../../../core/platform/platform.js';
import * as SDK from '../../../core/sdk/sdk.js';
import * as TextUtils from '../../../core/text_utils/text_utils.js';
import * as Protocol from '../../../generated/protocol.js';
import * as NetworkTimeCalculator from '../../network_time_calculator/network_time_calculator.js';
import {NetworkRequestFormatter} from '../ai_assistance.js';

const {urlString} = Platform.DevToolsPath;

describe('NetworkRequestFormatter', () => {
  describe('allowHeader', () => {
    it('allows a header from the list', () => {
      assert.isTrue(NetworkRequestFormatter.NetworkRequestFormatter.allowHeader('content-type'));
    });

    it('disallows headers not on the list', () => {
      assert.isFalse(NetworkRequestFormatter.NetworkRequestFormatter.allowHeader('cookie'));
      assert.isFalse(NetworkRequestFormatter.NetworkRequestFormatter.allowHeader('set-cookie'));
      assert.isFalse(NetworkRequestFormatter.NetworkRequestFormatter.allowHeader('authorization'));
    });
  });

  describe('formatInitiatorUrl', () => {
    it('returns target resource when allowed resource is same-origin', () => {
      const allowedOrigin = Common.ParsedURL.ParsedURL.extractOrigin(urlString`https://example.test`);
      const formatted = NetworkRequestFormatter.NetworkRequestFormatter.formatInitiatorUrl(
          urlString`https://example.test`, allowedOrigin);
      assert.strictEqual(formatted, 'https://example.test');
    });

    it('redacts target resource when allowed resource is cross-origin', () => {
      const allowedOrigin = Common.ParsedURL.ParsedURL.extractOrigin(urlString`https://example.test`);
      const formatted = NetworkRequestFormatter.NetworkRequestFormatter.formatInitiatorUrl(
          urlString`https://another-example.test`, allowedOrigin);
      assert.strictEqual(formatted, '<redacted cross-origin initiator URL>');
    });

    it('redacts target resource when allowed resource is file URL', () => {
      const allowedOrigin = Common.ParsedURL.ParsedURL.extractOrigin(urlString`file://test`);
      const formatted = NetworkRequestFormatter.NetworkRequestFormatter.formatInitiatorUrl(
          urlString`https://another-example.test`, allowedOrigin);
      assert.strictEqual(formatted, '<redacted cross-origin initiator URL>');
    });

    it('redacts target resource when target resource is file URL and allowed is https', () => {
      const allowedOrigin = Common.ParsedURL.ParsedURL.extractOrigin(urlString`https://another-example.test`);
      const formatted =
          NetworkRequestFormatter.NetworkRequestFormatter.formatInitiatorUrl(urlString`file://test`, allowedOrigin);
      assert.strictEqual(formatted, '<redacted cross-origin initiator URL>');
    });

    it('redacts target resource when subdomain differs', () => {
      const allowedOrigin = Common.ParsedURL.ParsedURL.extractOrigin(urlString`https://test.example.test`);
      const formatted = NetworkRequestFormatter.NetworkRequestFormatter.formatInitiatorUrl(
          urlString`https://example.test`, allowedOrigin);
      assert.strictEqual(formatted, '<redacted cross-origin initiator URL>');
    });

    it('redacts target resource when port differs', () => {
      const allowedOrigin = Common.ParsedURL.ParsedURL.extractOrigin(urlString`https://test.example.test:9900`);
      const formatted = NetworkRequestFormatter.NetworkRequestFormatter.formatInitiatorUrl(
          urlString`https://test.example.test:9901`, allowedOrigin);
      assert.strictEqual(formatted, '<redacted cross-origin initiator URL>');
    });

    it('redacts target resource when both URLs are invalid', () => {
      const allowedOrigin = Common.ParsedURL.ParsedURL.extractOrigin(urlString`invalid-url`);
      const formatted =
          NetworkRequestFormatter.NetworkRequestFormatter.formatInitiatorUrl(urlString`invalid-url`, allowedOrigin);
      assert.strictEqual(formatted, '<redacted cross-origin initiator URL>');
    });

    it('redacts target resource when target is invalid URL', () => {
      const allowedOrigin = Common.ParsedURL.ParsedURL.extractOrigin(urlString`https://example.test`);
      const formatted =
          NetworkRequestFormatter.NetworkRequestFormatter.formatInitiatorUrl(urlString`invalid-url`, allowedOrigin);
      assert.strictEqual(formatted, '<redacted cross-origin initiator URL>');
    });

    it('redacts target resource when allowed is invalid URL', () => {
      const allowedOrigin = Common.ParsedURL.ParsedURL.extractOrigin(urlString`invalid-url`);
      const formatted = NetworkRequestFormatter.NetworkRequestFormatter.formatInitiatorUrl(
          urlString`https://example.test`, allowedOrigin);
      assert.strictEqual(formatted, '<redacted cross-origin initiator URL>');
    });
  });

  describe('formatBody', () => {
    const fakeRequest = SDK.NetworkRequest.NetworkRequest.createWithoutBackendRequest(
        'fakeRequestId',
        Platform.DevToolsPath.urlString`url1`,
        Platform.DevToolsPath.urlString`documentURL`,
        null,
    );

    it('handles empty response correctly', async () => {
      fakeRequest.requestContentData = (): Promise<TextUtils.ContentData.ContentDataOrError> => {
        return Promise.resolve(new TextUtils.ContentData.ContentData('', false, ''));
      };

      const result = await NetworkRequestFormatter.NetworkRequestFormatter.formatBody('test:', fakeRequest, 100);

      assert.strictEqual(result, 'test:\n<empty response>');
    });

    it('handles base64 text correctly', async () => {
      fakeRequest.requestContentData = (): Promise<TextUtils.ContentData.ContentDataOrError> => {
        return Promise.resolve(new TextUtils.ContentData.ContentData('some base64 string', true, ''));
      };

      const result = await NetworkRequestFormatter.NetworkRequestFormatter.formatBody('test:', fakeRequest, 100);

      assert.strictEqual(result, 'test:\n<binary data>');
    });

    it('handles the text limit correctly', async () => {
      fakeRequest.requestContentData = (): Promise<TextUtils.ContentData.ContentDataOrError> => {
        return Promise.resolve(
            new TextUtils.ContentData.ContentData('some text that is longer than expected', false, 'text/plain'));
      };

      const result = await NetworkRequestFormatter.NetworkRequestFormatter.formatBody('test:', fakeRequest, 20);

      assert.strictEqual(result, `test:\nsome text that is lo... <truncated>`);
    });

    it('handles the text format correctly', async () => {
      fakeRequest.requestContentData = (): Promise<TextUtils.ContentData.ContentDataOrError> => {
        return Promise.resolve(
            new TextUtils.ContentData.ContentData(JSON.stringify({response: 'body'}), false, 'application/json'));
      };

      const result = await NetworkRequestFormatter.NetworkRequestFormatter.formatBody('test:', fakeRequest, 100);

      assert.strictEqual(result, `test:\n${JSON.stringify({response: 'body'})}`);
    });

    it('handles error correctly', async () => {
      fakeRequest.requestContentData = (): Promise<TextUtils.ContentData.ContentDataOrError> => {
        return Promise.resolve({
          error: 'an error has occurred',
        } as TextUtils.ContentData.ContentDataOrError);
      };

      const result = await NetworkRequestFormatter.NetworkRequestFormatter.formatBody('test:', fakeRequest, 100);

      assert.strictEqual(result, '');
    });
  });

  describe('formatHeaders', () => {
    it('does not redact a header from the list', () => {
      assert.strictEqual(
          NetworkRequestFormatter.NetworkRequestFormatter.formatHeaders(
              'test:', [{name: 'content-type', value: 'foo'}]),
          'test:\ncontent-type: foo');
    });

    it('disallows headers not on the list', () => {
      assert.strictEqual(
          NetworkRequestFormatter.NetworkRequestFormatter.formatHeaders('test:', [{name: 'cookie', value: 'foo'}]),
          'test:\ncookie: <redacted>');
      assert.strictEqual(
          NetworkRequestFormatter.NetworkRequestFormatter.formatHeaders('test:', [{name: 'set-cookie', value: 'foo'}]),
          'test:\nset-cookie: <redacted>');
      assert.strictEqual(
          NetworkRequestFormatter.NetworkRequestFormatter.formatHeaders(
              'test:', [{name: 'authorization', value: 'foo'}]),
          'test:\nauthorization: <redacted>');
    });
  });

  describe('formatStatus', () => {
    it('handles pending state correctly', () => {
      assert.strictEqual(
          NetworkRequestFormatter.NetworkRequestFormatter.formatStatus({
            statusCode: 0,
            statusText: '',
            failed: false,
            canceled: false,
            preserved: false,
            finished: false,
          }),
          'Network request status: pending\n');
    });

    it('handles finished state with status code correctly', () => {
      assert.strictEqual(
          NetworkRequestFormatter.NetworkRequestFormatter.formatStatus({
            statusCode: 200,
            statusText: 'OK',
            failed: false,
            canceled: false,
            preserved: false,
            finished: true,
          }),
          'Response status: 200 OK\nNetwork request status: finished\n');
    });

    it('handles finished state with status code and empty status text correctly', () => {
      assert.strictEqual(NetworkRequestFormatter.NetworkRequestFormatter.formatStatus({
        statusCode: 200,
        statusText: '',
        failed: false,
        canceled: false,
        preserved: false,
        finished: true,
      }),
                         'Response status: 200\nNetwork request status: finished\n');
    });

    it('handles preserved state correctly', () => {
      assert.strictEqual(
          NetworkRequestFormatter.NetworkRequestFormatter.formatStatus({
            statusCode: 0,
            statusText: '',
            failed: false,
            canceled: false,
            preserved: true,
            finished: true,
          }),
          'Network request status: finished, preserved\n');
    });

    it('handles failed and canceled states correctly', () => {
      assert.strictEqual(
          NetworkRequestFormatter.NetworkRequestFormatter.formatStatus({
            statusCode: 0,
            statusText: '',
            failed: true,
            canceled: true,
            preserved: false,
            finished: true,
          }),
          'Network request status: finished, failed, canceled\n');
    });
  });

  describe('formatFailureReasons', () => {
    it('handles no failure reason correctly', () => {
      assert.strictEqual(
          NetworkRequestFormatter.NetworkRequestFormatter.formatFailureReasons({
            blockedReason: undefined,
            corsErrorStatus: undefined,
            localizedFailDescription: null,
          }),
          '');
    });

    it('handles blocked reason correctly', () => {
      assert.strictEqual(
          NetworkRequestFormatter.NetworkRequestFormatter.formatFailureReasons({
            blockedReason: Protocol.Network.BlockedReason.Inspector,
            corsErrorStatus: undefined,
            localizedFailDescription: null,
          }),
          'Blocked reason: a custom network condition in DevTools is blocking this request\n');
    });

    it('handles CORS error correctly', () => {
      assert.strictEqual(
          NetworkRequestFormatter.NetworkRequestFormatter.formatFailureReasons({
            blockedReason: undefined,
            corsErrorStatus: {
              corsError: Protocol.Network.CorsError.AllowOriginMismatch,
              failedParameter: 'foo',
            },
            localizedFailDescription: null,
          }),
          'CORS error: AllowOriginMismatch foo\n');
    });

    it('handles localized fail description correctly', () => {
      assert.strictEqual(
          NetworkRequestFormatter.NetworkRequestFormatter.formatFailureReasons({
            blockedReason: undefined,
            corsErrorStatus: undefined,
            localizedFailDescription: 'net::ERR_FAILED',
          }),
          'Fail description: net::ERR_FAILED\n');
    });
  });

  describe('responseAccessMode', () => {
    const calculator = new NetworkTimeCalculator.NetworkTransferTimeCalculator();

    it('returns SAME_ORIGIN when passing request.initiatorSecurityOrigin() for same-origin request', () => {
      const request = SDK.NetworkRequest.NetworkRequest.createWithoutBackendRequest(
          'requestId',
          urlString`https://victim.com/api/data`,
          urlString`https://victim.com/`,
          null,
      );
      const formatter = new NetworkRequestFormatter.NetworkRequestFormatter(request, calculator, {
        initiatorSecurityOrigin: request.initiatorSecurityOrigin(),
      });
      assert.strictEqual(
          formatter.responseAccessMode(),
          SDK.NetworkRequestAccess.ResponseAccessMode.SAME_ORIGIN,
      );
    });

    it('returns SAME_ORIGIN when initiator origin matches request URL origin', () => {
      const request = SDK.NetworkRequest.NetworkRequest.createWithoutBackendRequest(
          'requestId',
          urlString`https://example.com/api/data`,
          urlString`https://example.com/index.html`,
          null,
      );
      const initiatorSecurityOrigin = SDK.SecurityOrigin.SecurityOrigin.create('https://example.com');
      const formatter = new NetworkRequestFormatter.NetworkRequestFormatter(
          request,
          calculator,
          {initiatorSecurityOrigin},
      );
      assert.strictEqual(
          formatter.responseAccessMode(),
          SDK.NetworkRequestAccess.ResponseAccessMode.SAME_ORIGIN,
      );
    });

    it('returns OPAQUE_CROSS_ORIGIN when request is cross-origin with no CORS headers', () => {
      const request = SDK.NetworkRequest.NetworkRequest.createWithoutBackendRequest(
          'requestId',
          urlString`https://victim.com/api/data`,
          urlString`https://attacker.com/index.html`,
          null,
      );
      const initiatorSecurityOrigin = SDK.SecurityOrigin.SecurityOrigin.create('https://attacker.com');
      const formatter = new NetworkRequestFormatter.NetworkRequestFormatter(
          request,
          calculator,
          {initiatorSecurityOrigin},
      );
      assert.strictEqual(
          formatter.responseAccessMode(),
          SDK.NetworkRequestAccess.ResponseAccessMode.OPAQUE_CROSS_ORIGIN,
      );
    });

    it('returns CORS_ALLOWED when request is cross-origin with wildcard Access-Control-Allow-Origin', () => {
      const request = SDK.NetworkRequest.NetworkRequest.createWithoutBackendRequest(
          'requestId',
          urlString`https://victim.com/api/data`,
          urlString`https://attacker.com/index.html`,
          null,
      );
      request.responseHeaders = [{name: 'Access-Control-Allow-Origin', value: '*'}];
      const initiatorSecurityOrigin = SDK.SecurityOrigin.SecurityOrigin.create('https://attacker.com');
      const formatter = new NetworkRequestFormatter.NetworkRequestFormatter(
          request,
          calculator,
          {initiatorSecurityOrigin},
      );
      assert.strictEqual(
          formatter.responseAccessMode(),
          SDK.NetworkRequestAccess.ResponseAccessMode.CORS_ALLOWED,
      );
    });

    it('returns CORS_ALLOWED when request is cross-origin with matching Access-Control-Allow-Origin', () => {
      const request = SDK.NetworkRequest.NetworkRequest.createWithoutBackendRequest(
          'requestId',
          urlString`https://victim.com/api/data`,
          urlString`https://attacker.com/index.html`,
          null,
      );
      request.responseHeaders = [{name: 'Access-Control-Allow-Origin', value: 'https://attacker.com'}];
      const initiatorSecurityOrigin = SDK.SecurityOrigin.SecurityOrigin.create('https://attacker.com');
      const formatter = new NetworkRequestFormatter.NetworkRequestFormatter(
          request,
          calculator,
          {initiatorSecurityOrigin},
      );
      assert.strictEqual(
          formatter.responseAccessMode(),
          SDK.NetworkRequestAccess.ResponseAccessMode.CORS_ALLOWED,
      );
    });

    it('returns OPAQUE_CROSS_ORIGIN when request is cross-origin with mismatched Access-Control-Allow-Origin', () => {
      const request = SDK.NetworkRequest.NetworkRequest.createWithoutBackendRequest(
          'requestId',
          urlString`https://victim.com/api/data`,
          urlString`https://attacker.com/index.html`,
          null,
      );
      request.responseHeaders = [{name: 'Access-Control-Allow-Origin', value: 'https://other.com'}];
      const initiatorSecurityOrigin = SDK.SecurityOrigin.SecurityOrigin.create('https://attacker.com');
      const formatter = new NetworkRequestFormatter.NetworkRequestFormatter(
          request,
          calculator,
          {initiatorSecurityOrigin},
      );
      assert.strictEqual(
          formatter.responseAccessMode(),
          SDK.NetworkRequestAccess.ResponseAccessMode.OPAQUE_CROSS_ORIGIN,
      );
    });

    it('returns OPAQUE_CROSS_ORIGIN when request has CORS error status despite header presence', () => {
      const request = SDK.NetworkRequest.NetworkRequest.createWithoutBackendRequest(
          'requestId',
          urlString`https://victim.com/api/data`,
          urlString`https://attacker.com/index.html`,
          null,
      );
      request.responseHeaders = [{name: 'Access-Control-Allow-Origin', value: '*'}];
      request.setCorsErrorStatus({
        corsError: Protocol.Network.CorsError.DisallowedByMode,
        failedParameter: 'foo',
      });
      const initiatorSecurityOrigin = SDK.SecurityOrigin.SecurityOrigin.create('https://attacker.com');
      const formatter = new NetworkRequestFormatter.NetworkRequestFormatter(
          request,
          calculator,
          {initiatorSecurityOrigin},
      );
      assert.strictEqual(
          formatter.responseAccessMode(),
          SDK.NetworkRequestAccess.ResponseAccessMode.OPAQUE_CROSS_ORIGIN,
      );
    });
  });

  describe('formatResponseHeaders with CORS / Opaque restrictions', () => {
    const calculator = new NetworkTimeCalculator.NetworkTransferTimeCalculator();

    it('includes all allowed headers for same-origin requests', () => {
      const request = SDK.NetworkRequest.NetworkRequest.createWithoutBackendRequest(
          'requestId',
          urlString`https://example.com/api/data`,
          urlString`https://example.com/`,
          null,
      );
      request.responseHeaders = [
        {name: 'Content-Type', value: 'application/json'},
        {name: 'Cache-Control', value: 'no-cache'},
        {name: 'Location', value: '/secret-redirect'},
        {name: 'Server', value: 'Apache'},
      ];
      const initiatorSecurityOrigin = SDK.SecurityOrigin.SecurityOrigin.create('https://example.com');
      const formatter = new NetworkRequestFormatter.NetworkRequestFormatter(
          request,
          calculator,
          {initiatorSecurityOrigin},
      );
      const formatted = formatter.formatResponseHeaders();
      assert.strictEqual(
          formatted,
          'Response headers:\nContent-Type: application/json\nCache-Control: no-cache\nLocation: /secret-redirect\nServer: Apache',
      );
    });

    it('filters out non-safelisted headers for opaque cross-origin requests', () => {
      const request = SDK.NetworkRequest.NetworkRequest.createWithoutBackendRequest(
          'requestId',
          urlString`https://victim.com/api/data`,
          urlString`https://attacker.com/`,
          null,
      );
      request.responseHeaders = [
        {name: 'Content-Type', value: 'application/json'},
        {name: 'Cache-Control', value: 'no-cache'},
        {name: 'Location', value: '/secret-redirect'},
        {name: 'Server', value: 'Apache'},
        {name: 'WWW-Authenticate', value: 'Basic realm="Secret"'},
      ];
      const initiatorSecurityOrigin = SDK.SecurityOrigin.SecurityOrigin.create('https://attacker.com');
      const formatter = new NetworkRequestFormatter.NetworkRequestFormatter(
          request,
          calculator,
          {initiatorSecurityOrigin},
      );
      const formatted = formatter.formatResponseHeaders();
      assert.strictEqual(
          formatted,
          'Response headers:\nContent-Type: application/json\nCache-Control: no-cache',
      );
    });

    it('includes explicitly exposed headers via Access-Control-Expose-Headers for CORS-allowed requests', () => {
      const request = SDK.NetworkRequest.NetworkRequest.createWithoutBackendRequest(
          'requestId',
          urlString`https://victim.com/api/data`,
          urlString`https://attacker.com/`,
          null,
      );
      request.responseHeaders = [
        {name: 'Access-Control-Allow-Origin', value: 'https://attacker.com'},
        {name: 'Content-Type', value: 'application/json'},
        {name: 'X-Request-Id', value: 'req-12345'},
        {name: 'Location', value: '/secret-redirect'},
        {name: 'Access-Control-Expose-Headers', value: 'X-Request-Id'},
      ];
      const initiatorSecurityOrigin = SDK.SecurityOrigin.SecurityOrigin.create('https://attacker.com');
      const formatter = new NetworkRequestFormatter.NetworkRequestFormatter(
          request,
          calculator,
          {initiatorSecurityOrigin},
      );
      const formatted = formatter.formatResponseHeaders();
      assert.strictEqual(
          formatted,
          'Response headers:\nContent-Type: application/json\nX-Request-Id: req-12345',
      );
    });
  });

  describe('formatResponseBody with CORS / Opaque restrictions', () => {
    const calculator = new NetworkTimeCalculator.NetworkTransferTimeCalculator();

    it('returns response body for same-origin requests', async () => {
      const request = SDK.NetworkRequest.NetworkRequest.createWithoutBackendRequest(
          'requestId',
          urlString`https://example.com/api/data`,
          urlString`https://example.com/`,
          null,
      );
      request.requestContentData = () => {
        return Promise.resolve(new TextUtils.ContentData.ContentData('{"user":"alice"}', false, 'application/json'));
      };
      const initiatorSecurityOrigin = SDK.SecurityOrigin.SecurityOrigin.create('https://example.com');
      const formatter = new NetworkRequestFormatter.NetworkRequestFormatter(
          request,
          calculator,
          {initiatorSecurityOrigin},
      );
      const body = await formatter.formatResponseBody();
      assert.strictEqual(body, 'Response body:\n{"user":"alice"}');
    });

    it('returns response body for CORS-allowed cross-origin requests', async () => {
      const request = SDK.NetworkRequest.NetworkRequest.createWithoutBackendRequest(
          'requestId',
          urlString`https://victim.com/api/data`,
          urlString`https://attacker.com/`,
          null,
      );
      request.responseHeaders = [{name: 'Access-Control-Allow-Origin', value: 'https://attacker.com'}];
      request.requestContentData = () => {
        return Promise.resolve(new TextUtils.ContentData.ContentData('{"user":"alice"}', false, 'application/json'));
      };
      const initiatorSecurityOrigin = SDK.SecurityOrigin.SecurityOrigin.create('https://attacker.com');
      const formatter = new NetworkRequestFormatter.NetworkRequestFormatter(
          request,
          calculator,
          {initiatorSecurityOrigin},
      );
      const body = await formatter.formatResponseBody();
      assert.strictEqual(body, 'Response body:\n{"user":"alice"}');
    });

    it('redacts response body for opaque cross-origin requests', async () => {
      const request = SDK.NetworkRequest.NetworkRequest.createWithoutBackendRequest(
          'requestId',
          urlString`https://victim.com/api/data`,
          urlString`https://attacker.com/`,
          null,
      );
      request.requestContentData = () => {
        return Promise.resolve(
            new TextUtils.ContentData.ContentData('{"secret":"confidential"}', false, 'application/json'));
      };
      const initiatorSecurityOrigin = SDK.SecurityOrigin.SecurityOrigin.create('https://attacker.com');
      const formatter = new NetworkRequestFormatter.NetworkRequestFormatter(
          request,
          calculator,
          {initiatorSecurityOrigin},
      );
      const body = await formatter.formatResponseBody();
      assert.strictEqual(body, SDK.NetworkRequestAccess.REDACTED_RESPONSE_BODY);
      assert.notInclude(body, 'confidential');
    });
  });
});
