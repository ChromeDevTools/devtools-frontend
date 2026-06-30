// Copyright 2026 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import {assert} from 'chai';
import sinon from 'sinon';

import * as Common from '../../core/common/common.js';
import * as Platform from '../../core/platform/platform.js';
import * as SDK from '../../core/sdk/sdk.js';
import type * as Protocol from '../../generated/protocol.js';
import {describeWithEnvironment} from '../../testing/EnvironmentHelpers.js';

import * as Network from './network.js';

function createMockRequestForPreload(options: {
  url: string,
  resourceType: Common.ResourceType.ResourceType,
  documentUrl?: string,
  mimeType?: string,
  headers?: SDK.NetworkRequest.NameValue[],
  cookiesCount?: number,
}): SDK.NetworkRequest.NetworkRequest {
  const request = SDK.NetworkRequest.NetworkRequest.create(
      'requestId' as Protocol.Network.RequestId,
      Platform.DevToolsPath.urlString`${options.url}`,
      Platform.DevToolsPath.urlString`${options.documentUrl ?? 'http://example.com/'}`,
      null,
      null,
      null,
  );
  request.setResourceType(options.resourceType);
  if (options.mimeType) {
    request.mimeType = options.mimeType;
  }
  if (options.headers) {
    request.setRequestHeaders(options.headers);
  }
  if (options.cookiesCount) {
    const mockCookies = Array.from(
        {length: options.cookiesCount},
        () => ({}) as unknown as SDK.NetworkRequest.IncludedCookieWithReason,
    );
    sinon.stub(request, 'includedRequestCookies').returns(mockCookies);
  }
  return request;
}

describeWithEnvironment('LinkPreloadGenerator', () => {
  const {canPreloadRequest, generatePreloadLink} = Network.LinkPreloadGenerator;

  it('generates correct preload element for same-origin script', () => {
    const request = createMockRequestForPreload({
      url: 'http://example.com/script.js',
      resourceType: Common.ResourceType.resourceTypes.Script,
      mimeType: 'text/javascript',
    });

    const result = generatePreloadLink(request);
    assert.strictEqual(result, '<link rel="preload" href="/script.js" as="script" type="text/javascript">');
  });

  it('generates correct preload element for cross-origin font without credentials', () => {
    const request = createMockRequestForPreload({
      url: 'http://another-example.com/font.woff2',
      resourceType: Common.ResourceType.resourceTypes.Font,
      mimeType: 'font/woff2',
    });

    const result = generatePreloadLink(request);
    assert.strictEqual(
        result,
        '<link rel="preload" href="http://another-example.com/font.woff2" as="font" type="font/woff2" crossorigin>');
  });

  it('generates correct preload element for font on same-origin (always needs crossorigin)', () => {
    const request = createMockRequestForPreload({
      url: 'http://example.com/font.woff2',
      resourceType: Common.ResourceType.resourceTypes.Font,
      mimeType: 'font/woff2',
    });

    const result = generatePreloadLink(request);
    assert.strictEqual(result, '<link rel="preload" href="/font.woff2" as="font" type="font/woff2" crossorigin>');
  });

  it('generates correct preload element for same-origin font with credentials (uses crossorigin anonymous)', () => {
    const request = createMockRequestForPreload({
      url: 'http://example.com/font.woff2',
      resourceType: Common.ResourceType.resourceTypes.Font,
      mimeType: 'font/woff2',
      cookiesCount: 1,
    });

    const result = generatePreloadLink(request);
    assert.strictEqual(result, '<link rel="preload" href="/font.woff2" as="font" type="font/woff2" crossorigin>');
  });

  it('generates correct preload element for cross-origin font with credentials', () => {
    const request = createMockRequestForPreload({
      url: 'http://another-example.com/font.woff2',
      resourceType: Common.ResourceType.resourceTypes.Font,
      mimeType: 'font/woff2',
      documentUrl: 'http://example.com/',
      cookiesCount: 1,
    });

    const result = generatePreloadLink(request);
    assert.strictEqual(
        result,
        '<link rel="preload" href="http://another-example.com/font.woff2" as="font" type="font/woff2" crossorigin="use-credentials">');
  });

  describe('canPreloadRequest', () => {
    it('returns true for supported resource types', () => {
      const scriptRequest = createMockRequestForPreload({
        url: 'http://example.com/script.js',
        resourceType: Common.ResourceType.resourceTypes.Script,
      });
      const fontRequest = createMockRequestForPreload({
        url: 'http://example.com/font.woff2',
        resourceType: Common.ResourceType.resourceTypes.Font,
      });
      const stylesheetRequest = createMockRequestForPreload({
        url: 'http://example.com/style.css',
        resourceType: Common.ResourceType.resourceTypes.Stylesheet,
      });

      assert.isTrue(canPreloadRequest(scriptRequest));
      assert.isTrue(canPreloadRequest(fontRequest));
      assert.isTrue(canPreloadRequest(stylesheetRequest));
    });

    it('returns false for unsupported resource types', () => {
      const mediaRequest = createMockRequestForPreload({
        url: 'http://example.com/video.mp4',
        resourceType: Common.ResourceType.resourceTypes.Media,
      });
      const websocketRequest = createMockRequestForPreload({
        url: 'ws://example.com/socket',
        resourceType: Common.ResourceType.resourceTypes.WebSocket,
      });

      assert.isFalse(canPreloadRequest(mediaRequest));
      assert.isFalse(canPreloadRequest(websocketRequest));
    });
  });

  it('generates correct preload element for cross-origin stylesheet (CORS mode)', () => {
    const request = createMockRequestForPreload({
      url: 'http://another-example.com/styles.css',
      resourceType: Common.ResourceType.resourceTypes.Stylesheet,
      mimeType: 'text/css',
      headers: [{name: 'sec-fetch-mode', value: 'cors'}],
    });

    const result = generatePreloadLink(request);
    assert.strictEqual(
        result,
        '<link rel="preload" href="http://another-example.com/styles.css" as="style" type="text/css" crossorigin>');
  });

  it('generates correct preload element for cross-origin stylesheet (no-cors mode)', () => {
    const request = createMockRequestForPreload({
      url: 'http://another-example.com/styles.css',
      resourceType: Common.ResourceType.resourceTypes.Stylesheet,
      mimeType: 'text/css',
      headers: [{name: 'sec-fetch-mode', value: 'no-cors'}],
    });

    const result = generatePreloadLink(request);
    assert.strictEqual(result,
                       '<link rel="preload" href="http://another-example.com/styles.css" as="style" type="text/css">');
  });

  it('escapes HTML special characters in URL', () => {
    const request = createMockRequestForPreload({
      url: 'http://example.com/script.js?param1=a&param2="b"<c>',
      resourceType: Common.ResourceType.resourceTypes.Script,
      mimeType: 'text/javascript',
    });

    const result = generatePreloadLink(request);
    assert.strictEqual(
        result,
        '<link rel="preload" href="/script.js?param1=a&amp;param2=&quot;b&quot;&lt;c&gt;" as="script" type="text/javascript">');
  });

  it('escapes HTML special characters in mimeType', () => {
    const request = createMockRequestForPreload({
      url: 'http://example.com/style.css',
      resourceType: Common.ResourceType.resourceTypes.Stylesheet,
      mimeType: 'text/css"; <script>alert(1)</script>',
    });

    const result = generatePreloadLink(request);
    assert.include(result, 'type="text/css&quot;; &lt;script&gt;alert(1)&lt;/script&gt;"');
  });

  it('generates correct preload element for same-origin fetch request (always needs crossorigin)', () => {
    const request = createMockRequestForPreload({
      url: 'http://example.com/api/data',
      resourceType: Common.ResourceType.resourceTypes.Fetch,
    });

    const result = generatePreloadLink(request);
    assert.strictEqual(result, '<link rel="preload" href="/api/data" as="fetch" crossorigin>');
  });
});
