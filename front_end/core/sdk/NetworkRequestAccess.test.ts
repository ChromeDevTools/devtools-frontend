// Copyright 2026 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import {assert} from 'chai';

import * as Protocol from '../../generated/protocol.js';
import * as Platform from '../platform/platform.js';

import * as SDK from './sdk.js';

const {urlString} = Platform.DevToolsPath;

describe('NetworkRequestAccess', () => {
  describe('evaluateResponseAccessMode', () => {
    it('returns SAME_ORIGIN when initiatorOrigin is same-origin with request URL', () => {
      const request = SDK.NetworkRequest.NetworkRequest.createWithoutBackendRequest(
          'requestId',
          urlString`https://example.com/api/data`,
          urlString`https://example.com/index.html`,
          null,
      );
      const initiatorOrigin = SDK.SecurityOrigin.SecurityOrigin.create('https://example.com');
      const mode = SDK.NetworkRequestAccess.evaluateResponseAccessMode(request, initiatorOrigin);
      assert.strictEqual(mode, SDK.NetworkRequestAccess.ResponseAccessMode.SAME_ORIGIN);
    });

    it('falls back to documentURL and returns SAME_ORIGIN when initiatorOrigin is omitted', () => {
      const request = SDK.NetworkRequest.NetworkRequest.createWithoutBackendRequest(
          'requestId',
          urlString`https://example.com/api/data`,
          urlString`https://example.com/index.html`,
          null,
      );
      const mode = SDK.NetworkRequestAccess.evaluateResponseAccessMode(request);
      assert.strictEqual(mode, SDK.NetworkRequestAccess.ResponseAccessMode.SAME_ORIGIN);
    });

    it('falls back to documentURL and returns OPAQUE_CROSS_ORIGIN when documentURL is cross-origin and no CORS headers exist',
       () => {
         const request = SDK.NetworkRequest.NetworkRequest.createWithoutBackendRequest(
             'requestId',
             urlString`https://victim.com/api/data`,
             urlString`https://attacker.com/index.html`,
             null,
         );
         const mode = SDK.NetworkRequestAccess.evaluateResponseAccessMode(request);
         assert.strictEqual(mode, SDK.NetworkRequestAccess.ResponseAccessMode.OPAQUE_CROSS_ORIGIN);
       });

    it('returns OPAQUE_CROSS_ORIGIN when request is cross-origin with no CORS headers', () => {
      const request = SDK.NetworkRequest.NetworkRequest.createWithoutBackendRequest(
          'requestId',
          urlString`https://victim.com/api/data`,
          urlString`https://attacker.com/index.html`,
          null,
      );
      const initiatorOrigin = SDK.SecurityOrigin.SecurityOrigin.create('https://attacker.com');
      const mode = SDK.NetworkRequestAccess.evaluateResponseAccessMode(request, initiatorOrigin);
      assert.strictEqual(mode, SDK.NetworkRequestAccess.ResponseAccessMode.OPAQUE_CROSS_ORIGIN);
    });

    it('returns OPAQUE_CROSS_ORIGIN when browser flagged a CORS error despite Access-Control-Allow-Origin header',
       () => {
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
         const initiatorOrigin = SDK.SecurityOrigin.SecurityOrigin.create('https://attacker.com');
         const mode = SDK.NetworkRequestAccess.evaluateResponseAccessMode(request, initiatorOrigin);
         assert.strictEqual(mode, SDK.NetworkRequestAccess.ResponseAccessMode.OPAQUE_CROSS_ORIGIN);
       });

    it('returns CORS_ALLOWED when request is uncredentialed and server returns wildcard Access-Control-Allow-Origin',
       () => {
         const request = SDK.NetworkRequest.NetworkRequest.createWithoutBackendRequest(
             'requestId',
             urlString`https://victim.com/api/data`,
             urlString`https://attacker.com/index.html`,
             null,
         );
         request.responseHeaders = [{name: 'Access-Control-Allow-Origin', value: '*'}];
         const initiatorOrigin = SDK.SecurityOrigin.SecurityOrigin.create('https://attacker.com');
         const mode = SDK.NetworkRequestAccess.evaluateResponseAccessMode(request, initiatorOrigin);
         assert.strictEqual(mode, SDK.NetworkRequestAccess.ResponseAccessMode.CORS_ALLOWED);
       });

    it('returns OPAQUE_CROSS_ORIGIN when request included cookies and server returns wildcard Access-Control-Allow-Origin',
       () => {
         const request = SDK.NetworkRequest.NetworkRequest.createWithoutBackendRequest(
             'requestId',
             urlString`https://victim.com/api/data`,
             urlString`https://attacker.com/index.html`,
             null,
         );
         request.responseHeaders = [{name: 'Access-Control-Allow-Origin', value: '*'}];
         request.setIncludedRequestCookies([{
           cookie: new SDK.Cookie.Cookie('sid', '12345'),
           exemptionReason: undefined,
         }]);
         const initiatorOrigin = SDK.SecurityOrigin.SecurityOrigin.create('https://attacker.com');
         const mode = SDK.NetworkRequestAccess.evaluateResponseAccessMode(request, initiatorOrigin);
         assert.strictEqual(mode, SDK.NetworkRequestAccess.ResponseAccessMode.OPAQUE_CROSS_ORIGIN);
       });

    it('returns OPAQUE_CROSS_ORIGIN when Access-Control-Allow-Credentials is true and server returns wildcard Access-Control-Allow-Origin',
       () => {
         const request = SDK.NetworkRequest.NetworkRequest.createWithoutBackendRequest(
             'requestId',
             urlString`https://victim.com/api/data`,
             urlString`https://attacker.com/index.html`,
             null,
         );
         request.responseHeaders = [
           {name: 'Access-Control-Allow-Origin', value: '*'},
           {name: 'Access-Control-Allow-Credentials', value: 'true'},
         ];
         const initiatorOrigin = SDK.SecurityOrigin.SecurityOrigin.create('https://attacker.com');
         const mode = SDK.NetworkRequestAccess.evaluateResponseAccessMode(request, initiatorOrigin);
         assert.strictEqual(mode, SDK.NetworkRequestAccess.ResponseAccessMode.OPAQUE_CROSS_ORIGIN);
       });

    it('returns CORS_ALLOWED when server returns exact matching Access-Control-Allow-Origin with surrounding whitespace',
       () => {
         const request = SDK.NetworkRequest.NetworkRequest.createWithoutBackendRequest(
             'requestId',
             urlString`https://victim.com/api/data`,
             urlString`https://attacker.com/index.html`,
             null,
         );
         request.responseHeaders = [{name: 'Access-Control-Allow-Origin', value: '  https://attacker.com  '}];
         const initiatorOrigin = SDK.SecurityOrigin.SecurityOrigin.create('https://attacker.com');
         const mode = SDK.NetworkRequestAccess.evaluateResponseAccessMode(request, initiatorOrigin);
         assert.strictEqual(mode, SDK.NetworkRequestAccess.ResponseAccessMode.CORS_ALLOWED);
       });

    it('returns CORS_ALLOWED when credentialed request has explicit matching Access-Control-Allow-Origin', () => {
      const request = SDK.NetworkRequest.NetworkRequest.createWithoutBackendRequest(
          'requestId',
          urlString`https://victim.com/api/data`,
          urlString`https://attacker.com/index.html`,
          null,
      );
      request.responseHeaders = [
        {name: 'Access-Control-Allow-Origin', value: 'https://attacker.com'},
        {name: 'Access-Control-Allow-Credentials', value: 'true'},
      ];
      request.responseCookies = [new SDK.Cookie.Cookie('sid', '12345')];
      const initiatorOrigin = SDK.SecurityOrigin.SecurityOrigin.create('https://attacker.com');
      const mode = SDK.NetworkRequestAccess.evaluateResponseAccessMode(request, initiatorOrigin);
      assert.strictEqual(mode, SDK.NetworkRequestAccess.ResponseAccessMode.CORS_ALLOWED);
    });

    it('returns CORS_ALLOWED when Access-Control-Allow-Origin has different casing than initiator', () => {
      const request = SDK.NetworkRequest.NetworkRequest.createWithoutBackendRequest(
          'requestId',
          urlString`https://victim.com/api/data`,
          urlString`https://attacker.com/index.html`,
          null,
      );
      request.responseHeaders = [{name: 'Access-Control-Allow-Origin', value: 'HTTPS://ATTACKER.COM'}];
      const initiatorOrigin = SDK.SecurityOrigin.SecurityOrigin.create('https://attacker.com');
      const mode = SDK.NetworkRequestAccess.evaluateResponseAccessMode(request, initiatorOrigin);
      assert.strictEqual(mode, SDK.NetworkRequestAccess.ResponseAccessMode.CORS_ALLOWED);
    });

    it('returns OPAQUE_CROSS_ORIGIN when server returns mismatched Access-Control-Allow-Origin', () => {
      const request = SDK.NetworkRequest.NetworkRequest.createWithoutBackendRequest(
          'requestId',
          urlString`https://victim.com/api/data`,
          urlString`https://attacker.com/index.html`,
          null,
      );
      request.responseHeaders = [{name: 'Access-Control-Allow-Origin', value: 'https://other.com'}];
      const initiatorOrigin = SDK.SecurityOrigin.SecurityOrigin.create('https://attacker.com');
      const mode = SDK.NetworkRequestAccess.evaluateResponseAccessMode(request, initiatorOrigin);
      assert.strictEqual(mode, SDK.NetworkRequestAccess.ResponseAccessMode.OPAQUE_CROSS_ORIGIN);
    });

    it('returns OPAQUE_CROSS_ORIGIN when scheme or port differs without CORS headers', () => {
      const request = SDK.NetworkRequest.NetworkRequest.createWithoutBackendRequest(
          'requestId',
          urlString`http://example.com:8080/api/data`,
          urlString`https://example.com:8443/index.html`,
          null,
      );
      const initiatorOrigin = SDK.SecurityOrigin.SecurityOrigin.create('https://example.com:8443');
      const mode = SDK.NetworkRequestAccess.evaluateResponseAccessMode(request, initiatorOrigin);
      assert.strictEqual(mode, SDK.NetworkRequestAccess.ResponseAccessMode.OPAQUE_CROSS_ORIGIN);
    });

    it('returns OPAQUE_CROSS_ORIGIN when initiator origin is opaque even if server returns wildcard Access-Control-Allow-Origin',
       () => {
         const request = SDK.NetworkRequest.NetworkRequest.createWithoutBackendRequest(
             'requestId',
             urlString`https://victim.com/api/data`,
             urlString`data:text/html,test`,
             null,
         );
         request.responseHeaders = [{name: 'Access-Control-Allow-Origin', value: '*'}];
         const initiatorOrigin = SDK.SecurityOrigin.SecurityOrigin.createUniqueOpaque();
         const mode = SDK.NetworkRequestAccess.evaluateResponseAccessMode(request, initiatorOrigin);
         assert.strictEqual(mode, SDK.NetworkRequestAccess.ResponseAccessMode.OPAQUE_CROSS_ORIGIN);
       });

    it('returns OPAQUE_CROSS_ORIGIN when request includes Authorization header and server returns wildcard Access-Control-Allow-Origin',
       () => {
         const request = SDK.NetworkRequest.NetworkRequest.createWithoutBackendRequest(
             'requestId',
             urlString`https://victim.com/api/data`,
             urlString`https://attacker.com/index.html`,
             null,
         );
         request.responseHeaders = [{name: 'Access-Control-Allow-Origin', value: '*'}];
         request.setRequestHeaders([{name: 'Authorization', value: 'Bearer secret-token'}]);
         const initiatorOrigin = SDK.SecurityOrigin.SecurityOrigin.create('https://attacker.com');
         const mode = SDK.NetworkRequestAccess.evaluateResponseAccessMode(request, initiatorOrigin);
         assert.strictEqual(mode, SDK.NetworkRequestAccess.ResponseAccessMode.OPAQUE_CROSS_ORIGIN);
       });

    it('returns OPAQUE_CROSS_ORIGIN when request includes responseCookies and server returns wildcard Access-Control-Allow-Origin',
       () => {
         const request = SDK.NetworkRequest.NetworkRequest.createWithoutBackendRequest(
             'requestId',
             urlString`https://victim.com/api/data`,
             urlString`https://attacker.com/index.html`,
             null,
         );
         request.responseHeaders = [{name: 'Access-Control-Allow-Origin', value: '*'}];
         request.responseCookies = [new SDK.Cookie.Cookie('sid', '12345')];
         const initiatorOrigin = SDK.SecurityOrigin.SecurityOrigin.create('https://attacker.com');
         const mode = SDK.NetworkRequestAccess.evaluateResponseAccessMode(request, initiatorOrigin);
         assert.strictEqual(mode, SDK.NetworkRequestAccess.ResponseAccessMode.OPAQUE_CROSS_ORIGIN);
       });
  });

  describe('getFilterableResponseHeaders', () => {
    it('returns all headers for SAME_ORIGIN requests', () => {
      const request = SDK.NetworkRequest.NetworkRequest.createWithoutBackendRequest(
          'requestId',
          urlString`https://example.com/api/data`,
          urlString`https://example.com/`,
          null,
      );
      request.responseHeaders = [
        {name: 'Content-Type', value: 'application/json'},
        {name: 'Location', value: '/redirect'},
        {name: 'Server', value: 'Apache'},
      ];
      const headers = SDK.NetworkRequestAccess.getFilterableResponseHeaders(
          request,
          SDK.NetworkRequestAccess.ResponseAccessMode.SAME_ORIGIN,
      );
      assert.deepEqual(headers, [
        {name: 'Content-Type', value: 'application/json'},
        {name: 'Location', value: '/redirect'},
        {name: 'Server', value: 'Apache'},
      ]);
    });

    it('returns strictly CORS-safelisted headers for OPAQUE_CROSS_ORIGIN requests even if Access-Control-Expose-Headers is present',
       () => {
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
           {name: 'X-Custom-Secret', value: 'secret-token'},
           {name: 'Access-Control-Expose-Headers', value: 'X-Custom-Secret, Location'},
         ];
         const headers = SDK.NetworkRequestAccess.getFilterableResponseHeaders(
             request,
             SDK.NetworkRequestAccess.ResponseAccessMode.OPAQUE_CROSS_ORIGIN,
         );
         assert.deepEqual(headers, [
           {name: 'Content-Type', value: 'application/json'},
           {name: 'Cache-Control', value: 'no-cache'},
         ]);
       });

    it('returns CORS-safelisted headers and explicitly exposed headers for CORS_ALLOWED requests', () => {
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
        {name: 'X-Custom-Exposed', value: 'custom-val'},
        {name: 'Access-Control-Expose-Headers', value: '  X-Custom-Exposed, Location  '},
      ];
      const headers = SDK.NetworkRequestAccess.getFilterableResponseHeaders(
          request,
          SDK.NetworkRequestAccess.ResponseAccessMode.CORS_ALLOWED,
      );
      assert.deepEqual(headers, [
        {name: 'Content-Type', value: 'application/json'},
        {name: 'Cache-Control', value: 'no-cache'},
        {name: 'Location', value: '/secret-redirect'},
        {name: 'X-Custom-Exposed', value: 'custom-val'},
      ]);
    });

    it('exposes all headers when Access-Control-Expose-Headers is wildcard and request is uncredentialed', () => {
      const request = SDK.NetworkRequest.NetworkRequest.createWithoutBackendRequest(
          'requestId',
          urlString`https://victim.com/api/data`,
          urlString`https://attacker.com/`,
          null,
      );
      request.responseHeaders = [
        {name: 'Content-Type', value: 'application/json'},
        {name: 'Location', value: '/secret-redirect'},
        {name: 'Server', value: 'Apache'},
        {name: 'Access-Control-Expose-Headers', value: '*'},
      ];
      const headers = SDK.NetworkRequestAccess.getFilterableResponseHeaders(
          request,
          SDK.NetworkRequestAccess.ResponseAccessMode.CORS_ALLOWED,
      );
      assert.deepEqual(headers, [
        {name: 'Content-Type', value: 'application/json'},
        {name: 'Location', value: '/secret-redirect'},
        {name: 'Server', value: 'Apache'},
        {name: 'Access-Control-Expose-Headers', value: '*'},
      ]);
    });

    it('does not treat Access-Control-Expose-Headers as wildcard when request is credentialed', () => {
      const request = SDK.NetworkRequest.NetworkRequest.createWithoutBackendRequest(
          'requestId',
          urlString`https://victim.com/api/data`,
          urlString`https://attacker.com/`,
          null,
      );
      request.responseHeaders = [
        {name: 'Content-Type', value: 'application/json'},
        {name: 'Location', value: '/secret-redirect'},
        {name: 'Server', value: 'Apache'},
        {name: 'Access-Control-Allow-Credentials', value: 'true'},
        {name: 'Access-Control-Expose-Headers', value: '*'},
      ];
      const headers = SDK.NetworkRequestAccess.getFilterableResponseHeaders(
          request,
          SDK.NetworkRequestAccess.ResponseAccessMode.CORS_ALLOWED,
      );
      assert.deepEqual(headers, [
        {name: 'Content-Type', value: 'application/json'},
      ]);
    });
  });
});
