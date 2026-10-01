// Copyright 2025 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import {assert} from 'chai';
import sinon from 'sinon';

import * as Platform from '../../../core/platform/platform.js';
import * as SDK from '../../../core/sdk/sdk.js';
import * as TextUtils from '../../../core/text_utils/text_utils.js';
import * as Protocol from '../../../generated/protocol.js';
import {createNetworkRequest} from '../../../testing/NetworkRequestHelpers.js';
import * as Logs from '../../logs/logs.js';
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
    const REDACTED = '<redacted cross-origin initiator URL>';

    it('returns the initiator URL when it is same-origin with the request', () => {
      const initiator = createNetworkRequest({url: 'https://example.test'});
      const request = createNetworkRequest({url: 'https://example.test/data'});
      const formatted = NetworkRequestFormatter.NetworkRequestFormatter.formatInitiatorUrl(initiator, request);
      assert.strictEqual(formatted, 'https://example.test');
    });

    it('redacts the initiator URL when it is cross-origin with the request', () => {
      const initiator = createNetworkRequest({url: 'https://another-example.test'});
      const request = createNetworkRequest({url: 'https://example.test'});
      const formatted = NetworkRequestFormatter.NetworkRequestFormatter.formatInitiatorUrl(initiator, request);
      assert.strictEqual(formatted, REDACTED);
    });

    it('redacts an https initiator when the request is a file URL', () => {
      const initiator = createNetworkRequest({url: 'https://another-example.test'});
      const request = createNetworkRequest({url: 'file://test'});
      const formatted = NetworkRequestFormatter.NetworkRequestFormatter.formatInitiatorUrl(initiator, request);
      assert.strictEqual(formatted, REDACTED);
    });

    it('redacts a file URL initiator when the request is https', () => {
      const initiator = createNetworkRequest({url: 'file://test'});
      const request = createNetworkRequest({url: 'https://another-example.test'});
      const formatted = NetworkRequestFormatter.NetworkRequestFormatter.formatInitiatorUrl(initiator, request);
      assert.strictEqual(formatted, REDACTED);
    });

    it('redacts the initiator URL when file:// paths differ', () => {
      const initiator = createNetworkRequest({url: 'file:///home/user/sensitive.txt'});
      const request = createNetworkRequest({url: 'file:///tmp/app.html'});
      const formatted = NetworkRequestFormatter.NetworkRequestFormatter.formatInitiatorUrl(initiator, request);
      assert.strictEqual(formatted, REDACTED);
    });

    it('returns the initiator URL when file:// paths match', () => {
      const initiator = createNetworkRequest({url: 'file:///tmp/app.html'});
      const request = createNetworkRequest({url: 'file:///tmp/app.html'});
      const formatted = NetworkRequestFormatter.NetworkRequestFormatter.formatInitiatorUrl(initiator, request);
      assert.strictEqual(formatted, 'file:///tmp/app.html');
    });

    it('redacts the initiator URL when the subdomain differs', () => {
      const initiator = createNetworkRequest({url: 'https://example.test'});
      const request = createNetworkRequest({url: 'https://test.example.test'});
      const formatted = NetworkRequestFormatter.NetworkRequestFormatter.formatInitiatorUrl(initiator, request);
      assert.strictEqual(formatted, REDACTED);
    });

    it('redacts the initiator URL when the port differs', () => {
      const initiator = createNetworkRequest({url: 'https://test.example.test:9901'});
      const request = createNetworkRequest({url: 'https://test.example.test:9900'});
      const formatted = NetworkRequestFormatter.NetworkRequestFormatter.formatInitiatorUrl(initiator, request);
      assert.strictEqual(formatted, REDACTED);
    });

    it('redacts the initiator URL when two different requests both have invalid URLs', () => {
      const initiator = createNetworkRequest({url: 'invalid-url'});
      const request = createNetworkRequest({url: 'invalid-url'});
      const formatted = NetworkRequestFormatter.NetworkRequestFormatter.formatInitiatorUrl(initiator, request);
      assert.strictEqual(formatted, REDACTED);
    });

    it('redacts the initiator URL when it is invalid', () => {
      const initiator = createNetworkRequest({url: 'invalid-url'});
      const request = createNetworkRequest({url: 'https://example.test'});
      const formatted = NetworkRequestFormatter.NetworkRequestFormatter.formatInitiatorUrl(initiator, request);
      assert.strictEqual(formatted, REDACTED);
    });

    it('redacts the initiator URL when the request URL is invalid', () => {
      const initiator = createNetworkRequest({url: 'https://example.test'});
      const request = createNetworkRequest({url: 'invalid-url'});
      const formatted = NetworkRequestFormatter.NetworkRequestFormatter.formatInitiatorUrl(initiator, request);
      assert.strictEqual(formatted, REDACTED);
    });

    it('returns the URL when a request with an opaque URL is compared with itself', () => {
      const request = createNetworkRequest({url: 'data:text/html,<h1>Hello</h1>'});
      const formatted = NetworkRequestFormatter.NetworkRequestFormatter.formatInitiatorUrl(request, request);
      assert.strictEqual(formatted, 'data:text/html,<h1>Hello</h1>');
    });

    it('redacts the initiator URL when two different requests have the same data: URL', () => {
      const initiator = createNetworkRequest({url: 'data:text/html,<h1>Hello</h1>'});
      const request = createNetworkRequest({url: 'data:text/html,<h1>Hello</h1>'});
      const formatted = NetworkRequestFormatter.NetworkRequestFormatter.formatInitiatorUrl(initiator, request);
      assert.strictEqual(formatted, REDACTED);
    });

    it('returns the initiator URL when imported HAR requests share an authority', () => {
      const initiator = createNetworkRequest({url: 'https://example.test/index.html', isImportedHar: true});
      const request = createNetworkRequest({url: 'https://example.test/data', isImportedHar: true});
      const formatted = NetworkRequestFormatter.NetworkRequestFormatter.formatInitiatorUrl(initiator, request);
      assert.strictEqual(formatted, 'https://example.test/index.html');
    });

    it('redacts the initiator URL when imported HAR requests have different authorities', () => {
      const initiator = createNetworkRequest({url: 'https://other.test/index.html', isImportedHar: true});
      const request = createNetworkRequest({url: 'https://example.test/data', isImportedHar: true});
      const formatted = NetworkRequestFormatter.NetworkRequestFormatter.formatInitiatorUrl(initiator, request);
      assert.strictEqual(formatted, REDACTED);
    });

    it('redacts a live initiator when the request is an imported HAR request on the same host', () => {
      const initiator = createNetworkRequest({url: 'https://example.test/index.html'});
      const request = createNetworkRequest({url: 'https://example.test/data', isImportedHar: true});
      const formatted = NetworkRequestFormatter.NetworkRequestFormatter.formatInitiatorUrl(initiator, request);
      assert.strictEqual(formatted, REDACTED);
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
    const stubNetworkLog = sinon.createStubInstance(Logs.NetworkLog.NetworkLog);
    stubNetworkLog.initiatorGraphForRequest.returns({
      initiators: new Set(),
      initiated: new Map(),
    });

    function createFormatter(
        request: SDK.NetworkRequest.NetworkRequest,
        accessingSecurityOrigin: SDK.SecurityOrigin.SecurityOrigin,
        ): NetworkRequestFormatter.NetworkRequestFormatter {
      return new NetworkRequestFormatter.NetworkRequestFormatter(request, calculator, {
        accessingSecurityOrigin,
        networkLog: stubNetworkLog,
      });
    }

    it('returns SAME_ORIGIN when passing request.initiatorSecurityOrigin() for same-origin request', () => {
      const request = SDK.NetworkRequest.NetworkRequest.createWithoutBackendRequest(
          'requestId',
          urlString`https://victim.com/api/data`,
          urlString`https://victim.com/`,
          null,
      );
      const formatter = createFormatter(request, request.initiatorSecurityOrigin());
      assert.strictEqual(
          formatter.responseAccessMode(),
          SDK.NetworkRequestAccess.ResponseAccessMode.SAME_ORIGIN,
      );
    });

    it('returns SAME_ORIGIN when accessing origin matches request URL origin', () => {
      const request = SDK.NetworkRequest.NetworkRequest.createWithoutBackendRequest(
          'requestId',
          urlString`https://example.com/api/data`,
          urlString`https://example.com/index.html`,
          null,
      );
      const accessingSecurityOrigin = SDK.SecurityOrigin.SecurityOrigin.create('https://example.com');
      const formatter = createFormatter(request, accessingSecurityOrigin);
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
      const accessingSecurityOrigin = SDK.SecurityOrigin.SecurityOrigin.create('https://attacker.com');
      const formatter = createFormatter(request, accessingSecurityOrigin);
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
      const accessingSecurityOrigin = SDK.SecurityOrigin.SecurityOrigin.create('https://attacker.com');
      const formatter = createFormatter(request, accessingSecurityOrigin);
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
      const accessingSecurityOrigin = SDK.SecurityOrigin.SecurityOrigin.create('https://attacker.com');
      const formatter = createFormatter(request, accessingSecurityOrigin);
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
      const accessingSecurityOrigin = SDK.SecurityOrigin.SecurityOrigin.create('https://attacker.com');
      const formatter = createFormatter(request, accessingSecurityOrigin);
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
      const accessingSecurityOrigin = SDK.SecurityOrigin.SecurityOrigin.create('https://attacker.com');
      const formatter = createFormatter(request, accessingSecurityOrigin);
      assert.strictEqual(
          formatter.responseAccessMode(),
          SDK.NetworkRequestAccess.ResponseAccessMode.OPAQUE_CROSS_ORIGIN,
      );
    });
  });

  describe('formatResponseHeaders with CORS / Opaque restrictions', () => {
    const calculator = new NetworkTimeCalculator.NetworkTransferTimeCalculator();
    const stubNetworkLog = sinon.createStubInstance(Logs.NetworkLog.NetworkLog);
    stubNetworkLog.initiatorGraphForRequest.returns({
      initiators: new Set(),
      initiated: new Map(),
    });

    function createFormatter(
        request: SDK.NetworkRequest.NetworkRequest,
        accessingSecurityOrigin: SDK.SecurityOrigin.SecurityOrigin,
        ): NetworkRequestFormatter.NetworkRequestFormatter {
      return new NetworkRequestFormatter.NetworkRequestFormatter(request, calculator, {
        accessingSecurityOrigin,
        networkLog: stubNetworkLog,
      });
    }

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
      const accessingSecurityOrigin = SDK.SecurityOrigin.SecurityOrigin.create('https://example.com');
      const formatter = createFormatter(request, accessingSecurityOrigin);
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
      const accessingSecurityOrigin = SDK.SecurityOrigin.SecurityOrigin.create('https://attacker.com');
      const formatter = createFormatter(request, accessingSecurityOrigin);
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
      const accessingSecurityOrigin = SDK.SecurityOrigin.SecurityOrigin.create('https://attacker.com');
      const formatter = createFormatter(request, accessingSecurityOrigin);
      const formatted = formatter.formatResponseHeaders();
      assert.strictEqual(
          formatted,
          'Response headers:\nContent-Type: application/json\nX-Request-Id: req-12345',
      );
    });
  });

  describe('formatResponseBody with CORS / Opaque restrictions', () => {
    const calculator = new NetworkTimeCalculator.NetworkTransferTimeCalculator();
    const stubNetworkLog = sinon.createStubInstance(Logs.NetworkLog.NetworkLog);
    stubNetworkLog.initiatorGraphForRequest.returns({
      initiators: new Set(),
      initiated: new Map(),
    });

    function createFormatter(
        request: SDK.NetworkRequest.NetworkRequest,
        accessingSecurityOrigin: SDK.SecurityOrigin.SecurityOrigin,
        ): NetworkRequestFormatter.NetworkRequestFormatter {
      return new NetworkRequestFormatter.NetworkRequestFormatter(request, calculator, {
        accessingSecurityOrigin,
        networkLog: stubNetworkLog,
      });
    }

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
      const accessingSecurityOrigin = SDK.SecurityOrigin.SecurityOrigin.create('https://example.com');
      const formatter = createFormatter(request, accessingSecurityOrigin);
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
      const accessingSecurityOrigin = SDK.SecurityOrigin.SecurityOrigin.create('https://attacker.com');
      const formatter = createFormatter(request, accessingSecurityOrigin);
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
      const accessingSecurityOrigin = SDK.SecurityOrigin.SecurityOrigin.create('https://attacker.com');
      const formatter = createFormatter(request, accessingSecurityOrigin);
      const body = await formatter.formatResponseBody();
      assert.strictEqual(body, SDK.NetworkRequestAccess.REDACTED_RESPONSE_BODY);
      assert.notInclude(body, 'confidential');
    });
  });

  describe('formatRequestInitiatorChain', () => {
    it('formats single initiator request', () => {
      const request = SDK.NetworkRequest.NetworkRequest.createWithoutBackendRequest(
          'requestId',
          urlString`https://example.com/api/data`,
          urlString`https://example.com/index.html`,
          null,
      );
      const networkLog = sinon.createStubInstance(Logs.NetworkLog.NetworkLog);
      networkLog.initiatorGraphForRequest.withArgs(request).returns({
        initiators: new Set([request]),
        initiated: new Map(),
      });

      const formatted = NetworkRequestFormatter.formatRequestInitiatorChain(request, networkLog);
      assert.strictEqual(formatted, '- URL: https://example.com/api/data');
    });

    it('formats initiator chain with parent and child requests', () => {
      const parentRequest = SDK.NetworkRequest.NetworkRequest.createWithoutBackendRequest(
          'parent',
          urlString`https://example.com/index.html`,
          urlString`https://example.com/`,
          null,
      );
      const request = SDK.NetworkRequest.NetworkRequest.createWithoutBackendRequest(
          'request',
          urlString`https://example.com/script.js`,
          urlString`https://example.com/index.html`,
          null,
      );
      const childRequest = SDK.NetworkRequest.NetworkRequest.createWithoutBackendRequest(
          'child',
          urlString`https://example.com/data.json`,
          urlString`https://example.com/script.js`,
          null,
      );
      const networkLog = sinon.createStubInstance(Logs.NetworkLog.NetworkLog);
      networkLog.initiatorGraphForRequest.withArgs(request).returns({
        initiators: new Set([request, parentRequest]),
        initiated: new Map([[childRequest, request]]),
      });

      const formatted = NetworkRequestFormatter.formatRequestInitiatorChain(request, networkLog);
      assert.strictEqual(
          formatted,
          '- URL: https://example.com/index.html\n\t- URL: https://example.com/script.js\n\t\t- URL: https://example.com/data.json',
      );
    });

    it('redacts cross-origin URLs in initiator chain', () => {
      const crossOriginParent = SDK.NetworkRequest.NetworkRequest.createWithoutBackendRequest(
          'parent',
          urlString`https://third-party.com/embed.js`,
          urlString`https://third-party.com/`,
          null,
      );
      const request = SDK.NetworkRequest.NetworkRequest.createWithoutBackendRequest(
          'request',
          urlString`https://example.com/data`,
          urlString`https://example.com/`,
          null,
      );
      const networkLog = sinon.createStubInstance(Logs.NetworkLog.NetworkLog);
      networkLog.initiatorGraphForRequest.withArgs(request).returns({
        initiators: new Set([request, crossOriginParent]),
        initiated: new Map(),
      });

      const formatted = NetworkRequestFormatter.formatRequestInitiatorChain(request, networkLog);
      assert.strictEqual(
          formatted,
          '- URL: <redacted cross-origin initiator URL>\n\t- URL: https://example.com/data',
      );
    });

    it('redacts distinct file:// URLs in initiator chain', () => {
      const parentRequest = createNetworkRequest({url: 'file:///home/user/sensitive.txt'});
      const childRequest = createNetworkRequest({url: 'file:///tmp/app.html'});
      const networkLog = sinon.createStubInstance(Logs.NetworkLog.NetworkLog);
      // The initiator graph stores ancestors from the child request up to the root ancestor.
      // formatRequestInitiatorChain reverses this collection so the root ancestor prints first.
      networkLog.initiatorGraphForRequest.withArgs(childRequest).returns({
        initiators: new Set([childRequest, parentRequest]),
        initiated: new Map(),
      });

      const formatted = NetworkRequestFormatter.formatRequestInitiatorChain(childRequest, networkLog);
      assert.strictEqual(
          formatted,
          '- URL: <redacted cross-origin initiator URL>\n\t- URL: file:///tmp/app.html',
      );
    });

    it('does not redact matching file:// URL in initiator chain', () => {
      const parentRequest = createNetworkRequest({url: 'file:///tmp/app.html'});
      const childRequest = createNetworkRequest({url: 'file:///tmp/app.html'});
      const networkLog = sinon.createStubInstance(Logs.NetworkLog.NetworkLog);
      // The initiator graph stores ancestors from the child request up to the root ancestor.
      // formatRequestInitiatorChain reverses this collection so the root ancestor prints first.
      networkLog.initiatorGraphForRequest.withArgs(childRequest).returns({
        initiators: new Set([childRequest, parentRequest]),
        initiated: new Map(),
      });

      const formatted = NetworkRequestFormatter.formatRequestInitiatorChain(childRequest, networkLog);
      assert.strictEqual(
          formatted,
          '- URL: file:///tmp/app.html\n\t- URL: file:///tmp/app.html',
      );
    });

    it('does not redact same-origin URLs for imported HAR requests', () => {
      const parentRequest =
          createNetworkRequest({requestId: 'parent', url: 'https://example.com/index.html', isImportedHar: true});
      const request =
          createNetworkRequest({requestId: 'request', url: 'https://example.com/api/data', isImportedHar: true});
      const childRequest =
          createNetworkRequest({requestId: 'child', url: 'https://example.com/api/more', isImportedHar: true});
      const networkLog = sinon.createStubInstance(Logs.NetworkLog.NetworkLog);
      networkLog.initiatorGraphForRequest.withArgs(request).returns({
        initiators: new Set([request, parentRequest]),
        initiated: new Map([[childRequest, request]]),
      });

      const formatted = NetworkRequestFormatter.formatRequestInitiatorChain(request, networkLog);
      assert.strictEqual(
          formatted,
          '- URL: https://example.com/index.html\n\t- URL: https://example.com/api/data\n\t\t- URL: https://example.com/api/more',
      );
    });

    it('redacts cross-origin URLs for imported HAR requests', () => {
      const parentRequest =
          createNetworkRequest({requestId: 'parent', url: 'https://third-party.com/embed.js', isImportedHar: true});
      const request =
          createNetworkRequest({requestId: 'request', url: 'https://example.com/api/data', isImportedHar: true});
      const networkLog = sinon.createStubInstance(Logs.NetworkLog.NetworkLog);
      networkLog.initiatorGraphForRequest.withArgs(request).returns({
        initiators: new Set([request, parentRequest]),
        initiated: new Map(),
      });

      const formatted = NetworkRequestFormatter.formatRequestInitiatorChain(request, networkLog);
      assert.strictEqual(
          formatted,
          '- URL: <redacted cross-origin initiator URL>\n\t- URL: https://example.com/api/data',
      );
    });

    it('does not redact the selected request when its URL has an opaque origin', () => {
      const parentRequest = createNetworkRequest({requestId: 'parent', url: 'https://example.com/index.html'});
      const request = createNetworkRequest({requestId: 'request', url: 'data:image/png;base64,iVBOR'});
      const networkLog = sinon.createStubInstance(Logs.NetworkLog.NetworkLog);
      networkLog.initiatorGraphForRequest.withArgs(request).returns({
        initiators: new Set([request, parentRequest]),
        initiated: new Map(),
      });

      const formatted = NetworkRequestFormatter.formatRequestInitiatorChain(request, networkLog);
      assert.strictEqual(
          formatted,
          '- URL: <redacted cross-origin initiator URL>\n\t- URL: data:image/png;base64,iVBOR',
      );
    });
  });
});
