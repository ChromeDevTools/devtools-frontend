// Copyright 2022 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

const {assert} = chai;

import * as SDK from '../../../../../front_end/core/sdk/sdk.js';
import type * as Platform from '../../../../../front_end/core/platform/platform.js';
import type * as Protocol from '../../../../../front_end/generated/protocol.js';
import {expectCookie} from '../../helpers/Cookies.js';

describe('NetworkRequest', () => {
  it('can parse statusText from the first line of responseReceivedExtraInfo\'s headersText', () => {
    assert.strictEqual(
        SDK.NetworkRequest.NetworkRequest.parseStatusTextFromResponseHeadersText('HTTP/1.1 304 not modified'),
        'not modified');
    assert.strictEqual(
        SDK.NetworkRequest.NetworkRequest.parseStatusTextFromResponseHeadersText('HTTP/1.1 200 OK'), 'OK');
    assert.strictEqual(
        SDK.NetworkRequest.NetworkRequest.parseStatusTextFromResponseHeadersText('HTTP/1.1 200 OK\r\n\r\nfoo: bar\r\n'),
        'OK');
  });

  it('parses reponse cookies from headers', () => {
    const request = SDK.NetworkRequest.NetworkRequest.createWithoutBackendRequest(
        'requestId', 'url' as Platform.DevToolsPath.UrlString, 'documentURL' as Platform.DevToolsPath.UrlString, null);
    request.addExtraResponseInfo({
      blockedResponseCookies: [],
      responseHeaders: [{name: 'Set-Cookie', value: 'foo=bar'}, {name: 'Set-Cookie', value: 'baz=qux'}],
      resourceIPAddressSpace: 'Public' as Protocol.Network.IPAddressSpace,
    } as unknown as SDK.NetworkRequest.ExtraResponseInfo);
    assert.strictEqual(request.responseCookies.length, 2);
    expectCookie(request.responseCookies[0], {name: 'foo', value: 'bar', size: 8});
    expectCookie(request.responseCookies[1], {name: 'baz', value: 'qux', size: 7});
  });

  it('includes partition key in response cookies', () => {
    const request = SDK.NetworkRequest.NetworkRequest.createWithoutBackendRequest(
        'requestId', 'url' as Platform.DevToolsPath.UrlString, 'documentURL' as Platform.DevToolsPath.UrlString, null);
    request.addExtraResponseInfo({
      blockedResponseCookies: [],
      responseHeaders: [{name: 'Set-Cookie', value: 'foo=bar'}, {name: 'Set-Cookie', value: 'baz=qux'}],
      resourceIPAddressSpace: 'Public' as Protocol.Network.IPAddressSpace,
      cookiePartitionKey: 'partitionKey',
    } as unknown as SDK.NetworkRequest.ExtraResponseInfo);
    assert.strictEqual(request.responseCookies.length, 2);
    expectCookie(request.responseCookies[0], {name: 'foo', value: 'bar', partitionKey: 'partitionKey', size: 8});
    expectCookie(request.responseCookies[1], {name: 'baz', value: 'qux', partitionKey: 'partitionKey', size: 7});
  });

  it('determines whether the response headers have been overridden', () => {
    const request = SDK.NetworkRequest.NetworkRequest.createWithoutBackendRequest(
        'requestId', 'url' as Platform.DevToolsPath.UrlString, 'documentURL' as Platform.DevToolsPath.UrlString, null);
    request.responseHeaders = [{name: 'foo', value: 'bar'}];

    request.originalResponseHeaders = [{name: 'foo', value: 'baz'}];
    assert.isTrue(request.hasOverriddenHeaders());

    request.originalResponseHeaders = [];
    assert.isFalse(request.hasOverriddenHeaders());

    request.originalResponseHeaders = [{name: 'Foo', value: 'bar'}];
    assert.isFalse(request.hasOverriddenHeaders());

    request.originalResponseHeaders = [{name: 'Foo', value: 'Bar'}];
    assert.isTrue(request.hasOverriddenHeaders());

    request.responseHeaders = [{name: 'one', value: 'first'}, {name: 'two', value: 'second'}];
    request.originalResponseHeaders = [{name: 'ONE', value: 'first'}, {name: 'Two', value: 'second'}];
    assert.isFalse(request.hasOverriddenHeaders());

    request.originalResponseHeaders = [{name: 'one', value: 'first'}];
    assert.isTrue(request.hasOverriddenHeaders());

    request.originalResponseHeaders = [{name: 'two', value: 'second'}, {name: 'one', value: 'first'}];
    assert.isFalse(request.hasOverriddenHeaders());

    request.originalResponseHeaders = [{name: 'one', value: 'second'}, {name: 'two', value: 'first'}];
    assert.isTrue(request.hasOverriddenHeaders());

    request.originalResponseHeaders =
        [{name: 'one', value: 'first'}, {name: 'two', value: 'second'}, {name: 'two', value: 'second'}];
    assert.isTrue(request.hasOverriddenHeaders());

    request.responseHeaders = [{name: 'duplicate', value: 'first'}, {name: 'duplicate', value: 'second'}];
    request.originalResponseHeaders = [{name: 'duplicate', value: 'second'}, {name: 'Duplicate', value: 'first'}];
    assert.isFalse(request.hasOverriddenHeaders());
  });
});
